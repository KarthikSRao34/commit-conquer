import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

const errorRate = new Rate('error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '60s', target: 20 },
    { duration: '20s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    error_rate: ['<0.01'],
  },
};

export default function () {
  group('user journey', () => {
    // 1. Get products list
    let res = http.get(`${BASE_URL}/api/store/products?offset=0&limit=12&status=published`);
    const checkProducts = check(res, {
      'products status 200': (r) => r.status === 200,
    });
    errorRate.add(!checkProducts);
    sleep(0.5);

    // 2. Get single product by handle
    res = http.get(`${BASE_URL}/api/store/products/handle/obsidian-crew-neck`);
    const checkProduct = check(res, {
      'product detail status 200': (r) => r.status === 200,
    });
    errorRate.add(!checkProduct);
    sleep(0.3);

    // 3. Create cart
    res = http.post(`${BASE_URL}/api/store/carts`, JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
    });
    const checkCartCreate = check(res, {
      'cart created status 200 or 201': (r) => r.status === 200 || r.status === 201,
    });
    errorRate.add(!checkCartCreate);
    
    let cartId = null;
    try {
      const cartData = res.json();
      cartId = cartData.cart ? cartData.cart.id : null;
    } catch (e) {
      // ignore
    }
    
    if (!cartId) {
      errorRate.add(true);
      return;
    }
    sleep(0.2);

    // 4. Add item to cart
    res = http.post(
      `${BASE_URL}/api/store/carts/${cartId}/items`,
      JSON.stringify({"product_id":"prod_001","variant_id":"var_prod_001_s_black","quantity":1}
),
      { headers: { 'Content-Type': 'application/json' } }
    );
    const checkAddItem = check(res, {
      'add item status 200 or 201': (r) => r.status === 200 || r.status === 201,
    });
    errorRate.add(!checkAddItem);
    sleep(0.3);

    // 5. Get cart
    res = http.get(`${BASE_URL}/api/store/carts/${cartId}`);
    const checkGetCart = check(res, {
      'get cart status 200': (r) => r.status === 200,
    });
    errorRate.add(!checkGetCart);
    sleep(1);
  });
}

export function handleSummary(data) {
  const summary = {
    p95_latency_ms: Math.round(data.metrics.http_req_duration.values['p(95)'] || 0),
    avg_latency_ms: Math.round(data.metrics.http_req_duration.values.avg || 0),
    req_per_sec: Math.round(data.metrics.http_reqs.values.rate || 0),
    error_rate_pct: Math.round((data.metrics.error_rate.values.rate || 0) * 100 * 100) / 100,
    max_vus: data.metrics.vus_max.values.value || 0,
  };

  // k6 does not support Node's require('fs'). Return a map so k6 writes the file natively.
  return {
    'eval_results/k6_summary.json': JSON.stringify(summary, null, 2),
  };
}
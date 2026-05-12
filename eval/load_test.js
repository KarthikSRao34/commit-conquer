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
    // Custom Rate metrics require "rate<value" syntax, not just "<value"
    error_rate: ['rate<0.01'],
  },
};

export default function () {
  group('api journey', () => {
    // 1. Health check
    let res = http.get(`${BASE_URL}/api/health`);
    const checkHealth = check(res, { 'health 200': (r) => r.status === 200 });
    errorRate.add(!checkHealth);
    sleep(0.2);

    // 2. List commits
    res = http.get(`${BASE_URL}/api/commits?page=1&limit=10`);
    const checkCommits = check(res, { 'commits 200': (r) => r.status === 200 });
    errorRate.add(!checkCommits);
    sleep(0.3);

    // 3. List users
    res = http.get(`${BASE_URL}/api/users`);
    const checkUsers = check(res, { 'users 200': (r) => r.status === 200 });
    errorRate.add(!checkUsers);
    sleep(0.3);

    // 4. Leaderboard
    res = http.get(`${BASE_URL}/api/leaderboard`);
    const checkLeaderboard = check(res, { 'leaderboard 200': (r) => r.status === 200 });
    errorRate.add(!checkLeaderboard);
    sleep(0.5);

    // 5. Single commit — 200 or 404 are valid; only 5xx counts as error
    res = http.get(`${BASE_URL}/api/commits/1`);
    const checkCommit = check(res, { 'commit not 5xx': (r) => r.status < 500 });
    errorRate.add(!checkCommit);
    sleep(0.2);
  });
}

// k6 does NOT support Node require('fs').
// Return a filename→content map so k6 writes the file natively.
export function handleSummary(data) {
  const summary = {
    p95_latency_ms: Math.round(data.metrics.http_req_duration.values['p(95)'] || 0),
    avg_latency_ms: Math.round(data.metrics.http_req_duration.values.avg || 0),
    req_per_sec:    Math.round(data.metrics.http_reqs.values.rate || 0),
    error_rate_pct: Math.round((data.metrics.error_rate.values.rate || 0) * 100 * 100) / 100,
    max_vus:        data.metrics.vus_max.values.value || 0,
  };
  return {
    'eval_results/k6_summary.json': JSON.stringify(summary, null, 2),
  };
}
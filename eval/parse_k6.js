const fs = require('fs');
const path = require('path');

function lerp(value, goodThreshold, poorThreshold, maxPoints, lowerIsBetter) {
  if (lowerIsBetter) {
    if (value <= goodThreshold) return maxPoints;
    if (value >= poorThreshold) return 0;
    const ratio = (value - goodThreshold) / (poorThreshold - goodThreshold);
    return Math.max(0, maxPoints * (1 - ratio));
  } else {
    if (value >= goodThreshold) return maxPoints;
    if (value <= poorThreshold) return 0;
    const ratio = (value - poorThreshold) / (goodThreshold - poorThreshold);
    return Math.max(0, maxPoints * (1 - ratio));
  }
}

try {
  const k6SummaryPath = path.join('eval_results', 'k6_summary.json');
  
  let summary = {
    p95_latency_ms: 0,
    avg_latency_ms: 0,
    req_per_sec: 0,
    error_rate_pct: 0,
    max_vus: 0,
  };

  if (fs.existsSync(k6SummaryPath)) {
    try {
      summary = JSON.parse(fs.readFileSync(k6SummaryPath, 'utf8'));
    } catch (e) {
      // use defaults
    }
  }

  // Scoring
  const p95Score = lerp(summary.p95_latency_ms, 300, 1000, 10, true);
  const rpsScore = lerp(summary.req_per_sec, 50, 10, 8, false);
  const errScore = lerp(summary.error_rate_pct, 0.1, 1.0, 4, true);
  const avgScore = lerp(summary.avg_latency_ms, 200, 500, 3, true);

  const backendScore = Math.round(p95Score + rpsScore + errScore + avgScore);

  const result = {
    backend_score: backendScore,
    max: 25,
    metrics: {
      p95_latency_ms: summary.p95_latency_ms,
      avg_latency_ms: summary.avg_latency_ms,
      req_per_sec: summary.req_per_sec,
      error_rate_pct: summary.error_rate_pct,
      max_vus: summary.max_vus,
    },
    breakdown: {
      p95_latency: `${Math.round(p95Score)}/10`,
      throughput: `${Math.round(rpsScore)}/8`,
      error_rate: `${Math.round(errScore)}/4`,
      avg_latency: `${Math.round(avgScore)}/3`,
    },
  };

  fs.writeFileSync(
    path.join('eval_results', 'backend_result.json'),
    JSON.stringify(result, null, 2)
  );
} catch (err) {
  fs.writeFileSync(
    path.join('eval_results', 'backend_result.json'),
    JSON.stringify({
      backend_score: 0,
      error: 'k6 did not run',
      max: 25,
      metrics: {},
      breakdown: {},
    }, null, 2)
  );
}

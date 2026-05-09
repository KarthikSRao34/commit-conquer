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
  const lhDir = path.join('.lighthouseci');
  
  if (!fs.existsSync(lhDir)) {
    fs.writeFileSync(
      path.join('eval_results', 'lighthouse_result.json'),
      JSON.stringify({
        frontend_score: 0,
        error: 'no_lighthouse_results',
        max: 25,
        metrics: {},
      }, null, 2)
    );
    process.exit(0);
  }

  const files = fs.readdirSync(lhDir).filter(f => f.startsWith('lhr-') && f.endsWith('.json'));
  
  if (files.length === 0) {
    fs.writeFileSync(
      path.join('eval_results', 'lighthouse_result.json'),
      JSON.stringify({
        frontend_score: 0,
        error: 'no_lighthouse_results',
        max: 25,
        metrics: {},
      }, null, 2)
    );
    process.exit(0);
  }

  files.sort();
  const latestFile = files[files.length - 1];
  const lhrPath = path.join(lhDir, latestFile);
  const lhr = JSON.parse(fs.readFileSync(lhrPath, 'utf8'));

  const metrics = {
    fcp_ms: lhr.audits['first-contentful-paint']?.numericValue || 0,
    lcp_ms: lhr.audits['largest-contentful-paint']?.numericValue || 0,
    tti_ms: lhr.audits['interactive']?.numericValue || 0,
    tbt_ms: lhr.audits['total-blocking-time']?.numericValue || 0,
    cls: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
  };

  const fcpScore = lerp(metrics.fcp_ms, 1800, 3000, 4, true);
  const lcpScore = lerp(metrics.lcp_ms, 2500, 4000, 6, true);
  const ttiScore = lerp(metrics.tti_ms, 3800, 7300, 6, true);
  const tbtScore = lerp(metrics.tbt_ms, 200, 600, 5, true);
  const clsScore = lerp(metrics.cls, 0.1, 0.25, 4, true);

  const frontendScore = Math.round(fcpScore + lcpScore + ttiScore + tbtScore + clsScore);

  const result = {
    frontend_score: frontendScore,
    max: 25,
    metrics,
  };

  fs.writeFileSync(
    path.join('eval_results', 'lighthouse_result.json'),
    JSON.stringify(result, null, 2)
  );
} catch (err) {
  fs.writeFileSync(
    path.join('eval_results', 'lighthouse_result.json'),
    JSON.stringify({
      frontend_score: 0,
      error: 'parse_failed',
      max: 25,
      metrics: {},
    }, null, 2)
  );
}

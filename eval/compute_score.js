const fs   = require('fs');
const path = require('path');

const DEADLINE = '2026-05-10T18:30:00Z';

function readJsonFile(filePath, defaultValue = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (_) { /* ignore */ }
  return defaultValue;
}

/** Safely parse a percentage value that may be a number, "Unknown", or missing. */
function safePct(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

try {
  // ── Deadline check ─────────────────────────────────────────────────────────
  const prCreatedAtStr = process.env.PR_CREATED_AT || '';
  if (prCreatedAtStr) {
    const prCreatedAt = new Date(prCreatedAtStr);
    const deadline    = new Date(DEADLINE);
    if (prCreatedAt > deadline) {
      fs.writeFileSync(
        path.join('eval_results', 'score.json'),
        JSON.stringify({ status: 'REJECTED', reason: 'past_deadline', final_score: 0 }, null, 2)
      );
      process.exit(0);
    }
  }

  // ── Read result files ──────────────────────────────────────────────────────
  const lintResult = readJsonFile(
    path.join('eval_results', 'lint_result.json'),
    { issue_count: 0, error_count: 0, warning_count: 0, issues: [] }
  );

  const lighthouseResult = readJsonFile(
    path.join('eval_results', 'lighthouse_result.json'),
    { frontend_score: 0, metrics: {} }
  );

  const backendResult = readJsonFile(
    path.join('eval_results', 'backend_result.json'),
    { backend_score: 0, metrics: {}, breakdown: {} }
  );

  const bundleResult = readJsonFile(
    path.join('eval_results', 'bundle_result.json'),
    []
  );

  const testResult = readJsonFile(
    path.join('eval_results', 'test_result.json'),
    { tests_passed: false, command: 'npm test' }
  );

  // jest writes coverage-summary.json with numeric pcts, but returns the
  // string "Unknown" when no files matched the collectCoverageFrom glob.
  const coverageData = readJsonFile(
    path.join('eval_results', 'coverage', 'coverage-summary.json'),
    {}
  );

  // ── Calculate scores ───────────────────────────────────────────────────────
  const qualityScore = Math.max(0, 20 - (lintResult.issue_count || 0) * 2);

  // safePct handles "Unknown" strings and missing fields without producing NaN
  const linePct      = safePct(coverageData?.total?.lines?.pct);
  const coveragePct  = Math.min(linePct, 100);
  const coverageScore = Math.round((coveragePct / 100) * 10);

  const frontendScore = lighthouseResult.frontend_score || 0;
  const backendScore  = backendResult.backend_score  || 0;

  let bundleScore = 10;
  if (Array.isArray(bundleResult)) {
    const failedCount = bundleResult.filter(item => item.failed === true).length;
    bundleScore = Math.max(0, 10 - failedCount * 5);
  }

  const finalScore = qualityScore + coverageScore + frontendScore + backendScore + bundleScore;

  const score = {
    status:         'ACCEPTED',
    reason:         null,
    tests_passed:   Boolean(testResult.tests_passed),
    issue_count:    lintResult.issue_count  || 0,
    error_count:    lintResult.error_count  || 0,
    warning_count:  lintResult.warning_count || 0,
    coverage_pct:   Math.round(coveragePct * 10) / 10,
    quality_score:  Math.round(qualityScore),
    coverage_score: Math.round(coverageScore),
    frontend_score: Math.round(frontendScore),
    backend_score:  Math.round(backendScore),
    bundle_score:   Math.round(bundleScore),
    final_score:    Math.round(finalScore),
    lint_issues:    (lintResult.issues || []).slice(0, 5),
    lh_metrics:     lighthouseResult.metrics  || {},
    be_metrics:     backendResult.metrics     || {},
    be_breakdown:   backendResult.breakdown   || {},
  };

  fs.writeFileSync(
    path.join('eval_results', 'score.json'),
    JSON.stringify(score, null, 2)
  );

} catch (err) {
  console.error('Error in compute_score.js:', err);
  fs.writeFileSync(
    path.join('eval_results', 'score.json'),
    JSON.stringify({
      status: 'ACCEPTED', reason: null,
      tests_passed: false,
      issue_count: 0, error_count: 0, warning_count: 0,
      coverage_pct: 0,
      quality_score: 0, coverage_score: 0,
      frontend_score: 0, backend_score: 0,
      bundle_score: 0, final_score: 0,
      lint_issues: [], lh_metrics: {}, be_metrics: {}, be_breakdown: {},
    }, null, 2)
  );
}
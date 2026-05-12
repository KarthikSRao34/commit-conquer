const fs = require('fs');
const path = require('path');

const DEADLINE = "2026-05-10T18:30:00Z";

function readJsonFile(filePath, defaultValue = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    // ignore
  }
  return defaultValue;
}

try {
  // Check deadline
  const prCreatedAtStr = process.env.PR_CREATED_AT || '';
  if (prCreatedAtStr) {
    const prCreatedAt = new Date(prCreatedAtStr);
    const deadline = new Date(DEADLINE);
    if (prCreatedAt > deadline) {
      const result = {
        status: 'REJECTED',
        reason: 'past_deadline',
        final_score: 0,
      };
      fs.writeFileSync(
        path.join('eval_results', 'score.json'),
        JSON.stringify(result, null, 2)
      );
      process.exit(0);
    }
  }

  // Read all result files
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

  const coverageData = readJsonFile(
    path.join('eval_results', 'coverage', 'coverage-summary.json'),
    {}
  );

  // Calculate scores
  const qualityScore = Math.max(0, 20 - (lintResult.issue_count || 0) * 2);
  // Calculate coverage from jest's coverage-summary.json
  let coveragePct = 0;
  if (coverageData && coverageData.total && coverageData.total.lines) {
    coveragePct = coverageData.total.lines.pct || 0;
  }
  const coverageScore = Math.round((Math.min(coveragePct, 100) / 100) * 10);
  const frontendScore = lighthouseResult.frontend_score || 0;
  const backendScore = backendResult.backend_score || 0;
  
  let bundleScore = 10;
  if (Array.isArray(bundleResult)) {
    const failedCount = bundleResult.filter(item => item.failed === true).length;
    bundleScore = Math.max(0, 10 - failedCount * 5);
  }

  const finalScore = qualityScore + coverageScore + frontendScore + backendScore + bundleScore;

  const score = {
    status: 'ACCEPTED',
    reason: null,
    tests_passed: Boolean(testResult.tests_passed),
    issue_count: lintResult.issue_count || 0,
    error_count: lintResult.error_count || 0,
    warning_count: lintResult.warning_count || 0,
    coverage_pct: Math.round(coveragePct * 10) / 10,
    quality_score: Math.round(qualityScore),
    coverage_score: coverageScore,
    frontend_score: Math.round(frontendScore),
    backend_score: Math.round(backendScore),
    bundle_score: Math.round(bundleScore),
    final_score: Math.round(finalScore),
    lint_issues: (lintResult.issues || []).slice(0, 5),
    lh_metrics: lighthouseResult.metrics || {},
    be_metrics: backendResult.metrics || {},
    be_breakdown: backendResult.breakdown || {},
  };

  fs.writeFileSync(
    path.join('eval_results', 'score.json'),
    JSON.stringify(score, null, 2)
  );
} catch (err) {
  console.error('Error in compute_score.js:', err);
  const result = {
    status: 'ACCEPTED',
    reason: null,
    tests_passed: false,
    issue_count: 0,
    error_count: 0,
    warning_count: 0,
    coverage_pct: 0,
    quality_score: 0,
    coverage_score: 0,
    frontend_score: 0,
    backend_score: 0,
    bundle_score: 0,
    final_score: 0,
    lint_issues: [],
    lh_metrics: {},
    be_metrics: {},
    be_breakdown: {},
  };
  fs.writeFileSync(
    path.join('eval_results', 'score.json'),
    JSON.stringify(result, null, 2)
  );
}
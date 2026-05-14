/**
 * post_comment.js — v3
 * 
 * 1. Fetches linked issue from PR (Fixes #X) and reads its points label
 * 2. POSTs full score to admin backend
 * 3. Posts evaluation comment on GitHub PR
 */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

process.on('uncaughtException', err => {
  console.error('UNCAUGHT:', err.message);
  process.exit(1);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function readJson(p, def = {}) {
  try { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { console.warn('readJson failed:', p, e.message); }
  return def;
}

function githubRequest(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.github.com',
      path: pathname, method,
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'commit-conquer-eval',
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d || '{}') }); }
        catch { resolve({ status: res.statusCode, data: {} }); }
      });
    });
    req.on('error', err => { console.warn('GitHub request error:', err.message); resolve({ status: 0, data: {} }); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function postToBackend(backendUrl, payload) {
  return new Promise(resolve => {
    const bodyStr = JSON.stringify(payload);
    let url;
    try { url = new URL(`${backendUrl}/api/scores`); }
    catch { console.warn('Invalid BACKEND_URL:', backendUrl); resolve({ status: 0, data: {} }); return; }

    const isHttps = url.protocol === 'https:';
    const lib     = isHttps ? https : http;
    const opts = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'ngrok-skip-browser-warning': '1',   // skip ngrok warning page
      },
    };
    const req = lib.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d || '{}') }); }
        catch { resolve({ status: res.statusCode, data: {} }); }
      });
    });
    req.on('error', err => { console.warn('Backend POST error:', err.message); resolve({ status: 0, data: {} }); });
    req.write(bodyStr);
    req.end();
  });
}

// ── Parse issue number from PR title / body ───────────────────────────────────

function extractIssueNumber(title, body) {
  const text  = `${title || ''} ${body || ''}`;
  const match = text.match(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*#(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

// ── Fetch issue labels from GitHub and extract points ─────────────────────────

async function getIssuePoints(repo, issueNumber) {
  if (!issueNumber) return { points: 0, difficulty: 'none', labels: [] };
  const { status, data } = await githubRequest('GET', `/repos/${repo}/issues/${issueNumber}`);
  if (status !== 200) return { points: 0, difficulty: 'none', labels: [] };

  const labels    = (data.labels || []).map(l => l.name);
  let points      = 0;
  let difficulty  = 'none';

  for (const label of labels) {
    // Match labels like: points:30, points-30, 30pts, 30points
    const m = label.match(/(?:points?[-:]?\s*)(\d+)|(\d+)\s*(?:pts?|points?)/i);
    if (m) { points = parseInt(m[1] || m[2], 10); break; }

    // Match difficulty labels: easy=10, medium=20, hard=30
    if (/easy/i.test(label))   { difficulty = 'easy';   if (!points) points = 10; }
    if (/medium/i.test(label)) { difficulty = 'medium'; if (!points) points = 20; }
    if (/hard/i.test(label))   { difficulty = 'hard';   if (!points) points = 30; }
  }

  return { points, difficulty, labels, issueTitle: data.title || '' };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const repo           = process.env.REPO;
  const prNumber       = process.env.PR_NUMBER;
  const githubUsername = process.env.GITHUB_USERNAME || '';
  const prTitle        = process.env.PR_TITLE        || '';
  const prBody         = process.env.PR_BODY         || '';
  const backendUrl     = process.env.BACKEND_URL     || '';

  if (!repo || !prNumber) {
    console.error('ERROR: REPO or PR_NUMBER missing');
    process.exit(1);
  }

  console.log(`Repo: ${repo} | PR: ${prNumber} | User: ${githubUsername}`);
  console.log(`Backend URL: ${backendUrl || '(not set — skipping backend POST)'}`);

  // ── Load score ────────────────────────────────────────────────────────────
  const score = readJson(path.join('eval_results', 'score.json'), {
    status: 'ACCEPTED', reason: null, tests_passed: false,
    quality_score: 0, frontend_score: 0, backend_score: 0,
    bundle_score: 0, coverage_score: 0, final_score: 0,
    issue_count: 0, error_count: 0, warning_count: 0,
    lh_metrics: {}, be_metrics: {}, be_breakdown: {}, lint_issues: [],
  });

  const testResult = readJson(path.join('eval_results', 'test_result.json'),
    { tests_passed: false, command: 'npm test' });
  const llmReview = readJson(path.join('eval_results', 'llm_review.json'), { review: '' });

  console.log('Score:', JSON.stringify(score, null, 2));

  // ── Get issue points from labels ──────────────────────────────────────────
  const issueNumber  = extractIssueNumber(prTitle, prBody);
  const issueData    = await getIssuePoints(repo, issueNumber);
  const issuePoints  = issueData.points;

  console.log(`Issue: #${issueNumber || 'none'} | Points from label: ${issuePoints} | Difficulty: ${issueData.difficulty}`);

  // ── POST to backend ───────────────────────────────────────────────────────
  if (backendUrl) {
    const payload = {
      pr_number:       String(prNumber),
      repo,
      github_username: githubUsername,
      final_score:     Math.round(score.final_score    || 0),
      quality_score:   Math.round(score.quality_score  || 0),
      frontend_score:  Math.round(score.frontend_score || 0),
      backend_score:   Math.round(score.backend_score  || 0),
      bundle_score:    Math.round(score.bundle_score   || 0),
      coverage_score:  Math.round(score.coverage_score || 0),
      tests_passed:    Boolean(score.tests_passed),
      issue_count:     score.issue_count   || 0,
      error_count:     score.error_count   || 0,
      warning_count:   score.warning_count || 0,
      lh_metrics:      score.lh_metrics    || {},
      be_metrics:      score.be_metrics    || {},
      be_breakdown:    score.be_breakdown  || {},
      lint_issues:     score.lint_issues   || [],
      status:          score.status        || 'ACCEPTED',
      // Issue data
      issue_number:    issueNumber,
      issue_points:    issuePoints,
      issue_difficulty: issueData.difficulty,
      issue_title:     issueData.issueTitle || '',
    };

    console.log('Posting to backend...');
    const result = await postToBackend(backendUrl, payload);
    if (result.status === 200 || result.status === 201) {
      console.log(`Backend updated! total_score=${result.data.total_score}`);
    } else {
      console.warn(`Backend returned ${result.status}. Leaderboard may not update.`);
    }
  } else {
    console.warn('BACKEND_URL not set — skipping leaderboard update');
  }

  // ── Delete old bot comments ───────────────────────────────────────────────
  const { data: comments } = await githubRequest('GET', `/repos/${repo}/issues/${prNumber}/comments`);
  if (Array.isArray(comments)) {
    for (const c of comments) {
      if (c.body?.includes('## Automated PR Evaluation')) {
        await githubRequest('DELETE', `/repos/${repo}/issues/comments/${c.id}`);
        console.log(`Deleted old comment ${c.id}`);
      }
    }
  }

  // ── Build GitHub comment ──────────────────────────────────────────────────
  let commentBody = '';

  if (score.reason === 'past_deadline') {
    commentBody = `## Automated PR Evaluation\n\n🚫 **Rejected — submitted after the event deadline.**`;
  } else {
    const testIcon = score.tests_passed ? '✅' : '❌';
    const lintIcon = (score.issue_count || 0) === 0 ? '✅'
                   : (score.issue_count || 0) <= 5  ? '⚠️' : '❌';

    const issueRow = issueNumber
      ? `| Issue points  | **${issuePoints}** | (from #${issueNumber} label) |`
      : '';

    const totalAuto = Math.round(score.final_score || 0);
    const grandTotal = totalAuto + issuePoints;

    const summaryTable = `| Category        | Score | Max  |
|:----------------|------:|-----:|
| Code quality    | ${Math.round(score.quality_score  || 0)} | 20   |
| Coverage        | ${Math.round(score.coverage_score || 0)} | 10   |
| Frontend perf   | ${Math.round(score.frontend_score || 0)} | 25   |
| Backend perf    | ${Math.round(score.backend_score  || 0)} | 25   |
| Bundle size     | ${Math.round(score.bundle_score   || 0)} | 10   |
| **Automated**   | **${totalAuto}** | **90** |
${issueRow}
| Manual (judges) | \\_\\_ | 10   |
| **TOTAL**       | **${grandTotal}+** | **100** |`;

    const issueSection = issueNumber
      ? `\n### 🎯 Issue: #${issueNumber}${issueData.issueTitle ? ` — ${issueData.issueTitle}` : ''}
- Difficulty: **${issueData.difficulty}** · Labels: ${issueData.labels.map(l => `\`${l}\``).join(', ') || 'none'}
- Issue points: **+${issuePoints}**\n`
      : '';

    const aiSection = llmReview.review?.trim()
      ? `\n---\n### 🤖 AI Code Review\n${llmReview.review}` : '';

    commentBody = `## Automated PR Evaluation

${testIcon} **Tests:** ${score.tests_passed ? 'Passed' : 'Failed'} (${testResult.command || 'npm test'})
${lintIcon} **Lint:** ${score.issue_count || 0} issues (${score.error_count || 0} errors, ${score.warning_count || 0} warnings)
${issueSection}
### Score Summary
${summaryTable}

🚀 **Score posted to leaderboard**${aiSection}`;
  }

  // ── Post comment ──────────────────────────────────────────────────────────
  console.log('Posting GitHub comment...');
  const { status, data: posted } = await githubRequest(
    'POST', `/repos/${repo}/issues/${prNumber}/comments`, { body: commentBody }
  );

  if (posted.id) {
    console.log('Comment posted:', posted.html_url);
  } else {
    console.error('Comment failed, status:', status, JSON.stringify(posted));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('FATAL:', err.message, err.stack);
  process.exit(1);
});
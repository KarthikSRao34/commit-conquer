/**
 * post_comment.js — v4
 * 1. Fetch PR diff from GitHub
 * 2. Run AI code review via Anthropic API
 * 3. POST score + AI review to admin backend
 * 4. Post detailed comment on GitHub PR
 */
const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

process.on('uncaughtException', err => { console.error('UNCAUGHT:', err.message); process.exit(1); });

function readJson(p, def = {}) {
  try { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch {}
  return def;
}

function githubRequest(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com', path: pathname, method,
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'commit-conquer-eval',
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d || '{}') }); }
        catch { resolve({ status: res.statusCode, data: {} }); }
      });
    });
    req.on('error', err => { console.warn('GitHub err:', err.message); resolve({ status: 0, data: {} }); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function githubRawRequest(method, pathname) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.github.com', path: pathname, method,
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3.diff',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'commit-conquer-eval',
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, text: d }));
    });
    req.on('error', () => resolve({ status: 0, text: '' }));
    req.end();
  });
}

function postToBackend(backendUrl, payload) {
  return new Promise(resolve => {
    const bodyStr = JSON.stringify(payload);
    let url;
    try { url = new URL(`${backendUrl}/api/scores`); }
    catch { resolve({ status: 0, data: {} }); return; }

    const isHttps = url.protocol === 'https:';
    const lib     = isHttps ? https : http;
    const req = lib.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'ngrok-skip-browser-warning': '1',
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d || '{}') }); }
        catch { resolve({ status: res.statusCode, data: {} }); }
      });
    });
    req.on('error', err => { console.warn('Backend err:', err.message); resolve({ status: 0, data: {} }); });
    req.write(bodyStr);
    req.end();
  });
}

// ── AI Code Review via Anthropic ──────────────────────────────────────────────

function callAnthropic(payload) {
  return new Promise(resolve => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) { resolve(null); return; }

    const bodyStr = JSON.stringify(payload);
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve(null); }
      });
    });
    req.on('error', err => { console.warn('Anthropic err:', err.message); resolve(null); });
    req.write(bodyStr);
    req.end();
  });
}

async function getAIReview(diff, prTitle, score, issueTitle) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY not set — skipping AI review');
    return null;
  }

  const truncatedDiff = diff.slice(0, 5000);
  const result = await callAnthropic({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: 'You are a hackathon code reviewer. Be brief, constructive, and fair. Respond ONLY in valid JSON.',
    messages: [{
      role: 'user',
      content: `Review this PR for a hackathon submission.

PR Title: ${prTitle}
Issue: ${issueTitle || 'Not linked'}
Automated Score: ${score}/90

Diff:
${truncatedDiff}

Respond ONLY with this JSON (no markdown, no backticks):
{
  "summary": "1-2 sentence overall assessment",
  "positives": ["what was done well (max 3 items)"],
  "issues": ["problems found (max 3 items)"],
  "manual_score_suggestion": <number 0-10>,
  "score_reasoning": "brief reason for manual score"
}`
    }]
  });

  if (!result) return null;

  const text = result.content?.[0]?.text || '';
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    console.warn('AI review parse failed:', text.slice(0, 100));
    return { summary: text.slice(0, 200), positives: [], issues: [], manual_score_suggestion: 5, score_reasoning: 'Parsed from free text' };
  }
}

function extractIssueNumber(title, body) {
  const text = `${title || ''} ${body || ''}`;
  const m = text.match(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*#(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

async function getIssuePoints(repo, issueNumber) {
  if (!issueNumber) return { points: 0, difficulty: 'none', labels: [], issueTitle: '' };
  const { status, data } = await githubRequest('GET', `/repos/${repo}/issues/${issueNumber}`);
  if (status !== 200) return { points: 0, difficulty: 'none', labels: [], issueTitle: '' };

  const labels   = (data.labels || []).map(l => l.name);
  let points     = 0;
  let difficulty = 'none';

  for (const label of labels) {
    const m = label.match(/(?:points?[-:]?\s*)(\d+)|(\d+)\s*(?:pts?|points?)/i);
    if (m) { points = parseInt(m[1] || m[2], 10); break; }
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

  if (!repo || !prNumber) { console.error('REPO or PR_NUMBER missing'); process.exit(1); }

  const score = readJson(path.join('eval_results', 'score.json'), {
    status: 'ACCEPTED', tests_passed: false,
    quality_score: 0, frontend_score: 0, backend_score: 0,
    bundle_score: 0, coverage_score: 0, final_score: 0,
    issue_count: 0, error_count: 0, warning_count: 0,
    lh_metrics: {}, be_metrics: {}, be_breakdown: {}, lint_issues: [],
  });
  const testResult = readJson(path.join('eval_results', 'test_result.json'), { tests_passed: false, command: 'npm test' });

  // Fetch PR diff for AI review
  console.log('Fetching PR diff...');
  const diffRes = await githubRawRequest('GET', `/repos/${repo}/pulls/${prNumber}`);
  const diff    = diffRes.text || '';

  // Get issue points from labels
  const issueNumber = extractIssueNumber(prTitle, prBody);
  const issueData   = await getIssuePoints(repo, issueNumber);
  console.log(`Issue: #${issueNumber || 'none'} | Points: ${issueData.points} | Difficulty: ${issueData.difficulty}`);

  // AI review
  console.log('Running AI code review...');
  const aiReview = await getAIReview(diff, prTitle, score.final_score || 0, issueData.issueTitle);
  if (aiReview) {
    console.log(`AI review: ${aiReview.summary?.slice(0, 80)}`);
    console.log(`AI manual score suggestion: ${aiReview.manual_score_suggestion}/10`);
  }

  // POST to backend
  if (backendUrl) {
    const result = await postToBackend(backendUrl, {
      pr_number:        String(prNumber),
      repo, github_username: githubUsername,
      final_score:      Math.round(score.final_score    || 0),
      quality_score:    Math.round(score.quality_score  || 0),
      frontend_score:   Math.round(score.frontend_score || 0),
      backend_score:    Math.round(score.backend_score  || 0),
      bundle_score:     Math.round(score.bundle_score   || 0),
      coverage_score:   Math.round(score.coverage_score || 0),
      tests_passed:     Boolean(score.tests_passed),
      issue_count:      score.issue_count   || 0,
      error_count:      score.error_count   || 0,
      warning_count:    score.warning_count || 0,
      lh_metrics:       score.lh_metrics    || {},
      be_metrics:       score.be_metrics    || {},
      be_breakdown:     score.be_breakdown  || {},
      lint_issues:      score.lint_issues   || [],
      status:           score.status        || 'ACCEPTED',
      issue_number:     issueNumber,
      issue_points:     issueData.points,
      issue_difficulty: issueData.difficulty,
      issue_title:      issueData.issueTitle,
      ai_review:        aiReview || {},
    });
    console.log(`Backend: ${result.status} — ${result.data.message || result.data.status || ''}`);
  }

  // Delete old bot comments
  const { data: comments } = await githubRequest('GET', `/repos/${repo}/issues/${prNumber}/comments`);
  if (Array.isArray(comments)) {
    for (const c of comments) {
      if (c.body?.includes('## Automated PR Evaluation')) {
        await githubRequest('DELETE', `/repos/${repo}/issues/comments/${c.id}`);
      }
    }
  }

  // Build comment
  const testIcon = score.tests_passed ? '✅' : '❌';
  const lintIcon = (score.issue_count || 0) === 0 ? '✅' : (score.issue_count || 0) <= 5 ? '⚠️' : '❌';
  const totalAuto = Math.round(score.final_score || 0);
  const aiSuggest = aiReview?.manual_score_suggestion ?? '?';

  const summaryTable = `| Category | Score | Max |
|:---------|------:|----:|
| Code quality  | ${score.quality_score  || 0} | 20  |
| Coverage      | ${score.coverage_score || 0} | 10  |
| Frontend perf | ${score.frontend_score || 0} | 25  |
| Backend perf  | ${score.backend_score  || 0} | 25  |
| Bundle size   | ${score.bundle_score   || 0} | 10  |
| **Automated** | **${totalAuto}** | **90** |
| Manual (judges) | — | 10  |
| **TOTAL** | — | **100** |`;

  const issueSection = issueNumber
    ? `\n### 🎯 Linked Issue: #${issueNumber}${issueData.issueTitle ? ` — *${issueData.issueTitle}*` : ''}
Difficulty: **${issueData.difficulty}** · Issue Points (awarded on merge): **+${issueData.points}**\n`
    : '';

  const aiSection = aiReview ? `
---
### 🤖 AI Code Review
> ${aiReview.summary || ''}

**✅ Positives:**
${(aiReview.positives || []).map(p => `- ${p}`).join('\n') || '- None noted'}

**⚠️ Issues Found:**
${(aiReview.issues || []).map(i => `- ${i}`).join('\n') || '- None noted'}

**Manual Score Suggestion: ${aiSuggest}/10** — *${aiReview.score_reasoning || ''}*` : '';

  const commentBody = score.reason === 'past_deadline'
    ? `## Automated PR Evaluation\n\n🚫 **Rejected — submitted after the event deadline.**`
    : `## Automated PR Evaluation

${testIcon} **Tests:** ${score.tests_passed ? 'Passed' : 'Failed'} (${testResult.command || 'npm test'})
${lintIcon} **Lint:** ${score.issue_count || 0} issues (${score.error_count || 0} errors, ${score.warning_count || 0} warnings)
${issueSection}
### Score Summary
${summaryTable}

> ⏳ **Score is pending admin approval** — will appear on leaderboard once approved.
${aiSection}`;

  const { status, data: posted } = await githubRequest(
    'POST', `/repos/${repo}/issues/${prNumber}/comments`, { body: commentBody }
  );

  if (posted.id) console.log('Comment posted:', posted.html_url);
  else { console.error('Comment failed:', status, JSON.stringify(posted)); process.exit(1); }
}

main().catch(err => { console.error('FATAL:', err.message, err.stack); process.exit(1); });

/**
 * post_comment.js — v2
 * 
 * Called at end of CI pipeline. Does two things:
 *   1. POST score to your admin backend  ← this is what was missing before
 *   2. Post evaluation comment on the GitHub PR
 *
 * Required env vars:
 *   GITHUB_TOKEN, REPO, PR_NUMBER, GITHUB_USERNAME, BACKEND_URL
 */

const https = require("https");
const http  = require("http");
const fs    = require("fs");
const path  = require("path");

process.on("uncaughtException", err => { console.error("UNCAUGHT:", err.message); process.exit(1); });

// ── Read files ────────────────────────────────────────────────────────────────

function readJson(p, def = {}) {
  try { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch {}
  return def;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function githubRequest(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: "api.github.com",
      path: pathname, method,
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "commit-conquer-eval",
        "Content-Type": "application/json",
        ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = https.request(opts, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => { try { resolve({ status: res.statusCode, data: JSON.parse(d || "{}") }); } catch { resolve({ status: res.statusCode, data: {} }); } });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function postToBackend(backendUrl, payload) {
  return new Promise(resolve => {
    const bodyStr = JSON.stringify(payload);
    const url     = new URL(`${backendUrl}/api/scores`);
    const isHttps = url.protocol === "https:";
    const lib     = isHttps ? https : http;
    const opts = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname, method: "POST",
      headers: {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
      },
    };
    const req = lib.request(opts, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => { try { resolve({ status: res.statusCode, data: JSON.parse(d || "{}") }); } catch { resolve({ status: res.statusCode, data: {} }); } });
    });
    req.on("error", err => { console.warn("Backend request error:", err.message); resolve({ status: 0, data: {} }); });
    req.write(bodyStr);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const repo           = process.env.REPO;
  const prNumber       = process.env.PR_NUMBER;
  const githubUsername = process.env.GITHUB_USERNAME || "";
  const backendUrl     = process.env.BACKEND_URL || "http://localhost:8000";

  if (!repo || !prNumber) { console.error("ERROR: REPO or PR_NUMBER missing"); process.exit(1); }
  if (!process.env.GITHUB_TOKEN) { console.error("ERROR: GITHUB_TOKEN missing"); process.exit(1); }

  const score = readJson(path.join("eval_results", "score.json"), {
    status: "ACCEPTED", reason: null, tests_passed: false,
    quality_score: 0, frontend_score: 0, backend_score: 0,
    bundle_score: 0, coverage_score: 0, final_score: 0,
    issue_count: 0, error_count: 0, warning_count: 0,
    lh_metrics: {}, be_metrics: {}, be_breakdown: {}, lint_issues: [],
  });

  const testResult = readJson(path.join("eval_results", "test_result.json"), { tests_passed: false, command: "npm test" });
  const llmReview  = readJson(path.join("eval_results", "llm_review.json"),  { review: "" });

  console.log("Score:", JSON.stringify(score, null, 2));

  // ── STEP 1: POST to your admin backend ───────────────────────────────────
  // This updates the leaderboard. Without this call, scores never update.
  console.log(`Posting score to ${backendUrl}/api/scores`);
  const backendRes = await postToBackend(backendUrl, {
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
    status:          score.status        || "ACCEPTED",
  });

  if (backendRes.status === 200 || backendRes.status === 201) {
    console.log(`Backend updated. total_score=${backendRes.data.total_score}`);
  } else {
    console.warn(`Backend returned ${backendRes.status}. Continuing anyway.`);
  }

  // ── STEP 2: Delete previous bot comments ─────────────────────────────────
  const { data: comments } = await githubRequest("GET", `/repos/${repo}/issues/${prNumber}/comments`);
  if (Array.isArray(comments)) {
    for (const c of comments) {
      if (c.body?.includes("## Automated PR Evaluation")) {
        await githubRequest("DELETE", `/repos/${repo}/issues/comments/${c.id}`);
        console.log(`Deleted old comment ${c.id}`);
      }
    }
  }

  // ── STEP 3: Build + post GitHub comment ──────────────────────────────────
  let commentBody = "";

  if (score.reason === "past_deadline") {
    commentBody = `## Automated PR Evaluation\n\n🚫 **Rejected — submitted after the event deadline.**`;
  } else {
    const testIcon = score.tests_passed ? "✅" : "❌";
    const lintIcon = (score.issue_count || 0) === 0 ? "✅" : (score.issue_count || 0) <= 5 ? "⚠️" : "❌";
    const lhM = score.lh_metrics  || {};
    const beM = score.be_metrics  || {};
    const beB = score.be_breakdown || {};

    const summaryTable = `| Category | Score | Max |
|:---------|------:|----:|
| Code quality  | ${score.quality_score  || 0} | 20  |
| Coverage      | ${score.coverage_score || 0} | 10  |
| Frontend perf | ${score.frontend_score || 0} | 25  |
| Backend perf  | ${score.backend_score  || 0} | 25  |
| Bundle size   | ${score.bundle_score   || 0} | 10  |
| **Automated** | **${score.final_score  || 0}** | **90** |
| Manual (judges) | \\__ | 10  |
| **TOTAL** | \\__ | **100** |`;

    const aiSection = llmReview.review?.trim()
      ? `\n---\n### 🤖 AI Code Review\n${llmReview.review}` : "";

    commentBody = `## Automated PR Evaluation

${testIcon} **Tests:** ${score.tests_passed ? "Passed" : "Failed"} (${testResult.command || "npm test"})
${lintIcon} **Lint:** ${score.issue_count || 0} issues (${score.error_count || 0} errors, ${score.warning_count || 0} warnings)

### Score Summary
${summaryTable}

🚀 **Score posted to leaderboard**${aiSection}`;
  }

  const { status, data: posted } = await githubRequest(
    "POST", `/repos/${repo}/issues/${prNumber}/comments`, { body: commentBody }
  );

  if (posted.id) {
    console.log("Comment posted:", posted.html_url);
  } else {
    console.error("Comment failed, status:", status);
    process.exit(1);
  }
}

main().catch(err => { console.error("FATAL:", err.message); process.exit(1); });

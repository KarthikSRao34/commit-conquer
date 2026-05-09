const https = require('https');
const fs = require('fs');
const path = require('path');

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

function githubRequest(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const token = process.env.GITHUB_TOKEN;
    const options = {
      hostname: 'api.github.com',
      path: pathname,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'eval-bot',
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data || '{}'));
        } catch (err) {
          resolve({});
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function main() {
  try {
    const repo = process.env.REPO;
    const prNumber = process.env.PR_NUMBER;

    const score = readJsonFile(path.join('eval_results', 'score.json'), {
      status: 'ACCEPTED',
      reason: null,
      issue_count: 0,
      error_count: 0,
      warning_count: 0,
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
    });

    const llmReview = readJsonFile(path.join('eval_results', 'llm_review.json'), {
      review: '',
    });

    // Step 1: Delete previous bot comments
    const comments = await githubRequest('GET', `/repos/${repo}/issues/${prNumber}/comments`);
    if (Array.isArray(comments)) {
      for (const comment of comments) {
        if (comment.body && comment.body.includes('## Automated PR Evaluation')) {
          await githubRequest('DELETE', `/repos/${repo}/issues/comments/${comment.id}`);
        }
      }
    }

    // Step 2: Build comment
    let commentBody = '';

    if (score.reason === 'past_deadline') {
      commentBody = `## Automated PR Evaluation

🚫 **Rejected — submitted after the event deadline.**`;
    } else {
      const testIcon = '⏭️';
      const lintIcon =
        (score.issue_count || 0) === 0 ? '✅' :
        (score.issue_count || 0) <= 5 ? '⚠️' : '❌';

      let lintIssuesBlock = '';
      if (score.lint_issues && score.lint_issues.length > 0) {
        lintIssuesBlock = `<details><summary>Lint details</summary>

\`\`\`
${score.lint_issues.slice(0, 5).join('\n')}
\`\`\`
</details>

`;
      }

      const lhMetrics = score.lh_metrics || {};
      const beMetrics = score.be_metrics || {};
      const beBreakdown = score.be_breakdown || {};

      const lhTable = `| Metric | Value | Score |
|:-------|------:|------:|
| FCP    | ${Math.round(lhMetrics.fcp_ms || 0)}ms | (in total) |
| LCP    | ${Math.round(lhMetrics.lcp_ms || 0)}ms | (in total) |
| TTI    | ${Math.round(lhMetrics.tti_ms || 0)}ms | (in total) |
| TBT    | ${Math.round(lhMetrics.tbt_ms || 0)}ms | (in total) |
| CLS    | ${(lhMetrics.cls || 0).toFixed(3)}     | (in total) |
| **Total** |        | **${Math.round(score.frontend_score || 0)}/25** |`;

      const beTable = `| Metric       | Value       | Score       |
|:-------------|------------:|------------:|
| p95 latency  | ${Math.round(beMetrics.p95_latency_ms || 0)}ms     | ${beBreakdown.p95_latency || '0/10'} |
| Avg latency  | ${Math.round(beMetrics.avg_latency_ms || 0)}ms     | ${beBreakdown.avg_latency || '0/3'} |
| Req/sec      | ${Math.round(beMetrics.req_per_sec || 0)}       | ${beBreakdown.throughput || '0/8'} |
| Error rate   | ${(beMetrics.error_rate_pct || 0).toFixed(2)}%      | ${beBreakdown.error_rate || '0/4'} |
| **Total**    |             | **${Math.round(score.backend_score || 0)}/25** |`;

      const summaryTable = `| Category        | Score          | Max    |
|:----------------|---------------:|-------:|
| Correctness     | skipped        | gate   |
| Code quality    | ${Math.round(score.quality_score || 0)}| 20     |
| Coverage        | ${Math.round(score.coverage_score || 0)}| 10    |
| Frontend perf   | ${Math.round(score.frontend_score || 0)}| 25    |
| Backend perf    | ${Math.round(score.backend_score || 0)} | 25    |
| Bundle size     | ${Math.round(score.bundle_score || 0)}  | 10    |
| **Automated**   | **${Math.round(score.final_score || 0)}** | **90** |
| Manual (judges) | __             | 10     |
| **TOTAL**       | __             | **100** |`;

      let aiSection = '';
      if (llmReview.review && llmReview.review.trim()) {
        aiSection = `---
### 🤖 AI Code Review
${llmReview.review}`;
      }

      commentBody = `## Automated PR Evaluation

${testIcon} **Tests:** Skipped (no test suite)
${lintIcon} **Lint:** ${score.issue_count || 0} issues (${score.error_count || 0} errors, ${score.warning_count || 0} warnings)

### Frontend Performance
${lhTable}

### Backend Performance
${beTable}

### Score Summary
${summaryTable}

🚀 **Accepted for automated review — awaiting judge scoring**

${lintIssuesBlock}${aiSection}`;
    }

    // Step 3: Post comment
    await githubRequest('POST', `/repos/${repo}/issues/${prNumber}/comments`, {
      body: commentBody,
    });
  } catch (err) {
    console.error('Error in post_comment.js:', err);
    process.exit(1);
  }
}

main();

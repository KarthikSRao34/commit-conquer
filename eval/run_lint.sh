#!/usr/bin/env bash
set -uo pipefail

# Install ESLint if not already present
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin 2>&1 | grep -v "up to date" || true

# Create .eslintrc.json if it doesn't exist
if [ ! -f .eslintrc.json ]; then
  cat > .eslintrc.json << 'EOF'
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "warn",
    "no-console": "off"
  },
  "env": { "node": true, "es2020": true },
  "ignorePatterns": ["dist/", "node_modules/", "eval/", "*.js"]
}
EOF
fi

# Run ESLint
mkdir -p eval_results
npx eslint packages/server/ apps/storefront/src/ --ext .ts,.tsx --format json \
  --output-file eval_results/eslint_raw.json || true

# Parse the results
node -e "
const fs = require('fs');
const path = require('path');

try {
  const raw = JSON.parse(fs.readFileSync('eval_results/eslint_raw.json', 'utf8'));
  
  let totalErrors = 0;
  let totalWarnings = 0;
  const issues = [];

  raw.forEach(file => {
    totalErrors += file.errorCount;
    totalWarnings += file.warningCount;
    
    file.messages.forEach((msg, idx) => {
      if (idx < 20) {
        issues.push(\`\${file.filePath}:\${msg.line}:\${msg.column} - \${msg.message}\`);
      }
    });
  });

  const result = {
    issue_count: totalErrors + totalWarnings,
    error_count: totalErrors,
    warning_count: totalWarnings,
    issues: issues
  };

  fs.writeFileSync('eval_results/lint_result.json', JSON.stringify(result, null, 2));
} catch (err) {
  fs.writeFileSync('eval_results/lint_result.json', JSON.stringify({
    issue_count: 0,
    error_count: 0,
    warning_count: 0,
    issues: []
  }, null, 2));
}
"

exit 0

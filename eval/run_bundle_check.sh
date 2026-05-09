#!/usr/bin/env bash
set -uo pipefail
mkdir -p eval_results
npm install -g size-limit @size-limit/file 2>/dev/null || true
npx size-limit --json > eval_results/bundle_result.json 2>/dev/null \
  || echo "[]" > eval_results/bundle_result.json

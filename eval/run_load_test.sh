#!/usr/bin/env bash
set -uo pipefail
mkdir -p eval_results
k6 run eval/load_test.js --env BASE_URL=http://localhost:4000 \
  2>&1 | tee eval_results/k6_output.txt || true
node eval/parse_k6.js

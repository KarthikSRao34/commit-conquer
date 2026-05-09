#!/usr/bin/env bash
set -uo pipefail
mkdir -p eval_results
lhci autorun --config=lighthouserc.json 2>&1 | tee eval_results/lighthouse_output.txt || true
node eval/parse_lighthouse.js

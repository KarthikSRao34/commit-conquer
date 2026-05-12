#!/usr/bin/env bash
set -uo pipefail
mkdir -p eval_results
timeout 120s lhci autorun --config=lighthouserc.json --collect.numberOfRuns=1 --collect.settings.chromeFlags="--no-sandbox" 2>&1 | tee eval_results/lighthouse_output.txt || true
node eval/parse_lighthouse.js

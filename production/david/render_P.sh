#!/bin/bash
# Render every paper-theatre shot of the David short at full quality, one shot per run (resumable).
cd "$(dirname "$0")/../.."
mkdir -p production/david/P
for k in $(seq 0 16); do
  RESUME=1 ONLY=$k timeout 7000 node look_tests/anim.js "paper.html" production/david/P > production/david/P/log_$k.txt 2>&1
  echo "shot $k: $(tail -1 production/david/P/log_$k.txt)" >> production/david/P/progress.txt
done
echo ALL DONE >> production/david/P/progress.txt

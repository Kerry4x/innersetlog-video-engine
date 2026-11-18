#!/bin/bash
# Render every throne-room shot of the David short at full quality, one shot per run (resumable).
cd "$(dirname "$0")/../.."
for k in $(seq 0 28); do
  RESUME=1 ONLY=$k timeout 7000 node look_tests/anim.js "throne.html?anim=full" production/david/T > production/david/T/log_$k.txt 2>&1
  echo "shot $k: $(tail -1 production/david/T/log_$k.txt)" >> production/david/T/progress.txt
done
echo ALL DONE >> production/david/T/progress.txt

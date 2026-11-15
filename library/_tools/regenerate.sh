#!/usr/bin/env bash
# Re-download reference videos from the Drive folder and regenerate their full
# working data (video, full transcript, frames, contact sheets, manifest) into
# ./video_analysis/ (git-ignored). The committed library/*.md files are the
# write-ups; this restores the raw material behind them on demand.
#
#   bash library/_tools/regenerate.sh            # everything
#   bash library/_tools/regenerate.sh T1 S03     # just these entries
#
# Needs: ffmpeg, python deps of the video-analyzer skill (see its requirements.txt),
# and the Drive folder shared by link (it is: drive folder 1jLmGCFP4d7O3xClWClcXw5GranA9Jteh).
set -euo pipefail
SK="${SK:-$(ls -d /root/.claude/skills/synced/*/video-analyzer 2>/dev/null | head -1)}"
OUT="${OUT:-video_analysis}"
mkdir -p "$OUT/src"

# entry | drive file id | local name | analyzer flags
ENTRIES=(
  "T1|18tN6Z4E_X3SFljSZ9-ijt3GcNTNQirwQ|t1|--screen --whisper-model small"
  "T2|1_SzNFKHBlXDev403odH81amBESuWHpPW|t2|--screen --whisper-model small"
  "S01|1y7LjvFDQ8Szv8ILL-09D5l0XatkNuqO9|yt_spermwhale|--whisper-model small"
  "S02|1u9JxbxY7WwbK_aeF6bD_VESUmZL_GHFJ|yt_gladiator|--whisper-model small"
  "S03|1LnNfXg5qZH5Hi_t8g5YkN8I9-B7-wAqh|yt_superpowers|--whisper-model small"
  "S04|1AWpWrmaOvaD8uTLap9LG7jER9FrgGe91|yt_vikings|--whisper-model small"
  "S05|1PavOKNjhgTJrDZhNvKgl3r6n4Zu5vDB7|s_a5bd|--whisper-model small"
  "S06|1Fd-MSqc_UAJ0R7HCG9quhM9K7D8IAau4|s_de34|--whisper-model small"
  "S07|1iRCSHDgUaU4-IBuLqoEctKzOhWKMG8HO|s_2bdf|--whisper-model small"
)

want=("$@")
for e in "${ENTRIES[@]}"; do
  IFS='|' read -r key id name flags <<<"$e"
  if [ ${#want[@]} -gt 0 ] && [[ ! " ${want[*]} " =~ " $key " ]]; then continue; fi
  f="$OUT/src/$name.mp4"
  [ -s "$f" ] || curl -sS -L -o "$f" "https://drive.usercontent.google.com/download?id=$id&export=download&confirm=t"
  echo "== $key ($name)"
  # shellcheck disable=SC2086
  python3 "$SK/scripts/analyze.py" --file "$f" --out "$OUT" $flags
  if [[ "$key" == T* ]]; then python3 "$SK/scripts/workflow.py" "$OUT/local_$name"; fi
done
echo "Done. Full transcripts: $OUT/local_<name>/transcript.txt"

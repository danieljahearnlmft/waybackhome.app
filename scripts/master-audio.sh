#!/usr/bin/env bash
# master-audio.sh — Re-master one or all WBH audio takes.
#
# Usage:
#   ./scripts/master-audio.sh                  # masters all 5 conditions
#   ./scripts/master-audio.sh safety           # masters just one
#   ./scripts/master-audio.sh safety attunement
#
# Reads:  ~/Desktop/WBH App Recorings/wbh-{slug}.wav
# Writes: ~/Projects/waybackhome.app/audio/wbh-{slug}.m4a
#
# After running, commit + deploy with:
#   cd ~/Projects/waybackhome.app
#   git add audio/ && git commit -m "Update audio" && git push
#   netlify deploy --prod --dir=.

set -euo pipefail

SRC_DIR="${HOME}/Desktop/WBH App Recorings"
OUT_DIR="${HOME}/Projects/waybackhome.app/audio"
AMBIENT="${HOME}/Projects/waybackhome.app/ambient.mp3"

ALL=(safety attunement soothing delight exploration)
TARGETS=("$@")
if [ ${#TARGETS[@]} -eq 0 ]; then TARGETS=("${ALL[@]}"); fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found. Install with: brew install ffmpeg"
  exit 1
fi

for slug in "${TARGETS[@]}"; do
  IN="${SRC_DIR}/wbh-${slug}.wav"
  OUT="${OUT_DIR}/wbh-${slug}.m4a"
  if [ ! -f "$IN" ]; then
    echo "✗ missing: $IN"
    continue
  fi
  PEAK=$(ffmpeg -i "$IN" -af "volumedetect" -f null /dev/null 2>&1 | grep "max_volume" | sed 's/.*max_volume: //')
  echo "▶ mastering ${slug} (source peak: ${PEAK})"
  ffmpeg -y -i "$IN" -stream_loop -1 -i "$AMBIENT" -filter_complex "
    [0:a]highpass=f=85,afftdn=nr=10:nf=-45,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=180,equalizer=f=3500:t=q:w=2:g=-2,equalizer=f=8000:t=q:w=2:g=1.5,aexciter=amount=1.5:drive=3:freq=8000:ceil=12000,equalizer=f=13000:t=h:width=4000:g=2.5,loudnorm=I=-16:LRA=3:TP=-1.5[voice];
    [1:a]volume=-22dB,afade=t=in:d=0.6[bed];
    [voice][bed]amix=inputs=2:duration=first:dropout_transition=0[mix];
    [mix]alimiter=limit=0.94:level=true:asc=1[out]
  " -map "[out]" -c:a aac -b:a 128k -ar 44100 -ac 1 -shortest "$OUT" -loglevel error
  SIZE=$(stat -f%z "$OUT" 2>/dev/null || stat -c%s "$OUT")
  echo "  → wrote ${OUT} ($(($SIZE / 1024)) KB)"
done

echo ""
echo "Done. To ship:"
echo "  cd ~/Projects/waybackhome.app"
echo "  git add audio/ && git commit -m 'Update audio' && git push"
echo "  netlify deploy --prod --dir=."

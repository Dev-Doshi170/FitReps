#!/usr/bin/env bash
# Downloads TF.js MoveNet SinglePose Lightning graph + weights from TensorFlow Hub
# into assets/models/movenet/ (bundled offline; avoids device TF Hub / redirect issues).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/models/movenet"
mkdir -p "$OUT"
BASE="https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4"
curl -sL -o "$OUT/model.json" "${BASE}/model.json?tfjs-format=file"
curl -sL -o "$OUT/group1-shard1of2.bin" "${BASE}/group1-shard1of2.bin?tfjs-format=file"
curl -sL -o "$OUT/group1-shard2of2.bin" "${BASE}/group1-shard2of2.bin?tfjs-format=file"
echo "Wrote MoveNet assets to $OUT"
ls -la "$OUT"

#!/usr/bin/env bash
# Modelos reais CC0, baixados das respectivas fontes durante a construção.
# Nenhum arquivo .glb precisa ser obtido manualmente pelo usuário.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p assets
base="https://raw.githubusercontent.com/Ariescar/gobkit-free-assets/main/nature"
for filename in TreeLow001 TreeMed001 Bush001 Rock001 Grass001; do
  echo "Baixando modelo de cenário: ${filename}.glb"
  curl --retry 3 --connect-timeout 15 --max-time 90 -fLsS "$base/${filename}.glb" -o "assets/${filename}.glb"
done
echo "Baixando modelo real CC0 de coelho (Innerscene)."
curl --retry 3 --connect-timeout 15 --max-time 90 -fLsS \
  "https://www.innerscene.com/api/library/domestic-rabbit-d5cbd890/download" -o assets/pipo.glb
python3 tools/verify_assets.py

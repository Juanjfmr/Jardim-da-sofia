"""Valida arquivos GLB reais antes do Godot. Rejeita HTML/404 e arquivos vazios."""
from pathlib import Path
import json
import struct

ASSETS = ("pipo", "TreeLow001", "TreeMed001", "Bush001", "Rock001", "Grass001")
root = Path(__file__).resolve().parents[1] / "assets"
for name in ASSETS:
    path = root / f"{name}.glb"
    content = path.read_bytes()
    assert len(content) > 100, f"Arquivo muito pequeno ou download inválido: {name}"
    assert len(content) < 8_000_000, f"Arquivo muito pesado para protótipo: {name}"
    assert content[:4] == b"glTF", f"Arquivo não é GLB: {name}"
    version, length = struct.unpack_from("<II", content, 4)
    assert version == 2 and length == len(content), f"Cabeçalho GLB inválido: {name}"
    json_length, chunk_type = struct.unpack_from("<II", content, 12)
    assert chunk_type == 0x4E4F534A, f"JSON glTF ausente: {name}"
    asset = json.loads(content[20:20 + json_length])
    assert asset.get("asset", {}).get("version") == "2.0", f"Versão glTF inválida: {name}"
    assert len(asset.get("meshes", [])) >= 1, f"Geometria ausente: {name}"
    external = (asset.get("images", []) + asset.get("buffers", []))
    assert not any(x.get("uri", "").startswith(("http:", "https:")) for x in external), f"URL externa em {name}"
    print(f"ASSET OK: {name}, {len(content)//1024} KB, "
          f"{len(asset.get('meshes', []))} malhas, "
          f"{len(asset.get('animations', []))} clipes")

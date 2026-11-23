"""Empacota artefatos de revisão; exclui caches, dependências e o próprio ZIP."""
import hashlib, pathlib, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
EXCLUDED = {'.cache', 'node_modules', 'artefatos', '__pycache__'}
files = sorted(p for p in ROOT.rglob('*') if p.is_file() and not any(part in EXCLUDED for part in p.relative_to(ROOT).parts) and p.name != 'MANIFEST.sha256')
manifest = ROOT / 'MANIFEST.sha256'
manifest.write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(ROOT).as_posix()}\n' for p in files), encoding='utf-8')
target = ROOT / 'artefatos/piloto-pcc.zip'
target.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for file in files + [manifest]:
        archive.write(file, pathlib.PurePosixPath('piloto-pcc') / file.relative_to(ROOT).as_posix())
with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None
(ROOT / 'artefatos/piloto-pcc.zip.sha256').write_text(hashlib.sha256(target.read_bytes()).hexdigest() + '  piloto-pcc.zip\n', encoding='utf-8')
print(f'{target.name}: {len(files) + 1} arquivos, {target.stat().st_size} bytes; CRC do ZIP verificado.')

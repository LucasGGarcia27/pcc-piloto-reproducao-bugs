"""Extrai o ZIP em cache local e executa o verificador portátil, sem rede."""
import pathlib, subprocess, sys, tempfile, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
cache = ROOT / '.cache'
cache.mkdir(exist_ok=True)
target = pathlib.Path(tempfile.mkdtemp(prefix='zip-check-', dir=cache)).resolve()
assert target.is_relative_to(ROOT)
with zipfile.ZipFile(ROOT / 'artefatos/piloto-pcc.zip') as archive:
    for name in archive.namelist():
        assert (target / name).resolve().is_relative_to(target), name
    archive.extractall(target)
subprocess.run([sys.executable, str(target / 'piloto-pcc/scripts/verificar-entrega.py')], cwd=target, check=True)
print('ZIP extraído em outro caminho e verificado com sucesso; cópia de teste preservada no cache local.')

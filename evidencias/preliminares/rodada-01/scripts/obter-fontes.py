"""Obtém somente o exemplo React e documentação, verificando cada blob Git."""
import concurrent.futures, hashlib, json, pathlib, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'evidencias/fontes/source-tree-selected.json').read_text(encoding='utf-8'))
def download(entry):
    url = f"https://raw.githubusercontent.com/tastejs/todomvc/{manifest['sha']}/{entry['path']}"
    request = urllib.request.Request(url, headers={'User-Agent': 'PCC-feasibility-pilot'})
    data = urllib.request.urlopen(request, timeout=90).read()
    blob = hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()
    assert blob == entry['sha'], (entry['path'], blob)
    target = ROOT / 'aplicacao/todomvc' / entry['path']
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return {'path': entry['path'], 'url': url, 'git_blob': blob, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(download, manifest['tree']))
(ROOT / 'evidencias/fontes/source-integrity.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
print(f'{len(results)} arquivos obtidos; todos os blobs conferem com o commit {manifest["sha"]}.')

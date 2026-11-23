"""Verificação offline e portátil: hashes e avaliação independente das evidências."""
import hashlib, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
manifest = ROOT / 'MANIFEST.sha256'
assert manifest.exists(), 'Execute empacotar.py primeiro para gerar o manifesto.'
count = 0
for line in manifest.read_text(encoding='utf-8').splitlines():
    expected, relative = line.split('  ', 1)
    file = (ROOT / relative).resolve()
    assert file.is_relative_to(ROOT), relative
    assert hashlib.sha256(file.read_bytes()).hexdigest() == expected, f'Hash divergente: {relative}'
    count += 1

def read(relative):
    return json.loads((ROOT / relative).read_text(encoding='utf-8-sig'))

def oracle(records):
    pending = None
    for record in records:
        if record.get('error'):
            continue
        action, before, after = record['action'], record['before'], record['after']
        if action['type'] == 'press' and action['value'] == 'Escape' and before['editing_count'] == 1:
            index = before.get('editing_indices', [0])[0]
            original, edited = before['labels'][index], before['edit_values'][0]
            if original and edited and original != edited and after['editing_count'] == 1 and after['edit_values'][0] == edited:
                pending = (index, edited)
        elif pending:
            blur = action['type'] == 'click' or (action['type'] == 'press' and action['value'] == 'Tab')
            if blur and before['editing_count'] == 1 and after['editing_count'] == 0 and after['labels'][pending[0]] == pending[1]:
                return True
            if action['type'] in ('fill','reload','dblclick') or (action['type'] == 'press' and action['value'] != 'Tab'):
                pending = None
    return False

for config in range(8):
    prefix = f'evidencias/configuracoes/C{config}'
    result = read(f'{prefix}/resultado.json')
    actions = read(f'{prefix}/acoes.json')
    assert result['executed'] and result['valid']
    assert result['actions'] == len(actions)
    assert oracle(actions) == result['bug_reproduced'], f'Oráculo divergente em C{config}'
    assert read(f'{prefix}/initial-state.json')['labels'] == []
    for decision in read(f'{prefix}/decisoes.json'):
        assert decision['native_tool_calls'] == 0
print(f'OK: {count} arquivos íntegros; oito resultados recalculados sem LLM, rede ou navegador.')

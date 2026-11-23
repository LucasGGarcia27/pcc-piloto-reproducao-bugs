"""Valida estrutura básica do PDF produzido pelo Chromium, sem dependências extras."""
import json, pathlib, re, zlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
data = (ROOT / 'docs/relatorio-piloto.pdf').read_bytes()
assert data.startswith(b'%PDF-') and b'%%EOF' in data[-1024:]
pages = len(re.findall(rb'/Type\s*/Page\b', data))
assert pages >= 3, 'PDF sem as páginas esperadas.'
streams = re.findall(rb'stream\r?\n(.*?)\r?\nendstream', data, flags=re.S)
decoded = []
for stream in streams:
    try:
        decoded.append(zlib.decompress(stream))
    except zlib.error:
        pass
text_streams = sum(b'BT' in stream and (b'Tj' in stream or b'TJ' in stream) for stream in decoded)
assert text_streams > 0, 'PDF não contém operadores de texto recuperáveis.'
result = {'pdf_header': True, 'eof': True, 'pages': pages, 'bytes': len(data), 'text_streams': text_streams, 'limitation': 'Validação estrutural e de presença de texto; prévia visual HTML separada, sem renderizador PDF independente.'}
(ROOT / 'evidencias/ambiente/verificacao-pdf.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))

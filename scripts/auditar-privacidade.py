"""Relata classes e caminhos de possíveis dados sensíveis sem exibir valores."""
from collections import defaultdict
from pathlib import Path
import json
import re
import zipfile
from io import BytesIO

root = Path(__file__).resolve().parents[1]
patterns = {
    "credencial_formato_conhecido": re.compile(r"\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})\b"),
    "cabecalho_autorizacao_com_valor": re.compile(r"(?i)\b(?:authorization|proxy-authorization)\s*[:=]\s*[\"']?(?:bearer|basic)\s+[A-Za-z0-9._~+/-]{12,}"),
    "cookie_com_valor": re.compile(r"(?i)\b(?:set-cookie|cookie)\s*[:=]\s*[\"']?(?:[^\s;=]+=[^\s;]{12,})"),
    "campo_segredo_com_valor": re.compile(r"(?i)[\"']?(?:password|passwd|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret)[\"']?\s*[:=]\s*[\"'](?!redacted|none|null|false|true)[^\"']{8,}[\"']"),
    "jwt": re.compile(r"\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{8,}\b"),
    "email": re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I),
    "caminho_perfil_windows": re.compile(r"(?i)\b[A-Z]:[\\/]+Users[\\/]+[^\\/\s\"']+"),
    "cpf_formato": re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b"),
}

results = defaultdict(lambda: defaultdict(int))
scanned = 0
def inspect(name, raw):
    global scanned
    if len(raw) > 8_000_000:
        return
    try:
        content = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return
    if "\0" in content:
        return
    scanned += 1
    for kind, pattern in patterns.items():
        matches = pattern.findall(content)
        if kind == "email":
            # Playwright names screenshot resources like page@hash.jpeg.
            matches = [value for value in matches if not value.lower().endswith((".jpeg", ".jpg", ".png", ".webp", ".gif", ".avif"))]
        count = len(matches)
        if count:
            results[kind][name] += count

for folder in ("evidencias", "dados", "docs", "configuracao-experimento"):
    for file in (root / folder).rglob("*"):
        if file.is_file() and file.suffix.lower() in {".json", ".jsonl", ".txt", ".md", ".csv", ".html", ".log"}:
            inspect(file.relative_to(root).as_posix(), file.read_bytes())

def inspect_trace(name, raw):
    try:
        with zipfile.ZipFile(BytesIO(raw)) as zf:
            for entry in zf.infolist():
                if entry.file_size <= 8_000_000 and entry.filename.lower().endswith((".trace", ".network", ".json", ".jsonl", ".txt", ".log")):
                    inspect(name + ":" + entry.filename, zf.read(entry))
    except zipfile.BadZipFile:
        pass

for file in (root / "evidencias").rglob("trace.zip"):
    inspect_trace(file.relative_to(root).as_posix(), file.read_bytes())

archive = root / "artefatos/piloto-pcc.zip"
if archive.exists():
    with zipfile.ZipFile(archive) as zf:
        for info in zf.infolist():
            if info.filename.lower().endswith((".json", ".jsonl", ".txt", ".md", ".csv", ".html", ".log")) and info.file_size <= 8_000_000:
                inspect("ZIP:" + info.filename, zf.read(info))
            elif info.filename.lower().endswith("trace.zip") and info.file_size <= 20_000_000:
                inspect_trace("ZIP:" + info.filename, zf.read(info))

report = {"files_scanned": scanned, "matches": {kind: {"files": len(files), "occurrences": sum(files.values()), "sample_paths": list(files)[:8]} for kind, files in results.items()}, "scope": "Registros, dados, documentos gerados e cópias textuais do ZIP; valores encontrados não são exibidos."}
print(json.dumps(report, ensure_ascii=False, indent=2))

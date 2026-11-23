$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache/browsers'
npm.cmd ci --cache .cache/npm --no-fund --no-audit
if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependências.' }
npx.cmd playwright install chromium
if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar Chromium.' }
# Os arquivos oficiais já estão incluídos; obter-fontes.py permite baixá-los novamente.
Write-Output 'Instalação concluída dentro de piloto-pcc.'

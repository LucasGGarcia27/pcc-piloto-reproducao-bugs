$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$pccRoot = (Get-Location).Path
$pccStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$pccSource = (Resolve-Path -LiteralPath 'evidencias/configuracoes').Path
$pccArchive = [System.IO.Path]::GetFullPath((Join-Path $pccRoot "evidencias/rodadas-arquivadas/$pccStamp"))
if (-not $pccSource.StartsWith($pccRoot + '\') -or -not $pccArchive.StartsWith($pccRoot + '\') -or (Test-Path -LiteralPath $pccArchive)) { throw 'Caminhos fora do piloto ou arquivo já existente.' }
New-Item -ItemType Directory -Path $pccArchive | Out-Null
Copy-Item -LiteralPath configuracao-experimento -Destination $pccArchive -Recurse
Copy-Item -LiteralPath scripts -Destination $pccArchive -Recurse
Move-Item -LiteralPath $pccSource -Destination (Join-Path $pccArchive 'configuracoes')
New-Item -ItemType Directory -Path evidencias/configuracoes | Out-Null
node scripts/preparar-pacotes.mjs
if ($LASTEXITCODE -ne 0) { throw 'Falha ao gerar pacotes.' }
$pccCoreFiles = @('scripts/lib.mjs','scripts/decisor.mjs','scripts/agente.mjs','scripts/oraculo.mjs','scripts/preparar-pacotes.mjs','scripts/referencia.mjs','scripts/verificar.mjs')
$pccFrozenFiles = @($pccCoreFiles | Get-Item) + @(Get-ChildItem -LiteralPath configuracao-experimento -File -Recurse)
$pccFrozenFiles | Get-FileHash -Algorithm SHA256 | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath evidencias/configuracoes/protocolo-antes-tentativas-sha256.json -Encoding UTF8
Write-Output "Nova rodada preparada. Rodada anterior: $pccArchive"

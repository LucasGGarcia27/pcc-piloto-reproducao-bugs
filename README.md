# Piloto PCC — reprodução de bug real em SPA

Este pacote implementa e documenta o piloto de viabilidade do PCC sobre informações de execução. Usa uma SPA existente, TodoMVC React, e a [issue real #2309](https://github.com/tastejs/todomvc/issues/2309): uma edição cancelada com Escape pode ser aplicada ao perder o foco.

**Identificação da aplicação:** repositório [tastejs/todomvc](https://github.com/tastejs/todomvc), commit `ff43b02e59dfa604386bb382034b2cd07c2bcd8a`, pacote `todomvc-react` 1.0.0, licença MIT. Foram obtidos 29 arquivos oficiais, incluindo fonte e build. O código da aplicação não foi alterado.

Leia primeiro [o relatório](docs/relatorio-piloto.md), [os resultados](docs/resultados.csv) e [o texto acadêmico pronto](docs/texto-para-pcc.md). O [resumo JSON](docs/resumo.json) contém os números consolidados da rodada final. O relatório também está disponível em [PDF](docs/relatorio-piloto.pdf).

## O que foi executado

- Reprodução de referência determinística, com registro do bug em Chromium real.
- Captura de A, B e C, separação em JSON e geração de oito pacotes.
- Uma rodada preliminar de oito tentativas, preservada integralmente, seguida de correção da composição dos pacotes para remover notas do pesquisador.
- Uma rodada final com uma tentativa LLM independente em C0–C7, usando Codex CLI/ChatGPT e Playwright.
- Avaliação por ações e DOM, auditoria dos prompts, sessões, ferramentas, hashes e resultados.

A rodada preliminar **não** entra na tabela principal. Sua motivação e seus resultados estão em [evidencias/preliminares/rodada-01](evidencias/preliminares/rodada-01/README.md).

A primeira C0 com pacotes finais foi interrompida por limite de uso após três ações. Ela foi preservada em [evidencias/interrupcoes](evidencias/interrupcoes/README.md), com resultado nulo, e reiniciada em estado vazio quando o limite foi restabelecido. Nenhuma tentativa válida foi descartada. O consumo de cada fase consta de `docs/consumo-por-fase.json`.

## Requisitos e instalação

Ambiente usado: Windows, Node.js 24.22.1, npm 11.19.1, Python 3.13.5, Playwright 1.65.1, Chromium 159.0.8154.6 e Codex CLI 0.162.0-alpha.17.2. Não é necessário Docker, banco de dados ou recompilar o TodoMVC. Python é usado para download, verificação offline e empacotamento; Node executa o navegador e o agente.

No PowerShell, a partir da pasta `piloto-pcc`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/instalar.ps1
```

O script executa `npm ci` e instala o Chromium em `.cache/browsers`, dentro do piloto. Dependências e cache não estão no ZIP. Os arquivos da aplicação já estão incluídos. Para baixá-los novamente do mesmo commit, com validação de cada blob:

```powershell
python scripts/obter-fontes.py
```

## Conferir a entrega sem executar o LLM

```powershell
python scripts/verificar-entrega.py
```

Esse comando verifica o manifesto SHA-256 e recalcula os resultados a partir das evidências, sem rede, LLM ou navegador. Funciona também após extrair o ZIP em outro diretório. Não regenera os resultados originais.

No workspace original, com os dois documentos de contexto ainda ao lado de `piloto-pcc`, a verificação adicional de navegador e integridade é:

```powershell
npm run verify
node scripts/auditar-resultados.mjs
```

O primeiro comando verifica também os documentos de contexto em seus caminhos originais. Fora deste workspace, use a verificação offline do pacote. Os comandos de verificação de navegador precisam da porta 4173 livre.

## Abrir a aplicação e observar o bug

```powershell
node scripts/servir.mjs
```

Abra `http://127.0.0.1:4173`. Crie uma tarefa, edite o título com duplo clique, altere o texto, pressione Escape e clique no campo de nova tarefa. A evidência esperada é a edição não ser encerrada por Escape e o título alterado aparecer depois da perda de foco. Essa observação humana não é contada como tentativa LLM.

## Referência e coleta

```powershell
npm run reference
npm run packages
```

Esses comandos **regeneram** os dados e a referência. Para preservar a entrega científica existente, execute-os em uma cópia extraída em outra pasta. O servidor é iniciado e encerrado pelo script. A referência escreve quatro capturas, trace, resultado, reset, tráfego bruto e eventos brutos. O gerador de pacotes seleciona apenas `category` e `records` por allowlist; as notas explicativas ficam fora dos prompts.

## Executar novas tentativas LLM

É necessário o Codex CLI autenticado por uma conta autorizada e acesso ao mesmo modelo. Não envie chaves ou tokens ao chat e não os coloque no repositório. O piloto usou autenticação ChatGPT; não há adaptador de API paga nem contratação de serviço.

```powershell
codex login
codex login status
$env:PCC_CODEX = (Get-Command codex).Source
npm run pilot
```

O executor preserva resultados existentes e não repete silenciosamente configurações concluídas. Para uma **nova rodada**, use uma cópia do pacote e o utilitário abaixo, que arquiva os resultados existentes dentro da própria cópia, conserva a referência e registra novo manifesto:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/nova-rodada.ps1
npm run pilot
node scripts/auditar-resultados.mjs
node scripts/gerar-relatorios.mjs
```

O utilitário não deve ser usado na entrega original se a intenção for apenas revisão. Não altere modelo, pacotes ou instruções entre configurações de uma mesma rodada. O alias `gpt-6-astra` e esforço `low` estão em `configuracao-experimento/protocolo.json`. Não se garante disponibilidade futura desse alias. O uso da conta pode consumir sua franquia; o CLI não informou custo monetário por chamada.

O modelo escolhe uma ação por vez; um broker aplica ações de UI por IDs visíveis. Não há script de sequência correta no agente. O roteiro conhecido fica apenas em `scripts/referencia.mjs`, sem acesso por parte do modelo. Cada chamada é efêmera; somente o histórico da tentativa corrente é inserido no prompt. O avaliador fica fora desse contexto.

## Evidências, PDF e ZIP

- `dados/`: registros separados A/B/C.
- `configuracao-experimento/`: protocolo, relato básico, instruções, schema e pacotes.
- `evidencias/referencia/` e `evidencias/capturas/`: referência, estados e telas.
- `evidencias/configuracoes/C0` até `C7`: decisões reais, prompts, eventos JSONL, ações, estados, capturas, trace e resultado.
- `evidencias/configuracoes/auditoria.json`: reavaliação e controles de acesso.
- `evidencias/fontes/`: metadados da issue, commit e integridade do código oficial.
- `evidencias/preliminares/`: rodada anterior e sua justificativa de exclusão da tabela final.
- `docs/texto-para-pcc.md`: texto para revisão e inserção no PCC; o DOCX original não foi editado.
- `artefatos/piloto-pcc.zip`: pacote de revisão, sem dependências, caches e credenciais.

Para inspecionar um trace localmente, por exemplo:

```powershell
npx playwright show-trace evidencias/configuracoes/C0/trace.zip
```

Para regenerar os documentos a partir dos resultados auditados, sem novas chamadas LLM:

```powershell
node scripts/gerar-relatorios.mjs
node scripts/exportar-pdf.mjs
python scripts/empacotar.py
python scripts/verificar-entrega.py
```

## Limitações essenciais

O caso é demonstrativo e simples; não há API de negócio das tarefas nem exceção JavaScript associada ao defeito. B contém tráfego de carregamento e C contém eventos de ciclo de vida. A execução das oito configurações foi possível, mas isso não demonstra a contribuição das categorias. Uma tentativa por configuração não sustenta inferência estatística ou causal.

O recurso auxiliar `learn.json` não está no dist oficial e retorna 404. Essa ocorrência é documentada e não é usada como prova do bug. O modelo recebe uma representação textual dos controles visíveis, não imagens. O acesso foi restringido e auditado no CLI utilizado; não é uma garantia formal para futuras versões do CLI. Não houve avaliação humana independente nem execução de versão corrigida. Leia o relatório para as limitações metodológicas completas.

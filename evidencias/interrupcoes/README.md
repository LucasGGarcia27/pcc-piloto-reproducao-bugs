# Interrupção por limite de uso

A primeira execução da rodada final corrigida começou por C0 em 23/11/2026 às 02:10:54, fuso America/Sao_Paulo. Foram realizadas três ações e três chamadas LLM concluídas. A quarta decisão falhou porque o Codex retornou `You’ve hit your usage limit`, conforme `C0-limite-de-uso/decision-04/events.jsonl`.

O executor encerrou a tentativa como `valid: false`, `bug_reproduced: null`. C1–C7 não chegaram a ser iniciadas. Essa interrupção é de infraestrutura e não é fracasso de reprodução nem tentativa válida da tabela final.

Após o usuário informar que o limite foi restabelecido, os arquivos existentes foram conferidos. O protocolo e os pacotes corrigidos permaneceram inalterados. A tentativa interrompida foi movida integralmente para esta pasta e a execução final foi retomada a partir de um estado vazio, com novas sessões. Não houve aproveitamento das três ações anteriores nem de seu histórico pelo agente.

Os campos de caminhos nos registros arquivados refletem o local original no momento da interrupção. O conteúdo e os resultados originais não foram modificados. O consumo das três chamadas concluídas permanece nos registros e não integra os totais da rodada final válida.

# Fontes e seleção do bug

Consulta em 23/11/2026. Os documentos originais lidos foram `contexto/PCC.docx` e `contexto/metodologia_proposta_pcc.md`. O nome `PCC - Copia.docx` mencionado na tarefa não corresponde ao arquivo recebido; usou-se o PCC.docx existente, sem renomeá-lo ou alterá-lo.

## Avaliação inicial: ReBug e Metabase

O [artigo ReBug, arXiv:2608.03598v1](https://arxiv.org/html/2608.03598v1) foi consultado nas seções IV-A, IV-E e V-A. Metabase integra o conjunto de aplicações do trabalho; a implantação relatada utiliza Docker. O estudo distingue execução em instalações atuais de reprodução histórica. Logo, pertencer ao conjunto de issues públicas do Metabase não basta para afirmar que um caso integra o benchmark.

Na consulta ao artigo e na busca efetuada não foi localizado um artefato com a lista de IDs e versões dos casos do benchmark que pudesse ser diretamente utilizado neste piloto. Isso é uma limitação da busca realizada, não prova de inexistência do artefato. Também foram consultados o [repositório](https://github.com/metabase/metabase) e suas [issues](https://github.com/metabase/metabase/issues).

O comando local `docker version` confirmou a ausência de daemon acessível; sua saída está em `../evidencias/ambiente/docker-inicial.txt`. A documentação [Running the Metabase JAR file](https://www.metabase.com/docs/latest/installation-and-operation/running-the-metabase-jar-file) apresenta uma alternativa sem Docker, e Java 21 estava disponível. Portanto, não se concluiu que Metabase fosse impossível de executar. Optou-se por reduzir o custo de reconstrução e de identificação de versões: o candidato alternativo fornece o commit exato e um build estático rastreável. Nenhum bug do Metabase foi instalado ou testado; não houve falha de reprodução atribuída ao Metabase.

## Caso selecionado

- Aplicação: TodoMVC, implementação React, SPA pública existente e de finalidade demonstrativa. Não é uma aplicação criada pelo pesquisador, mas também não representa a complexidade de um sistema de produção.
- Repositório: https://github.com/tastejs/todomvc
- Issue: [#2309 — cancelamento de edição não descarta a alteração](https://github.com/tastejs/todomvc/issues/2309), aberta em 06/11/2026 e ainda aberta na consulta.
- Commit exato: [`ff43b02e59dfa604386bb382034b2cd07c2bcd8a`](https://github.com/tastejs/todomvc/commit/ff43b02e59dfa604386bb382034b2cd07c2bcd8a), explicitamente indicado pelo relato.
- Identificação local: `examples/react/package.json` declara `todomvc-react`, versão 1.0.0; o commit, e não esse número genérico, identifica a versão experimental.
- Licença: MIT, preservada em `../aplicacao/todomvc/license.md`, além das licenças das dependências no bundle.
- Distribuição usada: `examples/react/dist`, baixada do mesmo commit. Nenhuma compilação ou alteração no código da aplicação foi necessária.
- Correção: não foi identificado commit de correção verificável nesta consulta. Não houve execução de uma versão corrigida.

O comportamento esperado foi conferido na [especificação no commit usado](https://github.com/tastejs/todomvc/blob/ff43b02e59dfa604386bb382034b2cd07c2bcd8a/app-spec.md). O defeito é funcional: uma edição cancelada pode substituir o título original. O fluxo de referência cria uma tarefa, altera seu título, tenta cancelar com Escape e desloca o foco. A falha exige verificar o editor depois de Escape e o rótulo depois de perder o foco; ler somente o rótulo oculto imediatamente após Escape pode produzir um falso negativo.

As cópias dos metadados da issue, commit e árvore selecionada estão em `../evidencias/fontes/`. `source-integrity.json` registra URL, SHA-256 e SHA-1 do blob Git de cada um dos 29 arquivos. O download verifica os blobs contra a árvore do commit; `npm run verify` confere novamente os SHA-256. A árvore local é uma extração parcial identificada, não um clone integral.

## Ferramentas e decisões de controle

- [Playwright BrowserContext](https://playwright.dev/docs/api/class-browsercontext): contextos não persistentes separados para restaurar o estado entre tentativas.
- [Playwright Page](https://playwright.dev/docs/api/class-page): ações reais de navegador, capturas e observação de eventos.
- [Codex em modo não interativo](https://learn.chatgpt.com/docs/non-interactive-mode): execução com saída estruturada e eventos JSONL.
- [Configuração do Codex](https://learn.chatgpt.com/docs/config-file/config-reference): desativação das ferramentas de shell, leitura de imagens e busca; substituição das instruções do modelo e desativação de documentos de projeto.

O agente experimental usa o CLI autenticado por ChatGPT. Não são copiadas credenciais para os artefatos. O mecanismo de decisão recebe apenas o pacote selecionado e observações visíveis. A automação determinística de referência não é contabilizada como tentativa do LLM.

## Registro das escolhas e limitações de seleção

1. Preferência inicial por ReBug/Metabase, seguida de análise de infraestrutura e rastreabilidade de versões.
2. Seleção de uma SPA existente com bug externo documentado, commit exato e build pronto.
3. Confirmação experimental do defeito antes de qualquer tentativa LLM.
4. Constatação de que esta versão usa estado React em memória. A suposição inicial de localStorage foi corrigida ao inspecionar o código e os registros de estado; não há API funcional de tarefas.
5. B captura apenas carregamento de recursos; C contém eventos de ciclo de vida, sem erro JavaScript associado ao defeito. Isso limita o valor deste caso para comparar categorias. Não foram fabricadas mensagens de console ou requisições de API.
6. O dist original não inclui `learn.json`, solicitado pelo script auxiliar `base.js`. Seu 404 e a mensagem correspondente estão nos registros brutos. Esse problema auxiliar não é o bug selecionado; o erro de recurso foi excluído de C para evitar misturar B e C.

O piloto verifica a infraestrutura e um caso real de interação, mas a seleção de um caso com dados B e C funcionalmente relevantes continua necessária antes do experimento principal. Não se afirma que o TodoMVC integra o ReBug.

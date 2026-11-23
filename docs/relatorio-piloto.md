# Relatório do estudo piloto de viabilidade

Data: 23/11/2026 — fuso America/Sao_Paulo.

**Estado:** execução técnica das oito configurações concluída. **Viabilidade para o desenho completo do TCC:** parcialmente demonstrada, pois B e C não apresentam informação diagnóstica substancial neste caso. Os documentos originais do PCC permanecem intactos.

## 1. Objetivo

Verificar se um bug real de uma SPA pode ser reproduzido em referência, ter informações A/B/C capturadas e separadas, ser apresentado a um agente LLM em oito configurações independentes e receber avaliação baseada no comportamento real do navegador. O piloto não testa estatisticamente a hipótese principal.

## 2. Aplicação e bug selecionados

Utilizou-se o [TodoMVC React](https://github.com/tastejs/todomvc), no commit **ff43b02e59dfa604386bb382034b2cd07c2bcd8a**. O pacote do exemplo declara versão 1.0.0; a identificação experimental é o SHA completo. A aplicação e as licenças foram obtidas do repositório oficial. O build dist incluído no commit foi servido sem alterações nem recompilação.

A [issue #2309](https://github.com/tastejs/todomvc/issues/2309) descreve uma edição que não é cancelada por Escape e depois é aplicada ao perder o foco. O relato é externo e anterior ao piloto. Não foi inserido defeito artificial. Não foi identificado commit de correção verificável; não se executou uma versão corrigida.

## 3. Justificativa da seleção

O ReBug e a possibilidade de utilizar o Metabase foram investigados primeiro. O Docker local não tinha daemon acessível. Embora exista instalação por JAR, não foi localizado na consulta realizada um artefato diretamente utilizável com a associação entre IDs e versões históricas do benchmark. Priorizou-se então um candidato com commit exato, distribuição pronta e execução local simples. O TodoMVC é uma SPA demonstrativa real e existente, mas sua representatividade para aplicações de produção é restrita. A decisão, os candidatos consultados e as fontes estão em [fontes-e-bug.md](fontes-e-bug.md).

## 4. Ambiente experimental

Windows, Node.js v24.22.1, npm 11.19.1, Playwright 1.65.1 e Chromium 159.0.8154.6, em modo headless. Janela de 1280 × 800, locale en-US e fuso America/Sao_Paulo. Aplicação em http://127.0.0.1:4173, acessível apenas pela interface loopback. Contextos não persistentes e novos em cada tentativa. A versão mantém tarefas em memória React; a lista inicial e o armazenamento vazio foram conferidos.

Agente: Codex CLI 0.162.0-alpha.17.2, modelo gpt-6-astra, esforço de raciocínio low, autenticação existente por ChatGPT. O alias foi fixado, mas não houve acesso a um identificador imutável do modelo servido. Instruções, aplicação, limites, observações e avaliador foram mantidos constantes na rodada final.

Limites: 20 ações, 600 segundos por tentativa e 90 segundos por decisão. O executor limita cada prompt a 60.000 caracteres e interrompe após atingir 12.000 tokens acumulados de saída. Este último é um limite verificado entre chamadas, não um teto rígido dentro de cada chamada. Os limites não foram alcançados.

## 5. Procedimento realizado

Foram lidos os dois documentos de contexto e calculados seus hashes. Foram baixados 29 arquivos do commit selecionado, com conferência de cada blob Git e registro de SHA-256. A referência determinística criou a tarefa buy milk, alterou seu texto para changed, pressionou Escape e deslocou o foco para o campo de criação. Foram realizadas 7 ações contando a navegação inicial, em 3.00 segundos. Essa execução não é uma tentativa do agente.

O critério de sucesso foi definido antes das tentativas: devem ocorrer conjuntamente a manutenção do editor com o texto modificado após Escape e a aplicação desse texto ao rótulo após uma ação que tira o foco. A afirmação do modelo não participa do cálculo. Controles negativos do avaliador asseguram que um salvamento normal com Enter, apenas um sintoma incompleto ou ausência de ações não sejam classificados como o bug. Esses controles são testes do avaliador, não novas tentativas LLM.

Uma rodada preliminar foi preservada em evidencias/preliminares. Na revisão, constatou-se que notas explicativas de coleta e armazenamento estavam sendo enviadas junto de B e C. Para não introduzir informação adicional do pesquisador, os pacotes finais passaram a conter somente category e records. A rodada final foi iniciada com novo manifesto, estado vazio e sessões independentes. Os resultados preliminares não foram somados aos resultados finais nem tratados como repetições estatísticas. Não houve escolha de resultados com base em sucesso ou fracasso.

O LLM tomou uma decisão por chamada, retornando JSON. O executor aplicou a ação com Playwright e devolveu somente a interface visível. Não existe sequência de reprodução embutida no executor do agente. Cada decisão recebeu apenas o histórico de ações de sua própria tentativa; cada chamada criou um novo thread efêmero, sem retomar threads anteriores. O uso de cache de prefixos informado pelo provedor não constitui memória de tentativas.

## 6. Categorias capturadas

| Categoria | Arquivo | Conteúdo e limites |
|---|---|---|
| A — interações | dados/interacoes.json | Sete registros da referência: navegação, preenchimentos, teclas, duplo clique e mudança de foco, com ordem e tempos. |
| B — comunicação | dados/comunicacao.json | Cinco requisições de carregamento: quatro respostas 200 e um 404 de recurso auxiliar. Nenhuma API funcional de tarefas ou resposta de API de negócio. |
| C — execução | dados/eventos.json | DOMContentLoaded e load; nenhuma exceção JavaScript associada ao defeito. |

O dist original não inclui learn.json, solicitado por base.js. O 404 e a mensagem de carregamento aparecem na captura bruta, mas esse problema auxiliar não foi usado como critério do bug. A mensagem de recurso foi excluída do pacote C, permanecendo documentada em eventos-brutos.json; o registro HTTP permanece em B. Não foram inventados eventos para preencher categorias.

As categorias são separadas por origem, e não por impossibilidade de inferência semântica: uma requisição pode permitir inferir navegação. B não contém ações nem corpos de código-fonte; C não contém ações ou registros HTTP. A, por conter o fluxo de interação completo da referência, é altamente informativa neste caso. Isso explicita uma tensão na proposta: é necessário definir, no TCC, se A deve incluir toda a sequência ou um recorte. Aqui não foi fornecido ao modelo o roteiro privado, o avaliador ou as capturas da referência; a sequência que ele recebe em A é o próprio dado autorizado.

### Interrupção e retomada

A primeira tentativa com os pacotes finais foi interrompida em C0 após três ações. A quarta decisão recebeu do provedor a mensagem de limite de uso. O resultado foi corretamente registrado como inválido, com bug_reproduced nulo, e C1–C7 não foram iniciadas naquela execução. Após o usuário informar o restabelecimento do limite, foram conferidos os arquivos e os 19 hashes do protocolo; nenhum divergente foi encontrado. A tentativa interrompida foi preservada em evidencias/interrupcoes/C0-limite-de-uso. Como nenhuma configuração final tinha uma tentativa válida, a rodada final foi retomada em C0, com estado vazio e sem histórico anterior. Essa interrupção não foi classificada como falha de reprodução.

## 7. Configurações executadas

| Configuração | Informação | Executada? | Bug reproduzido? | Ações | Tempo (s) | Evidência |
|---|---|---|---|---:|---:|---|
| C0 | Nenhuma | Sim | Sim | 6 | 42.93 | [Resultado](../evidencias/configuracoes/C0/resultado.json) |
| C1 | A | Sim | Sim | 6 | 43.75 | [Resultado](../evidencias/configuracoes/C1/resultado.json) |
| C2 | B | Sim | Não | 6 | 41.00 | [Resultado](../evidencias/configuracoes/C2/resultado.json) |
| C3 | C | Sim | Sim | 6 | 43.39 | [Resultado](../evidencias/configuracoes/C3/resultado.json) |
| C4 | A + B | Sim | Sim | 6 | 41.97 | [Resultado](../evidencias/configuracoes/C4/resultado.json) |
| C5 | A + C | Sim | Sim | 6 | 44.98 | [Resultado](../evidencias/configuracoes/C5/resultado.json) |
| C6 | B + C | Sim | Não | 5 | 37.05 | [Resultado](../evidencias/configuracoes/C6/resultado.json) |
| C7 | A + B + C | Sim | Sim | 6 | 45.74 | [Resultado](../evidencias/configuracoes/C7/resultado.json) |

Os tempos incluem as chamadas ao LLM e as ações do navegador, até a conclusão do loop; não incluem a instalação, a pesquisa inicial ou o fechamento posterior do trace. A navegação inicial automática e finish não entram na contagem de ações do agente. Preenchimento e tecla contam separadamente.

## 8. Resultados observados

O defeito foi confirmado em **6/8 tentativas finais**, com tempo total de 340.80 segundos (5.68 minutos). A avaliação foi recalculada a partir dos registros, independentemente do texto final do agente. Mesmo C0 recebeu um relato suficiente para orientar a busca em uma interface simples; isso pode produzir um efeito de teto. Não se demonstrou contribuição marginal de A, B ou C, nem equivalência entre categorias.

| Configuração | Chamadas LLM | Tokens de entrada | Entrada em cache | Tokens de saída |
|---|---:|---:|---:|---:|
| C0 | 7 | 43229 | 17280 | 318 |
| C1 | 7 | 44416 | 24192 | 313 |
| C2 | 7 | 44619 | 24192 | 317 |
| C3 | 7 | 43550 | 24192 | 313 |
| C4 | 7 | 45803 | 24192 | 304 |
| C5 | 7 | 44754 | 31488 | 304 |
| C6 | 6 | 38302 | 24960 | 299 |
| C7 | 7 | 46158 | 26624 | 311 |

Total da rodada final: 350831 tokens de entrada, dos quais 197120 informados como cache, e 2479 tokens de saída. Cache é subconjunto da entrada e não deve ser somado novamente. O teste de conexão e a rodada preliminar têm consumos separados em seus JSONL; não estão nesses totais. Não foram usadas chaves de API paga. Houve uso da franquia da conta ChatGPT; não foi disponibilizado um valor monetário por chamada, portanto não se declara custo financeiro zero.

### Sintoma parcial e declaração do agente

Em C2, C6, o editor permaneceu aberto após Escape, confirmando o primeiro sintoma do defeito. Em C2, a ação seguinte foi press Enter. Em C6, o agente encerrou a tentativa sem outra ação de interface após Escape. Enter é uma confirmação explícita da edição, e não a ação de perda de foco exigida pelo critério predefinido. Encerrar a tentativa após Escape também deixa de verificar a segunda parte. Por isso, os resultados principais permanecem **não reproduzidos integralmente pelo critério**, embora o sintoma de cancelamento tenha sido observado. As tentativas não foram refeitas nem reclassificadas para aumentar a taxa de sucesso.

A análise complementar está em docs/analise-sintomas.json e é descritiva; não substitui o resultado primário. O campo interno escape_symptom_seen, quando presente no oráculo original, reflete apenas a existência de uma sequência ainda pendente no fim do avaliador; não deve ser interpretado como inventário histórico dos sintomas. Os estados por ação e a análise complementar mostram o que foi efetivamente observado. Essa distinção evidencia a importância de pré-especificar o critério e de revisar a semântica dos campos do avaliador no TCC.

### Consumo de todas as fases

| Fase | Chamadas concluídas | Chamadas com falha | Entrada | Saída |
|---|---:|---:|---:|---:|
| Teste de conexão sem bug | 1 | 0 | 5488 | 27 |
| Rodada preliminar com notas | 56 | 0 | 360278 | 2511 |
| C0 interrompida por limite | 3 | 1 | 18092 | 120 |
| Rodada final válida | 55 | 0 | 350831 | 2479 |

O consumo da chamada que falhou não foi informado pelo provedor. Os valores acima são os tokens observados, sem estimar os ausentes. As oito tentativas preliminares e a C0 interrompida são preservadas, mas não entram no denominador da tabela final. Os avisos do teste de conexão foram inicialmente tratados pelo validador como tipo inesperado; o JSONL comprova que houve resposta LLM válida. O reconhecimento de avisos foi corrigido antes das tentativas experimentais.

## 9. Evidências e auditoria

A referência está em evidencias/referencia/resultado.json, trace.zip e nas quatro imagens de evidencias/capturas. Cada configuração final contém estado inicial, ações com estados antes/depois, capturas por passo, imagem final, trace, avaliador, decisões e saída do CLI. Cada decisão preserva o prompt exato, os argumentos de invocação, o JSON produzido e os eventos do provedor.

A auditoria conferiu 55 prompts, 55 threads distintos, zero chamadas nativas a ferramentas do CLI, pacotes exatos por allowlist, históricos limitados à configuração e estados iniciais vazios. Os hashes do protocolo registrado antes das tentativas conferem. Consulte evidencias/configuracoes/auditoria.json e evidencias/ambiente/verificacao.json.

O servidor expõe apenas os quatro arquivos necessários da distribuição; não serve dados, evidências ou mapas de código. O agente só pode selecionar IDs da interface visível e ações predefinidas. Testes reais rejeitaram JavaScript arbitrário, seletores livres, F12 e links externos. As ferramentas de shell, leitura de imagens, apps, plugins, navegador externo, subagentes e memória do CLI foram desativadas. A auditoria verificou que nenhuma foi utilizada. Esses controles foram verificados no ambiente utilizado; não constituem uma prova formal de isolamento contra todas as versões futuras do CLI ou contra um processo host comprometido.

Os avisos do CLI sobre recurso experimental de descoberta de skills e Code Mode desativado foram preservados. São avisos de configuração, não falhas da aplicação nem tentativas de ferramentas.

## 10. Limitações

A amostra contém um único bug curto, uma SPA demonstrativa e uma tentativa final por configuração. A escolha do caso foi orientada por viabilidade, sem amostragem aleatória. A ordem C0–C7 foi fixa, embora as sessões e o estado tenham sido separados. Latência do serviço e carga da máquina não foram controladas. Não houve comparação com uma versão corrigida, avaliação humana independente ou verificação em outros navegadores. Conhecimento prévio do modelo sobre aplicações públicas não pode ser excluído.

B e C têm baixa relevância para a falha selecionada. Eventos de ciclo de vida do navegador são uma operacionalização mínima de C e não equivalem a logs internos da aplicação. O teste valida sua captura e seleção, não a suficiência dessas categorias para o experimento principal. Corpos de respostas de APIs de negócio não foram exercitados. A interface oferecida ao agente é uma descrição dos elementos visíveis, e não visão por screenshot; as imagens são evidências do pesquisador. O alias do modelo e o teto de tokens limitado entre chamadas restringem a reprodutibilidade exata.

A rodada preliminar antecedente teve notas explicativas nos pacotes e foi separada integralmente. Ela não foi aproveitada para aumentar o tamanho da amostra. A versão final do protocolo trata apenas os registros capturados como variáveis experimentais.

## 11. Avaliação de viabilidade

| Requisito | Classificação | Fundamentação |
|---|---|---|
| Reprodução de referência | Demonstrada | Defeito observado em versão rastreada, com estados e imagens. |
| Coleta das três categorias | Parcialmente demonstrada | A é relevante; B é tráfego de carregamento; C contém ciclo de vida, sem diagnóstico da falha. |
| Separação dos dados | Demonstrada neste caso | Arquivos e pacotes por allowlist, auditoria de cada prompt. |
| Controle de acesso | Demonstrado no executor utilizado | Interface restrita, ferramentas auxiliares desativadas, testes de bloqueio e zero uso nativo registrado. |
| Execução independente do agente | Demonstrada | Oito contextos vazios, threads distintos, históricos locais. |
| Verificação objetiva | Demonstrada | Avaliador independente da declaração do modelo, validado e recalculado. |
| Repetição e ampliação | Parcialmente demonstrada | Execução repetida e scripts entregues; novos bugs, APIs, oráculos e repetições exigem trabalho adicional. |

## 12. Próximos passos para o TCC

Selecionar casos com falhas observáveis e dados A, B e C substanciais; registrar commits defeituosos e corrigidos quando possível; definir a granularidade dos registros A e a fronteira de eventos C; validar a redação dos relatos sem incluir o roteiro; congelar os pacotes antes da execução; randomizar a ordem e realizar repetições balanceadas. Recomenda-se revisão humana dos critérios e das capturas e seleção do tamanho da amostra após estimar variabilidade e consumo. O ambiente deve permanecer controlado, sem ser adicionado como quarta categoria experimental.

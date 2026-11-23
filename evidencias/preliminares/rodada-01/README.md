# Rodada preliminar preservada — não somar à rodada final

Foram executadas oito tentativas, C0–C7, com sete chamadas LLM e seis ações cada. Todas reproduziram o defeito; os resultados e a auditoria estão em `configuracoes/`.

Durante a revisão metodológica, constatou-se que os pacotes B/C continham, além dos registros, notas explicativas escritas pelo pesquisador. Em B, uma nota informava a implementação do estado em memória React, inferida também da inspeção do código. Embora as condições reais fossem constantes, essa nota acrescentava contexto além dos registros autorizados.

A alteração para a versão 1.1.0 do protocolo retirou todas as notas dos pacotes, preservando somente `category` e `records`. A rodada final foi executada novamente para todas as configurações, inclusive aquelas cujo pacote não tinha sido alterado, mantendo o balanceamento de uma tentativa final por configuração.

Não houve seleção de resultados favoráveis. A decisão de corrigir os pacotes foi informada antes da segunda rodada. Os resultados preliminares permanecem disponíveis, mas não são combinados com os finais nem apresentados como repetições independentes sob um único protocolo.

Os caminhos absolutos e campos `evidence` dentro dos registros históricos referem-se ao local original da primeira execução. Para inspecionar esta rodada, use o prefixo local `configuracoes/`. A cópia de `configuracao-experimento/` e dos scripts preserva os artefatos utilizados e o manifesto original. Não execute os scripts arquivados diretamente; a execução suportada usa os scripts da raiz do piloto.

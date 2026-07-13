# Antifraude

## Objetivo

Reduzir abuso e perdas sem bloquear injustamente usuários legítimos. O módulo começa com sinais e revisão; decisões automáticas de alto impacto exigem validação jurídica, testes, explicabilidade e canal de contestação.

## Sinais iniciais possíveis

- Muitas tentativas de pagamento, cupons ou código de entrega em intervalo curto.
- Repetição anormal de cancelamentos, reembolsos ou contestações.
- Múltiplas contas ou pedidos com padrões técnicos e comerciais correlacionados.
- Mudanças abruptas de localização ou sequência logisticamente impossível.
- Divergência entre valor calculado, estado do pedido e retorno do provedor.
- Aceites de entrega concorrentes ou manipulação de disponibilidade.
- Alterações de privilégio, dados de repasse ou cadastro fiscal fora do padrão.

Um sinal isolado não prova fraude. Dados sensíveis e atributos que possam causar discriminação não devem ser usados sem necessidade, base legal e avaliação adequada.

## Fluxo de alerta

1. Evento gera sinais mínimos e identificador de correlação.
2. Regras versionadas produzem pontuação e motivos legíveis.
3. O alerta recebe severidade e ação recomendada.
4. Casos relevantes passam por revisão humana autorizada.
5. A ação e a justificativa são auditadas.
6. Usuário afetado recebe comunicação adequada e meio de contestação quando aplicável.
7. Resultado alimenta métricas de falso positivo, sem reutilização incompatível dos dados.

## Controles preventivos

- App Check, limites de taxa e validação no backend.
- Idempotência, transações e webhooks assinados.
- Código de entrega com hash, expiração e limite de tentativas.
- Cupons com elegibilidade, vigência, quantidade e uso atômico.
- Mudanças de pagamento, comissão e repasse somente por serviços autorizados.
- Atraso ou revisão adicional para alterações financeiras de alto risco.

## Dados e segurança

Coletar apenas sinais necessários, definir retenção e restringir acesso. Não registrar dados completos de cartão. Hashes de identificadores ainda podem ser dados pessoais e devem receber proteção. Exportações e consultas de alertas são auditadas.

## Métricas

- Alertas por regra e severidade.
- Fraudes confirmadas e perdas evitadas.
- Falsos positivos e contestações procedentes.
- Tempo de análise e impacto na conversão.
- Distribuição de decisões para detectar viés indevido.

## Pendências

- Aprovar política de risco, limiares e ações.
- Definir equipe de análise e SLA.
- Avaliar fornecedor antifraude e compartilhamentos.
- Realizar avaliação LGPD e de decisões automatizadas.
- Definir processo de contestação e retenção dos sinais.


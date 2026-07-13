# LGPD e privacidade

Este documento é uma orientação técnica inicial, não um parecer jurídico. Papéis, bases legais, prazos e textos devem ser validados por profissional jurídico e pelos responsáveis do negócio.

## Princípios

- Finalidade, adequação, necessidade e transparência.
- Livre acesso, qualidade, segurança, prevenção e não discriminação.
- Responsabilização demonstrável por decisões e operações.
- Privacidade desde a concepção e por padrão.

## Inventário inicial

| Categoria | Exemplos | Cuidados |
| --- | --- | --- |
| Conta | nome, e-mail, telefone, identificador | Acesso e retenção limitados. |
| Entrega | endereço, localização, código | Exposição temporária e estritamente necessária. |
| Motoboy | documentos e localização | Acesso muito restrito e política específica. |
| Financeiro/fiscal | documento, transações, comprovantes | Retenção legal e segregação. |
| Dispositivo | token FCM, eventos técnicos | Rotação, expiração e finalidade definida. |
| Suporte | mensagens e anexos | Evitar dados excessivos e restringir atendentes. |

Dados de cartão não devem ser armazenados pelo MandaJá; o provedor de pagamento deve tokenizá-los e assumir o escopo aplicável.

## Bases e consentimentos

Nem todo tratamento depende de consentimento. Para cada finalidade, registrar categoria de dado, titular, base legal, compartilhamentos, prazo, controles e responsável. Consentimento, quando for a base adequada, deve ser livre, informado, destacado, revogável e versionado.

Registrar aceite de Termos e Política de Privacidade com versão, data do servidor, finalidade e usuário. Evitar guardar IP ou user agent sem finalidade e prazo definidos.

Permissões do sistema operacional para localização e notificações não substituem a transparência nem a definição de base legal.

## Localização

- Busca por proximidade deve oferecer alternativa quando possível.
- Motoboy precisa de localização para receber e executar entregas conforme fluxo informado.
- Localização precisa é compartilhada somente na entrega ativa, com cliente do pedido e operação autorizada.
- Encerrar listeners e compartilhamento ao concluir ou cancelar.
- Reter histórico granular apenas pelo prazo justificado; preferir dados agregados quando suficientes.

## Direitos do titular

Prever canal autenticado para confirmação de tratamento, acesso, correção, portabilidade quando aplicável, informação de compartilhamentos, revogação, oposição, anonimização, bloqueio e eliminação conforme hipóteses legais.

Solicitações de exportação e exclusão devem validar identidade, gerar protocolo, cumprir prazo definido, registrar execução e considerar retenções legais, prevenção a fraude e dados de terceiros. Exclusão de conta não significa apagar registros sujeitos a obrigação legal; nesses casos, restringir e justificar a retenção.

## Retenção e descarte

Criar tabela de retenção por categoria antes da produção. Ao expirar o prazo, excluir, anonimizar ou agregar com processo auditável, incluindo cópias e arquivos derivados conforme viabilidade técnica e obrigação legal.

## Fornecedores e transferências

Mapear Firebase/Google Cloud, pagamento, mapas, fiscal, atendimento, e-mail e monitoramento. Avaliar contratos, suboperadores, regiões, transferências internacionais, segurança e procedimento de incidente.

## Governança

- Definir controlador, operadores, encarregado/canal e responsáveis internos.
- Manter registro das operações e relatório de impacto quando o risco justificar.
- Treinar pessoas com acesso e revisar permissões periodicamente.
- Avaliar Analytics, antifraude e decisões automatizadas quanto a necessidade, transparência e não discriminação.
- Manter processo de incidente com avaliação de comunicação à ANPD e titulares.

## Pendências antes da implementação

- Aprovar Política de Privacidade, Termos e versões iniciais.
- Definir bases legais e tabela de retenção.
- Formalizar atendimento aos titulares.
- Aprovar fornecedores, transferências e contratos.
- Definir requisitos para menores de idade, caso sejam admitidos.
- Avaliar relatório de impacto para localização, documentos e antifraude.


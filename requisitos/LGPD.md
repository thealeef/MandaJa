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

### Matriz preliminar para o MVP

| Categoria | Hipótese técnica de retenção | Condição |
| --- | --- | --- |
| Código de entrega | Até conclusão, cancelamento ou expiração máxima de 24 horas; armazenado apenas como hash. | Investigar fraude usando eventos de tentativa, nunca o código original. |
| Localização precisa do motoboy | Durante a entrega ativa e, no máximo, 7 dias após encerramento para investigação operacional. | Confirmar necessidade e relatório de impacto; depois excluir ou agregar. |
| Tokens FCM e sessões técnicas | Enquanto válidos e necessários; remover ao invalidar, sair ou excluir a conta. | Rotina automática de limpeza. |
| Carrinho e reserva abandonados | Até 30 dias, com reservas liberadas muito antes conforme regra operacional. | Separar dado comercial de estoque reservado. |
| Pedidos e pagamentos | Enquanto necessários ao contrato e às obrigações legais aplicáveis. | Prazo definitivo depende de validação jurídica, contábil e do provedor. |
| Dados fiscais | Conforme obrigação legal aplicável. | Não fixar prazo técnico sem parecer contábil/jurídico. |
| Suporte e denúncias | Até 2 anos após encerramento como hipótese inicial. | Reduzir ou ampliar conforme risco, obrigação e necessidade comprovada. |
| Auditoria sensível | Até 5 anos como hipótese inicial. | Revisar proporcionalidade, acesso e obrigação por tipo de evento. |
| Conta sem obrigação de retenção | Anonimizar ou excluir em até 30 dias após solicitação concluída. | Preservar somente retenções justificadas e comunicar ao titular. |
| Backups | Conforme ciclos aprovados; dados expurgados não devem retornar ao ambiente ativo após restauração. | Manter lista de supressão ou rotina de reaplicação de exclusões. |

Os prazos acima são hipóteses de arquitetura, não interpretação definitiva da LGPD ou de legislação fiscal. Produção depende de aprovação formal da matriz.

## Fornecedores e transferências

Mapear Firebase/Google Cloud, pagamento, mapas, fiscal, atendimento, e-mail e monitoramento. Avaliar contratos, suboperadores, regiões, transferências internacionais, segurança e procedimento de incidente.

## Governança

- Definir controlador, operadores, encarregado/canal e responsáveis internos.
- Manter registro das operações e relatório de impacto quando o risco justificar.
- Treinar pessoas com acesso e revisar permissões periodicamente.
- Avaliar Analytics, antifraude e decisões automatizadas quanto a necessidade, transparência e não discriminação.
- Manter processo de incidente com avaliação de comunicação à ANPD e titulares.

## Pendências antes de produção ou uso de dados reais

- Aprovar Política de Privacidade, Termos e versões iniciais.
- Definir bases legais e tabela de retenção.
- Formalizar atendimento aos titulares.
- Aprovar fornecedores, transferências e contratos.
- Definir requisitos para menores de idade, caso sejam admitidos.
- Avaliar relatório de impacto para localização, documentos e antifraude.

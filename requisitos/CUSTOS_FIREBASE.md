# Custos do Firebase

## Objetivo

Controlar consumo técnico por ambiente e domínio para sustentar preços, capacidade e prevenção de surpresas. Valores de tabela mudam; estimativas devem usar a calculadora e a documentação oficial vigentes no momento da decisão.

## Política atual: custo zero

- Desenvolver com Firebase Local Emulator Suite.
- Não ativar Blaze nem vincular conta de faturamento nesta fase.
- Usar projeto Spark opcional apenas para Authentication sem telefone, Firestore e Hosting dentro das cotas oficiais.
- Manter Cloud Functions e Cloud Storage somente nos emuladores, pois a utilização em nuvem exige Blaze nas condições atuais.
- Simular pagamentos, mapas, fiscal e demais integrações cobradas.
- Reavaliar preços e limites imediatamente antes de qualquer piloto externo.

O plano Blaze pode incluir faixas sem custo, mas não é considerado recurso gratuito neste projeto porque exige faturamento e permite cobranças por excedente.

## Principais direcionadores

- Leituras, escritas, exclusões, armazenamento e tráfego do Firestore.
- Invocações, duração, memória, CPU, concorrência e tráfego das Functions.
- Armazenamento, operações e saída de dados do Storage.
- Hosting e transferência de dados.
- Authentication conforme recursos e volume adotados.
- Logs, monitoramento, builds, mapas e serviços externos.
- Backups, exportações, retenção e recuperação.

FCM pode não ter cobrança direta no cenário inicial, mas eventos, Functions e gravações geradas pelas notificações consomem recursos.

## Decisões de arquitetura que reduzem custo

- Paginação e limites obrigatórios; nunca carregar coleções inteiras.
- Consultas indexadas e orientadas ao escopo do estabelecimento.
- Listeners em tempo real somente em telas que precisam deles e encerrados ao sair.
- Debounce em buscas e controle de frequência da localização.
- Documentos pequenos, dados públicos separados e agregações calculadas conscientemente.
- Cache no Flutter quando consistência permitir.
- Functions com região, memória, timeout, concorrência e número de instâncias adequados.
- Políticas de ciclo de vida para arquivos e logs.

Otimização de custo nunca deve enfraquecer autorização, auditoria, backup ou integridade financeira.

## Medição

O painel N1 deve apresentar estimativas, não uma fatura oficial, incluindo:

- Pedidos e usuários ativos.
- Uso por ambiente e, quando tecnicamente viável, por estabelecimento.
- Leituras/escritas estimadas por fluxo.
- Storage e tráfego.
- Invocações, erros e duração de Functions.
- Alertas de crescimento e projeção mensal.

Telemetria por estabelecimento deve evitar uma escrita de métrica para cada leitura, pois isso cria custo adicional. Preferir amostragem, métricas agregadas e dados nativos do Google Cloud.

## Orçamento e alertas

- Orçamentos separados por projeto e ambiente.
- Limiares progressivos de aviso e responsáveis definidos.
- Alertas de variação diária, erro repetido, loop de Function e tráfego anormal.
- Limites operacionais e flags para recursos não críticos; orçamento não é um bloqueio automático garantido.
- Revisão mensal de fatura, descontos, retenção e capacidade.

## Modelo de estimativa antes da implementação

Para cada fluxo, estimar usuários ativos, frequência, leituras, escritas, Functions, bytes armazenados e saída de dados. Avaliar cenários pequeno, esperado e pico para pedido, rastreamento, catálogo, painéis, notificações e backups.

### Cenários iniciais

| Cenário | Estabelecimentos | Usuários ativos/mês | Pedidos/dia |
| --- | ---: | ---: | ---: |
| Piloto | 10 | 500 | 100 |
| MVP | 100 | 10.000 | 2.000 |
| Crescimento | 1.000 | 100.000 | 20.000 |

Para cada pedido, a planilha futura deve separar criação, consulta de catálogo, reserva de estoque, atualizações de status, pagamento, entrega, notificações e auditoria. O rastreamento será calculado por minutos de entrega e frequência adaptativa, não apenas por quantidade de pedidos.

## Provedores externos recomendados para avaliação

- Pagamentos: prova de conceito com Mercado Pago Checkout Pro e Split 1:1. O modelo exige OAuth por vendedor e possui condições específicas para comissão e reembolso, que devem entrar na estimativa operacional e jurídica.
- Mapas: Google Maps Platform com faturamento por evento/SKU. Definir cotas por API, alertas e restrições de chave; comparar pagamento por uso e assinatura depois de medir o piloto.
- Fiscal: nenhum custo pode ser estimado antes de definir municípios, volume de documentos e provedor.

Fontes consultadas em 13 de julho de 2026: [Mercado Pago Split 1:1](https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/overview), [configuração do marketplace](https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace) e [preços do Google Maps Platform](https://developers.google.com/maps/billing-and-pricing/overview).

Para a política gratuita atual, consultar também [preços do Firebase](https://firebase.google.com/pricing), [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite) e [requisito Blaze do Cloud Storage](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024?hl=pt-BR).

## Pendências

- Definir região e plano Firebase.
- Estimar usuários, estabelecimentos, pedidos e atualizações de rastreamento.
- Escolher provedores externos e incluir seus custos.
- Definir metas de orçamento e responsáveis.
- Confirmar preços oficiais antes de cada ambiente e antes da produção.

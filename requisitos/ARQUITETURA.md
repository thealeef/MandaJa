# Arquitetura do MandaJá

## Objetivo

O MandaJá será uma plataforma multiestabelecimento de pedidos, pagamentos e entregas. A arquitetura deve isolar dados por estabelecimento, oferecer experiências específicas para cada perfil e concentrar operações críticas no backend.

Este documento define responsabilidades e limites. Não representa código implementado.

## Visão geral

```text
Painel Angular ─┐
                ├─ Firebase Authentication + App Check
App Flutter ────┘                 │
                                  ├─ Cloud Functions ─ integrações externas
                                  ├─ Cloud Firestore
                                  ├─ Firebase Storage
                                  └─ Firebase Cloud Messaging
```

O Angular atende N1 Dev e equipes dos estabelecimentos. O Flutter é inicialmente um único aplicativo com áreas separadas para cliente e motoboy. O Firebase fornece autenticação, dados, arquivos, notificações e execução do backend.

## Princípios

- Menor privilégio e negação por padrão.
- Isolamento por `idEstabelecimento`.
- Operações financeiras, permissões, estoque, entrega e antifraude validadas no backend.
- Funções críticas idempotentes e mudanças concorrentes protegidas por transações.
- Dados públicos separados de dados privados e fiscais.
- Histórico imutável para ações sensíveis e transições de estado.
- Paginação, consultas direcionadas e listeners em tempo real somente quando necessários.
- Ambientes de desenvolvimento, homologação e produção separados.

## Perfis e acesso

| Nível | Perfil | Limite principal |
| --- | --- | --- |
| `n1_dev` | Dev | Administração integral e auditada da plataforma. |
| `n2_dono_estabelecimento` | Dono | Somente estabelecimentos próprios. |
| `n3_gerente` | Gerente | Estabelecimento vinculado e permissões delegadas. |
| `n4_funcionario` | Funcionário | Consulta e preparo de pedidos permitidos. |
| `n5_caixa` | Caixa | Etapas financeiras operacionais autorizadas. |
| `n6_estoque` | Estoque | Produtos, disponibilidade e estoque autorizado. |
| `n7_motoboy` | Motoboy | Entregas ofertadas ou assumidas e própria localização. |
| `n8_cliente` | Cliente | Próprios dados, pedidos, avaliações e solicitações. |

Custom claims indicam o nível global, mas vínculos e escopos devem ser confirmados no backend e nas regras. Claims não devem carregar listas grandes ou dados mutáveis do negócio.

## Módulos de domínio

### Identidade e acesso

Cadastro, login, recuperação de conta, bloqueios, custom claims, vínculos com estabelecimentos, convites e sessões. Alterações de privilégio são ações sensíveis e auditáveis.

### Estabelecimentos e catálogo

Cadastro, aprovação, horários, regiões atendidas, produtos, categorias, promoções, cupons, estoque disponível e reservado. Informações fiscais e documentos devem ficar separados do catálogo público.

### Pedidos

Carrinho, validação de preços no servidor, reserva de estoque, tipos `entrega_imediata`, `entrega_agendada` e `retirada_local`, histórico de status, cancelamento e avaliação. O pedido mantém uma fotografia dos itens, preços e endereço usados na compra.

### Pagamentos e assinaturas

Integração com provedor ainda a escolher, webhooks assinados, reembolsos, comissões, repasses e planos gratuito, mensal, trimestral, anual ou personalizado. Valores monetários devem usar inteiro na menor unidade monetária.

### Entregas e rastreamento

Oferta para motoboys próprios e, na ausência deles, autônomos próximos. A aceitação exige transação atômica. A localização do motoboy é compartilhada somente durante entrega ativa e apenas com participantes autorizados. O código de entrega nunca deve ser armazenado em texto puro.

### Suporte, avaliações e denúncias

Chamados, anexos, avaliações após entrega e denúncias com acesso restrito, trilha de tratamento e proteção contra abuso.

### Administração da plataforma

Aprovações, modo manutenção, regiões, relatórios, custos, antifraude, auditoria e configurações globais. Acesso N1 continua disponível em manutenção, mas toda intervenção deve ser registrada.

### Fiscal, privacidade e continuidade

Dados fiscais, comprovantes, documentos legais versionados, consentimentos, solicitações LGPD, backups e testes de restauração. Os detalhes dependem de validação jurídica, contábil e do provedor fiscal.

## Fluxo resumido do pedido

1. O cliente monta o carrinho e escolhe atendimento.
2. Uma Cloud Function recalcula produtos, estoque, área atendida, descontos e total.
3. O pedido é criado com chave de idempotência e o estoque é reservado em transação.
4. O pagamento é iniciado, quando aplicável; apenas webhook validado o confirma.
5. O estabelecimento prepara o pedido conforme a máquina de estados permitida.
6. Retiradas são liberadas ao cliente; entregas seguem para atribuição de motoboy.
7. O primeiro aceite válido define o motoboy de forma atômica.
8. O rastreamento é iniciado durante a entrega e encerrado ao final.
9. A entrega é concluída após validação segura do código.
10. Estoque, valores, notificações e auditoria são atualizados de modo idempotente.

## Organização lógica prevista

- Angular: núcleo, componentes compartilhados e módulos por domínio.
- Flutter: núcleo, design system, serviços e funcionalidades de cliente e motoboy.
- Firebase: Functions por domínio, regras, índices, emuladores, Hosting e testes.

A estrutura física será criada somente na etapa de implementação.

## Decisões pendentes

- Provedor de pagamento, split, estorno e repasses.
- Provedor de mapas, rotas, geocodificação e política de custo.
- Serviço fiscal e alcance inicial por município/estado.
- Políticas de retenção por categoria de dado.
- RPO e RTO aprovados para produção.
- Frequência e tecnologia de exportação do Firestore e Storage.
- Requisitos de disponibilidade, volume esperado e regiões do Firebase.
- Separação futura do aplicativo de cliente e motoboy.


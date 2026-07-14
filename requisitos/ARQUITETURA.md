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

## Contexto e fronteiras do sistema

| Elemento | Responsabilidade | Fora da responsabilidade |
| --- | --- | --- |
| Painel Angular | Operação administrativa, gestão dos estabelecimentos, catálogo, pedidos, financeiro, suporte e configurações conforme o perfil. | Não decide permissões, preços, pagamentos ou transições críticas sozinho. |
| Aplicativo Flutter | Experiência móvel de cliente e motoboy, incluindo pedidos, entregas, localização e notificações. | Não é fonte de verdade para valores, estoque, repasses ou autorização. |
| Firebase Authentication | Autenticação, identidade básica e custom claims controladas pelo backend. | Não substitui vínculos, escopos e regras do domínio. |
| Cloud Functions | Casos de uso sensíveis, integrações, validações, transações, idempotência e auditoria. | Não deve concentrar apresentação nem lógica específica de telas. |
| Cloud Firestore | Persistência operacional, consultas autorizadas e eventos em tempo real necessários. | Não deve expor coleções inteiras nem permitir alterações críticas diretamente pelo cliente. |
| Firebase Storage | Imagens, anexos e documentos com caminhos e acesso controlados. | Não deve hospedar arquivos executáveis, públicos por padrão ou sem validação. |
| Firebase Cloud Messaging | Entrega de avisos aos dispositivos. | Não é fonte de verdade; perder uma notificação não pode perder o evento do negócio. |
| Firebase App Check | Evidência de acesso por aplicativos reconhecidos. | Não substitui autenticação, autorização, validação ou proteção contra fraude. |
| Serviços externos | Pagamento, mapas, rotas, geocodificação e emissão fiscal, após escolha formal. | Não definem sozinhos o estado interno sem validação, reconciliação e auditoria. |

O sistema termina nas integrações controladas pelo backend. Aplicativos clientes nunca devem chamar provedores sensíveis com credenciais privilegiadas.

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

## Catálogo de capacidades

As capacidades abaixo agrupam o escopo do prompt mestre sem definir ainda coleções, campos ou implementação física.

| Área | Capacidades principais | Autoridade principal |
| --- | --- | --- |
| Identidade | Cadastro, login, recuperação, bloqueio, perfis e consentimentos. | Authentication, regras e Functions. |
| Equipes | Convites, vínculos, delegações e revogações por estabelecimento. | Functions e regras. |
| Estabelecimentos | Cadastro, aprovação, horários, pausas, planos e configurações. | Functions para ações administrativas; Firestore para consultas autorizadas. |
| Catálogo | Produtos, categorias, imagens, disponibilidade, promoções e cupons. | Estabelecimento autorizado, com validações de regras e backend. |
| Estoque | Estoque físico, reservado, disponível, alertas, baixa e devolução. | Functions com transações. |
| Pedidos | Criação, fotografia comercial, histórico, agendamento, retirada e cancelamento. | Functions e máquina de estados. |
| Pagamentos | Cobrança, confirmação, contestação, reembolso e reconciliação. | Provedor escolhido e Functions por webhooks validados. |
| Entregas | Fila, oferta, aceite, coleta, rastreamento e confirmação por código. | Functions, regras e aplicativo do motoboy. |
| Financeiro | Comissão, valores líquidos, carteira, repasses e assinaturas. | Functions e registros financeiros protegidos. |
| Relacionamento | Avaliações, denúncias, suporte, anexos e notificações. | Participantes elegíveis e operação autorizada. |
| Administração N1 | Aprovações, manutenção, auditoria, antifraude, custos e relatórios globais. | N1 Dev com controles reforçados. |
| Conformidade | LGPD, termos versionados, fiscal, medicamentos e retenção. | Processos técnicos mais validação jurídica e contábil. |
| Continuidade | Backups, restauração, observabilidade e resposta a incidentes. | Operação técnica autorizada. |

## Responsabilidades por camada

### Apresentação

- Exibir somente ações disponíveis ao perfil, sem tratar ocultação como segurança.
- Validar formato para melhorar a experiência, repetindo validações relevantes no backend.
- Manter estados de carregamento, vazio, erro, offline e falta de permissão.
- Encerrar listeners, localização e outros recursos quando não forem necessários.
- Não armazenar segredos, documentos sensíveis ou localização além do necessário.

### Aplicação e domínio

- Orquestrar casos de uso e aplicar transições de estado permitidas.
- Recalcular preços, descontos, taxas, comissões e totais usando dados confiáveis.
- Verificar perfil, vínculo, propriedade, bloqueios e elegibilidade em cada ação sensível.
- Garantir idempotência, atomicidade e consistência em concorrência.
- Produzir auditoria e notificações depois de confirmar o estado do negócio.

### Infraestrutura

- Persistir dados e arquivos com regras de negação por padrão.
- Encapsular SDKs e provedores externos para permitir testes e substituição.
- Aplicar timeout, repetição controlada, circuitos de proteção e reconciliação nas integrações.
- Fornecer métricas, logs estruturados, alertas e identificadores de correlação.
- Separar configurações, identidades e dados por ambiente.

## Comunicação e consistência

- Operações interativas críticas usam chamada autenticada ao backend e retornam resultado explícito.
- Eventos do Firestore podem iniciar processamento assíncrono, mas seus consumidores devem tolerar repetição e entrega fora de ordem.
- Notificações são consequência de um estado persistido, nunca confirmação do próprio estado.
- Webhooks externos são autenticados, persistidos com referência única e processados de forma idempotente.
- Contadores, dashboards e relatórios podem usar consistência eventual; estoque, aceite de entrega e valores financeiros exigem consistência transacional.
- Falhas parciais devem deixar estado recuperável e permitir reconciliação segura.

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

## Outros fluxos arquiteturais

### Cadastro e aprovação de estabelecimento

1. O dono autentica-se, aceita documentos vigentes e envia dados mínimos.
2. Dados privados, fiscais e arquivos recebem acesso restrito.
3. O estabelecimento permanece `pendente_aprovacao` e não recebe pedidos.
4. N1 Dev revisa, solicita alteração, aprova ou rejeita com justificativa auditada.
5. A liberação operacional considera aprovação, assinatura, bloqueios e configuração global.

### Aprovação e disponibilidade do motoboy

1. O usuário solicita o perfil e envia os documentos exigidos.
2. A operação revisa os dados sem expô-los a estabelecimentos ou clientes.
3. Apenas motoboy aprovado, ativo e não bloqueado pode ficar `online`.
4. Disponibilidade e localização são usadas somente para oferta e execução de entregas elegíveis.

### Assinatura do estabelecimento

1. O dono escolhe um plano permitido e o backend registra condições e ciclo vigentes.
2. O provedor processa a cobrança e comunica o resultado por webhook validado.
3. O backend reconcilia a assinatura de modo idempotente.
4. Avisos e eventual bloqueio por inadimplência respeitam carência e configuração N1.
5. Pagamento confirmado libera o estabelecimento sem duplicar cobranças ou efeitos.

### Solicitação LGPD

1. O titular autenticado solicita exportação, correção, desativação ou exclusão.
2. A identidade e o escopo da solicitação são verificados.
3. O processo separa dados elimináveis de retenções legais ou antifraude justificadas.
4. A execução gera protocolo, auditoria e resposta ao titular, sem expor dados de terceiros.

### Modo manutenção

1. N1 Dev ativa uma configuração versionada com mensagem e justificativa.
2. Novas operações não essenciais são suspensas de forma controlada.
3. Pedidos, pagamentos e entregas em andamento continuam ou entram em tratamento seguro definido.
4. N1 Dev mantém acesso administrativo auditado para recuperação.
5. A desativação restaura gradualmente os fluxos e é monitorada.

## Classificação arquitetural dos dados

| Classe | Exemplos | Diretriz |
| --- | --- | --- |
| Público | Nome, logo, catálogo e avaliação agregada de estabelecimento aprovado. | Leitura limitada ao necessário; escrita apenas autorizada. |
| Operacional restrito | Pedido, entrega, estoque, agenda e suporte. | Acesso por participante, vínculo e função. |
| Pessoal | Perfil, telefone, endereço e preferências. | Minimização, finalidade, retenção e direitos do titular. |
| Sensível de negócio | Valores, comissões, repasses, custos e antifraude. | Backend como autoridade e acesso fortemente restrito. |
| Fiscal/documental | Documentos de estabelecimento, motoboy e registros fiscais. | Segregação, auditoria, retenção legal e download protegido. |
| Efêmero | Código de entrega, posição em tempo real e tokens operacionais. | Expiração curta, proteção adicional e descarte automático. |
| Auditoria | Mudanças de privilégio, estado, configuração e ações N1. | Registro append-only, acesso restrito e retenção formal. |

## Requisitos não funcionais

### Segurança e privacidade

Negação por padrão, menor privilégio, App Check, validação no backend, proteção de segredos, logs sem dados sensíveis e privacidade desde a concepção são obrigatórios. Os detalhes estão em `SEGURANCA.md` e `LGPD.md`.

### Desempenho e escala

Listas usam paginação; consultas são filtradas e indexadas; documentos permanecem pequenos; buscas usam debounce; listeners e atualizações de localização têm frequência controlada. Nenhum fluxo deve depender da leitura de uma coleção inteira.

### Disponibilidade e resiliência

Integrações possuem timeout e repetição limitada. Processos críticos podem ser retomados ou reconciliados. Modo manutenção preserva operações em andamento. RPO e RTO serão aprovados antes da produção.

### Observabilidade

Functions e integrações geram logs estruturados, métricas de sucesso, erro, duração e repetição. Fluxos críticos carregam identificador de correlação. Alertas cobrem segurança, indisponibilidade, falhas financeiras e custo anormal.

### Qualidade e testabilidade

Domínio e integrações devem ser testáveis isoladamente. Regras terão testes positivos e negativos no Emulator Suite. Cada tecnologia terá lint, análise estática, testes e build automatizados antes do deploy.

### Acessibilidade e experiência

Angular será responsivo; Flutter respeitará recursos das plataformas. Interfaces seguirão o design system, oferecerão textos em português do Brasil e não dependerão apenas de cor, gesto ou notificação para informações essenciais.

## Ambientes e promoção

| Ambiente | Finalidade | Dados permitidos |
| --- | --- | --- |
| Desenvolvimento | Implementação local e testes frequentes, priorizando Emulator Suite. | Dados fictícios. |
| Homologação | Integração, aceite, segurança e ensaio de deploy. | Dados sintéticos ou anonimizados aprovados. |
| Produção | Operação real do MandaJá. | Dados reais sob controles de produção. |

Cada ambiente terá projeto Firebase, credenciais, App Check, provedores, buckets, alertas e configurações próprios. A promoção seguirá o processo descrito em `DEPLOY.md`.

## Organização lógica prevista

- Angular: núcleo, componentes compartilhados e módulos por domínio.
- Flutter: núcleo, design system, serviços e funcionalidades de cliente e motoboy.
- Firebase: Functions por domínio, regras, índices, emuladores, Hosting e testes.

A estrutura física será criada somente na etapa de implementação.

## Dependências entre as etapas

1. Esta arquitetura define fronteiras e capacidades.
2. A Etapa 2 traduz essas capacidades em modelo de dados, relações, índices e retenção.
3. A Etapa 3 transforma perfis e classificações em regras testáveis.
4. A Etapa 4 implementa casos de uso críticos nas Functions.
5. Angular e Flutter consomem contratos definidos e não duplicam autoridade do backend.

Mudanças posteriores que contrariem essas fronteiras devem atualizar este documento e registrar a justificativa antes da implementação.

## Decisões provisórias do MVP

Estas decisões permitem avançar para a modelagem, mas não autorizam contratação nem produção. Cada item deve ser revalidado antes da integração correspondente.

| Tema | Decisão provisória | Condição para confirmação |
| --- | --- | --- |
| Firebase | Desenvolver primeiro no Emulator Suite. Se for necessário validar na nuvem sem custo, usar Spark somente para serviços incluídos e dentro das cotas; reservar `southamerica-east1`, São Paulo, para o Firestore. | Não vincular faturamento agora. Functions, Storage e backups agendados permanecem locais até aprovação futura do Blaze. |
| Pagamentos | Simular o provedor localmente e preparar uma futura prova de conceito com Mercado Pago Checkout Pro e Split 1:1, mantendo adaptador de provedor. | Não processar dinheiro real agora. Futuramente validar contrato, taxas, KYC, OAuth, Pix/cartão, reembolsos e modelo tributário. |
| Mapas | Usar mapas e rotas simulados por fixtures no desenvolvimento, atrás de uma camada de serviço. Google Maps Platform permanece candidato futuro. | Não habilitar faturamento agora; estimar eventos, configurar cotas e comparar alternativas antes do piloto real. |
| Fiscal | Manter integração fiscal desacoplada e não emitir documento fiscal sem definição contábil. | Definir responsabilidades da plataforma e dos estabelecimentos, municípios iniciais e provedor homologado. |
| Retenção | Aplicar a matriz preliminar de `LGPD.md`, com descarte curto para localização precisa e segredos efêmeros. | Aprovação jurídica, relatório de impacto e confirmação das obrigações fiscais e antifraude. |
| Continuidade | No desenvolvimento, versionar configurações e exportar dados fictícios dos emuladores quando necessário. Para o futuro piloto em Blaze, propor RPO de 24 horas, RTO de 8 horas, backup diário e teste trimestral. | Aprovação do negócio e de faturamento antes de ativar backup gerenciado. |
| Escala | Dimensionar para o cenário MVP de até 100 estabelecimentos, 10 mil usuários ativos mensais e 2 mil pedidos por dia. | Substituir por projeções comerciais e validar com testes de carga e estimativa de custo. |
| Aplicativos | Manter um único app Flutter para cliente e motoboy no MVP. | Reavaliar separação após métricas de uso, operação e publicação nas lojas. |

### Cenários de capacidade

| Cenário | Estabelecimentos | Usuários ativos/mês | Pedidos/dia | Finalidade |
| --- | ---: | ---: | ---: | --- |
| Piloto | 10 | 500 | 100 | Validar operação, segurança e integrações. |
| MVP | 100 | 10.000 | 2.000 | Base de dimensionamento da primeira versão. |
| Crescimento | 1.000 | 100.000 | 20.000 | Testar se o desenho evolui sem reformulação estrutural. |

Esses números são premissas de engenharia, não previsão comercial. Rastreamento, listeners, imagens e relatórios precisam de estimativas próprias porque podem crescer mais rapidamente que a quantidade de pedidos.

## Pendências que bloqueiam produção

- Aprovação comercial e jurídica do fluxo financeiro e dos contratos com estabelecimentos e motoboys.
- Definição contábil e tributária para vendas, comissão, assinatura, entrega e repasses.
- Matriz definitiva de retenção e atendimento aos direitos dos titulares.
- Teste de restauração que comprove RPO e RTO aprovados.
- Orçamento mensal e limites operacionais para Firebase, mapas e provedores externos.
- Requisitos específicos para medicamentos e outros produtos regulados.

## Estratégia de custo zero

### Fase atual: desenvolvimento local

- Emulator Suite para Authentication, Firestore, Storage, Functions e Hosting.
- Dados totalmente fictícios e exportações locais apenas para facilitar testes.
- Pagamentos, mapas, notificações externas e fiscal substituídos por adaptadores simulados.
- Nenhum cartão, conta de faturamento, credencial de produção ou cobrança real.

### Validação gratuita na nuvem

- Projeto Spark opcional somente para recursos oficialmente disponíveis sem faturamento.
- Authentication sem telefone, Firestore e Hosting dentro das cotas vigentes.
- App Check dentro das cotas do provedor de atestado escolhido.
- Cloud Storage e Cloud Functions não serão usados na nuvem nesta fase.
- Alertas internos de consumo e interrupção segura antes de exceder limites.

### Investimento futuro

O plano Blaze e provedores externos somente serão ativados após orçamento e autorização explícitos. Blaze mantém cotas sem custo em alguns produtos, mas exige conta de faturamento e pode gerar cobrança; portanto, não será tratado como “gratuito”.

## Critérios de conclusão da Etapa 1

- [x] Contexto, componentes e fronteiras definidos.
- [x] Perfis e limites gerais de acesso documentados.
- [x] Módulos e responsabilidades catalogados.
- [x] Fluxos críticos descritos em nível arquitetural.
- [x] Requisitos não funcionais e classificação de dados registrados.
- [x] Ambientes e dependências entre etapas definidos.
- [x] Hipóteses provisórias registradas para as decisões externas prioritárias.
- [x] Hipóteses provisórias aceitas pelo responsável do produto como base da Etapa 2.

A Etapa 1 estará formalmente encerrada quando o responsável do produto aceitar estas hipóteses como base da modelagem. A confirmação definitiva de fornecedores, retenção e operação continua sendo condição para produção.

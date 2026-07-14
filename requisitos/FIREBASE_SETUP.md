# Preparação do Firebase

Este é um roteiro de configuração para uma etapa futura. Nenhum recurso Firebase foi criado por esta documentação.

## Projetos e ambientes futuros

Quando houver autorização para implantação em nuvem, criar projetos Firebase distintos para:

- `manda-ja-desenvolvimento`
- `manda-ja-homologacao`
- `manda-ja-producao`

Os nomes finais dependem de disponibilidade e aprovação. Na fase gratuita, os ambientes são reproduzidos localmente; no máximo, um projeto Spark opcional será usado para validação remota. Nunca reutilizar credenciais, bancos ou buckets de produção. Definir responsáveis, faturamento, alertas e região antes de provisionar recursos pagos.

## Estratégia gratuita atual

O desenvolvimento começa integralmente no Firebase Local Emulator Suite, sem projeto pago e sem dados reais. Os emuladores cobrem Authentication, Firestore, Storage, Cloud Functions e Hosting para prototipação e testes, mas não são adequados para produção.

Caso seja necessária validação remota antes do investimento, criar somente um projeto no plano Spark e limitar o uso a Authentication sem telefone, Firestore e Hosting dentro das cotas oficiais. App Check pode ser usado conforme as cotas do provedor de atestado.

Na situação vigente em 13 de julho de 2026:

- Cloud Functions não oferece execução no plano Spark; usar somente o emulador.
- Cloud Storage for Firebase exige plano Blaze mesmo quando o consumo permanece em faixa sem custo; usar somente o emulador.
- Backup agendado do Firestore exige Blaze; não ativar agora.
- Autenticação por telefone tem cobrança por SMS e fica fora da fase gratuita.

Não vincular conta de faturamento sem autorização explícita. Fontes: [preços do Firebase](https://firebase.google.com/pricing), [Emulator Suite](https://firebase.google.com/docs/emulator-suite) e [requisitos atuais do Cloud Storage](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024?hl=pt-BR).

## Região recomendada para uso futuro na nuvem

Ao criar o primeiro Firestore na nuvem, adotar provisoriamente `southamerica-east1`, São Paulo, e priorizar a mesma região nos serviços compatíveis. A documentação oficial lista São Paulo como localização regional do Firestore e recomenda localização regional quando custo e latência de escrita são prioridades.

A escolha é permanente ou difícil de alterar em vários recursos. Antes da criação de cada projeto, confirmar:

- Residência e transferência internacional de dados com apoio jurídico.
- Disponibilidade e preço de Firestore, Functions, Storage e serviços auxiliares.
- Localização padrão do Storage definida durante a configuração inicial.
- Latência dos usuários e integrações externas.
- Estratégia de recuperação, pois backups nativos do Firestore permanecem na localização do banco.

Fonte consultada em 13 de julho de 2026: [Locais do Cloud Firestore](https://firebase.google.com/docs/firestore/locations?hl=pt-BR).

## Pré-requisitos de decisão

- Organização Google Cloud e contas proprietárias.
- Região do Firestore, Functions, Storage e política de residência de dados.
- Plano de faturamento e limites orçamentários.
- Domínios, remetentes de e-mail e aplicativos Android/iOS.
- Provedores de pagamento, mapas e fiscal.
- Política de retenção, backup, RPO e RTO.

## Premissas iniciais de capacidade

| Cenário | Estabelecimentos | Usuários ativos/mês | Pedidos/dia |
| --- | ---: | ---: | ---: |
| Piloto | 10 | 500 | 100 |
| MVP | 100 | 10.000 | 2.000 |
| Crescimento | 1.000 | 100.000 | 20.000 |

Essas premissas servem para índices, testes e custos, mas devem ser substituídas por projeções comerciais. A frequência de localização do motoboy será estimada separadamente e limitada por estado da entrega, movimento, tempo e distância.

## Serviços previstos

As ações abaixo pertencem à etapa futura de investimento, exceto os itens que couberem no projeto Spark opcional:

1. Registrar os aplicativos web, Android e iOS em cada ambiente.
2. Habilitar Authentication e apenas provedores aprovados.
3. Criar Firestore em modo bloqueado e região aprovada.
4. Criar Storage com regras de negação por padrão.
5. Preparar Cloud Functions com TypeScript e runtime suportado na implementação.
6. Configurar Hosting para o Angular.
7. Configurar Cloud Messaging e credenciais móveis.
8. Registrar App Check para web, Android, iOS e emuladores/desenvolvimento.
9. Configurar Crashlytics e Performance Monitoring no Flutter; Analytics somente após avaliação de finalidade e consentimento.
10. Criar alertas de orçamento, erro, latência e uso.

## Configuração local futura

O Firebase CLI deve ser instalado e autenticado com conta individual. O repositório deverá mapear aliases `desenvolvimento`, `homologacao` e `producao`, sem armazenar credenciais. Configurações públicas de SDK não são segredo, mas regras, App Check e autorização continuam obrigatórios.

O Emulator Suite deverá cobrir:

- Authentication.
- Firestore.
- Storage.
- Cloud Functions.
- Hosting.

Dados seed devem ser fictícios. Portas, imports e exports dos emuladores serão documentados quando a estrutura Firebase existir.

## Segredos e IAM

- Segredos de provedores ficam em serviço gerenciado de segredos, separados por ambiente.
- Contas de serviço recebem apenas permissões necessárias.
- Não baixar chaves persistentes quando identidade federada ou execução gerenciada for suficiente.
- Produção exige MFA, revisão periódica de acesso e trilha de auditoria.

## Critérios de conclusão da fase gratuita

- Emuladores iniciando localmente sem conexão com produção.
- Dados seed totalmente fictícios.
- Authentication, Firestore, Storage, Functions e Hosting exercitados localmente.
- Nenhum projeto Blaze, cartão ou segredo de produção configurado.
- Limitações entre emuladores e serviços reais documentadas nos testes.

## Critérios de conclusão da etapa futura paga

- Projetos e faturamento aprovados.
- Regiões e ambientes documentados.
- Emuladores iniciando localmente.
- Regras iniciais negando acesso não autorizado.
- App Check monitorado.
- Alertas de orçamento ativos.
- Nenhuma chave ou dado real versionado.

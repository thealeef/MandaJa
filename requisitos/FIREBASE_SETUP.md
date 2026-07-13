# Preparação do Firebase

Este é um roteiro de configuração para uma etapa futura. Nenhum recurso Firebase foi criado por esta documentação.

## Projetos e ambientes

Criar projetos Firebase distintos para:

- `manda-ja-desenvolvimento`
- `manda-ja-homologacao`
- `manda-ja-producao`

Os nomes finais dependem de disponibilidade e aprovação. Nunca reutilizar credenciais, bancos ou buckets entre ambientes. Definir responsáveis, faturamento, alertas e região antes de provisionar recursos.

## Pré-requisitos de decisão

- Organização Google Cloud e contas proprietárias.
- Região do Firestore, Functions, Storage e política de residência de dados.
- Plano de faturamento e limites orçamentários.
- Domínios, remetentes de e-mail e aplicativos Android/iOS.
- Provedores de pagamento, mapas e fiscal.
- Política de retenção, backup, RPO e RTO.

## Serviços previstos

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

## Critérios de conclusão da etapa futura

- Projetos e faturamento aprovados.
- Regiões e ambientes documentados.
- Emuladores iniciando localmente.
- Regras iniciais negando acesso não autorizado.
- App Check monitorado.
- Alertas de orçamento ativos.
- Nenhuma chave ou dado real versionado.


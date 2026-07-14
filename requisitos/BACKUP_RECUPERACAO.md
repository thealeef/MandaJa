# Backup e recuperação

## Objetivo

Restaurar dados e serviços após exclusão acidental, corrupção, falha operacional ou incidente. Alta disponibilidade e histórico de auditoria não substituem backup independente.

## Escopo previsto

- Cloud Firestore, inclusive configurações necessárias para reconstrução.
- Objetos do Firebase Storage e seus metadados relevantes.
- Código, regras, índices e configurações versionáveis do repositório.
- Configuração operacional, segredos e IAM por procedimentos seguros, sem exportar segredos para o repositório.
- Evidências de pagamentos e integrações cuja fonte oficial possa exigir reconciliação.

Authentication, FCM e configurações específicas precisam de estratégia própria; nem todos os serviços são restaurados por uma exportação do Firestore.

## Metas a aprovar

O negócio deve definir RPO e RTO por processo. Pedidos em andamento, pagamentos e entregas terão metas mais rigorosas que catálogo e relatórios. Frequência, retenção e custo serão escolhidos somente depois dessas metas.

Para um futuro piloto em nuvem, adotar como hipótese:

- RPO máximo de 24 horas para restauração por backup.
- RTO máximo de 8 horas para restabelecer o serviço essencial.
- Reconciliação separada de pagamentos, webhooks e entregas ocorridos após o ponto restaurado.

Essas metas não se aplicam ao desenvolvimento local com dados fictícios e não são suficientes por si só para uma operação madura de pagamentos em tempo real. Devem ser revistas antes da produção financeira e sempre que o impacto de 24 horas de perda potencial deixar de ser aceitável.

## Fase gratuita de desenvolvimento

- Versionar código, regras, índices e configurações no Git.
- Usar exportação e importação do Emulator Suite apenas para preservar cenários fictícios úteis.
- Não copiar dados pessoais ou dados de produção para os emuladores.
- Não chamar exportação local de backup de produção.
- Não ativar backup agendado do Firestore, pois o recurso exige o plano Blaze.

## Estratégia recomendada

- Exportações automatizadas e versionadas para destino separado e com acesso mínimo.
- Em um futuro plano Blaze, backup agendado diário do Firestore, restaurado sempre em um novo banco conforme o recurso nativo.
- Proteção contra exclusão e alteração, usando retenção/imutabilidade quando aprovada.
- Ciclos de retenção diário, mensal e anual definidos por necessidade e obrigação legal.
- Backups separados por ambiente; nunca restaurar produção sobre homologação com dados pessoais reais.
- Manifesto de cada execução com horário, escopo, resultado, integridade e responsável técnico.
- Alertas para falha, atraso, volume inesperado e alteração de política.

O backup agendado do Firestore inclui dados e configurações de índices, mas não inclui políticas de TTL e permanece na mesma localização do banco. Por isso, configurações versionáveis continuam no repositório e uma estratégia adicional de exportação deve ser avaliada para cenários de região comprometida. Storage, Authentication e serviços externos exigem procedimentos próprios.

Fonte consultada em 13 de julho de 2026: [Backup e restauração do Cloud Firestore](https://firebase.google.com/docs/firestore/backups).

## Procedimento de recuperação

1. Declarar incidente, preservar evidências e nomear responsável.
2. Conter a causa antes de restaurar.
3. Definir ponto de recuperação e impacto entre o backup e o incidente.
4. Restaurar primeiro em ambiente isolado quando possível.
5. Validar contagens, relações, permissões, arquivos e integridade de pedidos/pagamentos.
6. Reconciliar eventos externos ocorridos após o ponto restaurado.
7. Liberar o serviço de forma controlada e monitorada.
8. Registrar tempos, perdas, decisões e ações preventivas.

## Testes

Executar restauração trimestral durante o piloto, sem usar dados pessoais desnecessários. O teste deve medir RPO/RTO reais, verificar documentação, permissões, automação e reconciliação. A frequência deve aumentar conforme criticidade e volume. Backup não testado não é evidência de recuperabilidade.

## Segurança e LGPD

Backups são dados de produção: criptografar, restringir, auditar, aplicar retenção e prever descarte. Solicitações de titular e obrigações de retenção devem considerar cópias, restaurações futuras e impossibilidade técnica documentada.

## Pendências

- Definir RPO/RTO e responsáveis.
- Escolher região, destino, frequência e retenção.
- Confirmar recursos nativos e custos do plano Firebase/Google Cloud adotado.
- Criar runbook detalhado e teste inicial antes da produção.

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

## Estratégia recomendada

- Exportações automatizadas e versionadas para destino separado e com acesso mínimo.
- Proteção contra exclusão e alteração, usando retenção/imutabilidade quando aprovada.
- Ciclos de retenção diário, mensal e anual definidos por necessidade e obrigação legal.
- Backups separados por ambiente; nunca restaurar produção sobre homologação com dados pessoais reais.
- Manifesto de cada execução com horário, escopo, resultado, integridade e responsável técnico.
- Alertas para falha, atraso, volume inesperado e alteração de política.

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

Executar restauração periódica, no mínimo conforme criticidade aprovada, sem usar dados pessoais desnecessários. O teste deve medir RPO/RTO reais, verificar documentação, permissões, automação e reconciliação. Backup não testado não é evidência de recuperabilidade.

## Segurança e LGPD

Backups são dados de produção: criptografar, restringir, auditar, aplicar retenção e prever descarte. Solicitações de titular e obrigações de retenção devem considerar cópias, restaurações futuras e impossibilidade técnica documentada.

## Pendências

- Definir RPO/RTO e responsáveis.
- Escolher região, destino, frequência e retenção.
- Confirmar recursos nativos e custos do plano Firebase/Google Cloud adotado.
- Criar runbook detalhado e teste inicial antes da produção.


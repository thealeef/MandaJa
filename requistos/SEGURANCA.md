# Seguranca do MandaJa

## Objetivos

Garantir a integridade, confidencialidade e disponibilidade das informacoes do sistema, especialmente dados de clientes, estabelecimentos, pagamentos e entregas.

## Principios de seguranca

- Usar Firebase Authentication para autenticacao.
- Defender o acesso com regras de Firestore e Storage.
- Aplicar App Check em funcoes e endpoints sensiveis.
- Validar permissoes nas Cloud Functions, mesmo quando o cliente envia dados.
- Registrar eventos sensíveis em logs de auditoria.
- Restringir acesso por perfil e por estabelecimento.

## Requisitos operacionais

- Protecao contra alteracao indevida de pedidos e pagamentos.
- Confirmacao de identidade para alteracoes criticas.
- Controle de acesso por custom claims.
- Monitoramento de atividades suspeitas.

## Recomendacoes iniciais

- Manter segredos fora do codigo fonte.
- Limitar dados expostos em respostas de API.
- Usar HTTPS e autenticao forte.
- Implementar politicas de bloqueio para usuarios e estabelecimentos inseguros.

# Arquitetura do MandaJa

## Visao geral

A arquitetura do MandaJa deve ser organizada em camadas bem separadas para facilitar manutencao, seguranca e escalabilidade.

## Camadas propostas

1. Camada de apresentacao
   - Web Angular para administracao
   - Flutter para cliente e motoboy

2. Camada de autenticacao e autorizacao
   - Firebase Authentication
   - Custom claims para niveis de acesso
   - App Check para protecao de endpoints

3. Camada de dados
   - Cloud Firestore para dados transacionais
   - Firebase Storage para arquivos
   - Regras de segurança por colecao e perfil

4. Camada de processo
   - Cloud Functions com TypeScript
   - Processamento de pedidos, pagamentos, assinaturas, auditoria e notificacoes

5. Camada de integracao
   - Firebase Cloud Messaging
   - gateways de pagamento
   - integrações fiscais e de risco, quando aplicáveis

## Fluxo principal

1. Cliente cria conta e faz pedido.
2. Pedido e validado por regras de negocio.
3. O sistema reserva estoque e inicia o fluxo de pagamento.
4. O estabelecimento recebe a notificacao.
5. O pedido segue para preparo e entrega.
6. O motoboy e designado e o rastreamento e atualizado em tempo real.

## Requisitos arquiteturais

- Modularidade
- Escalabilidade horizontal por servicos
- Logs de auditoria
- Regras de acesso granulares
- Separacao entre dados operacionais e dados de auditoria
- Suporte a manutencao e rollback

## Observacao inicial

A implementacao tecnica deve respeitar o que foi definido no prompt mestre e nao deve iniciar antes da aprovacao desta documentacao base.

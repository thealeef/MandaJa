# MandaJá

O MandaJá é uma plataforma de pedidos e entregas para múltiplos estabelecimentos, com painel administrativo web e aplicativo móvel para clientes e motoboys.

Este repositório está na etapa inicial de documentação e arquitetura. Ainda não há implementação de Angular, Flutter ou Firebase.

## Stack prevista

- Angular e SCSS no painel administrativo web.
- Flutter no aplicativo Android/iOS único para cliente e motoboy.
- Firebase Authentication para autenticação.
- Cloud Firestore para dados.
- Cloud Functions com TypeScript para operações seguras.
- Firebase Storage para arquivos.
- Firebase Hosting para o painel web.
- Firebase Cloud Messaging para notificações.
- Firebase App Check para proteção dos recursos.

## Estrutura do repositório

| Pasta | Responsabilidade |
| --- | --- |
| `angular` | Painel administrativo web. |
| `flutter` | Aplicativo Android/iOS para cliente e motoboy. |
| `firebase` | Backend, regras, Functions, índices, emuladores e Hosting. |
| `requisitos` | Arquitetura e documentação técnica do projeto. |

O prompt mestre e a logo oficial estão preservados em `requisitos`, junto aos demais documentos de referência.

## Documentação

- [Arquitetura](requisitos/ARQUITETURA.md)
- [Glossário](requisitos/GLOSSARIO.md)
- [Padrão de código](requisitos/PADRAO_CODIGO.md)
- [Segurança](requisitos/SEGURANCA.md)
- [Preparação do Firebase](requisitos/FIREBASE_SETUP.md)
- [Deploy](requisitos/DEPLOY.md)
- [Design system](requisitos/DESIGN_SYSTEM.md)
- [LGPD](requisitos/LGPD.md)
- [Backup e recuperação](requisitos/BACKUP_RECUPERACAO.md)
- [Fiscal](requisitos/FISCAL.md)
- [Antifraude](requisitos/ANTIFRAUDE.md)
- [Custos do Firebase](requisitos/CUSTOS_FIREBASE.md)

## Ambientes previstos

O projeto deve manter ambientes Firebase separados para `desenvolvimento`, `homologacao` e `producao`. Dados reais não devem ser copiados para ambientes não produtivos. O Emulator Suite será o padrão para desenvolvimento e testes locais.

## Ordem de implementação

1. Documentação e arquitetura.
2. Firebase e modelo de dados.
3. Firestore Rules e Storage Rules.
4. Cloud Functions.
5. Angular.
6. Flutter.
7. Testes.
8. Deploy.

Cada etapa deve ser pequena, revisada e validada antes da seguinte. Segurança, LGPD, auditoria, idempotência e controle de custos são requisitos desde o início.

## Estado atual

- Documentação-base criada.
- Código de aplicação e infraestrutura ainda não iniciado.
- Provedores de pagamento, mapas/geocodificação, emissão fiscal e estratégia formal de backup ainda precisam de decisão.

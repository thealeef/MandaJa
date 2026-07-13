# Firebase setup do MandaJa

## Escopo

Este documento define a direcao inicial para a configuracao do ambiente Firebase do projeto MandaJa.

## Componentes previstos

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Hosting
- Cloud Functions com TypeScript
- Firebase Cloud Messaging
- Firebase App Check

## Estrutura de configuracao

- Criar projeto Firebase com identificador unico.
- Ativar autenticacao por email, telefone e identidade social, se necessario.
- Criar bancos Firestore com regras adequadas.
- Configurar buckets de Storage por tipo de arquivo.
- Preparar hosting para o painel Angular.
- Configurar funcoes backend para processos criticos.

## Regras de governanca

- Separar ambientes de desenvolvimento, homologacao e producao.
- Definir permissoes por perfil antes da implementacao.
- Documentar variaveis de ambiente e segredos.
- Garantir rastreabilidade de alteracoes de configuracao.

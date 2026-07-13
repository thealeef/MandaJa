# Instrucoes para o Codex - Projeto MandaJa

Este projeto se chama MandaJa.

Nome exibido da marca:
MandaJá

Nome interno no codigo:
MandaJa

ID interno:
manda_ja

Todo o codigo deve usar portugues do Brasil, sem acentos, sem cedilha e sem caracteres especiais em classes, variaveis, funcoes, colecoes e campos.

As mensagens exibidas para o usuario podem usar portugues com acentos normalmente.

Stack obrigatoria:
- Web: Angular
- App Android/iOS: Flutter
- Backend: Firebase
- Banco: Cloud Firestore
- Auth: Firebase Authentication
- Arquivos: Firebase Storage
- Hosting: Firebase Hosting
- Functions: Cloud Functions com TypeScript
- Notificacoes: Firebase Cloud Messaging
- Protecao: Firebase App Check

Pastas principais:
- angular: painel web administrativo
- flutter: aplicativo Android/iOS para cliente e motoboy
- firebase: backend, Cloud Functions, Firestore Rules, Storage Rules e Hosting
- requisitos: prompt mestre, logo e documentos de referencia

Arquivos de referencia:
- requisitos/PROMPT_MESTRE_MANDAJA.md: especificacao principal do projeto
- requisitos/Imagens/logo.png: logo principal do MandaJa
- AGENTS.md: regras de trabalho para o Codex

Padroes de codigo:
- Classes em PascalCase
- Variaveis em camelCase
- Funcoes em camelCase
- Colecoes Firestore em snake_case
- Status em snake_case
- Nao misturar ingles e portugues, exceto quando obrigatorio por bibliotecas, frameworks ou APIs externas
- Nao usar acentos, cedilha ou caracteres especiais no codigo
- Textos exibidos na interface podem usar acentos normalmente

Ordem de implementacao:
1. Documentacao e arquitetura
2. Firebase
3. Firestore Rules
4. Cloud Functions
5. Angular
6. Flutter
7. Testes
8. Deploy

Regras importantes:
- Nao gerar o sistema inteiro de uma vez
- Trabalhar em etapas pequenas
- Explicar cada alteracao feita
- Preservar seguranca, LGPD, permissoes, logs de auditoria e App Check
- Nunca expor dados sensiveis
- Usar o prompt mestre em requisitos/PROMPT_MESTRE_MANDAJA.md como referencia principal
- Nao alterar o arquivo requisitos/PROMPT_MESTRE_MANDAJA.md sem pedido explicito
- Nao alterar a logo sem pedido explicito
- Nao apagar arquivos existentes sem explicar e pedir confirmacao
- Nao implementar funcionalidades fora do escopo do prompt mestre sem avisar
- Sempre informar quais arquivos foram criados, alterados ou removidos
- Sempre que possivel, rodar build, lint ou teste depois de alterar codigo
- Se nao conseguir rodar algum comando, explicar o motivo
- Antes de implementar codigo grande, apresentar um plano curto da etapa atual

Regras para Firebase:
- Usar Cloud Functions com TypeScript
- Validar permissoes sensiveis nas Cloud Functions
- Nao confiar apenas nos campos de permissao salvos no Firestore
- Usar custom claims do Firebase Authentication para niveis de acesso
- Criar logs de auditoria para acoes sensiveis
- Proteger dados sensiveis com Firestore Rules e Storage Rules
- Usar App Check quando aplicavel
- Funcoes criticas devem ser idempotentes

Regras para Angular:
- Usar estrutura modular
- Criar rotas protegidas por guards
- Criar services para comunicacao com Firebase
- Criar componentes reutilizaveis
- Usar a identidade visual do MandaJa
- Usar SCSS
- Criar telas responsivas

Regras para Flutter:
- Criar app unico inicialmente para Cliente e Motoboy
- Separar funcionalidades por pastas
- Criar services para Firebase
- Criar models em portugues
- Usar design system do MandaJa
- Respeitar permissoes de localizacao
- Encerrar listeners quando a tela for fechada

Fluxo de trabalho recomendado:
1. Ler AGENTS.md
2. Ler requisitos/PROMPT_MESTRE_MANDAJA.md
3. Entender a etapa atual
4. Planejar brevemente
5. Implementar apenas a etapa solicitada
6. Validar arquivos alterados
7. Explicar o que foi feito
8. Sugerir proxima etapa
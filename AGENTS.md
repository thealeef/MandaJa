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

Padroes de codigo:
- Classes em PascalCase
- Variaveis em camelCase
- Funcoes em camelCase
- Colecoes Firestore em snake_case
- Status em snake_case
- Nao misturar ingles e portugues, exceto quando obrigatorio por bibliotecas, frameworks ou APIs externas

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
# Firebase do MandaJá

Esta pasta contém o primeiro recorte da Etapa 3: regras de segurança do
Cloud Firestore e do Firebase Storage, acompanhadas por testes locais.

Nenhum projeto Firebase real está vinculado. O identificador
`demo-manda-ja` é reservado ao Emulator Suite, não provisiona recursos e
mantém esta etapa sem custo.

## Escopo implementado

As regras adotam negação por padrão. Neste recorte:

- o catálogo publicado e ativo pode ser consultado com limites;
- o estado público da plataforma e documentos legais publicáveis podem ser
  lidos;
- o titular pode ler o próprio perfil e alterar somente o nome exibido;
- o titular ativo e não bloqueado pode consultar, criar e atualizar os
  próprios endereços, com campos e tipos validados;
- coordenadas e `geohash` dos endereços não podem ser definidos nem alterados
  pelo cliente; serão derivados por processo confiável;
- o titular pode consultar os próprios vínculos usando filtro por
  `idUsuario`;
- uma autorização temporária só pode ser lida pelo titular por ID conhecido;
- o Storage aceita somente a primeira gravação no caminho temporário
  autorizado, dentro do prazo, MIME e tamanho definidos pelo backend;
- leituras, sobrescritas, exclusões e caminhos finais do Storage são
  bloqueados.

Pedidos, estoque, pagamentos, dados fiscais, documentos de motoboy,
auditoria, antifraude e demais coleções permanecem bloqueados diretamente
ao SDK cliente. Esses fluxos dependerão de Cloud Functions e de recortes
posteriores das regras.

## Contrato de autorização

A claim global usada pelas regras é:

```text
nivelAcesso: n1_dev
```

O campo `nivelAcessoPrincipal` de `usuarios` é apenas informativo e nunca
concede permissão.

As Rules não conseguem executar uma consulta para descobrir um vínculo.
Antes de liberar escritas de N2, N3 e N6, o modelo precisa materializar uma
projeção determinística, preferencialmente:

```text
estabelecimentos/{idEstabelecimento}/membros/{idUsuario}
```

Essa projeção deve ser escrita somente pelo backend e conter apenas o
estado do vínculo, papel, permissões delegadas e validade necessários às
regras.

## Execução local

Pré-requisitos:

- Node.js 22 ou superior;
- Java 21 ou superior;
- dependências reproduzidas pelo lockfile com `npm ci`.

No PowerShell:

```powershell
cd firebase
$env:XDG_CONFIG_HOME = Join-Path $env:TEMP 'mandaja-firebase-config'
$env:FIREBASE_CLI_DISABLE_UPDATE_CHECK = 'true'
npm.cmd run test:regras
```

Para manter os emuladores abertos:

```powershell
npm.cmd run emuladores
```

São iniciados apenas Firestore na porta `8080` e Storage na porta `9199`.
A interface gráfica do Emulator Suite fica desligada tanto nos testes quanto
na execução manual. O comando manual deve ser executado na mesma sessão do
PowerShell em que as variáveis acima foram definidas.

Na primeira execução, o Firebase CLI pode baixar os binários oficiais dos
emuladores. Isso requer acesso à internet e pode levar alguns minutos, mas não
cria projeto, recurso em nuvem nem cobrança.

## Validação atual

Em 19 de julho de 2026:

- os 21 testes de Firestore e Storage passaram no Emulator Suite;
- `npm audit --omit=dev` não encontrou vulnerabilidades em dependências de
  produção;
- a auditoria completa apontou cinco alertas moderados na cadeia transitiva
  do `firebase-tools`, usado somente em desenvolvimento;
- o ajuste automático não foi aplicado porque propôs regredir a CLI para uma
  versão principal anterior. A cadeia deve ser reavaliada nas próximas
  atualizações da ferramenta.

## Limites deste recorte

- App Check é imposto na configuração de cada serviço e nas Functions
  aplicáveis; não é simulado como uma claim nas Rules.
- `contentType` no upload é somente uma triagem preliminar. A Function
  futura deverá validar os bytes reais, calcular hash e verificar segurança.
- A unicidade do endereço principal e os limites de quantidade por usuário
  exigirão validação transacional no backend.
- Consultas públicas precisam repetir os filtros exigidos pelas Rules e
  usar os limites documentados; regras não funcionam como filtros.
- A consulta de produtos está segura por estabelecimento conhecido. Uma
  busca global exigirá uma projeção confiável do estado público no produto
  ou um fluxo de busca pelo backend.
- A administração de perfis de outros usuários, inclusive por N1, deverá
  passar por Function sanitizada e auditada.
- O backend controla MIME e tamanho máximo de cada autorização temporária.
  Um teto técnico global deve ser aprovado antes de qualquer uso em produção.
- Os índices permanecem vazios até existirem consultas reais aprovadas.

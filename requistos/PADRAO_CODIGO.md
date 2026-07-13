# Padrao de codigo do MandaJa

## Principios gerais

- Usar portugues do Brasil como idioma principal.
- No codigo, evitar acentos, cedilha e caracteres especiais.
- Manter nomes claros e sem mistura de ingles e portugues.
- Priorizar legibilidade e consistencia.

## Convencoes de nomenclatura

- Classes: PascalCase
- Variaveis e funcoes: camelCase
- Colecoes Firestore: snake_case
- Status e enums: snake_case
- Campos de documentos: nomes curtos e descritivos

## Exemplos

- Classe: PedidoService
- Variavel: usuarioAtual
- Funcao: calcularTaxaEntrega
- Colecao: pedidos
- Status: em_preparo

## Estrutura de arquivos

- Modulos separados por dominio
- Services para acesso a dados e regras de negocio
- Models com nomes em portugues
- Componentes reutilizaveis e responsivos

## Comentarios e documentacao

- Usar comentarios curtos e objetivos.
- Documentar regras complexas e fluxos sensiveis.
- Evitar comentarios redundantes.

## Regras de implementacao futura

- Manter nomes internos em portugues sem acentos.
- Respeitar o padrao de status e colecoes definidos no prompt mestre.
- Evitar duplicidade de logica em telas e services.

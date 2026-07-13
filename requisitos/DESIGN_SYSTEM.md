# Design system MandaJá

## Direção visual

O MandaJá deve transmitir rapidez, tecnologia, confiança, comércio local, eficiência e simplicidade. A interface será moderna, limpa, responsiva, acessível e consistente entre Angular e Flutter.

A logo existente é a referência oficial e não deve ser alterada sem autorização.

## Cores-base

| Token conceitual | Cor | Uso inicial |
| --- | --- | --- |
| Marca principal | `#0F4C5C` | Navegação, marca e superfícies principais. |
| Ação e destaque | `#FF9F1C` | Chamadas para ação e destaques. |
| Entrega | `#2ECC71` | Estados logísticos positivos. |
| Fundo | `#F5F7FA` | Fundo claro e superfícies neutras. |
| Texto | `#1F2937` | Texto principal. |
| Erro | `#E63946` | Falhas e cancelamentos. |
| Sucesso | `#22C55E` | Confirmações. |
| Aviso | `#FACC15` | Atenção e pendências. |

Antes da implementação, combinações de texto e fundo devem ser testadas conforme WCAG. Tons auxiliares, estados hover/pressed/focus, modo escuro e cores sobrepostas à marca ainda precisam ser definidos.

## Tokens compartilhados

Definir uma fonte única de decisão para:

- Cores semânticas e de marca.
- Tipografia, pesos, alturas de linha e escala responsiva.
- Espaçamento em base de 4 pontos.
- Raios de borda, bordas, sombras e elevação.
- Tamanhos de ícones e áreas mínimas de toque.
- Duração e curva de movimentos, respeitando redução de animações.
- Breakpoints no Angular e adaptação de layout no Flutter.

Angular e Flutter terão implementações próprias derivadas dos mesmos tokens, sem compartilhar código entre tecnologias.

## Componentes iniciais

- Botões primário, secundário, discreto, destrutivo e somente ícone.
- Campos, seleção, busca, data, telefone, moeda e validação.
- Cards de pedido, produto, estabelecimento, entrega e indicadores financeiros.
- Badges de status com texto e ícone, nunca apenas cor.
- Tabelas e listas responsivas com paginação e estados vazios.
- Navegação, diálogos, notificações, filtros e confirmações.
- Loading, skeleton, progresso, erro, sucesso, offline e sem permissão.
- Componentes de mapa com alternativa textual para informações essenciais.

## Acessibilidade

- Contraste verificado, foco visível e ordem de navegação lógica.
- Rótulos associados aos campos e erros explicados em texto.
- Alvos de toque adequados e suporte a zoom e fontes maiores.
- Leitores de tela com nomes e estados semânticos.
- Não depender somente de cor, gesto, som ou movimento.
- Linguagem direta, inclusiva e consistente em português do Brasil.

## Conteúdo e status

Identificadores internos usam `snake_case`, enquanto a interface apresenta texto natural. Exemplo: `aguardando_pagamento` aparece como “Aguardando pagamento”. O catálogo de textos deve manter consistência entre painel, aplicativo, notificações e e-mails.

## Governança

Cada componente deve documentar finalidade, anatomia, variações, estados, acessibilidade e exemplos. Alterações de token ou componente compartilhado exigem revisão visual nas duas plataformas e registro da mudança.


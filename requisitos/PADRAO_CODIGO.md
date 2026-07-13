# Padrão de código

## Idioma e marca

- Textos, comentários úteis e documentação: português do Brasil.
- Identificadores internos: português sem acentos, cedilha ou caracteres especiais.
- Marca em código: `MandaJa`.
- Identificador interno: `manda_ja`.
- Marca apresentada ao usuário: MandaJá.
- Inglês somente quando imposto por framework, biblioteca, protocolo ou API externa.

## Nomenclatura

| Elemento | Padrão | Exemplo |
| --- | --- | --- |
| Classe, tipo e enum | PascalCase | `PedidoService`, `StatusPedido` |
| Variável, campo e função | camelCase | `idPedido`, `calcularTaxaEntrega` |
| Coleção e status Firestore | snake_case | `logs_auditoria`, `em_preparo` |
| Arquivo de documentação | MAIÚSCULAS com `_` | `BACKUP_RECUPERACAO.md` |
| Constante | padrão idiomático da tecnologia, sem acentos | `tempoLimiteEntrega` |

Não combinar idiomas, como `createPedido` ou `orderAtual`. Nomes definidos por SDKs, widgets, decorators, callbacks, arquivos de configuração e APIs externas mantêm a forma exigida.

## Dados e contratos

- IDs de documentos são opacos; não incluir e-mail, CPF, telefone ou outro dado pessoal.
- Datas persistidas usam timestamps do servidor; datas de API usam ISO 8601 com fuso explícito.
- Valores monetários usam inteiro na menor unidade monetária, por exemplo `valorTotalCentavos`.
- Status usam conjuntos fechados e transições documentadas.
- Campos booleanos expressam condição clara, como `ativo` e `aceitaRetiradaLocal`.
- Campos derivados não são fonte de verdade sem estratégia de consistência.
- Contratos públicos devem ser versionados quando houver quebra de compatibilidade.
- Segredos, tokens e credenciais nunca entram em código, logs ou repositório.

## Organização

- Separar apresentação, aplicação, domínio e infraestrutura quando isso reduzir acoplamento.
- Organizar por funcionalidade, mantendo componentes e serviços compartilhados em área comum.
- Uma unidade deve ter responsabilidade clara e dependências explícitas.
- Operações críticas devem aceitar chave de idempotência e produzir logs estruturados.
- Não duplicar regras financeiras ou de autorização entre clientes; o backend é a autoridade.

## Qualidade

- Formatação automática, análise estática, lint, testes e build devem integrar a validação.
- Tratar estados de carregamento, vazio, sucesso, erro e falta de permissão.
- Mensagens ao usuário podem ter acentos e não devem expor detalhes internos.
- Erros técnicos recebem código estável, contexto mínimo e identificador de correlação.
- Comentários explicam decisões e riscos, não repetem o código.
- Dependências devem ser fixadas por arquivo de lock e atualizadas conscientemente.

## Git e revisão

- Commits pequenos, descritivos e ligados a uma etapa.
- Não incluir arquivos de ambiente, chaves, certificados ou dados exportados.
- Revisar autorização, validação, custo, LGPD e observabilidade em mudanças sensíveis.
- Alterações de regras e índices exigem testes no Emulator Suite antes de produção.


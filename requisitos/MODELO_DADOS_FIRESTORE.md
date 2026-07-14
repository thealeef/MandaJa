# Modelo de dados do Cloud Firestore

## Estado da Etapa 2

Este documento inicia a Etapa 2 do MandaJá. A modelagem será concluída em partes para permitir revisão antes das regras de segurança:

1. Fundamentos, catálogo de coleções, identidade, estabelecimentos e produtos.
2. Pedidos, estoque, pagamentos, entregas e financeiro.
3. Suporte, conformidade, operação, índices, retenção e validação final.

Esta primeira parte é documental. Nenhuma coleção foi criada e nenhum recurso Firebase foi provisionado.

## Objetivos da modelagem

- Atender múltiplos estabelecimentos com isolamento explícito.
- Permitir regras de segurança verificáveis na Etapa 3.
- Separar dados públicos, pessoais, fiscais e operacionais sensíveis.
- Evitar documentos sem limite de crescimento e consultas de coleção inteira.
- Preservar fotografias históricas de preços, endereços e regras aplicadas.
- Suportar idempotência, concorrência, auditoria, retenção e custos controlados.
- Manter nomes internos em português, sem acentos ou caracteres especiais.

## Convenções obrigatórias

### Nomes

- Coleções e status usam `snake_case`.
- Campos usam `camelCase`.
- IDs são strings opacas e nunca contêm e-mail, telefone, CPF, CNPJ ou outro dado pessoal.
- Identificadores do Firebase Authentication usam o nome `idUsuario`.
- Nomes exigidos por SDK ou provedor externo são convertidos na camada de integração.
- O campo `idempotencyKey` citado no prompt passa a se chamar `chaveIdempotencia` no modelo interno.
- O campo `userAgent` citado no prompt passa a se chamar `agenteUsuario` no modelo interno.

### Tipos

| Tipo documental | Representação no Firestore | Regra |
| --- | --- | --- |
| Texto | `string` | Normalizar espaços; limitar tamanho por campo. |
| Inteiro | `number` inteiro | Usar para contagens, tentativas e valores monetários. |
| Decimal técnico | `number` | Somente distância, velocidade, coordenadas derivadas e médias. |
| Booleano | `boolean` | Não substituir estados que precisam de histórico. |
| Data/hora | `timestamp` | Gerada pelo servidor em operações sensíveis. |
| Localização | `geopoint` | Nunca usar como endereço ou prova isolada de presença. |
| Estrutura | `map` | Apenas objetos pequenos e de formato fechado. |
| Lista | `array` | Somente listas pequenas e limitadas; nunca histórico crescente. |
| Ausência | campo ausente ou `null` | Padronizar por campo; não alternar sem contrato. |

### Dinheiro

Todo valor em real é armazenado como inteiro em centavos:

- `precoCentavos`
- `subtotalCentavos`
- `taxaEntregaCentavos`
- `valorTotalCentavos`
- `valorComissaoCentavos`

A moeda é `BRL` no MVP e fica registrada como `moeda` nos documentos financeiros. Cálculos autoritativos pertencem às Cloud Functions; clientes apenas exibem valores recebidos.

### Campos comuns

Documentos mutáveis devem usar, quando aplicável:

| Campo | Tipo | Finalidade |
| --- | --- | --- |
| `versaoEsquema` | inteiro | Permitir migrações progressivas. Inicia em `1`. |
| `criadoEm` | timestamp | Data do servidor em que o documento foi criado. |
| `criadoPor` | string | ID do ator quando houver ação humana. |
| `atualizadoEm` | timestamp | Data do servidor da última atualização. |
| `atualizadoPor` | string | ID do último ator quando aplicável. |

Não usar exclusão lógica por padrão. Quando retenção ou integridade histórica impedir exclusão física, usar estado específico como `inativo`, `cancelado` ou `anonimizado`, com motivo e auditoria.

## Limites e padrões do Firestore

- Nenhum documento pode se aproximar do limite técnico de tamanho do Firestore; o limite interno inicial será 256 KiB.
- Arrays terão limite definido por contrato. Equipes, tokens, histórico, anexos e itens ilimitados usam documentos separados.
- Pedidos terão limite inicial de 100 itens; o valor será reavaliado antes da implementação.
- Textos livres terão tamanho máximo e sanitização definidos na camada de aplicação.
- Escritas concorrentes de estoque, cupom, aceite de entrega e carteira usam transação.
- Contadores agregados são derivados e podem ter consistência eventual; registros financeiros não.
- Dados de alta frequência não ficam no mesmo documento de perfil ou pedido.
- Consultas sempre partem de proprietário, vínculo, status, período ou geohash e usam paginação por cursor.

## Separação de dados

O Firestore não oferece autorização de leitura por campo. Por isso, documentos com públicos diferentes precisam ser separados.

| Classe | Exemplos | Estratégia |
| --- | --- | --- |
| Catálogo público | Nome do estabelecimento, produto e avaliação agregada. | Documentos sem dados fiscais ou pessoais. |
| Perfil pessoal | Nome, e-mail, telefone e preferências. | Proprietário e operação autorizada. |
| Fiscal/documental | CPF/CNPJ, inscrições, documentos de motoboy. | Coleções privadas e acesso mínimo. |
| Operacional | Pedido, entrega, estoque e suporte. | Participantes e equipe vinculada conforme função. |
| Financeiro | Pagamento, comissão, assinatura e carteira. | Backend como autoridade; leitura fortemente limitada. |
| Efêmero | Localização atual, código de entrega e token de convite. | Documento isolado, hash, expiração e TTL quando disponível. |
| Auditoria | Mudanças sensíveis e intervenções N1. | Escrita somente pelo backend e leitura restrita. |

## Estratégia multiestabelecimento

O modelo adota coleções de topo com `idEstabelecimento` obrigatório nas entidades pertencentes a um estabelecimento. Essa escolha preserva os caminhos definidos no prompt, permite administração global N1 e evita subcoleções profundas em todos os domínios.

Consequências obrigatórias:

- Toda consulta de equipe inclui `idEstabelecimento` e os demais filtros exigidos pela autorização.
- Regras do Firestore não são filtros; uma consulta que possa retornar outro estabelecimento deve ser negada por inteiro.
- `vinculos_estabelecimentos` é a fonte de escopo para dono, gerente, funcionário, caixa, estoque e motoboy vinculado.
- Custom claims representam privilégios globais ou pouco mutáveis, nunca uma lista de estabelecimentos.
- Dados realmente globais, como documentos legais e configuração da plataforma, não recebem `idEstabelecimento`.
- Projeções públicas não contêm dados fiscais, vínculos ou permissões.

Essa decisão será reavaliada na Etapa 3 com testes das regras e orçamento de leituras de autorização. Se as regras se tornarem excessivamente complexas, membros mínimos poderão ser projetados também sob `estabelecimentos/{idEstabelecimento}/membros/{idUsuario}`, sem mudar a fonte de verdade.

## Mapa de relações

```text
usuarios 1 ── 1 usuarios_privados
usuarios 1 ── N enderecos
usuarios 1 ── N dispositivos_usuarios
usuarios N ── N estabelecimentos (por vinculos_estabelecimentos)

estabelecimentos 1 ── N produtos
produtos 1 ── 1 estoques_produtos
produtos 1 ── N movimentacoes_estoque
pedidos 1 ── N reservas_estoque

clientes 1 ── N pedidos
estabelecimentos 1 ── N pedidos
pedidos 1 ── N pagamentos
pedidos 1 ── 0..1 entregas
entregas 1 ── N ofertas_entregas
entregas 1 ── 0..1 rastreamento_entregas

estabelecimentos 1 ── N assinaturas
assinaturas 1 ── N pagamentos_assinaturas
motoboys 1 ── 1 carteiras_motoboys
motoboys 1 ── N transacoes_motoboys
```

IDs são armazenados como strings, não como referências Firestore, para manter contratos simples e evitar a falsa expectativa de integridade referencial automática.

## Catálogo canônico de coleções

As coleções marcadas como “suporte necessário” não ampliam funcionalidades do produto; elas corrigem limitações de segurança, cardinalidade ou idempotência do modelo resumido no prompt.

| Coleção ou caminho | Responsabilidade | Origem |
| --- | --- | --- |
| `usuarios/{idUsuario}` | Estado operacional e preferências do usuário. | Prompt, com dados sensíveis separados. |
| `usuarios_privados/{idUsuario}` | Contato, nascimento e documento pessoal. | Suporte necessário. |
| `usuarios/{idUsuario}/enderecos/{idEndereco}` | Endereços salvos do cliente. | Suporte ao fluxo do prompt. |
| `dispositivos_usuarios/{idDispositivo}` | Tokens FCM por instalação. | Substitui token único do prompt. |
| `vinculos_estabelecimentos/{idVinculo}` | Relação entre usuário, estabelecimento e função. | Suporte ao multiestabelecimento. |
| `perfis_motoboys/{idMotoboy}` | Aprovação, disponibilidade e operação do motoboy. | Separação do perfil genérico. |
| `documentos_motoboys/{idDocumentoMotoboy}` | Metadados de documentos restritos no Storage. | Suporte necessário. |
| `estabelecimentos/{idEstabelecimento}` | Dados operacionais e de catálogo do estabelecimento. | Prompt, com dados fiscais separados. |
| `estabelecimentos_privados/{idEstabelecimento}` | Dados fiscais e administrativos privados. | Suporte necessário. |
| `produtos/{idProduto}` | Catálogo, preço atual e projeção de disponibilidade. | Prompt, com estoque separado. |
| `estoques_produtos/{idProduto}` | Fonte de verdade da quantidade física e reservada. | Separação necessária para concorrência. |
| `movimentacoes_estoque/{idMovimentacao}` | Razão imutável de entradas, baixas, reservas e ajustes. | Suporte ao controle e auditoria. |
| `promocoes/{idPromocao}` | Regras promocionais por período. | Prompt. |
| `cupons/{idCupom}` | Definição e limites de cupom. | Prompt. |
| `usos_cupons/{idUsoCupom}` | Reserva e consumo atômico por pedido/cliente. | Suporte à concorrência. |
| `reservas_estoque/{idReserva}` | Reserva temporária por produto e pedido. | Suporte ao fluxo do prompt. |
| `pedidos/{idPedido}` | Fotografia comercial e estado do pedido. | Prompt. |
| `pedidos/{idPedido}/historico_status/{idHistoricoStatus}` | Transições imutáveis do pedido. | Prompt. |
| `entregas/{idEntrega}` | Estado logístico da entrega. | Prompt. |
| `ofertas_entregas/{idOferta}` | Oferta mínima e temporária para um motoboy elegível. | Suporte ao aceite seguro. |
| `entregas/{idEntrega}/eventos/{idEvento}` | Linha do tempo imutável da entrega. | Prompt. |
| `rastreamento_entregas/{idEntrega}` | Posição compartilhada da entrega ativa. | Prompt. |
| `localizacoes_motoboys/{idMotoboy}` | Posição operacional privada para distribuição. | Prompt. |
| `pagamentos/{idPagamento}` | Tentativas e resultados de pagamento de pedido. | Prompt. |
| `eventos_webhooks/{idEventoWebhook}` | Deduplicação e reconciliação de eventos externos. | Suporte necessário. |
| `assinaturas/{idAssinatura}` | Plano e ciclo vigente do estabelecimento. | Prompt. |
| `pagamentos_assinaturas/{idPagamentoAssinatura}` | Cobranças das assinaturas. | Prompt. |
| `configuracoes_cobranca_estabelecimento/{idEstabelecimento}` | Modo de cobrança e comissão. | Prompt. |
| `carteiras_motoboys/{idMotoboy}` | Saldos derivados do motoboy. | Prompt. |
| `transacoes_motoboys/{idTransacao}` | Razão imutável de créditos e débitos. | Prompt. |
| `avaliacoes/{idAvaliacao}` | Avaliações vinculadas a pedidos concluídos. | Prompt. |
| `denuncias/{idDenuncia}` | Denúncias e tratamento restrito. | Prompt. |
| `chamados_suporte/{idChamado}` | Estado e classificação do atendimento. | Prompt. |
| `chamados_suporte/{idChamado}/mensagens/{idMensagem}` | Conversa e anexos do chamado. | Suporte necessário. |
| `notificacoes/{idNotificacao}` | Caixa de notificações e estado de leitura. | Prompt. |
| `logs_auditoria/{idLog}` | Ações sensíveis append-only. | Prompt. |
| `documentos_legais/{idDocumento}` | Termos e políticas versionados. | Prompt. |
| `consentimentos_usuarios/{idConsentimento}` | Evidência de aceite ou revogação. | Prompt. |
| `solicitacoes_lgpd/{idSolicitacao}` | Exportação, correção, desativação e exclusão. | Suporte ao módulo LGPD. |
| `regioes_atendidas/{idRegiao}` | Áreas geográficas e estado de atendimento. | Prompt. |
| `configuracoes_taxa_entrega/{idConfiguracaoTaxa}` | Regras versionadas de cálculo de entrega. | Prompt. |
| `convites_funcionarios/{idConvite}` | Convites com expiração e uso único. | Prompt. |
| `comprovantes_pedidos/{idComprovante}` | Metadados de comprovantes no Storage. | Prompt. |
| `documentos_fiscais/{idDocumentoFiscal}` | Referências fiscais futuras e restritas. | Suporte ao módulo fiscal. |
| `alertas_antifraude/{idAlerta}` | Sinais, risco e revisão humana. | Prompt. |
| `metricas_uso/{idMetrica}` | Agregações técnicas por período. | Prompt. |
| `custos_plataforma/{idCusto}` | Estimativas e valores conciliados de custo. | Prompt. |
| `backups_registros/{idBackup}` | Evidência de exportações e restaurações. | Prompt. |
| `configuracoes_plataforma/{idConfiguracao}` | Flags globais, incluindo manutenção. | Prompt. |
| `idempotencias/{idOperacao}` | Reserva e resultado de operações críticas. | Suporte ao requisito de idempotência. |
| `eventos_saida/{idEventoSaida}` | Efeitos assíncronos idempotentes, como notificação e integração. | Suporte à entrega confiável. |

## Identidade e acesso

### `usuarios/{idUsuario}`

O ID do documento é igual ao UID do Firebase Authentication. Este documento não substitui custom claims e não concede permissão sozinho.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idUsuario` | string | sim | UID redundante para consultas e exportações. |
| `nomeExibicao` | string | sim | Nome apresentado na interface. |
| `fotoUrl` | string ou null | não | URL controlada do avatar. |
| `nivelAcessoPrincipal` | string | sim | Espelho informativo da claim principal; backend confirma autorização. |
| `ativo` | booleano | sim | Indica conta operacionalmente ativa. |
| `bloqueado` | booleano | sim | Impede operações sensíveis quando verdadeiro. |
| `motivoBloqueioCodigo` | string ou null | não | Código interno sem detalhes sensíveis. |
| `configuracoesNotificacao` | mapa fechado | sim | Preferências por categoria, não tokens de dispositivo. |
| `aceiteTermosVersao` | string ou null | não | Cache da versão aceita; evidência fica em consentimentos. |
| `aceitePoliticaVersao` | string ou null | não | Cache da versão aceita. |
| `ultimoLoginEm` | timestamp ou null | não | Atualizado por processo confiável. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

Não armazenar neste documento: documento pessoal, data de nascimento, endereços, posição atual, tokens FCM, listas crescentes de estabelecimentos ou documentos do motoboy.

### `usuarios_privados/{idUsuario}`

Documento legível apenas pelo titular em operações permitidas e por backend/operação autorizada.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idUsuario` | string | sim | Mesmo UID do usuário. |
| `emailNormalizado` | string | não | E-mail para contato; não usar como ID. |
| `telefoneE164` | string | não | Telefone normalizado quando necessário. |
| `dataNascimento` | timestamp ou null | não | Coletar apenas com finalidade aprovada. |
| `tipoDocumento` | string ou null | não | Tipo aprovado, como `cpf`. |
| `documentoProtegido` | string ou null | não | Valor protegido ou tokenizado; nunca exposto em listagens. |
| `documentoFinal` | string ou null | não | Últimos dígitos para identificação visual quando permitido. |
| `solicitouExclusaoEm` | timestamp ou null | não | Início do fluxo LGPD. |
| `anonimizadoEm` | timestamp ou null | não | Data de anonimização concluída. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

O desenho da proteção de CPF/CNPJ será definido antes da implementação. Hash simples não é adequado para valores de domínio pequeno.

### `usuarios/{idUsuario}/enderecos/{idEndereco}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idEndereco` | string | sim | ID opaco. |
| `rotulo` | string | sim | Exemplo: `casa` ou `trabalho`. |
| `destinatario` | string | sim | Pessoa que receberá o pedido. |
| `telefoneContato` | string | não | Usado somente na entrega quando necessário. |
| `logradouro` | string | sim | Endereço informado. |
| `numero` | string | sim | Mantido como texto. |
| `complemento` | string ou null | não | Complemento limitado. |
| `bairro` | string | sim | Bairro. |
| `cidade` | string | sim | Cidade. |
| `estado` | string | sim | UF em duas letras. |
| `cep` | string | sim | CEP normalizado. |
| `pontoReferencia` | string ou null | não | Orientação limitada. |
| `localizacao` | geopoint ou null | não | Coordenadas validadas quando disponíveis. |
| `geohash` | string ou null | não | Apoio às consultas geográficas. |
| `principal` | booleano | sim | Endereço preferido; unicidade mantida pela aplicação. |
| `ativo` | booleano | sim | Permite ocultar endereço sem apagar pedido histórico. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

Pedidos copiam uma fotografia do endereço utilizado. Alterar um endereço salvo nunca altera pedidos antigos.

### `dispositivos_usuarios/{idDispositivo}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idDispositivo` | string | sim | ID aleatório da instalação, não identificador físico invasivo. |
| `idUsuario` | string | sim | Proprietário autenticado. |
| `plataforma` | string | sim | `android`, `ios` ou `web`. |
| `tokenFcmProtegido` | string | sim | Token de envio, restrito ao backend. |
| `appVersao` | string | não | Versão do aplicativo. |
| `idioma` | string | sim | Inicialmente `pt_BR`. |
| `ativo` | booleano | sim | Falso após logout, invalidação ou exclusão. |
| `ultimoUsoEm` | timestamp | sim | Apoio à expiração. |
| `expiraEm` | timestamp ou null | não | Limpeza automática quando aplicável. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

### `vinculos_estabelecimentos/{idVinculo}`

O ID pode ser determinístico a partir de estabelecimento, usuário e função, sem incluir dados pessoais.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idVinculo` | string | sim | ID do vínculo. |
| `idEstabelecimento` | string | sim | Escopo do vínculo. |
| `idUsuario` | string | sim | Usuário vinculado. |
| `nivelAcesso` | string | sim | `n2_dono_estabelecimento` a `n7_motoboy`, conforme permitido. |
| `permissoesDelegadas` | lista de strings | sim | Lista pequena de capacidades opcionais e validadas. |
| `statusVinculo` | string | sim | `pendente`, `ativo`, `suspenso`, `revogado`. |
| `origemVinculo` | string | sim | `cadastro`, `convite` ou `aprovacao`. |
| `idConvite` | string ou null | não | Convite que originou o vínculo. |
| `validoAte` | timestamp ou null | não | Para vínculos temporários. |
| `criadoPor` | string | sim | Ator autorizado. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

As regras nunca confiam em uma lista `idsEstabelecimentos` enviada pelo cliente. Vínculos ativos são a fonte de escopo; custom claims representam somente privilégios globais adequados.

## Motoboys

### `perfis_motoboys/{idMotoboy}`

O ID é o UID do usuário. Dados documentais ficam separados.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idMotoboy` | string | sim | UID do motoboy. |
| `tipoAtuacao` | string | sim | `autonomo`, `vinculado` ou `misto`. |
| `statusAprovacao` | string | sim | `pendente_aprovacao`, `aprovado`, `rejeitado`. |
| `statusDisponibilidade` | string | sim | `offline`, `online`, `ocupado`, `em_entrega`, `bloqueado`. |
| `aprovadoPor` | string ou null | não | Operador responsável. |
| `aprovadoEm` | timestamp ou null | não | Data da aprovação. |
| `motivoRejeicaoCodigo` | string ou null | não | Código interno revisável. |
| `avaliacaoMedia` | decimal | sim | Agregado derivado. |
| `totalAvaliacoes` | inteiro | sim | Agregado derivado. |
| `entregaAtualId` | string ou null | não | Cache operacional, alterado apenas pelo backend. |
| `ultimaAtividadeEm` | timestamp ou null | não | Apoio à disponibilidade. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

### `documentos_motoboys/{idDocumentoMotoboy}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idDocumentoMotoboy` | string | sim | ID opaco. |
| `idMotoboy` | string | sim | Titular do documento. |
| `tipoDocumento` | string | sim | Tipo permitido por lista fechada futura. |
| `caminhoStorage` | string | sim | Caminho privado; não URL pública permanente. |
| `statusAnalise` | string | sim | `pendente`, `aprovado`, `rejeitado`, `expirado`. |
| `expiraEm` | timestamp ou null | não | Validade quando aplicável. |
| `analisadoPor` | string ou null | não | Operador autorizado. |
| `analisadoEm` | timestamp ou null | não | Data da análise. |
| `motivoRejeicaoCodigo` | string ou null | não | Motivo padronizado. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

## Estabelecimentos

### `estabelecimentos/{idEstabelecimento}`

Contém somente dados que podem ser consultados no catálogo ou por equipes autorizadas. Informações fiscais ficam em documento privado.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idEstabelecimento` | string | sim | ID opaco. |
| `idDonoPrincipal` | string | sim | Responsável principal; demais vínculos ficam separados. |
| `nomeFantasia` | string | sim | Nome apresentado no catálogo. |
| `tipoEstabelecimento` | string | sim | Categoria fechada do estabelecimento. |
| `descricao` | string | sim | Descrição pública limitada. |
| `enderecoPublico` | mapa fechado | sim | Endereço comercial sem dados fiscais privados. |
| `localizacao` | geopoint | sim | Ponto usado para distância. |
| `geohash` | string | sim | Busca geográfica. |
| `horarioFuncionamento` | mapa fechado | sim | Grade semanal limitada. |
| `statusOperacional` | string | sim | `aberto`, `fechado`, `pausado`, `ocupado`, `bloqueado`. |
| `statusConta` | string | sim | `ativo`, `inativo` ou `bloqueado`. Não representa aprovação. |
| `publicado` | booleano | sim | Projeção mantida pelo backend após aprovação e demais verificações. |
| `aceitaEntrega` | booleano | sim | Habilita entrega. |
| `aceitaRetiradaLocal` | booleano | sim | Habilita retirada. |
| `aceitaPedidoAgendado` | booleano | sim | Habilita agendamento. |
| `raioEntregaKm` | decimal | não | Limite simples quando usado. |
| `taxaEntregaPadraoCentavos` | inteiro | sim | Valor-base, não cálculo final. |
| `tempoMedioPreparoMinutos` | inteiro | sim | Estimativa operacional. |
| `avaliacaoMedia` | decimal | sim | Agregado derivado. |
| `totalAvaliacoes` | inteiro | sim | Agregado derivado. |
| `logoUrl` | string ou null | não | Arquivo controlado. |
| `bannerUrl` | string ou null | não | Arquivo controlado. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

Horários especiais, feriados, regiões e regras de taxa que possam crescer ficam em documentos próprios, não em arrays ilimitados neste documento. `statusAprovacao` existe somente no documento privado; `publicado` é uma projeção de catálogo e nunca a fonte da aprovação.

### `estabelecimentos_privados/{idEstabelecimento}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idEstabelecimento` | string | sim | Mesmo ID do estabelecimento. |
| `razaoSocial` | string | sim | Razão social. |
| `tipoDocumento` | string | sim | `cpf` ou `cnpj`, conforme modelo aprovado. |
| `documentoProtegido` | string | sim | Valor protegido; não retornado ao catálogo. |
| `documentoFinal` | string | sim | Trecho mínimo para conferência autorizada. |
| `inscricaoEstadual` | string ou null | não | Quando aplicável. |
| `inscricaoMunicipal` | string ou null | não | Quando aplicável. |
| `regimeTributario` | string ou null | não | Após validação contábil. |
| `emailFiscal` | string ou null | não | Contato fiscal. |
| `enderecoFiscal` | mapa fechado | sim | Endereço fiscal restrito. |
| `statusAprovacao` | string | sim | Estado detalhado da revisão. |
| `aprovadoPor` | string ou null | não | N1 responsável. |
| `aprovadoEm` | timestamp ou null | não | Data da aprovação. |
| `motivoRejeicaoCodigo` | string ou null | não | Código interno. |
| `alteracoesSolicitadas` | lista de mapas limitados | não | Lista curta da análise atual; histórico vai para auditoria. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

## Produtos

### `produtos/{idProduto}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idProduto` | string | sim | ID opaco. |
| `idEstabelecimento` | string | sim | Proprietário e partição lógica. |
| `nome` | string | sim | Nome público. |
| `descricao` | string | sim | Descrição limitada. |
| `categoria` | string | sim | `bebidas`, `comidas`, `mercado` ou `medicamentos` no escopo inicial. |
| `subcategoria` | string ou null | não | Valor normalizado. |
| `precoCentavos` | inteiro | sim | Preço vigente não negativo. |
| `precoPromocionalCentavos` | inteiro ou null | não | Menor que o preço vigente quando ativo. |
| `moeda` | string | sim | `BRL`. |
| `controlarEstoque` | booleano | sim | Define se quantidade bloqueia pedido. |
| `disponivelParaVenda` | booleano | sim | Projeção de catálogo; não substitui a validação do estoque. |
| `imagens` | lista de mapas limitados | sim | Até dez referências ordenadas do Storage. |
| `ativo` | booleano | sim | Disponibilidade administrativa. |
| `emPromocao` | booleano | sim | Cache derivado da promoção vigente. |
| `avaliacaoMedia` | decimal | sim | Agregado derivado. |
| `totalAvaliacoes` | inteiro | sim | Agregado derivado. |
| `quantidadeVendida` | inteiro | sim | Agregado derivado. |
| `exigeReceita` | booleano | sim | Aplicável a medicamento. |
| `exigeAprovacaoManual` | booleano | sim | Aplicável a produto regulado. |
| `exigeValidacaoEstabelecimento` | booleano | sim | Validação antes do envio. |
| `vendaOnlinePermitida` | booleano | sim | Falso por padrão para item regulado sem aprovação. |
| `tagsPesquisa` | lista de strings | sim | Lista pequena normalizada; não substitui motor de busca futuro. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

O pedido nunca depende do preço atual do produto depois de criado. Cada item do pedido conterá uma fotografia com ID, nome, quantidade, preço unitário, desconto e exigências regulatórias aplicadas naquele momento.

### `estoques_produtos/{idProduto}`

O documento pequeno de estoque evita regravar e retransmitir todo o catálogo a cada movimentação.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idProduto` | string | sim | Mesmo ID do produto. |
| `idEstabelecimento` | string | sim | Escopo obrigatório. |
| `estoqueFisico` | inteiro | sim | Fonte de verdade da quantidade registrada. |
| `estoqueReservado` | inteiro | sim | Soma das reservas ativas. |
| `limiteEstoqueBaixo` | inteiro | sim | Ponto de alerta. |
| `versaoControle` | inteiro | sim | Incrementado em alterações autoritativas. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

Invariantes:

- `estoqueFisico >= 0`.
- `estoqueReservado >= 0`.
- Se `controlarEstoque` estiver ativo, `estoqueReservado <= estoqueFisico`.
- `estoqueDisponivel` não é persistido: resulta de `estoqueFisico - estoqueReservado`.
- Reserva, baixa e devolução alteram o estoque e criam registros de suporte na mesma operação atômica quando os limites permitirem.

### `movimentacoes_estoque/{idMovimentacao}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idMovimentacao` | string | sim | ID opaco ou determinístico para evento idempotente. |
| `idEstabelecimento` | string | sim | Escopo do estabelecimento. |
| `idProduto` | string | sim | Produto afetado. |
| `idPedido` | string ou null | não | Pedido relacionado. |
| `idReserva` | string ou null | não | Reserva relacionada. |
| `tipoMovimentacao` | string | sim | `entrada`, `reserva`, `liberacao_reserva`, `baixa`, `devolucao` ou `ajuste`. |
| `quantidade` | inteiro | sim | Quantidade positiva; o tipo define o efeito. |
| `estoqueFisicoAnterior` | inteiro | sim | Fotografia para reconciliação. |
| `estoqueFisicoPosterior` | inteiro | sim | Resultado confirmado. |
| `estoqueReservadoAnterior` | inteiro | sim | Fotografia para reconciliação. |
| `estoqueReservadoPosterior` | inteiro | sim | Resultado confirmado. |
| `motivoCodigo` | string | sim | Motivo padronizado. |
| `executadoPor` | string | sim | Usuário ou identificador do sistema. |
| `chaveIdempotenciaHash` | string | não | Hash da chave em operações repetíveis. |
| `criadoEm` | timestamp | sim | Data do servidor; documento imutável. |

## Consultas previstas nesta parte

| Caso de uso | Filtros e ordenação previstos |
| --- | --- |
| Estabelecimentos próximos aprovados | `publicado`, `statusConta`, `geohash` e paginação. |
| Catálogo de um estabelecimento | `idEstabelecimento`, `ativo`, `categoria` e ordenação estável. |
| Produtos em promoção | `idEstabelecimento`, `ativo`, `emPromocao` e paginação. |
| Produtos com estoque baixo | `idEstabelecimento` no documento de estoque e consulta paginada apoiada por projeção/alerta; não fazer comparação entre dois campos na consulta. |
| Vínculos de um usuário | `idUsuario`, `statusVinculo`. |
| Equipe de um estabelecimento | `idEstabelecimento`, `statusVinculo`, `nivelAcesso`. |
| Motoboys aprovados disponíveis | Consulta exclusiva do backend por aprovação, disponibilidade e região/geohash. |

Os índices compostos exatos serão fechados somente após detalhar pedidos e entregas, evitando criar índices não utilizados.

## Regras de integridade para as próximas partes

- Um cliente não escreve preço, estoque, comissão, saldo, status financeiro ou aprovação.
- Alterar produto não altera fotografia de pedido existente.
- Desativar usuário ou estabelecimento impede novas operações, mas preserva históricos obrigatórios.
- Um vínculo revogado perde acesso sem exigir alteração em todos os documentos do estabelecimento.
- Tokens FCM, documentos, códigos e credenciais nunca aparecem em documentos de catálogo.
- Toda referência entre documentos usa ID explícito e validação no backend; não há cascata automática no Firestore.
- Subcoleções precisam de estratégia explícita de exclusão, pois excluir o documento pai não as remove.

## Pendências da Etapa 2

- Detalhar promoções, cupons e reservas de estoque.
- Detalhar pedidos e histórico de status.
- Detalhar entregas, rastreamento e localização operacional.
- Detalhar pagamentos, assinaturas, comissões, carteiras e webhooks.
- Detalhar suporte, avaliações, denúncias e notificações.
- Detalhar LGPD, fiscal, antifraude, auditoria, métricas, custos e backups.
- Consolidar enums, matriz de retenção, TTL, índices e consultas.
- Revisar o modelo completo como entrada formal da Etapa 3.

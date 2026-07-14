# Modelo de dados do Cloud Firestore

## Estado da Etapa 2

Este documento conclui a Etapa 2 do MandaJá e será a entrada documental para as regras de segurança:

- [x] Fundamentos, catálogo de coleções, identidade, estabelecimentos e produtos.
- [x] Pedidos, estoque, pagamentos, entregas e financeiro.
- [x] Suporte, conformidade, operação, índices, retenção e validação final.

As três partes são exclusivamente documentais. Nenhuma coleção foi criada e nenhum recurso Firebase foi provisionado.

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
- `expiraEm` e `validaAte` controlam validade ou frescor de negócio; `excluirEm` é reservado exclusivamente ao descarte por TTL.

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
usuarios 1 ── N envios_arquivos_temporarios
usuarios N ── N estabelecimentos (por vinculos_estabelecimentos)

estabelecimentos 1 ── N produtos
estabelecimentos 1 ── N horarios_especiais
produtos 1 ── 1 estoques_produtos
produtos 1 ── N movimentacoes_estoque
pedidos 1 ── N reservas_estoque

clientes 1 ── N pedidos
estabelecimentos 1 ── N pedidos
pedidos 1 ── 1 pedidos_privados
pedidos 1 ── N pagamentos
pedidos 1 ── 0..1 entregas
entregas 1 ── 1 entregas_privadas
pedidos 1 ── N avaliacoes
pedidos 1 ── N comprovantes_pedidos
entregas 1 ── N ofertas_entregas
entregas 1 ── 0..1 rastreamento_entregas

usuarios 1 ── N notificacoes
usuarios 1 ── N chamados_suporte
usuarios 1 ── N denuncias
usuarios 1 ── N consentimentos_usuarios
usuarios 1 ── N estados_consentimentos_usuarios

documentos_legais N ── 1 controles_documentos_legais
estabelecimentos 1 ── 1 controles_taxas_entrega
alertas_antifraude 1 ── N decisoes
alertas_antifraude 1 ── N contestacoes

estabelecimentos 1 ── N assinaturas
assinaturas 1 ── N pagamentos_assinaturas
motoboys 1 ── 1 carteiras_motoboys
motoboys 1 ── N transacoes_motoboys
transacoes_motoboys 1 ── N movimentacoes_carteiras_motoboys
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
| `envios_arquivos_temporarios/{idEnvioArquivo}` | Autorizações de upload temporário e verificação antes da associação. | Suporte às Storage Rules e ao ciclo seguro de anexos. |
| `vinculos_estabelecimentos/{idVinculo}` | Relação entre usuário, estabelecimento e função. | Suporte ao multiestabelecimento. |
| `perfis_motoboys/{idMotoboy}` | Aprovação, disponibilidade e operação do motoboy. | Separação do perfil genérico. |
| `documentos_motoboys/{idDocumentoMotoboy}` | Metadados de documentos restritos no Storage. | Suporte necessário. |
| `estabelecimentos/{idEstabelecimento}` | Dados operacionais e de catálogo do estabelecimento. | Prompt, com dados fiscais separados. |
| `estabelecimentos_privados/{idEstabelecimento}` | Dados fiscais e administrativos privados. | Suporte necessário. |
| `estabelecimentos/{idEstabelecimento}/horarios_especiais/{idHorarioEspecial}` | Exceções de funcionamento com cardinalidade limitada por documento. | Suporte ao módulo de horários especiais. |
| `produtos/{idProduto}` | Catálogo, preço atual e projeção de disponibilidade. | Prompt, com estoque separado. |
| `estoques_produtos/{idProduto}` | Fonte de verdade da quantidade física e reservada. | Separação necessária para concorrência. |
| `movimentacoes_estoque/{idMovimentacao}` | Razão imutável de entradas, baixas, reservas e ajustes. | Suporte ao controle e auditoria. |
| `promocoes/{idPromocao}` | Regras promocionais por período. | Prompt. |
| `cupons/{idCupom}` | Definição e limites de cupom. | Prompt. |
| `cotas_cupons_clientes/{idCotaCupom}` | Contadores de uso por cupom e cliente. | Suporte à concorrência. |
| `primeiras_compras_clientes/{idMarcador}` | Confirma primeira compra por plataforma ou estabelecimento. | Suporte à concorrência. |
| `usos_cupons/{idUsoCupom}` | Reserva e consumo atômico por pedido/cliente. | Suporte à concorrência. |
| `reservas_estoque/{idReserva}` | Reserva temporária por produto e pedido. | Suporte ao fluxo do prompt. |
| `pedidos/{idPedido}` | Fotografia comercial e estado do pedido. | Prompt. |
| `pedidos_privados/{idPedido}` | Fotografias financeiras, técnicas e restritas do pedido. | Suporte à separação por audiência. |
| `pedidos/{idPedido}/historico_status/{idHistoricoStatus}` | Transições imutáveis do pedido. | Prompt. |
| `entregas/{idEntrega}` | Estado logístico da entrega. | Prompt. |
| `entregas_privadas/{idEntrega}` | Endereços exatos, atribuição e ganho logístico restritos. | Suporte à separação por audiência. |
| `ofertas_entregas/{idOferta}` | Oferta mínima e temporária para um motoboy elegível. | Suporte ao aceite seguro. |
| `codigos_entrega/{idEntrega}` | Segredo temporário e tentativas de confirmação. | Separação segura do pedido. |
| `entregas/{idEntrega}/eventos/{idEvento}` | Linha do tempo imutável da entrega. | Prompt. |
| `rastreamento_entregas/{idEntrega}` | Posição compartilhada da entrega ativa. | Prompt. |
| `localizacoes_motoboys/{idMotoboy}` | Posição operacional privada para distribuição. | Prompt. |
| `pagamentos/{idPagamento}` | Tentativas e resultados de pagamento de pedido. | Prompt. |
| `eventos_webhooks/{idEventoWebhook}` | Deduplicação e reconciliação de eventos externos. | Suporte necessário. |
| `assinaturas/{idAssinatura}` | Plano e ciclo vigente do estabelecimento. | Prompt. |
| `pagamentos_assinaturas/{idPagamentoAssinatura}` | Cobranças das assinaturas. | Prompt. |
| `configuracoes_cobranca_estabelecimento/{idEstabelecimento}` | Modo de cobrança e comissão. | Prompt. |
| `carteiras_motoboys/{idMotoboy}` | Saldos derivados do motoboy. | Prompt. |
| `transacoes_motoboys/{idTransacao}` | Obrigação econômica e ciclo do ganho, débito ou repasse. | Prompt, com ciclo explicitado. |
| `movimentacoes_carteiras_motoboys/{idMovimentacaoCarteira}` | Lançamentos imutáveis que explicam cada saldo da carteira. | Suporte à reconciliação determinística. |
| `avaliacoes/{idAvaliacao}` | Avaliações vinculadas a pedidos concluídos. | Prompt. |
| `denuncias/{idDenuncia}` | Denúncias e tratamento restrito. | Prompt. |
| `denuncias/{idDenuncia}/interacoes/{idInteracao}` | Complementos e decisões imutáveis da denúncia. | Suporte necessário. |
| `chamados_suporte/{idChamado}` | Estado e classificação do atendimento. | Prompt. |
| `chamados_suporte/{idChamado}/mensagens/{idMensagem}` | Conversa e anexos do chamado. | Suporte necessário. |
| `notificacoes/{idNotificacao}` | Caixa de notificações e estado de leitura. | Prompt. |
| `logs_auditoria/{idLog}` | Ações sensíveis append-only. | Prompt. |
| `documentos_legais/{idDocumento}` | Termos e políticas versionados. | Prompt. |
| `controles_documentos_legais/{idControleDocumento}` | Ponteiro transacional da versão legal vigente. | Suporte à concorrência. |
| `consentimentos_usuarios/{idConsentimento}` | Evidência de aceite ou revogação. | Prompt. |
| `estados_consentimentos_usuarios/{idEstadoConsentimento}` | Projeção sequencial do consentimento atual. | Suporte à concorrência. |
| `solicitacoes_lgpd/{idSolicitacao}` | Exportação, correção, desativação e exclusão. | Suporte ao módulo LGPD. |
| `solicitacoes_lgpd/{idSolicitacao}/interacoes/{idInteracao}` | Complementos e decisões do atendimento LGPD. | Suporte necessário. |
| `regioes_atendidas/{idRegiao}` | Áreas geográficas e estado de atendimento. | Prompt. |
| `configuracoes_taxa_entrega/{idConfiguracaoTaxa}` | Regras versionadas de cálculo de entrega. | Prompt. |
| `controles_taxas_entrega/{idEstabelecimento}` | Ponteiro e trava da taxa vigente/agendada. | Suporte à concorrência. |
| `convites_funcionarios/{idConvite}` | Convites com expiração e uso único. | Prompt. |
| `comprovantes_pedidos/{idComprovante}` | Metadados de comprovantes no Storage. | Prompt. |
| `documentos_fiscais/{idDocumentoFiscal}` | Referências fiscais futuras e restritas. | Suporte ao módulo fiscal. |
| `alertas_antifraude/{idAlerta}` | Sinais, risco e revisão humana. | Prompt. |
| `alertas_antifraude/{idAlerta}/decisoes/{idDecisao}` | Decisões imutáveis da revisão humana. | Suporte à revisão humana. |
| `alertas_antifraude/{idAlerta}/contestacoes/{idContestacao}` | Declarações e anexos que iniciam cada ciclo de contestação. | Suporte ao direito de contestação. |
| `metricas_uso/{idMetrica}` | Agregações técnicas por período. | Prompt. |
| `custos_plataforma/{idCusto}` | Estimativas e valores conciliados de custo. | Prompt. |
| `backups_registros/{idBackup}` | Evidência de exportações e restaurações. | Prompt. |
| `configuracoes_plataforma/geral` | Flags globais privadas, incluindo manutenção. | Materializa o caminho `configuracoes_plataforma/{idConfiguracao}` do prompt. |
| `configuracoes_plataforma/estado_publico` | Projeção mínima e segura do estado global. | Suporte necessário para não expor a configuração privada. |
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

Como o documento contém `documentoProtegido`, a leitura do titular é sanitizada por Function; o SDK cliente não obtém o registro bruto.

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
| `versaoAplicativo` | string | não | Versão do aplicativo. |
| `idioma` | string | sim | Inicialmente `pt_BR`. |
| `ativo` | booleano | sim | Falso após logout, invalidação ou exclusão. |
| `ultimoUsoEm` | timestamp | sim | Apoio à expiração. |
| `excluirEm` | timestamp ou null | não | Descarte posterior por política de retenção; não define se o token ainda é válido. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

O aplicativo registra, renova ou inativa o token por Function autenticada. O SDK cliente não lê esta coleção; a interface não precisa receber `tokenFcmProtegido`.

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
| `aprovadoEm` | timestamp ou null | não | Data da aprovação. |
| `motivoRejeicaoCodigo` | string ou null | não | Código interno revisável. |
| `avaliacaoMedia` | decimal | sim | Agregado derivado. |
| `totalAvaliacoes` | inteiro | sim | Agregado derivado. |
| `somaNotasAvaliacoes` | inteiro | sim | Soma inteira usada para reconciliação da média. |
| `entregaAtualId` | string ou null | não | Cache operacional, alterado apenas pelo backend. |
| `ultimaAtividadeEm` | timestamp ou null | não | Apoio à disponibilidade. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

O ator da aprovação fica na auditoria; o perfil legível ao motoboy não expõe UID operacional.

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

Motoboy recebe por Function somente tipo, validade, estado e motivo comunicável dos próprios documentos. Caminho privado, identidade do analista e metadados técnicos não são lidos diretamente.

## Estabelecimentos

### `estabelecimentos/{idEstabelecimento}`

Contém somente dados que podem ser consultados no catálogo ou por equipes autorizadas. Informações fiscais ficam em documento privado.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idEstabelecimento` | string | sim | ID opaco. |
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
| `taxaEntregaPadraoCentavos` | inteiro | sim | Projeção pública da taxa fixa vigente; nunca é fonte autoritativa do checkout. |
| `tempoMedioPreparoMinutos` | inteiro | sim | Estimativa operacional. |
| `avaliacaoMedia` | decimal | sim | Agregado derivado. |
| `totalAvaliacoes` | inteiro | sim | Agregado derivado. |
| `somaNotasAvaliacoes` | inteiro | sim | Soma inteira usada para reconciliação da média. |
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
| `idDonoPrincipal` | string | sim | Responsável principal; demais relações ficam em vínculos. |
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

O dono e a equipe fiscal recebem visão sanitizada por Function. Documento protegido, decisões internas e identidade do analista não são expostos pelo SDK cliente.

### `estabelecimentos/{idEstabelecimento}/horarios_especiais/{idHorarioEspecial}`

Cada documento representa uma exceção limitada à grade semanal. Isso evita arrays crescentes no estabelecimento e permite consultar somente o intervalo necessário.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idHorarioEspecial` | string | sim | ID opaco da exceção. |
| `idEstabelecimento` | string | sim | Mesmo ID do documento pai. |
| `tipoHorario` | string | sim | `feriado`, `fechamento_temporario`, `pausa_programada`, `recesso` ou `horario_estendido`. |
| `tituloPublico` | string | sim | Motivo seguro para exibição. |
| `inicioEm` | timestamp | sim | Início inclusivo. |
| `fimEm` | timestamp | sim | Fim exclusivo e posterior ao início. |
| `fechado` | booleano | sim | Indica indisponibilidade durante todo o intervalo. |
| `janelasAtendimento` | lista de mapas limitados | não | Faixas locais quando houver atendimento parcial. |
| `fusoHorario` | string | sim | Fuso IANA usado na interpretação, inicialmente `America/Sao_Paulo`. |
| `statusHorario` | string | sim | `agendado`, `ativo`, `encerrado` ou `cancelado`. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

Sobreposições são validadas pelo backend. Fechamentos têm precedência sobre janelas de abertura; o resultado aplicado ao pedido é fotografado para não mudar historicamente. O ator da alteração fica na auditoria para que exceções ativas possam ser lidas sem expor UID da equipe.

## Produtos

### `produtos/{idProduto}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idProduto` | string | sim | ID opaco. |
| `idEstabelecimento` | string | sim | Proprietário e partição lógica. |
| `nome` | string | sim | Nome público. |
| `nomeNormalizado` | string | sim | Valor derivado para ordenação e busca inicial sem acentos. |
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
| `idPromocaoVigente` | string ou null | não | Projeção derivada para catálogo. |
| `avaliacaoMedia` | decimal | sim | Agregado derivado. |
| `totalAvaliacoes` | inteiro | sim | Agregado derivado. |
| `somaNotasAvaliacoes` | inteiro | sim | Soma inteira usada para reconciliação da média. |
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
| `estoqueBaixo` | booleano | sim | Projeção autoritativa para consulta e alerta. |
| `versaoControle` | inteiro | sim | Incrementado em alterações autoritativas. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

Invariantes:

- `estoqueFisico >= 0`.
- `estoqueReservado >= 0`.
- Se `controlarEstoque` estiver ativo, `estoqueReservado <= estoqueFisico`.
- `estoqueDisponivel` não é persistido: resulta de `estoqueFisico - estoqueReservado`.
- `estoqueBaixo` é verdadeiro quando o estoque disponível calculado é menor ou igual a `limiteEstoqueBaixo` e é atualizado na mesma operação do estoque.
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

## Estruturas internas transacionais

Mapas embutidos são usados apenas como fotografias pequenas, fechadas e imutáveis. Eles não substituem as entidades atuais.

### Item do pedido

Cada elemento de `itens` possui:

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `idProduto` | string | Produto de origem. |
| `nomeProduto` | string | Nome no momento da compra. |
| `imagemPrincipalUrl` | string ou null | Referência visual vigente. |
| `quantidade` | inteiro | Maior que zero. |
| `precoUnitarioCentavos` | inteiro | Preço unitário antes do desconto. |
| `descontoUnitarioCentavos` | inteiro | Desconto aplicado por unidade. |
| `subtotalItemCentavos` | inteiro | Resultado autoritativo da linha. |
| `moeda` | string | `BRL`. |
| `categoria` | string | Categoria vigente. |
| `exigeReceita` | booleano | Regra regulatória fotografada. |
| `exigeAprovacaoManual` | booleano | Regra fotografada. |
| `observacaoCliente` | string ou null | Texto limitado e sanitizado. |

O array terá no máximo 100 itens e o documento inteiro continuará limitado internamente a 256 KiB. Se o produto tiver complementos futuros, cada escolha será fotografada com ID, nome e valor, dentro do mesmo orçamento.

### Endereço fotografado

`enderecoEntregaFotografia` e `enderecoRetiradaFotografia` pertencem a `entregas_privadas/{idEntrega}` e contêm somente os campos necessários à operação: destinatário, telefone permitido, logradouro, número, complemento, bairro, cidade, estado, CEP, ponto de referência, geopoint e geohash. O pedido mantém apenas `destinoResumo`. Alterações posteriores no cadastro não modificam essas fotografias.

### Regra financeira fotografada

O pedido registra IDs e versões das regras aplicadas, além dos resultados em centavos. O histórico não é recalculado quando promoção, cupom, comissão ou taxa de entrega muda.

### Metadado de anexo privado

Listas de anexos em suporte, denúncia e LGPD usam somente mapas com este contrato fechado:

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idAnexo` | string | sim | ID opaco. |
| `enviadoPor` | string | sim | Usuário autenticado. |
| `caminhoStorage` | string | sim | Caminho privado final, nunca URL pública. |
| `nomeArquivoExibicao` | string | sim | Nome sanitizado, sem controlar o caminho. |
| `tipoMimeValidado` | string | sim | Tipo real confirmado pelo backend. |
| `tamanhoBytes` | inteiro | sim | Tamanho validado. |
| `hashSha256` | string | sim | Integridade e deduplicação técnica. |
| `statusVerificacao` | string | sim | Sempre `aprovado`; estados anteriores pertencem à autorização temporária. |
| `criadoEm` | timestamp | sim | Data do servidor. |

O envio começa em `temporarios/{idUsuario}/{idEnvioArquivo}` e só é associado ao documento imutável depois de autorização, validação de tipo/tamanho, cálculo do hash e verificação de segurança. Os únicos padrões finais são `chamados_suporte/{idChamado}/mensagens/{idMensagem}/{idAnexo}`, `denuncias/{idDenuncia}/inicial/{idAnexo}`, `denuncias/{idDenuncia}/interacoes/{idInteracao}/{idAnexo}`, `solicitacoes_lgpd/{idSolicitacao}/interacoes/{idInteracao}/{idAnexo}` e `alertas_antifraude/{idAlerta}/contestacoes/{idContestacao}/{idAnexo}`. O cliente não escolhe caminho final, identidade do autor, visibilidade nem sequência. Objetos finais negam leitura e escrita direta pelo SDK; download ou transmissão passa por Function que revalida participante, visibilidade e finalidade.

### `envios_arquivos_temporarios/{idEnvioArquivo}`

Documento mutável de curta duração que autoriza um único upload antes da criação do metadado final. Ele não é evidência do conteúdo da mensagem e nunca é incorporado como anexo enquanto estiver pendente.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idEnvioArquivo` | string | sim | ID opaco emitido pelo backend. |
| `idUsuario` | string | sim | Titular autenticado da autorização. |
| `finalidadeArquivo` | string | sim | `anexo_chamado`, `anexo_denuncia`, `anexo_lgpd` ou `anexo_contestacao_antifraude`. |
| `tipoEntidadeDestino` | string | sim | `mensagem_suporte`, `denuncia`, `interacao_denuncia`, `interacao_lgpd` ou `contestacao_antifraude`. |
| `idEntidadePai` | string | sim | Chamado, denúncia, solicitação ou alerta já autorizado. |
| `idDocumentoDestino` | string | sim | ID reservado do documento que receberá o anexo. |
| `caminhoTemporario` | string | sim | Exatamente `temporarios/{idUsuario}/{idEnvioArquivo}`. |
| `statusEnvio` | string | sim | `autorizado`, `recebido`, `verificando`, `aprovado`, `rejeitado`, `expirado` ou `associado`. |
| `tiposMimePermitidos` | lista de strings | sim | Lista pequena fotografada na autorização. |
| `tamanhoMaximoBytes` | inteiro | sim | Limite fotografado e positivo. |
| `tipoMimeValidado` | string ou null | não | Tipo real apurado pelo processamento confiável. |
| `tamanhoBytesReal` | inteiro ou null | não | Tamanho real do objeto recebido. |
| `hashSha256` | string ou null | não | Integridade calculada pelo backend. |
| `idAnexoFinal` | string ou null | não | ID associado após aprovação. |
| `caminhoFinal` | string ou null | não | Caminho privado derivado pelo backend. |
| `motivoRejeicaoCodigo` | string ou null | não | Motivo sanitizado. |
| `versaoEstado` | inteiro | sim | Controle de concorrência. |
| `expiraEm` | timestamp | sim | Prazo curto de validade da autorização. |
| `excluirEm` | timestamp ou null | não | Limpeza posterior do registro terminal; não controla a validade. |
| `criadoEm` | timestamp | sim | Emissão pelo servidor. |
| `recebidoEm` | timestamp ou null | não | Objeto detectado. |
| `verificadoEm` | timestamp ou null | não | Fim da verificação. |
| `associadoEm` | timestamp ou null | não | Associação ao documento final. |
| `atualizadoEm` | timestamp | sim | Última transição. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |

A Function cria a autorização após validar participante, destino, finalidade, quantidade de anexos e App Check. O aplicativo pode enviar somente ao caminho temporário próprio, dentro do prazo e dos limites preliminares de MIME e tamanho; não escreve esse documento nem qualquer estado de verificação. Um processamento confiável valida os bytes reais, calcula o hash e decide `aprovado` ou `rejeitado`.

Somente após `aprovado`, uma Function move ou copia o objeto ao caminho final derivado, cria o documento de mensagem, interação, denúncia ou contestação com metadado `statusVerificacao = aprovado` e marca o envio como `associado`, de forma idempotente. Rejeitados, expirados e órfãos são removidos de modo coordenado. Na fase gratuita, Storage e a verificação são simulados localmente no Emulator; nenhum bucket real é provisionado.

## Promoções e cupons

### `promocoes/{idPromocao}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idPromocao` | string | sim | ID opaco. |
| `escopo` | string | sim | `plataforma` ou `estabelecimento`. |
| `idEstabelecimento` | string ou null | condicional | Obrigatório no escopo do estabelecimento. |
| `nome` | string | sim | Nome administrativo. |
| `descricao` | string | não | Texto limitado. |
| `tipoPromocao` | string | sim | `valor_fixo`, `porcentagem`, `preco_promocional` ou `frete_gratis`. |
| `valorDescontoCentavos` | inteiro ou null | condicional | Para valor fixo. |
| `percentualDescontoPontosBase` | inteiro ou null | condicional | Percentual em pontos-base; 10% = 1000. |
| `descontoMaximoCentavos` | inteiro ou null | não | Limite do desconto percentual. |
| `valorMinimoPedidoCentavos` | inteiro | sim | Mínimo para elegibilidade. |
| `tipoAlvo` | string | sim | `todos_produtos`, `categoria` ou `produtos`. |
| `categoriasAlvo` | lista de strings | não | Lista pequena quando aplicável. |
| `idsProdutosAlvo` | lista de strings | não | Até 100 produtos; acima disso exige documentos de elegibilidade. |
| `prioridade` | inteiro | sim | Ordem de avaliação. |
| `acumulavel` | booleano | sim | Se pode combinar com outro benefício. |
| `statusPromocao` | string | sim | `rascunho`, `agendada`, `ativa`, `pausada`, `encerrada` ou `cancelada`. |
| `validoDe` | timestamp | sim | Início da vigência. |
| `validoAte` | timestamp | sim | Fim exclusivo da vigência. |
| `versaoRegra` | inteiro | sim | Incrementada em mudança material. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

Promoções são avaliadas pelo backend. Estado `ativa` não basta: vigência, estabelecimento, produtos, valor mínimo, acumulação e estado do pedido também são validados. Identidade do criador fica na auditoria para que a versão ativa possa ser uma leitura de catálogo segura; rascunhos e estados internos são negados ao público. Cada item recebe no máximo uma promoção no MVP; vence a regra que gerar o menor preço, com prioridade e ID como desempate determinístico.

### `cupons/{idCupom}`

O ID será derivado por HMAC do escopo e do código normalizado. O cliente envia o código à Function e não consulta esta coleção diretamente.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idCupom` | string | sim | ID determinístico não reversível. |
| `codigoHmac` | string | sim | Busca e unicidade sem expor o código. |
| `versaoChaveCodigo` | inteiro | sim | Permite rotação da chave HMAC. |
| `codigoMascarado` | string | sim | Identificação segura em relatórios. |
| `escopo` | string | sim | `plataforma` ou `estabelecimento`. |
| `idEstabelecimento` | string ou null | condicional | Obrigatório quando não global. |
| `tipoCupom` | string | sim | `valor_fixo`, `porcentagem` ou `frete_gratis`. |
| `valorDescontoCentavos` | inteiro ou null | condicional | Valor fixo. |
| `percentualDescontoPontosBase` | inteiro ou null | condicional | Percentual em pontos-base. |
| `descontoMaximoCentavos` | inteiro ou null | não | Teto do benefício. |
| `valorMinimoPedidoCentavos` | inteiro | sim | Mínimo elegível. |
| `limiteUsoTotal` | inteiro ou null | não | Limite global. |
| `limiteUsoPorCliente` | inteiro | sim | Limite individual. |
| `quantidadeReservada` | inteiro | sim | Reservas ainda não consumidas. |
| `quantidadeConsumida` | inteiro | sim | Usos confirmados. |
| `primeiraCompraSomente` | booleano | sim | Regra explícita. |
| `acumulavel` | booleano | sim | Combinação permitida. |
| `statusCupom` | string | sim | `rascunho`, `agendado`, `ativo`, `pausado`, `encerrado` ou `cancelado`. |
| `validoDe` | timestamp | sim | Início. |
| `validoAte` | timestamp | sim | Fim exclusivo. |
| `versaoRegra` | inteiro | sim | Incrementada em mudança material. |
| `criadoPor` | string | sim | Ator autorizado. |
| `versaoEsquema` | inteiro | sim | Versão. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

Invariantes: os contadores são não negativos; quando houver limite total, `quantidadeReservada + quantidadeConsumida` não o ultrapassa; escopo, código e benefício tornam-se imutáveis após o primeiro consumo.

Rotação HMAC não muda nem duplica cupom. Ao validar código, a Function calcula para cada escopo aplicável os IDs candidatos com a chave atual e todas as versões ainda retidas, lê todos na mesma operação e aceita no máximo um documento coerente. Ao criar cupom, a transação verifica o conjunto completo antes de gravar o ID da chave atual; qualquer candidato existente representa conflito de unicidade. Uma versão de chave permanece disponível enquanto houver cupom aceitável ou referência obrigatória; desativá-la exige encerrar/migrar os cupons, reconciliar cotas/usos e preservar os IDs históricos. O cliente nunca consulta por ID nem conhece a versão da chave.

### `cotas_cupons_clientes/{idCotaCupom}`

O ID é determinístico por cupom e cliente. O documento impede duas primeiras compras ou usos simultâneos de ultrapassarem o limite individual.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idCotaCupom` | string | sim | ID determinístico. |
| `idCupom` | string | sim | Cupom. |
| `idCliente` | string | sim | Cliente. |
| `idEstabelecimento` | string ou null | não | Escopo quando aplicável. |
| `quantidadeReservada` | inteiro | sim | Usos temporariamente reservados. |
| `quantidadeConsumida` | inteiro | sim | Usos confirmados. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

### `primeiras_compras_clientes/{idMarcador}`

O ID é determinístico por cliente e escopo (`plataforma` ou estabelecimento), impedindo dois pedidos concorrentes de consumirem benefícios de primeira compra diferentes.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idMarcador` | string | sim | ID determinístico. |
| `idCliente` | string | sim | Cliente. |
| `escopo` | string | sim | `plataforma` ou `estabelecimento`. |
| `idEstabelecimento` | string ou null | condicional | Escopo específico. |
| `idPedidoPrimeiraCompra` | string | sim | Pedido que confirmou a condição. |
| `confirmadoEm` | timestamp | sim | Data do servidor. |

### `usos_cupons/{idUsoCupom}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idUsoCupom` | string | sim | ID determinístico por cupom, usuário e pedido. |
| `idCupom` | string | sim | Cupom aplicado. |
| `idCliente` | string | sim | Cliente. |
| `idPedido` | string | sim | Pedido. |
| `idEstabelecimento` | string | sim | Escopo do pedido. |
| `statusUso` | string | sim | `reservado`, `consumido`, `liberado`, `expirado` ou `estornado`. |
| `subtotalElegivelCentavos` | inteiro | sim | Base fotografada. |
| `taxaEntregaElegivelCentavos` | inteiro | sim | Base de frete. |
| `descontoItensCentavos` | inteiro | sim | Benefício em itens. |
| `descontoEntregaCentavos` | inteiro | sim | Benefício no frete. |
| `descontoTotalCentavos` | inteiro | sim | Soma aplicada. |
| `regraCupomFotografia` | mapa fechado | sim | Regra sem o código original. |
| `expiraEm` | timestamp | não | Expiração da reserva. |
| `excluirEm` | timestamp ou null | não | Descarte posterior ao estado terminal. |
| `consumidoEm` | timestamp ou null | não | Confirmação. |
| `liberadoEm` | timestamp ou null | não | Liberação. |
| `expiradoEm` | timestamp ou null | não | Expiração processada. |
| `estornadoEm` | timestamp ou null | não | Estorno autorizado. |
| `chaveIdempotenciaHash` | string | sim | Deduplicação. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

Reserva, cota do cliente e contadores do cupom são alterados atomicamente. Cancelamento anterior ao consumo libera a cota; após consumo, devolução depende de política explícita. Limpeza por TTL, quando adotada, será apenas complementar; a elegibilidade sempre compara `expiraEm`.

## Reservas de estoque

### `reservas_estoque/{idReserva}`

O ID é determinístico por pedido e produto. Uma repetição de `criarPedido` não cria uma segunda reserva.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idReserva` | string | sim | ID determinístico. |
| `idPedido` | string | sim | Pedido relacionado. |
| `idEstabelecimento` | string | sim | Escopo. |
| `idProduto` | string | sim | Produto reservado. |
| `quantidade` | inteiro | sim | Maior que zero. |
| `statusReserva` | string | sim | `ativa`, `consumida`, `liberada` ou `expirada`. |
| `expiraEm` | timestamp | sim | Prazo operacional. |
| `excluirEm` | timestamp ou null | não | Descarte posterior ao estado terminal. |
| `consumidaEm` | timestamp ou null | não | Baixa definitiva. |
| `liberadaEm` | timestamp ou null | não | Devolução da reserva. |
| `motivoFinalizacaoCodigo` | string ou null | não | Pagamento, cancelamento ou expiração. |
| `chaveIdempotenciaHash` | string | sim | Deduplicação da operação. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

Invariantes:

- Uma reserva ativa incrementa `estoqueReservado` exatamente uma vez.
- Consumir reduz `estoqueFisico` e `estoqueReservado` exatamente uma vez.
- Liberar ou expirar reduz apenas `estoqueReservado` exatamente uma vez.
- Reserva finalizada não volta a ativa.
- O backend verifica o prazo mesmo que a exclusão automática ainda não tenha ocorrido.

## Pedidos

### `pedidos/{idPedido}`

O pedido compartilhado é a fonte de verdade do fluxo comercial e contém somente dados necessários ao cliente e à operação do estabelecimento. Pagamento e entrega possuem fontes próprias; os estados correspondentes no pedido são projeções atualizadas somente pelo backend. Fotografias financeiras e técnicas ficam em `pedidos_privados/{idPedido}`. Para entrega, os documentos compartilhado e privado usam `idEntrega = idPedido`; retirada local não cria entrega.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idPedido` | string | sim | ID opaco. |
| `idCliente` | string | sim | Cliente proprietário. |
| `idEstabelecimento` | string | sim | Partição lógica. |
| `idRegiaoAtendida` | string ou null | não | Região validada para entrega. |
| `numeroExibicao` | string | sim | Código amigável, não usado em autorização. |
| `origemPedido` | string | sim | Inicialmente `app_cliente`. |
| `tipoAtendimento` | string | sim | `entrega_imediata`, `entrega_agendada` ou `retirada_local`. |
| `itens` | lista de mapas | sim | Fotografias conforme contrato acima. |
| `quantidadeItens` | inteiro | sim | Soma das quantidades. |
| `quantidadeProdutos` | inteiro | sim | Número de linhas distintas. |
| `estabelecimentoFotografia` | mapa fechado | sim | Nome, contato permitido e endereço de retirada. |
| `destinoResumo` | mapa ou null | condicional | Somente bairro e cidade; endereço exato fica na entrega. |
| `agendadoPara` | timestamp ou null | condicional | Obrigatório para entrega agendada. |
| `fusoHorarioAgendamento` | string ou null | condicional | `America/Sao_Paulo` no MVP. |
| `observacaoCliente` | string ou null | não | Texto limitado. |
| `subtotalProdutosCentavos` | inteiro | sim | Soma antes dos descontos. |
| `descontoProdutosCentavos` | inteiro | sim | Promoções de produto. |
| `descontoCupomItensCentavos` | inteiro | sim | Cupom aplicado aos itens. |
| `taxaEntregaOriginalCentavos` | inteiro | sim | Taxa antes do cupom. |
| `descontoCupomEntregaCentavos` | inteiro | sim | Benefício aplicado ao frete. |
| `taxaEntregaCentavos` | inteiro | sim | Taxa final após benefício. |
| `descontoTotalCentavos` | inteiro | sim | Promoções e cupom. |
| `taxaCancelamentoCentavos` | inteiro | sim | Zero até aplicação válida. |
| `valorTotalCentavos` | inteiro | sim | Total autoritativo. |
| `moeda` | string | sim | `BRL`. |
| `idCupom` | string ou null | não | Cupom fotografado. |
| `statusPedido` | string | sim | Estado comercial canônico. |
| `fasePedido` | string | sim | `criacao`, `pagamento`, `preparo`, `retirada`, `entrega`, `concluido` ou `encerrado`. |
| `statusPagamentoAtual` | string | sim | Projeção da tentativa vigente. |
| `statusEntregaAtual` | string | sim | Projeção logística ou `nao_aplicavel`. |
| `idPagamentoAtual` | string ou null | não | Tentativa vigente. |
| `idEntrega` | string ou null | não | Ausente em retirada local. |
| `idMotoboyResponsavel` | string ou null | não | Projeção após aceite. |
| `avaliadoEm` | timestamp ou null | não | Avaliação não altera o estado operacional. |
| `motivoCancelamentoCodigo` | string ou null | não | Motivo padronizado. |
| `statusReembolsoAtual` | string | sim | Projeção financeira. |
| `metodoPagamentoSelecionado` | string | sim | Fotografia da escolha. |
| `versaoEstado` | inteiro | sim | Incrementada em cada transição. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |
| `aceitoEm` | timestamp ou null | não | Aceite do estabelecimento. |
| `preparoIniciadoEm` | timestamp ou null | não | Início do preparo. |
| `preparadoEm` | timestamp ou null | não | Preparo concluído. |
| `retiradoEm` | timestamp ou null | não | Retirada por cliente ou motoboy. |
| `entregueEm` | timestamp ou null | não | Entrega concluída. |
| `canceladoEm` | timestamp ou null | não | Cancelamento. |
| `expiraEm` | timestamp ou null | não | Expiração de pedido ainda não confirmado. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |

Invariantes:

- Todos os produtos pertencem ao mesmo estabelecimento e linhas repetidas são consolidadas.
- Quantidades e valores são inteiros não negativos.
- `subtotalProdutosCentavos` é calculado a partir das fotografias dos itens.
- A ordem é preço-base, promoção do item, cupom sobre itens ou frete e total final.
- `taxaEntregaCentavos = taxaEntregaOriginalCentavos - descontoCupomEntregaCentavos`.
- `descontoTotalCentavos = descontoProdutosCentavos + descontoCupomItensCentavos + descontoCupomEntregaCentavos`.
- `valorTotalCentavos = subtotalProdutosCentavos - descontoProdutosCentavos - descontoCupomItensCentavos + taxaEntregaCentavos`.
- Valores efetivos e taxa real do gateway são conciliados em `pagamentos`; `pedidos_privados` preserva a previsão aplicada no checkout.
- Retirada local tem taxa de entrega zero, `statusEntregaAtual = nao_aplicavel` e não cria entrega.
- Entrega agendada exige horário futuro, janela válida e estabelecimento habilitado.
- Itens, preços, descontos e fotografias financeiras dos dois documentos ficam imutáveis após criação; correção comercial exige cancelamento e novo pedido.
- Pedido compartilhado, pedido privado, reservas, uso do cupom, entrega inicial e primeiro histórico são criados atomicamente quando couberem no limite da operação.
- Endereço residencial exato, código de entrega e corpo de pagamento não ficam no pedido.

### `pedidos_privados/{idPedido}`

Documento de mesmo ID, negado integralmente ao SDK cliente. Functions retornam visões mínimas conforme cliente, estabelecimento, financeiro ou N1; nenhum desses públicos lê a fotografia bruta inteira.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idPedido` | string | sim | Mesmo ID do pedido compartilhado. |
| `idCliente` | string | sim | Titular para validação no backend. |
| `idEstabelecimento` | string | sim | Escopo. |
| `idUsoCupom` | string ou null | não | Uso determinístico associado. |
| `regraDescontoFotografia` | mapa ou null | não | IDs, versões e resultados. |
| `regraTaxaEntregaFotografia` | mapa ou null | não | Regiões, regra e parâmetros usados. |
| `regraComissaoFotografia` | mapa fechado | sim | Modo, percentuais e taxas vigentes. |
| `regraCancelamentoFotografia` | mapa ou null | não | Regra versionada aplicada somente no cancelamento. |
| `rateioCancelamentoFotografia` | mapa ou null | não | Destinos e valores da taxa efetivamente retida. |
| `valorComissaoPlataformaCentavos` | inteiro | sim | Previsão no checkout. |
| `valorEstabelecimentoPrevistoCentavos` | inteiro | sim | Previsão no checkout. |
| `valorMotoboyPrevistoCentavos` | inteiro | sim | Previsão anterior à atribuição. |
| `taxaGatewayPrevistaCentavos` | inteiro | sim | Estimativa no checkout. |
| `valorLiquidoPrevistoCentavos` | inteiro | sim | Resultado previsto pelo contrato financeiro. |
| `valorReembolsoDevidoCentavos` | inteiro | sim | Projeção posterior ao cancelamento, inicialmente zero. |
| `idOperacaoCancelamento` | string ou null | não | Operação idempotente que aplicou taxa e reembolso. |
| `canceladoPor` | string ou null | não | Ator autorizado, visível apenas em auditoria administrativa. |
| `detalheCancelamento` | string ou null | não | Texto restrito e limitado. |
| `chaveIdempotenciaHash` | string | sim | Hash da chave de criação. |
| `resumoRequisicaoHash` | string | sim | Detecta reutilização da chave com corpo diferente. |
| `criadoEm` | timestamp | sim | Mesma operação do pedido. |
| `atualizadoEm` | timestamp | sim | Última projeção financeira autorizada. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |

Os valores do checkout e as regras fotografadas são imutáveis. Somente campos do ciclo de cancelamento podem nascer depois, sempre por Function idempotente e auditada.

Contrato da taxa de cancelamento no MVP:

- Na criação, `pedidos.taxaCancelamentoCentavos = 0`, `valorReembolsoDevidoCentavos = 0` e `valorTotalCentavos` representa apenas a compra original.
- Uma taxa só pode ser retida de pagamento já confirmado, conforme regra versionada, fase do pedido e hipótese jurídica aprovada; pedido não pago mantém taxa zero.
- Calcular `saldoPagoRestanteCentavos = max(0, valorPagoCentavos - valorReembolsadoCentavos)`. A taxa não ultrapassa esse saldo e `valorReembolsoDevidoCentavos = saldoPagoRestanteCentavos - taxaCancelamentoCentavos`. A taxa não é somada retroativamente a `valorTotalCentavos`.
- A mesma operação registra regra e rateio privados, atualiza a projeção segura no pedido, inicia o reembolso em `pagamentos` e cria eventual crédito `taxa_cancelamento` ao motoboy. Plataforma e estabelecimento são conciliados por lançamentos próprios; nenhum valor é inferido no cliente.
- Repetição usa `idOperacaoCancelamento`; mudança de regra ou valor com a mesma chave gera conflito. Depois da aplicação, correção ocorre por compensação financeira, não sobrescrita.

### Estados comerciais do pedido

Toda mudança compara `versaoEstado`, ocorre por Function e cria `historico_status` na mesma transação. Nenhum cliente escreve `statusPedido` diretamente.

| Estado atual | Próximos estados permitidos | Autoridade e pré-condições principais |
| --- | --- | --- |
| `criado` | `aguardando_pagamento`, `aguardando_preparo`, `cancelado`, `expirado` | Function de criação escolhe pagamento online ou offline; cancelamento/expiração libera reserva e cupom. |
| `aguardando_pagamento` | `aguardando_preparo`, `cancelado`, `expirado` | Somente confirmação autoritativa de pagamento avança; expiração compara `expiraEm`. |
| `aguardando_preparo` | `em_preparo`, `cancelado` | Estabelecimento autorizado aceita por Function; pagamento deve estar confirmado ou ser modalidade offline permitida. |
| `em_preparo` | `pronto_para_retirada`, `pronto_para_entrega`, `cancelado` | Destino depende de `tipoAtendimento`; cancelamento exige regra financeira, estoque e auditoria. |
| `pronto_para_retirada` | `retirado_cliente`, `cancelado` | Confirmação de retirada autenticada; cancelamento tardio segue política fotografada. |
| `pronto_para_entrega` | `aguardando_motoboy`, `motoboy_definido`, `cancelado` | Documento de entrega precisa estar coerente; atribuição direta só por backend autorizado. |
| `aguardando_motoboy` | `motoboy_definido`, `cancelado` | Aceite transacional de oferta ou atribuição própria válida. |
| `motoboy_definido` | `aguardando_motoboy`, `saiu_para_entrega`, `cancelado` | Retorno só se a atribuição cair antes da coleta; saída exige entrega `coletada`. |
| `saiu_para_entrega` | `aguardando_codigo_entrega`, `cancelado` | Entrega chega ao destino; cancelamento após coleta é exceção N1/suporte, compensada e auditada. |
| `aguardando_codigo_entrega` | `entregue`, `cancelado` | Código válido conclui; cancelamento é exceção manual com prova, compensação e auditoria. |
| `retirado_cliente`, `entregue`, `cancelado`, `expirado` | nenhum | Estados terminais; correções usam eventos financeiros ou novo pedido, nunca regressão. |

Mapeamento obrigatório de `fasePedido`: `criado -> criacao`; `aguardando_pagamento -> pagamento`; `aguardando_preparo | em_preparo -> preparo`; `pronto_para_retirada -> retirada`; estados logísticos de `pronto_para_entrega` até `aguardando_codigo_entrega -> entrega`; `retirado_cliente | entregue -> concluido`; `cancelado | expirado -> encerrado`.

Campos condicionais são gravados na transição correspondente: `aceitoEm` ao entrar em `em_preparo`, `preparoIniciadoEm` no mesmo avanço, `preparadoEm` ao ficar pronto, `retiradoEm` na retirada/coleta projetada, `entregueEm` na conclusão e `canceladoEm` com motivo no cancelamento. `expiraEm` só existe enquanto a confirmação inicial puder expirar e é removido ao avançar. `pagamento_confirmado` pode ser evento histórico, não estado comercial; reembolso altera `statusReembolsoAtual`, não reabre pedido.

Sincronização de fontes: pagamento `pago` leva pedido de `aguardando_pagamento` a `aguardando_preparo`; cada mudança da entrega atualiza `statusEntregaAtual`; entrega `motoboy_definido | a_caminho_retirada | aguardando_coleta` projeta pedido `motoboy_definido`, `coletada | a_caminho_entrega` projeta `saiu_para_entrega`, `aguardando_codigo` projeta `aguardando_codigo_entrega` e `entregue` projeta `entregue`. Essas mudanças, versões e eventos são atômicos ou coordenados por outbox idempotente antes de nova transição.

### `pedidos/{idPedido}/historico_status/{idHistoricoStatus}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idHistoricoStatus` | string | sim | ID determinístico da operação e nova versão de estado. |
| `idPedido` | string | sim | Redundância para exportação. |
| `idEstabelecimento` | string | sim | Escopo. |
| `statusAnterior` | string ou null | sim | Nulo apenas na criação. |
| `statusNovo` | string | sim | Estado confirmado. |
| `faseAnterior` | string ou null | não | Fase anterior. |
| `faseNova` | string | sim | Nova fase. |
| `versaoEstadoAnterior` | inteiro | sim | Controle otimista. |
| `versaoEstadoNova` | inteiro | sim | Nova versão. |
| `sequencia` | inteiro | sim | Ordenação estável. |
| `origem` | string | sim | `usuario`, `sistema`, `pagamento` ou `entrega`. |
| `motivoCodigo` | string | não | Motivo padronizado. |
| `descricaoPublica` | string ou null | não | Texto seguro para participantes. |
| `visivelAoCliente` | booleano | sim | Controla projeção pública segura. |
| `criadoEm` | timestamp | sim | Data do servidor; evento imutável. |
| `versaoEsquema` | inteiro | sim | Versão do evento. |

O histórico contém somente a transição e sua explicação segura. UID do ator, nível de acesso, correlação e chave de idempotência ficam em `logs_auditoria` e `idempotencias`, nunca no documento lido por participantes. O ID do histórico é derivado pela operação autoritativa para impedir repetição.

## Pagamentos de pedidos

### `pagamentos/{idPagamento}`

Cada tentativa de pagamento é um documento. Nenhum dado de cartão, código de segurança ou credencial do provedor é armazenado.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idPagamento` | string | sim | ID interno. |
| `idPedido` | string | sim | Pedido. |
| `idCliente` | string | sim | Pagador. |
| `idEstabelecimento` | string | sim | Escopo. |
| `numeroTentativa` | inteiro | sim | Sequência por pedido. |
| `metodoPagamento` | string | sim | `pix`, `cartao_credito`, `cartao_debito`, `dinheiro_entrega` ou `pagamento_estabelecimento`. |
| `provedorPagamento` | string | sim | `simulado` na fase gratuita ou provedor aprovado. |
| `idPagamentoProvedor` | string ou null | não | Referência externa. |
| `valorEsperadoCentavos` | inteiro | sim | Valor autoritativo do pedido. |
| `valorPagoCentavos` | inteiro | sim | Zero até confirmação. |
| `valorReembolsadoCentavos` | inteiro | sim | Nunca maior que o valor pago. |
| `taxaGatewayCentavos` | inteiro | sim | Taxa informada ou conciliada. |
| `moeda` | string | sim | `BRL`. |
| `statusPagamento` | string | sim | Estado canônico da tentativa. |
| `statusReembolso` | string | sim | Estado independente do reembolso. |
| `statusContestacao` | string | sim | Estado de disputa/chargeback. |
| `statusConciliacao` | string | sim | Conferência com o provedor. |
| `quantidadeTentativasConciliacao` | inteiro | sim | Contador não negativo. |
| `maximoTentativasConciliacao` | inteiro | sim | Limite fotografado. |
| `modoConfirmacao` | string | sim | `webhook_provedor`, `confirmacao_caixa` ou `confirmacao_motoboy`. |
| `motivoFalhaCodigo` | string ou null | não | Código sanitizado. |
| `divergenciaCodigo` | string ou null | não | Divergência de conciliação. |
| `ultimoErroConciliacaoCodigo` | string ou null | não | Erro temporário sanitizado. |
| `expiraEm` | timestamp ou null | não | Pix ou tentativa temporária. |
| `chaveIdempotenciaHash` | string | sim | Deduplicação da criação. |
| `hashSolicitacao` | string | sim | Detecta a mesma chave com parâmetros diferentes. |
| `idCorrelacao` | string | sim | Liga pedido, webhook e auditoria. |
| `idEventoProvedorAtual` | string ou null | não | Último evento aplicado. |
| `versaoEstado` | inteiro | sim | Controle de transições concorrentes. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |
| `processadoEm` | timestamp ou null | não | Início/resultado do processamento. |
| `pagoEm` | timestamp ou null | não | Confirmação do provedor ou forma offline autorizada. |
| `canceladoEm` | timestamp ou null | não | Cancelamento. |
| `reembolsoSolicitadoEm` | timestamp ou null | não | Primeira solicitação de reembolso. |
| `reembolsoAtualizadoEm` | timestamp ou null | não | Última transição de reembolso. |
| `reembolsadoEm` | timestamp ou null | não | Reembolso total concluído. |
| `contestacaoAbertaEm` | timestamp ou null | não | Abertura da disputa. |
| `contestacaoResolvidaEm` | timestamp ou null | não | Resolução da disputa. |
| `ultimaTentativaConciliacaoEm` | timestamp ou null | não | Execução mais recente. |
| `conciliadoEm` | timestamp ou null | não | Última conciliação válida. |
| `proximaConciliacaoEm` | timestamp ou null | condicional | Obrigatória em conciliação `pendente` ou `erro_temporario`. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |

Máquina do pagamento:

| Estado atual | Próximos estados permitidos | Condições |
| --- | --- | --- |
| `pendente` | `processando`, `falhou`, `cancelado` | Processamento assume idempotência; falha exige motivo; cancelamento confirma ausência de sucesso externo. |
| `processando` | `pago`, `falhou`, `cancelado` | `pago` exige confirmação válida e valor; resposta incerta vira reconciliação, nunca sucesso presumido. |
| `pago` | `reembolsado`, `contestado` | Reembolso integral ou abertura de disputa; parcial preserva `pago`. |
| `contestado` | `pago`, `reembolsado` | Resolução desfavorável ao pagador retorna a `pago`; favorável ao pagador liquida como `reembolsado`. |
| `falhou`, `cancelado`, `reembolsado` | nenhum | Tentativas falhas/canceladas não reabrem; novo pagamento cria outro documento. |

Máquina do reembolso: `nao_solicitado -> solicitado -> processando -> parcial | concluido | falhou`; `falhou -> processando`; `parcial -> processando | concluido`. Cada nova execução usa idempotência, e `valorReembolsadoCentavos` cresce monotonicamente sem ultrapassar `valorPagoCentavos`. `concluido` exige igualdade entre os valores, define `reembolsadoEm` e leva o pagamento a `reembolsado`; parcial mantém `pago`.

Máquina da contestação do pagamento: `inexistente -> aberta -> resolvida_favoravel | resolvida_desfavoravel`, sob a perspectiva do pagador. Abertura define `contestacaoAbertaEm` e pagamento `contestado`; resolução favorável ao pagador leva a `reembolsado`, e desfavorável leva a `pago`. Ambas definem `contestacaoResolvidaEm`, evento externo deduplicado e auditoria.

Máquina da conciliação: `pendente -> conciliado | divergente | erro_temporario`; `erro_temporario -> pendente | conciliado | divergente`; `divergente -> pendente | conciliado`; `conciliado -> pendente` somente quando novo evento financeiro exigir outra conferência. `pendente` e `erro_temporario` exigem `proximaConciliacaoEm`; `conciliado` ou `divergente` deixam esse campo `null`. Ao atingir o máximo de tentativas sem conclusão, o estado vira `divergente` e gera alerta para tratamento manual, não uma fila órfã.

Campos condicionais: `pago` exige `pagoEm` e `valorPagoCentavos = valorEsperadoCentavos`, inclusive pedido gratuito de valor zero; `falhou` exige `motivoFalhaCodigo`; `cancelado` exige `canceladoEm`; reembolso usa suas datas; conciliação incrementa contador e preenche última tentativa. Toda transição compara `versaoEstado`, atualiza a projeção segura em `pedidos` e registra histórico/auditoria pela mesma operação idempotente.

Cliente acompanha o estado seguro projetado em `pedidos` e obtém detalhes próprios por Function sanitizada. Caixa, dono e gerente recebem somente informações necessárias ao escopo; IDs externos, hashes, correlação e reconciliação bruta não são lidos pelo SDK cliente.

### `eventos_webhooks/{idEventoWebhook}`

O ID é derivado de provedor e ID externo, garantindo processamento único.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idEventoWebhook` | string | sim | ID determinístico. |
| `provedor` | string | sim | Origem externa. |
| `ambiente` | string | sim | Impede colisão entre desenvolvimento, homologação e produção. |
| `idEventoProvedor` | string | sim | ID único informado pelo provedor. |
| `tipoEvento` | string | sim | Tipo normalizado. |
| `idRecursoProvedor` | string | não | Pagamento ou cobrança externa. |
| `assinaturaValida` | booleano | sim | Resultado da verificação. |
| `hashCorpo` | string | sim | Integridade sem copiar dados desnecessários. |
| `statusProcessamento` | string | sim | `recebido`, `processando`, `processado`, `ignorado`, `falha_temporaria` ou `falha_definitiva`. |
| `tentativasProcessamento` | inteiro | sim | Contador técnico. |
| `maximoTentativas` | inteiro | sim | Limite fotografado. |
| `quantidadeRecebimentos` | inteiro | sim | Reentregas do mesmo evento. |
| `idEntidadeInterna` | string ou null | não | Pagamento ou assinatura afetada. |
| `resultadoCodigo` | string ou null | não | Resultado sanitizado. |
| `ultimoErroCodigo` | string ou null | não | Erro sanitizado. |
| `idDonoProcessamento` | string ou null | condicional | Obrigatório em `processando`. |
| `bloqueadoAte` | timestamp ou null | condicional | Arrendamento obrigatório em `processando`. |
| `recebidoEm` | timestamp | sim | Data do servidor. |
| `ocorridoEmProvedor` | timestamp ou null | não | Data declarada pelo provedor. |
| `ultimoRecebimentoEm` | timestamp | sim | Última reentrega. |
| `processadoEm` | timestamp ou null | não | Conclusão. |
| `proximaTentativaEm` | timestamp ou null | condicional | Obrigatória em `recebido` e `falha_temporaria`. |
| `excluirEm` | timestamp ou null | não | Descarte por política financeira aprovada; nunca substitui reconciliação. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |

Fluxo: `recebido -> processando -> processado | ignorado | falha_temporaria | falha_definitiva`; `falha_temporaria -> processando`. `recebido` e `falha_temporaria` exigem próxima tentativa; `processando` exige dono e arrendamento; estados terminais exigem `processadoEm`. Ao atingir `maximoTentativas`, a próxima falha vira definitiva, gera alerta e força conciliação do recurso afetado. Reentrega de estado terminal apenas incrementa `quantidadeRecebimentos`, sem reaplicar efeito.

O ID inclui provedor, ambiente e ID externo. Eventos fora de ordem nunca regridem pagamento confirmado; quando houver dúvida, o backend reconcilia com o provedor. O corpo bruto só será preservado se contrato, reconciliação e LGPD justificarem, em armazenamento privado e com retenção definida.

## Entregas e rastreamento

### `entregas/{idEntrega}`

No MVP, `idEntrega` será igual a `idPedido`, garantindo no máximo uma entrega por pedido e tornando a criação idempotente. Este documento contém somente estado e informações seguras comuns aos participantes.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idEntrega` | string | sim | ID interno. |
| `idPedido` | string | sim | Relação um para um no MVP. |
| `idEstabelecimento` | string | sim | Escopo. |
| `idCliente` | string | sim | Destinatário autorizado. |
| `idMotoboy` | string ou null | não | Definido atomicamente no aceite. |
| `statusEntrega` | string | sim | Estado logístico canônico. |
| `distanciaEstimadaMetros` | inteiro | não | Estimativa fotografada. |
| `tempoEstimadoMinutos` | inteiro | não | Estimativa atual. |
| `taxaEntregaCentavos` | inteiro | sim | Fotografia do pedido. |
| `moeda` | string | sim | `BRL`. |
| `codigoEntregaValidado` | booleano | sim | Projeção; o segredo fica em `codigos_entrega`. |
| `ultimaSequenciaEvento` | inteiro | sim | Ordenação estável da linha do tempo. |
| `ultimaAtividadeEm` | timestamp | sim | Detecta entregas paradas. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |
| `ofertadoEm` | timestamp ou null | não | Início das ofertas. |
| `aceitoEm` | timestamp ou null | não | Aceite atômico. |
| `chegouRetiradaEm` | timestamp ou null | não | Evento operacional. |
| `retiradoEm` | timestamp ou null | não | Coleta. |
| `saiuParaEntregaEm` | timestamp ou null | não | Saída. |
| `chegouDestinoEm` | timestamp ou null | não | Chegada. |
| `entregueEm` | timestamp ou null | não | Conclusão. |
| `canceladoEm` | timestamp ou null | não | Cancelamento. |
| `motivoCancelamentoCodigo` | string ou null | não | Motivo padronizado. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |

### `entregas_privadas/{idEntrega}`

Documento bruto negado integralmente ao SDK. A Function entrega ao cliente seu endereço, ao motoboy atribuído os dados operacionais necessários e ao estabelecimento somente a visão compatível com seu papel; ganho do motoboy e metadados de distribuição nunca acompanham essas visões sem finalidade.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idEntrega` | string | sim | Mesmo ID da entrega compartilhada. |
| `idPedido` | string | sim | Pedido relacionado. |
| `idEstabelecimento` | string | sim | Escopo. |
| `idCliente` | string | sim | Destinatário. |
| `idMotoboy` | string ou null | não | Deve coincidir com a projeção compartilhada. |
| `tipoMotoboy` | string ou null | não | `proprio` ou `autonomo`. |
| `grupoOfertaAtual` | string ou null | não | `proprios` ou `autonomos`. |
| `rodadaOfertaAtual` | inteiro | sim | Rodada vigente. |
| `versaoAtribuicao` | inteiro | sim | Invalida ofertas e sessões antigas. |
| `enderecoRetiradaFotografia` | mapa fechado | sim | Fotografia operacional restrita. |
| `enderecoEntregaFotografia` | mapa fechado | sim | Fotografia residencial restrita. |
| `localizacaoRetirada` | geopoint | sim | Ponto exato de coleta. |
| `localizacaoEntrega` | geopoint | sim | Ponto exato do destino. |
| `geohashRetirada` | string | sim | Distribuição por proximidade. |
| `valorMotoboyCentavos` | inteiro | sim | Ganho efetivo, restrito. |
| `criadoEm` | timestamp | sim | Mesma operação da entrega. |
| `atualizadoEm` | timestamp | sim | Última alteração autoritativa. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |

Entrega compartilhada, documento privado e evento logístico são atualizados na mesma transação. Se o efeito ultrapassar limites transacionais, a alteração de domínio e o evento de saída nascem juntos e a projeção é reconciliada antes de permitir a próxima transição.

Máquina de estados da entrega:

| Estado atual | Próximos estados permitidos | Autoridade e pré-condições principais |
| --- | --- | --- |
| `criada` | `aguardando_atribuicao`, `cancelada` | Backend valida pedido pronto e região; cancelamento acompanha cancelamento do pedido. |
| `aguardando_atribuicao` | `ofertando`, `motoboy_definido`, `cancelada` | Distribuição cria rodada ou atribuição própria; versão privada impede aceite antigo. |
| `ofertando` | `motoboy_definido`, `aguardando_atribuicao`, `cancelada` | Aceite ocorre em transação; rodada esgotada retorna para nova estratégia. |
| `motoboy_definido` | `a_caminho_retirada`, `aguardando_atribuicao`, `cancelada` | Motoboy atribuído confirma início; perda antes da coleta limpa atribuição e incrementa versão. |
| `a_caminho_retirada` | `aguardando_coleta`, `aguardando_atribuicao`, `cancelada` | Chegada validada pela Function; reatribuição só antes da coleta. |
| `aguardando_coleta` | `coletada`, `aguardando_atribuicao`, `cancelada` | Coleta exige motoboy atual e confirmação operacional do estabelecimento. |
| `coletada` | `a_caminho_entrega`, `cancelada` | Saída usa a mesma atribuição; cancelamento é exceção N1/suporte. |
| `a_caminho_entrega` | `aguardando_codigo`, `cancelada` | Chegada ao destino pelo motoboy atual; cancelamento tardio exige prova e compensação. |
| `aguardando_codigo` | `entregue`, `cancelada` | Somente validação autoritativa do código conclui. |
| `entregue`, `cancelada` | nenhum | Terminais; falha de atribuição usa retorno anterior, não cancelamento terminal. |

Toda transição valida estado compartilhado, `versaoAtribuicao` privada, vínculo do ator e App Check, incrementa `ultimaSequenciaEvento` e grava o evento. `ofertadoEm`, `aceitoEm`, `chegouRetiradaEm`, `retiradoEm`, `saiuParaEntregaEm`, `chegouDestinoEm`, `entregueEm` e `canceladoEm` nascem somente no respectivo avanço. `cancelada` sempre projeta pedido `cancelado`; uma simples perda de motoboy retorna a `aguardando_atribuicao`.

### `ofertas_entregas/{idOferta}`

Cada documento representa uma oferta para um motoboy específico. Antes do aceite, contém somente dados mínimos e localização aproximada da coleta; nunca o endereço exato do cliente.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idOferta` | string | sim | ID determinístico por rodada, entrega e motoboy. |
| `idEntrega` | string | sim | Entrega ofertada. |
| `idPedido` | string | sim | Referência mínima. |
| `idEstabelecimento` | string | sim | Escopo. |
| `idMotoboy` | string | sim | Único destinatário da oferta. |
| `tipoMotoboy` | string | sim | `proprio` ou `autonomo`. |
| `idVinculo` | string ou null | não | Vínculo quando o motoboy for próprio. |
| `versaoAtribuicao` | inteiro | sim | Deve coincidir com a entrega. |
| `rodada` | inteiro | sim | Rodada de distribuição. |
| `prioridade` | inteiro | sim | Ordem calculada pelo backend. |
| `distanciaColetaMetros` | inteiro | não | Estimativa para decisão. |
| `bairroColeta` | string | não | Informação aproximada. |
| `bairroEntrega` | string | não | Destino aproximado, sem endereço exato. |
| `quantidadeItens` | inteiro | sim | Total sem revelar os produtos. |
| `valorMotoboyCentavos` | inteiro | sim | Oferta financeira. |
| `moeda` | string | sim | `BRL`. |
| `statusOferta` | string | sim | `pendente`, `visualizada`, `aceita`, `recusada`, `expirada` ou `cancelada`. |
| `ofertadoEm` | timestamp | sim | Criação. |
| `visualizadoEm` | timestamp ou null | não | Visualização. |
| `respondidoEm` | timestamp ou null | não | Resposta. |
| `expiraEm` | timestamp | sim | Prazo curto. |
| `excluirEm` | timestamp ou null | não | Descarte posterior da oferta já encerrada. |
| `motivoRecusaCodigo` | string ou null | não | Motivo padronizado opcional. |

Aceitar uma oferta exige transação que confirme entrega ainda disponível, oferta ativa, prazo válido, motoboy elegível e ausência de outra entrega incompatível. A mesma transação define `idMotoboy` nos documentos compartilhado e privado, fotografa tipo e valor restritos, cancela logicamente a rodada e gera evento idempotente; ofertas restantes são encerradas de modo assíncrono seguro.

Oferta segue `pendente -> visualizada | aceita | recusada | expirada | cancelada` e `visualizada -> aceita | recusada | expirada | cancelada`; `aceita`, `recusada`, `expirada` e `cancelada` são terminais. Somente o motoboy destinatário solicita `visualizada`, `aceita` ou `recusada` por Function. Backend confirma prazo para `expirada` e invalida rodada para `cancelada`; `aceita` exige a transação de atribuição descrita acima.

### `codigos_entrega/{idEntrega}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idEntrega` | string | sim | Mesmo ID da entrega. |
| `codigoHmac` | string | sim | HMAC calculado com segredo do servidor; nunca hash simples de domínio pequeno. |
| `algoritmoHmac` | string | sim | Algoritmo versionado usado pelo backend. |
| `versaoGeracao` | inteiro | sim | Muda o código quando houver regeneração autorizada. |
| `versaoChaveGeracao` | inteiro | sim | Identifica o segredo gerenciado usado para derivar o código. |
| `quantidadeDigitos` | inteiro | sim | `4` ou `6`. |
| `statusCodigo` | string | sim | `ativo`, `bloqueado`, `validado`, `expirado` ou `cancelado`. |
| `tentativasInvalidas` | inteiro | sim | Contador atômico. |
| `maximoTentativas` | inteiro | sim | Limite vigente fotografado. |
| `bloqueadoAte` | timestamp ou null | não | Bloqueio temporário. |
| `expiraEm` | timestamp | sim | Validade máxima. |
| `excluirEm` | timestamp | sim | Contingência máxima definida na criação, nunca antes de `expiraEm`. |
| `geradoEm` | timestamp | sim | Data do servidor. |
| `validadoEm` | timestamp ou null | não | Conclusão. |
| `validadoPor` | string ou null | não | Motoboy responsável. |

Somente o backend lê este documento. O valor numérico não é persistido: uma Function autenticada valida pedido, identidade e validade e o deriva de forma determinística com segredo gerenciado, ID da entrega e `versaoGeracao`. O motoboy envia uma tentativa a outra Function, que compara o HMAC em tempo constante. Validação, cancelamento ou expiração exclui o documento na mesma operação que encerra o código; `excluirEm` é apenas contingência máxima. Logs registram resultado e contagem, nunca o código, o HMAC ou o segredo.

### `entregas/{idEntrega}/eventos/{idEvento}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idEvento` | string | sim | ID idempotente. |
| `numeroSequencia` | inteiro | sim | Ordenação crescente na entrega. |
| `tipoEvento` | string | sim | Evento logístico de lista fechada. |
| `statusAnterior` | string ou null | não | Estado anterior quando houver transição. |
| `statusNovo` | string ou null | não | Estado confirmado. |
| `tituloPublico` | string | sim | Texto seguro ao cliente. |
| `descricaoPublica` | string ou null | não | Informação sem dado sensível. |
| `localizacaoAproximada` | geopoint ou null | não | Precisão reduzida quando necessária. |
| `criadoEm` | timestamp | sim | Evento imutável. |
| `versaoEsquema` | inteiro | sim | Versão do evento. |

A linha do tempo contém somente informações seguras aos participantes. UID, papel do ator e correlação técnica são preservados exclusivamente na auditoria restrita ligada à mesma operação, sem duplicação no evento logístico.

### `localizacoes_motoboys/{idMotoboy}`

Documento privado usado pelo backend para disponibilidade e proximidade. Cliente e outros motoboys nunca consultam esta coleção.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idMotoboy` | string | sim | Titular. |
| `localizacaoAtual` | geopoint | sim | Última posição aceita. |
| `geohashAtual` | string | sim | Busca aproximada pelo backend. |
| `precisaoMetros` | decimal | não | Qualidade da posição. |
| `direcaoGraus` | decimal | não | Direção. |
| `velocidadeMetrosSegundo` | decimal | não | Velocidade. |
| `statusDisponibilidade` | string | sim | Projeção operacional. |
| `elegivelOfertaAutonoma` | booleano | sim | Mantido pelo backend, não pelo aplicativo. |
| `idEntregaAtiva` | string ou null | não | Entrega atual. |
| `versaoAtribuicaoAtual` | inteiro ou null | não | Rejeita sessão de entrega antiga. |
| `capturadaEm` | timestamp | sim | Horário do dispositivo, não autoritativo. |
| `recebidaEm` | timestamp | sim | Horário do servidor. |
| `validaAte` | timestamp | sim | Posição antiga deixa de ser elegível. |
| `excluirEm` | timestamp | sim | Limpeza de contingência por TTL. |

### `rastreamento_entregas/{idEntrega}`

Documento pequeno com a última posição compartilhável, sem histórico de cada ponto GPS.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idEntrega` | string | sim | Entrega. |
| `idPedido` | string | sim | Pedido do cliente. |
| `idEstabelecimento` | string | sim | Escopo. |
| `idCliente` | string | sim | Único cliente autorizado. |
| `idMotoboy` | string | sim | Motoboy responsável. |
| `versaoAtribuicao` | inteiro | sim | Rejeita motoboy ou sessão anterior. |
| `idSessaoRastreamento` | string | sim | Sessão aleatória da entrega atual. |
| `localizacaoAtual` | geopoint ou null | sim | Última posição; torna-se `null` ao encerrar. |
| `geohashAtual` | string ou null | sim | Apoio técnico; torna-se `null` ao encerrar. |
| `precisaoMetros` | decimal | não | Qualidade. |
| `direcaoGraus` | decimal | não | Direção. |
| `velocidadeMetrosSegundo` | decimal | não | Velocidade. |
| `tempoEstimadoMinutos` | inteiro | não | Estimativa. |
| `distanciaAteDestinoMetros` | inteiro | não | Estimativa. |
| `statusRastreamento` | string | sim | `aguardando`, `ativo`, `pausado`, `encerrado` ou `cancelado`. |
| `nivelPrecisaoCompartilhada` | string | sim | `aproximada` ou `precisa`, conforme fase. |
| `compartilhandoLocalizacao` | booleano | sim | Falso fora de entrega ativa. |
| `sequenciaAtualizacao` | inteiro | sim | Rejeita posições antigas ou fora de ordem. |
| `capturadaEm` | timestamp | sim | Horário do dispositivo. |
| `atualizadoEm` | timestamp | sim | Última posição. |
| `validaAte` | timestamp | sim | Permite indicar posição desatualizada. |
| `encerradoEm` | timestamp ou null | não | Encerramento. |
| `excluirEm` | timestamp | sim | Descarte por retenção curta conforme LGPD. |

Atualizações exigem motoboy responsável, entrega ativa, versão e sessão atuais, sequência crescente e frequência adaptativa. Antes da coleta, a posição compartilhada pode ser aproximada; após sair para entrega, pode ser precisa. Conclusão, cancelamento ou reembolso limpa posição, direção e velocidade e encerra compartilhamento imediatamente, independentemente do TTL.

## Assinaturas e cobrança da plataforma

### `assinaturas/{idAssinatura}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idAssinatura` | string | sim | ID interno. |
| `idEstabelecimento` | string | sim | Assinante. |
| `idDonoNoInicio` | string | sim | Responsável no início do ciclo. |
| `tipoPlano` | string | sim | `gratis`, `mensal`, `trimestral`, `anual` ou `personalizado`. |
| `statusAssinatura` | string | sim | Estado canônico. |
| `valorBaseCentavos` | inteiro | sim | Valor antes do desconto. |
| `descontoCentavos` | inteiro | sim | Desconto vigente. |
| `valorCobradoCentavos` | inteiro | sim | Resultado do ciclo. |
| `moeda` | string | sim | `BRL`. |
| `cicloCobranca` | string | sim | `gratis`, `mensal`, `trimestral`, `anual` ou `personalizado`. |
| `gratuitoAte` | timestamp ou null | não | Fim da gratuidade concedida. |
| `testeTerminaEm` | timestamp ou null | não | Fim do teste. |
| `periodoAtualInicio` | timestamp | sim | Início do período. |
| `periodoAtualFim` | timestamp | sim | Fim do período. |
| `proximoVencimento` | timestamp ou null | não | Próxima cobrança. |
| `diasCarencia` | inteiro | sim | Regra fotografada. |
| `bloquearInadimplente` | booleano | sim | Política N1. |
| `permitirHistoricoQuandoBloqueado` | booleano | sim | Acesso residual. |
| `idPlanoExterno` | string ou null | não | Referência futura do provedor. |
| `cancelarAoFimPeriodo` | booleano | sim | Cancelamento programado. |
| `renovacaoAutomatica` | booleano | sim | Política do ciclo. |
| `versaoCondicoes` | inteiro | sim | Versão das condições comerciais fotografadas. |
| `canceladoEm` | timestamp ou null | não | Cancelamento. |
| `bloqueadoEm` | timestamp ou null | não | Bloqueio. |
| `observacaoInterna` | string ou null | não | Texto restrito. |
| `versaoEsquema` | inteiro | sim | Versão. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

Estados: `gratis_ativo`, `teste`, `ativo`, `aguardando_pagamento`, `em_carencia`, `vencido`, `cancelado`, `expirado` e `bloqueado`.

Uma configuração aponta para a assinatura vigente; assinaturas antigas permanecem como histórico e não são reescritas para representar um novo plano.

Dono e gerente acompanham plano, estado e vencimento por visão sanitizada; observação interna e referências externas permanecem restritas.

### `pagamentos_assinaturas/{idPagamentoAssinatura}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idPagamentoAssinatura` | string | sim | ID interno da fatura/tentativa. |
| `idAssinatura` | string | sim | Assinatura. |
| `idEstabelecimento` | string | sim | Escopo. |
| `periodoReferenciaInicio` | timestamp | sim | Início faturado. |
| `periodoReferenciaFim` | timestamp | sim | Fim faturado. |
| `valorCentavos` | inteiro | sim | Valor devido. |
| `moeda` | string | sim | `BRL`. |
| `statusPagamento` | string | sim | Mesmo catálogo financeiro aplicável. |
| `dataVencimento` | timestamp | sim | Vencimento. |
| `metodoPagamento` | string | não | Método escolhido. |
| `provedorPagamento` | string | sim | `simulado` ou futuro provedor. |
| `idPagamentoProvedor` | string ou null | não | Referência externa. |
| `caminhoFatura` | string ou null | não | Arquivo privado, não URL pública. |
| `chaveIdempotenciaHash` | string | sim | Evita fatura duplicada. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |
| `pagoEm` | timestamp ou null | não | Confirmação. |
| `canceladoEm` | timestamp ou null | não | Cancelamento. |

Faturas e pagamentos de assinatura são apresentados por Function sanitizada. O SDK cliente não lê referências do provedor, hashes ou caminhos privados.

### `configuracoes_cobranca_estabelecimento/{idEstabelecimento}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idEstabelecimento` | string | sim | Mesmo ID do documento. |
| `idAssinaturaAtual` | string ou null | não | Ponteiro para assinatura vigente. |
| `modoCobranca` | string | sim | `gratis`, `apenas_assinatura`, `apenas_comissao`, `assinatura_e_comissao` ou `personalizado`. |
| `assinaturaAtiva` | booleano | sim | Projeção operacional. |
| `comissaoAtiva` | booleano | sim | Habilita comissão. |
| `percentualComissaoPontosBase` | inteiro | sim | Percentual em pontos-base. |
| `taxaFixaPorPedidoCentavos` | inteiro | sim | Parcela fixa. |
| `baseCalculoComissao` | string | sim | Inicialmente `subtotal_apos_descontos`. |
| `responsavelTaxaGateway` | string | sim | `plataforma`, `estabelecimento` ou `rateado`. |
| `usoGratuitoPermitido` | booleano | sim | Concessão N1. |
| `gratuitoAte` | timestamp ou null | não | Prazo. |
| `bloqueadoPorInadimplencia` | booleano | sim | Projeção controlada pelo backend. |
| `observacaoInterna` | string ou null | não | Texto restrito. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoPor` | string | sim | N1 autorizado. |

## Carteira e ganhos do motoboy

### `transacoes_motoboys/{idTransacao}`

Cada documento representa uma obrigação econômica. Valores e origem são imutáveis; somente o ciclo permitido muda. A razão contábil append-only fica em `movimentacoes_carteiras_motoboys`.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idTransacao` | string | sim | ID determinístico para evento repetível. |
| `idMotoboy` | string | sim | Titular. |
| `idEstabelecimento` | string ou null | não | Estabelecimento relacionado. |
| `idEntrega` | string ou null | não | Entrega de origem. |
| `idPedido` | string ou null | não | Pedido de origem. |
| `idTransacaoOrigem` | string ou null | não | Lançamento compensado. |
| `tipoTransacao` | string | sim | `taxa_entrega`, `gorjeta`, `ajuste_credito`, `ajuste_debito`, `repasse` ou `taxa_cancelamento`. |
| `natureza` | string | sim | `credito`, `debito` ou `liquidacao`; repasse é liquidação, não despesa. |
| `valorCentavos` | inteiro | sim | Sempre positivo; natureza define sinal. |
| `moeda` | string | sim | `BRL`. |
| `statusTransacao` | string | sim | `pendente`, `disponivel`, `em_repasse`, `pago`, `retido`, `devedor` ou `cancelado`. |
| `statusRetornoRetencao` | string ou null | não | `pendente` ou `disponivel` enquanto estiver `retido`. |
| `versaoEstado` | inteiro | sim | Controle concorrente do ciclo. |
| `disponivelEm` | timestamp ou null | não | Liberação. |
| `idRepasse` | string ou null | não | Agrupamento futuro de repasse. |
| `idReferenciaExterna` | string ou null | não | Provedor financeiro. |
| `chaveIdempotenciaHash` | string | sim | Evita duplicidade. |
| `resumoRequisicaoHash` | string | sim | Conflito se a mesma chave alterar valor ou origem. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Última transição. |
| `retidoEm` | timestamp ou null | não | Entrada em retenção. |
| `pagoEm` | timestamp ou null | não | Confirmação do repasse. |
| `canceladoEm` | timestamp ou null | não | Estorno lógico. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |

Máquinas por natureza:

- Crédito: `pendente -> disponivel -> em_repasse -> pago`; `pendente | disponivel -> retido`; `retido` volta apenas ao estado em `statusRetornoRetencao`; antes de pagamento, compensação pode levar a `cancelado`.
- Débito: nasce `pago` quando integralmente absorvido pelos saldos ou `devedor` quando cria obrigação; `devedor -> pago | cancelado` por compensação documentada.
- Liquidação/repasse: `pendente -> em_repasse -> pago | cancelado`; devolver uma reserva leva a `cancelado` e restaura o saldo disponível por movimento próprio.

Transição compara `versaoEstado` e exige os movimentos correspondentes na mesma transação. `pago`, `cancelado` e crédito já repassado não reabrem. Correções não editam valor, natureza ou origem: criam nova transação compensatória com `idTransacaoOrigem`.

O motoboy recebe extrato sanitizado por Function; identificador externo e hashes permanecem restritos. A carteira resumida pode ser lida pelo próprio titular conforme Rules específicas.

### `movimentacoes_carteiras_motoboys/{idMovimentacaoCarteira}`

Razão imutável e ordenada de cada alteração da carteira.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idMovimentacaoCarteira` | string | sim | ID determinístico da operação idempotente. |
| `idMotoboy` | string | sim | Titular. |
| `idTransacao` | string | sim | Obrigação econômica relacionada. |
| `idEstabelecimento` | string ou null | não | Escopo quando aplicável. |
| `idEntrega` | string ou null | não | Origem logística. |
| `idPedido` | string ou null | não | Origem comercial. |
| `operacaoSaldo` | string | sim | Uma operação fechada da matriz abaixo. |
| `naturezaMovimento` | string | sim | `credito`, `debito`, `transferencia` ou `liquidacao`. |
| `contaOrigem` | string | sim | `externa`, `pendente`, `disponivel`, `em_repasse`, `retido` ou `devedor`. |
| `contaDestino` | string | sim | Mesmo catálogo de contas. |
| `valorCentavos` | inteiro | sim | Valor positivo. |
| `moeda` | string | sim | `BRL`. |
| `sequencia` | inteiro | sim | Cresce exatamente uma unidade por motoboy. |
| `saldosAnteriores` | mapa fechado | sim | Cinco saldos antes do lançamento. |
| `saldosPosteriores` | mapa fechado | sim | Cinco saldos depois do lançamento. |
| `totaisAnteriores` | mapa fechado | sim | Créditos, débitos e repasses antes. |
| `totaisPosteriores` | mapa fechado | sim | Créditos, débitos e repasses depois. |
| `chaveIdempotenciaHash` | string | sim | Deduplicação. |
| `resumoRequisicaoHash` | string | sim | Protege contra reutilização divergente. |
| `criadoEm` | timestamp | sim | Data do servidor; documento imutável. |
| `versaoEsquema` | inteiro | sim | Versão do evento. |

Matriz canônica de efeitos, usando `v = valorCentavos`:

| `operacaoSaldo` | Natureza e contas | Efeito nos saldos | Efeito nos totais |
| --- | --- | --- | --- |
| `creditar_pendente` | crédito, `externa -> pendente` | `saldoPendenteCentavos += v` | `totalCreditosCentavos += v` |
| `compensar_devedor` | crédito, `externa -> devedor` | `saldoDevedorCentavos -= v` | `totalCreditosCentavos += v` |
| `liberar_disponivel` | transferência, `pendente -> disponivel` | pendente `-v`; disponível `+v` | sem alteração |
| `reservar_repasse` | transferência, `disponivel -> em_repasse` | disponível `-v`; em repasse `+v` | sem alteração |
| `confirmar_repasse` | liquidação, `em_repasse -> externa` | em repasse `-v` | `totalRepassadoCentavos += v` |
| `devolver_repasse` | transferência, `em_repasse -> disponivel` | em repasse `-v`; disponível `+v` | sem alteração |
| `reter_pendente` | transferência, `pendente -> retido` | pendente `-v`; retido `+v` | sem alteração |
| `reter_disponivel` | transferência, `disponivel -> retido` | disponível `-v`; retido `+v` | sem alteração |
| `liberar_retencao_pendente` | transferência, `retido -> pendente` | retido `-v`; pendente `+v` | sem alteração |
| `liberar_retencao_disponivel` | transferência, `retido -> disponivel` | retido `-v`; disponível `+v` | sem alteração |
| `debitar_disponivel` | débito, `disponivel -> externa` | disponível `-v` | `totalDebitosCentavos += v` |
| `debitar_retido` | débito, `retido -> externa` | retido `-v` | `totalDebitosCentavos += v` |
| `registrar_devedor` | débito, `externa -> devedor` | devedor `+v` | `totalDebitosCentavos += v` |

Origem com saldo exige saldo anterior maior ou igual a `v`; `compensar_devedor` não excede a dívida. Débito maior que os saldos é dividido atomicamente em débito das contas permitidas e `registrar_devedor`. Crédito recebido com dívida é dividido em `compensar_devedor` e, se sobrar, `creditar_pendente`. Cada lançamento satisfaz a matriz exatamente; campos não citados permanecem iguais.

Carteira, todos os movimentos do comando, ciclo da transação, sequência e idempotência são confirmados na mesma transação Firestore. Movimento nunca é atualizado ou excluído; correção cria obrigação e movimentos compensatórios referenciados.

### `carteiras_motoboys/{idMotoboy}`

Documento derivado e reconciliável, nunca evidência financeira única.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idMotoboy` | string | sim | Titular. |
| `statusCarteira` | string | sim | `ativa`, `bloqueada` ou `em_revisao`. |
| `saldoPendenteCentavos` | inteiro | sim | Créditos ainda indisponíveis. |
| `saldoDisponivelCentavos` | inteiro | sim | Elegível para repasse. |
| `saldoEmRepasseCentavos` | inteiro | sim | Em processamento. |
| `saldoRetidoCentavos` | inteiro | sim | Valores retidos para análise. |
| `saldoDevedorCentavos` | inteiro | sim | Dívida explícita sem saldo negativo. |
| `totalCreditosCentavos` | inteiro | sim | Total histórico de créditos. |
| `totalDebitosCentavos` | inteiro | sim | Total histórico de débitos. |
| `totalRepassadoCentavos` | inteiro | sim | Total confirmado como pago. |
| `moeda` | string | sim | `BRL`. |
| `sequenciaAtual` | inteiro | sim | Última sequência aplicada. |
| `ultimaTransacaoEm` | timestamp ou null | não | Apoio à reconciliação. |
| `statusConciliacao` | string | sim | `conciliado`, `pendente` ou `divergente`. |
| `versaoControle` | inteiro | sim | Controle de concorrência. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

Os saldos nunca ficam negativos sem regra explícita e auditada. Relatórios diários, semanais e mensais consultam transações paginadas ou agregações; não recalculam toda a carteira no cliente.

Invariante de reconciliação:

```text
saldoPendenteCentavos
+ saldoDisponivelCentavos
+ saldoEmRepasseCentavos
+ saldoRetidoCentavos
- saldoDevedorCentavos
= totalCreditosCentavos - totalDebitosCentavos - totalRepassadoCentavos
```

## Avaliações

### `avaliacoes/{idAvaliacao}`

Cada documento avalia um único alvo. Uma submissão pode criar avaliações separadas para estabelecimento, experiência geral, motoboy e cada produto do pedido, todas ligadas por `idGrupoAvaliacao`. Essa normalização substitui o array `avaliacoesProdutos` do modelo resumido do prompt, evita crescimento do documento e permite consultas por produto.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idAvaliacao` | string | sim | ID opaco, determinístico por pedido, tipo e alvo. |
| `idGrupoAvaliacao` | string ou null | sim | Agrupa a submissão; vira `null` em anonimização efetiva. |
| `idPedido` | string ou null | sim | Pedido que autorizou; vira `null` em anonimização efetiva. |
| `idCliente` | string ou null | sim | Autor; pode virar `null` somente em anonimização formal. |
| `idEstabelecimento` | string | sim | Escopo fotografado do pedido. |
| `idEntrega` | string ou null | não | Entrega relacionada; removida em anonimização efetiva. |
| `tipoAvaliado` | string | sim | `produto`, `estabelecimento`, `motoboy`, `entrega` ou `experiencia_geral`. |
| `idAvaliado` | string | sim | ID do alvo coerente com `tipoAvaliado`. |
| `idProduto` | string ou null | não | Obrigatório quando o alvo for produto. |
| `idMotoboy` | string ou null | não | Obrigatório quando o alvo for motoboy. |
| `nota` | inteiro | sim | Valor entre `1` e `5`. |
| `avaliacaoNegativa` | booleano | sim | Projeção derivada; verdadeira exatamente quando `nota <= 2`. |
| `comentario` | string ou null | não | Texto sanitizado e limitado; hipótese inicial de mil caracteres. |
| `statusAvaliacao` | string | sim | `pendente`, `publicada`, `oculta` ou `removida`. |
| `motivoModeracaoCodigo` | string ou null | não | Motivo padronizado, sem texto sensível. |
| `idCorrelacao` | string ou null | sim | Liga Function e auditoria; pode ser removido na anonimização. |
| `chaveIdempotenciaHash` | string ou null | sim | Impede duplicidade; pode ser removida na anonimização. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Última transição autorizada. |
| `publicadaEm` | timestamp ou null | não | Entrada nos agregados. |
| `ocultadaEm` | timestamp ou null | não | Ocultação. |
| `removidaEm` | timestamp ou null | não | Remoção lógica. |
| `anonimizadaEm` | timestamp ou null | não | Desvinculação formal do autor. |

Estados permitidos: `pendente -> publicada | oculta`, `publicada -> oculta | removida`, `oculta -> publicada | removida`; `removida` é terminal. Somente avaliações `publicada` entram nos agregados de produtos, estabelecimentos e motoboys.

Invariantes:

- O pedido pertence ao autor e está `entregue` ou `retirado_cliente`.
- Produto, estabelecimento, entrega e motoboy são obtidos da fotografia do pedido e da entrega; o cliente não escolhe IDs de escopo.
- Existe no máximo uma avaliação por pedido, tipo e alvo.
- `avaliacaoNegativa` é definida pelo backend na mesma escrita da nota e nunca é aceita do cliente.
- O moderador altera estado e motivo, não reescreve nota ou comentário; sua identidade fica somente na auditoria.
- Entrada ou saída dos agregados ocorre por evento idempotente e reconciliável; médias não são recalculadas no cliente.
- Para produto, estabelecimento e motoboy, `avaliacaoMedia = somaNotasAvaliacoes / totalAvaliacoes`, com zero padronizado quando não houver avaliações. `experiencia_geral` e `entrega` alimentam métricas próprias, não o agregado do motoboy por inferência.
- O documento bruto não é público. Autor e equipe recebem visões sanitizadas por Function; uma futura exibição de comentários exigirá projeção pública sem `idCliente` ou metadados técnicos.

`entrega` representa a dimensão `avaliacaoEntrega` do prompt e usa `idAvaliado = idEntrega`; `experiencia_geral` é uma dimensão distinta e usa `idAvaliado = idPedido` enquanto houver vínculo. Criação e moderação passam por Functions.

Anonimização não consiste apenas em zerar `idCliente`: quando não houver retenção justificada, também remove comentário, `idPedido`, `idGrupoAvaliacao`, `idEntrega`, correlação e chave de idempotência. O documento restante contém somente alvo, tipo, nota e datas mínimas; se isso ainda permitir reidentificação ou não houver finalidade, a avaliação é excluída. A decisão e o efeito sobre agregados são idempotentes e auditados.

## Denúncias

### `denuncias/{idDenuncia}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idDenuncia` | string | sim | ID opaco. |
| `idDenunciante` | string ou null | sim | Autor; somente anonimização formal permite `null`. |
| `nivelAcessoDenuncianteFotografia` | string | sim | Papel no momento do envio. |
| `tipoAlvo` | string | sim | `usuario`, `cliente`, `motoboy`, `estabelecimento`, `produto`, `pedido` ou `entrega`. |
| `idAlvo` | string | sim | Alvo principal. |
| `idUsuarioAlvo` | string ou null | não | Referência condicional. |
| `idEstabelecimento` | string ou null | não | Contexto e escopo condicional. |
| `idProduto` | string ou null | não | Produto relacionado. |
| `idPedido` | string ou null | não | Pedido relacionado. |
| `idEntrega` | string ou null | não | Entrega relacionada. |
| `idMotoboy` | string ou null | não | Motoboy relacionado. |
| `categoriaDenuncia` | string | sim | `produto_errado`, `produto_vencido`, `mau_atendimento`, `atraso`, `cobranca_indevida`, `conduta_inadequada` ou `outro`. |
| `descricao` | string | sim | Relato sanitizado e limitado; hipótese inicial de quatro mil caracteres. |
| `anexos` | lista de mapas limitados | não | Até cinco metadados privados, nunca URLs públicas. |
| `quantidadeAnexos` | inteiro | sim | Deve coincidir com a lista. |
| `statusDenuncia` | string | sim | Estado de tratamento. |
| `resultadoAnalise` | string | sim | `nao_analisado`, `procedente`, `parcialmente_procedente`, `improcedente` ou `inconclusivo`. |
| `prioridade` | string | sim | `baixa`, `media`, `alta` ou `critica`. |
| `idResponsavelAtual` | string ou null | não | Analista autorizado. |
| `analisadoPor` | string ou null | não | Decisor final fotografado no encerramento. |
| `resolucaoCodigo` | string ou null | não | Resultado operacional padronizado. |
| `resumoResolucaoPublico` | string ou null | não | Resposta sanitizada ao denunciante. |
| `idAlertaAntifraude` | string ou null | não | Alerta correlacionado, sem presumir culpa. |
| `versaoEstado` | inteiro | sim | Controle de concorrência. |
| `idCorrelacao` | string | sim | Rastreabilidade. |
| `chaveIdempotenciaHash` | string | sim | Evita reenvio duplicado. |
| `bloqueioDescarte` | booleano | sim | Impede definir TTL durante investigação ou obrigação. |
| `versaoEsquema` | inteiro | sim | Versão. |
| `criadoEm` | timestamp | sim | Recebimento. |
| `atualizadoEm` | timestamp | sim | Última transição. |
| `atribuidaEm` | timestamp ou null | não | Atribuição. |
| `analisadoEm` | timestamp ou null | não | Análise final. |
| `encerradoEm` | timestamp ou null | não | Encerramento. |
| `excluirEm` | timestamp ou null | não | TTL definido apenas após encerramento e liberação de retenção. |

Fluxo: `recebida -> em_triagem -> em_analise <-> aguardando_informacoes -> resolvida`. `recebida` ou `em_triagem` pode ir para `cancelada`; reabertura auditada retorna a `em_analise`. Uma ação contra usuário ou estabelecimento é operação separada, idempotente e auditada.

O backend valida se o denunciante participa do pedido ou entrega informados e deriva todas as referências. O denunciado não lê relato ou anexos brutos. A coleção bruta é restrita; o denunciante recebe por Function uma visão sanitizada do próprio caso e do resumo público. N1 ou equipe de confiança trata o conteúdo. Anexos usam caminho privado, tipo MIME validado, tamanho, hash e estado de análise.

### `denuncias/{idDenuncia}/interacoes/{idInteracao}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idInteracao` | string | sim | ID idempotente. |
| `idDenuncia` | string | sim | Documento pai. |
| `sequencia` | inteiro | sim | Ordem crescente e estável. |
| `tipoInteracao` | string | sim | `complemento`, `solicitacao_informacao`, `resposta`, `transicao` ou `decisao`. |
| `idAutor` | string ou null | não | Nulo somente para evento de sistema. |
| `tipoAutor` | string | sim | `denunciante`, `analista` ou `sistema`. |
| `visibilidade` | string | sim | `denunciante_e_equipe` ou `somente_equipe`. |
| `conteudo` | string ou null | não | Texto limitado; decisão interna sensível não vai ao resumo público. |
| `anexos` | lista de mapas limitados | não | Metadados privados validados. |
| `quantidadeAnexos` | inteiro | sim | De zero a cinco, coerente com a lista. |
| `statusAnterior` | string ou null | não | Estado anterior quando aplicável. |
| `statusNovo` | string ou null | não | Estado resultante. |
| `idCorrelacao` | string | sim | Rastreabilidade. |
| `criadoEm` | timestamp | sim | Evento imutável do servidor. |

Interações são imutáveis e consultadas por `visibilidade` e `sequencia`; o denunciante só recebe `denunciante_e_equipe`. O aplicativo nunca cria uma interação diretamente: uma Function valida o participante, deriva autor, tipo, visibilidade e sequência, associa somente anexos aprovados e atualiza o cabeçalho na mesma transação. Excluir a denúncia pai não exclui interações nem arquivos. O processo de descarte deve primeiro tratar Storage e subcoleção; TTL isolado não é suficiente.

## Suporte

### `chamados_suporte/{idChamado}`

O cabeçalho não armazena a conversa inteira. A descrição inicial é a primeira mensagem e cada complemento ocupa documento próprio.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idChamado` | string | sim | ID opaco. |
| `numeroExibicao` | string | sim | Protocolo amigável, não usado para autorização. |
| `abertoPor` | string | sim | Solicitante autenticado. |
| `nivelAcessoAberturaFotografia` | string | sim | Papel no momento da abertura. |
| `tipoEscopoAcesso` | string | sim | `usuario` ou `estabelecimento`. |
| `idEscopoAcesso` | string | sim | Titular ou estabelecimento autorizado. |
| `idEstabelecimento` | string ou null | não | Contexto. |
| `idPedido` | string ou null | não | Contexto. |
| `idPagamento` | string ou null | não | Contexto restrito. |
| `idEntrega` | string ou null | não | Contexto. |
| `idMotoboy` | string ou null | não | Contexto. |
| `categoria` | string | sim | `problema_pedido`, `problema_pagamento`, `produto_errado`, `produto_nao_entregue`, `atraso_entrega`, `problema_motoboy`, `problema_estabelecimento`, `reembolso` ou `outro`. |
| `statusChamado` | string | sim | Estado canônico. |
| `prioridade` | string | sim | `baixa`, `media`, `alta` ou `critica`. |
| `filaAtendimento` | string | sim | `cliente`, `estabelecimento`, `motoboy`, `financeiro` ou `seguranca`. |
| `titulo` | string | sim | Texto sanitizado, hipótese inicial de 120 caracteres. |
| `resumoInicial` | string | sim | Resumo curto para listagem. |
| `idResponsavelAtual` | string ou null | não | Atendente. |
| `idUltimaMensagem` | string | sim | Projeção. |
| `sequenciaUltimaMensagem` | inteiro | sim | Ordenação da conversa. |
| `ultimaMensagemEm` | timestamp | sim | Projeção. |
| `tipoUltimoRemetente` | string | sim | Projeção segura. |
| `ultimaLeituraSolicitanteEm` | timestamp ou null | não | Estado de leitura. |
| `ultimaLeituraEquipeEm` | timestamp ou null | não | Estado de leitura. |
| `motivoResolucaoCodigo` | string ou null | não | Motivo padronizado. |
| `resumoResolucaoPublico` | string ou null | não | Resposta ao solicitante. |
| `versaoEstado` | inteiro | sim | Controle de concorrência. |
| `idCorrelacao` | string | sim | Rastreabilidade. |
| `chaveIdempotenciaHash` | string | sim | Deduplicação da abertura. |
| `bloqueioDescarte` | booleano | sim | Suspende descarte quando necessário. |
| `versaoEsquema` | inteiro | sim | Versão. |
| `criadoEm` | timestamp | sim | Abertura. |
| `atualizadoEm` | timestamp | sim | Atualização. |
| `primeiraRespostaEm` | timestamp ou null | não | Métrica de atendimento. |
| `resolvidoEm` | timestamp ou null | não | Resolução. |
| `fechadoEm` | timestamp ou null | não | Fechamento. |
| `canceladoEm` | timestamp ou null | não | Cancelamento. |
| `excluirEm` | timestamp ou null | não | TTL posterior ao encerramento. |

Fluxo: `aberto -> em_triagem -> em_andamento <-> aguardando_usuario -> resolvido -> fechado`. Reabertura controlada leva `resolvido` a `em_andamento`; `aberto` ou `em_triagem` pode ir para `cancelado`; `fechado` e `cancelado` são terminais.

Chamados de usuário pertencem ao solicitante. Como cabeçalho e mensagens contêm metadados internos, o solicitante recebe por Function uma visão sanitizada; o backend consulta no caminho conhecido somente mensagens com `visibilidade = participantes`. Chamados empresariais são administrados por dono ou gerente autorizado do estabelecimento. Funcionário, caixa e estoque não recebem acesso por padrão. N1/equipe autorizada trata chamados; campos de estado e escopo são escritos pelo backend.

### `chamados_suporte/{idChamado}/mensagens/{idMensagem}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idMensagem` | string | sim | ID idempotente. |
| `idChamado` | string | sim | Documento pai. |
| `sequencia` | inteiro | sim | Crescente e estável. |
| `idRemetente` | string ou null | não | Nulo somente para o sistema. |
| `tipoRemetente` | string | sim | `solicitante`, `atendente` ou `sistema`. |
| `nivelAcessoFotografia` | string ou null | não | Papel do remetente. |
| `tipoMensagem` | string | sim | `texto`, `evento_status` ou `nota_interna`. |
| `visibilidade` | string | sim | `participantes` ou `somente_equipe`. |
| `conteudo` | string ou null | não | Texto limitado; conteúdo ou anexo é obrigatório. |
| `anexos` | lista de mapas limitados | não | Até cinco metadados privados validados. |
| `quantidadeAnexos` | inteiro | sim | Contador coerente. |
| `idCorrelacao` | string | sim | Rastreabilidade. |
| `chaveIdempotenciaHash` | string | sim | Evita repetição. |
| `versaoEsquema` | inteiro | sim | Versão. |
| `criadoEm` | timestamp | sim | Mensagem imutável. |

Solicitante nunca cria nota interna nem documento de mensagem diretamente. Uma Function valida participação e chave idempotente, deriva remetente, papel, visibilidade e sequência, associa somente anexos aprovados e atualiza mensagem e projeções do cabeçalho na mesma transação. A leitura do participante passa por Function e restringe `visibilidade = participantes`; arquivos órfãos entram em limpeza controlada.

## Notificações

### `notificacoes/{idNotificacao}`

Há um documento por destinatário. A caixa interna é o registro para o usuário; FCM é apenas transporte e `eventos_saida` controla a tentativa de envio.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idNotificacao` | string | sim | ID determinístico por evento, usuário e tipo. |
| `idUsuario` | string | sim | Único destinatário. |
| `idEstabelecimento` | string ou null | não | Contexto, não autorização isolada. |
| `categoria` | string | sim | `pedido`, `pagamento`, `entrega`, `estoque`, `avaliacao`, `suporte`, `assinatura`, `carteira` ou `sistema`. |
| `tipoNotificacao` | string | sim | Evento de lista fechada definida abaixo. |
| `tipoEntidade` | string ou null | não | Tipo do recurso de destino. |
| `idEntidade` | string ou null | não | ID conhecido do recurso. |
| `titulo` | string | sim | Título da caixa interna. |
| `mensagem` | string | sim | Texto interno seguro. |
| `tituloNotificacaoRemota` | string ou null | não | Versão mínima para tela bloqueada. |
| `mensagemNotificacaoRemota` | string ou null | não | Nunca contém segredo ou dado sensível. |
| `acaoNavegacao` | mapa fechado | não | Tela e IDs permitidos; nunca rota arbitrária. |
| `prioridade` | string | sim | `normal` ou `alta`. |
| `respeitaPreferencia` | booleano | sim | Preferência pode suprimir envio remoto opcional. |
| `statusNotificacao` | string | sim | `agendada`, `disponivel`, `cancelada` ou `expirada`. |
| `statusEnvioRemotoAtual` | string | sim | `nao_solicitado`, `pendente`, `enviado`, `parcial`, `falhou` ou `sem_dispositivo`. |
| `lida` | booleano | sim | Único estado alterável pelo destinatário junto aos campos relacionados. |
| `arquivada` | booleano | sim | Estado da caixa. |
| `idEventoOrigem` | string | sim | Evento confiável de negócio. |
| `idCorrelacao` | string | sim | Rastreabilidade. |
| `chaveIdempotenciaHash` | string | sim | Deduplicação. |
| `disponivelEm` | timestamp | sim | Início da exibição. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Estado de leitura/envio. |
| `lidaEm` | timestamp ou null | não | Leitura. |
| `arquivadaEm` | timestamp ou null | não | Arquivamento. |
| `enviadaRemotaEm` | timestamp ou null | não | Último envio confirmado. |
| `excluirEm` | timestamp ou null | não | TTL da caixa somente após prazo aprovado. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |

`acaoNavegacao` aceita somente as chaves `tipoDestino`, `idEntidade` e, quando necessário, `idEstabelecimento`. `tipoDestino` pertence à lista `pedido`, `entrega`, `produto`, `avaliacao`, `chamado`, `assinatura`, `carteira` ou `sistema`; o aplicativo monta a rota localmente e ignora chave extra.

Tipos iniciais do cliente: `pedido_criado`, `pagamento_confirmado`, `pedido_aceito`, `pedido_em_preparo`, `pedido_pronto_para_retirada`, `pedido_pronto_para_entrega`, `motoboy_aceitou`, `motoboy_saiu_para_entrega`, `motoboy_proximo`, `motoboy_chegou`, `pedido_entregue`, `pedido_cancelado`, `reembolso_processado` e `pedido_agendado_confirmado`.

Tipos do estabelecimento: `novo_pedido`, `pagamento_confirmado`, `pedido_cancelado`, `estoque_baixo`, `nova_avaliacao`, `novo_chamado_suporte`, `assinatura_proxima_vencimento`, `assinatura_vencida` e `pedido_agendado_proximo`. Tipos do motoboy: `nova_entrega_disponivel`, `entrega_aceita`, `entrega_cancelada`, `observacao_cliente_alterada`, `pagamento_entrega_disponivel` e `repasse_disponivel`.

O backend cria a notificação somente após confirmar o evento. Ela nunca contém código de entrega, endereço exato, denúncia, dado fiscal, token FCM ou detalhe financeiro sensível. O usuário altera apenas leitura e arquivamento; falha no envio remoto não reverte a operação de negócio. Enquanto o prazo de 90 dias não for aprovado, `excluirEm` fica `null`; depois da aprovação, ele é calculado a partir de `disponivelEm`, nunca antes da disponibilidade de uma notificação agendada.

## Comprovantes de pedidos

### `comprovantes_pedidos/{idComprovante}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idComprovante` | string | sim | ID determinístico por pedido, tipo e versão. |
| `idPedido` | string | sim | Pedido de origem. |
| `idCliente` | string | sim | Titular. |
| `idEstabelecimento` | string | sim | Escopo. |
| `idPagamento` | string ou null | não | Pagamento relacionado. |
| `tipoComprovante` | string | sim | `recibo_simples` ou `comprovante_pagamento`. |
| `versaoComprovante` | inteiro | sim | Versão imutável. |
| `statusComprovante` | string | sim | `solicitado`, `gerando`, `disponivel`, `falhou`, `substituido` ou `cancelado`. |
| `numeroPedidoExibicao` | string | sim | Número amigável fotografado. |
| `nomeEstabelecimentoFotografia` | string | sim | Nome no momento da geração. |
| `pedidoCriadoEm` | timestamp | sim | Data do pedido. |
| `tipoAtendimentoFotografia` | string | sim | Tipo aplicado. |
| `valorTotalCentavos` | inteiro | sim | Total confirmado. |
| `moeda` | string | sim | `BRL`. |
| `caminhoStorage` | string ou null | não | Arquivo privado, nunca URL pública permanente. |
| `tipoMimeValidado` | string ou null | não | Tipo real validado. |
| `hashSha256` | string ou null | não | Integridade do arquivo. |
| `tamanhoBytes` | inteiro ou null | não | Tamanho validado. |
| `idVersaoAnterior` | string ou null | não | Encadeamento. |
| `idVersaoSubstituta` | string ou null | não | Encadeamento. |
| `motivoFalhaCodigo` | string ou null | não | Falha sanitizada. |
| `tentativasGeracao` | inteiro | sim | Controle de repetição. |
| `idCorrelacao` | string | sim | Rastreabilidade. |
| `chaveIdempotenciaHash` | string | sim | Deduplicação. |
| `fotografiaPedidoHash` | string | sim | Versão do conteúdo de origem. |
| `bloqueioDescarte` | booleano | sim | Suspende descarte por obrigação. |
| `versaoEsquema` | inteiro | sim | Versão. |
| `criadoEm` | timestamp | sim | Solicitação. |
| `atualizadoEm` | timestamp | sim | Estado atual. |
| `geradoEm` | timestamp ou null | não | Geração. |
| `disponibilizadoEm` | timestamp ou null | não | Disponibilidade. |
| `substituidoEm` | timestamp ou null | não | Substituição. |
| `canceladoEm` | timestamp ou null | não | Cancelamento. |
| `reterAte` | timestamp ou null | não | Prazo obrigatório quando aprovado. |
| `excluirEm` | timestamp ou null | não | Só é definido após a política permitir descarte. |

Fluxo: `solicitado -> gerando -> disponivel | falhou`; `falhou -> gerando`; `disponivel -> substituido | cancelado`. Em uma versão disponível, arquivo, hashes, fotografia de origem, tipo, valores e número da versão são imutáveis. O backend pode alterar somente metadados do ciclo, como estado, vínculos de substituição e respectivas datas; correção cria outra versão. O recibo simples usa a fotografia do pedido, o comprovante de pagamento exige pagamento confirmado e nenhum deles contém dados de cartão.

`nota_fiscal_futura`, citada como tipo no prompt resumido, não será tratada como comprovante: documentos fiscais reais usam `documentos_fiscais`. Todo recibo simples declara que não é nota fiscal. Cliente, dono/gerente e caixa autorizado acessam somente comprovantes do próprio escopo; backend é o único escritor.

## Documentos legais e consentimentos

### `documentos_legais/{idDocumento}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idDocumento` | string | sim | ID determinístico por tipo, idioma e versão, sem conteúdo pessoal. |
| `tipoDocumento` | string | sim | `termos_uso` ou `politica_privacidade`. |
| `idioma` | string | sim | Inicialmente `pt_BR`. |
| `versaoDocumento` | string | sim | Versão de negócio imutável após publicação. |
| `titulo` | string | sim | Título público. |
| `conteudoMarkdown` | string | sim | Conteúdo público limitado e isento de indexação. |
| `hashConteudoSha256` | string | sim | Evidência exata da versão aceita. |
| `statusDocumento` | string | sim | `rascunho`, `publicado`, `substituido`, `revogado` ou `descartado`. |
| `atual` | booleano | sim | Projeção da versão vigente por tipo e idioma. |
| `exigeNovoAceite` | booleano | sim | Obriga novo aceite quando aplicável. |
| `vigenciaInicio` | timestamp | sim | Início da vigência. |
| `publicadoEm` | timestamp ou null | não | Publicação. |
| `substituidoPorId` | string ou null | não | Nova versão. |
| `motivoRevogacaoCodigo` | string ou null | não | Motivo padronizado. |
| `versaoEsquema` | inteiro | sim | Versão. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Última transição. |

Fluxo: `rascunho -> publicado | descartado`; `publicado -> substituido | revogado`. Conteúdo, versão e hash publicados são imutáveis; somente metadados do ciclo podem mudar pelo backend. Uma correção cria nova versão. Identidades de autoria e publicação ficam na auditoria, não no documento público.

Documento atual pode ser consultado pelos filtros previstos. Versões históricas `substituido` ou `revogado` são obtidas apenas por ID conhecido referenciado pelo consentimento; não há listagem pública de rascunhos ou histórico completo. Escrita ocorre somente por Function autorizada e auditada. Não há TTL para versão publicada ou referenciada.

### `controles_documentos_legais/{idControleDocumento}`

Documento privado e determinístico por tipo e idioma; todas as publicações disputam a mesma trava transacional.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idControleDocumento` | string | sim | Derivado de tipo e idioma. |
| `tipoDocumento` | string | sim | Mesmo catálogo legal. |
| `idioma` | string | sim | Inicialmente `pt_BR`. |
| `idDocumentoAtual` | string ou null | não | Versão publicada vigente. |
| `versaoDocumentoAtual` | string ou null | não | Versão vigente. |
| `hashConteudoAtual` | string ou null | não | Hash vigente. |
| `idDocumentoAgendado` | string ou null | não | No máximo uma publicação futura no MVP. |
| `agendadoPara` | timestamp ou null | não | Início futuro. |
| `ultimaSequenciaPublicacao` | inteiro | sim | Cresce em cada publicação. |
| `versaoControle` | inteiro | sim | Controle otimista. |
| `atualizadoPor` | string | sim | N1, em documento privado. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

Publicar lê e atualiza este controle, a versão anterior e a nova na mesma transação. Assim, duas Functions concorrentes conflitam no mesmo documento mesmo quando ainda não existe versão publicada. O controle não é público.

### `consentimentos_usuarios/{idConsentimento}`

Esta coleção é append-only. Um booleano mutável não comprovaria revogações, recusas e novos aceites.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idConsentimento` | string | sim | ID determinístico por estado de consentimento e chave idempotente protegida. |
| `idUsuario` | string | sim | Titular. |
| `idEstadoConsentimento` | string | sim | Projeção determinística de usuário e tipo. |
| `numeroSequencia` | inteiro | sim | Cresce em uma unidade por projeção. |
| `tipoConsentimento` | string | sim | `termos_uso`, `politica_privacidade`, `uso_localizacao`, `notificacoes` ou `compartilhamento_dados_entrega`. |
| `acaoConsentimento` | string | sim | `aceite`, `recusa` ou `revogacao`. |
| `idDocumento` | string ou null | não | Obrigatório para termos e política. |
| `versaoDocumento` | string ou null | não | Versão publicada. |
| `hashConteudoSha256` | string ou null | não | Deve coincidir com o documento legal. |
| `finalidadeCodigo` | string | sim | Finalidade aprovada. |
| `baseLegalCodigo` | string | sim | Base definida pela governança; não presume consentimento para todo tratamento. |
| `origem` | string | sim | `app_flutter`, `painel_web` ou processo autorizado. |
| `idioma` | string | sim | Inicialmente `pt_BR`. |
| `idDispositivo` | string ou null | não | Somente quando necessário. |
| `estadoPermissaoSistema` | string ou null | não | Fotografia opcional da permissão do sistema operacional. |
| `enderecoIpHmac` | string ou null | não | Somente com finalidade e prazo aprovados. |
| `versaoChaveIp` | inteiro ou null | não | Rotação da chave HMAC. |
| `agenteUsuarioResumo` | string ou null | não | Resumo limitado; não impressão digital detalhada. |
| `chaveIdempotenciaHash` | string | sim | Deduplicação. |
| `resumoRequisicaoHash` | string | sim | Detecta reutilização da chave com conteúdo diferente. |
| `versaoEsquema` | inteiro | sim | Versão. |
| `criadoEm` | timestamp | sim | Data do servidor; evento imutável. |

O backend confirma documento publicado, versão e hash antes do aceite. O ID do evento deriva somente de `idEstadoConsentimento` e da chave idempotente protegida, nunca da sequência ou do timestamp. A transação lê primeiro esse ID: se já existir com o mesmo `resumoRequisicaoHash`, retorna o evento anterior sem incrementar a projeção; se o resumo divergir, responde conflito. Somente quando o evento ainda não existe a transação lê a projeção, atribui a próxima sequência, cria o evento e atualiza o estado. Revogar consentimento opcional interrompe o tratamento correspondente; retirar aceite obrigatório pode iniciar desativação, sem apagar a evidência histórica. Permissão do Android, iOS ou navegador não substitui este registro.

O titular consulta uma representação sanitizada por Function; a coleção bruta permanece restrita porque o Firestore não oculta `enderecoIpHmac` ou outros campos por leitura. Enquanto finalidade e prazo próprios não forem formalmente aprovados, `idDispositivo`, `enderecoIpHmac`, `versaoChaveIp` e `agenteUsuarioResumo` permanecem `null`. Uma futura necessidade de evidência técnica com retenção menor exigirá documento restrito separado e nova versão do modelo. Não se habilita TTL antes de aprovar a finalidade e a retenção da evidência.

### `estados_consentimentos_usuarios/{idEstadoConsentimento}`

Projeção privada com ID determinístico por usuário e tipo de consentimento.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idEstadoConsentimento` | string | sim | ID determinístico. |
| `idUsuario` | string | sim | Titular. |
| `tipoConsentimento` | string | sim | Mesmo catálogo dos eventos. |
| `estadoAtual` | string | sim | `aceito`, `recusado` ou `revogado`. |
| `numeroSequencia` | inteiro | sim | Última sequência aplicada. |
| `idUltimoConsentimento` | string | sim | Evento canônico. |
| `idDocumento` | string ou null | não | Documento legal atual para este estado. |
| `versaoDocumento` | string ou null | não | Versão. |
| `hashConteudoSha256` | string ou null | não | Hash aceito. |
| `finalidadeCodigo` | string | sim | Finalidade. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |
| `versaoEsquema` | inteiro | sim | Versão. |

Cada aceite, recusa ou revogação primeiro deduplica pelo ID determinístico do evento. Apenas uma chave nova incrementa a sequência, cria o evento imutável e atualiza este documento na mesma transação. Repetição com a mesma chave e conteúdo retorna o evento anterior; conteúdo divergente gera conflito. A Function sanitiza a consulta do titular; clientes não escrevem a projeção.

## Solicitações LGPD

### `solicitacoes_lgpd/{idSolicitacao}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idSolicitacao` | string | sim | ID determinístico por usuário e chave idempotente protegida. |
| `protocoloPublico` | string | sim | Código aleatório de acompanhamento. |
| `idUsuario` | string | sim | Titular autenticado. |
| `tipoSolicitacao` | string | sim | `acesso`, `exportacao`, `correcao`, `portabilidade`, `revogacao`, `oposicao`, `anonimizacao`, `bloqueio`, `eliminacao` ou `desativacao`. |
| `statusSolicitacao` | string | sim | Estado canônico. |
| `descricaoTitular` | string ou null | não | Texto sanitizado e limitado. |
| `escoposDados` | lista de strings | sim | Lista fechada e pequena. |
| `statusValidacaoIdentidade` | string | sim | `pendente`, `validada` ou `falhou`. |
| `metodoValidacaoCodigo` | string | sim | Método, sem guardar prova bruta. |
| `idResponsavelAtual` | string ou null | não | Operador de privacidade. |
| `prazoRespostaEm` | timestamp | sim | Prazo conforme política aprovada. |
| `motivoPendenciaCodigo` | string ou null | não | Motivo seguro. |
| `motivoNegativaCodigo` | string ou null | não | Motivo comunicável. |
| `retencoesAplicadas` | lista de mapas limitados | não | Categoria, justificativa e prazo. |
| `resultadoResumo` | string ou null | não | Resposta segura ao titular. |
| `caminhoExportacaoStorage` | string ou null | não | Arquivo privado e temporário. |
| `hashArquivoSha256` | string ou null | não | Integridade. |
| `arquivoDisponivelAte` | timestamp ou null | não | Validade curta do download. |
| `excluirArquivoEm` | timestamp ou null | não | Ciclo de vida do arquivo, coordenado com Storage. |
| `idCorrelacao` | string | sim | Liga execução e auditoria. |
| `chaveIdempotenciaHash` | string | sim | Deduplicação da abertura. |
| `resumoRequisicaoHash` | string | sim | Detecta reutilização da chave com conteúdo diferente. |
| `versaoEstado` | inteiro | sim | Controle de transições. |
| `statusRetornoAposEspera` | string ou null | não | Somente `validando_identidade`, `em_analise` ou `em_execucao`; `null` fora de `aguardando_usuario`. |
| `sequenciaUltimaInteracao` | inteiro | sim | Ordem estável do histórico. |
| `idUltimaInteracao` | string | sim | Último evento aplicado. |
| `bloqueioDescarte` | booleano | sim | Suspende descarte de evidências quando justificado. |
| `versaoEsquema` | inteiro | sim | Versão. |
| `criadoEm` | timestamp | sim | Recebimento. |
| `atualizadoEm` | timestamp | sim | Atualização. |
| `concluidoEm` | timestamp ou null | não | Conclusão. |
| `canceladoEm` | timestamp ou null | não | Cancelamento. |
| `excluirEm` | timestamp ou null | não | TTL somente após aprovação da retenção. |

Fluxo principal: `recebida -> validando_identidade -> em_analise -> em_execucao -> concluida | parcialmente_atendida`. `validando_identidade` ou `em_analise` também pode ir para `negada` com motivo comunicável. `validando_identidade`, `em_analise` ou `em_execucao` pode ir para `aguardando_usuario`, gravando o estado de retorno permitido; ao sair da espera, o campo volta a `null`. `recebida`, `validando_identidade`, `em_analise` ou `aguardando_usuario` pode ir para `cancelada`; durante `em_execucao`, cancelamento só ocorre se ainda não houver efeito irreversível e o backend confirmar. Estado terminal não reabre.

Exclusão de conta não remove pedido, pagamento, documento fiscal ou auditoria sujeitos a retenção. Nesses casos, o processo anonimiza ou restringe, registra categoria e justificativa e informa o titular. Exportações incluem apenas dados do titular e tratam informações de terceiros. A coleção bruta é restrita; o titular recebe visão sanitizada por Function. Toda decisão e execução gera auditoria; observações internas e provas de identidade ficam apenas em interações `somente_equipe` ou sistemas próprios.

A Function de abertura lê primeiro o ID determinístico. Mesma chave e mesmo `resumoRequisicaoHash` retornam a solicitação anterior; conteúdo divergente gera conflito. Para chave nova, cabeçalho e interação inicial `abertura`, com `sequencia = 1`, são criados na mesma transação, e `idUltimaInteracao` e `sequenciaUltimaInteracao` já apontam para esse evento.

### `solicitacoes_lgpd/{idSolicitacao}/interacoes/{idInteracao}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idInteracao` | string | sim | ID idempotente. |
| `idSolicitacao` | string | sim | Documento pai. |
| `sequencia` | inteiro | sim | Ordem crescente. |
| `tipoInteracao` | string | sim | `abertura`, `complemento_titular`, `solicitacao_informacao`, `resposta_equipe`, `transicao`, `decisao` ou `execucao`. |
| `idAutor` | string ou null | não | Nulo somente para sistema. |
| `tipoAutor` | string | sim | `titular`, `equipe_privacidade` ou `sistema`. |
| `visibilidade` | string | sim | `titular_e_equipe` ou `somente_equipe`. |
| `conteudo` | string ou null | não | Texto limitado e sanitizado. |
| `anexos` | lista de mapas limitados | não | Até cinco metadados do contrato comum. |
| `quantidadeAnexos` | inteiro | sim | Coerente com a lista. |
| `statusAnterior` | string ou null | não | Estado anterior. |
| `statusNovo` | string ou null | não | Estado resultante. |
| `idCorrelacao` | string | sim | Auditoria. |
| `criadoEm` | timestamp | sim | Evento imutável. |

O aplicativo nunca cria interação diretamente. Uma Function valida o titular ou operador, deriva autor, tipo, visibilidade e sequência, associa somente anexos aprovados e atualiza o cabeçalho na mesma transação. O titular nunca cria `somente_equipe`; toda visão do titular, inclusive das interações `titular_e_equipe`, é consultada e sanitizada pela Function no pai conhecido, sem leitura direta do SDK.

## Auditoria

### `logs_auditoria/{idLog}`

Os campos integrais `valorAntigo` e `valorNovo` do prompt são substituídos por diferenças mínimas e mascaradas para não duplicar dados sensíveis.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idLog` | string | sim | Evento imutável. |
| `idCorrelacao` | string | sim | Liga a operação completa. |
| `acao` | string | sim | Código padronizado. |
| `categoriaAcao` | string | sim | `acesso`, `seguranca`, `financeiro`, `fiscal`, `lgpd`, `estoque`, `permissao` ou outra categoria fechada. |
| `tipoEntidade` | string | sim | Tipo afetado. |
| `idEntidade` | string | sim | ID afetado. |
| `idEstabelecimento` | string ou null | não | Escopo quando aplicável. |
| `tipoAtor` | string | sim | `usuario`, `sistema` ou `integracao`. |
| `executadoPor` | string | sim | UID ou identificador técnico controlado. |
| `nivelAcessoFotografia` | string | sim | Papel no momento da ação. |
| `origem` | string | sim | Aplicativo, painel, Function ou integração. |
| `resultado` | string | sim | `sucesso`, `negado` ou `falha`. |
| `motivoCodigo` | string ou null | não | Motivo sanitizado. |
| `camposAlterados` | lista de strings | não | Caminhos permitidos e limitados. |
| `resumoAlteracao` | mapa fechado | não | Valores mascarados ou hashes; nunca documento completo. |
| `enderecoIpHmac` | string ou null | não | Somente quando aprovado. |
| `agenteUsuarioResumo` | string ou null | não | Resumo técnico limitado. |
| `ambiente` | string | sim | `desenvolvimento`, `homologacao` ou `producao`. |
| `versaoEvento` | inteiro | sim | Contrato do evento. |
| `bloqueioDescarte` | booleano | sim | Retenção por investigação ou obrigação. |
| `criadoEm` | timestamp | sim | Data do servidor; append-only. |
| `excluirEm` | timestamp ou null | não | TTL somente após política aprovada. |

A escrita é exclusiva do backend; clientes não atualizam nem excluem logs. É proibido registrar senha, token, código de entrega, CPF/CNPJ completo, endereço completo, localização precisa, corpo bruto de pagamento ou documento. O SDK cliente não lê a coleção, nem mesmo para a tela N1: pesquisa e exportação passam por Function administrativa que registra finalidade, filtros, volume e ator. Acesso emergencial de infraestrutura segue procedimento separado e registros da plataforma. Se o estabelecimento precisar de histórico, recebe projeção sanitizada, não o log bruto.

Ações mínimas auditadas: preço e estoque; permissão e vínculo; bloqueios; assinatura e plano; cancelamento e reembolso; aprovação/reprovação de estabelecimento ou motoboy; região e taxa; operação fiscal; modo manutenção; tratamento LGPD; revisão antifraude; exportação de dados; restauração e alteração de configuração sensível.

## Regiões atendidas e taxa de entrega

### `regioes_atendidas/{idRegiao}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idRegiao` | string | sim | ID opaco da versão da região. |
| `escopoRegiao` | string | sim | `plataforma` ou `estabelecimento`. |
| `idEstabelecimento` | string ou null | não | Obrigatório no escopo de estabelecimento. |
| `nome` | string | sim | Nome administrativo. |
| `efeitoAtendimento` | string | sim | `permitir` ou `bloquear`. |
| `tipoGeometria` | string | sim | `cidade`, `bairros`, `raio` ou `poligono`. |
| `estado` | string | sim | UF normalizada. |
| `cidade` | string | sim | Nome para exibição. |
| `cidadeNormalizada` | string | sim | Valor de busca determinística. |
| `bairrosNormalizados` | lista de strings | não | Lista limitada usada somente no tipo `bairros`. |
| `centro` | geopoint ou null | não | Obrigatório para raio. |
| `raioMetros` | inteiro ou null | não | Obrigatório para raio. |
| `verticesPoligono` | lista de geopoints | não | Polígono limitado e fora de indexação. |
| `caixaDelimitadora` | mapa fechado | não | Pré-filtro geométrico. |
| `prefixosGeohash` | lista de strings | não | Candidatos limitados; validação exata continua no backend. |
| `taxaMinimaEntregaCentavos` | inteiro | sim | Restrição regional não negativa. |
| `valorMinimoPedidoCentavos` | inteiro | sim | Restrição regional não negativa. |
| `prioridade` | inteiro | sim | Desempate determinístico. |
| `statusRegiao` | string | sim | `rascunho`, `agendada`, `ativa`, `inativa` ou `substituida`. |
| `validoDe` | timestamp | sim | Início inclusivo. |
| `validoAte` | timestamp ou null | não | Fim exclusivo. |
| `versaoRegra` | inteiro | sim | Versão fotografada no pedido. |
| `substituidaPorId` | string ou null | não | Nova versão. |
| `criadoPor` | string | sim | Ator autorizado. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Última transição. |

Exatamente uma geometria deve corresponder ao tipo. O Firestore não executa ponto-em-polígono: a Function busca candidatos por cidade/bairro ou geohash e valida raio/polígono. Cliente consulta elegibilidade por Function e nunca baixa todas as geometrias.

Precedência canônica:

1. Ausência de região `permitir` ativa da plataforma para o destino resulta em não atendimento.
2. Qualquer região `bloquear` da plataforma que contenha o ponto encerra a avaliação como bloqueada.
3. O estabelecimento também precisa de uma região `permitir` correspondente; bloqueio próprio correspondente vence qualquer permissão própria.
4. Entre permissões correspondentes, vence maior `prioridade`; em empate, a geometria mais específica segue `poligono`, `raio`, `bairros`, `cidade`; novo empate usa o menor ID em ordem lexical.
5. O backend registra no pedido os IDs e versões das regiões vencedoras e de qualquer bloqueio aplicado.

Fluxo: `rascunho -> agendada | ativa | inativa`; `agendada -> ativa | inativa`; `ativa -> substituida | inativa`. Ativar ou substituir passa pelo backend e gera auditoria. O estado `ativa` nunca basta sozinho: em toda elegibilidade e cálculo o backend também confirma `validoDe <= instanteReferencia` e `validoAte = null` ou `instanteReferencia < validoAte`. Atraso em rotina de ativação ou expiração não amplia a vigência. Versões referenciadas por pedidos são preservadas. Geometrias acima dos limites internos exigirão divisão por células/documentos, não crescimento do mesmo array.

### `configuracoes_taxa_entrega/{idConfiguracaoTaxa}`

Taxa base, frete grátis, pico e tipo de motoboy podem ser combinados; por isso, um único `tipoCalculo` não é suficiente.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idConfiguracaoTaxa` | string | sim | ID opaco da versão. |
| `idEstabelecimento` | string | sim | Escopo. |
| `nome` | string | sim | Nome administrativo. |
| `versaoRegra` | inteiro | sim | Versão fotografada no pedido. |
| `statusConfiguracao` | string | sim | `rascunho`, `agendada`, `ativa`, `inativa` ou `substituida`. |
| `vigenteDe` | timestamp | sim | Início. |
| `vigenteAte` | timestamp ou null | não | Fim exclusivo. |
| `substituidaPorId` | string ou null | não | Nova versão. |
| `tipoCalculoBase` | string | sim | `fixa`, `por_km`, `por_regiao` ou `personalizada`. |
| `taxaFixaCentavos` | inteiro ou null | não | Base fixa. |
| `valorPorKmCentavos` | inteiro ou null | não | Valor por quilômetro, sem ponto flutuante monetário. |
| `distanciaIncluidaMetros` | inteiro | sim | Franquia da base. |
| `distanciaMaximaMetros` | inteiro ou null | não | Limite operacional. |
| `taxaMinimaCentavos` | inteiro | sim | Piso. |
| `taxaMaximaCentavos` | inteiro ou null | não | Teto. |
| `taxasPorRegiao` | lista de mapas limitados | não | Pares únicos `idRegiao` e `valorCentavos`, exclusivamente para regiões do estabelecimento. |
| `freteGratisAtivo` | booleano | sim | Habilita gratuidade. |
| `valorMinimoFreteGratisCentavos` | inteiro ou null | não | Limite para gratuidade. |
| `taxaDinamicaAtiva` | booleano | sim | Habilita faixas de pico. |
| `faixasDinamicas` | lista de mapas limitados | não | Dia, início, fim, tipo e valor do ajuste. |
| `modificadorMotoboyProprio` | mapa fechado | não | Tipo e valor do ajuste. |
| `modificadorMotoboyAutonomo` | mapa fechado | não | Tipo e valor do ajuste. |
| `politicaTipoMotoboy` | string | sim | `independente_taxa_cliente` no MVP. |
| `fusoHorario` | string | sim | Fuso IANA. |
| `prioridade` | inteiro | sim | Desempate. |
| `criadoPor` | string | sim | Ator autorizado. |
| `criadoEm` | timestamp | sim | Criação. |
| `atualizadoPor` | string | sim | Último ator. |
| `atualizadoEm` | timestamp | sim | Atualização. |
| `versaoEsquema` | inteiro | sim | Versão. |

Fluxo: `rascunho -> agendada | ativa | inativa`; `agendada -> ativa | inativa`; `ativa -> substituida | inativa`. Configuração ativa não é editada; mudança cria versão. Faixas do mesmo dia não se sobrepõem e o resultado não pode ser negativo. `personalizada` permanece indisponível até receber contrato próprio versionado.

Contrato condicional do cálculo base:

- `fixa`: exige `taxaFixaCentavos >= 0`; `valorPorKmCentavos = null`, `distanciaIncluidaMetros = 0` e `taxasPorRegiao` vazia.
- `por_km`: exige `taxaFixaCentavos >= 0`, `valorPorKmCentavos >= 0` e `distanciaIncluidaMetros >= 0`; `taxasPorRegiao` fica vazia.
- `por_regiao`: exige `taxasPorRegiao` não vazia, valores não negativos e no máximo um par para cada `idRegiao` do mesmo estabelecimento; `taxaFixaCentavos = null`, `valorPorKmCentavos = null` e `distanciaIncluidaMetros = 0`.
- `personalizada`: não pode ser ativada no MVP.

Fórmula canônica do cliente, sempre com uma região vencedora da plataforma e outra do estabelecimento:

1. Validar vigência, permissões e bloqueios das duas regiões e obter a configuração vigente pelo controle transacional; sem qualquer uma delas, a entrega não fecha checkout.
2. Calcular `valorProdutosElegivelCentavos = max(0, subtotalProdutosCentavos - descontoProdutosCentavos - descontoCupomItensCentavos)`. Definir `valorMinimoPedidoPlataformaCentavos` e `valorMinimoPedidoEstabelecimentoCentavos` a partir das regiões vencedoras, calcular `valorMinimoPedidoEfetivoCentavos = max(valorMinimoPedidoPlataformaCentavos, valorMinimoPedidoEstabelecimentoCentavos)` e rejeitar checkout cujo valor elegível seja menor. A mesma base elegível testa o limite da gratuidade.
3. Se `distanciaMaximaMetros` existir e `distanciaMetros` a exceder, rejeitar a entrega. Calcular `metrosCobraveis = max(0, distanciaMetros - distanciaIncluidaMetros)`. Em `fixa`, a base é `taxaFixaCentavos`. Em `por_km`, é `taxaFixaCentavos + arredondar_metade_para_cima(valorPorKmCentavos * metrosCobraveis / 1000)`. Em `por_regiao`, procurar em `taxasPorRegiao` somente o ID da região vencedora do estabelecimento; ausência do par invalida o checkout.
4. Aplicar ajuste de pico da faixa vigente, primeiro percentual em pontos-base e depois valor fixo em centavos.
5. Definir `taxaMinimaPlataformaCentavos` e `taxaMinimaEstabelecimentoCentavos` a partir das regiões vencedoras, calcular `pisoEfetivoCentavos = max(taxaMinimaCentavos, taxaMinimaPlataformaCentavos, taxaMinimaEstabelecimentoCentavos)` e aplicar esse piso.
6. Se `taxaMaximaCentavos` existir, ela precisa ser maior ou igual ao piso efetivo para o destino; caso contrário, a configuração é inválida, o checkout é bloqueado e a divergência é registrada. Com o contrato válido, aplicar o teto.
7. Se a condição de frete grátis for satisfeita, o valor final do cliente vira zero depois dos demais cálculos.

Todo valor intermediário é inteiro em centavos; empates de divisão usam arredondamento para o centavo mais próximo, metade para cima. No MVP, `politicaTipoMotoboy = independente_taxa_cliente`: modificadores de motoboy alteram apenas custo logístico, ganho e margem após a atribuição, nunca o valor já cobrado do cliente. A Function aplica o modificador a `pedidos_privados.valorMotoboyPrevistoCentavos`, com piso zero, grava o mesmo valor efetivo em `ofertas_entregas.valorMotoboyCentavos` e, no aceite, em `entregas_privadas.valorMotoboyCentavos`. Ao concluir, `transacoes_motoboys.valorCentavos` do tipo `taxa_entrega` deve coincidir com a entrega privada. Diferença em relação à previsão gera reconciliação financeira idempotente, sem alterar a taxa do cliente. Se ocorrer troca entre próprio e autônomo, a plataforma ou o estabelecimento absorve a diferença conforme fotografia financeira. Uma política futura que defina grupo no checkout exigirá nova versão do modelo.

Cada faixa dinâmica usa o mapa fechado `diasSemana`, `inicioMinuto`, `fimMinuto`, `tipoAjuste`, `percentualPontosBase` e `valorCentavos`; apenas o campo correspondente a `percentual` ou `valor_fixo` é preenchido. Cada modificador de motoboy usa `tipoAjuste`, `percentualPontosBase` e `valorCentavos` com a mesma regra condicional.

O backend fotografa IDs e versões das duas regiões, configuração, distância, metros cobráveis, pedido mínimo efetivo, base, ajustes, piso, teto, gratuidade e total em `pedidos_privados.regraTaxaEntregaFotografia`. `estabelecimentos.taxaEntregaPadraoCentavos` é apenas projeção da configuração vigente e não serve de fallback autoritativo.

Distância por rota depende de fornecedor futuro. Na fase gratuita, somente cálculo simulado no Emulator é permitido e deve ser identificado como tal.

### `controles_taxas_entrega/{idEstabelecimento}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idEstabelecimento` | string | sim | Mesmo ID do documento. |
| `idConfiguracaoVigente` | string ou null | não | Regra atual. |
| `versaoRegraVigente` | inteiro | sim | Zero quando ainda não houver regra. |
| `vigenteDe` | timestamp ou null | não | Início atual. |
| `vigenteAte` | timestamp ou null | não | Fim atual. |
| `idConfiguracaoAgendada` | string ou null | não | No máximo uma próxima versão no MVP. |
| `agendadaPara` | timestamp ou null | não | Ativação futura. |
| `ultimaVersaoRegra` | inteiro | sim | Sequência monotônica. |
| `versaoControle` | inteiro | sim | Conflito transacional. |
| `atualizadoPor` | string | sim | Ator autorizado. |
| `atualizadoEm` | timestamp | sim | Data do servidor. |

Criar, agendar, ativar ou substituir taxa lê e atualiza este documento e as versões afetadas na mesma transação. Assim duas configurações concorrentes disputam a mesma trava, inclusive na primeira ativação. O MVP permite só uma versão futura, eliminando sobreposição de agenda; ampliar isso exige documentos determinísticos por janela.

## Convites de funcionários

### `convites_funcionarios/{idConvite}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idConvite` | string | sim | ID determinístico por estabelecimento e chave idempotente protegida. |
| `idEstabelecimento` | string | sim | Escopo. |
| `enviadoPor` | string | sim | Dono ou gerente autorizado. |
| `meioConvite` | string | sim | `email` ou `telefone`. |
| `destinatarioHmac` | string ou null | sim | Contato protegido; removido após o prazo de minimização. |
| `versaoChaveDestinatario` | inteiro ou null | sim | Versão da chave enquanto `destinatarioHmac` existir. |
| `destinatarioMascarado` | string ou null | sim | Exibição administrativa mínima; também removida no prazo curto. |
| `nivelAcessoProposto` | string | sim | Um dos papéis permitidos de `n3` a `n6`. |
| `permissoesDelegadasPropostas` | lista de strings | sim | Capacidades pequenas e validadas. |
| `statusConvite` | string | sim | `pendente`, `aceito`, `cancelado` ou `expirado`. |
| `tokenHmac` | string ou null | sim | Obrigatório enquanto pendente e `null` em estado terminal. |
| `versaoChaveToken` | inteiro | sim | Rotação da chave. |
| `quantidadeTentativasInvalidas` | inteiro | sim | Contador atômico. |
| `maximoTentativas` | inteiro | sim | Limite fotografado. |
| `bloqueadoAte` | timestamp ou null | não | Bloqueio temporário. |
| `expiraEm` | timestamp | sim | Validade de negócio. |
| `aceitoPor` | string ou null | não | UID verificado. |
| `aceitoEm` | timestamp ou null | não | Aceite. |
| `canceladoPor` | string ou null | não | Ator. |
| `canceladoEm` | timestamp ou null | não | Cancelamento. |
| `expiradoEm` | timestamp ou null | não | Expiração processada. |
| `chaveIdempotenciaHash` | string | sim | Deduplicação. |
| `resumoRequisicaoHash` | string | sim | Detecta reutilização da chave com destinatário ou permissão diferente. |
| `criadoEm` | timestamp | sim | Data do servidor. |
| `atualizadoEm` | timestamp | sim | Estado. |
| `excluirEm` | timestamp ou null | não | Descarte posterior dos metadados mínimos. |
| `versaoEsquema` | inteiro | sim | Versão. |

Fluxo: `pendente -> aceito | cancelado | expirado`; estados terminais não reabrem. A criação lê primeiro o ID determinístico: mesma chave e mesmo `resumoRequisicaoHash` retornam o convite anterior; conteúdo diferente gera conflito. Aceite valida token, prazo, bloqueio, usuário autenticado e contato verificado correspondente. Na mesma transação, marca o convite, cria ou ativa `vinculos_estabelecimentos` e gera evento de auditoria.

Gerente não concede papel ou capacidade superior aos próprios; somente dono concede funções reservadas. Convidado e listagem administrativa usam Function sanitizada e não consultam a coleção bruta. O contato em claro é usado apenas durante o envio e não é persistido nesse documento; reenvio exige novo dado ou serviço futuro aprovado. Ao terminar, `tokenHmac` vira `null`; após o prazo curto, `destinatarioHmac`, `versaoChaveDestinatario` e `destinatarioMascarado` também viram `null`. Na fase gratuita, o envio é simulado no Emulator.

## Fiscal

### `documentos_fiscais/{idDocumentoFiscal}`

Esta estrutura fica preparada, sem emissão real. Testes da fase gratuita usam provedor simulado, `ambienteFiscal = homologacao` e `semValidadeFiscal = true`.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idDocumentoFiscal` | string | sim | ID interno. |
| `idEstabelecimento` | string | sim | Emitente ou responsável no escopo. |
| `idCliente` | string ou null | não | Destinatário quando aplicável. |
| `tipoOrigem` | string | sim | `pedido`, `assinatura`, `comissao`, `entrega` ou outra origem aprovada. |
| `idOrigem` | string | sim | ID da origem. |
| `idPedido` | string ou null | não | Pedido. |
| `idAssinatura` | string ou null | não | Assinatura. |
| `idPagamento` | string ou null | não | Pagamento. |
| `idPagamentoAssinatura` | string ou null | não | Fatura. |
| `tipoDocumentoFiscal` | string | sim | `nfe`, `nfce`, `nfse` ou tipo futuro aprovado. |
| `tipoOperacaoFiscal` | string | sim | Operação fiscal definida pelo provedor e contador. |
| `responsavelEmissao` | string | sim | `estabelecimento` ou `plataforma`, conforme política futura. |
| `ambienteFiscal` | string | sim | `homologacao` ou `producao`. |
| `provedorFiscal` | string | sim | `simulado` nesta fase. |
| `idDocumentoProvedor` | string ou null | não | Referência externa. |
| `semValidadeFiscal` | booleano | sim | Sempre verdadeiro nos testes atuais. |
| `statusDocumentoFiscal` | string | sim | Estado canônico. |
| `statusConciliacao` | string | sim | `nao_aplicavel`, `pendente`, `conciliado` ou `divergente`. |
| `numeroMascarado` | string ou null | não | Exibição mínima. |
| `serieMascarada` | string ou null | não | Exibição mínima. |
| `chaveAcessoHmac` | string ou null | não | Comparação protegida. |
| `versaoChaveAcesso` | inteiro ou null | não | Versão da chave enquanto `chaveAcessoHmac` existir. |
| `chaveAcessoMascarada` | string ou null | não | Exibição mínima. |
| `protocoloAutorizacaoProtegido` | string ou null | não | Dado restrito. |
| `emitenteFotografiaFiscal` | mapa fechado | sim | Dados privados fora de indexação. |
| `destinatarioFotografiaFiscal` | mapa fechado | não | Dados privados fora de indexação. |
| `valorProdutosCentavos` | inteiro | sim | Produtos. |
| `valorServicosCentavos` | inteiro | sim | Serviços. |
| `valorFreteCentavos` | inteiro | sim | Frete. |
| `valorDescontoCentavos` | inteiro | sim | Desconto. |
| `valorTributosInformadosCentavos` | inteiro | sim | Valor apenas quando provido pela integração válida. |
| `valorTotalCentavos` | inteiro | sim | Total. |
| `moeda` | string | sim | `BRL`. |
| `caminhoXmlStorage` | string ou null | não | Arquivo privado. |
| `caminhoPdfStorage` | string ou null | não | Arquivo privado. |
| `hashXmlSha256` | string ou null | não | Integridade. |
| `hashPdfSha256` | string ou null | não | Integridade. |
| `motivoRejeicaoCodigo` | string ou null | não | Motivo sanitizado. |
| `motivoCancelamentoCodigo` | string ou null | não | Motivo sanitizado. |
| `chaveIdempotenciaHash` | string | sim | Deduplicação. |
| `idCorrelacao` | string | sim | Rastreabilidade. |
| `versaoEsquema` | inteiro | sim | Versão. |
| `criadoEm` | timestamp | sim | Criação. |
| `atualizadoEm` | timestamp | sim | Estado. |
| `enviadoEm` | timestamp ou null | não | Envio. |
| `autorizadoEm` | timestamp ou null | não | Autorização. |
| `cancelamentoSolicitadoEm` | timestamp ou null | não | Pedido de cancelamento. |
| `cancelamentoRespondidoEm` | timestamp ou null | não | Resposta do provedor. |
| `protocoloCancelamentoProtegido` | string ou null | não | Evidência restrita. |
| `motivoRecusaCancelamentoCodigo` | string ou null | não | Recusa sanitizada. |
| `canceladoEm` | timestamp ou null | não | Cancelamento. |

Fluxo preparado: `pendente -> enviado -> autorizado | rejeitado | em_contingencia | erro_temporario`; `erro_temporario -> enviado | rejeitado`; `em_contingencia -> enviado | autorizado | rejeitado`; `autorizado -> cancelamento_pendente -> cancelado | autorizado`. O retorno a `autorizado` após tentativa de cancelamento exige evento externo imutável, horários, protocolo quando houver e `motivoRecusaCancelamentoCodigo`; a tentativa não é apagada. Respostas externas são deduplicadas em `eventos_webhooks` antes de atualizar a projeção fiscal.

Dados comerciais vêm da fotografia autoritativa do pedido, assinatura ou comissão. No contrato inicial, `valorTotalCentavos = valorProdutosCentavos + valorServicosCentavos + valorFreteCentavos - valorDescontoCentavos`; `valorTributosInformadosCentavos` é informativo e não é somado outra vez. Um provedor que exija outros componentes obriga nova versão do esquema e reconciliação explícita. Conteúdo autorizado é imutável; transições de ciclo apenas acrescentam metadados e eventos. Nenhuma credencial ou certificado fica no Firestore.

O provedor nunca escreve no Firestore: ele responde ao backend do MandaJá, e somente a conta de serviço persiste. A coleção bruta é restrita. Dono/função fiscal, cliente do pedido e N1 recebem visão sanitizada e download autorizado por Function, com auditoria. Não há TTL até parecer fiscal, contábil e jurídico.

## Antifraude

### `alertas_antifraude/{idAlerta}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idAlerta` | string | sim | ID sempre determinístico pela chave de detecção protegida. |
| `chaveDeteccaoHash` | string | sim | Chave canônica de evento, regra, alvo e janela. |
| `resumoDeteccaoHash` | string | sim | Detecta reutilização da chave com conteúdo diferente. |
| `tipoAlerta` | string | sim | Catálogo de sinais do prompt. |
| `tipoAlvo` | string | sim | `usuario`, `pedido`, `estabelecimento`, `motoboy` ou `pagamento`. |
| `idAlvo` | string | sim | ID primário coerente com `tipoAlvo`. |
| `idUsuario` | string ou null | não | Referência. |
| `idPedido` | string ou null | não | Referência. |
| `idEstabelecimento` | string ou null | não | Referência. |
| `idMotoboy` | string ou null | não | Referência. |
| `idPagamento` | string ou null | não | Obrigatório quando o alvo primário for pagamento. |
| `regraCodigo` | string | sim | Regra explicável. |
| `versaoRegra` | inteiro | sim | Versão fotografada. |
| `janelaInicio` | timestamp | sim | Período analisado. |
| `janelaFim` | timestamp | sim | Fim exclusivo. |
| `pontuacaoRisco` | inteiro | sim | Valor entre zero e cem. |
| `nivelRisco` | string | sim | `baixo`, `medio`, `alto` ou `critico`. |
| `prioridadeRisco` | inteiro | sim | `1` baixo, `2` médio, `3` alto, `4` crítico. |
| `motivosCodigos` | lista de strings | sim | Motivos limitados e explicáveis. |
| `sinaisResumo` | lista de mapas limitados | sim | Métrica, limite e resultado sem dado bruto. |
| `statusAlerta` | string | sim | `novo`, `em_analise`, `procedente`, `falso_positivo`, `inconclusivo` ou `encerrado`. |
| `statusContestacaoAtual` | string | sim | Projeção: `nao_disponivel`, `disponivel`, `aberta`, `aceita` ou `negada`. |
| `acaoRecomendadaCodigo` | string ou null | não | Recomendação, não decisão. |
| `acaoAplicadaCodigo` | string ou null | não | Ação efetiva. |
| `decisaoCodigo` | string ou null | não | Resultado. |
| `justificativaRevisao` | string ou null | não | Texto restrito e limitado. |
| `analisadoPor` | string ou null | não | Revisor humano. |
| `idUltimaDecisao` | string ou null | não | Decisão imutável mais recente. |
| `sequenciaUltimaDecisao` | inteiro | sim | Ordem das revisões. |
| `idContestacaoAtual` | string ou null | não | Contestação aberta ou mais recentemente decidida. |
| `numeroCicloContestacao` | inteiro | sim | Sequência monotônica dos ciclos de contestação. |
| `idCorrelacao` | string | sim | Rastreabilidade. |
| `bloqueioDescarte` | booleano | sim | Suspende descarte. |
| `criadoEm` | timestamp | sim | Detecção. |
| `atualizadoEm` | timestamp | sim | Estado. |
| `analisadoEm` | timestamp ou null | não | Revisão. |
| `contestacaoAbertaEm` | timestamp ou null | não | Início da contestação. |
| `contestacaoDecididaEm` | timestamp ou null | não | Resposta final. |
| `encerradoEm` | timestamp ou null | não | Encerramento. |
| `excluirEm` | timestamp ou null | não | TTL somente após prazo aprovado. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |

O `idAlerta` deriva obrigatoriamente de `chaveDeteccaoHash`; a Function lê esse ID antes de criar. Repetição com o mesmo `resumoDeteccaoHash` retorna o alerta anterior e conteúdo diferente gera conflito. `idAlvo` coincide com a referência do tipo primário: usuário, pedido, estabelecimento, motoboy ou pagamento. As demais referências são apenas contexto derivado e não podem contradizer a origem.

Fluxo inicial: `novo -> em_analise -> procedente | falso_positivo | inconclusivo -> encerrado`. A projeção segue `nao_disponivel -> disponivel -> aberta -> aceita | negada`. Contestação criada pela subcoleção define `statusContestacaoAtual = aberta` e retorna o alerta encerrado a `em_analise`; a nova decisão volta a um resultado e depois a `encerrado`. Um novo ciclo formalmente permitido parte de `aceita` ou `negada` para `aberta`, cria outro documento e incrementa `numeroCicloContestacao`; nunca reabre ou sobrescreve a contestação anterior. Contestação aceita precisa criar decisão de reversão, desfazer de modo idempotente a ação aplicável e atualizar o resultado; negada preserva a decisão com nova justificativa. Um sinal isolado nunca confirma fraude. Bloqueio permanente ou ação de alto impacto exige revisão humana, justificativa, auditoria e canal de contestação. Automações iniciais limitam-se a controles reversíveis, como atraso ou limite de tentativas.

Não usar atributos protegidos nem proxies discriminatórios sem avaliação formal. Titular não lê alerta bruto; recebe comunicação sanitizada. Detecção e decisão escrevem por Functions distintas e autorizadas.

### `alertas_antifraude/{idAlerta}/contestacoes/{idContestacao}`

Preserva a declaração do titular separada das decisões da equipe. O conteúdo de entrada é imutável; somente projeções de tratamento podem avançar pelo backend.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idContestacao` | string | sim | ID determinístico por alerta, contestante e chave idempotente protegida. |
| `idAlerta` | string | sim | Documento pai. |
| `numeroCiclo` | inteiro | sim | Sequência atribuída apenas após a deduplicação. |
| `protocoloPublico` | string | sim | Código aleatório de acompanhamento. |
| `idContestante` | string | sim | Usuário autenticado e legitimado. |
| `tipoContestante` | string | sim | `usuario`, `motoboy` ou `representante_estabelecimento`. |
| `motivoContestacaoCodigo` | string | sim | Motivo estruturado. |
| `declaracaoTitular` | string | sim | Texto sanitizado e limitado. |
| `anexos` | lista de mapas limitados | não | Até cinco metadados finais aprovados. |
| `quantidadeAnexos` | inteiro | sim | Coerente com a lista. |
| `statusContestacao` | string | sim | `aberta`, `aceita` ou `negada`. |
| `idDecisaoResultado` | string ou null | não | Decisão imutável que encerrou o ciclo. |
| `resumoResultadoPublico` | string ou null | não | Resposta sanitizada ao contestante. |
| `chaveIdempotenciaHash` | string | sim | Deduplicação da abertura. |
| `resumoRequisicaoHash` | string | sim | Conflito se a chave for reutilizada com outro conteúdo. |
| `idCorrelacao` | string | sim | Auditoria e efeitos. |
| `versaoEstado` | inteiro | sim | Controle das projeções mutáveis. |
| `criadoEm` | timestamp | sim | Abertura. |
| `atualizadoEm` | timestamp | sim | Último avanço. |
| `decididoEm` | timestamp ou null | não | Encerramento do ciclo. |
| `versaoEsquema` | inteiro | sim | Versão do documento. |

A abertura ocorre somente por Function. Ela valida se o contestante é o titular do alvo ou representante autorizado, deriva o alerta e o tipo, sanitiza o conteúdo, associa apenas uploads aprovados, gera protocolo e lê primeiro o ID determinístico. Repetição idêntica retorna a contestação existente; corpo divergente gera conflito. Para chave nova, a mesma transação confirma que não há ciclo aberto, incrementa `numeroCicloContestacao`, cria a contestação, atualiza a projeção do alerta, define `bloqueioDescarte = true`, remove qualquer `excluirEm` já programado e registra auditoria. Encerrar a contestação não recria TTL automaticamente; o serviço de retenção reavalia prazo e obrigação. O contestante recebe somente visão sanitizada por Function.

Aceitar ou negar cria uma decisão imutável, atualiza o estado da contestação e do alerta e executa eventual reversão por operação idempotente. `idContestante`, declaração, motivo, anexos, protocolo e número do ciclo nunca são reescritos.

### `alertas_antifraude/{idAlerta}/decisoes/{idDecisao}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idDecisao` | string | sim | ID idempotente. |
| `idAlerta` | string | sim | Documento pai. |
| `sequencia` | inteiro | sim | Ordem crescente. |
| `tipoDecisao` | string | sim | `analise_inicial`, `revisao`, `contestacao` ou `reversao`. |
| `resultadoAnterior` | string ou null | não | Estado anterior. |
| `resultadoNovo` | string | sim | `procedente`, `falso_positivo` ou `inconclusivo`. |
| `statusContestacaoAnterior` | string | sim | Estado anterior. |
| `statusContestacaoNovo` | string | sim | Estado após a decisão. |
| `acaoAplicadaCodigo` | string ou null | não | Ação executada. |
| `acaoRevertidaCodigo` | string ou null | não | Reversão idempotente quando aplicável. |
| `justificativaCodigo` | string | sim | Motivo estruturado. |
| `justificativaTexto` | string | sim | Texto restrito e limitado. |
| `decididoPor` | string | sim | Revisor humano autorizado. |
| `idCorrelacao` | string | sim | Auditoria e efeitos. |
| `criadoEm` | timestamp | sim | Decisão imutável. |
| `versaoEsquema` | inteiro | sim | Versão do evento. |

Decisão, projeção do alerta, reversão de ação e auditoria são confirmadas atomicamente quando internas ou coordenadas por evento idempotente quando houver efeito externo. O documento de decisão nunca é alterado.

## Configuração da plataforma

### `configuracoes_plataforma/geral`

Documento administrativo privado. O ID conhecido evita múltiplas configurações globais concorrentes.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idConfiguracao` | string | sim | Sempre `geral`. |
| `ambiente` | string | sim | `desenvolvimento`, `homologacao` ou `producao`. |
| `modoManutencao` | booleano | sim | Estado global. |
| `mensagemManutencao` | string ou null | não | Texto seguro e limitado. |
| `manutencaoIniciaEm` | timestamp ou null | não | Início programado ou efetivo. |
| `manutencaoTerminaEm` | timestamp ou null | não | Previsão. |
| `permitirConclusaoOperacoesEmAndamento` | booleano | sim | Preserva pedidos já iniciados conforme política. |
| `cobrancaAtiva` | booleano | sim | Flag administrativa. |
| `comissaoAtiva` | booleano | sim | Flag administrativa. |
| `cadastroEstabelecimentoAberto` | booleano | sim | Controle global. |
| `cadastroMotoboyAberto` | booleano | sim | Controle global. |
| `pedidoAgendadoAtivo` | booleano | sim | Controle global. |
| `retiradaLocalAtiva` | booleano | sim | Controle global. |
| `antifraudeAtivo` | booleano | sim | Controle interno. |
| `modoIntegracoes` | string | sim | `simulado` nesta fase; `real` exige aprovação futura. |
| `recursosPagosAtivos` | booleano | sim | Deve permanecer falso na política atual de custo zero. |
| `versaoConfiguracao` | inteiro | sim | Controle de concorrência. |
| `motivoAlteracaoCodigo` | string | sim | Obrigatório em mudança sensível. |
| `versaoEsquema` | inteiro | sim | Versão. |
| `criadoEm` | timestamp | sim | Criação. |
| `atualizadoEm` | timestamp | sim | Alteração. |
| `atualizadoPor` | string | sim | N1 responsável. |

Somente N1 lê o documento; escrita ocorre por Function administrativa auditada. Ativar manutenção não apaga nem altera pedidos. Novas operações podem ser bloqueadas, mas transições necessárias a operações existentes seguem política explícita. Segredos, credenciais e chaves remotas nunca pertencem a esta coleção.

### `configuracoes_plataforma/estado_publico`

Projeção segura para leitura direta, inclusive antes do login.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idConfiguracao` | string | sim | Sempre `estado_publico`. |
| `modoManutencao` | booleano | sim | Estado exibível. |
| `mensagemManutencao` | string ou null | não | Mensagem pública. |
| `cadastroEstabelecimentoAberto` | booleano | sim | Estado público. |
| `cadastroMotoboyAberto` | booleano | sim | Estado público. |
| `pedidoAgendadoAtivo` | booleano | sim | Estado público. |
| `retiradaLocalAtiva` | booleano | sim | Estado público. |
| `versaoConfiguracao` | inteiro | sim | Deve coincidir com a configuração aplicada. |
| `atualizadoEm` | timestamp | sim | Atualização do servidor. |

As regras permitirão somente `get` desse ID conhecido, nunca listagem livre. A projeção não contém cobrança, comissão, antifraude, ator ou motivo interno e é obrigatoriamente atualizada na mesma transação de `geral`.

## Métricas e custos

### `metricas_uso/{idMetrica}`

O ID é determinístico por granularidade, escopo, período e versão. Métricas são agregadas; não se cria um documento por leitura, usuário ou pedido.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idMetrica` | string | sim | ID determinístico. |
| `granularidade` | string | sim | `diaria` ou `mensal`. |
| `escopoMetrica` | string | sim | `plataforma` ou `estabelecimento`. |
| `idEstabelecimento` | string ou null | não | Obrigatório no escopo de estabelecimento. |
| `dataReferencia` | timestamp | sim | Data normalizada do período. |
| `periodoInicio` | timestamp | sim | Início inclusivo. |
| `periodoFim` | timestamp | sim | Fim exclusivo. |
| `totalPedidos` | inteiro | sim | Contagem não negativa. |
| `totalUsuariosAtivosEstimados` | inteiro | sim | Estimativa agregada. |
| `leiturasFirestoreEstimadas` | inteiro | sim | Estimativa. |
| `escritasFirestoreEstimadas` | inteiro | sim | Estimativa. |
| `exclusoesFirestoreEstimadas` | inteiro | sim | Estimativa. |
| `armazenamentoBytesEstimado` | inteiro | sim | Bytes, não megabytes fracionários. |
| `saidaDadosBytesEstimada` | inteiro | sim | Estimativa. |
| `execucoesFuncoesEstimadas` | inteiro | sim | Estimativa. |
| `tempoFuncoesMilissegundosEstimado` | inteiro | sim | Soma estimada. |
| `notificacoesSolicitadas` | inteiro | sim | Eventos solicitados. |
| `notificacoesEnviadas` | inteiro | sim | Envios confirmados. |
| `notificacoesComFalha` | inteiro | sim | Falhas. |
| `origemMetrica` | string | sim | `simulacao_emulador`, `estimativa`, `telemetria` ou `relatorio_fatura`. |
| `criterioUsuarioAtivoCodigo` | string | sim | Definição versionável. |
| `statusMetrica` | string | sim | `provisoria`, `consolidada` ou `divergente`. |
| `versaoCalculo` | inteiro | sim | Contrato do cálculo. |
| `idMetricaAnterior` | string ou null | não | Versão anterior corrigida por este novo documento. |
| `geradoEm` | timestamp | sim | Geração. |
| `geradoPor` | string | sim | Processo responsável. |
| `versaoEsquema` | inteiro | sim | Versão. |

Fluxo: `provisoria -> consolidada | divergente`; estados finais não são reabertos. Contadores não podem ser negativos e uma métrica consolidada não é reescrita; correção cria nova versão apontando para a anterior, que permanece imutável. Não se guardam listas de usuários, pedidos ou dispositivos. Durante a fase gratuita, somente `simulacao_emulador` ou `estimativa`, com dados fictícios.

### `custos_plataforma/{idCusto}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idCusto` | string | sim | ID por período, escopo, natureza e versão. |
| `mesReferencia` | string | sim | Formato `AAAA-MM`. |
| `periodoInicio` | timestamp | sim | Início. |
| `periodoFim` | timestamp | sim | Fim exclusivo. |
| `escopoCusto` | string | sim | `plataforma` ou `estabelecimento`. |
| `idEstabelecimento` | string ou null | não | Escopo condicional. |
| `naturezaCusto` | string | sim | `simulado`, `estimado` ou `real`. |
| `origemCusto` | string | sim | `simulacao_emulador`, `calculadora`, `rateio` ou `fatura`. |
| `custoFirestoreCentavos` | inteiro | sim | Componente não negativo. |
| `custoStorageCentavos` | inteiro | sim | Componente não negativo. |
| `custoFunctionsCentavos` | inteiro | sim | Componente não negativo. |
| `custoHostingCentavos` | inteiro | sim | Componente não negativo. |
| `custoNotificacoesCentavos` | inteiro | sim | Componente não negativo. |
| `custoOutrosCentavos` | inteiro | sim | Componente não negativo. |
| `custoTotalCentavos` | inteiro | sim | Soma exata dos componentes. |
| `moeda` | string | sim | `BRL`. |
| `idMetricaUso` | string ou null | não | Base do cálculo. |
| `metodoRateioVersao` | inteiro ou null | não | Versão do rateio. |
| `statusCusto` | string | sim | `provisorio`, `consolidado`, `conciliado` ou `divergente`. |
| `idCustoAnterior` | string ou null | não | Versão anterior corrigida por este novo documento. |
| `observacaoInterna` | string ou null | não | Texto restrito. |
| `criadoPor` | string | sim | Processo ou N1. |
| `criadoEm` | timestamp | sim | Criação. |
| `atualizadoEm` | timestamp | sim | Estado. |
| `versaoEsquema` | inteiro | sim | Versão. |

Fluxo: `provisorio -> consolidado -> conciliado` ou `provisorio | consolidado -> divergente`. Custo conciliado é imutável; ajuste cria nova versão apontando para a anterior, sem alterar valores ou estado do documento antigo. Valores do Emulator são sempre simulados, nunca reais. Nenhum faturamento, plano Blaze ou leitura automática de fatura será ativado nesta etapa.

## Backups e recuperação

### `backups_registros/{idBackup}`

Guarda somente metadados da operação, nunca o conteúdo exportado.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idBackup` | string | sim | ID da operação. |
| `ambiente` | string | sim | Ambiente de origem. |
| `naturezaDados` | string | sim | `ficticios` ou `reais`. |
| `tipoOperacao` | string | sim | `exportacao_cenario_emulador`, `backup_firestore`, `exportacao_firestore`, `restauracao` ou `teste_restauracao`. |
| `servicoOrigem` | string | sim | `emulator_suite`, `firestore`, `storage`, `authentication` ou `configuracoes`. |
| `statusOperacao` | string | sim | `solicitada`, `em_execucao`, `concluida`, `falhou` ou `cancelada`. |
| `idOperacaoOrigem` | string ou null | não | Backup usado na restauração ou no teste. |
| `referenciaDestinoProtegida` | string ou null | não | Caminho privado sem credencial. |
| `identificadorExterno` | string ou null | não | Referência futura do provedor. |
| `manifestoHash` | string ou null | não | Integridade. |
| `algoritmoHash` | string ou null | não | Algoritmo. |
| `tamanhoBytes` | inteiro ou null | não | Volume. |
| `quantidadeRegistros` | inteiro ou null | não | Contagem. |
| `rpoAlvoMinutos` | inteiro ou null | não | Meta futura. |
| `rtoAlvoMinutos` | inteiro ou null | não | Meta futura. |
| `rpoMedidoMinutos` | inteiro ou null | não | Resultado do teste. |
| `rtoMedidoMinutos` | inteiro ou null | não | Resultado do teste. |
| `statusValidacao` | string | sim | `nao_validado`, `valido`, `parcial` ou `invalido`. |
| `erroCodigo` | string ou null | não | Erro sanitizado. |
| `executadoPor` | string | sim | Responsável. |
| `validadoPor` | string ou null | não | Responsável pela validação. |
| `iniciadoEm` | timestamp | sim | Início. |
| `concluidoEm` | timestamp ou null | não | Conclusão. |
| `validadoEm` | timestamp ou null | não | Validação. |
| `excluirEm` | timestamp ou null | não | Somente após política aprovada. |
| `versaoEsquema` | inteiro | sim | Versão. |

Fluxo: `solicitada -> em_execucao -> concluida | falhou`; `solicitada` pode ir para `cancelada`. `concluida` exige manifesto e horário de conclusão; validação passa de `nao_validado` para `valido`, `parcial` ou `invalido` e não altera o resultado original. Na fase atual, somente exportações de cenários fictícios do Emulator podem ser registradas, sempre como `exportacao_cenario_emulador`, nunca como backup de produção. Não se ativa backup agendado ou recurso Blaze. Escrita é do backend e leitura é N1; caminhos não são URLs públicas e não contêm segredo.

## Idempotência e eventos de saída

### `idempotencias/{idOperacao}`

O ID é HMAC de ambiente, nome da operação, ator/escopo e chave recebida. A chave original nunca é persistida.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idOperacao` | string | sim | ID protegido e determinístico. |
| `versaoChaveIdentificador` | inteiro | sim | Versão da chave HMAC usada no ID. |
| `versaoCanonizacaoRequisicao` | inteiro | sim | Contrato de normalização anterior ao hash. |
| `ambiente` | string | sim | Ambiente. |
| `nomeOperacao` | string | sim | Operação de lista fechada. |
| `escopoOperacao` | string | sim | `usuario`, `estabelecimento`, `provedor` ou `sistema`. |
| `idAtor` | string ou null | não | Ator autenticado. |
| `idEstabelecimento` | string ou null | não | Escopo. |
| `tipoEntidadeAlvo` | string ou null | não | Recurso alvo. |
| `idEntidadeAlvo` | string ou null | não | ID alvo. |
| `chaveIdempotenciaHash` | string | sim | Hash/HMAC da chave. |
| `resumoRequisicaoHash` | string | sim | Detecta reutilização com conteúdo diferente. |
| `statusOperacao` | string | sim | `em_processamento`, `concluida`, `falha_temporaria` ou `falha_definitiva`. |
| `numeroTentativas` | inteiro | sim | Contador. |
| `versaoExecucao` | inteiro | sim | Controle de retomada. |
| `idDonoExecucao` | string ou null | não | Trabalhador atual. |
| `bloqueadoAte` | timestamp ou null | condicional | Obrigatório em `em_processamento`. |
| `proximaTentativaEm` | timestamp ou null | condicional | Obrigatório em `falha_temporaria`. |
| `resultadoCodigo` | string ou null | não | Resultado seguro. |
| `tipoEntidadeResultado` | string ou null | não | Tipo criado ou alterado. |
| `idEntidadeResultado` | string ou null | não | ID do resultado. |
| `resumoResposta` | mapa fechado | não | Resposta mínima sem dado sensível. |
| `erroCodigo` | string ou null | não | Falha sanitizada. |
| `classeRetencao` | string | sim | `operacional_curta`, `operacional_estendida` ou `financeira`. |
| `criadoEm` | timestamp | sim | Reserva. |
| `ultimaTentativaEm` | timestamp | sim | Última execução. |
| `concluidoEm` | timestamp ou null | não | Término. |
| `excluirEm` | timestamp ou null | não | TTL conforme classe e estado terminal. |
| `versaoEsquema` | inteiro | sim | Versão. |

Fluxo: `em_processamento -> concluida | falha_temporaria | falha_definitiva`; `falha_temporaria -> em_processamento`; `concluida` e `falha_definitiva` são terminais. Mesma chave e mesmo resumo retornam o resultado anterior sem repetir efeito; mesma chave com conteúdo diferente gera conflito. Operação concluída não volta a processamento e uma execução abandonada só é retomada após o arrendamento. `em_processamento` exige dono e `bloqueadoAte`; `falha_temporaria` exige `proximaTentativaEm`; estado terminal exige `concluidoEm` e resultado ou erro. Registro e primeiro efeito Firestore são confirmados atomicamente quando possível. Requisição e resposta completas nunca são armazenadas.

Durante rotação, a Function calcula candidatos com a chave atual e todas as versões ainda cobertas pela retenção, lê esses IDs na mesma transação e só cria um novo se nenhum existir. Uma versão de canonização permanece suportada enquanto houver idempotências válidas; mudar o formato não pode criar uma segunda operação.

Aplicação obrigatória inicial: criar pedido, confirmar webhook, aceitar entrega, validar código, reservar/baixar/devolver estoque, reembolsar pagamento, gerar fatura e confirmar pagamento de assinatura. Retenção curta não substitui unicidade durável em pagamento, fiscal ou razão financeira.

### `eventos_saida/{idEventoSaida}`

Outbox transacional para FCM, processamentos internos e integrações futuras.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `idEventoSaida` | string | sim | ID determinístico. |
| `ambiente` | string | sim | Ambiente. |
| `tipoEvento` | string | sim | Evento de lista fechada. |
| `tipoAgregado` | string | sim | Entidade de origem. |
| `idAgregado` | string | sim | ID da entidade. |
| `idEstabelecimento` | string ou null | não | Escopo. |
| `idDestinatario` | string ou null | não | Destinatário lógico. |
| `idNotificacao` | string ou null | não | Caixa interna correlata. |
| `versaoAgregado` | inteiro | sim | Versão observada. |
| `canal` | string | sim | `notificacao_fcm`, `integracao_pagamento`, `integracao_fiscal` ou `processamento_interno`. |
| `deduplicacaoHash` | string | sim | Idempotência do consumidor. |
| `versaoContrato` | inteiro | sim | Contrato do corpo. |
| `corpoMinimo` | mapa fechado | sim | Dados sanitizados estritamente necessários. |
| `prioridade` | inteiro | sim | Ordenação operacional. |
| `statusEvento` | string | sim | `pendente`, `processando`, `enviado`, `falha_temporaria`, `falha_definitiva` ou `cancelado`. |
| `quantidadeTentativas` | inteiro | sim | Contador. |
| `maximoTentativas` | inteiro | sim | Limite. |
| `proximaTentativaEm` | timestamp ou null | condicional | Obrigatório em `pendente` e `falha_temporaria`. |
| `bloqueadoAte` | timestamp ou null | condicional | Obrigatório em `processando`. |
| `idDonoProcessamento` | string ou null | não | Trabalhador. |
| `resultadoCodigo` | string ou null | não | Resultado seguro. |
| `idResultadoExterno` | string ou null | não | Referência externa quando permitida. |
| `ultimoErroCodigo` | string ou null | não | Erro sanitizado. |
| `idCorrelacao` | string | sim | Rastreabilidade. |
| `criadoEm` | timestamp | sim | Criação atômica com o domínio. |
| `ultimaTentativaEm` | timestamp ou null | não | Processamento. |
| `processadoEm` | timestamp ou null | não | Conclusão. |
| `excluirEm` | timestamp ou null | não | TTL posterior ao estado terminal. |
| `versaoEsquema` | inteiro | sim | Versão. |

Fluxo: `pendente -> processando -> enviado | falha_temporaria | falha_definitiva`; `falha_temporaria -> processando`; `pendente` pode ir para `cancelado` antes do efeito. O evento nasce na mesma transação da alteração de domínio. Seu ID deriva de ambiente, tipo do evento, agregado, versão, canal e destinatário; uma nova tentativa não muda o ID. A entrega é pelo menos uma vez e o consumidor também deduplica. `pendente` e `falha_temporaria` exigem `proximaTentativaEm`; `processando` exige dono e `bloqueadoAte`; `enviado` exige `processadoEm`; a quantidade de tentativas nunca supera o máximo sem virar falha definitiva. Token FCM é obtido de `dispositivos_usuarios` no processamento; nunca é copiado para o evento. `corpoMinimo` não contém endereço, documento, código de entrega, token ou segredo. Falha definitiva gera alerta e não desaparece silenciosamente.

Na fase gratuita, um adaptador local falso simula FCM e demais integrações; não se presume a existência de emulador FCM. Não há Function em nuvem nem chamada a provedor real.

## Fontes de verdade e projeções

| Conceito | Fonte de verdade | Projeções permitidas |
| --- | --- | --- |
| Estado comercial | `pedidos.statusPedido` | Histórico e dashboards. |
| Pagamento | Tentativa em `pagamentos` | `pedidos.statusPagamentoAtual`. |
| Entrega | `entregas.statusEntrega` | `pedidos.statusEntregaAtual` e `idMotoboyResponsavel`. |
| Estoque atual | `estoques_produtos` | `produtos.disponivelParaVenda`. |
| Explicação do estoque | `reservas_estoque` e `movimentacoes_estoque` | Alertas e métricas. |
| Uso de cupom | `usos_cupons` e `cotas_cupons_clientes` | Contadores em `cupons`. |
| Condições de cobrança | Configuração vigente fotografada em `pedidos_privados` | Valores históricos do pedido. |
| Assinatura atual | Documento apontado pela configuração de cobrança | Estado operacional do estabelecimento. |
| Obrigação econômica do motoboy | `transacoes_motoboys` | Visões de ganhos e repasses. |
| Razão da carteira do motoboy | `movimentacoes_carteiras_motoboys` append-only | `carteiras_motoboys`. |
| Posição privada | `localizacoes_motoboys` | Oferta gerada pelo backend. |
| Posição compartilhada | `rastreamento_entregas` | Mapa da entrega conhecida. |
| Horário vigente | Grade em `estabelecimentos` e exceções em `horarios_especiais` | Estado aberto/fechado calculado. |
| Região e taxa | Regiões ativas e versão apontada por `controles_taxas_entrega` | Fotografia aplicada em `pedidos_privados`. |
| Avaliação | Documento por alvo em `avaliacoes` | Média e total em produto, estabelecimento e motoboy. |
| Suporte e denúncia | Cabeçalho e seus eventos/mensagens | Resumos de listagem e alertas. |
| Documento legal | Versão apontada por `controles_documentos_legais` | `atual` em documento público. |
| Evidência de aceite | Eventos em `consentimentos_usuarios` | `estados_consentimentos_usuarios` e versões mínimas em `usuarios`. |
| Estado global | `configuracoes_plataforma/geral` | `configuracoes_plataforma/estado_publico`. |
| Custo e uso | Agregados versionados de métricas e custos | Dashboards. |
| Auditoria | `logs_auditoria` append-only | Projeções sanitizadas quando necessárias. |
| Operação idempotente | `idempotencias` e entidade de domínio | Resultado mínimo retornado. |
| Efeito assíncrono | `eventos_saida` | Notificação e estado de processamento. |

Projeções são atualizadas pelo backend na mesma operação atômica quando necessário ou por evento idempotente quando consistência eventual é aceitável. Divergências geram reconciliação e auditoria; nunca são corrigidas silenciosamente pelo cliente.

## Operações transacionais críticas

- Criar pedido: idempotência, pedido compartilhado/privado, histórico inicial, reservas, uso de cupom e entrega compartilhada/privada quando aplicável.
- Consumir ou liberar estoque: estoque, reserva e movimentação imutável.
- Confirmar pagamento: pagamento, projeção do pedido, consumo de estoque e evento de saída.
- Aceitar entrega: oferta, entrega compartilhada/privada, perfil do motoboy, projeção do pedido e evento logístico.
- Validar código: código restrito, entrega compartilhada/privada, pedido, rastreamento, transação econômica, movimentos da carteira e auditoria.
- Movimentar carteira: idempotência, obrigação econômica, movimentos imutáveis, sequência e projeção da carteira.
- Criar avaliações: uma por alvo, marcadores de unicidade e eventos de atualização dos agregados.
- Aceitar convite: convite, vínculo de estabelecimento e auditoria.
- Publicar documento legal: nova versão, substituição da anterior e projeção vigente.
- Alterar configuração global: documento privado, projeção pública e auditoria.
- Registrar efeito assíncrono: alteração de domínio e `eventos_saida` na mesma transação.
- Assumir idempotência ou evento de saída: arrendamento, tentativa e versão de execução atualizados atomicamente.

Chamadas de rede a provedores externos nunca ocorrem dentro de uma transação Firestore. O resultado externo é persistido e aplicado em uma nova operação idempotente.

## Catálogo de consultas previstas

| Caso de uso | Filtros e ordenação previstos |
| --- | --- |
| Estabelecimentos próximos aprovados | `publicado`, `statusConta`, `geohash` e paginação. |
| Catálogo de um estabelecimento | `idEstabelecimento`, `ativo`, `categoria` e ordenação estável. |
| Produtos em promoção | `idEstabelecimento`, `ativo`, `emPromocao` e paginação. |
| Produtos com estoque baixo | `idEstabelecimento`, `estoqueBaixo = true`, `atualizadoEm` decrescente. |
| Vínculos de um usuário | `idUsuario`, `statusVinculo`. |
| Equipe de um estabelecimento | `idEstabelecimento`, `statusVinculo`, `nivelAcesso`. |
| Motoboys aprovados disponíveis | Consulta exclusiva do backend por aprovação, disponibilidade e região/geohash. |
| Envios temporários para processamento | `statusEnvio`, `expiraEm` crescente; backend revalida proprietário e prazo. |
| Promoções administrativas | `idEstabelecimento`, `statusPromocao`, `criadoEm` decrescente. |
| Promoções globais elegíveis | `escopo = plataforma`, `statusPromocao`, `validoAte`; vigência revalidada no backend. |
| Promoções do estabelecimento elegíveis | `escopo = estabelecimento`, `idEstabelecimento`, `statusPromocao`, `validoAte`; vigência revalidada no backend. |
| Cupons administrativos | `idEstabelecimento`, `statusCupom`, `criadoEm` decrescente. |
| Cupom digitado | Leitura direta pelo ID derivado de HMAC; nunca consulta livre do cliente. |
| Reservas de estoque do pedido | `idPedido`, `statusReserva`. |
| Reservas vencendo | `statusReserva = ativa`, ordenadas por `expiraEm`. |
| Histórico do cliente | `idCliente`, `criadoEm` decrescente e paginação. |
| Histórico público de um pedido | Caminho conhecido, `visivelAoCliente = true`, `sequencia` crescente. |
| Fila do estabelecimento | `idEstabelecimento`, `fasePedido`, `criadoEm`. |
| Pedidos por estado | `idEstabelecimento`, `statusPedido`, `criadoEm` decrescente. |
| Pedidos agendados | `idEstabelecimento`, `tipoAtendimento`, `statusPedido`, `agendadoPara`. |
| Tentativas do pedido | `idPedido`, `criadoEm` decrescente. |
| Pagamentos para conciliação | `statusConciliacao`, `proximaConciliacaoEm`. |
| Webhooks retomáveis | `statusProcessamento` igual a `recebido` ou `falha_temporaria`, com `proximaTentativaEm` crescente. |
| Entregas do estabelecimento | `idEstabelecimento`, `statusEntrega`, `atualizadoEm` decrescente. |
| Histórico do motoboy | `idMotoboy`, `atualizadoEm` decrescente. |
| Linha do tempo da entrega | Caminho conhecido, `numeroSequencia` crescente. |
| Ofertas do motoboy | `idMotoboy`, `statusOferta`, `expiraEm`. |
| Motoboys autônomos próximos | Backend por `elegivelOfertaAutonoma` e faixas de `geohashAtual`, com pós-filtro por distância. |
| Assinaturas vencendo | `statusAssinatura`, `proximoVencimento`. |
| Faturas do estabelecimento | `idEstabelecimento`, `dataVencimento` decrescente. |
| Transações do motoboy | `idMotoboy`, `criadoEm` decrescente. |
| Razão da carteira do motoboy | `idMotoboy`, `sequencia` decrescente. |
| Horários especiais do estabelecimento | Caminho do estabelecimento, `statusHorario`, `inicioEm`; sobreposição é pós-validada. |
| Avaliações do cliente | `idCliente`, `criadoEm` decrescente. |
| Avaliações administrativas | `idEstabelecimento`, `tipoAvaliado`, `statusAvaliacao`, `criadoEm` decrescente. |
| Avaliações de um produto | `idProduto`, `statusAvaliacao`, `criadoEm` decrescente. |
| Avaliações de um motoboy | `idMotoboy`, `statusAvaliacao`, `criadoEm` decrescente. |
| Avaliações negativas | `idEstabelecimento`, `statusAvaliacao = publicada`, `avaliacaoNegativa = true`, `criadoEm` decrescente. |
| Denúncias do autor | `idDenunciante`, `criadoEm` decrescente. |
| Fila de denúncias | `statusDenuncia`, `prioridade`, `criadoEm`. |
| Denúncias de um alvo | `tipoAlvo`, `idAlvo`, `statusDenuncia`, `criadoEm` decrescente. |
| Denúncias no contexto do estabelecimento | `idEstabelecimento`, `statusDenuncia`, `criadoEm` decrescente; somente equipe de confiança, não equipe comum da loja. |
| Interações visíveis da denúncia | Caminho conhecido, `visibilidade = denunciante_e_equipe`, `sequencia` crescente. |
| Chamados do solicitante | `tipoEscopoAcesso = usuario`, `idEscopoAcesso`, `statusChamado`, `atualizadoEm` decrescente. |
| Chamados empresariais | `tipoEscopoAcesso = estabelecimento`, `idEscopoAcesso`, `statusChamado`, `atualizadoEm` decrescente. `idEstabelecimento` de contexto nunca substitui o escopo. |
| Fila de suporte | `filaAtendimento`, `statusChamado`, `prioridade`, `atualizadoEm` decrescente. |
| Mensagens do chamado | Caminho conhecido, `visibilidade`, `sequencia` crescente. |
| Caixa de notificações | `idUsuario`, `statusNotificacao = disponivel`, `arquivada`, `criadoEm` decrescente. |
| Notificações não lidas | Consulta anterior com `lida = false`. |
| Comprovantes do cliente | `idCliente`, `criadoEm` decrescente. |
| Comprovantes do estabelecimento | `idEstabelecimento`, `statusComprovante`, `criadoEm` decrescente. |
| Versões do comprovante | `idPedido`, `tipoComprovante`, `versaoComprovante` decrescente. |
| Documento legal atual | `tipoDocumento`, `idioma`, `statusDocumento = publicado`, `atual = true`. |
| Consentimentos do titular | `idUsuario`, `tipoConsentimento`, `criadoEm` decrescente. |
| Estado dos consentimentos | Leitura por ID determinístico ou `idUsuario`, `tipoConsentimento`; retorno sanitizado por Function. |
| Solicitações LGPD do titular | `idUsuario`, `criadoEm` decrescente. |
| Fila LGPD | `statusSolicitacao`, `prazoRespostaEm`. |
| Interações LGPD visíveis | Caminho conhecido, `visibilidade = titular_e_equipe`, `sequencia` crescente. |
| Auditoria de entidade | `tipoEntidade`, `idEntidade`, `criadoEm` decrescente. |
| Auditoria do estabelecimento | `idEstabelecimento`, `acao`, `criadoEm` decrescente. |
| Regiões vigentes do estabelecimento | `idEstabelecimento`, `statusRegiao`, `prioridade`. |
| Regiões por cidade | `escopoRegiao` ou `idEstabelecimento`, `statusRegiao`, `estado`, `cidadeNormalizada`, `prioridade`. |
| Regiões por bairro | `bairrosNormalizados` com `array-contains`, escopo, `statusRegiao` e `prioridade`. |
| Regiões por geohash | `prefixosGeohash` com `array-contains`, escopo ou `idEstabelecimento`, `statusRegiao` e pós-filtro geométrico. |
| Regiões aguardando vigência | `statusRegiao = agendada`, `validoDe` crescente; a validade também é conferida em tempo de uso. |
| Configurações de taxa | `idEstabelecimento`, `statusConfiguracao`, `vigenteDe` decrescente. |
| Convites administrativos | `idEstabelecimento`, `statusConvite`, `criadoEm` decrescente. |
| Convites vencendo | `statusConvite = pendente`, `expiraEm`. |
| Documentos fiscais | `idEstabelecimento`, `statusDocumentoFiscal`, `criadoEm` decrescente. |
| Alertas antifraude | `statusAlerta`, `prioridadeRisco` decrescente, `criadoEm`. |
| Contestações antifraude | Caminho conhecido do alerta, `numeroCiclo` decrescente; visão sanitizada por Function. |
| Decisões antifraude | Caminho conhecido do alerta, `sequencia` crescente. |
| Métricas da plataforma | `escopoMetrica = plataforma`, `granularidade`, `periodoInicio` decrescente. |
| Métricas do estabelecimento | `escopoMetrica = estabelecimento`, `idEstabelecimento`, `granularidade`, `periodoInicio` decrescente. |
| Custos da plataforma | `escopoCusto = plataforma`, `periodoInicio` decrescente. |
| Custos do estabelecimento | `escopoCusto = estabelecimento`, `idEstabelecimento`, `periodoInicio` decrescente. |
| Registros de backup | `ambiente`, `statusOperacao`, `iniciadoEm` decrescente. |
| Idempotências retomáveis | `statusOperacao`, `bloqueadoAte` ou `proximaTentativaEm`. |
| Eventos de saída prontos | `statusEvento`, `proximaTentativaEm`; eventos arrendados usam `bloqueadoAte`. |

Todas as listas usam cursor e limite. Rastreamento é lido apenas pelo ID conhecido da própria entrega, nunca por consulta da coleção. Regras não filtram resultados: cada consulta de usuário ou equipe inclui o proprietário ou escopo que a autorização exige.

## Catálogo consolidado de estados

Os valores abaixo são canônicos. Alterar um catálogo exige versão de contrato, migração e atualização dos testes de Rules e Functions.

| Entidade ou campo | Valores permitidos |
| --- | --- |
| Vínculo | `pendente`, `ativo`, `suspenso`, `revogado`. |
| Aprovação de motoboy | `pendente_aprovacao`, `aprovado`, `rejeitado`. |
| Disponibilidade de motoboy | `offline`, `online`, `ocupado`, `em_entrega`, `bloqueado`. |
| Operação de estabelecimento | `aberto`, `fechado`, `pausado`, `ocupado`, `bloqueado`. |
| Conta de estabelecimento | `ativo`, `inativo`, `bloqueado`. |
| Aprovação de estabelecimento | `pendente_aprovacao`, `aprovado`, `rejeitado`, `alteracao_solicitada`, `bloqueado`. |
| Pedido | `criado`, `aguardando_pagamento`, `aguardando_preparo`, `em_preparo`, `pronto_para_retirada`, `retirado_cliente`, `pronto_para_entrega`, `aguardando_motoboy`, `motoboy_definido`, `saiu_para_entrega`, `aguardando_codigo_entrega`, `entregue`, `cancelado`, `expirado`. |
| Pagamento | `pendente`, `processando`, `pago`, `falhou`, `cancelado`, `reembolsado`, `contestado`. |
| Reembolso | `nao_solicitado`, `solicitado`, `processando`, `parcial`, `concluido`, `falhou`. |
| Contestação de pagamento | `inexistente`, `aberta`, `resolvida_favoravel`, `resolvida_desfavoravel`. |
| Conciliação de pagamento | `pendente`, `conciliado`, `divergente`, `erro_temporario`. |
| Processamento de webhook | `recebido`, `processando`, `processado`, `ignorado`, `falha_temporaria`, `falha_definitiva`. |
| Reserva de estoque | `ativa`, `consumida`, `liberada`, `expirada`. |
| Uso de cupom | `reservado`, `consumido`, `liberado`, `expirado`, `estornado`. |
| Entrega | `criada`, `aguardando_atribuicao`, `ofertando`, `motoboy_definido`, `a_caminho_retirada`, `aguardando_coleta`, `coletada`, `a_caminho_entrega`, `aguardando_codigo`, `entregue`, `cancelada`. |
| Oferta de entrega | `pendente`, `visualizada`, `aceita`, `recusada`, `expirada`, `cancelada`. |
| Código de entrega | `ativo`, `bloqueado`, `validado`, `expirado`, `cancelado`. |
| Rastreamento | `aguardando`, `ativo`, `pausado`, `encerrado`, `cancelado`. |
| Assinatura | `gratis_ativo`, `teste`, `ativo`, `aguardando_pagamento`, `em_carencia`, `vencido`, `cancelado`, `expirado`, `bloqueado`. |
| Transação do motoboy | `pendente`, `disponivel`, `em_repasse`, `pago`, `retido`, `devedor`, `cancelado`. |
| Operação de saldo | `creditar_pendente`, `compensar_devedor`, `liberar_disponivel`, `reservar_repasse`, `confirmar_repasse`, `devolver_repasse`, `reter_pendente`, `reter_disponivel`, `liberar_retencao_pendente`, `liberar_retencao_disponivel`, `debitar_disponivel`, `debitar_retido`, `registrar_devedor`. |
| Avaliação | `pendente`, `publicada`, `oculta`, `removida`. |
| Denúncia | `recebida`, `em_triagem`, `em_analise`, `aguardando_informacoes`, `resolvida`, `cancelada`. |
| Resultado da denúncia | `nao_analisado`, `procedente`, `parcialmente_procedente`, `improcedente`, `inconclusivo`. |
| Interação de denúncia | `complemento`, `solicitacao_informacao`, `resposta`, `transicao`, `decisao`; visibilidade `denunciante_e_equipe` ou `somente_equipe`. |
| Chamado | `aberto`, `em_triagem`, `em_andamento`, `aguardando_usuario`, `resolvido`, `fechado`, `cancelado`. |
| Mensagem de suporte | `texto`, `evento_status`, `nota_interna`; visibilidade `participantes` ou `somente_equipe`. |
| Envio temporário | `autorizado`, `recebido`, `verificando`, `aprovado`, `rejeitado`, `expirado`, `associado`. |
| Notificação | `agendada`, `disponivel`, `cancelada`, `expirada`. |
| Envio remoto | `nao_solicitado`, `pendente`, `enviado`, `parcial`, `falhou`, `sem_dispositivo`. |
| Comprovante | `solicitado`, `gerando`, `disponivel`, `falhou`, `substituido`, `cancelado`. |
| Documento legal | `rascunho`, `publicado`, `substituido`, `revogado`, `descartado`. |
| Solicitação LGPD | `recebida`, `validando_identidade`, `em_analise`, `em_execucao`, `aguardando_usuario`, `concluida`, `parcialmente_atendida`, `negada`, `cancelada`. |
| Região | `rascunho`, `agendada`, `ativa`, `inativa`, `substituida`. |
| Configuração de taxa | `rascunho`, `agendada`, `ativa`, `inativa`, `substituida`. |
| Convite | `pendente`, `aceito`, `cancelado`, `expirado`. |
| Documento fiscal | `pendente`, `enviado`, `autorizado`, `rejeitado`, `em_contingencia`, `erro_temporario`, `cancelamento_pendente`, `cancelado`. |
| Alerta antifraude | `novo`, `em_analise`, `procedente`, `falso_positivo`, `inconclusivo`, `encerrado`. |
| Projeção de contestação no alerta | `nao_disponivel`, `disponivel`, `aberta`, `aceita`, `negada`. |
| Documento de contestação antifraude | `aberta`, `aceita`, `negada`. |
| Métrica de uso | `provisoria`, `consolidada`, `divergente`. |
| Custo da plataforma | `provisorio`, `consolidado`, `conciliado`, `divergente`. |
| Backup/operação de cenário | `solicitada`, `em_execucao`, `concluida`, `falhou`, `cancelada`. |
| Idempotência | `em_processamento`, `concluida`, `falha_temporaria`, `falha_definitiva`. |
| Evento de saída | `pendente`, `processando`, `enviado`, `falha_temporaria`, `falha_definitiva`, `cancelado`. |

## Matriz resumida de acesso

`N1` abaixo significa operação administrativa autenticada, com MFA futuro, finalidade e auditoria. Não significa expor documentos secretos na interface. Custom claims comprovam privilégios globais; vínculo ativo comprova escopo de estabelecimento.

| Grupo de dados | Leitura permitida | Escrita do aplicativo | Autoridade de escrita |
| --- | --- | --- | --- |
| Catálogo publicado | Público, com consulta limitada. | Nenhuma. | Equipe autorizada e backend. |
| `estado_publico` e documento legal | Estado público e versão atual por consulta prevista; versão histórica somente por ID conhecido. | Nenhuma. | Backend após ação N1. |
| Usuário e endereço | Titular e operação autorizada. | Campos próprios expressamente permitidos. | Backend para bloqueio e papel. |
| Usuário privado, dispositivo, documentos e envio temporário | Visão sanitizada do titular por Function; autorização temporária somente por ID próprio conhecido; coleções brutas restritas. | Nenhuma escrita Firestore direta; binário apenas no caminho temporário autorizado pelas futuras Storage Rules. | Backend para token, proteção, análise, associação e dado sensível. |
| Estabelecimento privado | Dono/equipe fiscal por visão sanitizada; N1 conforme finalidade. | Fluxo administrativo autenticado. | Backend para aprovação e dado protegido. |
| Vínculo e convite | Dono/gerente do escopo e usuário convidado somente pelo fluxo seguro. | Nenhuma mudança direta de estado. | Functions autorizadas. |
| Produto e horário | Público quando publicado; equipe do estabelecimento para administração. | N2, N3 ou N6 apenas nos campos permitidos. | Backend para publicação e mudanças críticas. |
| Estoque, promoção e cupom | Promoção ativa segura pode ser pública; estoque/administração pertencem à equipe; cupom bruto não é consultável. | Nenhuma quantidade, contador ou consumo direto. | Backend e Function transacional. |
| Pedido compartilhado | Cliente do pedido e equipe vinculada conforme papel; contém somente fotografia comercial segura. | Nenhum valor ou estado crítico direto. | Functions de pedido e status. |
| Pedido privado | Nenhuma leitura direta; cada público recebe visão financeira mínima por Function. | Nenhuma. | Backend exclusivamente. |
| Entrega compartilhada e oferta | Participantes da entrega; oferta somente ao motoboy destinatário. | Localização própria sob regras estritas; demais estados por Function. | Backend. |
| Entrega privada | Nenhuma leitura direta; endereço operacional e ganho são filtrados por Function conforme papel e fase. | Nenhuma. | Backend exclusivamente. |
| Código de entrega | Nenhuma leitura direta, inclusive N1 rotineiro. | Nenhuma. | Backend exclusivamente. |
| Rastreamento | Cliente do pedido, motoboy responsável, estabelecimento do pedido e N1 justificado. | Motoboy responsável em sessão ativa, com campos limitados. | Backend encerra e limpa. |
| Pagamento, assinatura, transação e razão de carteira | Visão sanitizada por Function; carteira resumida pode ser lida pelo próprio motoboy. | Nenhuma alteração financeira direta. | Backend exclusivamente. |
| Avaliação | Autor e equipe/moderação por visão sanitizada; público vê apenas agregados. | Envio pelo fluxo autenticado. | Backend define escopo, moderação e agregados. |
| Denúncia | Denunciante por visão sanitizada e equipe de confiança; denunciado não lê relato bruto. | Nenhuma escrita direta; Function recebe abertura ou complemento. | Backend deriva interação, estado e decisão. |
| Suporte | Solicitante por visão sanitizada; dono ou gerente do escopo e atendimento autorizado. | Nenhuma escrita direta; Function recebe abertura ou mensagem. | Backend deriva mensagem, fila, estado e nota interna. |
| Notificação | Destinatário. | Apenas `lida`, `arquivada` e datas coerentes. | Backend cria e atualiza envio. |
| Comprovante e fiscal | Comprovante no próprio contexto; fiscal somente por visão/download sanitizado via Function. | Nenhuma. | Backend do MandaJá; provedor externo nunca escreve diretamente. |
| Região e taxa de entrega | Cliente consulta resultado pela Function; dono/gerente administra somente o próprio escopo; N1 administra plataforma. | Nenhuma ativação ou cálculo direto. | Backend versiona, ativa, calcula e fotografa. |
| Consentimento e LGPD | Visões sanitizadas por Function, inclusive interações; equipe de privacidade autorizada. | Nenhuma escrita direta; Function recebe consentimento, solicitação ou complemento. | Backend deriva interação, evidência, decisão e execução. |
| Auditoria, antifraude, métricas, custos e backups | N1/equipe especializada por Function administrativa; contestante recebe comunicação sanitizada; sem leitura direta do SDK. | Nenhuma escrita direta; Function recebe eventual contestação antifraude. | Backend. |
| Configuração geral | N1. | Nenhuma escrita direta. | Function administrativa auditada. |
| Idempotência e eventos de saída | Nenhum cliente ou equipe comum. | Nenhuma. | Backend exclusivamente. |

Regras do Firestore não são filtros: toda consulta precisa conter as restrições de proprietário, estabelecimento, destinatário ou estado exigidas. Admin SDK não substitui validação dentro das Functions, e provedor externo nunca recebe acesso direto ao Firestore.

## Matriz preliminar de retenção e descarte

Os prazos são hipóteses técnicas de arquitetura, não parecer jurídico, fiscal ou contábil. Produção depende da aprovação formal descrita em `LGPD.md`, `FISCAL.md` e `BACKUP_RECUPERACAO.md`.

| Categoria | Hipótese inicial | Ação de encerramento |
| --- | --- | --- |
| Código de entrega | Até conclusão, cancelamento ou máximo de 24 horas. | Excluir o documento ao encerrar; `excluirEm` é contingência. Eventos preservam apenas resultado e contagem. |
| Localização privada atual | Somente durante disponibilidade ou entrega; contingência curta após inatividade. | Remover ao ficar offline ou encerrar; nunca manter histórico de pontos no mesmo documento. |
| Rastreamento compartilhado | Encerrar imediatamente; documento por no máximo sete dias após término, sujeito à avaliação LGPD. | Limpar posição precisa, direção e velocidade no término e excluir depois. |
| Oferta de entrega | Validade de minutos; metadados terminais por até 30 dias. | Sem endereço exato; definir `excluirEm` depois do estado terminal. |
| Reserva e uso temporário de cupom | Liberação operacional em minutos; registro terminal por até 30 dias. | `expiraEm` controla negócio e `excluirEm` controla descarte. |
| Token FCM | Enquanto válido e necessário. | Inativar no logout/erro permanente/exclusão e programar descarte. |
| Convite | Validade inicial sugerida de sete dias. | Inutilizar token no estado terminal, minimizar contato em até 30 dias e reter só metadados justificados. |
| Notificação | Até 90 dias como hipótese inicial. | Excluir a caixa; pedido ou pagamento continua na coleção de origem. |
| Idempotência operacional | Até 30 dias depois do estado terminal. | Classes financeiras preservam a unicidade também no documento de domínio e seguem prazo próprio. |
| Evento de saída | Até 30 dias após sucesso; falha fica até resolução. | Minimizar corpo e descartar somente após reconciliação. |
| Upload temporário | Validade curta, inicialmente até 24 horas, sujeita ao limite final do Storage. | Remover objeto e autorização rejeitados, expirados ou órfãos; associação preserva apenas o metadado final necessário. |
| Suporte e denúncia | Até dois anos após encerramento, hipótese já documentada. | Excluir ou anonimizar anexos, mensagens/interações e cabeçalho de modo coordenado. |
| Antifraude | Até dois anos após encerramento como hipótese. | Tratar alerta, decisões, contestações e anexos de modo coordenado; validar necessidade, relatório de impacto e eventual vínculo financeiro. |
| Auditoria sensível | Até cinco anos como hipótese inicial. | Minimizar, restringir e impedir alteração. |
| Pedido compartilhado/privado, pagamento, entrega privada, assinatura, carteira, comprovante e fiscal | Conforme contrato e obrigações aplicáveis; prazo ainda não aprovado. | Descarte coordenado entre pares; sem TTL até validação jurídica, fiscal e contábil. |
| Documento legal e consentimento | Enquanto necessários para demonstrar versão, transparência e obrigação. | Sem TTL automático antes de validação jurídica. |
| Solicitação LGPD | Evidência conforme política; arquivo de exportação tem validade curta. | Apagar arquivo temporário primeiro e preservar apenas evidência necessária. |
| Avaliação | Enquanto houver finalidade legítima e estado publicável. | Anonimizar autor, remover comentário ou excluir conforme decisão; ajustar agregado. |
| Região e configuração de taxa | Enquanto vigentes; versões fotografadas acompanham a retenção dos pedidos. | Versão inativa não referenciada pode ser descartada após prazo gerencial/jurídico aprovado. |
| Conta sem obrigação de retenção | Excluir ou anonimizar em até 30 dias após solicitação concluída, como hipótese. | Preservar somente exceções justificadas. |
| Métrica e custo agregado | Prazo gerencial a aprovar, preferindo dados sem pessoas. | Agregar ou excluir versões substituídas. |
| Backup/exportação | Conforme ciclos aprovados. | Reaplicar exclusões e anonimizações após restauração; apagar cópias conforme política. |

### Regras para TTL

- `expiraEm` ou `validaAte` determina validade de negócio; a lógica sempre compara esses campos.
- `excluirEm` é o único campo reservado a TTL. O descarte assíncrono nunca confirma cancelamento, expiração, liberação de estoque ou mudança de estado.
- Documento durável ativo, em investigação ou sob obrigação não recebe `excluirEm`. Documentos estritamente efêmeros podem nascer com uma data máxima de segurança, renovada somente dentro do limite aprovado.
- Aplicar retenção legal exige, na mesma transação, definir `bloqueioDescarte = true` e remover `excluirEm`; o booleano sozinho não impede uma política TTL já programada.
- Excluir documento pai não remove subcoleções nem arquivos. O processo elimina Storage e filhos, registra auditoria e só então permite descartar o pai.
- Restaurar backup exige reaplicar lista de supressão, anonimizações e exclusões ocorridas após o ponto restaurado.
- Em eventos de auditoria, o conteúdo permanece imutável; somente `bloqueioDescarte` e `excluirEm` podem mudar pelo serviço de retenção, sempre com um novo log que registre a exceção.
- Nesta fase gratuita nenhuma política TTL, rotina agendada ou recurso de nuvem será ativado. Os campos apenas preparam os testes e o desenho da Etapa 3.

## Isenções de indexação recomendadas

Campos grandes, secretos ou nunca consultados devem ser isentos de índice de campo único quando a configuração for materializada. A decisão final será validada com as consultas e o Emulator.

| Categoria | Campos ou estruturas candidatas |
| --- | --- |
| Texto livre | `descricao`, `comentario`, `conteudo`, `observacaoInterna`, `justificativaRevisao`, mensagens e resumos extensos. |
| Fotografias comerciais | `itens`, `enderecoEntregaFotografia`, `enderecoRetiradaFotografia`, regras financeiras fotografadas. |
| Mapas financeiros | `saldosAnteriores`, `saldosPosteriores`, fotografias fiscais e detalhes de rateio. |
| Listas sem busca | Imagens, anexos, permissões, alterações solicitadas, motivos, sinais e escopos. |
| Conteúdo legal | `conteudoMarkdown`. |
| Geometria | `verticesPoligono`, `caixaDelimitadora` e geopoints quando a busca usa geohash. `bairrosNormalizados` permanece indexado somente para a consulta aprovada. |
| Cinemática | Precisão, direção e velocidade. |
| Segredos e proteção | Token FCM, documento protegido, HMACs, conteúdo cifrado, hashes de chave, requisição, arquivo e webhook. |
| Arquivos privados | Caminhos de Storage, referências de exportação e backup. |
| Auditoria e outbox | `resumoAlteracao`, `camposAlterados`, `corpoMinimo` e `resumoResposta`. |

`tagsPesquisa` e listas de geohash só permanecem indexadas quando houver consulta `array-contains` aprovada. A configuração de `excluirEm` será decidida junto à política TTL na implementação; não se criará índice apenas por precaução.

## Catálogo-base de índices compostos

Esta é a linha de base para a Etapa 3. Somente índices associados a consultas implementadas serão materializados em `firestore.indexes.json`; o Emulator e os testes confirmarão direção, escopo e necessidade antes do deploy.

| Coleção/grupo | Campos do candidato, na ordem lógica | Consulta atendida |
| --- | --- | --- |
| `estabelecimentos` | `publicado`, `statusConta`, `geohash ASC` | Catálogo por proximidade. |
| `produtos` | `idEstabelecimento`, `ativo`, `categoria`, `nomeNormalizado ASC` | Catálogo categorizado. |
| `produtos` | `idEstabelecimento`, `ativo`, `emPromocao`, `nomeNormalizado ASC` | Produtos em promoção. |
| `estoques_produtos` | `idEstabelecimento`, `estoqueBaixo`, `atualizadoEm DESC` | Estoque baixo. |
| `vinculos_estabelecimentos` | `idUsuario`, `statusVinculo`, `atualizadoEm DESC` | Vínculos do usuário. |
| `vinculos_estabelecimentos` | `idEstabelecimento`, `statusVinculo`, `nivelAcesso`, `atualizadoEm DESC` | Equipe do estabelecimento. |
| `envios_arquivos_temporarios` | `statusEnvio`, `expiraEm ASC` | Verificação e limpeza de uploads. |
| `horarios_especiais` | `statusHorario`, `inicioEm ASC` | Exceções por estabelecimento conhecido. |
| `promocoes` | `idEstabelecimento`, `statusPromocao`, `criadoEm DESC` | Administração. |
| `promocoes` | `escopo`, `statusPromocao`, `validoAte ASC` | Candidatas vigentes. |
| `promocoes` | `escopo`, `idEstabelecimento`, `statusPromocao`, `validoAte ASC` | Candidatas do estabelecimento. |
| `cupons` | `idEstabelecimento`, `statusCupom`, `criadoEm DESC` | Administração. |
| `reservas_estoque` | `idPedido`, `statusReserva` | Reservas do pedido. |
| `reservas_estoque` | `statusReserva`, `expiraEm ASC` | Liberação de vencidas. |
| `pedidos` | `idCliente`, `criadoEm DESC` | Histórico do cliente. |
| `historico_status` | `visivelAoCliente`, `sequencia ASC` | Histórico seguro do cliente no pedido conhecido. |
| `pedidos` | `idEstabelecimento`, `fasePedido`, `criadoEm ASC` | Fila operacional. |
| `pedidos` | `idEstabelecimento`, `statusPedido`, `criadoEm DESC` | Pedidos por estado. |
| `pedidos` | `idEstabelecimento`, `tipoAtendimento`, `statusPedido`, `agendadoPara ASC` | Agendados. |
| `pagamentos` | `idPedido`, `criadoEm DESC` | Tentativas do pedido. |
| `pagamentos` | `statusConciliacao`, `proximaConciliacaoEm ASC` | Reconciliação. |
| `eventos_webhooks` | `statusProcessamento`, `proximaTentativaEm ASC` | Retentativas. |
| `entregas` | `idEstabelecimento`, `statusEntrega`, `atualizadoEm DESC` | Operação do estabelecimento. |
| `entregas` | `idMotoboy`, `atualizadoEm DESC` | Histórico do motoboy. |
| `ofertas_entregas` | `idMotoboy`, `statusOferta`, `expiraEm ASC` | Ofertas ativas. |
| `localizacoes_motoboys` | `elegivelOfertaAutonoma`, `geohashAtual ASC` | Candidatos próximos do backend. |
| `assinaturas` | `statusAssinatura`, `proximoVencimento ASC` | Vencimentos. |
| `assinaturas` | `idEstabelecimento`, `criadoEm DESC` | Histórico de planos. |
| `pagamentos_assinaturas` | `idEstabelecimento`, `dataVencimento DESC` | Faturas do estabelecimento. |
| `pagamentos_assinaturas` | `statusPagamento`, `dataVencimento ASC` | Cobranças pendentes. |
| `transacoes_motoboys` | `idMotoboy`, `criadoEm DESC` | Obrigações econômicas do motoboy. |
| `movimentacoes_carteiras_motoboys` | `idMotoboy`, `sequencia DESC` | Razão imutável da carteira. |
| `avaliacoes` | `idCliente`, `criadoEm DESC` | Avaliações do autor. |
| `avaliacoes` | `idEstabelecimento`, `tipoAvaliado`, `statusAvaliacao`, `criadoEm DESC` | Moderação do estabelecimento. |
| `avaliacoes` | `idProduto`, `statusAvaliacao`, `criadoEm DESC` | Avaliações do produto. |
| `avaliacoes` | `idMotoboy`, `statusAvaliacao`, `criadoEm DESC` | Avaliações do motoboy. |
| `avaliacoes` | `idEstabelecimento`, `statusAvaliacao`, `avaliacaoNegativa`, `criadoEm DESC` | Avaliações negativas. |
| `denuncias` | `idDenunciante`, `criadoEm DESC` | Casos do autor. |
| `denuncias` | `statusDenuncia`, `prioridade`, `criadoEm ASC` | Fila de tratamento. |
| `denuncias` | `tipoAlvo`, `idAlvo`, `statusDenuncia`, `criadoEm DESC` | Casos por alvo. |
| `denuncias` | `idEstabelecimento`, `statusDenuncia`, `criadoEm DESC` | Contexto restrito do estabelecimento. |
| `interacoes` | `visibilidade`, `sequencia ASC` | Interações no pai conhecido. |
| `chamados_suporte` | `tipoEscopoAcesso`, `idEscopoAcesso`, `statusChamado`, `atualizadoEm DESC` | Chamados empresariais e do solicitante. |
| `chamados_suporte` | `filaAtendimento`, `statusChamado`, `prioridade`, `atualizadoEm DESC` | Fila administrativa. |
| `mensagens` | `visibilidade`, `sequencia ASC` | Conversa no pai conhecido. |
| `notificacoes` | `idUsuario`, `statusNotificacao`, `arquivada`, `criadoEm DESC` | Caixa do usuário. |
| `notificacoes` | `idUsuario`, `statusNotificacao`, `arquivada`, `lida`, `criadoEm DESC` | Não lidas. |
| `comprovantes_pedidos` | `idCliente`, `criadoEm DESC` | Histórico do cliente. |
| `comprovantes_pedidos` | `idEstabelecimento`, `statusComprovante`, `criadoEm DESC` | Área do estabelecimento. |
| `comprovantes_pedidos` | `idPedido`, `tipoComprovante`, `versaoComprovante DESC` | Versões do pedido. |
| `documentos_legais` | `tipoDocumento`, `idioma`, `statusDocumento`, `atual` | Versão vigente. |
| `documentos_legais` | `statusDocumento`, `criadoEm DESC` | Administração. |
| `consentimentos_usuarios` | `idUsuario`, `tipoConsentimento`, `criadoEm DESC` | Evidências do titular. |
| `estados_consentimentos_usuarios` | `idUsuario`, `tipoConsentimento`, `atualizadoEm DESC` | Estados sanitizados do titular. |
| `solicitacoes_lgpd` | `idUsuario`, `criadoEm DESC` | Solicitações do titular. |
| `solicitacoes_lgpd` | `statusSolicitacao`, `prazoRespostaEm ASC` | Prazos da equipe. |
| `logs_auditoria` | `tipoEntidade`, `idEntidade`, `criadoEm DESC` | Trilha de uma entidade. |
| `logs_auditoria` | `idEstabelecimento`, `acao`, `criadoEm DESC` | Ações no escopo. |
| `regioes_atendidas` | `escopoRegiao`, `statusRegiao`, `estado`, `cidadeNormalizada`, `prioridade ASC` | Cidades da plataforma. |
| `regioes_atendidas` | `idEstabelecimento`, `statusRegiao`, `estado`, `cidadeNormalizada`, `prioridade ASC` | Cidades do estabelecimento. |
| `regioes_atendidas` | `bairrosNormalizados ARRAY_CONTAINS`, `escopoRegiao`, `statusRegiao`, `prioridade ASC` | Bairros da plataforma. |
| `regioes_atendidas` | `bairrosNormalizados ARRAY_CONTAINS`, `idEstabelecimento`, `statusRegiao`, `prioridade ASC` | Bairros do estabelecimento. |
| `regioes_atendidas` | `prefixosGeohash ARRAY_CONTAINS`, `escopoRegiao`, `statusRegiao`, `prioridade ASC` | Geometrias da plataforma. |
| `regioes_atendidas` | `prefixosGeohash ARRAY_CONTAINS`, `idEstabelecimento`, `statusRegiao`, `prioridade ASC` | Geometrias do estabelecimento. |
| `regioes_atendidas` | `idEstabelecimento`, `statusRegiao`, `prioridade ASC` | Regiões vigentes do estabelecimento. |
| `regioes_atendidas` | `statusRegiao`, `validoDe ASC` | Ativações agendadas. |
| `configuracoes_taxa_entrega` | `idEstabelecimento`, `statusConfiguracao`, `vigenteDe DESC` | Versões de taxa. |
| `configuracoes_taxa_entrega` | `statusConfiguracao`, `vigenteDe ASC` | Ativações agendadas. |
| `convites_funcionarios` | `idEstabelecimento`, `statusConvite`, `criadoEm DESC` | Convites administrativos. |
| `convites_funcionarios` | `statusConvite`, `expiraEm ASC` | Expiração lógica. |
| `documentos_fiscais` | `idEstabelecimento`, `statusDocumentoFiscal`, `criadoEm DESC` | Área fiscal. |
| `documentos_fiscais` | `idPedido`, `criadoEm DESC` | Fiscal do pedido. |
| `alertas_antifraude` | `statusAlerta`, `prioridadeRisco DESC`, `criadoEm ASC` | Fila de risco. |
| `alertas_antifraude` | `idEstabelecimento`, `statusAlerta`, `criadoEm DESC` | Alertas do estabelecimento. |
| `metricas_uso` | `escopoMetrica`, `granularidade`, `periodoInicio DESC` | Série global de uso. |
| `metricas_uso` | `escopoMetrica`, `idEstabelecimento`, `granularidade`, `periodoInicio DESC` | Série do estabelecimento. |
| `custos_plataforma` | `escopoCusto`, `periodoInicio DESC` | Série global de custo. |
| `custos_plataforma` | `escopoCusto`, `idEstabelecimento`, `periodoInicio DESC` | Série do estabelecimento. |
| `backups_registros` | `ambiente`, `statusOperacao`, `iniciadoEm DESC` | Operações de recuperação. |
| `idempotencias` | `statusOperacao`, `bloqueadoAte ASC` | Execuções abandonadas. |
| `idempotencias` | `statusOperacao`, `proximaTentativaEm ASC` | Retentativas. |
| `eventos_saida` | `statusEvento`, `proximaTentativaEm ASC` | Eventos prontos. |
| `eventos_saida` | `statusEvento`, `bloqueadoAte ASC` | Arrendamentos vencidos. |

Índices de subcoleção serão criados no escopo correto da coleção ou do grupo somente quando houver consulta de grupo. Consultas diretas por ID e ordenações simples usam índices automáticos e não aparecem como compostos obrigatórios aqui.

## Regras de integridade consolidadas

- Um cliente não escreve preço, estoque, comissão, saldo, status financeiro ou aprovação.
- Alterar produto não altera fotografia de pedido existente.
- Desativar usuário ou estabelecimento impede novas operações, mas preserva históricos obrigatórios.
- Um vínculo revogado perde acesso sem exigir alteração em todos os documentos do estabelecimento.
- Tokens FCM, documentos, códigos e credenciais nunca aparecem em documentos de catálogo.
- Toda referência entre documentos usa ID explícito e validação no backend; não há cascata automática no Firestore.
- Subcoleções precisam de estratégia explícita de exclusão, pois excluir o documento pai não as remove.
- Campos redundantes de escopo são derivados pelo backend e precisam coincidir com as entidades relacionadas.
- Cliente não escolhe IDs de estabelecimento, motoboy, preço, promoção, taxa, regra, papel ou destinatário de notificação.
- Documento financeiro, auditoria, mensagem/evento imutável e versão publicada nunca são corrigidos por sobrescrita; usa-se compensação, nova versão ou novo evento.
- `nomeNormalizado`, `estoqueBaixo`, médias, contadores e demais projeções são mantidos por operação autoritativa e podem ser reconciliados.
- Textos livres são sanitizados e limitados. Hipóteses iniciais: mil caracteres em avaliação, quatro mil em suporte/denúncia e 120 no título do chamado.
- Cada mensagem, interação, denúncia ou contestação aceita no máximo cinco anexos pelo contrato comum. O documento final contém somente anexo aprovado; autorização, tipo real, tamanho, hash e caminho privado são validados antes da associação. O limite inicial de arquivo é hipótese a aprovar antes do Storage.
- App Check, autenticação e vínculo são controles complementares; nenhum deles substitui validação de negócio na Function.
- Idempotência, versão de estado e transação protegem concorrência; TTL e listeners nunca são mecanismos de integridade.
- Dados de cartão, certificado fiscal, segredo de integração, token bruto de convite e código de entrega não são persistidos em documentos legíveis pelo aplicativo.
- Na política atual de custo zero, pagamentos, mapas, fiscal, notificações externas, Functions, Storage, TTL e backup de produção permanecem simulados ou apenas modelados.

## Validação de conclusão da Etapa 2

- [x] Todas as coleções canônicas possuem responsabilidade e contrato detalhado.
- [x] Entidades multiestabelecimento carregam `idEstabelecimento` quando aplicável.
- [x] Dados públicos, pessoais, fiscais, financeiros, secretos e efêmeros estão separados por documento.
- [x] Fontes de verdade, projeções, fotografias históricas e documentos imutáveis estão identificados.
- [x] Estados, transições, invariantes e autoridades de escrita foram registrados.
- [x] Idempotência, webhooks, concorrência e outbox possuem contratos explícitos.
- [x] Suporte, avaliações, denúncias, notificações e comprovantes foram normalizados.
- [x] LGPD, termos, auditoria, fiscal, antifraude, regiões, taxas e convites foram modelados.
- [x] Métricas, custos, configuração, backups e modo gratuito/emulado foram delimitados.
- [x] Validade de negócio e descarte por TTL usam campos diferentes.
- [x] Matriz preliminar de retenção e estratégia para Storage/subcoleções foram registradas.
- [x] Consultas paginadas, matriz de acesso, isenções e catálogo-base de índices foram consolidados.
- [x] Horários especiais, ordenação normalizada e projeção de estoque baixo foram incorporados.
- [x] Nenhum recurso Firebase, plano Blaze, Function, Storage, TTL ou backup real foi ativado.

O modelo está tecnicamente pronto para orientar os testes positivos e negativos das Rules na Etapa 3 com Emulator Suite e dados fictícios.

## Decisões que permanecem antes da produção

- Aprovação jurídica das bases legais, textos, prazos de retenção e fluxo de direitos do titular.
- Parecer fiscal/contábil sobre responsabilidades, documentos, municípios, guarda e provedor.
- Estratégia de proteção em nível de aplicação para CPF/CNPJ e demais dados de alto risco.
- Política antifraude, limiares, equipe de revisão, contestação e relatório de impacto.
- Provedores de pagamento, mapas, fiscal e comunicação, todos ainda simulados.
- Plano Firebase, orçamento, região, RPO/RTO, backup real e processo de restauração.
- Limites finais de textos, anexos, itens, polígonos e frequência de localização após testes.

Essas decisões bloqueiam uso real e produção, mas não impedem iniciar a Etapa 3 localmente sem dados pessoais reais.

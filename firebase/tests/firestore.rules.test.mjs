import {
  after,
  before,
  beforeEach,
  describe,
  test
} from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  GeoPoint,
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';

const idProjeto = 'demo-manda-ja';
const caminhoRegras = fileURLToPath(
  new URL('../firestore.rules', import.meta.url)
);

let ambiente;

function dadosUsuario(
  idUsuario,
  {
    ativo = true,
    bloqueado = false,
    nivelAcessoPrincipal = 'n8_cliente'
  } = {}
) {
  const agora = Timestamp.fromMillis(1_700_000_000_000);

  return {
    idUsuario,
    nomeExibicao: `Usuario ${idUsuario}`,
    nivelAcessoPrincipal,
    ativo,
    bloqueado,
    configuracoesNotificacao: {},
    versaoEsquema: 1,
    criadoEm: agora,
    atualizadoEm: agora
  };
}

function dadosEndereco(
  idEndereco,
  {
    criadoEm = serverTimestamp(),
    atualizadoEm = serverTimestamp()
  } = {}
) {
  return {
    idEndereco,
    rotulo: 'casa',
    destinatario: 'Pessoa Cliente',
    telefoneContato: '11999999999',
    logradouro: 'Rua de Teste',
    numero: '100',
    complemento: null,
    bairro: 'Centro',
    cidade: 'Sao Paulo',
    estado: 'SP',
    cep: '01001000',
    pontoReferencia: null,
    localizacao: null,
    geohash: null,
    principal: true,
    ativo: true,
    criadoEm,
    atualizadoEm
  };
}

async function semearDocumentos(documentos) {
  await ambiente.withSecurityRulesDisabled(async (contexto) => {
    const banco = contexto.firestore();

    for (const item of documentos) {
      await setDoc(doc(banco, ...item.caminho), item.dados);
    }
  });
}

function bancoAutenticado(idUsuario, nivelAcesso = 'n8_cliente') {
  return ambiente
    .authenticatedContext(idUsuario, { nivelAcesso })
    .firestore();
}

describe('Firestore Rules do MandaJa', () => {
  before(async () => {
    ambiente = await initializeTestEnvironment({
      projectId: idProjeto,
      firestore: {
        rules: readFileSync(caminhoRegras, 'utf8')
      }
    });
  });

  beforeEach(async () => {
    await ambiente.clearFirestore();
  });

  after(async () => {
    await ambiente.cleanup();
  });

  test('titular le apenas o proprio perfil', async () => {
    await semearDocumentos([
      {
        caminho: ['usuarios', 'cliente_a'],
        dados: dadosUsuario('cliente_a')
      },
      {
        caminho: ['usuarios', 'cliente_b'],
        dados: dadosUsuario('cliente_b')
      }
    ]);

    const banco = bancoAutenticado('cliente_a');

    await assertSucceeds(getDoc(doc(banco, 'usuarios', 'cliente_a')));
    await assertFails(getDoc(doc(banco, 'usuarios', 'cliente_b')));
    await assertFails(getDocs(collection(banco, 'usuarios')));
  });

  test('titular altera somente nome e nao eleva privilegio', async () => {
    await semearDocumentos([
      {
        caminho: ['usuarios', 'cliente_a'],
        dados: dadosUsuario('cliente_a')
      }
    ]);

    const banco = bancoAutenticado('cliente_a');
    const perfil = doc(banco, 'usuarios', 'cliente_a');

    await assertSucceeds(
      updateDoc(perfil, {
        nomeExibicao: 'Nome Atualizado',
        atualizadoEm: serverTimestamp()
      })
    );

    await assertFails(
      updateDoc(perfil, {
        nivelAcessoPrincipal: 'n1_dev',
        atualizadoEm: serverTimestamp()
      })
    );

    await assertFails(
      updateDoc(perfil, {
        bloqueado: true,
        ativo: false,
        atualizadoEm: serverTimestamp()
      })
    );

    await assertFails(deleteDoc(perfil));

    const bancoSemPerfil = bancoAutenticado('cliente_novo');
    await assertFails(
      setDoc(
        doc(bancoSemPerfil, 'usuarios', 'cliente_novo'),
        dadosUsuario('cliente_novo')
      )
    );
  });

  test('perfil bloqueado nao opera e claim nao substitui bloqueio', async () => {
    await semearDocumentos([
      {
        caminho: ['usuarios', 'cliente_bloqueado'],
        dados: dadosUsuario('cliente_bloqueado', { bloqueado: true })
      },
      {
        caminho: ['usuarios', 'n1_bloqueado'],
        dados: dadosUsuario('n1_bloqueado', {
          bloqueado: true,
          nivelAcessoPrincipal: 'n1_dev'
        })
      },
      {
        caminho: ['estabelecimentos', 'loja_oculta'],
        dados: {
          idEstabelecimento: 'loja_oculta',
          publicado: false,
          statusConta: 'ativo'
        }
      },
      {
        caminho: [
          'usuarios',
          'cliente_bloqueado',
          'enderecos',
          'endereco_bloqueado'
        ],
        dados: dadosEndereco('endereco_bloqueado', {
          criadoEm: Timestamp.fromMillis(1_700_000_000_000),
          atualizadoEm: Timestamp.fromMillis(1_700_000_000_000)
        })
      },
      {
        caminho: ['vinculos_estabelecimentos', 'vinculo_bloqueado'],
        dados: {
          idVinculo: 'vinculo_bloqueado',
          idUsuario: 'cliente_bloqueado',
          idEstabelecimento: 'loja_a',
          nivelAcesso: 'n3_gerente'
        }
      },
      {
        caminho: [
          'envios_arquivos_temporarios',
          'envio_bloqueado'
        ],
        dados: {
          idEnvioArquivo: 'envio_bloqueado',
          idUsuario: 'cliente_bloqueado',
          statusEnvio: 'autorizado'
        }
      }
    ]);

    const bancoCliente = bancoAutenticado('cliente_bloqueado');
    const bancoN1 = bancoAutenticado('n1_bloqueado', 'n1_dev');

    await assertSucceeds(
      getDoc(doc(bancoCliente, 'usuarios', 'cliente_bloqueado'))
    );
    await assertFails(
      updateDoc(doc(bancoCliente, 'usuarios', 'cliente_bloqueado'), {
        nomeExibicao: 'Tentativa',
        atualizadoEm: serverTimestamp()
      })
    );
    await assertFails(
      getDoc(doc(bancoN1, 'estabelecimentos', 'loja_oculta'))
    );
    await assertFails(
      getDoc(
        doc(
          bancoCliente,
          'usuarios',
          'cliente_bloqueado',
          'enderecos',
          'endereco_bloqueado'
        )
      )
    );
    await assertFails(
      getDoc(
        doc(
          bancoCliente,
          'vinculos_estabelecimentos',
          'vinculo_bloqueado'
        )
      )
    );
    await assertFails(
      getDoc(
        doc(
          bancoCliente,
          'envios_arquivos_temporarios',
          'envio_bloqueado'
        )
      )
    );
  });

  test('endereco proprio valido pode ser criado e atualizado', async () => {
    await semearDocumentos([
      {
        caminho: ['usuarios', 'cliente_a'],
        dados: dadosUsuario('cliente_a')
      }
    ]);

    const banco = bancoAutenticado('cliente_a');
    const endereco = doc(
      banco,
      'usuarios',
      'cliente_a',
      'enderecos',
      'endereco_1'
    );

    await assertSucceeds(
      setDoc(endereco, dadosEndereco('endereco_1'))
    );

    await assertSucceeds(
      updateDoc(endereco, {
        rotulo: 'trabalho',
        principal: false,
        atualizadoEm: serverTimestamp()
      })
    );

    await assertSucceeds(getDoc(endereco));
  });

  test('endereco invalido, de outro usuario ou excluido e negado', async () => {
    const instante = Timestamp.fromMillis(1_700_000_000_000);

    await semearDocumentos([
      {
        caminho: ['usuarios', 'cliente_a'],
        dados: dadosUsuario('cliente_a')
      },
      {
        caminho: ['usuarios', 'cliente_b'],
        dados: dadosUsuario('cliente_b')
      },
      {
        caminho: [
          'usuarios',
          'cliente_a',
          'enderecos',
          'endereco_existente'
        ],
        dados: dadosEndereco('endereco_existente', {
          criadoEm: instante,
          atualizadoEm: instante
        })
      },
      {
        caminho: [
          'usuarios',
          'cliente_a',
          'enderecos',
          'endereco_geocodificado'
        ],
        dados: {
          ...dadosEndereco('endereco_geocodificado', {
            criadoEm: instante,
            atualizadoEm: instante
          }),
          localizacao: new GeoPoint(-23.5505, -46.6333),
          geohash: '6gyf4bf'
        }
      }
    ]);

    const banco = bancoAutenticado('cliente_a');

    await assertFails(
      setDoc(
        doc(
          banco,
          'usuarios',
          'cliente_a',
          'enderecos',
          'id_do_caminho'
        ),
        dadosEndereco('id_diferente')
      )
    );

    await assertFails(
      setDoc(
        doc(
          banco,
          'usuarios',
          'cliente_a',
          'enderecos',
          'endereco_com_coordenada'
        ),
        {
          ...dadosEndereco('endereco_com_coordenada'),
          localizacao: new GeoPoint(-22.9068, -43.1729),
          geohash: '75cm8y'
        }
      )
    );

    await assertFails(
      updateDoc(
        doc(
          banco,
          'usuarios',
          'cliente_a',
          'enderecos',
          'endereco_geocodificado'
        ),
        {
          localizacao: new GeoPoint(-22.9068, -43.1729),
          geohash: '75cm8y',
          atualizadoEm: serverTimestamp()
        }
      )
    );

    await assertFails(
      setDoc(
        doc(
          banco,
          'usuarios',
          'cliente_a',
          'enderecos',
          'endereco_extra'
        ),
        {
          ...dadosEndereco('endereco_extra'),
          campoNaoPermitido: true
        }
      )
    );

    await assertFails(
      getDoc(
        doc(
          banco,
          'usuarios',
          'cliente_b',
          'enderecos',
          'qualquer'
        )
      )
    );

    await assertFails(
      deleteDoc(
        doc(
          banco,
          'usuarios',
          'cliente_a',
          'enderecos',
          'endereco_existente'
        )
      )
    );
  });

  test('vinculo exige titular e consulta filtrada', async () => {
    await semearDocumentos([
      {
        caminho: ['usuarios', 'cliente_a'],
        dados: dadosUsuario('cliente_a')
      },
      {
        caminho: ['vinculos_estabelecimentos', 'vinculo_a'],
        dados: {
          idVinculo: 'vinculo_a',
          idUsuario: 'cliente_a',
          idEstabelecimento: 'loja_a',
          nivelAcesso: 'n3_gerente'
        }
      },
      {
        caminho: ['vinculos_estabelecimentos', 'vinculo_b'],
        dados: {
          idVinculo: 'vinculo_b',
          idUsuario: 'cliente_b',
          idEstabelecimento: 'loja_b',
          nivelAcesso: 'n3_gerente'
        }
      }
    ]);

    const banco = bancoAutenticado('cliente_a');
    const consultaPropria = query(
      collection(banco, 'vinculos_estabelecimentos'),
      where('idUsuario', '==', 'cliente_a'),
      limit(20)
    );
    const consultaSemFiltro = query(
      collection(banco, 'vinculos_estabelecimentos'),
      limit(20)
    );

    await assertSucceeds(
      getDoc(
        doc(banco, 'vinculos_estabelecimentos', 'vinculo_a')
      )
    );
    await assertFails(
      getDoc(
        doc(banco, 'vinculos_estabelecimentos', 'vinculo_b')
      )
    );
    await assertSucceeds(getDocs(consultaPropria));
    await assertFails(getDocs(consultaSemFiltro));
    await assertFails(
      setDoc(
        doc(banco, 'vinculos_estabelecimentos', 'novo_vinculo'),
        {
          idVinculo: 'novo_vinculo',
          idUsuario: 'cliente_a',
          idEstabelecimento: 'loja_a',
          nivelAcesso: 'n1_dev'
        }
      )
    );
  });

  test('autorizacao temporaria permite somente get proprio por ID', async () => {
    await semearDocumentos([
      {
        caminho: ['usuarios', 'cliente_a'],
        dados: dadosUsuario('cliente_a')
      },
      {
        caminho: ['envios_arquivos_temporarios', 'envio_a'],
        dados: {
          idEnvioArquivo: 'envio_a',
          idUsuario: 'cliente_a',
          statusEnvio: 'autorizado'
        }
      },
      {
        caminho: ['envios_arquivos_temporarios', 'envio_b'],
        dados: {
          idEnvioArquivo: 'envio_b',
          idUsuario: 'cliente_b',
          statusEnvio: 'autorizado'
        }
      }
    ]);

    const banco = bancoAutenticado('cliente_a');

    await assertSucceeds(
      getDoc(
        doc(banco, 'envios_arquivos_temporarios', 'envio_a')
      )
    );
    await assertFails(
      getDoc(
        doc(banco, 'envios_arquivos_temporarios', 'envio_b')
      )
    );
    await assertFails(
      getDocs(
        query(
          collection(banco, 'envios_arquivos_temporarios'),
          where('idUsuario', '==', 'cliente_a'),
          limit(10)
        )
      )
    );
    await assertFails(
      updateDoc(
        doc(banco, 'envios_arquivos_temporarios', 'envio_a'),
        {
          statusEnvio: 'aprovado'
        }
      )
    );
  });

  test('catalogo publico exige publicacao, conta ativa e filtros', async () => {
    await semearDocumentos([
      {
        caminho: ['estabelecimentos', 'loja_publica'],
        dados: {
          idEstabelecimento: 'loja_publica',
          publicado: true,
          statusConta: 'ativo'
        }
      },
      {
        caminho: ['estabelecimentos', 'loja_oculta'],
        dados: {
          idEstabelecimento: 'loja_oculta',
          publicado: false,
          statusConta: 'ativo'
        }
      },
      {
        caminho: ['estabelecimentos', 'loja_bloqueada'],
        dados: {
          idEstabelecimento: 'loja_bloqueada',
          publicado: true,
          statusConta: 'bloqueado'
        }
      }
    ]);

    const banco = ambiente.unauthenticatedContext().firestore();
    const consultaPublica = query(
      collection(banco, 'estabelecimentos'),
      where('publicado', '==', true),
      where('statusConta', '==', 'ativo'),
      limit(20)
    );
    const consultaIncompleta = query(
      collection(banco, 'estabelecimentos'),
      where('publicado', '==', true),
      limit(20)
    );
    const consultaSemLimite = query(
      collection(banco, 'estabelecimentos'),
      where('publicado', '==', true),
      where('statusConta', '==', 'ativo')
    );
    const consultaComLimiteExcessivo = query(
      collection(banco, 'estabelecimentos'),
      where('publicado', '==', true),
      where('statusConta', '==', 'ativo'),
      limit(51)
    );

    await assertSucceeds(
      getDoc(doc(banco, 'estabelecimentos', 'loja_publica'))
    );
    await assertFails(
      getDoc(doc(banco, 'estabelecimentos', 'loja_oculta'))
    );
    await assertFails(
      getDoc(doc(banco, 'estabelecimentos', 'loja_bloqueada'))
    );
    await assertSucceeds(getDocs(consultaPublica));
    await assertFails(getDocs(consultaIncompleta));
    await assertFails(getDocs(consultaSemLimite));
    await assertFails(getDocs(consultaComLimiteExcessivo));
  });

  test('horario especial depende do estabelecimento publico', async () => {
    await semearDocumentos([
      {
        caminho: ['estabelecimentos', 'loja_publica'],
        dados: {
          idEstabelecimento: 'loja_publica',
          publicado: true,
          statusConta: 'ativo'
        }
      },
      {
        caminho: ['estabelecimentos', 'loja_oculta'],
        dados: {
          idEstabelecimento: 'loja_oculta',
          publicado: false,
          statusConta: 'ativo'
        }
      },
      {
        caminho: [
          'estabelecimentos',
          'loja_publica',
          'horarios_especiais',
          'horario_publico'
        ],
        dados: {
          idHorarioEspecial: 'horario_publico',
          idEstabelecimento: 'loja_publica',
          statusHorario: 'agendado'
        }
      },
      {
        caminho: [
          'estabelecimentos',
          'loja_oculta',
          'horarios_especiais',
          'horario_oculto'
        ],
        dados: {
          idHorarioEspecial: 'horario_oculto',
          idEstabelecimento: 'loja_oculta',
          statusHorario: 'agendado'
        }
      },
      {
        caminho: [
          'estabelecimentos',
          'loja_publica',
          'horarios_especiais',
          'horario_divergente'
        ],
        dados: {
          idHorarioEspecial: 'horario_divergente',
          idEstabelecimento: 'outra_loja',
          statusHorario: 'agendado'
        }
      }
    ]);

    const banco = ambiente.unauthenticatedContext().firestore();
    const horarios = collection(
      banco,
      'estabelecimentos',
      'loja_publica',
      'horarios_especiais'
    );
    const consultaPublica = query(
      horarios,
      where('idEstabelecimento', '==', 'loja_publica'),
      limit(20)
    );

    await assertSucceeds(
      getDoc(
        doc(
          banco,
          'estabelecimentos',
          'loja_publica',
          'horarios_especiais',
          'horario_publico'
        )
      )
    );
    await assertFails(
      getDoc(
        doc(
          banco,
          'estabelecimentos',
          'loja_oculta',
          'horarios_especiais',
          'horario_oculto'
        )
      )
    );
    await assertFails(
      getDoc(
        doc(
          banco,
          'estabelecimentos',
          'loja_publica',
          'horarios_especiais',
          'horario_divergente'
        )
      )
    );
    await assertSucceeds(getDocs(consultaPublica));
    await assertFails(getDocs(query(horarios)));
    await assertFails(
      getDocs(
        query(
          horarios,
          where('idEstabelecimento', '==', 'loja_publica'),
          limit(51)
        )
      )
    );
  });

  test('produto publico depende do produto e do estabelecimento', async () => {
    await semearDocumentos([
      {
        caminho: ['estabelecimentos', 'loja_publica'],
        dados: {
          idEstabelecimento: 'loja_publica',
          publicado: true,
          statusConta: 'ativo'
        }
      },
      {
        caminho: ['estabelecimentos', 'loja_oculta'],
        dados: {
          idEstabelecimento: 'loja_oculta',
          publicado: false,
          statusConta: 'ativo'
        }
      },
      {
        caminho: ['produtos', 'produto_publico'],
        dados: {
          idProduto: 'produto_publico',
          idEstabelecimento: 'loja_publica',
          ativo: true,
          disponivelParaVenda: true
        }
      },
      {
        caminho: ['produtos', 'produto_inativo'],
        dados: {
          idProduto: 'produto_inativo',
          idEstabelecimento: 'loja_publica',
          ativo: false,
          disponivelParaVenda: false
        }
      },
      {
        caminho: ['produtos', 'produto_oculto'],
        dados: {
          idProduto: 'produto_oculto',
          idEstabelecimento: 'loja_oculta',
          ativo: true,
          disponivelParaVenda: true
        }
      }
    ]);

    const banco = ambiente.unauthenticatedContext().firestore();
    const consultaProdutos = query(
      collection(banco, 'produtos'),
      where('idEstabelecimento', '==', 'loja_publica'),
      where('ativo', '==', true),
      where('disponivelParaVenda', '==', true),
      limit(10)
    );

    await assertSucceeds(
      getDoc(doc(banco, 'produtos', 'produto_publico'))
    );
    await assertFails(
      getDoc(doc(banco, 'produtos', 'produto_inativo'))
    );
    await assertFails(
      getDoc(doc(banco, 'produtos', 'produto_oculto'))
    );
    await assertSucceeds(getDocs(consultaProdutos));
  });

  test('estado publico e documentos legais seguem acesso minimo', async () => {
    await semearDocumentos([
      {
        caminho: ['configuracoes_plataforma', 'estado_publico'],
        dados: {
          idConfiguracao: 'estado_publico',
          modoManutencao: false
        }
      },
      {
        caminho: ['configuracoes_plataforma', 'geral'],
        dados: {
          idConfiguracao: 'geral',
          modoManutencao: false
        }
      },
      {
        caminho: ['documentos_legais', 'termos_atual'],
        dados: {
          idDocumento: 'termos_atual',
          statusDocumento: 'publicado',
          atual: true
        }
      },
      {
        caminho: ['documentos_legais', 'termos_antigo'],
        dados: {
          idDocumento: 'termos_antigo',
          statusDocumento: 'substituido',
          atual: false
        }
      },
      {
        caminho: ['documentos_legais', 'termos_rascunho'],
        dados: {
          idDocumento: 'termos_rascunho',
          statusDocumento: 'rascunho',
          atual: false
        }
      }
    ]);

    const banco = ambiente.unauthenticatedContext().firestore();
    const consultaAtuais = query(
      collection(banco, 'documentos_legais'),
      where('statusDocumento', '==', 'publicado'),
      where('atual', '==', true),
      limit(10)
    );

    await assertSucceeds(
      getDoc(
        doc(banco, 'configuracoes_plataforma', 'estado_publico')
      )
    );
    await assertFails(
      getDoc(doc(banco, 'configuracoes_plataforma', 'geral'))
    );
    await assertSucceeds(
      getDoc(doc(banco, 'documentos_legais', 'termos_atual'))
    );
    await assertSucceeds(
      getDoc(doc(banco, 'documentos_legais', 'termos_antigo'))
    );
    await assertFails(
      getDoc(doc(banco, 'documentos_legais', 'termos_rascunho'))
    );
    await assertSucceeds(getDocs(consultaAtuais));
  });

  test('N1 ativo acessa catalogo oculto mas nao dados brutos sensiveis', async () => {
    await semearDocumentos([
      {
        caminho: ['usuarios', 'dev_n1'],
        dados: dadosUsuario('dev_n1', {
          nivelAcessoPrincipal: 'n1_dev'
        })
      },
      {
        caminho: ['usuarios', 'falso_n1'],
        dados: dadosUsuario('falso_n1', {
          nivelAcessoPrincipal: 'n1_dev'
        })
      },
      {
        caminho: ['usuarios', 'cliente_a'],
        dados: dadosUsuario('cliente_a')
      },
      {
        caminho: ['estabelecimentos', 'loja_oculta'],
        dados: {
          idEstabelecimento: 'loja_oculta',
          publicado: false,
          statusConta: 'ativo'
        }
      },
      {
        caminho: ['usuarios_privados', 'cliente_a'],
        dados: {
          idUsuario: 'cliente_a',
          documentoProtegido: 'nao_expor'
        }
      },
      {
        caminho: ['codigos_entrega', 'codigo_a'],
        dados: {
          idEntrega: 'entrega_a',
          hashCodigo: 'nao_expor'
        }
      }
    ]);

    const banco = bancoAutenticado('dev_n1', 'n1_dev');
    const bancoFalsoN1 = bancoAutenticado(
      'falso_n1',
      'n8_cliente'
    );

    await assertSucceeds(
      getDoc(doc(banco, 'estabelecimentos', 'loja_oculta'))
    );
    await assertFails(
      getDoc(doc(banco, 'usuarios_privados', 'cliente_a'))
    );
    await assertFails(
      getDoc(doc(banco, 'codigos_entrega', 'codigo_a'))
    );
    await assertFails(
      getDoc(doc(banco, 'usuarios', 'cliente_a'))
    );
    await assertFails(
      getDoc(
        doc(bancoFalsoN1, 'estabelecimentos', 'loja_oculta')
      )
    );
    await assertFails(
      getDoc(doc(banco, 'colecao_desconhecida', 'documento'))
    );
  });
});

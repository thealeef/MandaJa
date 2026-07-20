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
  Timestamp,
  doc,
  setDoc
} from 'firebase/firestore';
import {
  deleteObject,
  getBytes,
  getMetadata,
  ref,
  updateMetadata,
  uploadBytes
} from 'firebase/storage';

const idProjeto = 'demo-manda-ja';
const caminhoRegrasFirestore = fileURLToPath(
  new URL('../firestore.rules', import.meta.url)
);
const caminhoRegrasStorage = fileURLToPath(
  new URL('../storage.rules', import.meta.url)
);

let ambiente;

function dadosUsuario(
  idUsuario,
  {
    ativo = true,
    bloqueado = false
  } = {}
) {
  return {
    idUsuario,
    ativo,
    bloqueado
  };
}

function dadosEnvio(
  idUsuario,
  idEnvioArquivo,
  {
    caminhoTemporario =
      `temporarios/${idUsuario}/${idEnvioArquivo}`,
    statusEnvio = 'autorizado',
    expiraEm = Timestamp.fromMillis(Date.now() + 60_000),
    tiposMimePermitidos = ['image/png'],
    tamanhoMaximoBytes = 8
  } = {}
) {
  return {
    idEnvioArquivo,
    idUsuario,
    caminhoTemporario,
    statusEnvio,
    expiraEm,
    tiposMimePermitidos,
    tamanhoMaximoBytes
  };
}

async function semearAutorizacao(
  idUsuario,
  idEnvioArquivo,
  {
    usuario = {},
    envio = {}
  } = {}
) {
  await ambiente.withSecurityRulesDisabled(async (contexto) => {
    const banco = contexto.firestore();

    await setDoc(
      doc(banco, 'usuarios', idUsuario),
      dadosUsuario(idUsuario, usuario)
    );
    await setDoc(
      doc(
        banco,
        'envios_arquivos_temporarios',
        idEnvioArquivo
      ),
      dadosEnvio(idUsuario, idEnvioArquivo, envio)
    );
  });
}

function armazenamentoAutenticado(idUsuario, nivelAcesso = 'n8_cliente') {
  return ambiente
    .authenticatedContext(idUsuario, { nivelAcesso })
    .storage();
}

function conteudo(tamanho = 4) {
  return new Uint8Array(tamanho).fill(1);
}

describe('Storage Rules do MandaJa', () => {
  before(async () => {
    ambiente = await initializeTestEnvironment({
      projectId: idProjeto,
      firestore: {
        rules: readFileSync(caminhoRegrasFirestore, 'utf8')
      },
      storage: {
        rules: readFileSync(caminhoRegrasStorage, 'utf8')
      }
    });
  });

  beforeEach(async () => {
    await ambiente.clearFirestore();
    await ambiente.clearStorage();
  });

  after(async () => {
    await ambiente.cleanup();
  });

  test('aceita primeiro upload temporario autorizado', async () => {
    const idUsuario = 'cliente_upload_valido';
    const idEnvio = 'envio_valido';

    await semearAutorizacao(idUsuario, idEnvio);

    const armazenamento = armazenamentoAutenticado(idUsuario);
    const arquivo = ref(
      armazenamento,
      `temporarios/${idUsuario}/${idEnvio}`
    );

    await assertSucceeds(
      uploadBytes(
        arquivo,
        conteudo(8),
        { contentType: 'image/png' }
      )
    );
  });

  test('nega usuario anonimo ou caminho de outro usuario', async () => {
    const idUsuario = 'cliente_dono';
    const idEnvio = 'envio_dono';

    await semearAutorizacao(idUsuario, idEnvio);

    const caminho = `temporarios/${idUsuario}/${idEnvio}`;
    const armazenamentoAnonimo =
      ambiente.unauthenticatedContext().storage();
    const armazenamentoOutro =
      armazenamentoAutenticado('cliente_intruso');

    await assertFails(
      uploadBytes(
        ref(armazenamentoAnonimo, caminho),
        conteudo(),
        { contentType: 'image/png' }
      )
    );
    await assertFails(
      uploadBytes(
        ref(armazenamentoOutro, caminho),
        conteudo(),
        { contentType: 'image/png' }
      )
    );
  });

  test('nega usuario bloqueado ou inativo', async () => {
    const casos = [
      {
        idUsuario: 'cliente_bloqueado',
        usuario: { bloqueado: true }
      },
      {
        idUsuario: 'cliente_inativo',
        usuario: { ativo: false }
      }
    ];

    for (const caso of casos) {
      const idEnvio = `envio_${caso.idUsuario}`;

      await semearAutorizacao(caso.idUsuario, idEnvio, {
        usuario: caso.usuario
      });

      const armazenamento =
        armazenamentoAutenticado(caso.idUsuario);

      await assertFails(
        uploadBytes(
          ref(
            armazenamento,
            `temporarios/${caso.idUsuario}/${idEnvio}`
          ),
          conteudo(),
          { contentType: 'image/png' }
        )
      );
    }
  });

  test('nega autorizacao inexistente, divergente ou expirada', async () => {
    const idUsuario = 'cliente_autorizacao';
    const armazenamento = armazenamentoAutenticado(idUsuario);

    await ambiente.withSecurityRulesDisabled(async (contexto) => {
      await setDoc(
        doc(contexto.firestore(), 'usuarios', idUsuario),
        dadosUsuario(idUsuario)
      );
    });

    await assertFails(
      uploadBytes(
        ref(
          armazenamento,
          `temporarios/${idUsuario}/envio_inexistente`
        ),
        conteudo(),
        { contentType: 'image/png' }
      )
    );

    await semearAutorizacao(idUsuario, 'envio_divergente', {
      envio: {
        caminhoTemporario:
          `temporarios/${idUsuario}/outro_envio`
      }
    });

    await assertFails(
      uploadBytes(
        ref(
          armazenamento,
          `temporarios/${idUsuario}/envio_divergente`
        ),
        conteudo(),
        { contentType: 'image/png' }
      )
    );

    await semearAutorizacao(idUsuario, 'envio_expirado', {
      envio: {
        expiraEm: Timestamp.fromMillis(Date.now() - 60_000)
      }
    });

    await assertFails(
      uploadBytes(
        ref(
          armazenamento,
          `temporarios/${idUsuario}/envio_expirado`
        ),
        conteudo(),
        { contentType: 'image/png' }
      )
    );
  });

  test('nega estado diferente de autorizado', async () => {
    const idUsuario = 'cliente_estado';
    const idEnvio = 'envio_recebido';

    await semearAutorizacao(idUsuario, idEnvio, {
      envio: {
        statusEnvio: 'recebido'
      }
    });

    const armazenamento = armazenamentoAutenticado(idUsuario);

    await assertFails(
      uploadBytes(
        ref(
          armazenamento,
          `temporarios/${idUsuario}/${idEnvio}`
        ),
        conteudo(),
        { contentType: 'image/png' }
      )
    );
  });

  test('nega MIME, tamanho e arquivo vazio invalidos', async () => {
    const idUsuario = 'cliente_limites';
    const casos = [
      {
        idEnvio: 'envio_mime',
        dados: conteudo(),
        metadados: { contentType: 'application/pdf' }
      },
      {
        idEnvio: 'envio_grande',
        dados: conteudo(9),
        metadados: { contentType: 'image/png' }
      },
      {
        idEnvio: 'envio_vazio',
        dados: conteudo(0),
        metadados: { contentType: 'image/png' }
      }
    ];

    for (const caso of casos) {
      await semearAutorizacao(idUsuario, caso.idEnvio);

      const armazenamento = armazenamentoAutenticado(idUsuario);

      await assertFails(
        uploadBytes(
          ref(
            armazenamento,
            `temporarios/${idUsuario}/${caso.idEnvio}`
          ),
          caso.dados,
          caso.metadados
        )
      );
    }
  });

  test('nega sobrescrita, leitura, metadados e exclusao', async () => {
    const idUsuario = 'cliente_objeto_existente';
    const idEnvio = 'envio_objeto_existente';

    await semearAutorizacao(idUsuario, idEnvio);

    const armazenamento = armazenamentoAutenticado(idUsuario);
    const arquivo = ref(
      armazenamento,
      `temporarios/${idUsuario}/${idEnvio}`
    );

    await assertSucceeds(
      uploadBytes(
        arquivo,
        conteudo(),
        { contentType: 'image/png' }
      )
    );
    await assertFails(
      uploadBytes(
        arquivo,
        conteudo(2),
        { contentType: 'image/png' }
      )
    );
    await assertFails(getBytes(arquivo));
    await assertFails(getMetadata(arquivo));
    await assertFails(
      updateMetadata(arquivo, {
        customMetadata: {
          origem: 'cliente'
        }
      })
    );
    await assertFails(deleteObject(arquivo));
  });

  test('nega caminhos finais e qualquer caminho nao modelado', async () => {
    const idUsuario = 'cliente_caminho_final';
    const idEnvio = 'envio_caminho_final';

    await semearAutorizacao(idUsuario, idEnvio);

    const armazenamento = armazenamentoAutenticado(idUsuario);

    await assertFails(
      uploadBytes(
        ref(
          armazenamento,
          'chamados_suporte/chamado_1/mensagens/mensagem_1/anexo_1'
        ),
        conteudo(),
        { contentType: 'image/png' }
      )
    );
    await assertFails(
      uploadBytes(
        ref(armazenamento, 'caminho_desconhecido/arquivo'),
        conteudo(),
        { contentType: 'image/png' }
      )
    );
  });

  test('claim N1 nao ignora a autorizacao do arquivo', async () => {
    await ambiente.withSecurityRulesDisabled(async (contexto) => {
      await setDoc(
        doc(contexto.firestore(), 'usuarios', 'dev_n1'),
        dadosUsuario('dev_n1')
      );
    });

    const armazenamento = armazenamentoAutenticado(
      'dev_n1',
      'n1_dev'
    );

    await assertFails(
      uploadBytes(
        ref(
          armazenamento,
          'temporarios/dev_n1/envio_sem_autorizacao'
        ),
        conteudo(),
        { contentType: 'image/png' }
      )
    );
  });
});

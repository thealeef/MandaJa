# Fiscal

Este documento delimita o módulo fiscal em nível de arquitetura. Regras tributárias, emissão e guarda devem ser confirmadas por assessoria contábil/jurídica e pelo provedor fiscal nas jurisdições atendidas.

## Separação de conceitos

- Comprovante do pedido resume itens, valores, pagamento e atendimento.
- Documento fiscal é emitido segundo obrigação legal por sistema ou provedor habilitado.
- O comprovante do MandaJá não deve ser apresentado como nota fiscal.

## Responsabilidades a definir

É necessário formalizar se o estabelecimento, a plataforma ou ambos emitem documentos para cada componente: venda de produtos, taxa de entrega, comissão, assinatura e repasse. A definição varia por modelo comercial, município, estado e regime tributário.

## Hipótese operacional do MVP

Até validação contábil, adotar a seguinte separação apenas para desenho técnico:

- O estabelecimento é o vendedor do produto e responsável pelo documento fiscal da venda quando exigido.
- O MandaJá registra pedidos e comprovantes, mas não chama comprovante de nota fiscal.
- Comissão e assinatura da plataforma são serviços distintos e podem exigir documento fiscal próprio do MandaJá.
- Entrega e repasse ao motoboy dependem do vínculo jurídico e do modelo operacional adotado.
- Nenhuma emissão automática será ativada antes de definir municípios, responsabilidades, certificados e provedor fiscal.

Essa hipótese não constitui orientação tributária e pode mudar após análise do contador e dos contratos.

## Dados previstos

- Razão social, nome fantasia, CNPJ/CPF quando cabível.
- Inscrição estadual e municipal quando aplicáveis.
- Regime tributário, endereço e e-mail fiscal.
- Itens, quantidades, descontos, frete, taxas e valores.
- Identificadores externos, status, datas, versão e motivo de cancelamento.

Dados fiscais devem ser separados do perfil público, validados, criptografados em trânsito e acessíveis apenas a perfis e serviços autorizados.

## Fluxo futuro

1. Validar cadastro fiscal e habilitação do estabelecimento.
2. Criar pedido com fotografia dos dados comerciais aplicáveis.
3. Após evento fiscal aprovado, enviar solicitação idempotente ao provedor.
4. Receber retorno assinado ou consultar situação de forma segura.
5. Armazenar referência, status e representação permitida do documento.
6. Disponibilizar ao usuário autorizado e registrar auditoria.
7. Tratar rejeição, contingência, cancelamento e correção conforme regra aplicável.

Nunca considerar uma tentativa de emissão como emissão confirmada. Repetições devem usar idempotência e reconciliação.

## Segurança e retenção

- Credenciais e certificados ficam em cofre gerenciado, com rotação e acesso mínimo.
- Downloads exigem autorização e não usam URLs públicas permanentes.
- Logs não contêm documento completo, certificado ou payload fiscal sensível.
- Retenção segue legislação e tabela formal, mesmo após exclusão da conta quando houver obrigação.

## Medicamentos

A venda de medicamentos exige análise regulatória adicional. O sistema deve bloquear por padrão itens não autorizados para venda online e prever receita, aprovação manual e validação do estabelecimento, sem presumir que campos técnicos bastam para conformidade.

## Decisões pendentes

- Modelo comercial e responsabilidades tributárias.
- Municípios/estados iniciais e tipos de documento.
- Provedor fiscal, contingência e SLA.
- Política de retenção e acesso.
- Tratamento de entrega por motoboy próprio e autônomo.
- Regras específicas para medicamentos e outros produtos regulados.
- Parecer contábil que aprove ou substitua a hipótese operacional do MVP.

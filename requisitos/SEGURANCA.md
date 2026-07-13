# Segurança

## Objetivo

Proteger confidencialidade, integridade e disponibilidade, com negação por padrão e controles proporcionais ao risco. Este documento é uma base técnica e deve evoluir com modelagem de ameaças e testes.

## Identidade e autorização

- Firebase Authentication identifica o usuário; autenticação não implica autorização.
- Perfis globais usam custom claims definidas somente por backend administrativo.
- Vínculos com estabelecimentos, bloqueios e permissões delegadas são confirmados em fonte confiável.
- Regras do Firestore e Storage validam identidade, escopo, propriedade e campos alteráveis.
- Cloud Functions validam novamente operações sensíveis; clientes nunca definem preço, comissão, privilégio ou confirmação de pagamento.
- Mudanças de claims devem revogar ou renovar tokens quando necessário e gerar auditoria.
- N1 Dev usa MFA, contas individuais e acesso mínimo às operações rotineiras.

## Operações críticas

- Criação de pedido, estoque e aceite de entrega usam transação e idempotência.
- Webhooks verificam assinatura, timestamp, repetição e origem conforme o provedor.
- Código de entrega é aleatório, curto prazo, armazenado como hash, limitado por tentativas e nunca aparece em logs.
- Atualizações de localização são aceitas apenas do motoboy responsável em entrega ativa.
- Arquivos validam caminho, proprietário, tipo real, tamanho e, quando aplicável, passam por verificação antimalware.
- Links de download têm acesso restrito e duração mínima necessária.

## App Check e abuso

App Check deve ser habilitado progressivamente em Authentication quando suportado, Firestore, Storage e Functions, primeiro com monitoramento e depois com imposição por ambiente. App Check complementa autenticação e regras; não as substitui.

Aplicar limites por usuário, dispositivo, IP ou recurso quando adequado, com atenção a NAT e acessibilidade. Proteger login, recuperação, cupons, rastreamento, código de entrega e criação de pedidos contra automação e repetição.

## Proteção de dados

- Minimizar coleta e separar dados públicos, operacionais, financeiros, fiscais e documentos.
- Criptografia em trânsito e em repouso é obrigatória; dados de risco elevado podem exigir proteção adicional no nível da aplicação.
- Segredos ficam em serviço gerenciado de segredos e são distintos por ambiente.
- Logs mascaram documentos, tokens, endereços, localização precisa e payloads sensíveis.
- Localização precisa expira conforme política e só é compartilhada durante entrega ativa.

## Auditoria e monitoramento

Registrar ator, ação, recurso, resultado, data do servidor, ambiente, correlação e justificativa quando aplicável. Logs de auditoria são append-only para usuários comuns e possuem acesso restrito.

Alertar sobre elevação de privilégio, múltiplas falhas de código, webhooks inválidos, exportações, exclusões, acessos N1, picos de erro, custo anormal e mudanças de regras ou configuração.

## Desenvolvimento seguro

- Ambientes e projetos Firebase separados.
- Princípio do menor privilégio nas contas de serviço.
- Dependências verificadas e atualizadas; análise de segredos e vulnerabilidades no CI.
- Emulator Suite e testes automatizados para regras positivas e negativas.
- Revisão obrigatória de regras, IAM, Functions públicas e integrações financeiras.
- Nenhum dado de produção em desenvolvimento ou homologação.

## Resposta a incidentes

1. Detectar e registrar o incidente sem destruir evidências.
2. Conter acessos, chaves ou funcionalidades afetadas.
3. Avaliar dados, titulares, impacto e obrigações legais.
4. Erradicar a causa, restaurar por procedimento testado e monitorar recorrência.
5. Comunicar partes aplicáveis com apoio jurídico e registrar lições aprendidas.

## Checklist antes da produção

- Regras Firestore e Storage testadas com casos de negação.
- App Check imposto e métricas acompanhadas.
- MFA e acesso N1 revisados.
- Segredos fora do repositório e com rotação definida.
- Webhooks e idempotência testados.
- Alertas, auditoria e plano de incidente validados.
- Teste de restauração concluído.
- Avaliação LGPD e fornecedores concluída.


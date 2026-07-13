# Custos do Firebase

## Objetivo

Controlar consumo técnico por ambiente e domínio para sustentar preços, capacidade e prevenção de surpresas. Valores de tabela mudam; estimativas devem usar a calculadora e a documentação oficial vigentes no momento da decisão.

## Principais direcionadores

- Leituras, escritas, exclusões, armazenamento e tráfego do Firestore.
- Invocações, duração, memória, CPU, concorrência e tráfego das Functions.
- Armazenamento, operações e saída de dados do Storage.
- Hosting e transferência de dados.
- Authentication conforme recursos e volume adotados.
- Logs, monitoramento, builds, mapas e serviços externos.
- Backups, exportações, retenção e recuperação.

FCM pode não ter cobrança direta no cenário inicial, mas eventos, Functions e gravações geradas pelas notificações consomem recursos.

## Decisões de arquitetura que reduzem custo

- Paginação e limites obrigatórios; nunca carregar coleções inteiras.
- Consultas indexadas e orientadas ao escopo do estabelecimento.
- Listeners em tempo real somente em telas que precisam deles e encerrados ao sair.
- Debounce em buscas e controle de frequência da localização.
- Documentos pequenos, dados públicos separados e agregações calculadas conscientemente.
- Cache no Flutter quando consistência permitir.
- Functions com região, memória, timeout, concorrência e número de instâncias adequados.
- Políticas de ciclo de vida para arquivos e logs.

Otimização de custo nunca deve enfraquecer autorização, auditoria, backup ou integridade financeira.

## Medição

O painel N1 deve apresentar estimativas, não uma fatura oficial, incluindo:

- Pedidos e usuários ativos.
- Uso por ambiente e, quando tecnicamente viável, por estabelecimento.
- Leituras/escritas estimadas por fluxo.
- Storage e tráfego.
- Invocações, erros e duração de Functions.
- Alertas de crescimento e projeção mensal.

Telemetria por estabelecimento deve evitar uma escrita de métrica para cada leitura, pois isso cria custo adicional. Preferir amostragem, métricas agregadas e dados nativos do Google Cloud.

## Orçamento e alertas

- Orçamentos separados por projeto e ambiente.
- Limiares progressivos de aviso e responsáveis definidos.
- Alertas de variação diária, erro repetido, loop de Function e tráfego anormal.
- Limites operacionais e flags para recursos não críticos; orçamento não é um bloqueio automático garantido.
- Revisão mensal de fatura, descontos, retenção e capacidade.

## Modelo de estimativa antes da implementação

Para cada fluxo, estimar usuários ativos, frequência, leituras, escritas, Functions, bytes armazenados e saída de dados. Avaliar cenários pequeno, esperado e pico para pedido, rastreamento, catálogo, painéis, notificações e backups.

## Pendências

- Definir região e plano Firebase.
- Estimar usuários, estabelecimentos, pedidos e atualizações de rastreamento.
- Escolher provedores externos e incluir seus custos.
- Definir metas de orçamento e responsáveis.
- Confirmar preços oficiais antes de cada ambiente e antes da produção.


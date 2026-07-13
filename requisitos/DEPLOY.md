# Deploy

Este documento define a estratégia futura. Ainda não existem aplicações ou recursos para publicar.

## Princípios

- Promoção controlada: desenvolvimento, homologação e produção.
- Artefato validado é promovido; produção não é montada manualmente.
- Menor privilégio no CI/CD, aprovação para produção e registro de cada release.
- Regras e índices são tratados como mudanças de banco e implantados com compatibilidade.
- Segredos nunca entram em artefatos do cliente ou logs.

## Pipeline previsto

1. Instalar dependências de versões fixadas.
2. Verificar formatação, lint e análise estática.
3. Executar testes unitários, integração e regras nos emuladores.
4. Gerar builds Angular, Flutter e Functions conforme o componente alterado.
5. Executar análise de dependências, segredos e vulnerabilidades.
6. Publicar em desenvolvimento e realizar testes rápidos.
7. Promover para homologação com testes de aceite.
8. Exigir aprovação e janela adequada para produção.
9. Validar saúde, erros, custos e fluxos críticos após o deploy.

## Ordem segura no Firebase

Mudanças devem ser compatíveis entre versões. Em geral: criar índices necessários, publicar regras compatíveis, publicar backend, publicar clientes e só depois remover campos ou comportamentos antigos. A ordem concreta depende da mudança e deve incluir plano de reversão.

## Angular e Hosting

O build de produção deve usar somente configuração pública do ambiente correto, gerar artefatos otimizados e aplicar cabeçalhos de segurança compatíveis. Configurar domínio, TLS, redirecionamentos e fallback de SPA. Não armazenar segredos no bundle.

## Functions, regras e índices

- Implantar apenas alvos alterados quando seguro.
- Tratar migrações como tarefas idempotentes, observáveis e reversíveis quando possível.
- Testar Firestore Rules e Storage Rules antes da publicação.
- Acompanhar erros, latência, cold starts, repetição e custo após release.

## Flutter

- Manter identificadores e assinaturas separados por plataforma e ambiente.
- Proteger keystores, certificados e chaves em cofre apropriado.
- Usar distribuição interna antes das lojas.
- Planejar versionamento, notas, privacidade, exclusão de conta e declarações de permissões.
- Ativar rollout gradual e monitorar Crashlytics e desempenho.

## Reversão

Cada release deve registrar versão anterior, alterações de dados, flags e responsável. Reversão de código não reverte dados automaticamente. Para incidentes, considerar desativação por flag, rollback do Hosting/Functions quando suportado, correção progressiva e restauração somente segundo o plano aprovado.

## Checklist de produção

- Aprovação de produto, segurança, LGPD, fiscal e operação conforme escopo.
- Backup recente e restauração testada.
- Alertas, painéis e responsáveis de plantão definidos.
- App Check, regras, IAM e domínios revisados.
- Migrações e rollback ensaiados em homologação.
- Fluxos de login, pedido, pagamento, entrega e cancelamento validados.


# Desenvolvimento: React + API .NET

O frontend ativo está em `web/`; a API está em `src/PokerHub.Api`.
O Blazor foi descontinuado e não é necessário neste fluxo.

## Requisitos

Node.js 22 LTS ou posterior, npm, SDK .NET 10 estável e Docker Engine local
com Compose para SQL Server 2022 (Linux x86-64). Instalações exigem acesso
a npm, NuGet e ao registro Microsoft. Playwright exige Chromium e bibliotecas do sistema.

No cloud desta conversa, o launcher encontra o SDK em `/workspace/.dotnet`.
Rede, sockets do .NET e Docker exigem execução ampliada pela ferramenta.

## Preparar e executar

Na raiz:

```bash
bash scripts/dev.sh doctor
bash scripts/dev.sh install
bash scripts/dev.sh db
bash scripts/dev.sh migrate
bash scripts/dev.sh api
```

Em outro terminal: `bash scripts/dev.sh web`.
API: `http://127.0.0.1:5100`. React: `http://localhost:5173`.
`/health` verifica o banco; `/openapi/v1.json` apresenta os contratos.
Cadastre uma conta nova pela interface; o banco começa vazio.

O launcher gera credenciais locais em `.dev/` (ignorado pelo Git), inicia SQL
Server em `127.0.0.1:14333` e aplica migrations no banco `pokerhub_dev`.
Reutilize `.dev/` com o volume do banco: apagar apenas a senha impede o acesso
ao volume existente. `db` e `migrate` são operações explícitas e separadas.

A fábrica de migrations exige `ConnectionStrings__DefaultConnection` explícita
e nunca carrega configurações do Blazor. O launcher sempre seleciona o banco local,
inclusive quando o shell contém outra conexão.

Vite encaminha `/api` e `/hub` para a API. A variável correta é `VITE_API_BASE_URL`;
ela fica vazia no desenvolvimento. O launcher desativa SMTP, Sentry e Key Vault.
Recuperação de senha manual exige email de desenvolvimento; os testes integrados
substituem o envio por um capturador em memória.

## Verificar

```bash
bash scripts/dev.sh test       # Application .NET + Vitest + build React/TypeScript
bash scripts/dev.sh test-api   # banco próprio via Testcontainers/Docker
cd web
npx playwright install --with-deps chromium
cd ..
bash scripts/dev.sh e2e        # API e React devem estar em execução
```

Os testes de API usam contêineres próprios e aplicam migrations; não usam o banco
do launcher. E2E cria dados únicos no banco de desenvolvimento.

Se o ambiente já tiver Chromium instalado, é possível usá-lo sem download:
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bash scripts/dev.sh e2e`.
O resultado dessa execução corresponde ao navegador do sistema, cuja versão pode
diferir da versão empacotada pelo Playwright.

Encerre os servidores com Ctrl+C. `bash scripts/dev.sh stop` para o banco sem
remover o volume de dados.

## Ajustes de confiabilidade (19/10/2026)

- Prêmios fixos são valores em reais; percentuais são distribuídos em centavos sem
  alterar saldos individuais para compensar inconsistências.
- O encerramento exige todos os participantes com check-in, posições únicas e
  soma exata entre prêmios, caixinha e arrecadação. A tela mostra a prévia antes da confirmação.
- Pagamentos pagos ou confirmados impedem regenerar o acerto. Despesas ficam
  protegidas assim que o acerto é gerado, evitando pagar valores antigos.
- Operações financeiras usam lock por torneio e registram histórico. O marcador
  persistido evita repetir uma operação em um retry do servidor após commit ambíguo;
  ele não substitui idempotência para reenvios independentes de HTTP pelo cliente.
- O relógio identifica a instância do servidor, retenta a conexão inicial e informa
  sua situação. O estado continua em memória por processo: mantenha uma réplica da
  API até implementar coordenação compartilhada para múltiplas réplicas.
- Os DTOs de torneio e a prévia são gerados pelo OpenAPI. Com a API local no ar,
  execute `cd web && npm run api:generate`; o CI verifica mudanças no arquivo gerado.
- O Identity agora usa as mesmas opções no runtime e na fábrica EF. A migration
  `AlignIdentityStores` cria o schema esperado pela API e recusa reduzir colunas
  quando valores legados excedem os limites. Revise esses dados se ela recusar aplicar.
- Pull requests executam testes/build/auditoria. Os workflows de publicação
  dependem desses checks e incluem cenários Playwright sobre uma stack local.

## Roteiro para validar no navegador

1. Criar conta e liga. Abrir um torneio novo e conferir a data de hoje e os formulários.
2. Inscrever jogadores e fazer check-in. Testar os limites de check-in/rebuy e a pausa.
3. Abrir uma ação de jogador por teclado: Tab deve permanecer no modal; Escape
   fecha e retorna o foco ao botão que o abriu.
4. Abrir o modo TV em outra aba autenticada, avançar nível e testar desconexão/reconexão.
   A TV continua exigindo login no endpoint por convite.
5. Encerrar com dois jogadores ainda na mesa: selecionar a posição de cada um e
   conferir os prêmios e a caixinha. Posições repetidas ou valores que não fecham bloqueiam confirmar.
6. Calcular pagamentos, marcar um como pago e confirmar. Recalcular deve ficar
   bloqueado; o compartilhamento e o Pix devem incluir apenas valores ainda pendentes.
7. Consultar ranking, perfil e histórico: ausentes não entram nos custos ou nas
   participações; mudar a tabela da liga não altera prêmios de torneios encerrados.
8. Sair e entrar em outra conta. Conferir que dados e seleção da liga anterior não aparecem.

O banco local contém somente dados gerados para desenvolvimento e testes.

## Prévia isolada no Azure

A branch `codex/pokerhub-integrity-preview` possui o workflow `preview.yml`, que
executa o CI e depois `bash scripts/preview-azure.sh`. Não executa os workflows de
publicação atuais. A imagem `Dockerfile.preview` serve React e API na mesma origem,
com `Preview:ServeWeb=true`; o fallback HTML preserva os 404 de `/api`, `/hub` e
`/openapi`. O build sobrescreve a URL de API e o DSN do frontend para não utilizar
os valores de produção.

Recursos exclusivos em `pokerhub-preview-codex`, região `brazilsouth`: registry
Basic, SQL Server com banco `pokerhub_preview` Basic, ambiente Container Apps e
aplicação com 0–1 réplicas. Não copia usuários nem dados existentes. Cadastro de
usuário e liga devem ser feitos na própria prévia. SMTP e Sentry ficam desativados.
Os recursos SQL/registry têm cobrança enquanto existirem, mesmo com app em zero.

O script exige login Azure e RBAC para criar esses recursos e registrar os
providers correspondentes na subscription. No GitHub usa a identidade OIDC já
referenciada no projeto, mas a configuração Azure precisa aceitar esta branch:

- Issuer: `https://token.actions.githubusercontent.com`
- Subject: `repo:andersonschott/PokerHub:ref:refs/heads/codex/pokerhub-integrity-preview`
- Audience: `api://AzureADTokenExchange`

Se a identidade atual aceitar só `main`, a autenticação da prévia falhará antes de
provisionar. Não é necessário alterar a federação existente de produção: pode-se
adicionar uma credencial federada para a branch de prévia na mesma identidade, ou
configurar identidade própria e trocar as três referências de secrets no novo
workflow. O deploy também pode ser executado em máquina autenticada com Azure
CLI e .NET 10. As credenciais do SQL/JWT são geradas no primeiro provisionamento,
persistidas apenas em secrets da aplicação e reutilizadas nas próximas execuções.
A regra temporária do runner SQL é removida ao terminar. A regra AzureServices
permite conexão do app, sempre exigindo autenticação SQL.

A URL só é publicada no resumo do workflow após `/health` responder com sucesso.
Para remover **somente a prévia**, após a validação:

```bash
az group delete --name pokerhub-preview-codex --yes --no-wait
```

O script recusa nomes fora de `pokerhub-preview-*` e grupos existentes sem a tag
`purpose=pokerhub-preview`. Não apontar esse script para recursos de produção.

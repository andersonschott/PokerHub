# E2E (Playwright)

Os testes usam React + API .NET e banco local. Consulte
[DEVELOPMENT.md](../../DEVELOPMENT.md) para requisitos e configuração completa.

Na raiz do repositório:

```bash
bash scripts/dev.sh install
bash scripts/dev.sh db
bash scripts/dev.sh migrate
bash scripts/dev.sh api
```

Em outro terminal: `bash scripts/dev.sh web`.
Com API em `5100` e React em `5173`, execute em um terceiro terminal:

```bash
cd web
npx playwright install --with-deps chromium
npm run e2e
npx playwright test realtime  # somente sincronização
```

O Vite usa proxy para `/api` e `/hub`; `VITE_API_BASE_URL` deve ficar vazia.
Não use Blazor nas migrations. `bash scripts/dev.sh migrate` seleciona
explicitamente `pokerhub_dev` em `127.0.0.1:14333`.

- `full-flow.spec.ts`: inscrição, operação, encerramento e pagamentos.
- `realtime.spec.ts`: sincronização entre organizador e TV; o teste injeta
  autenticação do viewer porque `by-invite` ainda exige login.

Encerre os servidores com Ctrl+C e o banco com `bash scripts/dev.sh stop`.

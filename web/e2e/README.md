# E2E (Playwright)

Os testes E2E rodam contra uma **stack local descartável** (não toque em produção).
Cada teste se auto-semeia via API com identificadores únicos — seguro reexecutar.

## 1. SQL local (Docker)
```bash
docker run -d --name pokerhub-sql \
  -e 'ACCEPT_EULA=Y' -e 'MSSQL_SA_PASSWORD=Local@Dev123!' \
  -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest
# aguarde o log "SQL Server is now ready for client connections"
```

## 2. Migrations no banco LOCAL
> ⚠️ SEMPRE com `--connection` explícito. `dotnet ef database update` puro usa o
> appsettings do `PokerHub.Web`, que aponta para **PRODUÇÃO**.
```bash
dotnet ef database update \
  --project src/PokerHub.Infrastructure --startup-project src/PokerHub.Web \
  --connection "Server=localhost,1433;Database=pokerhub;User ID=sa;Password=Local@Dev123!;TrustServerCertificate=True;Encrypt=False;"
```

## 3. Api :5100 (contra o local)
```bash
ConnectionStrings__DefaultConnection="Server=localhost,1433;Database=pokerhub;User ID=sa;Password=Local@Dev123!;TrustServerCertificate=True;Encrypt=False;" \
ASPNETCORE_URLS="http://localhost:5100" ASPNETCORE_ENVIRONMENT=Development \
dotnet run --project src/PokerHub.Api
```

## 4. web :5173 (SignalR via VITE_API_URL)
```bash
cd web && VITE_API_URL="http://localhost:5100" npm run dev
```

## 5. Rodar o E2E
```bash
cd web && npm run e2e            # tudo
cd web && npx playwright test realtime   # um spec
```

## Teardown
```bash
docker rm -f pokerhub-sql   # + matar os processos da Api (:5100) e web (:5173)
```

## Specs
- `full-flow.spec.ts` — inscrição/seed → operar ao vivo (check-in/rebuy/eliminação) → encerrar (folha → `/finish`) → pagamentos com "quem paga quem" não-vazio.
- `realtime.spec.ts` — 2 contextos: organizer avança nível → TV mode (`/tv/{inviteCode}`) reflete via SignalR.
  - ⚠️ TV mode não é público hoje (endpoint `by-invite` exige auth); o teste injeta token de um viewer. Ver roadmap.

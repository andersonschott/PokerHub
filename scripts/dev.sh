#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
repo_root="$PWD"
if ! command -v dotnet >/dev/null && [[ -x /workspace/.dotnet/dotnet ]]; then
  export DOTNET_ROOT=/workspace/.dotnet
  export PATH="/workspace/.dotnet:$PATH"
  export DOTNET_CLI_HOME="$repo_root/.dev/dotnet-home"
  export NUGET_PACKAGES=/workspace/.nuget/packages
fi
export DOTNET_NOLOGO=1 DOTNET_CLI_TELEMETRY_OPTOUT=1
need() { command -v "$1" >/dev/null || { echo "Missing tool: $1" >&2; exit 1; }; }
local_config() {
  need node
  mkdir -p .dev
  node --input-type=module <<'JS'
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
for (const [file, prefix] of [['sql-password', 'Dev!'], ['jwt-key', '']]) {
  try { writeFileSync(`.dev/${file}`, prefix + randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
}
JS
  export POKERHUB_DEV_SQL_PASSWORD="$(cat .dev/sql-password)"
  # Always use this local database, even when another connection is inherited.
  export ConnectionStrings__DefaultConnection="Server=127.0.0.1,14333;Database=pokerhub_dev;User ID=sa;Password=$POKERHUB_DEV_SQL_PASSWORD;TrustServerCertificate=True;Encrypt=False;"
  export ASPNETCORE_ENVIRONMENT=Development DOTNET_ENVIRONMENT=Development
  export ASPNETCORE_URLS=http://127.0.0.1:5100
  export Jwt__SigningKey="$(cat .dev/jwt-key)"
  export Jwt__Issuer=pokerhub-dev Jwt__Audience=pokerhub-api-dev
  export Cors__AllowedOrigins__0=http://localhost:5173
  export Cors__AllowedOrigins__1=http://127.0.0.1:5173
  export Email__Host='' Email__User='' Email__Password=''
  export Email__AppBaseUrl=http://localhost:5173
  export Sentry__Dsn='' Sentry__EnableTestEndpoint=false
  export DataProtection__KeyVaultKeyId=''
  export VITE_API_BASE_URL='' VITE_SENTRY_DSN=''
}
compose() {
  need docker
  env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
    docker --host=unix:///var/run/docker.sock compose -p pokerhub-dev -f compose.dev.yml "$@"
}
case "${1:-help}" in
  doctor)
    need node; need npm; need dotnet; need docker
    node --version; npm --version; dotnet --version
    env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
      docker --host=unix:///var/run/docker.sock info --format 'Docker {{.ServerVersion}}'
    docker compose version ;;
  install)
    need npm; need dotnet
    dotnet tool restore
    dotnet restore src/PokerHub.Api/PokerHub.Api.csproj
    dotnet restore tests/PokerHub.Application.Tests/PokerHub.Application.Tests.csproj
    dotnet restore tests/PokerHub.Api.Tests/PokerHub.Api.Tests.csproj
    (cd web && npm ci) ;;
  db) local_config; compose up -d --wait --wait-timeout 240 ;;
  migrate)
    need dotnet; local_config
    dotnet ef database update --project src/PokerHub.Infrastructure --startup-project src/PokerHub.Api ;;
  api)
    need dotnet; local_config
    export DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE=false
    dotnet build src/PokerHub.Api -m:1 -p:UseSharedCompilation=false
    exec dotnet run --project src/PokerHub.Api --no-build --no-launch-profile ;;
  web) need npm; local_config; cd web; exec npm run dev -- --host 127.0.0.1 ;;
  test)
    need dotnet; need npm
    dotnet test tests/PokerHub.Application.Tests
    (cd web && npm test && npm run build) ;;
  test-api) need dotnet; dotnet test tests/PokerHub.Api.Tests ;;
  e2e) need npm; local_config; cd web; exec npm run e2e ;;
  stop) local_config; compose stop ;;
  *) echo 'Usage: bash scripts/dev.sh {doctor|install|db|migrate|api|web|test|test-api|e2e|stop}' ;;
esac

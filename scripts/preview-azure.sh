#!/usr/bin/env bash
# Provisions only the dedicated preview resource group; never reads production settings/data.
set -euo pipefail
cd "$(dirname "$0")/.."
for command_name in az dotnet openssl curl sha256sum; do
  command -v "$command_name" >/dev/null || { echo "Missing command: $command_name" >&2; exit 1; }
done
export AZURE_CORE_ONLY_SHOW_ERRORS=true
preview_group="${PREVIEW_RESOURCE_GROUP:-pokerhub-preview-codex}"
preview_location="${PREVIEW_LOCATION:-brazilsouth}"
[[ "$preview_group" =~ ^pokerhub-preview-[a-z0-9-]+$ ]] || { echo 'Resource group must start with pokerhub-preview-.' >&2; exit 1; }
preview_subscription=$(az account show --query id -o tsv)
preview_suffix=$(printf '%s' "$preview_subscription/$preview_group" | sha256sum | cut -c1-10)
preview_registry="phpreview${preview_suffix}"
preview_server="ph-preview-${preview_suffix}"
preview_app="ph-preview-${preview_suffix}"
preview_environment="ph-preview-env-${preview_suffix}"
preview_database=pokerhub_preview
preview_user=phpreview
preview_tag="${GITHUB_SHA:-$(git rev-parse HEAD)}"
preview_firewall="migration-${GITHUB_RUN_ID:-manual}"
preview_firewall_created=false
cleanup() {
  if [[ "$preview_firewall_created" == true ]]; then
    az sql server firewall-rule delete -g "$preview_group" -s "$preview_server" -n "$preview_firewall" -o none || true
  fi
}
trap cleanup EXIT
mask() { if [[ "${GITHUB_ACTIONS:-}" == true ]]; then printf '::add-mask::%s\n' "$1"; fi; }
if [[ $(az group exists -n "$preview_group" -o tsv) == true ]]; then
  [[ $(az group show -n "$preview_group" --query tags.purpose -o tsv) == pokerhub-preview ]] || {
    echo 'Refusing to modify an existing resource group without purpose=pokerhub-preview.' >&2; exit 1;
  }
else
  az group create -n "$preview_group" -l "$preview_location" --tags purpose=pokerhub-preview -o none
fi
preview_app_exists=false
if az containerapp show -g "$preview_group" -n "$preview_app" -o none 2>/dev/null; then
  preview_app_exists=true
  preview_sql_password=$(az containerapp secret list -g "$preview_group" -n "$preview_app" --show-values --query "[?name=='sql-admin-password'].value | [0]" -o tsv)
  preview_jwt=$(az containerapp secret list -g "$preview_group" -n "$preview_app" --show-values --query "[?name=='jwt'].value | [0]" -o tsv)
  [[ -n "$preview_sql_password" && -n "$preview_jwt" ]] || { echo 'Existing preview secrets missing; refusing automatic credential rotation.' >&2; exit 1; }
else
  preview_sql_password="Aa1!$(openssl rand -hex 24)"
  preview_jwt=$(openssl rand -hex 48)
fi
mask "$preview_sql_password"; mask "$preview_jwt"
echo "Provisioning dedicated preview in $preview_group ($preview_location)."
az acr create -g "$preview_group" -n "$preview_registry" --sku Basic --admin-enabled true -o none
if az sql server show -g "$preview_group" -n "$preview_server" -o none 2>/dev/null; then
  if [[ "$preview_app_exists" == false ]]; then
    az sql server update -g "$preview_group" -n "$preview_server" --admin-password "$preview_sql_password" -o none
  fi
else
  az sql server create -g "$preview_group" -n "$preview_server" -l "$preview_location" \
    --admin-user "$preview_user" --admin-password "$preview_sql_password" --minimal-tls-version 1.2 -o none
fi
az sql db create -g "$preview_group" -s "$preview_server" -n "$preview_database" \
  --service-objective Basic --backup-storage-redundancy Local --yes -o none
# SQL authentication remains required; this rule permits the isolated ACA app to connect.
az sql server firewall-rule create -g "$preview_group" -s "$preview_server" -n AzureServices \
  --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0 -o none
preview_runner_ip=$(curl --fail --silent --show-error https://api.ipify.org)
[[ "$preview_runner_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Could not resolve migration runner IPv4.' >&2; exit 1; }
az sql server firewall-rule create -g "$preview_group" -s "$preview_server" -n "$preview_firewall" \
  --start-ip-address "$preview_runner_ip" --end-ip-address "$preview_runner_ip" -o none
preview_firewall_created=true
export ConnectionStrings__DefaultConnection="Server=tcp:$preview_server.database.windows.net,1433;Initial Catalog=$preview_database;User ID=$preview_user;Password=$preview_sql_password;Encrypt=True;TrustServerCertificate=False;Connection Timeout=60;"
mask "$ConnectionStrings__DefaultConnection"
echo 'Applying migrations to the preview database.'
dotnet tool restore
dotnet restore src/PokerHub.Api/PokerHub.Api.csproj
dotnet ef database update --project src/PokerHub.Infrastructure --startup-project src/PokerHub.Api
echo 'Building preview image with React and API on the same origin.'
az acr build -r "$preview_registry" -t "pokerhub-preview:$preview_tag" -f Dockerfile.preview . -o none
preview_registry_password=$(az acr credential show -n "$preview_registry" --query 'passwords[0].value' -o tsv)
mask "$preview_registry_password"
if ! az containerapp env show -g "$preview_group" -n "$preview_environment" -o none 2>/dev/null; then
  az containerapp env create -g "$preview_group" -n "$preview_environment" -l "$preview_location" --logs-destination none -o none
fi
preview_env_vars=(
  'Preview__ServeWeb=true' 'ASPNETCORE_ENVIRONMENT=Preview'
  'ConnectionStrings__DefaultConnection=secretref:database'
  'Jwt__SigningKey=secretref:jwt' "Jwt__Issuer=$preview_app" "Jwt__Audience=$preview_app"
  'Sentry__Dsn=' 'Sentry__EnableTestEndpoint=false' 'DataProtection__KeyVaultKeyId='
  'Email__Host=' 'Email__User=' 'Email__Password='
)
if [[ "$preview_app_exists" == true ]]; then
  az containerapp secret set -g "$preview_group" -n "$preview_app" \
    --secrets "database=$ConnectionStrings__DefaultConnection" "jwt=$preview_jwt" "sql-admin-password=$preview_sql_password" -o none
  az containerapp registry set -g "$preview_group" -n "$preview_app" --server "$preview_registry.azurecr.io" \
    --username "$preview_registry" --password "$preview_registry_password" -o none
  az containerapp update -g "$preview_group" -n "$preview_app" \
    --image "$preview_registry.azurecr.io/pokerhub-preview:$preview_tag" --set-env-vars "${preview_env_vars[@]}" \
    --min-replicas 0 --max-replicas 1 -o none
else
  az containerapp create -g "$preview_group" -n "$preview_app" --environment "$preview_environment" \
    --image "$preview_registry.azurecr.io/pokerhub-preview:$preview_tag" \
    --registry-server "$preview_registry.azurecr.io" --registry-username "$preview_registry" --registry-password "$preview_registry_password" \
    --secrets "database=$ConnectionStrings__DefaultConnection" "jwt=$preview_jwt" "sql-admin-password=$preview_sql_password" \
    --env-vars "${preview_env_vars[@]}" --ingress external --target-port 8080 --transport auto \
    --min-replicas 0 --max-replicas 1 --cpu 0.5 --memory 1Gi -o none
fi
preview_url="https://$(az containerapp show -g "$preview_group" -n "$preview_app" --query properties.configuration.ingress.fqdn -o tsv)"
for attempt in {1..30}; do
  if curl --fail --silent --show-error --max-time 15 "$preview_url/health" >/dev/null; then
    echo "Preview ready: $preview_url"
    if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
      printf 'Preview: [%s](%s)\n\nDedicated resource group: `%s`.\n' "$preview_url" "$preview_url" "$preview_group" >> "$GITHUB_STEP_SUMMARY"
    fi
    if [[ -n "${GITHUB_OUTPUT:-}" ]]; then printf 'url=%s\n' "$preview_url" >> "$GITHUB_OUTPUT"; fi
    exit 0
  fi
  sleep 5
done
echo 'Preview health check failed. Inspect the preview Container App logs.' >&2
exit 1

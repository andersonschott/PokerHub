# PokerHub - Guia de Deploy no Azure Container Apps

Este guia mostra como publicar o PokerHub no Azure Container Apps com scale-to-zero para otimizar custos.

## Custos Estimados

| Recurso | Custo Mensal |
|---------|--------------|
| Container Registry Basic | ~$5 |
| Container Apps (scale-to-zero) | ~$0-5* |
| Azure SQL (existente) | $0 |
| **Total** | **~$5-10** |

*Custo baseado em ~32-64h de uso mensal (torneios semanais)

---

## Pre-requisitos

1. **Azure CLI** instalado: https://docs.microsoft.com/cli/azure/install-azure-cli
2. **Docker** instalado (opcional, para testes locais)
3. Conta no Azure com subscription ativa

---

## Passo a Passo de Deploy

### 1. Login no Azure

```bash
az login
```

### 2. Criar Resource Group

```bash
az group create \
  --name pokerhub-rg \
  --location brazilsouth
```

### 3. Criar Container Registry

```bash
az acr create \
  --name pokerhubacr \
  --resource-group pokerhub-rg \
  --sku Basic \
  --admin-enabled true
```

### 4. Criar Container Apps Environment

```bash
az containerapp env create \
  --name pokerhub-env \
  --resource-group pokerhub-rg \
  --location brazilsouth
```

### 5. Build e Push da Imagem

Na raiz do projeto PokerHub, execute:

```bash
az acr build \
  --registry pokerhubacr \
  --image pokerhub:v1 \
  --file src/PokerHub.Web/Dockerfile \
  .
```

### 6. Deploy do Container App

```bash
# Obter credenciais do ACR
ACR_PASSWORD=$(az acr credential show --name pokerhubacr --query "passwords[0].value" -o tsv)

# Criar Container App com scale-to-zero
az containerapp create \
  --name pokerhub-app \
  --resource-group pokerhub-rg \
  --environment pokerhub-env \
  --image pokerhubacr.azurecr.io/pokerhub:v1 \
  --registry-server pokerhubacr.azurecr.io \
  --registry-username pokerhubacr \
  --registry-password "$ACR_PASSWORD" \
  --target-port 8080 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 2 \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars \
    "ASPNETCORE_ENVIRONMENT=Production" \
    "ConnectionStrings__DefaultConnection=Server=dentalpro.database.windows.net,1433;Initial Catalog=dentalpro;User ID=usr_admin;Password=SUA_SENHA;Encrypt=True;TrustServerCertificate=True;Connection Timeout=120;ConnectRetryCount=5;ConnectRetryInterval=10;"
```

**IMPORTANTE:** Substitua `SUA_SENHA` pela senha real do banco de dados.

### 7. Configurar Sticky Sessions (OBRIGATORIO para SignalR)

```bash
az containerapp ingress sticky-sessions set \
  --name pokerhub-app \
  --resource-group pokerhub-rg \
  --affinity sticky
```

### 8. Configurar Firewall do Azure SQL

Permitir que Container Apps acesse o Azure SQL:

```bash
az sql server firewall-rule create \
  --resource-group SEU_RESOURCE_GROUP_DO_SQL \
  --server dentalpro \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 9. Obter URL da Aplicacao

```bash
az containerapp show \
  --name pokerhub-app \
  --resource-group pokerhub-rg \
  --query "properties.configuration.ingress.fqdn" \
  -o tsv
```

A aplicacao estara disponivel em: `https://pokerhub-app.XXXXXXX.brazilsouth.azurecontainerapps.io`

---

## Gestao de Custos (Scale to Zero)

### Cold Start

- Com `min-replicas 0`, o container "dorme" quando nao ha trafego
- Primeira requisicao apos idle leva ~10-30s para iniciar
- **Recomendacao:** Acessar a app 5 min antes do torneio para "acordar"

### Comandos para Dias de Torneio

#### Antes do Torneio (Ativar)

```bash
az containerapp update \
  --name pokerhub-app \
  --resource-group pokerhub-rg \
  --min-replicas 1

echo "PokerHub ativo! Pronto para o torneio."
```

#### Apos o Torneio (Modo Economia)

```bash
az containerapp update \
  --name pokerhub-app \
  --resource-group pokerhub-rg \
  --min-replicas 0

echo "PokerHub em modo economia."
```

---

## Atualizando a Aplicacao

### Deploy de Nova Versao

```bash
# Build nova versao
az acr build \
  --registry pokerhubacr \
  --image pokerhub:v2 \
  --file src/PokerHub.Web/Dockerfile \
  .

# Atualizar Container App
az containerapp update \
  --name pokerhub-app \
  --resource-group pokerhub-rg \
  --image pokerhubacr.azurecr.io/pokerhub:v2
```

### Verificar Logs

```bash
az containerapp logs show \
  --name pokerhub-app \
  --resource-group pokerhub-rg \
  --follow
```

---

## Comandos Uteis

### Ver Status da Aplicacao

```bash
az containerapp show \
  --name pokerhub-app \
  --resource-group pokerhub-rg \
  --query "{Name:name, URL:properties.configuration.ingress.fqdn, Replicas:properties.runningStatus.replicas}" \
  -o table
```

### Ver Metricas de Uso

```bash
az containerapp revision list \
  --name pokerhub-app \
  --resource-group pokerhub-rg \
  -o table
```

### Reiniciar Aplicacao

```bash
az containerapp revision restart \
  --name pokerhub-app \
  --resource-group pokerhub-rg \
  --revision $(az containerapp revision list --name pokerhub-app --resource-group pokerhub-rg --query "[0].name" -o tsv)
```

### Deletar Tudo (Cuidado!)

```bash
az group delete --name pokerhub-rg --yes --no-wait
```

---

## Teste Local com Docker

Para testar localmente antes do deploy:

```bash
# Build da imagem
docker-compose build

# Iniciar container (atualize a connection string no docker-compose.yml)
docker-compose up

# Acessar em http://localhost:8080
```

---

## Troubleshooting

### Aplicacao nao inicia

1. Verificar logs:
   ```bash
   az containerapp logs show --name pokerhub-app --resource-group pokerhub-rg --follow
   ```

2. Verificar connection string esta correta

3. Verificar firewall do Azure SQL permite conexoes do Azure

### SignalR nao conecta

1. Verificar sticky sessions esta habilitado:
   ```bash
   az containerapp ingress show --name pokerhub-app --resource-group pokerhub-rg
   ```

2. Verificar HTTPS esta funcionando (SignalR precisa de HTTPS em producao)

### Timeout de banco de dados

1. Verificar connection string tem `Connection Timeout=120`
2. Verificar Azure SQL nao esta pausado (tier serverless)

---

## Configuracoes Recomendadas

| Configuracao | Valor | Motivo |
|-------------|-------|--------|
| min-replicas | 0 | Scale to zero para economia |
| max-replicas | 2 | Suporta picos durante torneios |
| cpu | 0.5 | Suficiente para Blazor Server |
| memory | 1Gi | Suficiente para SignalR/timer |
| sticky-sessions | sticky | Obrigatorio para Blazor/SignalR |

---

## Custos Detalhados

### Azure Container Registry (Basic)
- $5/mes fixo
- Inclui 10GB de armazenamento

### Azure Container Apps (Consumption)
- vCPU: $0.000024/segundo (~$0.086/hora)
- Memoria: $0.0000024/GiB/segundo (~$0.0086/hora)
- Para 0.5 vCPU + 1GB: ~$0.05/hora

### Calculo para MVP
| Cenario | Horas/Mes | Custo Container Apps |
|---------|-----------|---------------------|
| 1 torneio/semana (8h) | 32h | ~$1.60 |
| 2 torneios/semana | 64h | ~$3.20 |
| Sempre ligado | 720h | ~$36 |

**Total mensal estimado para uso semanal: ~$7-10**

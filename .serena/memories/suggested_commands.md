# PokerHub - Suggested Commands

## Environment Setup (required before EF commands)
```bash
export DOTNET_ROOT=/home/anderson/.dotnet
export PATH="$PATH:$HOME/.dotnet/tools"
```

## Build & Run
```bash
# Build entire solution
dotnet build

# Run the web application
dotnet run --project src/PokerHub.Web

# Build in Release mode
dotnet build -c Release
```

## EF Core Migrations
```bash
# Create a new migration
dotnet ef migrations add <MigrationName> --project src/PokerHub.Infrastructure --startup-project src/PokerHub.Web --output-dir Data/Migrations

# Apply pending migrations
dotnet ef database update --project src/PokerHub.Infrastructure --startup-project src/PokerHub.Web

# List all migrations
dotnet ef migrations list --project src/PokerHub.Infrastructure --startup-project src/PokerHub.Web

# Remove last migration (if not applied)
dotnet ef migrations remove --project src/PokerHub.Infrastructure --startup-project src/PokerHub.Web
```

## Docker
```bash
# Build and run with Docker Compose
docker-compose up --build
```

## System Utilities (Linux)
```bash
git status
git log --oneline -10
ls -la
grep -r "pattern" src/
find src/ -name "*.cs" -type f
```

## No Test Framework Yet
There are no test projects currently configured in the solution.

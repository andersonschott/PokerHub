# PokerHub - Project Overview

## Purpose
PokerHub is a poker tournament management platform. It handles leagues, tournaments, players, payments/debts, rankings, real-time timer, and statistics.

## Tech Stack
- **Framework**: ASP.NET Core 10.0 / .NET 10.0
- **Frontend**: Blazor Server with MudBlazor 8.15.0 (Material Design)
- **Database**: Azure SQL Server via Entity Framework Core 10.0
- **Authentication**: ASP.NET Identity
- **Real-time**: SignalR
- **IDE**: JetBrains Rider
- **Platform**: Linux (Fedora)

## Architecture
Clean Architecture with 4 projects:

```
src/
├── PokerHub.Domain/          # Entities, Enums (no external deps except Identity)
├── PokerHub.Application/     # DTOs (records), Services, Interfaces
├── PokerHub.Infrastructure/  # DbContext, EF Configurations, Migrations
└── PokerHub.Web/             # Blazor Pages, SignalR Hubs, Background Services
```

## Key Domain Entities
- League, Player, Tournament, TournamentPlayer
- Payment, BlindLevel, Season, PlayerSeasonStats
- TournamentExpense, TournamentExpenseShare
- JackpotContribution, JackpotUsage
- LeaguePrizeTable, LeaguePrizeTableEntry

## Key Enums
- TournamentStatus, PaymentStatus, PaymentType
- PrizeDistributionType, ExpenseSplitType
- RebuyLimitType, PixKeyType

## Services (all Scoped, registered in DependencyInjection.cs)
- LeagueService, PlayerService, TournamentService
- PaymentService, RankingService, TournamentExpenseService
- SeasonService, JackpotService, PrizeTableService

## Blazor Pages Structure
```
Components/Pages/
├── Liga/       (Index, Create, Details, Edit)
├── Torneio/    (Index, Create, Dashboard, Edit, Join)
├── Timer/      (Index - TV mode)
├── Pagamento/  (TournamentPayments, MyDebts)
├── Ranking/    (LeagueRanking, PlayerStats)
└── Jogador/    (CRUD via dialogs)
```

## UI Language
The application UI is in **Portuguese (pt-BR)**. Page routes and labels are in Portuguese.

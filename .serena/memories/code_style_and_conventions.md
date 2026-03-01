# PokerHub - Code Style & Conventions

## General C# Style
- **Nullable**: enabled globally (`<Nullable>enable</Nullable>`)
- **Implicit usings**: enabled
- **Naming**: PascalCase for types, methods, properties; camelCase for local variables; `_camelCase` for private fields
- **Async**: All service methods are async with `Async` suffix (e.g., `GetTournamentByIdAsync`)
- **Return types**: `Task<T>`, `Task<bool>`, `Task<(bool Success, string Message)>` for operations

## DTOs
- Use `record` types for immutable DTOs (e.g., `public record TournamentDto(...)`)
- DTOs are organized by domain area in `Application/DTOs/` subfolders
- Time properties: use `int` with suffix `Seconds` (e.g., `TimeRemainingSeconds`)
- Status derivations: computed properties on DTOs, not separate fields

## Domain Entities
- Standard classes with auto-properties
- Navigation properties initialized with `new List<T>()` or similar
- Business logic methods directly on entities (e.g., `Tournament.IsRebuyAllowed()`)
- Use `Guid` for all entity IDs

## Services
- Interface + implementation pattern (e.g., `ITournamentService` / `TournamentService`)
- All registered as Scoped in `DependencyInjection.cs`
- Services inject `PokerHubDbContext` directly (no repository pattern)
- Return `bool` for success/failure, tuple `(bool, string)` for operations with messages

## EF Core Configurations
- Fluent API in separate configuration classes (e.g., `TournamentConfiguration.cs`)
- Cascade delete rules follow specific patterns (see CLAUDE.md for details)
- Use `ExecuteDeleteAsync()` for bulk deletes to avoid change tracker conflicts

## Blazor Pages
- All interactive pages use `@rendermode InteractiveServer`
- Authorized pages use `@attribute [Authorize]`
- Mobile-first responsive design using `ResponsiveLayout.razor`
- CSS isolation with `.razor.css` files; global styles in `wwwroot/app.css`
- MudBlazor components with type parameters (e.g., `<MudChip T="string">`)

## SignalR
- Hub at `/hubs/torneio` (`TorneioHub.cs`)
- Background timer service: `TournamentTimerService.cs`

## Bottom Navigation
- Use plain HTML buttons (not MudNavMenu/MudNavLink) for mobile bottom nav
- CSS classes: `.bottom-nav-container`, `.bottom-nav-item`

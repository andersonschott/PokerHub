# PokerHub - Task Completion Checklist

## After completing a coding task:

### 1. Build Check
```bash
dotnet build
```
Ensure no build errors or warnings.

### 2. EF Core (if entities/DB changed)
- Create migration if entity or configuration changed
- Verify cascade delete rules don't create cycles
- Test migration applies cleanly

### 3. Blazor Pages (if UI changed)
- Verify `@rendermode InteractiveServer` is present on interactive pages
- Verify `@attribute [Authorize]` on protected pages
- Check mobile responsiveness (ResponsiveLayout)
- Verify MudBlazor type parameters (e.g., `T="string"` on MudChip)

### 4. Services (if logic changed)
- Ensure interface matches implementation
- Verify service is registered in `DependencyInjection.cs` if new
- Check async/await patterns are correct

### 5. No Tests Yet
There is no test framework configured. Testing is manual.

### 6. Code Review
- No unused imports or variables
- Proper null handling (nullable enabled)
- Follow existing naming conventions

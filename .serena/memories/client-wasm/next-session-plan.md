# Plano Próxima Sessão — Bugs Críticos WASM

## Prioridade 1: Reload desloga o usuário

### Sintoma
Ao recarregar a página (F5 / navegação direta), o usuário perde a sessão e é redirecionado para /login.

### Causa provável
`AuthStateService` é registrado como `AddScoped` (ou `AddSingleton`), mas o `InitializeAsync()` em `App.razor.OnInitializedAsync()` corre **depois** que o `AuthenticationStateProvider` já forneceu estado "anônimo" para os componentes filhos. O roteador Blazor WASM processa a rota antes do `OnInitializedAsync` completar o `await`.

### Investigação necessária
1. Verificar registro do serviço em `Program.cs`:
   - Deve ser `AddSingleton<AuthStateService>()` (não Scoped)
   - E registrar tanto `AuthStateService` quanto `AuthenticationStateProvider`
2. Verificar que `App.razor` bloqueia renderização até auth inicializar:
   ```razor
   @if (!_authInitialized)
   {
       <MudProgressCircular Indeterminate="true" />
   }
   else
   {
       <Router AppAssembly="@typeof(App).Assembly">...</Router>
   }
   ```
   ```csharp
   private bool _authInitialized = false;
   protected override async Task OnInitializedAsync()
   {
       await AuthState.InitializeAsync();
       _authInitialized = true;
   }
   ```
3. Verificar se `localStorage.getItem` está retornando o token corretamente em WASM (bug de timing com IJSRuntime antes do DOM estar pronto)
4. Verificar se `AuthStateService` implementa `GetAuthenticationStateAsync()` corretamente quando token presente

### Arquivos relevantes
- `src/PokerHub.Client/Services/AuthStateService.cs`
- `src/PokerHub.Client/App.razor`
- `src/PokerHub.Client/Program.cs`

---

## Prioridade 2: App não instalável / páginas não funcionam offline

### Sintoma A — Não instalável
O botão "Instalar app" não aparece no browser / critérios PWA não atendidos.

### Causa provável A
- `manifest.webmanifest` pode estar incompleto (faltam `start_url`, `display: standalone`, ícones 192px e 512px)
- Service Worker pode não estar registrado antes do prompt de instalação
- Verificar se o SW está sendo servido com `Content-Type: application/javascript` correto

### Investigação A
1. Checar `wwwroot/manifest.webmanifest` — campos obrigatórios para installability:
   ```json
   {
     "name": "PokerHub",
     "short_name": "PokerHub",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#0d0d0d",
     "theme_color": "#1B5E20",
     "icons": [
       { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
       { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
       { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
     ]
   }
   ```
2. Verificar se os ícones existem em `wwwroot/icons/`
3. Usar Chrome DevTools > Application > Manifest para ver erros

### Sintoma B — Páginas não funcionam offline
Algumas páginas mostram erro ao tentar acessar offline.

### Causa provável B
- O SW em `service-worker.published.js` só aplica estratégias de cache em **build publicado** (`dotnet publish`)
- Em modo Debug (`dotnet run`), o `service-worker.js` (dev) é usado — não tem cache das páginas
- Páginas que não têm cache IndexedDB mostram erro 503 ao acessar offline

### Investigação B
1. Verificar qual SW está ativo: `service-worker.js` (dev, sem cache) vs `service-worker.published.js` (prod, com cache)
2. Para testar offline real: usar `dotnet publish` + servir os artefatos publicados
3. Verificar quais rotas o SW trata com `cache-first` vs `network-only`:
   - `/api/*` → network-first (offline retorna cache ou 503)
   - App shell (`index.html`, `_framework/*`) → cache-first (deve funcionar offline)
   - Páginas Blazor são SPA — se `index.html` estiver em cache, todas as rotas funcionam
4. Verificar se o SW registra o `index.html` como fallback para navegação offline:
   ```js
   // No fetch handler do SW — deve retornar index.html para navegação
   if (request.mode === 'navigate') {
     return caches.match('/index.html');
   }
   ```

### Arquivos relevantes
- `src/PokerHub.Client/wwwroot/manifest.webmanifest`
- `src/PokerHub.Client/wwwroot/icons/` (verificar se existem)
- `src/PokerHub.Client/wwwroot/service-worker.js` (dev)
- `src/PokerHub.Client/wwwroot/service-worker.published.js` (prod)
- `src/PokerHub.Client/Program.cs` (registro SW)

---

## Ordem de execução sugerida
1. Corrigir auth persistence (impacta UX de todo o app)
2. Verificar/criar ícones PWA e corrigir manifest
3. Testar com `dotnet publish` + servidor local para validar offline real
4. Ajustar fallback de navegação no SW se necessário

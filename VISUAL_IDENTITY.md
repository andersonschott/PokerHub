# PokerHub - Guia de Identidade Visual

Este documento define os padrões visuais e de layout para refatoração de páginas do sistema PokerHub. Use como referência ao implementar ou atualizar páginas.

---

## 1. Tema MudBlazor

### Cores do Tema (MainLayout.razor)

```csharp
PaletteDark = new PaletteDark()
{
    Primary = "#4CAF50",        // Verde poker
    Secondary = "#FFD54F",      // Amarelo/Dourado
    Background = "#0d0d0d",     // Fundo principal (quase preto)
    Surface = "#1a1a1a",        // Cards e superfícies
    AppbarBackground = "#1B5E20", // Barra superior
    DrawerBackground = "#1a1a1a", // Menu lateral
    TextPrimary = "#FFFFFF",    // Texto principal
    TextSecondary = "#9ca3af"   // Texto secundário
}

PaletteLight = new PaletteLight()
{
    Primary = "#2E7D32",
    Secondary = "#FFC107",
    AppbarBackground = "#1B5E20",
    Background = "#FAFAFA",
    Surface = "#FFFFFF",
    TextPrimary = "#212121",
    TextSecondary = "#757575"
}
```

### Variáveis CSS MudBlazor (usar sempre)

```css
/* Backgrounds */
var(--mud-palette-background)    /* Fundo da página */
var(--mud-palette-surface)       /* Cards, containers */

/* Texto */
var(--mud-palette-text-primary)  /* Títulos, valores principais */
var(--mud-palette-text-secondary) /* Labels, descrições */

/* Cores de destaque */
var(--mud-palette-primary)       /* Verde - ações primárias */
var(--mud-palette-secondary)     /* Amarelo/Dourado - destaques */
var(--mud-palette-success)       /* Verde - valores positivos */
var(--mud-palette-error)         /* Vermelho - valores negativos */
var(--mud-palette-warning)       /* Amarelo - alertas */

/* Bordas */
var(--mud-palette-lines-default) /* Bordas de cards */
```

---

## 2. Tipografia

### Fontes (carregar no index.html)

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Uso das Fontes

| Elemento | Fonte | Peso |
|----------|-------|------|
| Títulos de página | Space Grotesk | 700 |
| Textos gerais | Space Grotesk | 400-500 |
| Valores numéricos | JetBrains Mono | 600-800 |
| Estatísticas | JetBrains Mono | 700 |
| Labels pequenos | Space Grotesk | 500-600 |

### CSS

```css
.stats-value {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
}

.page-title {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
}
```

---

## 3. Cores Semânticas

### Valores Financeiros

```css
/* Positivo (lucro) */
.positive { color: var(--mud-palette-success); } /* #22c55e */

/* Negativo (prejuízo) */
.negative { color: var(--mud-palette-error); } /* #ef4444 */
```

### Pódio

```css
/* 1º lugar - Ouro */
--accent-gold: #ffd700;
background: rgba(255, 215, 0, 0.1);
border-color: rgba(255, 215, 0, 0.3);

/* 2º lugar - Prata */
--accent-silver: #c0c0c0;
background: rgba(192, 192, 192, 0.08);
border-color: rgba(192, 192, 192, 0.2);

/* 3º lugar - Bronze */
--accent-bronze: #cd7f32;
background: rgba(205, 127, 50, 0.08);
border-color: rgba(205, 127, 50, 0.2);
```

---

## 4. Componentes Padrão

### 4.1 Hero Stats (Estatísticas Principais)

Grid com as métricas mais importantes da página.

```razor
<div class="hero-stats">
    <div class="hero-stat">
        <div class="hero-stat-icon">🎯</div>
        <div class="hero-stat-value">42</div>
        <div class="hero-stat-label">Torneios</div>
    </div>
    <!-- Mais stats... -->
</div>
```

```css
.hero-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* Mobile: 2 colunas */
    gap: 10px;
}

@media (min-width: 768px) {
    .hero-stats {
        grid-template-columns: repeat(4, 1fr); /* Desktop: 4 colunas */
    }
}

.hero-stat {
    background: var(--mud-palette-surface);
    border-radius: 16px;
    padding: 16px;
    border: 1px solid var(--mud-palette-lines-default);
    text-align: center;
}

.hero-stat-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 28px;
    font-weight: 800;
}

.hero-stat-label {
    font-size: 11px;
    color: var(--mud-palette-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
```

### 4.2 Section Title (Título de Seção)

```razor
<div class="section-title">📊 Performance</div>
```

```css
.section-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--mud-palette-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
    margin-top: 20px;
}
```

### 4.3 Stats List (Lista de Estatísticas)

Para exibir pares chave-valor.

```razor
<div class="stats-list">
    <div class="stat-row">
        <span class="stat-row-label">Total Investido</span>
        <span class="stat-row-value">R$ 1.500,00</span>
    </div>
    <!-- Mais rows... -->
</div>
```

```css
.stats-list {
    background: var(--mud-palette-surface);
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid var(--mud-palette-lines-default);
}

.stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid var(--mud-palette-lines-default);
}

.stat-row:last-child {
    border-bottom: none;
}

.stat-row-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 600;
}
```

### 4.4 Performance Card (Card com Progress Bar)

```razor
<div class="performance-card">
    <div class="performance-header">
        <span class="performance-label">ITM Rate</span>
        <span class="performance-value">65%</span>
    </div>
    <MudProgressLinear Value="65" Color="Color.Success" Rounded="true" Size="Size.Small" />
</div>
```

```css
.performance-card {
    background: var(--mud-palette-surface);
    border-radius: 12px;
    padding: 16px;
    border: 1px solid var(--mud-palette-lines-default);
}

.performance-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.performance-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 20px;
    font-weight: 700;
}
```

### 4.5 Podium Display (Pódio)

```razor
<div class="podium-stats">
    <div class="podium-item gold">
        <div class="podium-medal">🥇</div>
        <div class="podium-count">5</div>
    </div>
    <div class="podium-item silver">
        <div class="podium-medal">🥈</div>
        <div class="podium-count">3</div>
    </div>
    <div class="podium-item bronze">
        <div class="podium-medal">🥉</div>
        <div class="podium-count">2</div>
    </div>
</div>
```

### 4.6 ROI Card (Card de Destaque)

```razor
<div class="roi-card">
    <div class="roi-label">ROI</div>
    <div class="roi-value @(_roi >= 0 ? "" : "negative")">
        @(_roi >= 0 ? "+" : "")@_roi.ToString("N1")%
    </div>
</div>
```

```css
.roi-card {
    background: var(--mud-palette-surface);
    border-radius: 16px;
    padding: 20px;
    border: 1px solid var(--mud-palette-lines-default);
    text-align: center;
}

.roi-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 52px;
    font-weight: 800;
    background: linear-gradient(180deg, var(--mud-palette-success) 0%, #15803d 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.roi-value.negative {
    background: linear-gradient(180deg, var(--mud-palette-error) 0%, #b91c1c 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
```

---

## 5. Layout Responsivo

### 5.1 Detecção de Breakpoint (Obrigatório)

Usar `IBrowserViewportObserver` do MudBlazor para detecção JavaScript (CSS media queries não funcionam bem em Blazor CSS isolation).

```razor
@implements IBrowserViewportObserver
@implements IAsyncDisposable
@inject IBrowserViewportService BrowserViewportService

@code {
    private bool _isMobile = false; // Default false (desktop)
    private Guid _subscriptionId;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            _subscriptionId = await BrowserViewportService.SubscribeAsync(this, fireImmediately: true);
        }
    }

    public async Task NotifyBrowserViewportChangeAsync(BrowserViewportEventArgs args)
    {
        _isMobile = args.Breakpoint <= Breakpoint.Sm;
        await InvokeAsync(StateHasChanged);
    }

    Guid IBrowserViewportObserver.Id => _subscriptionId;
    ResizeOptions IBrowserViewportObserver.ResizeOptions =>
        new() { NotifyOnBreakpointOnly = true };

    public async ValueTask DisposeAsync()
    {
        await BrowserViewportService.UnsubscribeAsync(_subscriptionId);
    }
}
```

### 5.2 Estrutura de Layout

```razor
@if (_isMobile)
{
    @* Layout Mobile *@
    <div class="mobile-layout">
        @* Seções empilhadas verticalmente *@
    </div>
}
else
{
    @* Layout Desktop *@
    <div class="desktop-layout">
        <div class="desktop-grid">
            <div class="left-column">
                @* Coluna esquerda *@
            </div>
            <div class="right-column">
                @* Coluna direita *@
            </div>
        </div>
    </div>
}
```

```css
.desktop-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    align-items: start;
}

.left-column, .right-column {
    display: flex;
    flex-direction: column;
    gap: 16px;
}
```

### 5.3 Breakpoints

| Breakpoint | Largura | Layout |
|------------|---------|--------|
| Xs | < 600px | Mobile |
| Sm | 600-960px | Mobile |
| Md | 960-1280px | Desktop |
| Lg | 1280-1920px | Desktop |
| Xl | > 1920px | Desktop |

---

## 6. Animações

### Fade In (para cards)

```css
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.hero-stat,
.stat-item,
.stats-list {
    animation: fadeIn 0.3s ease-out;
}

/* Stagger animation */
.hero-stat:nth-child(1) { animation-delay: 0.05s; }
.hero-stat:nth-child(2) { animation-delay: 0.1s; }
.hero-stat:nth-child(3) { animation-delay: 0.15s; }
```

---

## 7. Padrões de Código

### 7.1 Estrutura de Página

```razor
@page "/rota"
@rendermode InteractiveServer
@attribute [Authorize]
@implements IBrowserViewportObserver
@implements IAsyncDisposable
@inject IBrowserViewportService BrowserViewportService
@inject IServico Servico

<PageTitle>Título - PokerHub</PageTitle>

<div class="page-container">
    @if (_loading)
    {
        <div class="loading-container">
            <MudProgressCircular Color="Color.Success" Indeterminate="true" />
        </div>
    }
    else if (_data == null)
    {
        <div class="error-container">
            <MudIcon Icon="@Icons.Material.Filled.Error" />
            <MudText>Dados não encontrados</MudText>
        </div>
    }
    else
    {
        @if (_isMobile)
        {
            @* Mobile Layout *@
        }
        else
        {
            @* Desktop Layout *@
        }
    }
</div>

@code {
    private bool _loading = true;
    private bool _isMobile = false;
    // ...
}
```

### 7.2 Formatação de Valores

```csharp
// Moeda
value.ToString("C")      // R$ 1.234,56
value.ToString("C0")     // R$ 1.235

// Percentual
percent.ToString("N1")   // 65,4
percent.ToString("N0")   // 65

// Posição
position.ToString()      // 1
$"{position}º"           // 1º

// Lucro/Prejuízo com sinal
@(profit >= 0 ? "+" : "")@profit.ToString("C")  // +R$ 500,00 ou -R$ 200,00
```

### 7.3 Classes CSS Condicionais

```razor
<div class="stat-value @(value >= 0 ? "positive" : "negative")">
    @value
</div>

<div class="podium-item @GetPositionClass(position)">

@code {
    private string GetPositionClass(int? position) => position switch
    {
        1 => "gold",
        2 => "silver",
        3 => "bronze",
        _ => "default"
    };
}
```

---

## 8. Espaçamento

### Padrão de Gaps

| Contexto | Gap |
|----------|-----|
| Entre seções | 20px |
| Entre cards no grid | 10-12px |
| Padding de cards | 16px |
| Padding de página | 16px (mobile), 24px (desktop) |

### Border Radius

| Elemento | Radius |
|----------|--------|
| Cards grandes | 16px |
| Cards médios | 12-14px |
| Badges/Chips | 6-8px |
| Avatares | 50% |

---

## 9. Checklist de Refatoração

Ao refatorar uma página para nova identidade visual:

- [ ] Adicionar `@implements IBrowserViewportObserver` e `@implements IAsyncDisposable`
- [ ] Injetar `IBrowserViewportService`
- [ ] Implementar detecção de breakpoint (`_isMobile`)
- [ ] Criar layouts separados para mobile e desktop
- [ ] Usar variáveis CSS MudBlazor (não hardcode colors)
- [ ] Aplicar fontes: Space Grotesk (geral) e JetBrains Mono (números)
- [ ] Usar componentes padrão: hero-stats, section-title, stats-list, etc.
- [ ] Aplicar cores semânticas: positive/negative para valores
- [ ] Adicionar animações fadeIn nos cards
- [ ] Testar em modo claro e escuro
- [ ] Testar em mobile e desktop

---

## 10. Arquivo de Referência

O arquivo `PlayerStats.razor` e `PlayerStats.razor.css` servem como implementação de referência completa. Consulte-os para exemplos práticos de todos os padrões descritos neste documento.

**Localização**: `src/PokerHub.Web/Components/Pages/Ranking/PlayerStats.razor`

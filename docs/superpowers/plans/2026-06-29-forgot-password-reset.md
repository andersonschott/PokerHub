# Forgot Password (reset por link via SMTP Fastmail) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir, na tela de login do app React, solicitar um email com link para redefinir a senha; o link abre uma página onde o usuário define a nova senha. Envio via SMTP do Fastmail.

**Architecture:** A `PokerHub.Api` (minimal APIs, JWT) ganha dois endpoints anônimos (`/api/auth/forgot-password`, `/api/auth/reset-password`) que usam os token providers do ASP.NET Identity (`GeneratePasswordResetTokenAsync` / `ResetPasswordAsync`) e um `IPasswordResetEmailSender` (implementação MailKit → Fastmail). O app React ganha duas páginas públicas (`/recuperar-senha`, `/redefinir-senha`) e um link na tela de login. O Blazor legado (`src/PokerHub.Web/`) **não** é tocado.

**Tech Stack:** .NET 10 minimal APIs, ASP.NET Identity, MailKit/MimeKit, EF Core (SQL Server); React 19 + Vite, react-hook-form + zod, @tanstack/react-query, react-router v7, vitest. Testes de API via xUnit + WebApplicationFactory + Testcontainers (SQL Server — **requer Docker**).

## Global Constraints

- **Não tocar no app Blazor** (`src/PokerHub.Web/`). Tudo é em `src/PokerHub.Api/` e `web/`.
- **Anti-enumeração:** `POST /api/auth/forgot-password` **sempre** retorna `200`, exista ou não o email. Falhas do `reset-password` retornam **`400`** (nunca `401`/`404`) — `401` dispararia o refresh-and-retry do client HTTP.
- **Token:** token nativo do Identity (DataProtection), com `TokenLifespan = 1 hora`, transportado base64url na query (`?code=...`).
- **Segredos:** a app password do Fastmail vive **só** em user-secrets (dev) / env var (prod). **Nunca** commitar. Placeholders vazios no git.
- **Remetente fixo:** `pokerhub@aschott.cloud` via `smtp.fastmail.com:465` (SSL implícito).
- **Nome da interface:** `IPasswordResetEmailSender` (NÃO `IEmailSender` — evita ambiguidade com `Microsoft.AspNetCore.Identity.IEmailSender`, que está no escopo do `Program.cs`).
- **Copy em pt-BR.**
- TDD, commits frequentes, DRY, YAGNI.

---

## File Structure

**API (`src/PokerHub.Api/`):**
- `Email/EmailOptions.cs` (novo) — config bindada da seção `Email`.
- `Email/IPasswordResetEmailSender.cs` (novo) — abstração de envio (permite fake nos testes).
- `Email/PasswordResetEmailTemplate.cs` (novo) — função pura `Build(link)` → `(html, text)`.
- `Email/SmtpEmailSender.cs` (novo) — implementação MailKit.
- `Auth/AuthModels.cs` (modificar) — 2 records novos.
- `Auth/AuthEndpoints.cs` (modificar) — 2 endpoints novos.
- `Program.cs` (modificar) — bind de `EmailOptions`, registro do sender, lifespan de 1h.
- `PokerHub.Api.csproj` (modificar) — pacote MailKit.
- `appsettings.json` / `appsettings.Development.json` (modificar) — seção `Email`.

**Testes API (`tests/PokerHub.Api.Tests/`):**
- `PasswordResetEmailTemplateTests.cs` (novo) — unit, sem Docker.
- `SmtpEmailSenderGuardTests.cs` (novo) — unit, sem Docker.
- `CapturingEmailSender.cs` (novo) — test double de `IPasswordResetEmailSender`.
- `ApiFactory.cs` (modificar) — injeta o `CapturingEmailSender` + `Email:AppBaseUrl` (garante que NENHUM teste toca SMTP real).
- `ForgotPasswordEndpointTests.cs` (novo) — integração (Docker).
- `ResetPasswordEndpointTests.cs` (novo) — integração (Docker).

**Web (`web/`):**
- `src/lib/api/hooks/use-auth.ts` (novo) — `useForgotPassword`, `useResetPassword`.
- `src/lib/api/hooks/use-auth.test.tsx` (novo) — vitest.
- `src/features/auth/forgot-password-form.tsx` (novo).
- `src/features/auth/reset-password-form.tsx` (novo).
- `src/routes/recuperar-senha.tsx` (novo).
- `src/routes/redefinir-senha.tsx` (novo).
- `src/App.tsx` (modificar) — 2 rotas sob `PublicOnly`.
- `src/features/auth/login-form.tsx` (modificar) — link "Esqueci minha senha".

---

## Task 1: Email options, interface e template (puro, unit-tested)

**Files:**
- Create: `src/PokerHub.Api/Email/EmailOptions.cs`
- Create: `src/PokerHub.Api/Email/IPasswordResetEmailSender.cs`
- Create: `src/PokerHub.Api/Email/PasswordResetEmailTemplate.cs`
- Test: `tests/PokerHub.Api.Tests/PasswordResetEmailTemplateTests.cs`

**Interfaces:**
- Produces:
  - `class PokerHub.Api.Email.EmailOptions` com props `Host, Port (int), UseSsl (bool), User, Password, FromAddress, FromName, AppBaseUrl` (todas string exceto Port/UseSsl).
  - `interface PokerHub.Api.Email.IPasswordResetEmailSender { Task SendPasswordResetAsync(string toEmail, string? toName, string resetLink, CancellationToken ct = default); }`
  - `static class PokerHub.Api.Email.PasswordResetEmailTemplate { static (string Html, string Text) Build(string resetLink); }`

- [ ] **Step 1: Write the failing test**

Create `tests/PokerHub.Api.Tests/PasswordResetEmailTemplateTests.cs`:

```csharp
using PokerHub.Api.Email;

namespace PokerHub.Api.Tests;

public class PasswordResetEmailTemplateTests
{
    private const string Link =
        "http://localhost:5173/redefinir-senha?email=jogador%40test.com&code=ABC123token";

    [Fact]
    public void Build_HtmlAndText_ContainTheResetLink()
    {
        var (html, text) = PasswordResetEmailTemplate.Build(Link);

        Assert.Contains("code=ABC123token", html);
        Assert.Contains(Link, text); // texto puro usa o link cru
    }

    [Fact]
    public void Build_MentionsBrandAndExpiry()
    {
        var (html, text) = PasswordResetEmailTemplate.Build(Link);

        Assert.Contains("PokerHub", html);
        Assert.Contains("1 hora", html);
        Assert.Contains("1 hora", text);
    }

    [Fact]
    public void Build_LeavesNoTemplatePlaceholders()
    {
        var (html, _) = PasswordResetEmailTemplate.Build(Link);

        Assert.DoesNotContain("{{", html);
        Assert.DoesNotContain("}}", html);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/PokerHub.Api.Tests --filter "FullyQualifiedName~PasswordResetEmailTemplateTests"`
Expected: FAIL na compilação — `PasswordResetEmailTemplate` / `EmailOptions` / `IPasswordResetEmailSender` não existem.

- [ ] **Step 3: Create `EmailOptions.cs`**

```csharp
namespace PokerHub.Api.Email;

/// <summary>Configuração SMTP + base URL do front, bindada da seção "Email".</summary>
public sealed class EmailOptions
{
    public string Host { get; set; } = "smtp.fastmail.com";
    public int Port { get; set; } = 465;
    /// <summary>SSL implícito (porta 465). Para 587, usar false → STARTTLS.</summary>
    public bool UseSsl { get; set; } = true;
    public string User { get; set; } = "";
    public string Password { get; set; } = "";
    public string FromAddress { get; set; } = "pokerhub@aschott.cloud";
    public string FromName { get; set; } = "PokerHub";
    /// <summary>Origem do app React, usada para montar o link do email (ex.: http://localhost:5173).</summary>
    public string AppBaseUrl { get; set; } = "";
}
```

- [ ] **Step 4: Create `IPasswordResetEmailSender.cs`**

```csharp
namespace PokerHub.Api.Email;

/// <summary>
/// Envio do email de redefinição de senha. Abstraído para permitir um fake nos testes
/// (garantia de que nenhum email real é disparado em CI).
/// </summary>
public interface IPasswordResetEmailSender
{
    Task SendPasswordResetAsync(string toEmail, string? toName, string resetLink, CancellationToken ct = default);
}
```

- [ ] **Step 5: Create `PasswordResetEmailTemplate.cs`**

```csharp
using System.Net;

namespace PokerHub.Api.Email;

/// <summary>
/// Renderiza o email de redefinição (HTML + fallback texto). Função pura, sem I/O —
/// testável unitariamente. Layout table-based + CSS inline (compatível com clientes de email).
/// Espelha a identidade visual do app: felt escuro, badge ♠ dourado, wordmark PokerHub.
/// </summary>
public static class PasswordResetEmailTemplate
{
    public static (string Html, string Text) Build(string resetLink)
    {
        // O href tolera &amp;; navegadores decodificam. HtmlEncode evita HTML quebrado.
        var safeLink = WebUtility.HtmlEncode(resetLink);

        var html = $$"""
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background-color:#16140f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#16140f;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#211d16;border:1px solid #3a3326;border-radius:16px;overflow:hidden;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
          <tr>
            <td align="center" style="padding:32px 32px 8px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="width:52px;height:52px;background:linear-gradient(160deg,#e0b23e,#b9842a);border-radius:14px;text-align:center;vertical-align:middle;font-size:28px;color:#1f1c12;">&#9824;</td>
                <td style="padding-left:12px;font-size:24px;font-weight:800;color:#f3efe6;letter-spacing:-0.02em;">Poker<span style="color:#e0b23e;">Hub</span></td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0 32px;">
              <h1 style="margin:0;font-size:20px;color:#f3efe6;">Redefinir sua senha</h1>
              <p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:#a89f8c;">
                Recebemos um pedido para redefinir a senha da sua conta PokerHub.
                Clique no botão abaixo para escolher uma nova senha.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px;">
              <a href="{{safeLink}}" style="display:inline-block;background:linear-gradient(160deg,#e0b23e,#b9842a);color:#1f1c12;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:12px;">Definir nova senha</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 8px 32px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#a89f8c;">
                Se o botão não funcionar, copie e cole este endereço no navegador:<br>
                <span style="color:#e0b23e;word-break:break-all;">{{safeLink}}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px 32px;border-top:1px solid #3a3326;">
              <p style="margin:16px 0 0 0;font-size:12px;line-height:1.6;color:#a89f8c;">
                Este link expira em <strong style="color:#f3efe6;">1 hora</strong>.
                Se você não solicitou a redefinição, ignore este email — sua senha continua a mesma.
              </p>
              <p style="margin:16px 0 0 0;font-size:11px;color:#6f6957;">PokerHub — gestão de torneios</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
""";

        var text =
            "Redefinir sua senha — PokerHub\n\n" +
            "Recebemos um pedido para redefinir a senha da sua conta PokerHub.\n" +
            "Abra o link abaixo para escolher uma nova senha:\n\n" +
            resetLink + "\n\n" +
            "Este link expira em 1 hora. Se você não solicitou, ignore este email.\n";

        return (html, text);
    }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `dotnet test tests/PokerHub.Api.Tests --filter "FullyQualifiedName~PasswordResetEmailTemplateTests"`
Expected: PASS (3 testes).

- [ ] **Step 7: Commit**

```bash
git add src/PokerHub.Api/Email/EmailOptions.cs \
        src/PokerHub.Api/Email/IPasswordResetEmailSender.cs \
        src/PokerHub.Api/Email/PasswordResetEmailTemplate.cs \
        tests/PokerHub.Api.Tests/PasswordResetEmailTemplateTests.cs
git commit -m "feat(api): EmailOptions, IPasswordResetEmailSender e template de reset de senha"
```

---

## Task 2: SmtpEmailSender (MailKit) + wiring + config

**Files:**
- Modify: `src/PokerHub.Api/PokerHub.Api.csproj` (add MailKit)
- Create: `src/PokerHub.Api/Email/SmtpEmailSender.cs`
- Modify: `src/PokerHub.Api/Program.cs:50-71` (bind options, lifespan, registro do sender)
- Modify: `src/PokerHub.Api/appsettings.json:5-11` (seção Email)
- Modify: `src/PokerHub.Api/appsettings.Development.json:12-14` (Email dev)
- Test: `tests/PokerHub.Api.Tests/SmtpEmailSenderGuardTests.cs`

**Interfaces:**
- Consumes: `EmailOptions`, `IPasswordResetEmailSender`, `PasswordResetEmailTemplate.Build` (Task 1).
- Produces: `sealed class PokerHub.Api.Email.SmtpEmailSender : IPasswordResetEmailSender` (ctor `(IOptions<EmailOptions>)`). Lança `InvalidOperationException` quando Host/User/Password vazios.

- [ ] **Step 1: Write the failing test**

Create `tests/PokerHub.Api.Tests/SmtpEmailSenderGuardTests.cs`:

```csharp
using Microsoft.Extensions.Options;
using PokerHub.Api.Email;

namespace PokerHub.Api.Tests;

public class SmtpEmailSenderGuardTests
{
    [Fact]
    public async Task SendPasswordResetAsync_WhenNotConfigured_Throws()
    {
        var opts = Options.Create(new EmailOptions { Host = "", User = "", Password = "" });
        var sender = new SmtpEmailSender(opts);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sender.SendPasswordResetAsync("a@b.com", "Alguém",
                "http://localhost:5173/redefinir-senha?email=a%40b.com&code=z"));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/PokerHub.Api.Tests --filter "FullyQualifiedName~SmtpEmailSenderGuardTests"`
Expected: FAIL na compilação — `SmtpEmailSender` não existe.

- [ ] **Step 3: Add MailKit package**

Run: `dotnet add src/PokerHub.Api/PokerHub.Api.csproj package MailKit`
(Resolve a versão estável mais recente; traz MimeKit transitivamente.)

- [ ] **Step 4: Create `SmtpEmailSender.cs`**

```csharp
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace PokerHub.Api.Email;

/// <summary>Envia o email de redefinição via SMTP (Fastmail) usando MailKit.</summary>
public sealed class SmtpEmailSender : IPasswordResetEmailSender
{
    private readonly EmailOptions _opts;

    public SmtpEmailSender(IOptions<EmailOptions> opts) => _opts = opts.Value;

    public async Task SendPasswordResetAsync(
        string toEmail, string? toName, string resetLink, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_opts.Host)
            || string.IsNullOrWhiteSpace(_opts.User)
            || string.IsNullOrWhiteSpace(_opts.Password))
        {
            throw new InvalidOperationException(
                "SMTP não configurado (Email:Host / Email:User / Email:Password).");
        }

        var (html, text) = PasswordResetEmailTemplate.Build(resetLink);

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_opts.FromName, _opts.FromAddress));
        message.To.Add(new MailboxAddress(toName ?? toEmail, toEmail));
        message.Subject = "Redefinição de senha — PokerHub";
        message.Body = new BodyBuilder { HtmlBody = html, TextBody = text }.ToMessageBody();

        using var smtp = new SmtpClient();
        var socket = _opts.UseSsl ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
        await smtp.ConnectAsync(_opts.Host, _opts.Port, socket, ct);
        await smtp.AuthenticateAsync(_opts.User, _opts.Password, ct);
        await smtp.SendAsync(message, ct);
        await smtp.DisconnectAsync(true, ct);
    }
}
```

- [ ] **Step 5: Wire em `Program.cs`**

Logo após o bloco `AddIdentityCore(...).AddDefaultTokenProviders();` (`Program.cs:50-57`), adicione o lifespan de 1h:

```csharp
// Token de reset de senha (DataProtection) expira em 1 hora.
builder.Services.Configure<DataProtectionTokenProviderOptions>(o =>
    o.TokenLifespan = TimeSpan.FromHours(1));
```

Após `builder.Services.AddSingleton<RefreshTokenService>();` (`Program.cs:71`), adicione:

```csharp
// --- Email (SMTP Fastmail) para reset de senha ---
builder.Services.Configure<PokerHub.Api.Email.EmailOptions>(
    builder.Configuration.GetSection("Email"));
builder.Services.AddSingleton<PokerHub.Api.Email.IPasswordResetEmailSender,
    PokerHub.Api.Email.SmtpEmailSender>();
```

(`DataProtectionTokenProviderOptions` está em `Microsoft.AspNetCore.Identity`, já importado em `Program.cs:5`. Não adicionar `using PokerHub.Api.Email;` para evitar ambiguidade de `IEmailSender`; usar nomes totalmente qualificados como acima.)

- [ ] **Step 6: Add `Email` section em `appsettings.json`**

Em `src/PokerHub.Api/appsettings.json`, insira o bloco `Email` logo após o bloco `Jwt` (depois da linha 11, antes de `RateLimit`):

```json
  "Email": {
    "Host": "smtp.fastmail.com",
    "Port": 465,
    "UseSsl": true,
    "User": "",
    "Password": "",
    "FromAddress": "pokerhub@aschott.cloud",
    "FromName": "PokerHub",
    "AppBaseUrl": ""
  },
```

- [ ] **Step 7: Add `Email` dev config em `appsettings.Development.json`**

Em `src/PokerHub.Api/appsettings.Development.json`, adicione um bloco `Email` após o bloco `Cors` (lembre da vírgula após `}` do Cors):

```json
  "Email": {
    "User": "pokerhub@aschott.cloud",
    "AppBaseUrl": "http://localhost:5173"
  }
```

A senha NÃO vai aqui. Configure via user-secrets (antes do teste manual):
`dotnet user-secrets --project src/PokerHub.Api set "Email:Password" "<app-password-do-fastmail>"`

- [ ] **Step 8: Build + run the guard test**

Run: `dotnet build src/PokerHub.Api`
Expected: build OK (sem ambiguidade de `IEmailSender`).

Run: `dotnet test tests/PokerHub.Api.Tests --filter "FullyQualifiedName~SmtpEmailSenderGuardTests"`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/PokerHub.Api/PokerHub.Api.csproj src/PokerHub.Api/Email/SmtpEmailSender.cs \
        src/PokerHub.Api/Program.cs src/PokerHub.Api/appsettings.json \
        src/PokerHub.Api/appsettings.Development.json \
        tests/PokerHub.Api.Tests/SmtpEmailSenderGuardTests.cs
git commit -m "feat(api): SmtpEmailSender (MailKit) + config Email + lifespan de 1h do token"
```

---

## Task 3: Endpoint forgot-password + test double + garantias anti-envio

**Files:**
- Modify: `src/PokerHub.Api/Auth/AuthModels.cs` (records)
- Modify: `src/PokerHub.Api/Auth/AuthEndpoints.cs` (endpoint + usings)
- Create: `tests/PokerHub.Api.Tests/CapturingEmailSender.cs`
- Modify: `tests/PokerHub.Api.Tests/ApiFactory.cs` (injeta o fake + Email:AppBaseUrl)
- Test: `tests/PokerHub.Api.Tests/ForgotPasswordEndpointTests.cs`

**Interfaces:**
- Consumes: `IPasswordResetEmailSender`, `EmailOptions` (Tasks 1-2); `UserManager<User>`, `User.IsActive`, `User.Name`, `User.Email` (já existem).
- Produces:
  - `record ForgotPasswordRequest(string Email)`.
  - `POST /api/auth/forgot-password` → sempre `200`.
  - `class CapturingEmailSender : IPasswordResetEmailSender` com `IReadOnlyCollection<SentEmail> Sent` (record `SentEmail(string ToEmail, string? ToName, string ResetLink)`) e `bool ThrowOnSend`.

- [ ] **Step 1: Create the test double `CapturingEmailSender.cs`**

```csharp
using System.Collections.Concurrent;
using PokerHub.Api.Email;

namespace PokerHub.Api.Tests;

public sealed record SentEmail(string ToEmail, string? ToName, string ResetLink);

/// <summary>
/// Substitui o SmtpEmailSender nos testes: registra os "envios" em memória, nunca toca SMTP.
/// É singleton no host de teste — os testes filtram por email (cada teste usa um endereço único).
/// </summary>
public sealed class CapturingEmailSender : IPasswordResetEmailSender
{
    private readonly ConcurrentBag<SentEmail> _sent = new();
    public IReadOnlyCollection<SentEmail> Sent => _sent;

    /// <summary>Quando true, simula falha de SMTP (testa o try/catch do endpoint).</summary>
    public bool ThrowOnSend { get; set; }

    public Task SendPasswordResetAsync(
        string toEmail, string? toName, string resetLink, CancellationToken ct = default)
    {
        if (ThrowOnSend)
            throw new InvalidOperationException("SMTP indisponível (simulado).");
        _sent.Add(new SentEmail(toEmail, toName, resetLink));
        return Task.CompletedTask;
    }
}
```

- [ ] **Step 2: Wire the fake into `ApiFactory.cs`**

Em `tests/PokerHub.Api.Tests/ApiFactory.cs`, adicione o using no topo:

```csharp
using Microsoft.Extensions.DependencyInjection.Extensions;
using PokerHub.Api.Email;
```

No `ConfigureAppConfiguration` (dentro do dicionário in-memory, `ApiFactory.cs:51-63`), adicione a entrada:

```csharp
                ["Email:AppBaseUrl"] = "http://localhost:5173",
```

No `ConfigureServices`, logo após o bloco que troca o DbContext e ANTES de `var sp = services.BuildServiceProvider();` (`ApiFactory.cs:85`), adicione:

```csharp
            // Garante que NENHUM teste dispara email real: troca o SMTP por um fake capturador.
            services.RemoveAll<IPasswordResetEmailSender>();
            services.AddSingleton<CapturingEmailSender>();
            services.AddSingleton<IPasswordResetEmailSender>(
                sp => sp.GetRequiredService<CapturingEmailSender>());
```

- [ ] **Step 3: Write the failing test**

Create `tests/PokerHub.Api.Tests/ForgotPasswordEndpointTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using PokerHub.Domain.Entities;

namespace PokerHub.Api.Tests;

public class ForgotPasswordEndpointTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public ForgotPasswordEndpointTests(ApiFactory factory) => _factory = factory;

    private CapturingEmailSender Sender => _factory.Services.GetRequiredService<CapturingEmailSender>();

    private async Task RegisterAsync(string email)
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/register",
            new { Name = "User " + email, Email = email, Password = "Senha123!" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task ForgotPassword_UnknownEmail_Returns200_AndSendsNothing()
    {
        var email = "forgot-unknown@test.com";
        var client = _factory.CreateClient();

        var resp = await client.PostAsJsonAsync("/api/auth/forgot-password", new { Email = email });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.DoesNotContain(Sender.Sent, e => e.ToEmail == email);
    }

    [Fact]
    public async Task ForgotPassword_InactiveUser_Returns200_AndSendsNothing()
    {
        var email = "forgot-inactive@test.com";
        await RegisterAsync(email);

        using (var scope = _factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.UserManager<User>>();
            var user = await users.FindByEmailAsync(email);
            user!.IsActive = false;
            await users.UpdateAsync(user);
        }

        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/forgot-password", new { Email = email });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.DoesNotContain(Sender.Sent, e => e.ToEmail == email);
    }

    [Fact]
    public async Task ForgotPassword_ActiveUser_Returns200_AndSendsExactlyOneLink()
    {
        var email = "forgot-ok@test.com";
        await RegisterAsync(email);

        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/forgot-password", new { Email = email });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var sent = Sender.Sent.Where(e => e.ToEmail == email).ToList();
        Assert.Single(sent);
        Assert.Contains("/redefinir-senha?email=", sent[0].ResetLink);
        Assert.Contains("code=", sent[0].ResetLink);
    }

    [Fact]
    public async Task ForgotPassword_WhenSmtpFails_StillReturns200()
    {
        var email = "forgot-smtpfail@test.com";
        await RegisterAsync(email);

        Sender.ThrowOnSend = true;
        try
        {
            var client = _factory.CreateClient();
            var resp = await client.PostAsJsonAsync("/api/auth/forgot-password", new { Email = email });
            Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        }
        finally
        {
            Sender.ThrowOnSend = false;
        }
    }
}
```

- [ ] **Step 4: Run test to verify it fails**

Run: `dotnet test tests/PokerHub.Api.Tests --filter "FullyQualifiedName~ForgotPasswordEndpointTests"`
Expected: FAIL — endpoint `/api/auth/forgot-password` ainda não existe (404 → asserts de 200 falham), ou falha de compilação por falta do record.

- [ ] **Step 5: Add the request record em `AuthModels.cs`**

Em `src/PokerHub.Api/Auth/AuthModels.cs`, após a linha `public sealed record ChangePasswordRequest(...)`, adicione:

```csharp
public sealed record ForgotPasswordRequest(string Email);
public sealed record ResetPasswordRequest(string Email, string Code, string NewPassword);
```

(`ResetPasswordRequest` é usado na Task 4, mas adicione os dois juntos aqui.)

- [ ] **Step 6: Add usings + endpoint em `AuthEndpoints.cs`**

No topo de `src/PokerHub.Api/Auth/AuthEndpoints.cs`, adicione aos usings existentes:

```csharp
using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using PokerHub.Api.Email;
```

Dentro de `Map(...)`, logo após o bloco do `/logout` (`AuthEndpoints.cs:155-169`) e antes do `app.MapPost("/api/auth/change-password", ...)`, adicione:

```csharp
        group.MapPost("/forgot-password", async (
            ForgotPasswordRequest req,
            UserManager<User> userManager,
            IPasswordResetEmailSender emailSender,
            IOptions<EmailOptions> emailOpts,
            ILoggerFactory loggerFactory,
            CancellationToken ct) =>
        {
            // Resposta uniforme 200 (anti-enumeração). Só dispara email se a conta
            // existir E estiver ativa. Falha de SMTP é logada, nunca propagada.
            if (!string.IsNullOrWhiteSpace(req.Email))
            {
                var email = req.Email.Trim().ToLowerInvariant();
                var user = await userManager.FindByEmailAsync(email);
                if (user is not null && user.IsActive)
                {
                    var token = await userManager.GeneratePasswordResetTokenAsync(user);
                    var code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
                    var baseUrl = emailOpts.Value.AppBaseUrl.TrimEnd('/');
                    var link = $"{baseUrl}/redefinir-senha?email={Uri.EscapeDataString(user.Email!)}&code={code}";
                    try
                    {
                        await emailSender.SendPasswordResetAsync(user.Email!, user.Name, link, ct);
                    }
                    catch (Exception ex)
                    {
                        loggerFactory.CreateLogger("Auth.ForgotPassword")
                            .LogError(ex, "Falha ao enviar email de redefinição de senha.");
                    }
                }
            }

            return Results.Ok();
        });
```

- [ ] **Step 7: Run test to verify it passes**

Run: `dotnet test tests/PokerHub.Api.Tests --filter "FullyQualifiedName~ForgotPasswordEndpointTests"`
Expected: PASS (4 testes). (Requer Docker — Testcontainers sobe SQL Server.)

- [ ] **Step 8: Commit**

```bash
git add src/PokerHub.Api/Auth/AuthModels.cs src/PokerHub.Api/Auth/AuthEndpoints.cs \
        tests/PokerHub.Api.Tests/CapturingEmailSender.cs tests/PokerHub.Api.Tests/ApiFactory.cs \
        tests/PokerHub.Api.Tests/ForgotPasswordEndpointTests.cs
git commit -m "feat(api): endpoint forgot-password (anti-enumeração, sempre 200) + testes anti-envio"
```

---

## Task 4: Endpoint reset-password + revogação de refresh tokens

**Files:**
- Modify: `src/PokerHub.Api/Auth/AuthEndpoints.cs` (endpoint reset-password)
- Test: `tests/PokerHub.Api.Tests/ResetPasswordEndpointTests.cs`

**Interfaces:**
- Consumes: `ResetPasswordRequest` (Task 3); `UserManager<User>.ResetPasswordAsync`; `PokerHubDbContext.RefreshTokens`, `RefreshToken.Revoke(Guid?, DateTime)`, `RefreshToken.UserId`, `RefreshToken.RevokedAt`; `CapturingEmailSender` (para extrair o `code` do link no teste happy-path).
- Produces: `POST /api/auth/reset-password` → `204` no sucesso (revogando refresh tokens), `400` ValidationProblem (chave `resetPassword`) em qualquer falha.

- [ ] **Step 1: Write the failing test**

Create `tests/PokerHub.Api.Tests/ResetPasswordEndpointTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;

namespace PokerHub.Api.Tests;

public class ResetPasswordEndpointTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public ResetPasswordEndpointTests(ApiFactory factory) => _factory = factory;

    private sealed record AuthResponse(string AccessToken, string RefreshToken, string UserId, string Name, string Email);
    private CapturingEmailSender Sender => _factory.Services.GetRequiredService<CapturingEmailSender>();

    private async Task<AuthResponse> RegisterAsync(string email)
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/register",
            new { Name = "User " + email, Email = email, Password = "Senha123!" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        return (await resp.Content.ReadFromJsonAsync<AuthResponse>())!;
    }

    /// <summary>Solicita o reset e extrai o `code` do link capturado pelo fake sender.</summary>
    private async Task<string> RequestCodeAsync(string email)
    {
        var client = _factory.CreateClient();
        await client.PostAsJsonAsync("/api/auth/forgot-password", new { Email = email });
        var link = Sender.Sent.Last(e => e.ToEmail == email).ResetLink;
        return link.Split("code=")[1]; // code é o último parâmetro e é URL-safe
    }

    [Fact]
    public async Task ResetPassword_ValidCode_ChangesPassword_AndRevokesOldRefreshTokens()
    {
        var email = "reset-ok@test.com";
        var reg = await RegisterAsync(email);
        var code = await RequestCodeAsync(email);

        var anon = _factory.CreateClient();
        var reset = await anon.PostAsJsonAsync("/api/auth/reset-password",
            new { Email = email, Code = code, NewPassword = "NovaSenha456!" });
        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);

        // Senha antiga falha, nova funciona.
        var oldLogin = await anon.PostAsJsonAsync("/api/auth/login",
            new { Email = email, Password = "Senha123!" });
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);

        var newLogin = await anon.PostAsJsonAsync("/api/auth/login",
            new { Email = email, Password = "NovaSenha456!" });
        Assert.Equal(HttpStatusCode.OK, newLogin.StatusCode);

        // O refresh token emitido no register foi revogado pelo reset.
        var refresh = await anon.PostAsJsonAsync("/api/auth/refresh",
            new { RefreshToken = reg.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_InvalidToken_Returns400()
    {
        var email = "reset-badtoken@test.com";
        await RegisterAsync(email);
        // base64url válido, mas não é um token do Identity → ResetPasswordAsync falha (InvalidToken).
        var bogus = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(
            System.Text.Encoding.UTF8.GetBytes("nao-e-um-token-valido"));

        var anon = _factory.CreateClient();
        var reset = await anon.PostAsJsonAsync("/api/auth/reset-password",
            new { Email = email, Code = bogus, NewPassword = "NovaSenha456!" });

        Assert.Equal(HttpStatusCode.BadRequest, reset.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_MalformedCode_Returns400_NotServerError()
    {
        var email = "reset-malformed@test.com";
        await RegisterAsync(email);

        var anon = _factory.CreateClient();
        var reset = await anon.PostAsJsonAsync("/api/auth/reset-password",
            new { Email = email, Code = "!!!nao-base64url!!!", NewPassword = "NovaSenha456!" });

        Assert.Equal(HttpStatusCode.BadRequest, reset.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_UnknownEmail_Returns400()
    {
        var anon = _factory.CreateClient();
        var reset = await anon.PostAsJsonAsync("/api/auth/reset-password",
            new { Email = "ninguem@test.com", Code = "qualquer", NewPassword = "NovaSenha456!" });

        Assert.Equal(HttpStatusCode.BadRequest, reset.StatusCode);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/PokerHub.Api.Tests --filter "FullyQualifiedName~ResetPasswordEndpointTests"`
Expected: FAIL — endpoint `/api/auth/reset-password` ainda não existe.

- [ ] **Step 3: Add the reset-password endpoint em `AuthEndpoints.cs`**

Logo após o bloco `group.MapPost("/forgot-password", ...)` (Task 3), adicione:

```csharp
        group.MapPost("/reset-password", async (
            ResetPasswordRequest req,
            UserManager<User> userManager,
            PokerHubDbContext db,
            CancellationToken ct) =>
        {
            const string generic = "Não foi possível redefinir a senha. Solicite um novo link.";
            Dictionary<string, string[]> Fail(params string[] msgs) => new() { ["resetPassword"] = msgs };

            if (string.IsNullOrWhiteSpace(req.Email)
                || string.IsNullOrWhiteSpace(req.Code)
                || string.IsNullOrWhiteSpace(req.NewPassword))
                return Results.ValidationProblem(Fail(generic));

            var user = await userManager.FindByEmailAsync(req.Email.Trim().ToLowerInvariant());
            if (user is null)
                return Results.ValidationProblem(Fail(generic)); // não vaza existência

            string token;
            try
            {
                token = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(req.Code));
            }
            catch (FormatException)
            {
                return Results.ValidationProblem(Fail(generic));
            }

            var result = await userManager.ResetPasswordAsync(user, token, req.NewPassword);
            if (!result.Succeeded)
            {
                var errors = result.Errors
                    .Select(e => e.Code switch
                    {
                        "InvalidToken" => "Link inválido ou expirado. Solicite um novo.",
                        "PasswordTooShort" => "Senha muito curta.",
                        "PasswordRequiresNonAlphanumeric" => "Senha deve conter ao menos um caractere especial.",
                        "PasswordRequiresDigit" => "Senha deve conter ao menos um número.",
                        "PasswordRequiresLower" => "Senha deve conter ao menos uma letra minúscula.",
                        "PasswordRequiresUpper" => "Senha deve conter ao menos uma letra maiúscula.",
                        "PasswordRequiresUniqueChars" => "Senha deve conter mais caracteres distintos.",
                        _ => generic
                    })
                    .ToArray();
                return Results.ValidationProblem(Fail(errors));
            }

            // Reset bem-sucedido: revoga todas as sessões ativas do usuário.
            var now = DateTime.UtcNow;
            var activeTokens = await db.RefreshTokens
                .Where(t => t.UserId == user.Id && t.RevokedAt == null)
                .ToListAsync(ct);
            foreach (var t in activeTokens) t.Revoke(null, now);
            await db.SaveChangesAsync(ct);

            return Results.NoContent();
        });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `dotnet test tests/PokerHub.Api.Tests --filter "FullyQualifiedName~ResetPasswordEndpointTests"`
Expected: PASS (4 testes).

- [ ] **Step 5: Run the full API test suite (regressão)**

Run: `dotnet test tests/PokerHub.Api.Tests`
Expected: PASS (todos, incluindo auth/change-password/rate-limit existentes).

- [ ] **Step 6: Commit**

```bash
git add src/PokerHub.Api/Auth/AuthEndpoints.cs tests/PokerHub.Api.Tests/ResetPasswordEndpointTests.cs
git commit -m "feat(api): endpoint reset-password (revoga refresh tokens, 400 em falha)"
```

---

## Task 5: Front — hook + página de "recuperar senha" + link no login

**Files:**
- Create: `web/src/lib/api/hooks/use-auth.ts`
- Create: `web/src/features/auth/forgot-password-form.tsx`
- Create: `web/src/routes/recuperar-senha.tsx`
- Modify: `web/src/App.tsx` (import + rota)
- Modify: `web/src/features/auth/login-form.tsx` (link)
- Test: `web/src/lib/api/hooks/use-auth.test.tsx`

**Interfaces:**
- Consumes: endpoint `POST /api/auth/forgot-password` (Task 3); `api`, `ApiError` (`@/lib/api/client`); `AuthLayout`, componentes `ui/*`.
- Produces: `useForgotPassword()` / `useResetPassword()` (hooks de mutation); `ForgotPasswordForm`; rota `/recuperar-senha`.

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/api/hooks/use-auth.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForgotPassword, useResetPassword } from './use-auth';

const fetchMock = vi.fn<typeof fetch>();

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('useForgotPassword', () => {
  it('POSTs /api/auth/forgot-password with the email', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    const { result } = renderHook(() => useForgotPassword(), { wrapper: createWrapper() });

    act(() => result.current.mutate({ email: 'a@b.com' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/api/auth/forgot-password');
    expect(options?.method).toBe('POST');
    expect(JSON.parse(String(options?.body))).toEqual({ email: 'a@b.com' });
  });
});

describe('useResetPassword', () => {
  it('POSTs /api/auth/reset-password with email, code and newPassword', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { result } = renderHook(() => useResetPassword(), { wrapper: createWrapper() });

    act(() => result.current.mutate({ email: 'a@b.com', code: 'XYZ', newPassword: 'Nova123!' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/api/auth/reset-password');
    expect(JSON.parse(String(options?.body))).toEqual({
      email: 'a@b.com', code: 'XYZ', newPassword: 'Nova123!',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (em `web/`): `npm run test -- use-auth`
Expected: FAIL — `./use-auth` não existe.

- [ ] **Step 3: Create `use-auth.ts`**

```ts
import { useMutation } from '@tanstack/react-query';
import { api } from '../client';

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  code: string;
  newPassword: string;
}

/** POST /api/auth/forgot-password — sempre 200 (anti-enumeração). */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (dto: ForgotPasswordDto) =>
      api<void>('/auth/forgot-password', { method: 'POST', body: dto }),
  });
}

/** POST /api/auth/reset-password — redefine a senha via token do email. */
export function useResetPassword() {
  return useMutation({
    mutationFn: (dto: ResetPasswordDto) =>
      api<void>('/auth/reset-password', { method: 'POST', body: dto }),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (em `web/`): `npm run test -- use-auth`
Expected: PASS (2 testes).

- [ ] **Step 5: Create `forgot-password-form.tsx`**

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { ApiError } from '@/lib/api/client';
import { useForgotPassword } from '@/lib/api/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Schema = z.object({ email: z.email('E-mail inválido.') });
type FormData = z.infer<typeof Schema>;

export function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { email: '' },
  });
  const mutation = useForgotPassword();

  if (mutation.isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.
          Verifique sua caixa de entrada (e o spam). O link expira em 1 hora.
        </p>
        <Link to="/login" className="font-medium text-primary hover:underline">
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      {mutation.error instanceof ApiError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
          Não foi possível processar agora. Tente novamente em instantes.
        </p>
      )}

      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? 'Enviando…' : 'Enviar link de redefinição'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Lembrou a senha?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 6: Create `routes/recuperar-senha.tsx`**

```tsx
import { AuthLayout } from '@/features/auth/auth-layout';
import { ForgotPasswordForm } from '@/features/auth/forgot-password-form';

export default function RecuperarSenhaRoute() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
```

- [ ] **Step 7: Register the route em `App.tsx`**

Após a linha `import CadastroRoute from '@/routes/cadastro';` (`App.tsx:10`), adicione:

```tsx
import RecuperarSenhaRoute from '@/routes/recuperar-senha';
```

Após a `<Route path="/cadastro" ... />` (`App.tsx:88`), adicione:

```tsx
                  <Route path="/recuperar-senha" element={<PublicOnly><RecuperarSenhaRoute /></PublicOnly>} />
```

- [ ] **Step 8: Add the link em `login-form.tsx`**

Em `web/src/features/auth/login-form.tsx`, logo após o fechamento da `<div>` do campo de senha (`login-form.tsx:82`, a `</div>` que fecha o bloco do password) e ANTES do bloco `{mutation.error instanceof ApiError && (...)}`, adicione:

```tsx
      <div className="text-right">
        <Link
          to="/recuperar-senha"
          className="text-sm text-muted-foreground hover:text-primary hover:underline"
        >
          Esqueci minha senha
        </Link>
      </div>
```

(`Link` já está importado em `login-form.tsx:5`.)

- [ ] **Step 9: Typecheck + build**

Run (em `web/`): `npm run build`
Expected: `tsc -b` sem erros e `vite build` conclui.

- [ ] **Step 10: Commit**

```bash
git add web/src/lib/api/hooks/use-auth.ts web/src/lib/api/hooks/use-auth.test.tsx \
        web/src/features/auth/forgot-password-form.tsx web/src/routes/recuperar-senha.tsx \
        web/src/App.tsx web/src/features/auth/login-form.tsx
git commit -m "feat(web): página recuperar-senha + link no login + hooks de auth"
```

---

## Task 6: Front — página de "redefinir senha"

**Files:**
- Create: `web/src/features/auth/reset-password-form.tsx`
- Create: `web/src/routes/redefinir-senha.tsx`
- Modify: `web/src/App.tsx` (import + rota)
- Test: `web/src/features/auth/reset-password-form.test.tsx`

**Interfaces:**
- Consumes: `useResetPassword` (Task 5); `useSearchParams`, `useNavigate` (react-router); `toast` (sonner); `ApiError`; componentes `ui/*`, `AuthLayout`.
- Produces: `ResetPasswordForm` (lê `email`/`code` da URL; guarda link inválido); rota `/redefinir-senha`.

- [ ] **Step 1: Write the failing test**

Create `web/src/features/auth/reset-password-form.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResetPasswordForm } from './reset-password-form';

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <ResetPasswordForm />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ResetPasswordForm', () => {
  it('shows an invalid-link message when code/email are missing', () => {
    renderAt('/redefinir-senha');
    expect(screen.getByText(/Link inválido ou incompleto/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nova senha/i)).not.toBeInTheDocument();
  });

  it('renders the password fields when email and code are present', () => {
    renderAt('/redefinir-senha?email=a%40b.com&code=XYZ');
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar nova senha')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (em `web/`): `npm run test -- reset-password-form`
Expected: FAIL — `./reset-password-form` não existe.

- [ ] **Step 3: Create `reset-password-form.tsx`**

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { useResetPassword } from '@/lib/api/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Schema = z
  .object({
    password: z.string().min(6, 'Mínimo de 6 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  });
type FormData = z.infer<typeof Schema>;

/** Extrai as mensagens do ValidationProblem do reset ({errors: {resetPassword: [...]}}). */
function identityErrors(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  const details = err.details as { errors?: { resetPassword?: string[] } } | undefined;
  return details?.errors?.resetPassword?.join(' ') ?? null;
}

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const code = params.get('code') ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const mutation = useResetPassword();

  if (!email || !code) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Link inválido ou incompleto. Solicite um novo link de redefinição.
        </p>
        <Link to="/recuperar-senha" className="font-medium text-primary hover:underline">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((d) =>
        mutation.mutate(
          { email, code, newPassword: d.password },
          {
            onSuccess: () => {
              toast.success('Senha redefinida! Faça login com a nova senha.');
              navigate('/login', { replace: true });
            },
          },
        ),
      )}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      {mutation.error instanceof ApiError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
          {identityErrors(mutation.error) ??
            `Erro ${mutation.error.status}: ${mutation.error.message}`}
        </p>
      )}

      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? 'Redefinindo…' : 'Redefinir senha'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 4: Create `routes/redefinir-senha.tsx`**

```tsx
import { AuthLayout } from '@/features/auth/auth-layout';
import { ResetPasswordForm } from '@/features/auth/reset-password-form';

export default function RedefinirSenhaRoute() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  );
}
```

- [ ] **Step 5: Register the route em `App.tsx`**

Após `import RecuperarSenhaRoute from '@/routes/recuperar-senha';` (Task 5), adicione:

```tsx
import RedefinirSenhaRoute from '@/routes/redefinir-senha';
```

Após a `<Route path="/recuperar-senha" ... />` (Task 5), adicione:

```tsx
                  <Route path="/redefinir-senha" element={<PublicOnly><RedefinirSenhaRoute /></PublicOnly>} />
```

- [ ] **Step 6: Run test to verify it passes**

Run (em `web/`): `npm run test -- reset-password-form`
Expected: PASS (2 testes).

- [ ] **Step 7: Typecheck + build**

Run (em `web/`): `npm run build`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add web/src/features/auth/reset-password-form.tsx web/src/features/auth/reset-password-form.test.tsx \
        web/src/routes/redefinir-senha.tsx web/src/App.tsx
git commit -m "feat(web): página redefinir-senha (lê token da URL, redireciona ao login)"
```

---

## Manual end-to-end (após a app password do Fastmail)

Pré-requisito: `dotnet user-secrets --project src/PokerHub.Api set "Email:Password" "<app-password>"`.

1. Subir API (`dotnet run --project src/PokerHub.Api`) e front (`cd web && npm run dev`).
2. `/login` → "Esqueci minha senha" → `/recuperar-senha` → enviar um email real cadastrado.
3. Conferir o email no Fastmail (visual do template), abrir o link.
4. `/redefinir-senha` → definir nova senha → confirmar redirect para `/login` + toast.
5. Logar com a nova senha (a antiga deve falhar).

---

## Self-Review (preenchido pelo autor do plano)

- **Spec coverage:** fluxo (Tasks 3-6), endpoints forgot/reset (3/4), MailKit/SMTP (2), EmailOptions/config/secrets (2), token 1h (2), anti-enumeração (3/4), revogação de refresh tokens (4), template baseado no layout (1), testes anti-envio indevido (3), páginas/hooks/link no front (5/6), fora-de-escopo respeitado (sem Blazor, sem OTP, sem confirm-email). ✔
- **Placeholder scan:** sem TBD/TODO; todo passo tem código completo. ✔
- **Type consistency:** `IPasswordResetEmailSender.SendPasswordResetAsync(string,string?,string,CancellationToken)` usado igual no SmtpEmailSender (2), CapturingEmailSender (3) e endpoint (3). `ForgotPasswordRequest`/`ResetPasswordRequest` definidos na Task 3 e consumidos em 3/4. Hooks `useForgotPassword`/`useResetPassword` (5) consumidos em 5/6. Chave `resetPassword` do ValidationProblem usada igual no endpoint (4) e no `identityErrors` do front (6). ✔

# Design: "Esqueci minha senha" — reset de senha por link via SMTP Fastmail

**Data:** 2026-06-29
**Stack alvo:** React (`web/`) + `src/PokerHub.Api/` (minimal APIs, JWT). O Blazor legado (`src/PokerHub.Web/`) **não** é tocado.

---

## 1. Objetivo

Permitir que um usuário que esqueceu a senha solicite, na tela de login, um email com um
link para definir uma nova senha. O envio é feito via SMTP do Fastmail.

Decisões já fechadas com o usuário:
- **Método:** link → página de nova senha (não enviar senha em texto no email).
- **Validade do token:** 1 hora.
- **Remetente:** `pokerhub@aschott.cloud` via `smtp.fastmail.com:465` (SSL implícito).
- **Template de email:** apresentável, baseado na identidade visual do app (felt escuro + dourado).
- **Testes unitários obrigatórios** garantindo que não disparamos emails indevidamente.

---

## 2. Fluxo end-to-end

1. Tela de login exibe o link **"Esqueci minha senha"** → rota `/recuperar-senha`.
2. Usuário informa o email → `POST /api/auth/forgot-password`.
3. API: se o usuário existe **e** está ativo, gera token do Identity
   (`GeneratePasswordResetTokenAsync`), codifica em base64url, monta o link
   `{AppBaseUrl}/redefinir-senha?email=<email>&code=<token>` e envia o email via Fastmail.
   **Sempre responde `200`** (anti-enumeração), independentemente de o email existir.
4. Usuário clica no link → rota `/redefinir-senha?email=…&code=…`.
5. Usuário define nova senha + confirmação → `POST /api/auth/reset-password`.
6. API: decodifica o `code`, chama `ResetPasswordAsync`. Em caso de sucesso, **revoga todos os
   refresh tokens** do usuário (mata sessões existentes). Erros do Identity viram `400` ProblemDetails.
7. Frontend mostra toast de sucesso e redireciona para `/login`.

---

## 3. Backend — `src/PokerHub.Api/`

### 3.1 Novos arquivos

**`Email/EmailOptions.cs`** — POCO bindado da seção `Email`:

```csharp
public sealed class EmailOptions
{
    public string Host { get; init; } = "";        // smtp.fastmail.com
    public int Port { get; init; } = 465;
    public bool UseSsl { get; init; } = true;       // SSL implícito (465). Para 587 usar STARTTLS.
    public string User { get; init; } = "";         // pokerhub@aschott.cloud
    public string Password { get; init; } = "";     // app password (user-secrets / env), NUNCA no git
    public string FromAddress { get; init; } = "pokerhub@aschott.cloud";
    public string FromName { get; init; } = "PokerHub";
    public string AppBaseUrl { get; init; } = "";   // ex.: http://localhost:5173 (dev) / URL da SWA (prod)
}
```

**`Email/IEmailSender.cs`** — abstração mínima (permite fake nos testes):

```csharp
public interface IEmailSender
{
    Task SendPasswordResetAsync(string toEmail, string? toName, string resetLink, CancellationToken ct = default);
}
```

**`Email/SmtpEmailSender.cs`** — implementação **MailKit**. Monta `MimeMessage` com `BodyBuilder`
(`HtmlBody` + `TextBody` de fallback), conecta com `SecureSocketOptions.SslOnConnect` (porta 465),
autentica e envia. A renderização do HTML/texto fica em `PasswordResetEmailTemplate` (abaixo).

**`Email/PasswordResetEmailTemplate.cs`** — função pura `Build(string resetLink)` →
`(string html, string text)`. Sem I/O. Isso permite testá-la unitariamente (verificar que o link
aparece, que não há placeholders sobrando). Ver seção 5 (template).

### 3.2 Arquivos alterados

**`Auth/AuthModels.cs`** — novos records:

```csharp
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Email, string Code, string NewPassword);
```

**`Auth/AuthEndpoints.cs`** — dois endpoints novos no grupo `MapGroup("/api/auth")` (herda
rate limiting e `AllowAnonymous`):

- `POST /api/auth/forgot-password`
  - `FindByEmailAsync(email.Trim().ToLowerInvariant())`.
  - Se `user != null && user.IsActive`:
    - `token = await userManager.GeneratePasswordResetTokenAsync(user)`
    - `code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token))`
    - `link = $"{AppBaseUrl}/redefinir-senha?email={Uri.EscapeDataString(user.Email)}&code={code}"`
    - `await emailSender.SendPasswordResetAsync(user.Email, user.Name, link, ct)` dentro de
      `try/catch`; falha de SMTP é **logada** (ILogger + Sentry) mas **não** altera a resposta.
  - **Sempre** retorna `Results.Ok()` (sem corpo sensível). Sem gate de `EmailConfirmed`.
- `POST /api/auth/reset-password`
  - Valida `NewPassword` não vazia.
  - `FindByEmailAsync(...)`; se `null` → retorna `400` ProblemDetails genérico
    ("Não foi possível redefinir a senha.") para não vazar existência.
  - Decodifica: `token = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(req.Code))`.
    Decode inválido (FormatException) → `400` genérico.
  - `result = await userManager.ResetPasswordAsync(user, token, req.NewPassword)`.
    - Sucesso → revoga todos os refresh tokens do usuário (ver 3.3) e retorna `Results.Ok()`.
    - Falha → mapeia `result.Errors` para `400` ValidationProblem/ProblemDetails, reaproveitando
      o estilo do switch já existente em `change-password` (`AuthEndpoints.cs:191-201`).

**`Program.cs`**:
- `builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection("Email"));`
  com `.Get<EmailOptions>()` para validação fail-fast (espelha o padrão do `JwtOptions`,
  `Program.cs:64-68`). Em ambiente de teste, valores podem ficar vazios (fake sender).
- `builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();` (perto das linhas 70-71).
- Validade de 1h:
  `builder.Services.Configure<DataProtectionTokenProviderOptions>(o => o.TokenLifespan = TimeSpan.FromHours(1));`
  (afeta os default token providers; aceitável aqui).

**`PokerHub.Api.csproj`** — adicionar pacote `MailKit` (versão estável atual).

**`appsettings.json`** — seção `Email` com chaves vazias (placeholders; valores reais injetados):

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
}
```

**`appsettings.Development.json`** — `Email:User`, `Email:AppBaseUrl` (`http://localhost:5173`).
A **app password** vai em **user-secrets** (`UserSecretsId pokerhub-api-…`), nunca no git:
`dotnet user-secrets set "Email:Password" "<app-password>"`.

**Prod (Container App):** `Email__Password`, `Email__User`, `Email__AppBaseUrl` como env vars/secret.

### 3.3 Revogação de refresh tokens no reset

`RefreshTokenService` já existe e gerencia a tabela `RefreshTokens`. Adicionar (ou usar, se já
houver) um método `RevokeAllForUserAsync(Guid userId, CancellationToken)` que marca como revogados
todos os refresh tokens ativos do usuário. Chamado após `ResetPasswordAsync` bem-sucedido.
Se a verificação do código existente mostrar que esse método é trivial de adicionar, incluí-lo;
caso contrário, marcar como sub-tarefa explícita no plano.

---

## 4. Frontend — `web/`

### 4.1 Novos arquivos

- **`features/auth/forgot-password-form.tsx`** — `react-hook-form` + `zod` (email válido) +
  `useForgotPassword`. Após sucesso, exibe estado "verifique seu email" com mensagem **genérica**
  ("Se houver uma conta com esse email, enviamos um link para redefinir a senha.") — não confirma
  existência. Reaproveita `AuthLayout` e os componentes `ui/*` (Input, Button, Label).
- **`features/auth/reset-password-form.tsx`** — lê `email` e `code` via `useSearchParams`
  (padrão já usado em `login-form.tsx:29`). Campos: nova senha + confirmar senha com
  `zod.refine` de match (reaproveitado de `register-form.tsx:12-22`). `useResetPassword`.
  Sucesso → `toast` (sonner) + `navigate('/login')`. Se faltar `code`/`email` na URL, mostra
  estado de "link inválido ou expirado" com CTA para `/recuperar-senha`.
- **`routes/recuperar-senha.tsx`** e **`routes/redefinir-senha.tsx`** — clonam `routes/login.tsx`.
- **Hooks** em `lib/api/hooks/` (novo `use-auth.ts` ou estender `use-me.ts`):
  - `useForgotPassword` → `api('/auth/forgot-password', { method:'POST', body })`.
  - `useResetPassword` → `api('/auth/reset-password', { method:'POST', body })`.
  Erros de validação (`ProblemDetails`/`ValidationProblem`) já são tratados por
  `extractErrorMessage` em `lib/api/client.ts`.

### 4.2 Arquivos alterados

- **`App.tsx`** — registrar `/recuperar-senha` e `/redefinir-senha` sob `PublicOnly`.
- **`features/auth/login-form.tsx`** — adicionar `<Link to="/recuperar-senha">Esqueci minha senha</Link>`
  próximo ao link existente "Criar conta" (`login-form.tsx:98-103`).

---

## 5. Template de email (apresentável, identidade PokerHub)

Restrições de email: **HTML table-based**, **CSS 100% inline**, **sem CSS variables / oklch /
external CSS** (clientes de email não suportam). Sempre acompanhado de `TextBody` (fallback plaintext).

Estética (espelhando `auth-layout.tsx`): fundo "felt" escuro, container central tipo card,
badge dourado com ♠, wordmark **Poker**Hub (o "Hub" em dourado), botão CTA dourado, link de
fallback em texto, validade ("expira em 1 hora") e aviso de "se você não pediu, ignore".

Paleta (hex aproximados convertidos dos tokens oklch do app; finalizar na implementação):
- Fundo página: `#16140f`
- Card: `#211d16`
- Borda: `#3a3326`
- Texto principal: `#f3efe6`
- Texto secundário/muted: `#a89f8c`
- Dourado (gradiente badge/CTA): `#e0b23e` → `#b9842a`
- Texto sobre dourado: `#1f1c12`

Estrutura HTML (esqueleto):

```
<body bgcolor="#16140f">
  <table width=100% bgcolor="#16140f"><tr><td align=center>
    <table width=480>  <!-- card -->
      <tr><td>  badge ♠ + "PokerHub"  </td></tr>
      <tr><td>  <h1>Redefinir sua senha</h1>  </td></tr>
      <tr><td>  texto explicativo  </td></tr>
      <tr><td>  <a class=CTA href="{link}">Definir nova senha</a>  </td></tr>
      <tr><td>  "ou copie e cole: {link}"  </td></tr>
      <tr><td>  "Este link expira em 1 hora. Se você não solicitou, ignore este email."  </td></tr>
      <tr><td>  rodapé PokerHub  </td></tr>
    </table>
  </td></tr></table>
</body>
```

`PasswordResetEmailTemplate.Build(link)` retorna `(html, text)` — função pura, sem I/O,
testável unitariamente.

---

## 6. Segurança

- **Anti-enumeração:** `forgot-password` sempre `200`; `reset-password` retorna erro genérico para
  email inexistente; mensagens de sucesso no frontend não confirmam existência da conta.
- **Token:** DataProtection do Identity, 1h de validade, invalidado pelo security stamp após o reset.
- **Sessões:** revogar todos os refresh tokens no reset bem-sucedido.
- **Transporte:** link sempre HTTPS em prod; SMTP via SSL (465).
- **Logs:** nunca logar o token/`code` nem a senha. Falha de SMTP loga só metadados (destinatário, erro).
- **Rate limiting:** herdado do grupo `/api/auth` (`Program.cs:114-127`).
- **Segredos:** app password só em user-secrets (dev) / env var (prod); placeholders vazios no git.

---

## 7. Testes

### 7.1 Unitários (garantem que NÃO enviamos emails indevidos) — requisito explícito

`IEmailSender` é injetado, então usamos um **`FakeEmailSender`** que registra as chamadas
(`SentMessages`) sem tocar em SMTP. Casos:

- **forgot-password, email inexistente** → responde `200` **e** `FakeEmailSender` **não** registrou
  nenhum envio (nenhum email disparado para conta inexistente).
- **forgot-password, usuário inativo (`IsActive == false`)** → responde `200` **e** nenhum envio.
- **forgot-password, usuário válido e ativo** → responde `200`, **exatamente um** envio, para o
  email correto, e o `resetLink` contém `/redefinir-senha?email=…&code=…`.
- **forgot-password, falha de SMTP** (fake configurado para lançar) → ainda responde `200`
  (falha logada, não propagada).
- **Template** `PasswordResetEmailTemplate.Build(link)`: HTML e texto contêm o link; sem
  placeholders (`{`/`}`) remanescentes; texto menciona "1 hora".

### 7.2 Integração (`appsettings.Testing.json` + `IEmailSender` fake registrado no host de teste)

- `reset-password` com token válido → `200` e a senha realmente muda (login subsequente com a nova
  senha funciona; com a antiga, falha).
- `reset-password` com token inválido/adulterado → `400`.
- `reset-password` com `code` base64url malformado → `400` genérico (sem 500).
- `reset-password` bem-sucedido → refresh tokens anteriores do usuário ficam revogados
  (refresh subsequente com token antigo → `401`).

### 7.3 Manual (end-to-end real)

Com a app password do Fastmail em user-secrets: solicitar reset com um email real, confirmar
recebimento, abrir o link, redefinir e logar. (Depende do usuário fornecer a app password.)

---

## 8. Fora do escopo

- Confirmação de email no cadastro / fluxo de "confirmar conta".
- Reset de senha no app Blazor legado.
- Provider de token customizado / OTP de 6 dígitos.
- Notificação ao usuário de que a senha foi alterada (email de confirmação pós-reset) — pode ser
  follow-up futuro.

---

## 9. Superfície de arquivos (resumo)

**API (novos):** `Email/EmailOptions.cs`, `Email/IEmailSender.cs`, `Email/SmtpEmailSender.cs`,
`Email/PasswordResetEmailTemplate.cs`.
**API (alterados):** `Auth/AuthModels.cs`, `Auth/AuthEndpoints.cs`, `Program.cs`,
`PokerHub.Api.csproj`, `appsettings.json`, `appsettings.Development.json`,
(possível) `RefreshTokenService`.
**Testes:** `FakeEmailSender` + casos unitários/integração no projeto de testes existente.
**Web (novos):** `features/auth/forgot-password-form.tsx`, `features/auth/reset-password-form.tsx`,
`routes/recuperar-senha.tsx`, `routes/redefinir-senha.tsx`, hooks em `lib/api/hooks/`.
**Web (alterados):** `App.tsx`, `features/auth/login-form.tsx`.

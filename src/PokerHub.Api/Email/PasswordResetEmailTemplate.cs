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

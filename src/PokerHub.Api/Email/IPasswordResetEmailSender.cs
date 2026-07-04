namespace PokerHub.Api.Email;

/// <summary>
/// Envio do email de redefinição de senha. Abstraído para permitir um fake nos testes
/// (garantia de que nenhum email real é disparado em CI).
/// </summary>
public interface IPasswordResetEmailSender
{
    Task SendPasswordResetAsync(string toEmail, string? toName, string resetLink, CancellationToken ct = default);
}

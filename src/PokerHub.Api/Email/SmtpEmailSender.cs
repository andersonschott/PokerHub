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

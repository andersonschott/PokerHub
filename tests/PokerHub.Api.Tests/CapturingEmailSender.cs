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

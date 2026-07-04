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

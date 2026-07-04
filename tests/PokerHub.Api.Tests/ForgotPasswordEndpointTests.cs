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

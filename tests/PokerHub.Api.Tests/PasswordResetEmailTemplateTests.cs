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

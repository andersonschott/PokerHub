using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace PokerHub.Web.Controllers.Api;

[ApiController]
[Produces("application/json")]
public abstract class BaseApiController : ControllerBase
{
    protected string GetUserId()
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(id))
            throw new UnauthorizedAccessException("User not authenticated.");
        return id;
    }

    protected string GetUserName() =>
        User.FindFirstValue(ClaimTypes.Name) ?? string.Empty;

    protected string? GetUserEmail() =>
        User.FindFirstValue(ClaimTypes.Email);
}

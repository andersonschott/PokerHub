using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using PokerHub.Domain.Entities;
using PokerHub.Web.Services;

namespace PokerHub.Web.Controllers.Api;

[Route("api/auth")]
public class AuthController(
    UserManager<User> userManager,
    SignInManager<User> signInManager,
    JwtService jwtService) : BaseApiController
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest body)
    {
        var user = await userManager.FindByEmailAsync(body.Email);
        if (user is null || !user.IsActive)
            return Unauthorized(new { message = "Credenciais inválidas." });

        var result = await signInManager.CheckPasswordSignInAsync(user, body.Password, lockoutOnFailure: false);
        if (!result.Succeeded)
            return Unauthorized(new { message = "Credenciais inválidas." });

        return Ok(BuildTokenResponse(user));
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest body)
    {
        var existing = await userManager.FindByEmailAsync(body.Email);
        if (existing is not null)
            return Conflict(new { message = "E-mail já está em uso." });

        var user = new User
        {
            UserName = body.Email,
            Email = body.Email,
            Name = body.Name,
        };

        var result = await userManager.CreateAsync(user, body.Password);
        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description);
            return BadRequest(new { message = "Falha ao criar conta.", errors });
        }

        return Ok(BuildTokenResponse(user));
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest body)
    {
        var userId = jwtService.GetUserIdFromRefreshToken(body.RefreshToken);
        if (userId is null)
            return Unauthorized(new { message = "Refresh token inválido ou expirado." });

        var user = await userManager.FindByIdAsync(userId);
        if (user is null || !user.IsActive)
            return Unauthorized(new { message = "Usuário não encontrado." });

        jwtService.RevokeRefreshToken(body.RefreshToken);
        return Ok(BuildTokenResponse(user));
    }

    private TokenResponse BuildTokenResponse(User user)
    {
        var token = jwtService.GenerateAccessToken(user);
        var refreshToken = jwtService.GenerateRefreshToken(user.Id);
        return new TokenResponse(
            Token: token,
            RefreshToken: refreshToken,
            ExpiresAt: DateTime.UtcNow.AddMinutes(
                HttpContext.RequestServices
                    .GetRequiredService<IConfiguration>()
                    .GetValue<int>("Jwt:ExpirationMinutes", 480)),
            UserName: user.Name,
            Email: user.Email ?? string.Empty);
    }
}

public record LoginRequest(string Email, string Password);
public record RegisterRequest(string Name, string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record TokenResponse(
    string Token,
    string RefreshToken,
    DateTime ExpiresAt,
    string UserName,
    string Email);

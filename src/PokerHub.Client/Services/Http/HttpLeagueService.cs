using System.Net.Http.Json;
using PokerHub.Application.DTOs.League;
using PokerHub.Application.Interfaces;
using PokerHub.Domain.Enums;

namespace PokerHub.Client.Services.Http;

public class HttpLeagueService(HttpClient http) : ILeagueService
{
    public async Task<IReadOnlyList<LeagueDto>> GetLeaguesByUserAsync(string userId)
    {
        // A API /api/leagues já retorna organized + as player
        var result = await http.GetFromJsonAsync<List<LeagueDto>>("api/leagues");
        return result ?? [];
    }

    public async Task<IReadOnlyList<LeagueDto>> GetLeaguesAsPlayerAsync(string userId)
    {
        // Incluído no GetLeaguesByUserAsync via API
        return [];
    }

    public async Task<LeagueDto?> GetLeagueByIdAsync(Guid leagueId)
        => await http.GetFromJsonAsync<LeagueDto>($"api/leagues/{leagueId}");

    public async Task<LeagueWithPlayersDto?> GetLeagueWithPlayersAsync(Guid leagueId)
        => await http.GetFromJsonAsync<LeagueWithPlayersDto>($"api/leagues/{leagueId}/players");

    public async Task<LeagueDto?> GetLeagueByInviteCodeAsync(string inviteCode)
        => await http.GetFromJsonAsync<LeagueDto>($"api/leagues/invite/{inviteCode}");

    public async Task<LeagueDto> CreateLeagueAsync(string organizerId, CreateLeagueDto dto)
    {
        var response = await http.PostAsJsonAsync("api/leagues", dto);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<LeagueDto>())!;
    }

    public async Task<LeagueDto?> UpdateLeagueAsync(Guid leagueId, UpdateLeagueDto dto)
    {
        var response = await http.PutAsJsonAsync($"api/leagues/{leagueId}", dto);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<LeagueDto>();
    }

    public async Task<string> RegenerateInviteCodeAsync(Guid leagueId)
    {
        var response = await http.PostAsync($"api/leagues/{leagueId}/invite-code/regenerate", null);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<InviteCodeResponse>();
        return result?.InviteCode ?? string.Empty;
    }

    public async Task<bool> DeleteLeagueAsync(Guid leagueId)
    {
        var response = await http.DeleteAsync($"api/leagues/{leagueId}");
        return response.IsSuccessStatusCode;
    }

    public async Task<bool> IsUserOrganizerAsync(Guid leagueId, string userId)
    {
        var league = await GetLeagueByIdAsync(leagueId);
        return league?.OrganizerId == userId;
    }

    public async Task<bool> CanUserAccessLeagueAsync(Guid leagueId, string userId)
    {
        var league = await GetLeagueByIdAsync(leagueId);
        return league is not null;
    }

    public async Task<(bool Success, string Message)> JoinLeagueAsync(
        Guid leagueId, string userId, string userName, string? userEmail,
        string? nickname = null, string? phone = null, string? pixKey = null, PixKeyType? pixKeyType = null)
    {
        var response = await http.PostAsJsonAsync($"api/leagues/join/{leagueId}",
            new { Nickname = nickname, Phone = phone, PixKey = pixKey, PixKeyType = pixKeyType });
        if (response.IsSuccessStatusCode) return (true, "Entrou na liga com sucesso.");
        var err = await response.Content.ReadFromJsonAsync<MessageResponse>();
        return (false, err?.Message ?? "Erro ao entrar na liga.");
    }

    public async Task<(bool Success, string Message)> LeaveLeagueAsync(Guid leagueId, string userId)
    {
        var response = await http.DeleteAsync($"api/leagues/{leagueId}/leave");
        if (response.IsSuccessStatusCode) return (true, "Saiu da liga.");
        var err = await response.Content.ReadFromJsonAsync<MessageResponse>();
        return (false, err?.Message ?? "Erro ao sair da liga.");
    }

    private record InviteCodeResponse(string InviteCode);
    private record MessageResponse(string Message);
}

using System.Net.Http.Json;
using PokerHub.Application.DTOs.Tournament;
using PokerHub.Application.Interfaces;
using PokerHub.Domain.Enums;

namespace PokerHub.Client.Services.Http;

public class HttpTournamentService(HttpClient http) : ITournamentService
{
    public async Task<IReadOnlyList<TournamentDto>> GetTournamentsByLeagueAsync(Guid leagueId)
        => await http.GetFromJsonAsync<List<TournamentDto>>($"api/leagues/{leagueId}/tournaments") ?? [];

    public async Task<IReadOnlyList<TournamentDto>> GetTournamentsByUserAsync(string userId)
        => await http.GetFromJsonAsync<List<TournamentDto>>("api/tournaments") ?? [];

    public async Task<TournamentDto?> GetTournamentByIdAsync(Guid tournamentId)
        => await http.GetFromJsonAsync<TournamentDto>($"api/tournaments/{tournamentId}");

    public async Task<TournamentDetailDto?> GetTournamentDetailAsync(Guid tournamentId)
        => await http.GetFromJsonAsync<TournamentDetailDto>($"api/tournaments/{tournamentId}/detail");

    public async Task<TournamentDto> CreateTournamentAsync(Guid leagueId, CreateTournamentDto dto)
    {
        var response = await http.PostAsJsonAsync($"api/leagues/{leagueId}/tournaments", dto);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<TournamentDto>())!;
    }

    public async Task<bool> UpdateTournamentAsync(Guid tournamentId, CreateTournamentDto dto)
    {
        var response = await http.PutAsJsonAsync($"api/tournaments/{tournamentId}", dto);
        return response.IsSuccessStatusCode;
    }

    public async Task<bool> DeleteTournamentAsync(Guid tournamentId)
        => (await http.DeleteAsync($"api/tournaments/{tournamentId}")).IsSuccessStatusCode;

    public async Task<bool> StartTournamentAsync(Guid tournamentId)
        => (await http.PostAsync($"api/tournaments/{tournamentId}/start", null)).IsSuccessStatusCode;

    public async Task<bool> PauseTournamentAsync(Guid tournamentId)
        => (await http.PostAsync($"api/tournaments/{tournamentId}/pause", null)).IsSuccessStatusCode;

    public async Task<bool> ResumeTournamentAsync(Guid tournamentId)
        => (await http.PostAsync($"api/tournaments/{tournamentId}/resume", null)).IsSuccessStatusCode;

    public async Task<(bool Success, string Message)> FinishTournamentAsync(Guid tournamentId, IList<(Guid playerId, int position)> positions)
    {
        var body = new { Positions = positions.Select(p => new { PlayerId = p.playerId, Position = p.position }).ToList() };
        var response = await http.PostAsJsonAsync($"api/tournaments/{tournamentId}/finish", body);
        if (response.IsSuccessStatusCode) return (true, "Torneio finalizado.");
        var err = await response.Content.ReadFromJsonAsync<MessageResponse>();
        return (false, err?.Message ?? "Erro ao finalizar torneio.");
    }

    public async Task<(bool Success, string Message)> FinishTournamentWithCustomPrizesAsync(Guid tournamentId, ConfirmedPrizeDistributionDto distribution)
    {
        var response = await http.PostAsJsonAsync($"api/tournaments/{tournamentId}/finish-custom", distribution);
        if (response.IsSuccessStatusCode) return (true, "Torneio finalizado.");
        var err = await response.Content.ReadFromJsonAsync<MessageResponse>();
        return (false, err?.Message ?? "Erro ao finalizar torneio.");
    }

    public async Task<bool> CancelTournamentAsync(Guid tournamentId)
        => (await http.PostAsync($"api/tournaments/{tournamentId}/cancel", null)).IsSuccessStatusCode;

    public async Task<bool> AddPlayerToTournamentAsync(Guid tournamentId, Guid playerId)
        => (await http.PostAsync($"api/tournaments/{tournamentId}/players/{playerId}", null)).IsSuccessStatusCode;

    public async Task<bool> RemovePlayerFromTournamentAsync(Guid tournamentId, Guid playerId)
        => (await http.DeleteAsync($"api/tournaments/{tournamentId}/players/{playerId}")).IsSuccessStatusCode;

    public async Task<bool> CheckInPlayerAsync(Guid tournamentId, Guid playerId)
        => (await http.PostAsync($"api/tournaments/{tournamentId}/check-in/{playerId}", null)).IsSuccessStatusCode;

    public async Task<bool> CheckOutPlayerAsync(Guid tournamentId, Guid playerId)
        => (await http.PostAsync($"api/tournaments/{tournamentId}/check-out/{playerId}", null)).IsSuccessStatusCode;

    public async Task<bool> AddRebuyAsync(Guid tournamentId, Guid playerId)
        => (await http.PostAsync($"api/tournaments/{tournamentId}/rebuy/{playerId}", null)).IsSuccessStatusCode;

    public async Task<bool> RemoveRebuyAsync(Guid tournamentId, Guid playerId)
        => (await http.DeleteAsync($"api/tournaments/{tournamentId}/rebuy/{playerId}")).IsSuccessStatusCode;

    public async Task<bool> SetAddonAsync(Guid tournamentId, Guid playerId, bool hasAddon)
    {
        var response = await http.PostAsJsonAsync($"api/tournaments/{tournamentId}/addon/{playerId}", new { HasAddon = hasAddon });
        return response.IsSuccessStatusCode;
    }

    public async Task<bool> IsRebuyAllowedAsync(Guid tournamentId)
    {
        var detail = await GetTournamentDetailAsync(tournamentId);
        return detail?.Status == TournamentStatus.InProgress;
    }

    public async Task<(bool Success, string Message)> EliminatePlayerAsync(Guid tournamentId, Guid playerId, Guid? eliminatedByPlayerId, int? position = null)
    {
        var response = await http.PostAsJsonAsync($"api/tournaments/{tournamentId}/eliminate/{playerId}",
            new { EliminatedByPlayerId = eliminatedByPlayerId, Position = position });
        if (response.IsSuccessStatusCode) return (true, "Jogador eliminado.");
        var err = await response.Content.ReadFromJsonAsync<MessageResponse>();
        return (false, err?.Message ?? "Erro.");
    }

    public async Task<bool> RestoreEliminatedPlayerAsync(Guid tournamentId, Guid playerId)
        => (await http.PostAsync($"api/tournaments/{tournamentId}/restore/{playerId}", null)).IsSuccessStatusCode;

    public async Task<TimerStateDto?> GetTimerStateAsync(Guid tournamentId)
        => await http.GetFromJsonAsync<TimerStateDto>($"api/tournaments/{tournamentId}/timer-state");

    public async Task<bool> AdvanceToNextLevelAsync(Guid tournamentId)
        => (await http.PostAsync($"api/tournaments/{tournamentId}/advance-level", null)).IsSuccessStatusCode;

    public async Task<bool> GoToPreviousLevelAsync(Guid tournamentId)
        => (await http.PostAsync($"api/tournaments/{tournamentId}/previous-level", null)).IsSuccessStatusCode;

    public Task<bool> UpdateTimeRemainingAsync(Guid tournamentId, int secondsRemaining)
        => Task.FromResult(false); // Timer is server-side via SignalR

    public IReadOnlyList<CreateBlindLevelDto> GetTurboBlindTemplate() => [];
    public IReadOnlyList<CreateBlindLevelDto> GetRegularBlindTemplate() => [];
    public IReadOnlyList<CreateBlindLevelDto> GetDeepStackBlindTemplate() => [];

    public async Task<bool> CanUserManageTournamentAsync(Guid tournamentId, string userId)
    {
        var detail = await GetTournamentDetailAsync(tournamentId);
        return detail is not null;
    }

    public async Task<bool> IsUserOrganizerOrDelegateAsync(Guid tournamentId, string userId)
        => await CanUserManageTournamentAsync(tournamentId, userId);

    public async Task<TournamentDto?> DuplicateTournamentAsync(Guid sourceTournamentId, Guid leagueId)
    {
        var response = await http.PostAsJsonAsync($"api/tournaments/{sourceTournamentId}/duplicate", new { LeagueId = leagueId });
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<TournamentDto>();
    }

    public async Task<TournamentDto?> GetTournamentByInviteCodeAsync(string inviteCode)
        => await http.GetFromJsonAsync<TournamentDto>($"api/tournaments/invite/{inviteCode}");

    public async Task<(bool Success, string Message)> SelfRegisterPlayerAsync(Guid tournamentId, string userId)
    {
        var response = await http.PostAsync($"api/tournaments/{tournamentId}/self-register", null);
        if (response.IsSuccessStatusCode) return (true, "Inscrito com sucesso.");
        var err = await response.Content.ReadFromJsonAsync<MessageResponse>();
        return (false, err?.Message ?? "Erro ao se inscrever.");
    }

    public async Task<bool> SelfUnregisterPlayerAsync(Guid tournamentId, string userId)
        => (await http.DeleteAsync($"api/tournaments/{tournamentId}/self-register")).IsSuccessStatusCode;

    public async Task<string?> RegenerateTournamentInviteCodeAsync(Guid tournamentId)
    {
        var response = await http.PostAsync($"api/tournaments/{tournamentId}/invite-code/regenerate", null);
        if (!response.IsSuccessStatusCode) return null;
        var result = await response.Content.ReadFromJsonAsync<InviteCodeResponse>();
        return result?.InviteCode;
    }

    public async Task<bool> IsUserRegisteredInTournamentAsync(Guid tournamentId, string userId)
    {
        var detail = await GetTournamentDetailAsync(tournamentId);
        return detail?.Players.Any(p => p.IsCheckedIn) ?? false;
    }

    public async Task<bool> AddDelegateAsync(Guid tournamentId, string userId, string assignedBy, DelegatePermissions permissions = DelegatePermissions.All)
    {
        var response = await http.PostAsJsonAsync($"api/tournaments/{tournamentId}/delegates",
            new { UserId = userId, Permissions = permissions });
        return response.IsSuccessStatusCode;
    }

    public async Task<bool> RemoveDelegateAsync(Guid tournamentId, string userId)
        => (await http.DeleteAsync($"api/tournaments/{tournamentId}/delegates/{userId}")).IsSuccessStatusCode;

    public async Task<IReadOnlyList<TournamentDelegateDto>> GetDelegatesAsync(Guid tournamentId)
        => await http.GetFromJsonAsync<List<TournamentDelegateDto>>($"api/tournaments/{tournamentId}/delegates") ?? [];

    public async Task<int> BulkCheckInAsync(Guid tournamentId, IList<Guid> playerIds)
    {
        var response = await http.PostAsJsonAsync($"api/tournaments/{tournamentId}/bulk-check-in", new { PlayerIds = playerIds });
        if (!response.IsSuccessStatusCode) return 0;
        var result = await response.Content.ReadFromJsonAsync<BulkResult>();
        return result?.CheckedIn ?? 0;
    }

    private record MessageResponse(string Message);
    private record InviteCodeResponse(string InviteCode);
    private record BulkResult(int CheckedIn);
}

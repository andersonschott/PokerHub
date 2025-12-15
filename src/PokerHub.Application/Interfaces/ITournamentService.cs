using PokerHub.Application.DTOs.Tournament;

namespace PokerHub.Application.Interfaces;

public interface ITournamentService
{
    Task<IReadOnlyList<TournamentDto>> GetTournamentsByLeagueAsync(Guid leagueId);
    Task<IReadOnlyList<TournamentDto>> GetTournamentsByUserAsync(string userId);
    Task<TournamentDto?> GetTournamentByIdAsync(Guid tournamentId);
    Task<TournamentDetailDto?> GetTournamentDetailAsync(Guid tournamentId);
    Task<TournamentDto> CreateTournamentAsync(Guid leagueId, CreateTournamentDto dto);
    Task<bool> UpdateTournamentAsync(Guid tournamentId, CreateTournamentDto dto);
    Task<bool> DeleteTournamentAsync(Guid tournamentId);

    // Tournament Status Management
    Task<bool> StartTournamentAsync(Guid tournamentId);
    Task<bool> PauseTournamentAsync(Guid tournamentId);
    Task<bool> ResumeTournamentAsync(Guid tournamentId);
    Task<bool> FinishTournamentAsync(Guid tournamentId, IList<(Guid playerId, int position)> positions);
    Task<bool> CancelTournamentAsync(Guid tournamentId);

    // Player Management
    Task<bool> AddPlayerToTournamentAsync(Guid tournamentId, Guid playerId);
    Task<bool> RemovePlayerFromTournamentAsync(Guid tournamentId, Guid playerId);
    Task<bool> CheckInPlayerAsync(Guid tournamentId, Guid playerId);
    Task<bool> CheckOutPlayerAsync(Guid tournamentId, Guid playerId);

    // Rebuy/Addon Management
    Task<bool> AddRebuyAsync(Guid tournamentId, Guid playerId);
    Task<bool> RemoveRebuyAsync(Guid tournamentId, Guid playerId);
    Task<bool> SetAddonAsync(Guid tournamentId, Guid playerId, bool hasAddon);
    Task<bool> IsRebuyAllowedAsync(Guid tournamentId);

    // Elimination
    Task<bool> EliminatePlayerAsync(Guid tournamentId, Guid playerId, Guid? eliminatedByPlayerId, int? position = null);

    // Timer State
    Task<TimerStateDto?> GetTimerStateAsync(Guid tournamentId);
    Task<bool> AdvanceToNextLevelAsync(Guid tournamentId);
    Task<bool> UpdateTimeRemainingAsync(Guid tournamentId, int secondsRemaining);

    // Blind Templates
    IReadOnlyList<CreateBlindLevelDto> GetTurboBlindTemplate();
    IReadOnlyList<CreateBlindLevelDto> GetRegularBlindTemplate();
    IReadOnlyList<CreateBlindLevelDto> GetDeepStackBlindTemplate();
}

using PokerHub.Domain.Enums;

namespace PokerHub.Application.DTOs.Tournament;

public record TournamentDelegateDto(
    Guid Id,
    Guid TournamentId,
    string UserId,
    string UserName,
    DelegatePermissions Permissions,
    DateTime AssignedAt);

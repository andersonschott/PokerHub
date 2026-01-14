namespace PokerHub.Application.DTOs.Tournament;

/// <summary>
/// Representa um jogador com sua posição e prêmio para confirmação
/// </summary>
public record PlayerPositionForPrizeDto(
    Guid PlayerId,
    string PlayerName,
    int Position,
    decimal Prize
);

/// <summary>
/// Distribuição de prêmios confirmada pelo usuário antes de finalizar o torneio
/// </summary>
public record ConfirmedPrizeDistributionDto(
    IReadOnlyList<PlayerPositionForPrizeDto> PlayerPrizes,
    decimal JackpotContribution
);

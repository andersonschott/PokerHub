namespace PokerHub.Application.DTOs.Tournament;

/// <summary>
/// Prêmio calculado por posição, derivado pela engine única de premiação
/// (<see cref="PokerHub.Application.Interfaces.IPrizeTableService.CalculatePrizeDistributionAsync"/>),
/// a MESMA usada na finalização do torneio. Apenas exposição: nenhuma regra de dinheiro vive aqui.
/// <paramref name="Percentage"/> é uma derivação de exibição (Amount / PrizePool * 100).
/// </summary>
public record TournamentPrizeDto(
    int Position,
    decimal Amount,
    decimal Percentage
);

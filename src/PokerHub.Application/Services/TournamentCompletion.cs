using Microsoft.EntityFrameworkCore;
using PokerHub.Application.DTOs.Tournament;
using PokerHub.Application.Exceptions;
using PokerHub.Domain.Entities;
using PokerHub.Domain.Enums;

namespace PokerHub.Application.Services;

public partial class TournamentService
{
    private static void EnsureTournamentOpen(Tournament tournament)
    {
        if (tournament.Status is TournamentStatus.Finished or TournamentStatus.Cancelled)
            throw new BusinessRuleException("Este torneio está encerrado. Seus resultados e valores estão protegidos.");
    }

    private static void ValidateConfiguration(CreateTournamentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || dto.BuyIn < 0 || Math.Round(dto.BuyIn, 2) != dto.BuyIn || dto.StartingStack <= 0
            || dto.RebuyValue < 0 || dto.AddonValue < 0 || dto.RebuyLimitLevel < 0 || dto.RebuyLimitMinutes < 0 || dto.AllowCheckInUntilLevel < 0
            || (dto.RebuyValue.HasValue && Math.Round(dto.RebuyValue.Value, 2) != dto.RebuyValue)
            || (dto.AddonValue.HasValue && Math.Round(dto.AddonValue.Value, 2) != dto.AddonValue)
            || !Enum.IsDefined(dto.RebuyLimitType))
            throw new BusinessRuleException("Confira nome, valores, fichas e limites do torneio.");
        _ = PrizeCalculation.Parse(dto.PrizeStructure, dto.PrizeDistributionType);
        if (dto.BlindLevels.Count == 0 || !dto.BlindLevels.Select(b => b.Order).Order().SequenceEqual(Enumerable.Range(1, dto.BlindLevels.Count))
            || dto.BlindLevels.Any(b => b.DurationMinutes <= 0 || b.SmallBlind < 0 || b.BigBlind < 0 || b.Ante < 0))
            throw new BusinessRuleException("Os níveis devem ter duração positiva, blinds não negativos e uma sequência sem repetições.");
    }

    private async Task<(bool Success, string Message)> CompleteTournamentAsync(Guid tournamentId,
        IList<(Guid playerId, int position)> positions, ConfirmedPrizeDistributionDto? custom)
    {
        try
        {
            return await MutationScope.RunAsync(_context, tournamentId, "Torneio encerrado", async () =>
            {
                var tournament = await _context.Tournaments.Include(t => t.Players).Include(t => t.League)
                    .FirstOrDefaultAsync(t => t.Id == tournamentId);
                if (tournament == null) return (false, "Torneio não encontrado.");
                EnsureTournamentOpen(tournament);
                if (tournament.Status is not (TournamentStatus.InProgress or TournamentStatus.Paused))
                    return (false, "Torneio não está em andamento.");
                var participants = tournament.Players.Where(p => p.IsCheckedIn).ToList();
                var participantIds = participants.Select(p => p.PlayerId).ToHashSet();
                if (participants.Count == 0 || positions.Count != participants.Count
                    || positions.Select(p => p.playerId).Distinct().Count() != participants.Count
                    || positions.Any(p => !participantIds.Contains(p.playerId))
                    || !positions.Select(p => p.position).Order().SequenceEqual(Enumerable.Range(1, participants.Count)))
                    throw new BusinessRuleException("Informe cada participante com check-in uma única vez, com posições de 1 até o total de jogadores, sem repetições.");

                var pool = CalculatePrizePool(tournament);
                Dictionary<int, decimal> prizes;
                decimal jackpot;
                if (custom != null)
                {
                    prizes = custom.PlayerPrizes.ToDictionary(p => p.Position, p => p.Prize);
                    jackpot = custom.JackpotContribution;
                }
                else
                {
                    var distribution = await _prizeTableService.CalculatePrizeDistributionAsync(
                        tournament.LeagueId, pool, tournament.PrizeStructure, tournament.UsePrizeTable, tournament.PrizeDistributionType);
                    prizes = distribution.Allocations.ToDictionary(p => p.Position, p => p.Amount);
                    jackpot = distribution.JackpotContribution;
                }
                if (prizes.Any(p => p.Value > 0 && p.Key > participants.Count))
                    throw new BusinessRuleException("Há prêmios para mais posições do que participantes. Ajuste a premiação antes de encerrar.");
                PrizeCalculation.ValidateTotal(pool, jackpot, prizes.Select(p => (p.Key, p.Value)));
                foreach (var player in tournament.Players)
                {
                    var standing = positions.FirstOrDefault(p => p.playerId == player.PlayerId);
                    player.Position = player.IsCheckedIn ? standing.position : null;
                    player.Prize = player.IsCheckedIn ? prizes.GetValueOrDefault(standing.position) : 0;
                }
                tournament.Status = TournamentStatus.Finished;
                tournament.FinishedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                if (jackpot > 0) await _jackpotService.RecordContributionAsync(tournamentId, jackpot);
                return (true, "Torneio finalizado com sucesso!");
            });
        }
        catch (BusinessRuleException ex) { return (false, ex.Message); }
    }
}

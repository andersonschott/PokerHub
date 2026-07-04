namespace PokerHub.Domain.Enums;

/// <summary>
/// Status de participação do jogador na liga, independente do soft-delete (<see cref="Entities.Player.IsActive"/>).
/// Active = participa/aparece nas listas de seleção. Inactive = parado (manual ou por política de tempo);
/// some das listas de seleção mas continua no histórico/ranking e pode ser reativado.
/// </summary>
public enum PlayerMembershipStatus
{
    Active = 0,
    Inactive = 1,
}

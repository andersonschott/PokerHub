using PokerHub.Domain.Enums;

namespace PokerHub.Application.DTOs.Me;

public record MyContactDto(string? PixKey, PixKeyType? PixKeyType, string? Phone);

public record UpdateMyContactDto(string? PixKey, PixKeyType? PixKeyType, string? Phone);

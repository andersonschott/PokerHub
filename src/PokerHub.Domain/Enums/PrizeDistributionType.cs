namespace PokerHub.Domain.Enums;

public enum PrizeDistributionType
{
    Percentage = 0, // Distribution based on percentages (e.g., "50,30,20")
    Fixed = 1       // Distribution based on fixed values per position (e.g., "300,180,120")
}

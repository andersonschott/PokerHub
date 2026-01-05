using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data.Configurations;

public class PlayerSeasonStatsConfiguration : IEntityTypeConfiguration<PlayerSeasonStats>
{
    public void Configure(EntityTypeBuilder<PlayerSeasonStats> builder)
    {
        builder.HasKey(pss => pss.Id);

        builder.Property(pss => pss.GamesPlayed)
            .IsRequired();

        builder.Property(pss => pss.FirstPlaces)
            .IsRequired();

        builder.Property(pss => pss.SecondPlaces)
            .IsRequired();

        builder.Property(pss => pss.ThirdPlaces)
            .IsRequired();

        builder.Property(pss => pss.TotalCost)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(pss => pss.TotalPrize)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(pss => pss.Balance)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(pss => pss.FinalPosition)
            .IsRequired();

        builder.Property(pss => pss.CreatedAt)
            .IsRequired();

        builder.HasOne(pss => pss.Season)
            .WithMany(s => s.PlayerStats)
            .HasForeignKey(pss => pss.SeasonId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pss => pss.Player)
            .WithMany(p => p.SeasonStats)
            .HasForeignKey(pss => pss.PlayerId)
            .OnDelete(DeleteBehavior.Restrict);

        // Unique constraint: one stats record per player per season
        builder.HasIndex(pss => new { pss.SeasonId, pss.PlayerId })
            .IsUnique();
    }
}

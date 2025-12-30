using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data.Configurations;

public class LeaguePrizeTableConfiguration : IEntityTypeConfiguration<LeaguePrizeTable>
{
    public void Configure(EntityTypeBuilder<LeaguePrizeTable> builder)
    {
        builder.HasKey(pt => pt.Id);

        builder.Property(pt => pt.Name)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(pt => pt.PrizePoolTotal)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(pt => pt.JackpotAmount)
            .HasPrecision(18, 2)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(pt => pt.CreatedAt)
            .IsRequired();

        builder.HasOne(pt => pt.League)
            .WithMany(l => l.PrizeTables)
            .HasForeignKey(pt => pt.LeagueId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(pt => pt.Entries)
            .WithOne(e => e.LeaguePrizeTable)
            .HasForeignKey(e => e.LeaguePrizeTableId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(pt => new { pt.LeagueId, pt.PrizePoolTotal });
    }
}

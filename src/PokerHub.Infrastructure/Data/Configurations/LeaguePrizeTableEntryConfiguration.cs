using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data.Configurations;

public class LeaguePrizeTableEntryConfiguration : IEntityTypeConfiguration<LeaguePrizeTableEntry>
{
    public void Configure(EntityTypeBuilder<LeaguePrizeTableEntry> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Position)
            .IsRequired();

        builder.Property(e => e.PrizeAmount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.HasIndex(e => new { e.LeaguePrizeTableId, e.Position })
            .IsUnique();
    }
}

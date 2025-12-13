using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data.Configurations;

public class BlindLevelConfiguration : IEntityTypeConfiguration<BlindLevel>
{
    public void Configure(EntityTypeBuilder<BlindLevel> builder)
    {
        builder.HasKey(bl => bl.Id);

        builder.Property(bl => bl.BreakDescription)
            .HasMaxLength(200);

        builder.HasIndex(bl => new { bl.TournamentId, bl.Order })
            .IsUnique();
    }
}

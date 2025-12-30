using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data.Configurations;

public class JackpotUsageConfiguration : IEntityTypeConfiguration<JackpotUsage>
{
    public void Configure(EntityTypeBuilder<JackpotUsage> builder)
    {
        builder.HasKey(ju => ju.Id);

        builder.Property(ju => ju.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(ju => ju.Description)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(ju => ju.BalanceBefore)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(ju => ju.BalanceAfter)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(ju => ju.CreatedAt)
            .IsRequired();

        builder.HasOne(ju => ju.League)
            .WithMany(l => l.JackpotUsages)
            .HasForeignKey(ju => ju.LeagueId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

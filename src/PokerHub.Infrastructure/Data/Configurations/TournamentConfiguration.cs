using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data.Configurations;

public class TournamentConfiguration : IEntityTypeConfiguration<Tournament>
{
    public void Configure(EntityTypeBuilder<Tournament> builder)
    {
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(t => t.Location)
            .HasMaxLength(500);

        builder.Property(t => t.BuyIn)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(t => t.RebuyValue)
            .HasPrecision(18, 2);

        builder.Property(t => t.AddonValue)
            .HasPrecision(18, 2);

        builder.Property(t => t.PrizeStructure)
            .HasMaxLength(500);

        builder.Property(t => t.CreatedAt)
            .IsRequired();

        builder.HasMany(t => t.BlindLevels)
            .WithOne(bl => bl.Tournament)
            .HasForeignKey(bl => bl.TournamentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(t => t.Players)
            .WithOne(tp => tp.Tournament)
            .HasForeignKey(tp => tp.TournamentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(t => t.Payments)
            .WithOne(p => p.Tournament)
            .HasForeignKey(p => p.TournamentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

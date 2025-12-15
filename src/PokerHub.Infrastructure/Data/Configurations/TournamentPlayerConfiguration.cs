using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data.Configurations;

public class TournamentPlayerConfiguration : IEntityTypeConfiguration<TournamentPlayer>
{
    public void Configure(EntityTypeBuilder<TournamentPlayer> builder)
    {
        builder.HasKey(tp => tp.Id);

        builder.Property(tp => tp.Prize)
            .HasPrecision(18, 2);

        builder.HasIndex(tp => new { tp.TournamentId, tp.PlayerId })
            .IsUnique();

        // Configure Tournament relationship - cascade delete when tournament is deleted
        builder.HasOne(tp => tp.Tournament)
            .WithMany(t => t.Players)
            .HasForeignKey(tp => tp.TournamentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure Player relationship - restrict to avoid cascade cycles
        builder.HasOne(tp => tp.Player)
            .WithMany(p => p.Participations)
            .HasForeignKey(tp => tp.PlayerId)
            .OnDelete(DeleteBehavior.Restrict);

        // Configure EliminatedBy relationship - NO ACTION to avoid cascade cycles
        builder.HasOne(tp => tp.EliminatedByPlayer)
            .WithMany()
            .HasForeignKey(tp => tp.EliminatedByPlayerId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}

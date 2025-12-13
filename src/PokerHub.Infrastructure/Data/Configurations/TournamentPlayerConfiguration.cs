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

        builder.HasOne(tp => tp.EliminatedByPlayer)
            .WithMany()
            .HasForeignKey(tp => tp.EliminatedByPlayerId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

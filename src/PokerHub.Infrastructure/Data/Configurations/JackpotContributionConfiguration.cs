using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data.Configurations;

public class JackpotContributionConfiguration : IEntityTypeConfiguration<JackpotContribution>
{
    public void Configure(EntityTypeBuilder<JackpotContribution> builder)
    {
        builder.HasKey(jc => jc.Id);

        builder.Property(jc => jc.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(jc => jc.TournamentPrizePool)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(jc => jc.PercentageApplied)
            .HasPrecision(5, 2)
            .IsRequired();

        builder.Property(jc => jc.Description)
            .HasMaxLength(500);

        builder.Property(jc => jc.CreatedAt)
            .IsRequired();

        builder.HasOne(jc => jc.League)
            .WithMany(l => l.JackpotContributions)
            .HasForeignKey(jc => jc.LeagueId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(jc => jc.Tournament)
            .WithMany()
            .HasForeignKey(jc => jc.TournamentId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.NoAction);

        // Uma contribuição por torneio; entradas manuais (TournamentId NULL) ficam fora do índice.
        builder.HasIndex(jc => jc.TournamentId)
            .IsUnique()
            .HasFilter("[TournamentId] IS NOT NULL");
    }
}

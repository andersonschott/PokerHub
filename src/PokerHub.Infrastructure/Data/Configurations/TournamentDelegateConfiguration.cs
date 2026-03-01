using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data.Configurations;

public class TournamentDelegateConfiguration : IEntityTypeConfiguration<TournamentDelegate>
{
    public void Configure(EntityTypeBuilder<TournamentDelegate> builder)
    {
        builder.HasKey(td => td.Id);

        builder.Property(td => td.UserId)
            .HasMaxLength(450) // ASP.NET Identity default key size
            .IsRequired();

        builder.Property(td => td.AssignedBy)
            .HasMaxLength(450)
            .IsRequired();

        builder.Property(td => td.AssignedAt)
            .IsRequired();

        // Store the [Flags] enum as int to preserve bit combinations
        builder.Property(td => td.Permissions)
            .HasConversion<int>()
            .IsRequired();

        // Unique constraint: a user can only be a delegate once per tournament
        builder.HasIndex(td => new { td.TournamentId, td.UserId })
            .IsUnique();

        // Tournament relationship - cascade delete when tournament is deleted
        builder.HasOne(td => td.Tournament)
            .WithMany(t => t.Delegates)
            .HasForeignKey(td => td.TournamentId)
            .OnDelete(DeleteBehavior.Cascade);

        // User relationship - restrict to avoid accidental data loss
        builder.HasOne(td => td.User)
            .WithMany()
            .HasForeignKey(td => td.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data.Configurations;

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(p => p.CreatedAt)
            .IsRequired();

        // Configure Tournament relationship - cascade delete when tournament is deleted
        builder.HasOne(p => p.Tournament)
            .WithMany(t => t.Payments)
            .HasForeignKey(p => p.TournamentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure FromPlayer relationship - restrict to avoid cascade cycles
        builder.HasOne(p => p.FromPlayer)
            .WithMany(pl => pl.PaymentsMade)
            .HasForeignKey(p => p.FromPlayerId)
            .OnDelete(DeleteBehavior.Restrict);

        // Configure ToPlayer relationship - restrict to avoid cascade cycles
        // ToPlayerId is nullable for jackpot payments where there's no specific recipient
        builder.HasOne(p => p.ToPlayer)
            .WithMany(pl => pl.PaymentsReceived)
            .HasForeignKey(p => p.ToPlayerId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        // Description field for special payments (e.g., "Caixinha")
        builder.Property(p => p.Description)
            .HasMaxLength(200);
    }
}

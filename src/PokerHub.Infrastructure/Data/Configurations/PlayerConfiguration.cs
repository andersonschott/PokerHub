using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data.Configurations;

public class PlayerConfiguration : IEntityTypeConfiguration<Player>
{
    public void Configure(EntityTypeBuilder<Player> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(p => p.Nickname)
            .HasMaxLength(100);

        builder.Property(p => p.Email)
            .HasMaxLength(256);

        builder.Property(p => p.Phone)
            .HasMaxLength(20);

        builder.Property(p => p.PixKey)
            .HasMaxLength(256);

        builder.Property(p => p.CreatedAt)
            .IsRequired();

        builder.Property(p => p.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        // Note: Player -> Participations relationship is configured in TournamentPlayerConfiguration
        // with RESTRICT to avoid multiple cascade paths through League

        builder.HasMany(p => p.PaymentsMade)
            .WithOne(pay => pay.FromPlayer)
            .HasForeignKey(pay => pay.FromPlayerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(p => p.PaymentsReceived)
            .WithOne(pay => pay.ToPlayer)
            .HasForeignKey(pay => pay.ToPlayerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

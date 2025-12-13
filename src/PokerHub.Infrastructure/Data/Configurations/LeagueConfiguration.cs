using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data.Configurations;

public class LeagueConfiguration : IEntityTypeConfiguration<League>
{
    public void Configure(EntityTypeBuilder<League> builder)
    {
        builder.HasKey(l => l.Id);

        builder.Property(l => l.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(l => l.Description)
            .HasMaxLength(1000);

        builder.Property(l => l.InviteCode)
            .HasMaxLength(20)
            .IsRequired();

        builder.HasIndex(l => l.InviteCode)
            .IsUnique();

        builder.Property(l => l.OrganizerId)
            .IsRequired();

        builder.Property(l => l.CreatedAt)
            .IsRequired();

        builder.Property(l => l.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.HasMany(l => l.Players)
            .WithOne(p => p.League)
            .HasForeignKey(p => p.LeagueId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(l => l.Tournaments)
            .WithOne(t => t.League)
            .HasForeignKey(t => t.LeagueId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

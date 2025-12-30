using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data.Configurations;

public class SeasonConfiguration : IEntityTypeConfiguration<Season>
{
    public void Configure(EntityTypeBuilder<Season> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(s => s.StartDate)
            .IsRequired();

        builder.Property(s => s.EndDate)
            .IsRequired();

        builder.Property(s => s.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(s => s.CreatedAt)
            .IsRequired();

        builder.HasOne(s => s.League)
            .WithMany(l => l.Seasons)
            .HasForeignKey(s => s.LeagueId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => new { s.LeagueId, s.StartDate, s.EndDate });
    }
}

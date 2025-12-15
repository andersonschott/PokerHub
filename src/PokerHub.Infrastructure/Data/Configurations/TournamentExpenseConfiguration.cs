using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data.Configurations;

public class TournamentExpenseConfiguration : IEntityTypeConfiguration<TournamentExpense>
{
    public void Configure(EntityTypeBuilder<TournamentExpense> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Description)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(e => e.TotalAmount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(e => e.CreatedAt)
            .IsRequired();

        // Configure Tournament relationship - cascade delete when tournament is deleted
        builder.HasOne(e => e.Tournament)
            .WithMany(t => t.Expenses)
            .HasForeignKey(e => e.TournamentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure PaidByPlayer relationship - restrict to avoid cascade cycles
        builder.HasOne(e => e.PaidByPlayer)
            .WithMany(p => p.ExpensesPaid)
            .HasForeignKey(e => e.PaidByPlayerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

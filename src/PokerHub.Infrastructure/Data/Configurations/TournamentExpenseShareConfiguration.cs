using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PokerHub.Domain.Entities;

namespace PokerHub.Infrastructure.Data.Configurations;

public class TournamentExpenseShareConfiguration : IEntityTypeConfiguration<TournamentExpenseShare>
{
    public void Configure(EntityTypeBuilder<TournamentExpenseShare> builder)
    {
        builder.HasKey(es => es.Id);

        builder.Property(es => es.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        // Unique constraint: one share per player per expense
        builder.HasIndex(es => new { es.ExpenseId, es.PlayerId })
            .IsUnique();

        // Configure Expense relationship - cascade delete when expense is deleted
        builder.HasOne(es => es.Expense)
            .WithMany(e => e.Shares)
            .HasForeignKey(es => es.ExpenseId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure Player relationship - restrict to avoid cascade cycles
        builder.HasOne(es => es.Player)
            .WithMany(p => p.ExpenseShares)
            .HasForeignKey(es => es.PlayerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

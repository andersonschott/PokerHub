using Microsoft.EntityFrameworkCore;
using PokerHub.Domain.Entities;
using PokerHub.Infrastructure.Data;

namespace PokerHub.Application.Services;

/// <summary>Serializes mutations of an aggregate and records a durable retry marker.</summary>
internal static class MutationScope
{
    internal static async Task<T> RunAsync<T>(PokerHubDbContext db, Guid scopeId, string action,
        Func<Task<T>> mutate, string scopeType = "Tournament")
    {
        // Subservices participate in their caller's transaction.
        if (db.Database.CurrentTransaction != null) return await mutate();
        var operationId = Guid.NewGuid();
        var completed = false;
        T result = default!;
        return await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var transaction = db.Database.IsRelational()
                ? await db.Database.BeginTransactionAsync()
                : null;
            if (transaction != null)
            {
                // Every participating mutation takes this lock BEFORE reading state.
                if (scopeType == "League")
                    await db.Database.ExecuteSqlInterpolatedAsync($"SELECT [Id] FROM [Leagues] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {scopeId}");
                else
                    await db.Database.ExecuteSqlInterpolatedAsync($"SELECT [Id] FROM [Tournaments] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {scopeId}");
            }
            // A lost commit response must not replay a rebuy or recreate a payment.
            if (completed && await db.OperationLogs.AsNoTracking().AnyAsync(o => o.Id == operationId))
                return result;
            result = await mutate();
            completed = true;
            var succeeded = result switch
            {
                bool value => value,
                ValueTuple<bool, string> value => value.Item1,
                int value => value > 0,
                _ => result is not null
            };
            if (succeeded)
            {
                db.OperationLogs.Add(new OperationLog
                {
                    Id = operationId, ScopeId = scopeId, ScopeType = scopeType,
                    Action = action, ActorId = db.OperationActorId, CreatedAt = DateTime.UtcNow
                });
                await db.SaveChangesAsync();
            }
            if (transaction != null) await transaction.CommitAsync();
            return result;
        });
    }
}

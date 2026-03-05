using System.Net.Http.Json;
using PokerHub.Application.DTOs.Payment;
using PokerHub.Application.Interfaces;

namespace PokerHub.Client.Services.Http;

public class HttpPaymentService(HttpClient http) : IPaymentService
{
    public async Task<IReadOnlyList<PaymentDto>> GetPaymentsByTournamentAsync(Guid tournamentId)
        => await http.GetFromJsonAsync<List<PaymentDto>>($"api/tournaments/{tournamentId}/payments") ?? [];

    public async Task<IReadOnlyList<PaymentDto>> GetPaymentsByPlayerAsync(Guid playerId)
        => await http.GetFromJsonAsync<List<PaymentDto>>($"api/players/{playerId}/payments") ?? [];

    public async Task<IReadOnlyList<PendingDebtDto>> GetPendingDebtsByPlayerAsync(Guid playerId)
        => await http.GetFromJsonAsync<List<PendingDebtDto>>($"api/players/{playerId}/debts") ?? [];

    public async Task<IReadOnlyList<PaymentDto>> GetPendingPaymentsToReceiveAsync(Guid playerId)
        => await http.GetFromJsonAsync<List<PaymentDto>>($"api/players/{playerId}/credits") ?? [];

    public async Task<IReadOnlyList<PaymentDto>> CalculateAndCreatePaymentsAsync(Guid tournamentId)
    {
        var response = await http.PostAsync($"api/tournaments/{tournamentId}/payments/calculate", null);
        if (!response.IsSuccessStatusCode) return [];
        return await response.Content.ReadFromJsonAsync<List<PaymentDto>>() ?? [];
    }

    public async Task<bool> MarkAsPaidAsync(Guid paymentId, Guid fromPlayerId)
    {
        var response = await http.PostAsJsonAsync($"api/payments/{paymentId}/mark-paid", new { FromPlayerId = fromPlayerId });
        return response.IsSuccessStatusCode;
    }

    public async Task<bool> ConfirmPaymentAsync(Guid paymentId, Guid toPlayerId)
    {
        var response = await http.PostAsJsonAsync($"api/payments/{paymentId}/confirm", new { ToPlayerId = toPlayerId });
        return response.IsSuccessStatusCode;
    }

    public async Task<IReadOnlyList<PlayerBalanceDto>> GetTournamentPlayerBalancesAsync(Guid tournamentId)
        => await http.GetFromJsonAsync<List<PlayerBalanceDto>>($"api/tournaments/{tournamentId}/payments/balances") ?? [];

    public async Task<decimal> GetJackpotContributionAsync(Guid tournamentId)
        => 0; // Not directly exposed

    public async Task<(bool Success, string Message)> AdminMarkAsPaidAsync(Guid paymentId, string organizerUserId)
    {
        var response = await http.PostAsync($"api/payments/{paymentId}/admin-mark-paid", null);
        if (response.IsSuccessStatusCode) return (true, "Marcado como pago.");
        var err = await response.Content.ReadFromJsonAsync<MessageResponse>();
        return (false, err?.Message ?? "Erro.");
    }

    public async Task<(bool Success, string Message)> AdminConfirmPaymentAsync(Guid paymentId, string organizerUserId)
    {
        var response = await http.PostAsync($"api/payments/{paymentId}/admin-confirm", null);
        if (response.IsSuccessStatusCode) return (true, "Confirmado.");
        var err = await response.Content.ReadFromJsonAsync<MessageResponse>();
        return (false, err?.Message ?? "Erro.");
    }

    public async Task<IReadOnlyList<PaymentDto>> GetPaymentsForOrganizerAsync(string organizerUserId)
        => await http.GetFromJsonAsync<List<PaymentDto>>("api/payments/organizer") ?? [];

    public async Task<bool> HasPendingDebtsAsync(Guid playerId)
        => (await GetPendingDebtsByPlayerAsync(playerId)).Any();

    public async Task<bool> HasPendingCreditsAsync(Guid playerId)
        => (await GetPendingPaymentsToReceiveAsync(playerId)).Any();

    public async Task<int> BulkConfirmPaymentsAsync(IList<Guid> paymentIds, string userId)
    {
        var response = await http.PostAsJsonAsync("api/payments/bulk-confirm", new { PaymentIds = paymentIds });
        if (!response.IsSuccessStatusCode) return 0;
        var result = await response.Content.ReadFromJsonAsync<BulkResult>();
        return result?.Confirmed ?? 0;
    }

    private record MessageResponse(string Message);
    private record BulkResult(int Confirmed);
}

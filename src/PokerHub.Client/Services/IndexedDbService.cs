using Microsoft.JSInterop;
using PokerHub.Application.DTOs.Tournament;
using System.Text.Json;

namespace PokerHub.Client.Services;

/// <summary>
/// Wrapper C# para o window.pokerhubDB (indexeddb-service.js).
/// Todas as operações têm try/catch — IndexedDB pode falhar em modo incógnito.
/// </summary>
public class IndexedDbService(IJSRuntime js)
{
    private readonly IJSRuntime _js = js;

    private static readonly JsonSerializerOptions _jsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    // ── Inicialização ────────────────────────────────────────────────────────

    /// <summary>Pré-aquece a conexão com o IndexedDB.</summary>
    public async Task<bool> InitializeAsync()
    {
        try   { return await _js.InvokeAsync<bool>("pokerhubDB.initialize"); }
        catch { return false; }
    }

    // ── Timer State ──────────────────────────────────────────────────────────

    public async Task SaveTimerStateAsync(Guid tournamentId, TimerStateDto state)
    {
        try { await _js.InvokeVoidAsync("pokerhubDB.saveTimerState", tournamentId.ToString(), state); }
        catch { /* offline fallback silencioso */ }
    }

    public async Task<TimerStateDto?> GetTimerStateAsync(Guid tournamentId)
    {
        try { return await _js.InvokeAsync<TimerStateDto?>("pokerhubDB.getTimerState", tournamentId.ToString()); }
        catch { return null; }
    }

    public async Task DeleteTimerStateAsync(Guid tournamentId)
    {
        try { await _js.InvokeVoidAsync("pokerhubDB.deleteTimerState", tournamentId.ToString()); }
        catch { }
    }

    // ── Active Tournament ────────────────────────────────────────────────────

    public async Task SaveActiveTournamentAsync(TournamentDetailDto tournament)
    {
        try { await _js.InvokeVoidAsync("pokerhubDB.saveActiveTournament", tournament); }
        catch { }
    }

    public async Task<TournamentDetailDto?> GetActiveTournamentAsync(Guid tournamentId)
    {
        try { return await _js.InvokeAsync<TournamentDetailDto?>("pokerhubDB.getActiveTournament", tournamentId.ToString()); }
        catch { return null; }
    }

    public async Task DeleteActiveTournamentAsync(Guid tournamentId)
    {
        try { await _js.InvokeVoidAsync("pokerhubDB.deleteActiveTournament", tournamentId.ToString()); }
        catch { }
    }

    // ── Blind Structure ──────────────────────────────────────────────────────

    public async Task SaveBlindStructureAsync(Guid tournamentId, IReadOnlyList<BlindLevelDto> blinds)
    {
        try { await _js.InvokeVoidAsync("pokerhubDB.saveBlindStructure", tournamentId.ToString(), blinds); }
        catch { }
    }

    public async Task<List<BlindLevelDto>?> GetBlindStructureAsync(Guid tournamentId)
    {
        try { return await _js.InvokeAsync<List<BlindLevelDto>?>("pokerhubDB.getBlindStructure", tournamentId.ToString()); }
        catch { return null; }
    }

    // ── Offline Queue ────────────────────────────────────────────────────────

    public async Task EnqueueActionAsync(OfflineAction action)
    {
        try { await _js.InvokeVoidAsync("pokerhubDB.enqueueOfflineAction", action); }
        catch { }
    }

    /// <summary>
    /// Helper para criar e enfileirar uma ação a partir do tipo e payload.
    /// </summary>
    public Task EnqueueActionAsync(string actionType, object payload)
        => EnqueueActionAsync(OfflineAction.Create(actionType, payload));

    public async Task<OfflineAction?> DequeueActionAsync()
    {
        try { return await _js.InvokeAsync<OfflineAction?>("pokerhubDB.dequeueOfflineAction"); }
        catch { return null; }
    }

    public async Task<List<OfflineAction>> PeekQueueAsync()
    {
        try { return await _js.InvokeAsync<List<OfflineAction>>("pokerhubDB.peekOfflineQueue") ?? []; }
        catch { return []; }
    }

    public async Task<int> GetQueueSizeAsync()
    {
        try { return await _js.InvokeAsync<int>("pokerhubDB.getOfflineQueueSize"); }
        catch { return 0; }
    }

    public async Task ClearQueueAsync()
    {
        try { await _js.InvokeVoidAsync("pokerhubDB.clearOfflineQueue"); }
        catch { }
    }

    public async Task IncrementRetriesAsync(string actionId)
    {
        try { await _js.InvokeVoidAsync("pokerhubDB.incrementRetries", actionId); }
        catch { }
    }

    // ── User Session ─────────────────────────────────────────────────────────

    public async Task SaveUserSessionAsync(object session)
    {
        try { await _js.InvokeVoidAsync("pokerhubDB.saveUserSession", session); }
        catch { }
    }

    public async Task<T?> GetUserSessionAsync<T>()
    {
        try { return await _js.InvokeAsync<T?>("pokerhubDB.getUserSession"); }
        catch { return default; }
    }

    public async Task ClearUserSessionAsync()
    {
        try { await _js.InvokeVoidAsync("pokerhubDB.clearUserSession"); }
        catch { }
    }

    // ── Rankings Cache ────────────────────────────────────────────────────────

    public async Task SaveRankingsCacheAsync(Guid leagueId, object data)
    {
        try { await _js.InvokeVoidAsync("pokerhubDB.saveRankingsCache", leagueId.ToString(), data); }
        catch { }
    }

    public async Task<T?> GetRankingsCacheAsync<T>(Guid leagueId)
    {
        try { return await _js.InvokeAsync<T?>("pokerhubDB.getRankingsCache", leagueId.ToString()); }
        catch { return default; }
    }

    // ── League Data Cache ─────────────────────────────────────────────────────

    public async Task SaveLeagueDataAsync(Guid leagueId, object data)
    {
        try { await _js.InvokeVoidAsync("pokerhubDB.saveLeagueData", leagueId.ToString(), data); }
        catch { }
    }

    public async Task<T?> GetLeagueDataAsync<T>(Guid leagueId)
    {
        try { return await _js.InvokeAsync<T?>("pokerhubDB.getLeagueData", leagueId.ToString()); }
        catch { return default; }
    }

    // ── Utilitários ───────────────────────────────────────────────────────────

    /// <summary>Limpa todos os stores — usar no logout.</summary>
    public async Task ClearAllAsync()
    {
        try { await _js.InvokeVoidAsync("pokerhubDB.clearAll"); }
        catch { }
    }

    /// <summary>
    /// Deserializa o PayloadJson de um OfflineAction para o tipo desejado.
    /// </summary>
    public static T? DeserializePayload<T>(OfflineAction action)
    {
        try   { return JsonSerializer.Deserialize<T>(action.PayloadJson, _jsonOpts); }
        catch { return default; }
    }
}

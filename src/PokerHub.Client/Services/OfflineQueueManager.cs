using Microsoft.JSInterop;

namespace PokerHub.Client.Services;

/// <summary>
/// Rastreia ações de escrita pendentes (offline) para exibição na UI.
/// O Service Worker intercepta as requisições HTTP e as enfileira automaticamente.
/// Este serviço mantém o estado visual (badge de pendentes) em sincronia.
/// </summary>
public class OfflineQueueManager(IJSRuntime js)
{
    private readonly IJSRuntime _js = js;
    private readonly List<PendingActionInfo> _pending = [];

    /// <summary>Disparado quando a lista de pendentes muda.</summary>
    public event Action? OnChanged;

    public int Count => _pending.Count;
    public IReadOnlyList<PendingActionInfo> Actions => _pending;

    /// <summary>
    /// Executa uma ação. Se offline, a marca como pendente (o SW fará a fila HTTP).
    /// Retorna true otimisticamente para permitir updates locais imediatos.
    /// </summary>
    public async Task<bool> ExecuteAsync(string actionType, string description, Func<Task<bool>> action)
    {
        var isOnline = await IsOnlineAsync();

        bool result;
        try
        {
            result = await action();
        }
        catch (HttpRequestException)
        {
            result = false;
        }
        catch (Exception)
        {
            result = false;
        }

        // Se offline ou request falhou, registra como pendente
        if (!isOnline || !result)
        {
            _pending.Add(new PendingActionInfo(actionType, description, DateTimeOffset.UtcNow));
            OnChanged?.Invoke();
            return true; // sucesso otimista
        }

        return result;
    }

    /// <summary>Verifica se o navegador está online via navigator.onLine.</summary>
    public async Task<bool> IsOnlineAsync()
    {
        try { return await _js.InvokeAsync<bool>("eval", "navigator.onLine"); }
        catch { return true; }
    }

    /// <summary>Chamado pelo AppUpdateNotifier quando o SW finaliza background sync.</summary>
    public void OnSyncComplete(int processed)
    {
        var remove = Math.Min(processed, _pending.Count);
        if (remove > 0)
        {
            _pending.RemoveRange(0, remove);
            OnChanged?.Invoke();
        }
    }

    /// <summary>Remove todos os pendentes (ex: ao recarregar dados do servidor).</summary>
    public void Clear()
    {
        if (_pending.Count == 0) return;
        _pending.Clear();
        OnChanged?.Invoke();
    }
}

public record PendingActionInfo(string ActionType, string Description, DateTimeOffset Timestamp);

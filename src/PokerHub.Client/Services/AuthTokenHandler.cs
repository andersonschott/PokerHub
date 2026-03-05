using System.Net.Http.Headers;

namespace PokerHub.Client.Services;

public class AuthTokenHandler(AuthStateService authState) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrEmpty(authState.Token))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authState.Token);

        return await base.SendAsync(request, cancellationToken);
    }
}

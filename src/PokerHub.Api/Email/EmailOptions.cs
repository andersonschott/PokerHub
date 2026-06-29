namespace PokerHub.Api.Email;

/// <summary>Configuração SMTP + base URL do front, bindada da seção "Email".</summary>
public sealed class EmailOptions
{
    public string Host { get; set; } = "smtp.fastmail.com";
    public int Port { get; set; } = 465;
    /// <summary>SSL implícito (porta 465). Para 587, usar false → STARTTLS.</summary>
    public bool UseSsl { get; set; } = true;
    public string User { get; set; } = "";
    public string Password { get; set; } = "";
    public string FromAddress { get; set; } = "pokerhub@aschott.cloud";
    public string FromName { get; set; } = "PokerHub";
    /// <summary>Origem do app React, usada para montar o link do email (ex.: http://localhost:5173).</summary>
    public string AppBaseUrl { get; set; } = "";
}

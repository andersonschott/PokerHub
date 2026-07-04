Eu criei o novo fluxo de trabalho em `.github/workflows/master_poker-hub-web.yml`.

**Para que a implantação funcione, você precisa seguir estas etapas:**

1.  **Crie um Aplicativo Web Estático do Azure:**
    *   Vá para o [Portal do Azure](https://portal.azure.com/).
    *   Clique em **Criar um recurso**.
    *   Procure por **Aplicativo Web Estático** e clique em **Criar**.
    *   Preencha os detalhes:
        *   **Assinatura:** Sua assinatura do Azure.
        *   **Grupo de Recursos:** Escolha um existente ou crie um novo.
        *   **Nome:** Dê um nome ao seu aplicativo (por exemplo, `poker-hub-web`).
        *   **Tipo de plano:** `Free` é suficiente para começar.
        *   **Região:** Escolha uma região perto de você.
    *   Em **Detalhes da implantação**, selecione **Outro**. Você não usará a conexão do portal para criar o fluxo de trabalho, pois eu já o criei.
    *   Clique em **Revisar + criar** e depois em **Criar**.

2.  **Obtenha o Token de Implantação:**
    *   Após a criação do recurso, vá para o seu novo Aplicativo Web Estático no portal.
    *   No menu lateral, clique em **Gerenciar token de implantação**.
    *   Copie o token.

3.  **Adicione o Token ao GitHub:**
    *   Vá para o seu repositório no GitHub.
    *   Clique em **Settings** > **Secrets and variables** > **Actions**.
    *   Clique em **New repository secret**.
    *   **Nome:** `AZURE_STATIC_WEB_APPS_API_TOKEN_POKERHUB_WEB`
    *   **Valor:** Cole o token que você copiou do Portal do Azure.
    *   Clique em **Add secret**.

Após seguir estas etapas, o fluxo de trabalho será executado automaticamente sempre que você enviar um push para o branch `master`, e seu aplicativo React será implantado no Azure.

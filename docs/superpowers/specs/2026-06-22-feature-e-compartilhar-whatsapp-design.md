# Design — Feature E: Compartilhar pendências no WhatsApp (imagem)

**Data:** 2026-06-22
**Alvo:** `web/` (frontend). Sem backend.
**Decisão (usuário):** imagem **client-side** + **Web Share API**.

## Objetivo
Ao fim do torneio, **qualquer jogador** (não gateado) pode, na tela
`debitos/pagamentos?t={tournamentId}`, tocar em **Compartilhar** e gerar uma **imagem gerencial**
das pendências, abrindo o share sheet nativo para enviar no WhatsApp da galera.

## Design
- **Card gerencial** (componente React estilizado no DS): nome do torneio + data, lista de
  pendências `devedor → credor: valor` (usando a agregação da Feature D quando disponível;
  senão a lista atual), e totais. Layout pensado para leitura rápida no celular.
- **Geração de imagem client-side:** renderizar o card off-screen e convertê-lo em PNG via
  `html-to-image` (toPng) — adicionar a dependência em `web/`. (Alternativa canvas se preferir
  zero-dep, mas html-to-image é mais fiel ao DS.)
- **Compartilhamento:** `navigator.share({ files: [new File([blob], 'pendencias.png', {type:'image/png'})], title, text })`.
  - Fallback quando `navigator.canShare`/`share` indisponível (desktop): baixar o PNG
    (`<a download>`), com um toast orientando.
- **Sem gate** — botão visível para qualquer jogador da tela.

## Dependência
- `html-to-image` (web/). Confirmar no build (sem quebrar o PWA/precache).

## Testes
- Função pura que monta o "modelo" do card (linhas/totais a partir das pendências) com vitest.
- A geração de imagem + share são efeitos de browser → checagem manual (mobile/PWA).

## Fora de escopo
- Geração no backend; agendamento/automação de envio; integração direta com a API do WhatsApp.

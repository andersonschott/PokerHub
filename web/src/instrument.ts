/**
 * Init do Sentry — PRIMEIRO import do main.tsx, antes do React, para capturar
 * erros durante o load dos módulos. Sem VITE_SENTRY_DSN o bloco é um no-op
 * (caso de `npm run dev`): o DSN vive em `.env.production`, então o Sentry só
 * fica ativo em builds de produção — dev local não polui o projeto Sentry.
 */
import React from 'react';
import * as Sentry from '@sentry/react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'pokerhub-web@dev',
    // Anexa usuário (via setUser), IP e dados de request aos eventos — beta fechado.
    sendDefaultPii: true,
    // Habilita a API Sentry.logger.* (logs estruturados correlacionados ao trace).
    enableLogs: true,
    integrations: [
      // Tracing ciente do react-router 7 (page load + navegação + chamadas de API).
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      // Session Replay: grava a sessão em torno do erro p/ debugar o que o tester fez.
      // Mascarado por privacidade (texto e mídia ocultos).
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 1.0,
    // Propaga headers de trace para a API (Container App) — conecta trace front↔backend.
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/pokerhub-api\..*\.azurecontainerapps\.io/,
    ],
    // Replay: 10% das sessões normais, 100% das sessões com erro.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

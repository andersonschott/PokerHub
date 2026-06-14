/**
 * Init do Sentry — PRIMEIRO import do main.tsx, antes do React, para capturar
 * erros durante o load dos módulos. Sem VITE_SENTRY_DSN configurado (estado
 * atual) o bloco inteiro é um no-op — o projeto Sentry será criado quando o
 * app for a produção (Fase 7).
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
    integrations: [
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: ['localhost'],
  });
}

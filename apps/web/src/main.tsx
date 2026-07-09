import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { registerSW } from 'virtual:pwa-register';

import App from './App.js';
import { locales, type Locale } from './lib/i18n.js';
import { env } from './lib/env.js';
import './styles/tailwind.css';

// Register service worker (solo en prod)
if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

const initialLocale: Locale = env.VITE_DEFAULT_LOCALE;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <IntlProvider locale={initialLocale} messages={locales[initialLocale]} defaultLocale="es-AR">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </IntlProvider>
  </React.StrictMode>,
);

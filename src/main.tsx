import { Capacitor } from '@capacitor/core';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { I18nProvider, preloadInitialLocale } from './i18n';
import { hideNativeSplash } from './utils/native';
import './index.css';

if (!Capacitor.isNativePlatform()) {
  registerSW({ immediate: true });
}

preloadInitialLocale().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <I18nProvider>
      <App />
    </I18nProvider>
  );
  void hideNativeSplash();
});

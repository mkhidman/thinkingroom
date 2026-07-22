import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { AuthStoreProvider } from './store/AuthStore';
import { AppStoreProvider } from './store/AppStore';
import './styles.css';

// Saat development, jangan biarkan service worker build lama mencegat localhost
// dan menampilkan bundle/cache yang sudah tidak sesuai dengan source terbaru.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) =>
    Promise.all(registrations.map((registration) => registration.unregister()))
  );
  if ('caches' in window) {
    void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
  }
} else {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthStoreProvider>
      <AppStoreProvider>
        <App />
      </AppStoreProvider>
    </AuthStoreProvider>
  </StrictMode>
);

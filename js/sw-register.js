// Registriert den Service Worker für Offline-Fähigkeit als iPhone-PWA.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.error('Service-Worker-Registrierung fehlgeschlagen:', error);
    });
  });
}

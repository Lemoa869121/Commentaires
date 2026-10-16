/* Service worker : rend l'application installable et utilisable hors connexion.
   Stratégie « réseau d'abord » : en ligne, on prend toujours la dernière version
   publiée (mises à jour automatiques) ; hors ligne, on sert la dernière copie gardée. */
const CACHE = 'commentaires-v1';
const FICHIERS = [
  './', 'index.html', 'admin.html', 'manifest.webmanifest',
  'css/style.css', 'css/admin.css',
  'js/regles.js', 'js/generateur.js', 'js/donnees.js', 'js/formulaire.js', 'js/app.js', 'js/admin.js', 'js/pwa.js',
  'data/config.json', 'data/textes.json',
  'icones/icone-192.png', 'icones/icone-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // Seulement les fichiers de l'application (jamais l'API GitHub du panneau de contrôle).
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const cle = url.origin + url.pathname; // sans « ?t=… »
  e.respondWith(
    fetch(req)
      .then(rep => {
        if (rep.ok) {
          const copie = rep.clone();
          caches.open(CACHE).then(c => c.put(cle, copie));
        }
        return rep;
      })
      .catch(() => caches.match(cle).then(r => r ||
        (req.mode === 'navigate' ? caches.match(new URL('index.html', self.registration.scope).href) : undefined) ||
        new Response('Hors connexion', { status: 503 })))
  );
});

// Meu Financeiro — Service Worker
// BUILD: 202604091615
// Incrementar este número a cada deploy para forçar atualização
const CACHE_VERSION = '1.0.6';
const CACHE_NAME = 'meu-financeiro-' + CACHE_VERSION;

const SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// ── INSTALL: cacheia o shell do app ──────────────────────────────────────────
self.addEventListener('install', e => {
  console.log('[SW] Instalando versão:', CACHE_VERSION);
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .then(() => {
        console.log('[SW] Shell cacheado com sucesso');
        // NÃO chama skipWaiting aqui — esperamos a confirmação do cliente
      })
  );
});

// ── ACTIVATE: limpa caches antigos ───────────────────────────────────────────
self.addEventListener('activate', e => {
  console.log('[SW] Ativando versão:', CACHE_VERSION);
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Removendo cache antigo:', k);
            return caches.delete(k);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ── MENSAGEM: recebe sinal do cliente para aplicar atualização ───────────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    console.log('[SW] Aplicando atualização agora...');
    self.skipWaiting();
  }
});

// ── FETCH: cache-first para app shell, network para Firebase/APIs ─────────────
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Deixa APIs externas sempre passarem pela rede
  if (
    url.includes('firebase') ||
    url.includes('firebaseio') ||
    url.includes('googleapis') ||
    url.includes('gstatic.com') ||
    url.includes('fonts.g') ||
    e.request.method !== 'GET'
  ) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // Serve do cache mas tenta atualizar em background (stale-while-revalidate)
      const fetchPromise = fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => null);

      return cached || fetchPromise.then(r => r || (
        e.request.mode === 'navigate' ? caches.match('./index.html') : null
      ));
    })
  );
});

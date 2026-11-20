// Service worker do ArtDecor.
// Deixa o app "instalável" no Android e abre a última versão salva quando a internet falha.
// Estratégia: rede primeiro; se não houver rede, usa o que estiver em cache.
const CACHE = 'artdecor-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Só arquivos do próprio app; chamadas a outros servidores (ex.: back-end) passam direto.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return res;
      })
      .catch(async () => {
        const salvo = await caches.match(req);
        if (salvo) return salvo;
        // Telas do app (ex.: /pedidos/123) sem rede: abre o app pela página inicial salva.
        if (req.mode === 'navigate') return (await caches.match('/')) ?? Response.error();
        return Response.error();
      }),
  );
});

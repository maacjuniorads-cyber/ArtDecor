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

// ---- Avisos (notificações push) ----
// Chegam da tarefa agendada (scripts/avisos.mjs) só para os celulares da equipe que ativaram.
self.addEventListener('push', (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(dados.title || 'ArtDecor', {
      body: dados.body || '',
      icon: '/icone-192.png',
      badge: '/icone-192.png',
      tag: dados.tag,
      renotify: Boolean(dados.tag),
      data: { url: dados.url || '/' },
    }),
  );
});

// Toque no aviso: abre o app na tela certa (ou traz para a frente se já estiver aberto).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if (new URL(janela.url).origin === self.location.origin && 'focus' in janela) {
          return janela.focus().then((j) => (j && 'navigate' in j ? j.navigate(destino) : undefined));
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});

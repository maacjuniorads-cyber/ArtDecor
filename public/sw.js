// Service worker do ArtDecor.
// Deixa o app "instalável" no Android e abre a última versão salva quando a internet falha.
// Estratégia: rede primeiro; se não houver rede, usa o que estiver em cache.
const CACHE = 'artdecor-v1';
// Onde fica, por um instante, o que chegou pelo "Compartilhar → ArtDecor".
const CACHE_COMPARTILHADO = 'artdecor-compartilhado';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE && n !== CACHE_COMPARTILHADO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // "Compartilhar → ArtDecor" (Android): guarda o que veio e abre a tela de importar contatos.
  if (req.method === 'POST' && new URL(req.url).pathname === '/compartilhar') {
    event.respondWith(receberCompartilhado(req));
    return;
  }
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

async function receberCompartilhado(req) {
  try {
    const dados = await req.formData();
    const arquivos = [];
    for (const arquivo of dados.getAll('contatos')) {
      if (arquivo && typeof arquivo.text === 'function') arquivos.push(await arquivo.text());
    }
    // O título que o outro app manda costuma ser só "Compartilhar" ou parecido: vale só o texto.
    const texto = typeof dados.get('text') === 'string' ? dados.get('text') : '';
    const cache = await caches.open(CACHE_COMPARTILHADO);
    await cache.put(
      '/compartilhado',
      new Response(JSON.stringify({ arquivos, texto }), { headers: { 'Content-Type': 'application/json' } }),
    );
  } catch {
    // não deu para ler: a tela abre normal, sem nada novo
  }
  return Response.redirect(new URL('/clientes/importar?compartilhado=1', self.location.origin).href, 303);
}

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

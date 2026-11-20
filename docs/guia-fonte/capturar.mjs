// Tira prints das telas do app (modo demonstração) no tamanho de um celular, para o guia em PDF.
//
// Como atualizar o guia:
//   1. Em dois terminais: `npm run dev` (porta 5173, só para o print do login) e `npm run demo` (porta 5174).
//   2. Nesta pasta: `npm i --no-save puppeteer-core` e `node capturar.mjs` (usa o Chrome instalado).
//   3. Edite guia.html se algo mudou e gere o PDF:
//      chrome --headless --no-pdf-header-footer --print-to-pdf=../Guia-ArtDecor.pdf guia.html
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEMO = 'http://localhost:5174';
const ATUAL = 'http://localhost:5173';
const PASTA = new URL('./prints/', import.meta.url);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('ERRO NA PÁGINA', e.message));

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function abrir(url) {
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await espera(500);
}

async function clicarTexto(texto, seletor = 'button, a', indice = 0) {
  const ok = await page.evaluate(
    (t, s, n) => {
      const el = [...document.querySelectorAll(s)].filter((e) => e.textContent.trim().includes(t))[n];
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    },
    texto,
    seletor,
    indice,
  );
  if (!ok) throw new Error(`Não achei: ${texto}`);
  await espera(400);
}

async function digitar(seletor, valor, indice = 0) {
  await page.evaluate(
    (s, v, n) => {
      const el = document.querySelectorAll(s)[n];
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    seletor,
    valor,
    indice,
  );
  await espera(200);
}

async function rolar(y) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await espera(300);
}

async function rolarAte(texto, folga = 16) {
  await page.evaluate(
    (t, f) => {
      const el = [...document.querySelectorAll('h2, span, b, button, label, a')].find((e) => e.textContent.trim().startsWith(t));
      if (el) el.scrollIntoView({ block: 'start' });
      window.scrollBy(0, -f);
    },
    texto,
    folga,
  );
  await espera(400);
}

async function print(nome) {
  await page.screenshot({ path: fileURLToPath(new URL(`${nome}.png`, PASTA)) });
  console.log('ok', nome);
}

/** Abre o tutorial e avança até o passo com este título. */
async function tutorialAte(titulo) {
  await abrir(`${DEMO}/`);
  await clicarTexto('Ajuda', 'button');
  for (let n = 0; n < 60; n++) {
    const atual = await page.evaluate(() => document.getElementById('tour-titulo')?.textContent ?? '');
    if (atual === titulo) break;
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent === 'Próximo')?.click());
    await espera(450);
  }
  await espera(900);
}

// Login (versão normal, sem sessão)
await abrir(`${ATUAL}/`);
await print('01-login');

await abrir(`${DEMO}/`);
await print('02-inicio');

await abrir(`${DEMO}/agenda`);
await print('03-agenda');

await abrir(`${DEMO}/estoque`);
await print('04-estoque');

await abrir(`${DEMO}/estoque?aba=temas`);
await print('05-temas');

await abrir(`${DEMO}/estoque/item-bandeja-espelhada`);
await rolarAte('Categoria');
await print('06-item');

await abrir(`${DEMO}/estoque/contar`);
await clicarTexto('+', 'button');
await clicarTexto('+', 'button');
await digitar('input[inputmode="decimal"]', '12,00');
await rolar(0);
await print('06b-contagem');

await abrir(`${DEMO}/clientes`);
await print('07-clientes');

await abrir(`${DEMO}/clientes/novo`);
await rolarAte('Veículo');
await print('08-cliente-veiculo');

// Novo pedido com o kit Heróis nas mesmas datas do pedido #A58340 (mostra o aviso)
await abrir(`${DEMO}/pedidos/novo`);
await page.select('select', 'demo-c5');
await digitar('input[placeholder^="Ex: Anivers"]', 'Aniversário de 8 anos');
await clicarTexto('Heróis', 'button');
await rolar(0);
await print('09-pedido-topo');
await rolarAte('Itens');
await print('10-pedido-itens');
await page.evaluate(() => localStorage.clear()); // não deixa rascunho para os próximos prints

await abrir(`${DEMO}/pedidos`);
await print('11-pedidos');

await abrir(`${DEMO}/pedidos/demo-p12`);
await print('12-pedido-detalhe');
await clicarTexto('Registrar pagamento', 'button');
await rolarAte('Pagamento');
await print('13-pagamento');

await abrir(`${DEMO}/pedidos/demo-p11`);
await print('14-pedido-na-rua');

// Conferência: bandeja com problema, resto ok
await abrir(`${DEMO}/pedidos/demo-p11/conferir`);
await clicarTexto('Teve problema', 'button', 2);
await page.evaluate(() => {
  const li = document.querySelectorAll('[data-tour="conferencia-lista"] > li')[2];
  [...li.querySelectorAll('button')].find((b) => b.getAttribute('aria-label')?.startsWith('Mais'))?.click();
});
await espera(200);
await digitar('input[placeholder="Ex.: borda lascada"]', 'borda lascada');
await digitar('input[inputmode="decimal"]', '25,00');
await clicarTexto('Marcar o resto como ok', 'button');
await rolar(0);
await print('15-conferencia');
await rolarAte('Bandeja espelhada', 90);
await print('16-conferencia-problema');

await abrir(`${DEMO}/pedidos/demo-p09`);
await rolarAte('Devolução');
await print('17-devolvido');

await abrir(`${DEMO}/pedidos/demo-p12/nota`);
await print('18-nota');
await rolar(99999);
await print('19-nota-botoes');

// Avisos no celular
await abrir(`${DEMO}/avisos`);
await print('23-avisos');

// Rascunho recuperado: começa um pedido, "recarrega" e mostra a faixa
await page.evaluate(() => localStorage.clear()); // tira rascunhos dos prints anteriores
await abrir(`${DEMO}/pedidos/novo`);
await page.select('select', 'demo-c1');
await digitar('input[placeholder^="Ex: Anivers"]', 'Aniversário da Ana');
await clicarTexto('Capivara', 'button');
await espera(400);
await page.reload({ waitUntil: 'networkidle0' });
await espera(1200);
await rolar(0);
await print('24-rascunho');
await clicarTexto('Descartar', 'button');

// Tutorial
await tutorialAte('Como o lembrete chega no cliente');
await print('20-tutorial-lembrete');
await tutorialAte('O que o cliente recebe');
await print('21-tutorial-nota');
await tutorialAte('Atenção: peça já reservada nas mesmas datas');
await print('22-tutorial-conflito');

await browser.close();

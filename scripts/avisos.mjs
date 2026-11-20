// Avisos no celular da equipe do ArtDecor (notificações push).
//
// Uso:
//   node scripts/avisos.mjs manha   → resumo do dia + devoluções atrasadas (de ontem)
//   node scripts/avisos.mjs tarde   → retiradas de amanhã
//   node scripts/avisos.mjs teste   → um aviso de teste para todos os celulares inscritos
//
// Variáveis: SUPABASE_URL, SUPABASE_KEY, BACKUP_EMAIL, BACKUP_SENHA (login de leitura),
//            VAPID_PRIVADA (chave privada dos avisos).
//
// Os avisos vão SÓ para os celulares da equipe que ativaram em "Avisos" no app.
// Clientes nunca recebem nada daqui.
//
// IMPORTANTE: o repositório é público e o registro da tarefa também — por isso
// este script só escreve números no log, nunca nomes de clientes.
import webpush from 'web-push';
import { montarAvisos } from './avisos-regras.mjs';

const { SUPABASE_URL: url, SUPABASE_KEY: chave, BACKUP_EMAIL: email, BACKUP_SENHA: senha, VAPID_PRIVADA: privada } = process.env;
const CHAVE_PUBLICA = 'BNZUg5Ae8ws2mLMRczuaCC2poAGmpN71l79ERmsDZaFIpY8Odpov7agc20tqXSizd6M14G4rgwKLMXZoG8jFnN0';
const momento = process.argv[2];

function falhar(msg) {
  console.error(`ERRO: ${msg}`);
  process.exit(1);
}

if (!['manha', 'tarde', 'teste'].includes(momento)) falhar('use: node scripts/avisos.mjs manha|tarde|teste');
if (!url || !chave || !email || !senha) falhar('faltam SUPABASE_URL, SUPABASE_KEY, BACKUP_EMAIL ou BACKUP_SENHA.');
if (!privada) falhar('falta o segredo VAPID_PRIVADA (a chave privada dos avisos).');

webpush.setVapidDetails('https://art-decor-sigma.vercel.app', CHAVE_PUBLICA, privada.trim());

// Login de leitura (o mesmo da cópia de segurança).
const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: chave, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: senha }),
});
if (!login.ok) falhar(`login recusado (${login.status}).`);
const { access_token: token } = await login.json();
const cabecalhos = { apikey: chave, Authorization: `Bearer ${token}` };

async function ler(caminho) {
  const r = await fetch(`${url}/rest/v1/${caminho}`, { headers: cabecalhos });
  if (!r.ok) falhar(`não consegui ler "${caminho.split('?')[0]}" (${r.status}): ${await r.text()}`);
  return r.json();
}

const inscricoes = await ler('avisos_inscricoes?select=endpoint,p256dh,auth,tipos');
if (inscricoes.length === 0) {
  console.log('Nenhum celular com avisos ativados. Nada a fazer.');
  process.exit(0);
}

let avisos;
if (momento === 'teste') {
  avisos = [{ tipo: null, title: 'ArtDecor — teste', body: 'Os avisos automáticos estão funcionando.', url: '/avisos', tag: 'teste' }];
} else {
  const [pedidos, clientes] = await Promise.all([
    ler('pedidos?select=id,numero,codigo,cliente_id,itens,retirada,devolucao,status&status=in.(reservado,rua)'),
    ler('clientes?select=id,nome'),
  ]);
  avisos = montarAvisos(momento, pedidos, clientes, new Date());
}

if (avisos.length === 0) {
  console.log(`Momento "${momento}": nada para avisar hoje.`);
  process.exit(0);
}

let enviados = 0;
let removidos = 0;
let falhas = 0;
for (const insc of inscricoes) {
  const tipos = { manha: true, vespera: true, atraso: true, ...(insc.tipos ?? {}) };
  for (const aviso of avisos) {
    if (aviso.tipo && !tipos[aviso.tipo]) continue;
    try {
      await webpush.sendNotification(
        { endpoint: insc.endpoint, keys: { p256dh: insc.p256dh, auth: insc.auth } },
        JSON.stringify({ title: aviso.title, body: aviso.body, url: aviso.url, tag: aviso.tag }),
        { TTL: 6 * 60 * 60, urgency: 'high' },
      );
      enviados++;
    } catch (e) {
      // 404/410: o celular desinstalou o app ou desligou os avisos — tira da lista.
      if (e.statusCode === 404 || e.statusCode === 410) {
        await fetch(`${url}/rest/v1/avisos_inscricoes?endpoint=eq.${encodeURIComponent(insc.endpoint)}`, { method: 'DELETE', headers: cabecalhos });
        removidos++;
        break;
      }
      falhas++;
      console.error(`Falha ao enviar (status ${e.statusCode ?? '?'}).`);
    }
  }
}

console.log(`Momento "${momento}": ${avisos.length} aviso(s), ${inscricoes.length} celular(es) — ${enviados} enviado(s), ${removidos} inscrição(ões) vencida(s) removida(s), ${falhas} falha(s).`);
if (falhas > 0 && enviados === 0) process.exit(1);

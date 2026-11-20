// Cópia de segurança do ArtDecor: baixa todas as tabelas do Supabase em um JSON.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_KEY=... BACKUP_EMAIL=... BACKUP_SENHA=... node scripts/backup.mjs saida.json
//
// Entra com um login próprio de backup (não usa a chave secreta do Supabase),
// então só consegue o mesmo que um usuário do app: ler os dados.
import { writeFileSync } from 'node:fs';

const { SUPABASE_URL: url, SUPABASE_KEY: chave, BACKUP_EMAIL: email, BACKUP_SENHA: senha } = process.env;
const saida = process.argv[2] ?? 'backup.json';
const TABELAS = ['temas', 'itens', 'clientes', 'pedidos'];
const PARTE = 1000;

function falhar(msg) {
  console.error(`ERRO: ${msg}`);
  process.exit(1);
}

if (!url || !chave || !email || !senha) falhar('faltam SUPABASE_URL, SUPABASE_KEY, BACKUP_EMAIL ou BACKUP_SENHA.');

const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: chave, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: senha }),
});
if (!login.ok) falhar(`login de backup recusado (${login.status}).`);
const { access_token: token } = await login.json();

async function baixar(tabela) {
  const linhas = [];
  for (let inicio = 0; ; inicio += PARTE) {
    const r = await fetch(`${url}/rest/v1/${tabela}?select=*&order=criado_em.asc,id.asc`, {
      headers: { apikey: chave, Authorization: `Bearer ${token}`, Range: `${inicio}-${inicio + PARTE - 1}` },
    });
    if (!r.ok) falhar(`não consegui ler "${tabela}" (${r.status}): ${await r.text()}`);
    const parte = await r.json();
    linhas.push(...parte);
    if (parte.length < PARTE) return linhas;
  }
}

const dados = {};
for (const t of TABELAS) dados[t] = await baixar(t);
const resumo = Object.fromEntries(TABELAS.map((t) => [t, dados[t].length]));

writeFileSync(saida, JSON.stringify({ app: 'ArtDecor', versao: 1, geradoEm: new Date().toISOString(), resumo, dados }, null, 2));
console.log('Cópia gerada:', JSON.stringify(resumo));

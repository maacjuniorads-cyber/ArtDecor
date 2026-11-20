// Restaura uma cópia de segurança (JSON já descriptografado) no Supabase.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_KEY=... BACKUP_EMAIL=... BACKUP_SENHA=... node scripts/restaurar.mjs artdecor-AAAA-MM-DD.json
//
// Grava por cima (upsert): registros com o mesmo id são substituídos pela versão
// da cópia; registros que não existem na cópia NÃO são apagados.
// Depois de restaurar, rode no SQL Editor do Supabase (para os números de pedido continuarem certos):
//   select setval(pg_get_serial_sequence('public.pedidos', 'numero'), coalesce((select max(numero) from public.pedidos), 1));
import { readFileSync } from 'node:fs';

const { SUPABASE_URL: url, SUPABASE_KEY: chave, BACKUP_EMAIL: email, BACKUP_SENHA: senha } = process.env;
const arquivo = process.argv[2];
const ORDEM = ['temas', 'itens', 'clientes', 'pedidos']; // respeita as ligações entre tabelas
const LOTE = 500;

function falhar(msg) {
  console.error(`ERRO: ${msg}`);
  process.exit(1);
}

if (!arquivo) falhar('informe o arquivo .json da cópia (já descriptografado).');
if (!url || !chave || !email || !senha) falhar('faltam SUPABASE_URL, SUPABASE_KEY, BACKUP_EMAIL ou BACKUP_SENHA.');

const copia = JSON.parse(readFileSync(arquivo, 'utf8'));
if (copia.app !== 'ArtDecor' || !copia.dados) falhar('este arquivo não parece uma cópia do ArtDecor.');

const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: chave, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: senha }),
});
if (!login.ok) falhar(`login recusado (${login.status}).`);
const { access_token: token } = await login.json();

for (const tabela of ORDEM) {
  const linhas = copia.dados[tabela] ?? [];
  for (let i = 0; i < linhas.length; i += LOTE) {
    const r = await fetch(`${url}/rest/v1/${tabela}`, {
      method: 'POST',
      headers: {
        apikey: chave,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(linhas.slice(i, i + LOTE)),
    });
    if (!r.ok) falhar(`falha ao gravar "${tabela}" (${r.status}): ${await r.text()}`);
  }
  console.log(`${tabela}: ${linhas.length} registros restaurados`);
}
console.log('Pronto. Lembre de rodar o setval no SQL Editor (veja o topo deste arquivo).');

# Cópia de segurança do ArtDecor

## Como funciona

| O quê | Onde | Quando |
|---|---|---|
| **Cópia automática** (criptografada) | GitHub → aba **Actions** → "Cópia de segurança diária" → anexos de cada execução | Todo dia ~06:17 (Brasília). Guardada por **90 dias**. |
| **Cópia manual** (planilhas e JSON) | No app: Início → "Cópia de segurança dos dados" | Quando quiser. |

A tarefa automática (`.github/workflows/backup.yml`):

1. entra no Supabase com o **usuário de backup** (não usa a chave secreta `service_role`);
2. baixa `temas`, `itens`, `clientes` e `pedidos` (`scripts/backup.mjs`);
3. **criptografa** com a senha `BACKUP_CHAVE` (AES-256) — o repositório é público, então a cópia só pode ser aberta por quem tem a senha;
4. guarda o arquivo `artdecor-AAAA-MM-DD.json.enc`.

De quebra, ela:

- **mantém o Supabase acordado** (o plano grátis pausa projetos parados por ~1 semana);
- **evita que o GitHub desligue a tarefa**: em repositório público, tarefas agendadas são desligadas após 60 dias sem commits; se passar de 45 dias, ela registra um commit vazio no ramo `keepalive` (a Vercel ignora esse ramo — veja `vercel.json`).

Se uma execução falhar, o GitHub manda e-mail para a conta dona do repositório.

> **Fotos dos itens** não entram na cópia (só o link delas). Elas ficam no Storage do Supabase.

## Configuração (uma vez)

1. **Supabase → Authentication → Users → Add user → Create new user**
   - e-mail: um e-mail só para isso (ex.: `backup@artdecor.com`), senha forte, **Auto Confirm User** marcado.
2. **GitHub → repositório → Settings → Secrets and variables → Actions → New repository secret**, criar:
   - `BACKUP_EMAIL` — o e-mail do passo 1
   - `BACKUP_SENHA` — a senha do passo 1
   - `BACKUP_CHAVE` — uma senha nova, longa, **só para criptografar as cópias**.
     **Guarde em um gerenciador de senhas. Sem ela, nenhuma cópia pode ser aberta.**
3. **GitHub → Actions → "Cópia de segurança diária" → Run workflow** para testar na hora.

## Abrir uma cópia automática

1. GitHub → **Actions** → "Cópia de segurança diária" → clique na execução do dia → em **Artifacts**, baixe `artdecor-AAAA-MM-DD` (vem em `.zip`).
2. Descompacte; dentro está `artdecor-AAAA-MM-DD.json.enc`.
3. No **Git Bash** (já vem com o Git no Windows), na pasta do arquivo:

   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
     -in artdecor-AAAA-MM-DD.json.enc -out artdecor-AAAA-MM-DD.json
   ```

   Ele pede a senha `BACKUP_CHAVE`. O resultado é um JSON com todos os dados.

> Esse JSON tem nomes e telefones de clientes: não suba para o GitHub nem compartilhe.

## Restaurar

Use quando algo foi apagado ou estragado. A restauração **grava por cima** (mesmo `id` = substitui pela versão da cópia) e **não apaga** o que existir a mais.

```bash
SUPABASE_URL=https://lfzixpurwimjdrtllaoc.supabase.co \
SUPABASE_KEY=<chave pública do .env.local> \
BACKUP_EMAIL=<e-mail de backup> BACKUP_SENHA=<senha> \
node scripts/restaurar.mjs artdecor-AAAA-MM-DD.json
```

Depois, no **Supabase → SQL Editor**, rode (para os próximos números de pedido continuarem certos):

```sql
select setval(pg_get_serial_sequence('public.pedidos', 'numero'),
              coalesce((select max(numero) from public.pedidos), 1));
```

A cópia completa baixada pelo app (`artdecor-copia-completa-AAAA-MM-DD.json`) tem o mesmo formato e também pode ser restaurada assim.

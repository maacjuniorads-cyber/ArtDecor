-- Avisos no celular (notificações push).
-- Cada celular que ativa os avisos vira uma linha aqui. A tarefa agendada
-- (.github/workflows/avisos.yml) lê esta tabela e manda os avisos.
-- Seguro rodar mais de uma vez.

create table if not exists public.avisos_inscricoes (
  endpoint       text primary key,                 -- endereço de entrega do celular (dado pelo navegador)
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh         text not null,                    -- chaves públicas do celular para criptografar o aviso
  auth           text not null,
  tipos          jsonb not null default '{"manha": true, "vespera": true, "atraso": true}',
  aparelho       text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

drop trigger if exists avisos_inscricoes_atualizado_em on public.avisos_inscricoes;
create trigger avisos_inscricoes_atualizado_em before update on public.avisos_inscricoes
  for each row execute function public.tocar_atualizado_em();

grant select, insert, update, delete on public.avisos_inscricoes to authenticated;
revoke all on public.avisos_inscricoes from anon;

alter table public.avisos_inscricoes enable row level security;
drop policy if exists "equipe" on public.avisos_inscricoes;
create policy "equipe" on public.avisos_inscricoes for all to authenticated using (true) with check (true);

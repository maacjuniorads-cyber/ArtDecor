-- Conferência da devolução e cobranças extras (avarias) nos pedidos.
-- Seguro rodar mais de uma vez.
alter table public.pedidos add column if not exists conferencia jsonb;
alter table public.pedidos add column if not exists cobrancas jsonb not null default '[]';

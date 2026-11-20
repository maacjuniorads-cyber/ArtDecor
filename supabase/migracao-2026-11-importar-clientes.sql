-- Clientes importados da agenda do celular: entram só com nome e telefone.
-- "importado" marca que falta completar (endereço e veículo); some ao salvar o cadastro.
-- Rodar uma vez no SQL Editor do Supabase.
alter table public.clientes add column if not exists importado boolean not null default false;

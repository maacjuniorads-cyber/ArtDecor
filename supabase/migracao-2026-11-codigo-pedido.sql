-- Código do pedido: letra(s) + números aleatórios, sempre 6 caracteres.
-- Ex.: A13213, A90412, ... depois B..., até Z; depois AA1234, AB5678, ...
-- Assim ninguém consegue deduzir quantos pedidos a loja já fez pelo código.
--
-- A letra avança a cada 1000 pedidos (contados pelo "numero" interno, que
-- continua existindo só para ordenar e não aparece no app).
-- Rodar uma vez no SQL Editor do Supabase.

alter table public.pedidos add column if not exists codigo text unique;

create or replace function public.gerar_codigo_pedido() returns trigger
language plpgsql as $$
declare
  bloco    int := (new.numero - 1) / 1000;  -- 0 = A, 1 = B, ...
  prefixo  text;
  digitos  int;
  tentativa text;
begin
  if new.codigo is not null then
    return new;  -- já tem (restauração de cópia, por exemplo)
  end if;

  if bloco < 26 then
    prefixo := chr(65 + bloco);                                        -- A..Z
  else
    prefixo := chr(65 + ((bloco - 26) / 26) % 26) || chr(65 + (bloco - 26) % 26);  -- AA..ZZ
  end if;
  digitos := 6 - length(prefixo);

  loop
    -- primeiro dígito nunca é zero (evita códigos tipo A00042)
    tentativa := prefixo || (floor(random() * 9 * 10 ^ (digitos - 1)) + 10 ^ (digitos - 1))::bigint::text;
    exit when not exists (select 1 from public.pedidos where codigo = tentativa);
  end loop;

  new.codigo := tentativa;
  return new;
end $$;

drop trigger if exists pedidos_codigo on public.pedidos;
create trigger pedidos_codigo before insert on public.pedidos
  for each row execute function public.gerar_codigo_pedido();

-- A tabela estava vazia quando isto foi criado, então todo pedido terá código.
alter table public.pedidos alter column codigo set not null;

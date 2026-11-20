-- =====================================================================
-- ArtDecor — DADOS DE TESTE (para experimentar o app)
-- Tudo tem id começando com "teste-" e nome com "[TESTE]"/"Teste".
-- Para apagar: supabase/limpar-dados-teste.sql
-- As datas são relativas ao dia em que o script roda.
-- =====================================================================

-- Tema e itens com quantidade definida (para os avisos de conflito aparecerem)
insert into public.temas (id, nome, cor) values
  ('teste-tema-unicornio', '[TESTE] Unicórnio', '#D9718F')
on conflict (id) do nothing;

insert into public.itens (id, nome, categoria, tema_id, tipo, quantidade_total, valor_aluguel) values
  ('teste-item-painel-unicornio', '[TESTE] Painel redondo Unicórnio', 'Painéis',           'teste-tema-unicornio', 'unica',  1, 60),
  ('teste-item-capas-unicornio',  '[TESTE] Trio de capas Unicórnio',  'Painéis',           'teste-tema-unicornio', 'unica',  1, 45),
  ('teste-item-cilindro-rosa',    '[TESTE] Cilindro rosa',            'Cilindros e mesas', 'teste-tema-unicornio', 'varios', 3, 15),
  ('teste-item-bandeja-dourada',  '[TESTE] Bandeja dourada',          'Vidros',            null,                   'varios', 10, 6),
  ('teste-item-toalha-rose',      '[TESTE] Toalha rosé',              'Toalhas',           null,                   'varios', 8, 8)
on conflict (id) do nothing;

-- Clientes
insert into public.clientes (id, nome, telefone, endereco, veiculo) values
  ('teste-cli-ana',   'Ana Teste',   '(53) 90000-0001', 'Rua de Teste, 1, Centro, Jaguarão',  '{"tipo":"Carro","modelo":"Onix","cor":"prata","placa":"TST1A01"}'),
  ('teste-cli-bruno', 'Bruno Teste', '(53) 90000-0002', 'Rua de Teste, 2, Fragata, Jaguarão', '{"tipo":"Caminhonete","modelo":"Strada","cor":"branca","placa":"TST2B02"}'),
  ('teste-cli-carla', 'Carla Teste', '(53) 90000-0003', null,                                null),
  ('teste-cli-diego', 'Diego Teste', '(53) 90000-0004', null,                                '{"tipo":"Moto","modelo":"Fan 160","cor":"preta","placa":"TST4D04"}'),
  ('teste-cli-elisa', 'Elisa Teste', '(53) 90000-0005', 'Rua de Teste, 5, Areal, Jaguarão',   '{"tipo":"Carro","modelo":"HB20","cor":"vermelho","placa":"TST5E05"}')
on conflict (id) do nothing;

-- Pedidos (um insert por vez para os números saírem em ordem)
create or replace function pg_temp.dia(n int) returns text language sql as $$ select to_char(current_date + n, 'YYYY-MM-DD') $$;
create or replace function pg_temp.linha(item text, qtd int, valor numeric) returns jsonb language sql as $$
  select jsonb_build_object('itemId', item, 'quantidade', qtd, 'valorUnitario', valor) $$;
create or replace function pg_temp.pag(id text, valor numeric, n int, forma text) returns jsonb language sql as $$
  select jsonb_build_object('id', id, 'valor', valor, 'data', pg_temp.dia(n), 'forma', forma) $$;

-- 1) Reservado, retira amanhã, com sinal
insert into public.pedidos (id, cliente_id, evento, tema_ids, itens, retirada, devolucao, status, pagamentos)
select 'teste-ped-1', 'teste-cli-ana', 'Aniversário de 7 anos (teste)', array['teste-tema-unicornio'],
  jsonb_build_array(pg_temp.linha('teste-item-painel-unicornio', 1, 60), pg_temp.linha('teste-item-capas-unicornio', 1, 45),
                    pg_temp.linha('teste-item-cilindro-rosa', 2, 15), pg_temp.linha('teste-item-bandeja-dourada', 6, 6)),
  current_date + 1, current_date + 3, 'reservado',
  jsonb_build_array(pg_temp.pag('teste-pg-1', 100, -2, 'Pix'))
where not exists (select 1 from public.pedidos where id = 'teste-ped-1');

-- 2) Reservado, datas cruzando com o 1 (painel único e cilindros a mais) -> conflito
insert into public.pedidos (id, cliente_id, evento, tema_ids, itens, retirada, devolucao, status, pagamentos)
select 'teste-ped-2', 'teste-cli-bruno', 'Chá de bebê (teste)', '{}',
  jsonb_build_array(pg_temp.linha('teste-item-painel-unicornio', 1, 60), pg_temp.linha('teste-item-cilindro-rosa', 2, 15)),
  current_date + 2, current_date + 4, 'reservado', '[]'::jsonb
where not exists (select 1 from public.pedidos where id = 'teste-ped-2');

-- 3) Na rua, volta hoje, pagou uma parte
insert into public.pedidos (id, cliente_id, evento, tema_ids, itens, retirada, devolucao, status, pagamentos)
select 'teste-ped-3', 'teste-cli-carla', 'Jantar de família (teste)', '{}',
  jsonb_build_array(pg_temp.linha('teste-item-toalha-rose', 6, 8), pg_temp.linha('teste-item-bandeja-dourada', 4, 6)),
  current_date - 2, current_date, 'rua',
  jsonb_build_array(pg_temp.pag('teste-pg-3', 30, -3, 'Dinheiro'))
where not exists (select 1 from public.pedidos where id = 'teste-ped-3');

-- 4) Na rua, ATRASADO, já pago
insert into public.pedidos (id, cliente_id, evento, tema_ids, itens, retirada, devolucao, status, pagamentos)
select 'teste-ped-4', 'teste-cli-diego', 'Formatura (teste)', '{}',
  jsonb_build_array(pg_temp.linha('teste-item-cilindro-rosa', 1, 15), pg_temp.linha('teste-item-toalha-rose', 2, 8)),
  current_date - 5, current_date - 1, 'rua',
  jsonb_build_array(pg_temp.pag('teste-pg-4a', 15, -6, 'Pix'), pg_temp.pag('teste-pg-4b', 16, -5, 'Cartão'))
where not exists (select 1 from public.pedidos where id = 'teste-ped-4');

-- 5) Devolvido (histórico)
insert into public.pedidos (id, cliente_id, evento, tema_ids, itens, retirada, devolucao, status, pagamentos)
select 'teste-ped-5', 'teste-cli-elisa', 'Batizado (teste)', '{}',
  jsonb_build_array(pg_temp.linha('teste-item-bandeja-dourada', 5, 6)),
  current_date - 10, current_date - 8, 'devolvido',
  jsonb_build_array(pg_temp.pag('teste-pg-5', 30, -12, 'Pix'))
where not exists (select 1 from public.pedidos where id = 'teste-ped-5');

-- 6) Cancelado
insert into public.pedidos (id, cliente_id, evento, tema_ids, itens, retirada, devolucao, status, pagamentos)
select 'teste-ped-6', 'teste-cli-ana', 'Festa cancelada (teste)', '{}',
  jsonb_build_array(pg_temp.linha('teste-item-toalha-rose', 3, 8)),
  current_date + 6, current_date + 7, 'cancelado', '[]'::jsonb
where not exists (select 1 from public.pedidos where id = 'teste-ped-6');

-- Conferência
select 'pedido' as tipo, '#' || numero || ' ' || status || ' ' || retirada || '→' || devolucao as detalhe from public.pedidos where id like 'teste-%'
union all select 'cliente', nome from public.clientes where id like 'teste-%'
union all select 'item', nome from public.itens where id like 'teste-%'
order by 1, 2;

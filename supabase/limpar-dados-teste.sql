-- =====================================================================
-- ArtDecor — APAGA os dados de teste (tudo com id começando por "teste-")
-- Não mexe em nada real. Depois ajusta a numeração dos pedidos para
-- continuar a partir do maior número real (ou do 1, se não houver pedidos).
-- =====================================================================
delete from public.pedidos  where id like 'teste-%';
delete from public.clientes where id like 'teste-%';
delete from public.itens    where id like 'teste-%';
delete from public.temas    where id like 'teste-%';

select setval(
  pg_get_serial_sequence('public.pedidos', 'numero'),
  coalesce((select max(numero) from public.pedidos), 1),
  (select count(*) > 0 from public.pedidos)
);

select (select count(*) from public.itens)    as itens,
       (select count(*) from public.temas)    as temas,
       (select count(*) from public.clientes) as clientes,
       (select count(*) from public.pedidos)  as pedidos;

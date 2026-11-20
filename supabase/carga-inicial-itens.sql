-- =====================================================================
-- ArtDecor — carga inicial de temas e itens (levantados das fotos do Facebook)
-- Todos os itens entram como "falta contar" (quantidade_total = null) e
-- valor 0, para a Patricia conferir quantidade e preço depois.
-- Pode rodar de novo: não duplica (pula ids e nomes que já existem).
-- =====================================================================

-- Temas (kits) -------------------------------------------------------
insert into public.temas (id, nome, cor)
select v.id, v.nome, v.cor
from (values
  ('tema-herois',                 'Heróis',                 '#3D6A96'),
  ('tema-princesa-sofia',         'Princesa Sofia',         '#8A6FB0'),
  ('tema-now-united',             'Now United',             '#2E2638'),
  ('tema-capivara',               'Capivara',               '#B07A4F'),
  ('tema-bosque',                 'Bosque',                 '#5E8C4A'),
  ('tema-safari',                 'Safari',                 '#C9A23A'),
  ('tema-chuva-de-bencaos',       'Chuva de bênçãos',       '#4A7AA8'),
  ('tema-natal',                  'Natal',                  '#8E2A4E'),
  ('tema-formatura',              'Formatura',              '#4F4A66'),
  ('tema-minecraft',              'Minecraft',              '#5E8C4A'),
  ('tema-meninas-superpoderosas', 'Meninas Superpoderosas', '#D9718F'),
  ('tema-tie-dye',                'Tie-dye',                '#D9718F')
) as v(id, nome, cor)
where not exists (select 1 from public.temas t where t.id = v.id or lower(t.nome) = lower(v.nome));

-- Itens --------------------------------------------------------------
insert into public.itens (id, nome, categoria, tema_id, tipo, quantidade_total, valor_aluguel)
select v.id, v.nome, v.categoria, t.id, 'varios', null, 0
from (values
  -- Painéis
  ('item-muro-ingles',                 'Muro inglês',                              'Painéis', null),
  ('item-cortina-tecido-branca',       'Cortina de tecido branca',                 'Painéis', null),
  ('item-cortina-tecido-verde',        'Cortina de tecido verde',                  'Painéis', null),
  ('item-painel-herois',               'Painel redondo Heróis',                    'Painéis', 'tema-herois'),
  ('item-painel-princesa-sofia',       'Painel redondo Princesa Sofia',            'Painéis', 'tema-princesa-sofia'),
  ('item-painel-now-united',           'Painel redondo Now United',                'Painéis', 'tema-now-united'),
  ('item-painel-capivara',             'Painel redondo Capivara',                  'Painéis', 'tema-capivara'),
  ('item-painel-bosque',               'Painel redondo Bosque',                    'Painéis', 'tema-bosque'),
  ('item-painel-safari',               'Painel redondo Safari',                    'Painéis', 'tema-safari'),
  ('item-painel-tie-dye',              'Painel redondo Tie-dye',                   'Painéis', 'tema-tie-dye'),
  ('item-painel-natal',                'Painel Natal',                             'Painéis', 'tema-natal'),
  ('item-painel-minecraft',            'Painel Minecraft',                         'Painéis', 'tema-minecraft'),
  ('item-painel-meninas-superpod',     'Painel Meninas Superpoderosas',            'Painéis', 'tema-meninas-superpoderosas'),
  ('item-capas-herois',                'Trio de capas de cilindro Heróis',         'Painéis', 'tema-herois'),
  ('item-capas-princesa-sofia',        'Trio de capas de cilindro Princesa Sofia', 'Painéis', 'tema-princesa-sofia'),
  ('item-capas-now-united',            'Trio de capas de cilindro Now United',     'Painéis', 'tema-now-united'),
  ('item-capas-capivara',              'Trio de capas de cilindro Capivara',       'Painéis', 'tema-capivara'),
  ('item-capas-safari',                'Trio de capas de cilindro Safari',         'Painéis', 'tema-safari'),
  ('item-capas-natal',                 'Trio de capas de cilindro Natal',          'Painéis', 'tema-natal'),
  -- Cilindros e mesas
  ('item-cilindro-colorido',           'Cilindro colorido',                        'Cilindros e mesas', null),
  ('item-cilindro-branco',             'Cilindro branco',                          'Cilindros e mesas', null),
  ('item-nicho-cubo',                  'Nicho / cubo colorido',                    'Cilindros e mesas', null),
  ('item-mesa-ferro-preta',            'Mesa de ferro preta (industrial)',         'Cilindros e mesas', null),
  ('item-mesinha-pe-palito',           'Mesinha pé palito',                        'Cilindros e mesas', null),
  ('item-mesa-madeira',                'Mesa de madeira',                          'Cilindros e mesas', null),
  ('item-mesa-branca',                 'Mesa branca',                              'Cilindros e mesas', null),
  -- Móveis
  ('item-comoda-provencal',            'Cômoda provençal branca',                  'Móveis', null),
  ('item-balcao-provencal',            'Balcão provençal branco',                  'Móveis', null),
  ('item-bau-branco',                  'Baú branco',                               'Móveis', null),
  ('item-mala-branca',                 'Mala decorativa branca',                   'Móveis', null),
  ('item-carrinho-roda',               'Carrinho de roda',                         'Móveis', null),
  ('item-gaiola-decorativa',           'Gaiola decorativa',                        'Móveis', null),
  -- Vidros
  ('item-boleira-vidro',               'Boleira de vidro',                         'Vidros', null),
  ('item-suqueira-vidro',              'Suqueira de vidro',                        'Vidros', null),
  ('item-vaso-cristal-alto',           'Vaso de cristal alto',                     'Vidros', null),
  ('item-bandeja-espelhada',           'Bandeja espelhada',                        'Vidros', null),
  ('item-bandeja-vidro',               'Bandeja de vidro',                         'Vidros', null),
  ('item-pote-vidro-tampa',            'Pote de vidro com tampa',                  'Vidros', null),
  -- Vasos e plantas
  ('item-vaso-branco',                 'Vaso branco',                              'Vasos e plantas', null),
  ('item-topiaria-buxinho',            'Topiaria (buxinho)',                       'Vasos e plantas', null),
  ('item-arranjo-flores',              'Arranjo de flores',                        'Vasos e plantas', null),
  ('item-vaso-folhagem',               'Vaso com folhagem',                        'Vasos e plantas', null),
  -- Pisos
  ('item-piso-xadrez',                 'Piso xadrez preto e branco',               'Pisos', null),
  ('item-grama-sintetica',             'Grama sintética',                          'Pisos', null),
  ('item-tapete-pelucia',              'Tapete de pelúcia colorido',               'Pisos', null),
  -- Toalhas
  ('item-toalha-vermelha',             'Toalha vermelha',                          'Toalhas', null),
  ('item-toalha-branca',               'Toalha branca',                            'Toalhas', null),
  ('item-caminho-mesa-vermelho',       'Caminho de mesa vermelho',                 'Toalhas', null),
  ('item-capa-cadeira-branca',         'Capa de cadeira branca',                   'Toalhas', null),
  -- Iluminação
  ('item-neon-formei',                 'Neon “Formei”',                            'Iluminação', 'tema-formatura'),
  ('item-neon-capelo',                 'Neon capelo',                              'Iluminação', 'tema-formatura'),
  ('item-letreiro-luminoso',           'Letreiro luminoso (lightbox)',             'Iluminação', null),
  ('item-cortina-led',                 'Cortina de LED',                           'Iluminação', null),
  ('item-cordao-luz-bolinhas',         'Cordão de luz de bolinhas',                'Iluminação', null),
  -- Enfeites
  ('item-predios-mdf',                 'Prédios de MDF (Homem-Aranha)',            'Enfeites', 'tema-herois'),
  ('item-bonecos-vingadores',          'Bonecos Vingadores',                       'Enfeites', 'tema-herois'),
  ('item-boneca-princesa-sofia',       'Boneca Princesa Sofia',                    'Enfeites', 'tema-princesa-sofia'),
  ('item-bichinhos-pelucia',           'Bichinhos de pelúcia (bosque)',            'Enfeites', 'tema-bosque'),
  ('item-nuvens-gotas',                'Nuvens com gotas',                         'Enfeites', 'tema-chuva-de-bencaos'),
  ('item-bandeirolas',                 'Bandeirolas',                              'Enfeites', null),
  ('item-letras-mdf',                  'Letras grandes de MDF',                    'Enfeites', null),
  ('item-numeros-mdf',                 'Números grandes de MDF',                   'Enfeites', null),
  -- Balões
  ('item-arco-baloes',                 'Arco de balões',                           'Balões', null)
) as v(id, nome, categoria, tema)
left join public.temas t on t.id = v.tema
where not exists (select 1 from public.itens i where i.id = v.id or (lower(i.nome) = lower(v.nome) and not i.removido));

-- Conferência
select (select count(*) from public.temas where not removido) as temas,
       (select count(*) from public.itens where not removido) as itens,
       (select count(*) from public.itens where not removido and quantidade_total is null) as falta_contar;

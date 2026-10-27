begin;

do $$
declare
  v_loja uuid;
begin
  insert into public.lojas (nome, slug, descricao, categoria, filtros)
  values (
    'Loja de Testes VillaCollab', 'villacollab-loja-teste',
    'Loja de demonstração para testar o carrinho, as quantidades e a criação de pedidos.',
    'Moda',
    '[
      {"id":"tamanho","nome":"Tamanho","tipo":"checkbox","opcoes":[
        {"id":"p","nome":"P"},{"id":"m","nome":"M"},{"id":"g","nome":"G"},{"id":"gg","nome":"GG"}]},
      {"id":"cor","nome":"Cor","tipo":"radio","opcoes":[
        {"id":"preto","nome":"Preto"},{"id":"branco","nome":"Branco"},{"id":"cru","nome":"Cru"}]}
    ]'::jsonb
  )
  on conflict (slug) do update set
    categoria = excluded.categoria,
    filtros = excluded.filtros;

  select id into strict v_loja from public.lojas where slug = 'villacollab-loja-teste';

  insert into public.produtos
    (id, loja_id, nome, descricao, preco, preco_antigo, estoque, categoria, atributos, variacoes, filtros)
  values
    ('853df2ba-7ea1-4e37-9fa3-6ad21cf22101', v_loja, 'Caneca VillaCollab',
      'Caneca de cerâmica para testar a adição ao carrinho.', 29.90, null, 12, 'Casa',
      '[{"nome":"Material","valor":"Cerâmica"},{"nome":"Capacidade","valor":"300 ml"}]',
      '[]', '{"cor":["branco"]}'),
    ('853df2ba-7ea1-4e37-9fa3-6ad21cf22102', v_loja, 'Camiseta Básica',
      'Camiseta de algodão para testar variações de tamanho e cor.', 59.90, 79.90, 8, 'Roupas',
      '[{"nome":"Tecido","valor":"100% algodão"},{"nome":"Modelagem","valor":"Regular"}]',
      '[{"id":"tamanho","nome":"Tamanho","opcoes":[{"id":"p","nome":"P"},{"id":"m","nome":"M"},{"id":"g","nome":"G"}]},
        {"id":"cor","nome":"Cor","opcoes":[{"id":"preto","nome":"Preto"},{"id":"branco","nome":"Branco"}]}]',
      '{"tamanho":["p","m","g"],"cor":["preto","branco"]}'),
    ('853df2ba-7ea1-4e37-9fa3-6ad21cf22103', v_loja, 'Ecobag Villa',
      'Estoque limitado a duas unidades para testar o limite de quantidade.', 24.90, null, 2, 'Acessórios',
      '[{"nome":"Material","valor":"Lona crua"}]', '[]', '{"cor":["cru"]}'),
    ('853df2ba-7ea1-4e37-9fa3-6ad21cf22104', v_loja, 'Caderno Villa',
      'Produto sem estoque para testar a exibição de indisponibilidade.', 19.90, null, 0, 'Papelaria',
      '[]', '[]', '{}')
  on conflict (id) do update set
    preco_antigo = excluded.preco_antigo,
    categoria = excluded.categoria,
    atributos = excluded.atributos,
    variacoes = excluded.variacoes,
    filtros = excluded.filtros;
end;
$$;

commit;

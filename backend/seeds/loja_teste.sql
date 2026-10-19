begin;

do $$
declare
  v_loja uuid;
begin
  insert into public.lojas (nome, slug, descricao)
  values ('Loja de Testes VillaCollab', 'villacollab-loja-teste',
    'Loja de demonstração para testar o carrinho, as quantidades e a criação de pedidos. Produtos de teste.')
  on conflict (slug) do nothing;

  select id into strict v_loja from public.lojas where slug = 'villacollab-loja-teste';

  insert into public.produtos (id, loja_id, nome, descricao, preco, estoque) values
    ('853df2ba-7ea1-4e37-9fa3-6ad21cf22101', v_loja, 'Caneca VillaCollab',
      'Caneca de demonstração para testar a adição ao carrinho.', 29.90, 12),
    ('853df2ba-7ea1-4e37-9fa3-6ad21cf22102', v_loja, 'Camiseta Básica',
      'Camiseta de demonstração para testar um pedido com vários produtos.', 59.90, 8),
    ('853df2ba-7ea1-4e37-9fa3-6ad21cf22103', v_loja, 'Ecobag Villa',
      'Produto com estoque limitado a duas unidades para testar o limite de quantidade.', 24.90, 2),
    ('853df2ba-7ea1-4e37-9fa3-6ad21cf22104', v_loja, 'Caderno Villa',
      'Produto sem estoque para testar a exibição de indisponibilidade.', 19.90, 0)
  on conflict (id) do nothing;
end;
$$;

commit;

select l.id as loja_id, l.nome as loja, p.id as produto_id, p.nome, p.preco, p.estoque
from public.lojas l join public.produtos p on p.loja_id = l.id
where l.slug = 'villacollab-loja-teste'
order by p.nome;

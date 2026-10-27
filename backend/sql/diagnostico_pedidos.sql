-- Somente leitura: lista pedidos com total ou itens inconsistentes.
select p.id, p.loja_id, p.usuario_id, p.status, p.total, coalesce(sum(i.subtotal), 0) as soma_itens, p.created_at
from public.pedidos p
left join public.itens_pedido i on i.pedido_id = p.id
group by p.id
having p.total <> coalesce(sum(i.subtotal), 0)
order by p.created_at desc;

select p.id, p.loja_id, p.usuario_id, p.status, p.total, p.created_at
from public.pedidos p
where not exists (select 1 from public.itens_pedido i where i.pedido_id = p.id)
order by p.created_at desc;

select i.id, i.pedido_id, i.quantidade, i.preco_unitario, i.subtotal
from public.itens_pedido i
where i.subtotal <> i.quantidade * i.preco_unitario;

select i.id, i.pedido_id, p.loja_id as loja_do_pedido, pr.loja_id as loja_do_produto
from public.itens_pedido i
join public.pedidos p on p.id = i.pedido_id
join public.produtos pr on pr.id = i.produto_id
where pr.loja_id <> p.loja_id;

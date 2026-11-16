begin;

create or replace function public.telefone_whatsapp_valido(p_telefone text)
returns boolean language sql immutable set search_path = '' as $$
  select p_telefone is not null
     and p_telefone ~ '^\+?[0-9()\-\s]+$'
     and char_length(p_telefone) <= 20
     and ((p_telefone !~ '\+' and regexp_replace(p_telefone, '\D', '', 'g') ~ '^[1-9][0-9]{9,10}$')
          or regexp_replace(p_telefone, '\D', '', 'g') ~ '^55[1-9][0-9]{9,10}$');
$$;

alter table public.pedidos drop constraint if exists pedidos_forma_pagamento_valida;
alter table public.pedidos add constraint pedidos_forma_pagamento_valida
  check (forma_pagamento is null or forma_pagamento in ('pix', 'cartao', 'whatsapp'));

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'lojas_telefone_whatsapp'
             and conrelid = 'public.lojas'::regclass) then
    null;
  elsif exists (select 1 from public.lojas where not public.telefone_whatsapp_valido(telefone)) then
    raise notice 'lojas_telefone_whatsapp não criada: existem lojas sem WhatsApp válido';
  else
    alter table public.lojas add constraint lojas_telefone_whatsapp
      check (public.telefone_whatsapp_valido(telefone));
  end if;
end;
$$;

create or replace function public.criar_pedido(
  p_loja_id uuid,
  p_itens jsonb,
  p_endereco jsonb default null,
  p_forma_pagamento text default null,
  p_parcelas integer default null,
  p_chave uuid default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_item record;
  v_produto record;
  v_loja record;
  v_total numeric := 0;
begin
  if v_user is null then raise exception 'VC_FORBIDDEN'; end if;
  if not exists (select 1 from public.usuarios where id = v_user) then
    raise exception 'VC_FORBIDDEN';
  end if;

  if p_chave is not null then
    select id into v_id from public.pedidos where usuario_id = v_user and chave_idempotencia = p_chave;
    if found then return v_id; end if;
  end if;

  select id, aceita_pedidos, pedido_minimo, confirmar_automaticamente, telefone into v_loja
    from public.lojas where id = p_loja_id;
  if not found then raise exception 'VC_NOT_FOUND'; end if;
  if not v_loja.aceita_pedidos then raise exception 'VC_CLOSED'; end if;
  if not public.telefone_whatsapp_valido(v_loja.telefone) then raise exception 'VC_CONTACT'; end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array'
    or jsonb_array_length(p_itens) not between 1 and 50 then
    raise exception 'VC_INVALID';
  end if;
  if exists (select 1 from jsonb_array_elements(p_itens) e
    where jsonb_typeof(e.value) <> 'object'
       or not (e.value ? 'produto_id' and e.value ? 'quantidade')
       or (e.value ? 'variacoes' and jsonb_typeof(e.value -> 'variacoes') <> 'object')) then
    raise exception 'VC_INVALID';
  end if;
  if (select count(*) from jsonb_array_elements(p_itens)) <>
    (select count(distinct (e.value ->> 'produto_id') || '|' ||
        coalesce(e.value -> 'variacoes', '{}'::jsonb)::text)
      from jsonb_array_elements(p_itens) e) then
    raise exception 'VC_INVALID';
  end if;
  if p_endereco is not null and jsonb_typeof(p_endereco) <> 'object' then
    raise exception 'VC_INVALID';
  end if;
  if p_forma_pagamento is not null and p_forma_pagamento not in ('pix', 'cartao', 'whatsapp') then
    raise exception 'VC_INVALID';
  end if;
  if p_parcelas is not null and (p_forma_pagamento is distinct from 'cartao'
    or p_parcelas not between 1 and 12) then
    raise exception 'VC_INVALID';
  end if;

  insert into public.pedidos(usuario_id, loja_id, endereco_entrega, forma_pagamento, parcelas, chave_idempotencia)
    values (v_user, p_loja_id, p_endereco, p_forma_pagamento, p_parcelas, p_chave)
    on conflict (usuario_id, chave_idempotencia) where chave_idempotencia is not null do nothing
    returning id into v_id;
  if v_id is null then
    select id into v_id from public.pedidos where usuario_id = v_user and chave_idempotencia = p_chave;
    return v_id;
  end if;

  for v_item in select e.value ->> 'produto_id' as produto_id,
      (e.value ->> 'quantidade')::integer as quantidade,
      coalesce(e.value -> 'variacoes', '{}'::jsonb) as variacoes
    from jsonb_array_elements(p_itens) e order by e.value ->> 'produto_id'
  loop
    if v_item.quantidade not between 1 and 1000 then raise exception 'VC_INVALID'; end if;
    select id, loja_id, preco, estoque, variacoes, ativo into v_produto from public.produtos
      where id = v_item.produto_id::uuid for update;
    if not found or v_produto.loja_id <> p_loja_id then raise exception 'VC_NOT_FOUND'; end if;
    if not v_produto.ativo then raise exception 'VC_INACTIVE'; end if;

    if exists (select 1 from jsonb_each(v_item.variacoes) s
      where jsonb_typeof(s.value) <> 'string'
         or not exists (select 1
           from jsonb_array_elements(v_produto.variacoes) v
           cross join lateral jsonb_array_elements(v -> 'opcoes') o
           where v ->> 'id' = s.key and o ->> 'id' = s.value #>> '{}')) then
      raise exception 'VC_INVALID';
    end if;
    if exists (select 1 from jsonb_array_elements(v_produto.variacoes) v
      where not (v_item.variacoes ? (v ->> 'id'))) then
      raise exception 'VC_INVALID';
    end if;

    if v_produto.estoque < v_item.quantidade then raise exception 'VC_STOCK'; end if;
    if v_total + v_produto.preco * v_item.quantidade > 99999999.99 then
      raise exception 'VC_INVALID';
    end if;
    update public.produtos set estoque = estoque - v_item.quantidade where id = v_produto.id;
    insert into public.itens_pedido(pedido_id, produto_id, quantidade, preco_unitario, subtotal, variacoes)
      values (v_id, v_produto.id, v_item.quantidade, v_produto.preco,
        v_produto.preco * v_item.quantidade, v_item.variacoes);
    v_total := v_total + v_produto.preco * v_item.quantidade;
  end loop;

  if v_total < v_loja.pedido_minimo then raise exception 'VC_MINIMUM'; end if;

  update public.pedidos
    set total = v_total,
        status = case when v_loja.confirmar_automaticamente then 'aceito' else 'pendente' end
    where id = v_id;
  return v_id;
end;
$$;

revoke all on function public.criar_pedido(uuid, jsonb, jsonb, text, integer, uuid) from public, anon;
grant execute on function public.criar_pedido(uuid, jsonb, jsonb, text, integer, uuid) to authenticated;

commit;

notify pgrst, 'reload schema';

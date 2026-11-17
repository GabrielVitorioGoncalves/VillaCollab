begin;

create or replace function public.admin_tem_permissao(p_permissao text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(p_permissao = any(public.admin_permissoes_efetivas((select auth.uid()))), false)
     and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

create or replace function public.loja_ativa(p_loja_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select ativa from public.lojas where id = p_loja_id), false);
$$;

create or replace function public.comprou_produto(p_produto_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.itens_pedido i
    join public.pedidos p on p.id = i.pedido_id
    where i.produto_id = p_produto_id and p.usuario_id = (select auth.uid()));
$$;

create or replace function public.comprou_na_loja(p_loja_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pedidos
    where loja_id = p_loja_id and usuario_id = (select auth.uid()));
$$;

revoke all on function public.loja_ativa(uuid) from public;
revoke all on function public.comprou_produto(uuid) from public, anon;
revoke all on function public.comprou_na_loja(uuid) from public, anon;
grant execute on function public.loja_ativa(uuid) to anon, authenticated;
grant execute on function public.comprou_produto(uuid) to authenticated;
grant execute on function public.comprou_na_loja(uuid) to authenticated;

drop policy if exists produtos_leitura on public.produtos;
drop policy if exists produtos_leitura_publica on public.produtos;
create policy produtos_leitura_publica on public.produtos for select to anon
  using (ativo and public.loja_ativa(loja_id));
create policy produtos_leitura on public.produtos for select to authenticated
  using ((ativo and public.loja_ativa(loja_id))
         or public.e_lojista_da(loja_id)
         or public.admin_tem_permissao('produtos')
         or public.admin_tem_permissao('lojas')
         or public.comprou_produto(id));

drop policy if exists lojas_leitura on public.lojas;
drop policy if exists lojas_leitura_publica on public.lojas;
create policy lojas_leitura_publica on public.lojas for select to anon
  using (ativa);
create policy lojas_leitura on public.lojas for select to authenticated
  using (ativa
         or public.e_lojista_da(id)
         or public.admin_tem_permissao('lojas')
         or public.comprou_na_loja(id));

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
  if public.e_lojista_da(p_loja_id) then raise exception 'VC_FORBIDDEN: propria'; end if;
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

create or replace function public.avaliar_produto(p_produto_id uuid, p_nota integer, p_comentario text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_loja uuid;
begin
  if v_user is null then raise exception 'VC_FORBIDDEN'; end if;
  if p_nota is null or p_nota not between 1 and 5 then raise exception 'VC_INVALID'; end if;
  if p_comentario is not null and char_length(p_comentario) > 2000 then raise exception 'VC_INVALID'; end if;
  select loja_id into v_loja from public.produtos where id = p_produto_id;
  if not found then raise exception 'VC_NOT_FOUND'; end if;
  if public.e_lojista_da(v_loja) then raise exception 'VC_FORBIDDEN'; end if;
  if not exists (select 1 from public.pedidos p
    join public.itens_pedido i on i.pedido_id = p.id
    where p.usuario_id = v_user and p.status = 'concluido' and i.produto_id = p_produto_id) then
    raise exception 'VC_FORBIDDEN';
  end if;

  insert into public.avaliacoes(produto_id, usuario_id, nota, comentario)
    values (p_produto_id, v_user, p_nota, nullif(trim(p_comentario), ''))
    on conflict (produto_id, usuario_id)
    do update set nota = excluded.nota, comentario = excluded.comentario, updated_at = now();

  update public.produtos set
    nota_media = (select round(avg(nota), 2) from public.avaliacoes where produto_id = p_produto_id),
    total_avaliacoes = (select count(*) from public.avaliacoes where produto_id = p_produto_id)
    where id = p_produto_id;
  update public.lojas set
    nota_media = (select round(avg(a.nota), 2) from public.avaliacoes a
      join public.produtos pr on pr.id = a.produto_id where pr.loja_id = v_loja),
    total_avaliacoes = (select count(*) from public.avaliacoes a
      join public.produtos pr on pr.id = a.produto_id where pr.loja_id = v_loja)
    where id = v_loja;
end;
$$;

revoke all on function public.avaliar_produto(uuid, integer, text) from public, anon;
grant execute on function public.avaliar_produto(uuid, integer, text) to authenticated;

create or replace function public.expirar_pedidos_pendentes(p_horas integer default 48)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_pedido record;
  v_item record;
  v_total integer := 0;
begin
  for v_pedido in
    select id from public.pedidos
     where status = 'pendente' and created_at < now() - make_interval(hours => greatest(p_horas, 1))
     order by created_at
     for update skip locked
  loop
    for v_item in select produto_id, quantidade from public.itens_pedido
      where pedido_id = v_pedido.id order by produto_id
    loop
      update public.produtos set estoque = estoque + v_item.quantidade where id = v_item.produto_id;
    end loop;
    update public.pedidos set status = 'cancelado', updated_at = now() where id = v_pedido.id;
    v_total := v_total + 1;
  end loop;
  return v_total;
end;
$$;

revoke all on function public.expirar_pedidos_pendentes(integer) from public, anon, authenticated;

create or replace function public.anonimizar_minha_conta()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_tem_pedidos boolean;
begin
  if v_user is null then raise exception 'VC_FORBIDDEN'; end if;
  select role into v_role from public.usuarios where id = v_user for update;
  if not found then raise exception 'VC_NOT_FOUND'; end if;
  if v_role = 'admin' then raise exception 'VC_FORBIDDEN: admin'; end if;
  if v_role = 'lojista' then raise exception 'VC_FORBIDDEN: lojista'; end if;
  if exists (select 1 from public.pedidos
             where usuario_id = v_user and status in ('pendente', 'aceito', 'enviado')) then
    raise exception 'VC_CONFLICT: pedidos';
  end if;

  v_tem_pedidos := exists (select 1 from public.pedidos where usuario_id = v_user);
  update public.pedidos set endereco_entrega = null where usuario_id = v_user;
  delete from public.carrinho_itens where usuario_id = v_user;
  update public.avaliacoes set comentario = null where usuario_id = v_user;
  update public.usuarios set nome = 'Usuário removido', telefone = null, endereco = null where id = v_user;
  insert into public.auditoria (ator, acao, alvo_tipo, alvo_id, detalhes)
  values (v_user, 'conta_anonimizada', 'usuario', v_user, jsonb_build_object('tinha_pedidos', v_tem_pedidos));
  return v_tem_pedidos;
end;
$$;

revoke all on function public.anonimizar_minha_conta() from public, anon;
grant execute on function public.anonimizar_minha_conta() to authenticated;

commit;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'cancelar-pendentes') then
      perform cron.unschedule('cancelar-pendentes');
    end if;
    perform cron.schedule('expirar-pedidos-pendentes', '7 * * * *',
      'select public.expirar_pedidos_pendentes(48)');
  else
    raise notice 'pg_cron não está ativo: os pedidos pendentes não vão expirar sozinhos';
  end if;
end;
$$;

notify pgrst, 'reload schema';

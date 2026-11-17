begin;

create or replace function public.limitar_pedidos_pendentes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from 'pendente' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('pedidos_pendentes:' || new.usuario_id::text));
  if (select count(*) from public.pedidos
       where usuario_id = new.usuario_id and status in ('pendente', 'aceito')) >= 20 then
    raise exception 'VC_LIMIT';
  end if;
  if (select count(*) from public.pedidos
       where usuario_id = new.usuario_id and loja_id = new.loja_id
         and status in ('pendente', 'aceito')) >= 10 then
    raise exception 'VC_LIMIT';
  end if;
  if (select count(*) from public.pedidos
       where usuario_id = new.usuario_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'VC_LIMIT';
  end if;
  return new;
end;
$$;

revoke all on function public.limitar_pedidos_pendentes() from public, anon, authenticated;

create or replace function public.admin_validar_exclusao_usuario(p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_alvo public.usuarios%rowtype;
  v_perms text[];
begin
  if not public.admin_tem_permissao('usuarios') then
    raise exception 'VC_FORBIDDEN';
  end if;
  v_perms := public.admin_permissoes_efetivas((select auth.uid()));
  if p_usuario = (select auth.uid()) then
    raise exception 'VC_FORBIDDEN: proprio';
  end if;
  select * into v_alvo from public.usuarios where id = p_usuario;
  if not found then
    raise exception 'VC_NOT_FOUND';
  end if;
  if v_alvo.role = 'admin' and not (public.admin_permissoes_efetivas(p_usuario) <@ v_perms) then
    raise exception 'VC_FORBIDDEN: superior';
  end if;
  if exists (select 1 from public.pedidos where usuario_id = p_usuario) then
    raise exception 'VC_CONFLICT: pedidos';
  end if;
  insert into public.auditoria (ator, acao, alvo_tipo, alvo_id, detalhes)
  values ((select auth.uid()), 'exclusao_usuario_solicitada', 'usuario', p_usuario,
          jsonb_build_object('role', v_alvo.role, 'loja_id', v_alvo.loja_id));
end;
$$;

revoke all on function public.admin_validar_exclusao_usuario(uuid) from public, anon;
grant execute on function public.admin_validar_exclusao_usuario(uuid) to authenticated;

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
    begin
      for v_item in select produto_id, quantidade from public.itens_pedido
        where pedido_id = v_pedido.id order by produto_id
      loop
        update public.produtos set estoque = estoque + v_item.quantidade where id = v_item.produto_id;
      end loop;
      update public.pedidos set status = 'cancelado', updated_at = now() where id = v_pedido.id;
      v_total := v_total + 1;
    exception when others then
      raise warning 'pedido % não expirou: %', v_pedido.id, sqlerrm;
    end;
  end loop;
  return v_total;
end;
$$;

revoke all on function public.expirar_pedidos_pendentes(integer) from public, anon, authenticated;

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
       or (e.value ->> 'produto_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or (e.value ->> 'quantidade') !~ '^[0-9]{1,4}$'
       or (e.value ? 'variacoes' and jsonb_typeof(e.value -> 'variacoes') <> 'object')) then
    raise exception 'VC_INVALID';
  end if;
  if (select count(*) from jsonb_array_elements(p_itens)) <>
    (select count(distinct lower(e.value ->> 'produto_id') || '|' ||
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
    from jsonb_array_elements(p_itens) e order by (e.value ->> 'produto_id')::uuid
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

  perform 1 from public.lojas where id = v_loja for update;
  perform 1 from public.produtos where id = p_produto_id for update;

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

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'produtos_estoque_maximo'
             and conrelid = 'public.produtos'::regclass) then
    null;
  elsif exists (select 1 from public.produtos where estoque > 1000000) then
    raise notice 'produtos_estoque_maximo não criada: existem produtos com estoque acima de 1.000.000';
  else
    alter table public.produtos add constraint produtos_estoque_maximo check (estoque <= 1000000);
  end if;

  if exists (select 1 from pg_constraint where conname = 'usuarios_endereco_tamanho'
             and conrelid = 'public.usuarios'::regclass) then
    null;
  elsif exists (select 1 from public.usuarios where octet_length(endereco::text) > 4096) then
    raise notice 'usuarios_endereco_tamanho não criada: existem endereços acima de 4 KB';
  else
    alter table public.usuarios add constraint usuarios_endereco_tamanho
      check (endereco is null or octet_length(endereco::text) <= 4096);
  end if;

  if exists (select 1 from pg_constraint where conname = 'pedidos_endereco_tamanho'
             and conrelid = 'public.pedidos'::regclass) then
    null;
  elsif exists (select 1 from public.pedidos where octet_length(endereco_entrega::text) > 4096) then
    raise notice 'pedidos_endereco_tamanho não criada: existem pedidos com endereço acima de 4 KB';
  else
    alter table public.pedidos add constraint pedidos_endereco_tamanho
      check (endereco_entrega is null or octet_length(endereco_entrega::text) <= 4096);
  end if;

  if exists (select 1 from pg_constraint where conname = 'lojas_notificacoes_tamanho'
             and conrelid = 'public.lojas'::regclass) then
    null;
  elsif exists (select 1 from public.lojas where octet_length(notificacoes::text) > 1024) then
    raise notice 'lojas_notificacoes_tamanho não criada: existem lojas com notificações acima de 1 KB';
  else
    alter table public.lojas add constraint lojas_notificacoes_tamanho
      check (notificacoes is null or octet_length(notificacoes::text) <= 1024);
  end if;
end;
$$;

revoke execute on function public.e_admin() from public, anon;
revoke execute on function public.e_lojista_da(uuid) from public, anon;
revoke execute on function public.criar_perfil_usuario() from public, anon, authenticated;
grant execute on function public.e_admin() to authenticated;
grant execute on function public.e_lojista_da(uuid) to authenticated;

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
revoke insert, update, delete on all tables in schema public from anon;
revoke all on public.pedidos, public.itens_pedido, public.carrinho_itens, public.auditoria from anon;

commit;

notify pgrst, 'reload schema';

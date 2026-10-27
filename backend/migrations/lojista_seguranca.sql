-- Rodar depois de migrations/carrinho.sql.
begin;

drop policy if exists "Cliente pode criar seus pedidos" on public.pedidos;
drop policy if exists "Lojista pode atualizar pedidos da sua loja" on public.pedidos;
drop policy if exists "Cliente pode adicionar itens ao seu pedido" on public.itens_pedido;
drop policy if exists "Lojista pode atualizar itens dos pedidos" on public.itens_pedido;
drop policy if exists "Lojista pode excluir itens dos pedidos" on public.itens_pedido;
drop policy if exists "Usuário pode criar seu próprio perfil" on public.usuarios;
drop policy if exists "Lojista pode criar loja" on public.lojas;

revoke insert, update, delete on public.pedidos from anon, authenticated;
revoke insert, update, delete on public.itens_pedido from anon, authenticated;
revoke insert, update, delete on public.avaliacoes from anon, authenticated;
revoke insert, update, delete on public.carrinho_itens from anon, authenticated;

alter table public.produtos add column if not exists ativo boolean not null default true;
create index if not exists produtos_loja_idx on public.produtos (loja_id);

alter table public.lojas
  add column if not exists email_contato varchar(255),
  add column if not exists telefone varchar(20),
  add column if not exists aceita_pedidos boolean not null default true,
  add column if not exists exibir_estoque boolean not null default true,
  add column if not exists confirmar_automaticamente boolean not null default false,
  add column if not exists prazo_preparo_dias smallint,
  add column if not exists pedido_minimo numeric(10, 2) not null default 0,
  add column if not exists notificacoes jsonb not null
    default '{"email": true, "pedidos": true, "estoque_baixo": false}'::jsonb;
alter table public.lojas drop constraint if exists lojas_prazo_preparo_valido;
alter table public.lojas add constraint lojas_prazo_preparo_valido
  check (prazo_preparo_dias is null or prazo_preparo_dias between 0 and 365);
alter table public.lojas drop constraint if exists lojas_pedido_minimo_valido;
alter table public.lojas add constraint lojas_pedido_minimo_valido
  check (pedido_minimo >= 0 and pedido_minimo <= 99999999.99);
alter table public.lojas drop constraint if exists lojas_notificacoes_objeto;
alter table public.lojas add constraint lojas_notificacoes_objeto
  check (jsonb_typeof(notificacoes) = 'object');

revoke insert, update on public.produtos from anon, authenticated;
grant insert (loja_id, nome, descricao, preco, preco_antigo, estoque, categoria,
  imagens, atributos, variacoes, filtros, ativo) on public.produtos to authenticated;
grant update (nome, descricao, preco, preco_antigo, estoque, categoria,
  imagens, atributos, variacoes, filtros, ativo) on public.produtos to authenticated;

revoke insert, update on public.lojas from anon, authenticated;
grant insert (nome, slug, descricao, categoria, logo_url, banner_url, filtros,
  email_contato, telefone, aceita_pedidos, exibir_estoque, confirmar_automaticamente,
  prazo_preparo_dias, pedido_minimo, notificacoes) on public.lojas to authenticated;
grant update (nome, slug, descricao, categoria, logo_url, banner_url, filtros,
  email_contato, telefone, aceita_pedidos, exibir_estoque, confirmar_automaticamente,
  prazo_preparo_dias, pedido_minimo, notificacoes) on public.lojas to authenticated;

alter table public.pedidos drop constraint if exists pedidos_status_valido;
alter table public.pedidos add constraint pedidos_status_valido
  check (status in ('pendente', 'aceito', 'enviado', 'concluido', 'cancelado'));

alter table public.pedidos add column if not exists chave_idempotencia uuid;
create unique index if not exists pedidos_chave_idempotencia_unica
  on public.pedidos (usuario_id, chave_idempotencia) where chave_idempotencia is not null;
create index if not exists pedidos_loja_idx on public.pedidos (loja_id, created_at desc);
create index if not exists pedidos_usuario_idx on public.pedidos (usuario_id, created_at desc);
create index if not exists itens_pedido_pedido_idx on public.itens_pedido (pedido_id);

drop function if exists public.criar_pedido(uuid, jsonb, jsonb, text, integer);
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

  select id, aceita_pedidos, pedido_minimo, confirmar_automaticamente into v_loja
    from public.lojas where id = p_loja_id;
  if not found then raise exception 'VC_NOT_FOUND'; end if;
  if not v_loja.aceita_pedidos then raise exception 'VC_CLOSED'; end if;

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
  if p_forma_pagamento is not null and p_forma_pagamento not in ('pix', 'cartao') then
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

  -- Ordem fixa dos bloqueios reduz impasses em pedidos simultâneos.
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

create or replace function public.atualizar_status_pedido(p_pedido_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_pedido record;
  v_item record;
  v_seller boolean;
begin
  if auth.uid() is null then raise exception 'VC_FORBIDDEN'; end if;
  select id, usuario_id, loja_id, status into v_pedido from public.pedidos
    where id = p_pedido_id for update;
  if not found then raise exception 'VC_NOT_FOUND'; end if;
  v_seller := public.e_lojista_da(v_pedido.loja_id) or public.e_admin();
  if not v_seller and v_pedido.usuario_id <> auth.uid() then raise exception 'VC_NOT_FOUND'; end if;

  if p_status = 'cancelado' then
    if v_pedido.status not in ('pendente', 'aceito') then raise exception 'VC_CONFLICT'; end if;
    if not v_seller and not (v_pedido.usuario_id = auth.uid() and v_pedido.status = 'pendente') then
      raise exception 'VC_FORBIDDEN';
    end if;
    for v_item in select produto_id, quantidade from public.itens_pedido
      where pedido_id = p_pedido_id order by produto_id
    loop
      update public.produtos set estoque = estoque + v_item.quantidade where id = v_item.produto_id;
    end loop;
  elsif not v_seller then
    raise exception 'VC_FORBIDDEN';
  elsif p_status = 'aceito' and v_pedido.status = 'pendente' then
    null;
  elsif p_status = 'enviado' and v_pedido.status = 'aceito' then
    null;
  elsif p_status = 'concluido' and v_pedido.status in ('aceito', 'enviado') then
    null;
  else
    raise exception 'VC_CONFLICT';
  end if;
  update public.pedidos set status = p_status, updated_at = now() where id = p_pedido_id;
end;
$$;

create or replace function public.clientes_da_loja(p_loja_id uuid)
returns table (usuario_id uuid, nome text, telefone text, email text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.e_lojista_da(p_loja_id) or public.e_admin()) then
    raise exception 'VC_FORBIDDEN';
  end if;
  return query
    select u.id, u.nome::text, u.telefone::text, a.email::text
    from public.usuarios u
    left join auth.users a on a.id = u.id
    where exists (select 1 from public.pedidos p where p.usuario_id = u.id and p.loja_id = p_loja_id);
end;
$$;

revoke all on function public.criar_pedido(uuid, jsonb, jsonb, text, integer, uuid) from public, anon;
revoke all on function public.atualizar_status_pedido(uuid, text) from public, anon;
revoke all on function public.clientes_da_loja(uuid) from public, anon;
grant execute on function public.criar_pedido(uuid, jsonb, jsonb, text, integer, uuid) to authenticated;
grant execute on function public.atualizar_status_pedido(uuid, text) to authenticated;
grant execute on function public.clientes_da_loja(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage')
     and exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'storage' and c.relname = 'buckets') then
    begin
      insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        values ('lojas', 'lojas', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
        on conflict (id) do nothing;
    exception when insufficient_privilege then
      raise warning 'Sem permissão para criar o bucket "lojas". Crie em Storage > New bucket (público, 5 MB, PNG/JPG/WEBP).';
    end;

    begin
    execute 'drop policy if exists "lojas_imagens_envio" on storage.objects';
    execute 'drop policy if exists "lojas_imagens_troca" on storage.objects';
    execute 'drop policy if exists "lojas_imagens_remocao" on storage.objects';
    execute $p$create policy "lojas_imagens_envio" on storage.objects for insert to authenticated
      with check (bucket_id = 'lojas' and (storage.foldername(name))[1] = (
        select u.loja_id::text from public.usuarios u where u.id = auth.uid() and u.role = 'lojista'))$p$;
    execute $p$create policy "lojas_imagens_troca" on storage.objects for update to authenticated
      using (bucket_id = 'lojas' and (storage.foldername(name))[1] = (
        select u.loja_id::text from public.usuarios u where u.id = auth.uid() and u.role = 'lojista'))$p$;
    execute $p$create policy "lojas_imagens_remocao" on storage.objects for delete to authenticated
      using (bucket_id = 'lojas' and (storage.foldername(name))[1] = (
        select u.loja_id::text from public.usuarios u where u.id = auth.uid() and u.role = 'lojista'))$p$;
    exception when insufficient_privilege then
      raise warning 'Sem permissão para criar as policies em storage.objects. Crie as três policies do bloco 6 em Storage > Policies.';
    end;
  else
    raise notice 'Schema storage não encontrado: bucket e policies de imagem não foram criados.';
  end if;
end;
$$;

commit;

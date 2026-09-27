-- As funções usam auth.uid() e nunca confiam em usuario_id, total ou preço enviados pelo cliente
begin;

alter table public.produtos add constraint produtos_preco_positivo check (preco > 0);
alter table public.produtos alter column estoque set not null;
alter table public.produtos add constraint produtos_estoque_nao_negativo check (estoque >= 0);
alter table public.usuarios alter column role set not null;
alter table public.pedidos add constraint pedidos_total_nao_negativo check (total >= 0);
alter table public.pedidos add constraint pedidos_status_valido
  check (status in ('pendente', 'aceito', 'concluido', 'cancelado'));
alter table public.pedidos drop constraint pedidos_loja_id_fkey;
alter table public.pedidos add constraint pedidos_loja_id_fkey
  foreign key (loja_id) references public.lojas(id) on delete restrict;

-- Perfis nascem no cadastro do Supabase Auth, inclusive com confirmação de email
create or replace function public.criar_perfil_usuario()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.usuarios(id, nome, role)
  values (new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
      nullif(split_part(new.email, '@', 1), ''), 'Usuário'), 255),
    'cliente');
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.criar_perfil_usuario();

create or replace function public.e_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.usuarios where id = (select auth.uid()) and role = 'admin');
$$;
create or replace function public.e_lojista_da(p_loja_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.usuarios
    where id = (select auth.uid()) and role = 'lojista' and loja_id = p_loja_id);
$$;

alter table public.lojas enable row level security;
alter table public.usuarios enable row level security;
alter table public.produtos enable row level security;
alter table public.pedidos enable row level security;
alter table public.itens_pedido enable row level security;

create policy lojas_leitura on public.lojas for select to anon, authenticated using (true);
create policy lojas_criacao on public.lojas for insert to authenticated with check (public.e_admin());
create policy lojas_edicao on public.lojas for update to authenticated
  using (public.e_admin() or public.e_lojista_da(id))
  with check (public.e_admin() or public.e_lojista_da(id));
create policy lojas_exclusao on public.lojas for delete to authenticated using (public.e_admin());

create policy usuarios_leitura on public.usuarios for select to authenticated
  using (id = (select auth.uid()) or public.e_admin());
create policy usuarios_edicao_admin on public.usuarios for update to authenticated
  using (public.e_admin()) with check (public.e_admin());

create policy produtos_leitura on public.produtos for select to anon, authenticated using (true);
create policy produtos_criacao on public.produtos for insert to authenticated
  with check (public.e_lojista_da(loja_id));
create policy produtos_edicao on public.produtos for update to authenticated
  using (public.e_lojista_da(loja_id)) with check (public.e_lojista_da(loja_id));
create policy produtos_exclusao on public.produtos for delete to authenticated
  using (public.e_lojista_da(loja_id));

create policy pedidos_leitura on public.pedidos for select to authenticated
  using (usuario_id = (select auth.uid()) or public.e_lojista_da(loja_id) or public.e_admin());
create policy itens_pedido_leitura on public.itens_pedido for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id));

-- O pedido completo é criado numa transação do PostgreSQL.
create or replace function public.criar_pedido(p_loja_id uuid, p_itens jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_item record;
  v_produto record;
  v_total numeric := 0;
begin
  if v_user is null then raise exception 'VC_FORBIDDEN'; end if;
  if not exists (select 1 from public.usuarios where id = v_user) then
    raise exception 'VC_FORBIDDEN';
  end if;
  if not exists (select 1 from public.lojas where id = p_loja_id) then
    raise exception 'VC_NOT_FOUND';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array'
    or jsonb_array_length(p_itens) not between 1 and 50 then
    raise exception 'VC_INVALID';
  end if;
  if exists (select 1 from jsonb_array_elements(p_itens) e
    where jsonb_typeof(e.value) <> 'object'
       or not (e.value ? 'produto_id' and e.value ? 'quantidade')) then
    raise exception 'VC_INVALID';
  end if;
  if (select count(*) from jsonb_array_elements(p_itens)) <>
    (select count(distinct e.value ->> 'produto_id') from jsonb_array_elements(p_itens) e) then
    raise exception 'VC_INVALID';
  end if;

  insert into public.pedidos(usuario_id, loja_id) values (v_user, p_loja_id) returning id into v_id;
  -- Ordem fixa dos bloqueios reduz impasses em pedidos simultâneos.
  for v_item in select e.value ->> 'produto_id' as produto_id,
      (e.value ->> 'quantidade')::integer as quantidade
    from jsonb_array_elements(p_itens) e order by e.value ->> 'produto_id'
  loop
    if v_item.quantidade not between 1 and 1000 then raise exception 'VC_INVALID'; end if;
    select id, loja_id, preco, estoque into v_produto from public.produtos
      where id = v_item.produto_id::uuid for update;
    if not found or v_produto.loja_id <> p_loja_id then raise exception 'VC_NOT_FOUND'; end if;
    if v_produto.estoque < v_item.quantidade then raise exception 'VC_STOCK'; end if;
    if v_total + v_produto.preco * v_item.quantidade > 99999999.99 then
      raise exception 'VC_INVALID';
    end if;
    update public.produtos set estoque = estoque - v_item.quantidade where id = v_produto.id;
    insert into public.itens_pedido(pedido_id, produto_id, quantidade, preco_unitario, subtotal)
      values (v_id, v_produto.id, v_item.quantidade, v_produto.preco,
        v_produto.preco * v_item.quantidade);
    v_total := v_total + v_produto.preco * v_item.quantidade;
  end loop;
  update public.pedidos set total = v_total where id = v_id;
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
  elsif p_status = 'aceito' and v_pedido.status = 'pendente' and v_seller then
    null;
  elsif p_status = 'concluido' and v_pedido.status = 'aceito' and v_seller then
    null;
  else
    if not v_seller then raise exception 'VC_FORBIDDEN'; end if;
    raise exception 'VC_CONFLICT';
  end if;
  update public.pedidos set status = p_status, updated_at = now() where id = p_pedido_id;
end;
$$;

revoke all on function public.criar_pedido(uuid, jsonb) from public, anon;
revoke all on function public.atualizar_status_pedido(uuid, text) from public, anon;
grant execute on function public.criar_pedido(uuid, jsonb) to authenticated;
grant execute on function public.atualizar_status_pedido(uuid, text) to authenticated;
commit;

-- Rodar depois de migrations/rls.sql.
begin;

alter table public.lojas
  add column if not exists categoria varchar(100),
  add column if not exists logo_url text,
  add column if not exists banner_url text,
  add column if not exists filtros jsonb not null default '[]'::jsonb,
  add column if not exists nota_media numeric(3, 2),
  add column if not exists total_avaliacoes integer not null default 0;
alter table public.lojas add constraint lojas_filtros_lista check (jsonb_typeof(filtros) = 'array');

alter table public.produtos
  add column if not exists categoria varchar(100),
  add column if not exists preco_antigo numeric(10, 2),
  add column if not exists imagens text[] not null default '{}',
  add column if not exists atributos jsonb not null default '[]'::jsonb,
  add column if not exists variacoes jsonb not null default '[]'::jsonb,
  add column if not exists filtros jsonb not null default '{}'::jsonb,
  add column if not exists nota_media numeric(3, 2),
  add column if not exists total_avaliacoes integer not null default 0;
alter table public.produtos add constraint produtos_preco_antigo_positivo
  check (preco_antigo is null or preco_antigo > 0);
alter table public.produtos add constraint produtos_atributos_lista check (jsonb_typeof(atributos) = 'array');
alter table public.produtos add constraint produtos_variacoes_lista check (jsonb_typeof(variacoes) = 'array');
alter table public.produtos add constraint produtos_filtros_objeto check (jsonb_typeof(filtros) = 'object');

alter table public.usuarios
  add column if not exists telefone varchar(20),
  add column if not exists endereco jsonb;
alter table public.usuarios add constraint usuarios_endereco_objeto
  check (endereco is null or jsonb_typeof(endereco) = 'object');

drop policy if exists "Usuário pode editar seu próprio perfil" on public.usuarios;

alter table public.pedidos
  add column if not exists endereco_entrega jsonb,
  add column if not exists forma_pagamento varchar(20),
  add column if not exists parcelas smallint;
alter table public.pedidos add constraint pedidos_endereco_objeto
  check (endereco_entrega is null or jsonb_typeof(endereco_entrega) = 'object');
alter table public.pedidos add constraint pedidos_forma_pagamento_valida
  check (forma_pagamento is null or forma_pagamento in ('pix', 'cartao'));
alter table public.pedidos add constraint pedidos_parcelas_validas
  check (parcelas is null or (forma_pagamento = 'cartao' and parcelas between 1 and 12));

alter table public.itens_pedido
  add column if not exists variacoes jsonb not null default '{}'::jsonb;
alter table public.itens_pedido add constraint itens_pedido_variacoes_objeto
  check (jsonb_typeof(variacoes) = 'object');

create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  nota smallint not null check (nota between 1 and 5),
  comentario text check (comentario is null or char_length(comentario) <= 2000),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (produto_id, usuario_id)
);
alter table public.avaliacoes enable row level security;
create policy avaliacoes_leitura on public.avaliacoes for select to anon, authenticated using (true);

create or replace function public.atualizar_meu_perfil(p_nome text, p_telefone text, p_endereco jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'VC_FORBIDDEN'; end if;
  if p_nome is null or char_length(trim(p_nome)) not between 2 and 255 then raise exception 'VC_INVALID'; end if;
  if p_telefone is not null and char_length(p_telefone) > 20 then raise exception 'VC_INVALID'; end if;
  if p_endereco is not null and jsonb_typeof(p_endereco) <> 'object' then raise exception 'VC_INVALID'; end if;
  update public.usuarios
    set nome = trim(p_nome), telefone = nullif(trim(p_telefone), ''), endereco = p_endereco
    where id = auth.uid();
  if not found then raise exception 'VC_NOT_FOUND'; end if;
end;
$$;

drop function if exists public.criar_pedido(uuid, jsonb);
create or replace function public.criar_pedido(
  p_loja_id uuid,
  p_itens jsonb,
  p_endereco jsonb default null,
  p_forma_pagamento text default null,
  p_parcelas integer default null
)
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

  insert into public.pedidos(usuario_id, loja_id, endereco_entrega, forma_pagamento, parcelas)
    values (v_user, p_loja_id, p_endereco, p_forma_pagamento, p_parcelas)
    returning id into v_id;

  -- Ordem fixa dos bloqueios reduz impasses em pedidos simultâneos.
  for v_item in select e.value ->> 'produto_id' as produto_id,
      (e.value ->> 'quantidade')::integer as quantidade,
      coalesce(e.value -> 'variacoes', '{}'::jsonb) as variacoes
    from jsonb_array_elements(p_itens) e order by e.value ->> 'produto_id'
  loop
    if v_item.quantidade not between 1 and 1000 then raise exception 'VC_INVALID'; end if;
    select id, loja_id, preco, estoque, variacoes into v_produto from public.produtos
      where id = v_item.produto_id::uuid for update;
    if not found or v_produto.loja_id <> p_loja_id then raise exception 'VC_NOT_FOUND'; end if;

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
  update public.pedidos set total = v_total where id = v_id;
  return v_id;
end;
$$;

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

revoke all on function public.atualizar_meu_perfil(text, text, jsonb) from public, anon;
revoke all on function public.criar_pedido(uuid, jsonb, jsonb, text, integer) from public, anon;
revoke all on function public.avaliar_produto(uuid, integer, text) from public, anon;
grant execute on function public.atualizar_meu_perfil(text, text, jsonb) to authenticated;
grant execute on function public.criar_pedido(uuid, jsonb, jsonb, text, integer) to authenticated;
grant execute on function public.avaliar_produto(uuid, integer, text) to authenticated;

commit;

begin;

drop policy if exists "Todos podem visualizar lojas" on public.lojas;
drop policy if exists "Todos podem visualizar produtos" on public.produtos;
drop policy if exists "Usuário pode visualizar seu próprio perfil" on public.usuarios;
drop policy if exists "Cliente pode visualizar seus pedidos" on public.pedidos;
drop policy if exists "Cliente pode visualizar itens dos seus pedidos" on public.itens_pedido;

drop policy if exists usuarios_leitura on public.usuarios;
create policy usuarios_leitura on public.usuarios for select to authenticated
  using (id = (select auth.uid()) or public.admin_tem_permissao('usuarios'));

drop policy if exists pedidos_leitura on public.pedidos;
create policy pedidos_leitura on public.pedidos for select to authenticated
  using (usuario_id = (select auth.uid()) or public.e_lojista_da(loja_id)
         or public.admin_tem_permissao('lojas'));

revoke all on public.usuarios from anon;
revoke insert, update, delete, truncate on public.usuarios from authenticated;
grant update (role, loja_id) on public.usuarios to authenticated;

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
  v_seller := public.e_lojista_da(v_pedido.loja_id) or public.admin_tem_permissao('lojas');
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
  if not (public.e_lojista_da(p_loja_id) or public.admin_tem_permissao('lojas')) then
    raise exception 'VC_FORBIDDEN';
  end if;
  return query
    select u.id, u.nome::text, u.telefone::text, a.email::text
    from public.usuarios u
    left join auth.users a on a.id = u.id
    where exists (select 1 from public.pedidos p where p.usuario_id = u.id and p.loja_id = p_loja_id);
end;
$$;

revoke all on function public.atualizar_status_pedido(uuid, text) from public, anon;
revoke all on function public.clientes_da_loja(uuid) from public, anon;
grant execute on function public.atualizar_status_pedido(uuid, text) to authenticated;
grant execute on function public.clientes_da_loja(uuid) to authenticated;

create or replace function public.limitar_pedidos_pendentes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from 'pendente' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('pedidos_pendentes:' || new.usuario_id::text));
  if (select count(*) from public.pedidos
       where usuario_id = new.usuario_id and status = 'pendente') >= 20 then
    raise exception 'VC_LIMIT';
  end if;
  if (select count(*) from public.pedidos
       where usuario_id = new.usuario_id and loja_id = new.loja_id and status = 'pendente') >= 10 then
    raise exception 'VC_LIMIT';
  end if;
  return new;
end;
$$;

drop trigger if exists pedidos_limite_pendentes on public.pedidos;
create trigger pedidos_limite_pendentes before insert on public.pedidos
for each row execute function public.limitar_pedidos_pendentes();

create or replace function public.cancelar_pedidos_pendentes_antigos(p_dias integer default 7)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_pedido record;
  v_item record;
  v_total integer := 0;
begin
  for v_pedido in
    select id from public.pedidos
     where status = 'pendente' and created_at < now() - make_interval(days => greatest(p_dias, 1))
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

revoke all on function public.limitar_pedidos_pendentes() from public, anon, authenticated;
revoke all on function public.cancelar_pedidos_pendentes_antigos(integer) from public, anon, authenticated;

create or replace function public.urls_de_imagem_validas(p_urls text[])
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(bool_and(u ~ '^https?://' and length(u) <= 2048), true)
    from unnest(coalesce(p_urls, '{}'::text[])) as u;
$$;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'produtos_limites'
             and conrelid = 'public.produtos'::regclass) then
    null;
  elsif exists (
    select 1 from public.produtos
     where not (
       (descricao is null or length(descricao) <= 5000)
       and cardinality(imagens) <= 10
       and public.urls_de_imagem_validas(imagens)
       and octet_length(atributos::text) <= 65536
       and octet_length(variacoes::text) <= 65536
       and octet_length(filtros::text) <= 65536)
  ) then
    raise notice 'produtos_limites não criada: existem produtos fora dos limites';
  else
    alter table public.produtos add constraint produtos_limites check (
      (descricao is null or length(descricao) <= 5000)
      and cardinality(imagens) <= 10
      and public.urls_de_imagem_validas(imagens)
      and octet_length(atributos::text) <= 65536
      and octet_length(variacoes::text) <= 65536
      and octet_length(filtros::text) <= 65536);
  end if;

  if exists (select 1 from pg_constraint where conname = 'lojas_limites'
             and conrelid = 'public.lojas'::regclass) then
    null;
  elsif exists (
    select 1 from public.lojas
     where not (
       (descricao is null or length(descricao) <= 5000)
       and (logo_url is null or (logo_url ~ '^https?://' and length(logo_url) <= 2048))
       and (banner_url is null or (banner_url ~ '^https?://' and length(banner_url) <= 2048))
       and octet_length(filtros::text) <= 131072)
  ) then
    raise notice 'lojas_limites não criada: existem lojas fora dos limites';
  else
    alter table public.lojas add constraint lojas_limites check (
      (descricao is null or length(descricao) <= 5000)
      and (logo_url is null or (logo_url ~ '^https?://' and length(logo_url) <= 2048))
      and (banner_url is null or (banner_url ~ '^https?://' and length(banner_url) <= 2048))
      and octet_length(filtros::text) <= 131072);
  end if;
end;
$$;

create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  ator uuid,
  acao text not null,
  alvo_tipo text not null,
  alvo_id uuid,
  detalhes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists auditoria_created_at_idx on public.auditoria (created_at desc);
create index if not exists auditoria_alvo_idx on public.auditoria (alvo_tipo, alvo_id);
alter table public.auditoria enable row level security;
revoke all on public.auditoria from public, anon, authenticated;
grant select on public.auditoria to authenticated;
drop policy if exists auditoria_leitura on public.auditoria;
create policy auditoria_leitura on public.auditoria for select to authenticated
  using (public.admin_tem_permissao('usuarios'));

create or replace function public.auditar_usuarios()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    insert into public.auditoria (ator, acao, alvo_tipo, alvo_id, detalhes)
    values (auth.uid(), 'usuario_excluido', 'usuario', old.id,
            jsonb_build_object('role', old.role, 'loja_id', old.loja_id));
    return old;
  end if;
  if new.role is distinct from old.role or new.loja_id is distinct from old.loja_id
     or new.admin_tipo is distinct from old.admin_tipo
     or new.admin_permissoes is distinct from old.admin_permissoes then
    insert into public.auditoria (ator, acao, alvo_tipo, alvo_id, detalhes)
    values (auth.uid(), 'papel_alterado', 'usuario', new.id, jsonb_build_object(
      'antes', jsonb_build_object('role', old.role, 'loja_id', old.loja_id,
                                  'admin_tipo', old.admin_tipo, 'admin_permissoes', old.admin_permissoes),
      'depois', jsonb_build_object('role', new.role, 'loja_id', new.loja_id,
                                   'admin_tipo', new.admin_tipo, 'admin_permissoes', new.admin_permissoes)));
  end if;
  return new;
end;
$$;

drop trigger if exists usuarios_auditoria on public.usuarios;
create trigger usuarios_auditoria after update or delete on public.usuarios
for each row execute function public.auditar_usuarios();

create or replace function public.auditar_lojas()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.auditoria (ator, acao, alvo_tipo, alvo_id, detalhes)
    values (auth.uid(), 'loja_criada', 'loja', new.id, jsonb_build_object('nome', new.nome));
    return new;
  end if;
  if tg_op = 'DELETE' then
    insert into public.auditoria (ator, acao, alvo_tipo, alvo_id, detalhes)
    values (auth.uid(), 'loja_excluida', 'loja', old.id, jsonb_build_object('nome', old.nome));
    return old;
  end if;
  if new.ativa is distinct from old.ativa or new.cnpj is distinct from old.cnpj
     or new.nome is distinct from old.nome then
    insert into public.auditoria (ator, acao, alvo_tipo, alvo_id, detalhes)
    values (auth.uid(), 'loja_alterada', 'loja', new.id, jsonb_build_object(
      'antes', jsonb_build_object('nome', old.nome, 'ativa', old.ativa, 'cnpj', old.cnpj),
      'depois', jsonb_build_object('nome', new.nome, 'ativa', new.ativa, 'cnpj', new.cnpj)));
  end if;
  return new;
end;
$$;

drop trigger if exists lojas_auditoria on public.lojas;
create trigger lojas_auditoria after insert or update or delete on public.lojas
for each row execute function public.auditar_lojas();

create or replace function public.auditar_pedidos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.auditoria (ator, acao, alvo_tipo, alvo_id, detalhes)
    values (auth.uid(), 'pedido_status', 'pedido', new.id,
            jsonb_build_object('de', old.status, 'para', new.status, 'loja_id', new.loja_id));
  end if;
  return new;
end;
$$;

drop trigger if exists pedidos_auditoria on public.pedidos;
create trigger pedidos_auditoria after update on public.pedidos
for each row execute function public.auditar_pedidos();

create or replace function public.admin_validar_exclusao_usuario(p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_alvo public.usuarios%rowtype;
  v_perms text[];
begin
  v_perms := public.admin_permissoes_efetivas((select auth.uid()));
  if v_perms is null or not ('usuarios' = any(v_perms)) then
    raise exception 'VC_FORBIDDEN';
  end if;
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

revoke all on function public.auditar_usuarios() from public, anon, authenticated;
revoke all on function public.auditar_lojas() from public, anon, authenticated;
revoke all on function public.auditar_pedidos() from public, anon, authenticated;

commit;

notify pgrst, 'reload schema';

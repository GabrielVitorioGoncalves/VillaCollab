-- Rodar depois de migrations/lojista_seguranca.sql.
begin;

alter table public.usuarios
  add column if not exists admin_tipo varchar(20),
  add column if not exists admin_permissoes text[];
alter table public.usuarios drop constraint if exists usuarios_role_valido;
alter table public.usuarios add constraint usuarios_role_valido
  check (role in ('cliente', 'lojista', 'admin')) not valid;
alter table public.usuarios drop constraint if exists usuarios_admin_tipo_valido;
alter table public.usuarios add constraint usuarios_admin_tipo_valido
  check (admin_tipo is null or admin_tipo in ('Admin', 'Gerente', 'Suporte'));
alter table public.usuarios drop constraint if exists usuarios_admin_permissoes_validas;
alter table public.usuarios add constraint usuarios_admin_permissoes_validas
  check (admin_permissoes is null or (cardinality(admin_permissoes) > 0
    and admin_permissoes <@ array['lojas', 'produtos', 'usuarios', 'relatorios']));
alter table public.usuarios drop constraint if exists usuarios_admin_campos;
alter table public.usuarios add constraint usuarios_admin_campos
  check (role = 'admin' or (admin_tipo is null and admin_permissoes is null)) not valid;

alter table public.lojas
  add column if not exists cnpj varchar(14),
  add column if not exists ativa boolean not null default true;
alter table public.lojas drop constraint if exists lojas_cnpj_formato;
alter table public.lojas add constraint lojas_cnpj_formato
  check (cnpj is null or cnpj ~ '^[0-9A-Z]{12}[0-9]{2}$');
create unique index if not exists lojas_cnpj_unico on public.lojas (cnpj) where cnpj is not null;

do $$
declare v_nome text;
begin
  select conname into v_nome from pg_constraint
   where conrelid = 'public.pedidos'::regclass and contype = 'f'
     and conkey = array[(select attnum from pg_attribute
                         where attrelid = 'public.pedidos'::regclass and attname = 'usuario_id')]::smallint[];
  if v_nome is not null then
    execute format('alter table public.pedidos drop constraint %I', v_nome);
  end if;
  alter table public.pedidos add constraint pedidos_usuario_id_fkey
    foreign key (usuario_id) references public.usuarios(id) on delete restrict;
end;
$$;

create or replace function public.admin_permissoes_efetivas(p_usuario uuid)
returns text[] language sql stable security definer set search_path = '' as $$
  select case when u.admin_permissoes is null
              then array['lojas', 'produtos', 'usuarios', 'relatorios']
              else u.admin_permissoes end
    from public.usuarios u
   where u.id = p_usuario and u.role = 'admin';
$$;

create or replace function public.admin_tem_permissao(p_permissao text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(p_permissao = any(public.admin_permissoes_efetivas((select auth.uid()))), false);
$$;

create or replace function public.proteger_papel_usuario()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_ator uuid := auth.uid();
  v_perms text[];
  v_todas constant text[] := array['lojas', 'produtos', 'usuarios', 'relatorios'];
begin
  if new.role is distinct from 'admin' then
    new.admin_tipo := null;
    new.admin_permissoes := null;
  end if;
  if new.role is distinct from 'lojista' then
    new.loja_id := null;
  end if;

  if new.role is not distinct from old.role
     and new.loja_id is not distinct from old.loja_id
     and new.admin_tipo is not distinct from old.admin_tipo
     and new.admin_permissoes is not distinct from old.admin_permissoes then
    return new;
  end if;

  if v_ator is null or coalesce(current_setting('vc.papel_liberado', true), '') = 'on' then
    return new;
  end if;

  v_perms := public.admin_permissoes_efetivas(v_ator);
  if v_perms is null or not ('usuarios' = any(v_perms)) then
    raise exception 'VC_FORBIDDEN';
  end if;
  if old.id = v_ator then
    raise exception 'VC_FORBIDDEN: proprio';
  end if;
  if old.role = 'admin' and not (coalesce(old.admin_permissoes, v_todas) <@ v_perms) then
    raise exception 'VC_FORBIDDEN: superior';
  end if;
  if new.role = 'admin' and not (coalesce(new.admin_permissoes, v_todas) <@ v_perms) then
    raise exception 'VC_FORBIDDEN: superior';
  end if;
  if new.role = 'lojista' and new.loja_id is null then
    raise exception 'VC_INVALID: loja';
  end if;
  return new;
end;
$$;

drop trigger if exists usuarios_proteger_papel on public.usuarios;
create trigger usuarios_proteger_papel before update on public.usuarios
for each row execute function public.proteger_papel_usuario();

create or replace function public.bloquear_pedido_loja_inativa()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.lojas where id = new.loja_id and not ativa) then
    raise exception 'VC_CLOSED';
  end if;
  return new;
end;
$$;

drop trigger if exists pedidos_loja_ativa on public.pedidos;
create trigger pedidos_loja_ativa before insert on public.pedidos
for each row execute function public.bloquear_pedido_loja_inativa();

drop policy if exists "Admin pode excluir loja" on public.lojas;
drop policy if exists "Lojista pode editar sua loja" on public.lojas;
drop policy if exists lojas_criacao on public.lojas;
drop policy if exists lojas_edicao on public.lojas;
drop policy if exists lojas_exclusao on public.lojas;
create policy lojas_criacao on public.lojas for insert to authenticated
  with check (public.admin_tem_permissao('lojas'));
create policy lojas_edicao on public.lojas for update to authenticated
  using (public.admin_tem_permissao('lojas') or public.e_lojista_da(id))
  with check (public.admin_tem_permissao('lojas') or public.e_lojista_da(id));
create policy lojas_exclusao on public.lojas for delete to authenticated
  using (public.admin_tem_permissao('lojas'));

drop policy if exists "Lojista pode criar produtos da sua loja" on public.produtos;
drop policy if exists "Lojista pode editar produtos da sua loja" on public.produtos;
drop policy if exists "Lojista pode excluir produtos da sua loja" on public.produtos;
drop policy if exists produtos_criacao on public.produtos;
drop policy if exists produtos_edicao on public.produtos;
drop policy if exists produtos_exclusao on public.produtos;
create policy produtos_criacao on public.produtos for insert to authenticated
  with check (public.e_lojista_da(loja_id) or public.admin_tem_permissao('produtos'));
create policy produtos_edicao on public.produtos for update to authenticated
  using (public.e_lojista_da(loja_id) or public.admin_tem_permissao('produtos'))
  with check (public.e_lojista_da(loja_id) or public.admin_tem_permissao('produtos'));
create policy produtos_exclusao on public.produtos for delete to authenticated
  using (public.e_lojista_da(loja_id) or public.admin_tem_permissao('produtos'));

drop policy if exists "Admin pode excluir usuário" on public.usuarios;
drop policy if exists usuarios_edicao_admin on public.usuarios;
create policy usuarios_edicao_admin on public.usuarios for update to authenticated
  using (public.admin_tem_permissao('usuarios'))
  with check (public.admin_tem_permissao('usuarios'));
revoke delete on public.usuarios from anon, authenticated;

drop policy if exists "Admin pode excluir pedidos" on public.pedidos;

create or replace function public.admin_painel()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_inicio_mes timestamptz := date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_inicio_semana timestamptz := (v_hoje - 6)::timestamp at time zone 'America/Sao_Paulo';
begin
  if not public.admin_tem_permissao('relatorios') then
    raise exception 'VC_FORBIDDEN';
  end if;

  return jsonb_build_object(
    'volume_bruto', (select coalesce(sum(total), 0) from public.pedidos
                      where status <> 'cancelado' and created_at >= v_inicio_mes),
    'pedidos_mes', (select count(*) from public.pedidos
                     where status <> 'cancelado' and created_at >= v_inicio_mes),
    'lojas_ativas', (select count(*) from public.lojas where ativa),
    'lojas_total', (select count(*) from public.lojas),
    'ultimos_dias', (
      select jsonb_agg(jsonb_build_object('data', d.dia, 'receita', coalesce(x.receita, 0),
                                          'pedidos', coalesce(x.pedidos, 0)) order by d.dia)
        from (select generate_series(v_hoje - 6, v_hoje, interval '1 day')::date as dia) d
        left join (
          select (created_at at time zone 'America/Sao_Paulo')::date as dia,
                 sum(total) as receita, count(*) as pedidos
            from public.pedidos
           where status <> 'cancelado' and created_at >= v_inicio_semana
           group by 1
        ) x on x.dia = d.dia),
    'ranking_lojas', (
      select coalesce(jsonb_agg(r order by r.faturamento desc, r.pedidos desc, r.nome), '[]'::jsonb)
        from (
          select l.id, l.nome, l.ativa,
                 count(p.id) filter (where p.status <> 'cancelado') as pedidos,
                 coalesce(sum(p.total) filter (where p.status <> 'cancelado'), 0) as faturamento
            from public.lojas l
            left join public.pedidos p on p.loja_id = l.id
           group by l.id
        ) r),
    'pedidos_recentes', (
      select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb)
        from (
          select p.id, l.nome as loja, a.email as cliente, p.total as valor, p.status, p.created_at
            from public.pedidos p
            join public.lojas l on l.id = p.loja_id
            left join auth.users a on a.id = p.usuario_id
           order by p.created_at desc
           limit 8
        ) t),
    'alertas', jsonb_build_object(
      'lojas_sem_responsavel', (select count(*) from public.lojas l
                                 where not exists (select 1 from public.usuarios u
                                                    where u.role = 'lojista' and u.loja_id = l.id)),
      'lojas_desativadas', (select count(*) from public.lojas where not ativa),
      'lojas_sem_receber_pedidos', (select count(*) from public.lojas where ativa and not aceita_pedidos),
      'pedidos_pendentes_atrasados', (select count(*) from public.pedidos
                                       where status = 'pendente' and created_at < now() - interval '2 days'))
  );
end;
$$;

create or replace function public.admin_listar_lojas()
returns table (
  id uuid, nome text, slug text, categoria text, cnpj text, telefone text, email_contato text,
  logo_url text, ativa boolean, aceita_pedidos boolean, created_at timestamptz,
  responsavel_id uuid, responsavel_nome text, responsavel_email text,
  total_produtos bigint, total_pedidos bigint
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.admin_tem_permissao('lojas') then
    raise exception 'VC_FORBIDDEN';
  end if;
  return query
    select l.id, l.nome::text, l.slug::text, l.categoria::text, l.cnpj::text, l.telefone::text,
           l.email_contato::text, l.logo_url::text, l.ativa, l.aceita_pedidos, l.created_at,
           r.id, r.nome::text, r.email::text,
           (select count(*) from public.produtos p where p.loja_id = l.id),
           (select count(*) from public.pedidos p where p.loja_id = l.id)
      from public.lojas l
      left join lateral (
        select u.id, u.nome, a.email
          from public.usuarios u
          left join auth.users a on a.id = u.id
         where u.role = 'lojista' and u.loja_id = l.id
         order by u.created_at
         limit 1
      ) r on true
     order by l.nome;
end;
$$;

create or replace function public.admin_slug_livre(p_nome text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_base text;
  v_slug text;
  v_n integer := 1;
begin
  v_base := trim(both '-' from regexp_replace(
    lower(translate(p_nome,
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')),
    '[^a-z0-9]+', '-', 'g'));
  v_base := left(coalesce(nullif(v_base, ''), 'loja'), 200);
  v_slug := v_base;
  while exists (select 1 from public.lojas where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  return v_slug;
end;
$$;

create or replace function public.admin_criar_loja(
  p_nome text, p_cnpj text, p_telefone text, p_categoria text, p_responsavel uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_role text;
begin
  if not public.admin_tem_permissao('lojas') then
    raise exception 'VC_FORBIDDEN';
  end if;
  select role into v_role from public.usuarios where id = p_responsavel for update;
  if v_role is null then
    raise exception 'VC_NOT_FOUND: responsavel';
  end if;
  if v_role <> 'cliente' then
    raise exception 'VC_CONFLICT: responsavel';
  end if;
  if p_cnpj is not null and exists (select 1 from public.lojas where cnpj = p_cnpj) then
    raise exception 'VC_CONFLICT: cnpj';
  end if;

  insert into public.lojas (nome, slug, cnpj, telefone, categoria, ativa)
  values (p_nome, public.admin_slug_livre(p_nome), p_cnpj, p_telefone, p_categoria, true)
  returning id into v_id;

  perform set_config('vc.papel_liberado', 'on', true);
  update public.usuarios set role = 'lojista', loja_id = v_id where id = p_responsavel;
  perform set_config('vc.papel_liberado', 'off', true);
  return v_id;
end;
$$;

create or replace function public.admin_atualizar_loja(p_id uuid, p_dados jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_responsavel uuid;
  v_role text;
  v_loja_atual uuid;
begin
  if not public.admin_tem_permissao('lojas') then
    raise exception 'VC_FORBIDDEN';
  end if;
  perform 1 from public.lojas where id = p_id for update;
  if not found then
    raise exception 'VC_NOT_FOUND';
  end if;
  if p_dados ? 'cnpj' and p_dados->>'cnpj' is not null
     and exists (select 1 from public.lojas where cnpj = p_dados->>'cnpj' and id <> p_id) then
    raise exception 'VC_CONFLICT: cnpj';
  end if;

  update public.lojas set
    nome = case when p_dados ? 'nome' then p_dados->>'nome' else nome end,
    cnpj = case when p_dados ? 'cnpj' then p_dados->>'cnpj' else cnpj end,
    telefone = case when p_dados ? 'telefone' then p_dados->>'telefone' else telefone end,
    categoria = case when p_dados ? 'categoria' then p_dados->>'categoria' else categoria end,
    ativa = case when p_dados ? 'ativa' then (p_dados->>'ativa')::boolean else ativa end,
    logo_url = case when p_dados ? 'logo_url' then p_dados->>'logo_url' else logo_url end,
    banner_url = case when p_dados ? 'banner_url' then p_dados->>'banner_url' else banner_url end
  where id = p_id;

  if p_dados ? 'responsavel' then
    v_responsavel := (p_dados->>'responsavel')::uuid;
    select role, loja_id into v_role, v_loja_atual from public.usuarios where id = v_responsavel for update;
    if v_role is null then
      raise exception 'VC_NOT_FOUND: responsavel';
    end if;
    if v_role = 'admin' or (v_role = 'lojista' and v_loja_atual is distinct from p_id) then
      raise exception 'VC_CONFLICT: responsavel';
    end if;
    perform set_config('vc.papel_liberado', 'on', true);
    update public.usuarios set role = 'cliente', loja_id = null
     where role = 'lojista' and loja_id = p_id and id <> v_responsavel;
    update public.usuarios set role = 'lojista', loja_id = p_id where id = v_responsavel;
    perform set_config('vc.papel_liberado', 'off', true);
  end if;
end;
$$;

create or replace function public.admin_excluir_loja(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.admin_tem_permissao('lojas') then
    raise exception 'VC_FORBIDDEN';
  end if;
  perform 1 from public.lojas where id = p_id for update;
  if not found then
    raise exception 'VC_NOT_FOUND';
  end if;
  if exists (select 1 from public.pedidos where loja_id = p_id) then
    raise exception 'VC_CONFLICT: pedidos';
  end if;
  perform set_config('vc.papel_liberado', 'on', true);
  update public.usuarios set role = 'cliente', loja_id = null where role = 'lojista' and loja_id = p_id;
  perform set_config('vc.papel_liberado', 'off', true);
  delete from public.lojas where id = p_id;
end;
$$;

create or replace function public.admin_listar_usuarios()
returns table (
  id uuid, nome text, email text, role text, loja_id uuid, loja_nome text,
  admin_tipo text, admin_permissoes text[], mfa boolean, ultimo_login timestamptz,
  criado_em timestamptz, total_pedidos bigint
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.admin_tem_permissao('usuarios') then
    raise exception 'VC_FORBIDDEN';
  end if;
  return query
    select u.id, u.nome::text, a.email::text, u.role::text, u.loja_id, l.nome::text,
           u.admin_tipo::text,
           case when u.role = 'admin' then public.admin_permissoes_efetivas(u.id) end,
           exists (select 1 from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified'),
           a.last_sign_in_at, u.created_at,
           (select count(*) from public.pedidos p where p.usuario_id = u.id)
      from public.usuarios u
      left join auth.users a on a.id = u.id
      left join public.lojas l on l.id = u.loja_id
     order by u.nome;
end;
$$;

create or replace function public.admin_buscar_conta(p_email text)
returns uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.admin_tem_permissao('lojas') or public.admin_tem_permissao('usuarios')) then
    raise exception 'VC_FORBIDDEN';
  end if;
  return (select id from auth.users where lower(email) = lower(trim(p_email)) limit 1);
end;
$$;

create or replace function public.admin_definir_papel(
  p_usuario uuid, p_role text, p_loja uuid default null,
  p_tipo text default null, p_permissoes text[] default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.admin_tem_permissao('usuarios') then
    raise exception 'VC_FORBIDDEN';
  end if;
  if p_role not in ('cliente', 'lojista', 'admin') then
    raise exception 'VC_INVALID';
  end if;
  if p_role = 'lojista' and (p_loja is null or not exists (select 1 from public.lojas where id = p_loja)) then
    raise exception 'VC_INVALID: loja';
  end if;
  if p_role = 'admin' and (p_tipo is null or p_permissoes is null or cardinality(p_permissoes) = 0) then
    raise exception 'VC_INVALID: permissoes';
  end if;

  update public.usuarios set
    role = p_role,
    loja_id = case when p_role = 'lojista' then p_loja end,
    admin_tipo = case when p_role = 'admin' then p_tipo end,
    admin_permissoes = case when p_role = 'admin' then p_permissoes end
  where id = p_usuario;
  if not found then
    raise exception 'VC_NOT_FOUND';
  end if;
end;
$$;

create or replace function public.admin_validar_exclusao_usuario(p_usuario uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
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
end;
$$;

revoke all on function public.admin_permissoes_efetivas(uuid) from public, anon, authenticated;
revoke all on function public.proteger_papel_usuario() from public, anon, authenticated;
revoke all on function public.bloquear_pedido_loja_inativa() from public, anon, authenticated;
revoke all on function public.admin_slug_livre(text) from public, anon, authenticated;
revoke all on function public.admin_tem_permissao(text) from public, anon;
revoke all on function public.admin_painel() from public, anon;
revoke all on function public.admin_listar_lojas() from public, anon;
revoke all on function public.admin_criar_loja(text, text, text, text, uuid) from public, anon;
revoke all on function public.admin_atualizar_loja(uuid, jsonb) from public, anon;
revoke all on function public.admin_excluir_loja(uuid) from public, anon;
revoke all on function public.admin_listar_usuarios() from public, anon;
revoke all on function public.admin_buscar_conta(text) from public, anon;
revoke all on function public.admin_definir_papel(uuid, text, uuid, text, text[]) from public, anon;
revoke all on function public.admin_validar_exclusao_usuario(uuid) from public, anon;
grant execute on function public.admin_tem_permissao(text) to authenticated;
grant execute on function public.admin_painel() to authenticated;
grant execute on function public.admin_listar_lojas() to authenticated;
grant execute on function public.admin_criar_loja(text, text, text, text, uuid) to authenticated;
grant execute on function public.admin_atualizar_loja(uuid, jsonb) to authenticated;
grant execute on function public.admin_excluir_loja(uuid) to authenticated;
grant execute on function public.admin_listar_usuarios() to authenticated;
grant execute on function public.admin_buscar_conta(text) to authenticated;
grant execute on function public.admin_definir_papel(uuid, text, uuid, text, text[]) to authenticated;
grant execute on function public.admin_validar_exclusao_usuario(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'storage' and c.relname = 'objects') then
    begin
      execute 'drop policy if exists "lojas_imagens_admin_envio" on storage.objects';
      execute 'drop policy if exists "lojas_imagens_admin_troca" on storage.objects';
      execute 'drop policy if exists "lojas_imagens_admin_remocao" on storage.objects';
      execute $p$create policy "lojas_imagens_admin_envio" on storage.objects for insert to authenticated
        with check (bucket_id = 'lojas' and public.admin_tem_permissao('lojas'))$p$;
      execute $p$create policy "lojas_imagens_admin_troca" on storage.objects for update to authenticated
        using (bucket_id = 'lojas' and public.admin_tem_permissao('lojas'))$p$;
      execute $p$create policy "lojas_imagens_admin_remocao" on storage.objects for delete to authenticated
        using (bucket_id = 'lojas' and public.admin_tem_permissao('lojas'))$p$;
    exception when insufficient_privilege then
      raise warning 'Sem permissão para criar as policies de imagem do admin em storage.objects. Crie em Storage > Policies.';
    end;
  else
    raise notice 'Schema storage não encontrado: policies de imagem do admin não foram criadas.';
  end if;
end;
$$;

commit;

-- Rodar depois de migrations/catalogo_perfil_pedidos.sql.
begin;

create table if not exists public.carrinho_itens (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  variacoes jsonb not null default '{}'::jsonb check (jsonb_typeof(variacoes) = 'object'),
  quantidade integer not null check (quantidade between 1 and 1000),
  created_at timestamp with time zone not null default now(),
  unique (usuario_id, produto_id, variacoes)
);

alter table public.carrinho_itens enable row level security;
create policy carrinho_leitura on public.carrinho_itens for select to authenticated
  using (usuario_id = (select auth.uid()));

create or replace function public.substituir_carrinho(p_itens jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'VC_FORBIDDEN'; end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) > 100 then
    raise exception 'VC_INVALID';
  end if;
  if exists (select 1 from jsonb_array_elements(p_itens) e
    where jsonb_typeof(e.value) <> 'object'
       or not (e.value ? 'produto_id' and e.value ? 'quantidade')
       or (e.value ? 'variacoes' and jsonb_typeof(e.value -> 'variacoes') <> 'object')
       or (e.value ->> 'quantidade')::integer not between 1 and 1000) then
    raise exception 'VC_INVALID';
  end if;

  delete from public.carrinho_itens where usuario_id = v_user;

  insert into public.carrinho_itens (usuario_id, produto_id, variacoes, quantidade)
  select v_user, p.id, coalesce(e.value -> 'variacoes', '{}'::jsonb), (e.value ->> 'quantidade')::integer
  from jsonb_array_elements(p_itens) e
  join public.produtos p on p.id = (e.value ->> 'produto_id')::uuid
  on conflict (usuario_id, produto_id, variacoes)
    do update set quantidade = excluded.quantidade;
end;
$$;

revoke all on function public.substituir_carrinho(jsonb) from public, anon;
grant execute on function public.substituir_carrinho(jsonb) to authenticated;

commit;

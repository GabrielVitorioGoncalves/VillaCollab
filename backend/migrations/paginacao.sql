begin;

create index if not exists produtos_loja_nome_idx on public.produtos (loja_id, nome);
create index if not exists lojas_nome_idx on public.lojas (nome);

create or replace function public.resumo_minha_loja()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_loja uuid;
  v_inicio timestamptz := date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_anterior timestamptz := (date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '1 month') at time zone 'America/Sao_Paulo';
  v_pedidos jsonb;
  v_produtos jsonb;
  v_estoque_baixo jsonb;
begin
  select loja_id into v_loja from public.usuarios
   where id = (select auth.uid()) and role = 'lojista';
  if v_loja is null then raise exception 'VC_FORBIDDEN'; end if;

  select jsonb_build_object(
    'total', count(*),
    'pendentes', count(*) filter (where status = 'pendente'),
    'enviados', count(*) filter (where status = 'enviado'),
    'entregues', count(*) filter (where status = 'concluido'),
    'mes', count(*) filter (where created_at >= v_inicio),
    'mes_anterior', count(*) filter (where created_at >= v_anterior and created_at < v_inicio),
    'vendas', coalesce(sum(total) filter (where status in ('aceito', 'enviado', 'concluido')), 0),
    'vendas_mes', coalesce(sum(total) filter (where status in ('aceito', 'enviado', 'concluido')
                                                and created_at >= v_inicio), 0),
    'vendas_mes_anterior', coalesce(sum(total) filter (where status in ('aceito', 'enviado', 'concluido')
                                                         and created_at >= v_anterior and created_at < v_inicio), 0)
  ) into v_pedidos
  from public.pedidos where loja_id = v_loja;

  select jsonb_build_object(
    'total', count(*),
    'ativos', count(*) filter (where ativo and estoque > 0),
    'ativos_na_vitrine', count(*) filter (where ativo),
    'sem_estoque', count(*) filter (where estoque <= 0)
  ) into v_produtos
  from public.produtos where loja_id = v_loja;

  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'estoque', estoque) order by estoque, nome), '[]'::jsonb)
    into v_estoque_baixo
    from (select id, nome, estoque from public.produtos
           where loja_id = v_loja and ativo and estoque between 1 and 5
           order by estoque, nome limit 20) baixo;

  return jsonb_build_object('pedidos', v_pedidos, 'produtos', v_produtos, 'estoque_baixo', v_estoque_baixo);
end;
$$;

revoke all on function public.resumo_minha_loja() from public, anon;
grant execute on function public.resumo_minha_loja() to authenticated;

commit;

notify pgrst, 'reload schema';

begin;

create or replace function public.admin_painel()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_limite timestamptz := now() - interval '2 days';
begin
  if not public.admin_tem_permissao('relatorios') then
    raise exception 'VC_FORBIDDEN';
  end if;

  return jsonb_build_object(
    'lojas', (
      select jsonb_build_object(
        'total', count(*),
        'ativas', count(*) filter (where l.ativa),
        'desativadas', count(*) filter (where not l.ativa),
        'sem_responsavel', count(*) filter (where not exists (
          select 1 from public.usuarios u where u.role = 'lojista' and u.loja_id = l.id)),
        'sem_receber_pedidos', count(*) filter (where l.ativa and not l.aceita_pedidos))
      from public.lojas l),
    'usuarios', (
      select jsonb_build_object(
        'clientes', count(*) filter (where u.role = 'cliente'),
        'lojistas', count(*) filter (where u.role = 'lojista'),
        'administradores', count(*) filter (where u.role = 'admin'))
      from public.usuarios u),
    'pedidos', (
      select jsonb_build_object(
        'aguardando_loja', count(*) filter (where p.status = 'pendente'),
        'atrasados', count(*) filter (where p.status = 'pendente' and p.created_at < v_limite),
        'em_andamento', count(*) filter (where p.status in ('aceito', 'enviado')))
      from public.pedidos p),
    'atencao', (
      select coalesce(jsonb_agg(to_jsonb(x) - 'prioridade' order by x.prioridade, x.nome), '[]'::jsonb)
      from (
        select l.id, l.nome, l.ativa, s.atrasados as pedidos_atrasados,
               array_remove(array[
                 case when s.atrasados > 0 then 'pedidos_atrasados' end,
                 case when not s.tem_responsavel then 'sem_responsavel' end,
                 case when l.ativa and not l.aceita_pedidos then 'sem_receber_pedidos' end,
                 case when l.ativa and s.produtos_ativos = 0 then 'sem_produtos' end,
                 case when not l.ativa then 'desativada' end
               ], null) as motivos,
               case
                 when s.atrasados > 0 then 1
                 when not s.tem_responsavel then 2
                 when l.ativa and not l.aceita_pedidos then 3
                 when l.ativa and s.produtos_ativos = 0 then 4
                 else 5
               end as prioridade
          from public.lojas l
          cross join lateral (
            select
              (select count(*) from public.pedidos p
                where p.loja_id = l.id and p.status = 'pendente' and p.created_at < v_limite) as atrasados,
              exists (select 1 from public.usuarios u where u.role = 'lojista' and u.loja_id = l.id) as tem_responsavel,
              (select count(*) from public.produtos pr where pr.loja_id = l.id and pr.ativo) as produtos_ativos
          ) s
         where s.atrasados > 0
            or not s.tem_responsavel
            or (l.ativa and not l.aceita_pedidos)
            or (l.ativa and s.produtos_ativos = 0)
            or not l.ativa
         order by prioridade, l.nome
         limit 50
      ) x),
    'lojas_recentes', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
      from (
        select l.id, l.nome, l.ativa, l.created_at,
               (select u.nome from public.usuarios u
                 where u.role = 'lojista' and u.loja_id = l.id order by u.nome limit 1) as responsavel
          from public.lojas l
         order by l.created_at desc
         limit 5
      ) r)
  );
end;
$$;

revoke all on function public.admin_painel() from public, anon;
grant execute on function public.admin_painel() to authenticated;

commit;

notify pgrst, 'reload schema';

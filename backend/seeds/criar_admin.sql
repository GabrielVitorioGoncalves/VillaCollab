-- Troque o e-mail antes de rodar. A conta precisa já existir (cadastro pelo app).
do $$
declare
  v_email text := 'admin@exemplo.com';
  v_usuario uuid;
begin
  select id into v_usuario from auth.users where lower(email) = lower(v_email);
  if v_usuario is null then
    raise exception 'Nenhuma conta com o e-mail %. Cadastre-se no app primeiro.', v_email;
  end if;

  update public.usuarios
     set role = 'admin', loja_id = null, admin_tipo = 'Admin',
         admin_permissoes = array['lojas', 'produtos', 'usuarios', 'relatorios']
   where id = v_usuario;
  raise notice 'Conta % agora é administradora com acesso completo.', v_email;
end;
$$;

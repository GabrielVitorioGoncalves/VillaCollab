-- Troque o e-mail e o slug da loja antes de rodar.
do $$
declare
  v_email text := 'lojista@exemplo.com';
  v_slug  text := 'villacollab-loja-teste';
  v_usuario uuid;
  v_loja uuid;
begin
  select id into v_usuario from auth.users where lower(email) = lower(v_email);
  if v_usuario is null then
    raise exception 'Nenhuma conta com o e-mail %. Cadastre-se no app primeiro.', v_email;
  end if;

  select id into v_loja from public.lojas where slug = v_slug;
  if v_loja is null then
    raise exception 'Nenhuma loja com o slug %.', v_slug;
  end if;

  update public.usuarios set role = 'lojista', loja_id = v_loja where id = v_usuario;
  raise notice 'Conta % agora é lojista da loja %.', v_email, v_slug;
end;
$$;

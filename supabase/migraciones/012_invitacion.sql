-- =====================================================================
-- Dolor & Hambre · Mesa — migración 012: invitación más segura
--
-- Antes: código de 6 letras hex (16.7 millones de combinaciones), sin
-- límite de intentos y sin forma de cambiarlo. Con una cuenta de Discord
-- se podía adivinar por fuerza bruta, y a quien sacaban de la campaña le
-- bastaba el mismo código para volver.
-- Ahora:
--   * Código de 8 caracteres de un alfabeto de 30 sin los que se confunden
--     al leer o dictar (0 O 1 I L, y V que suena como B): 30^8 ≈ 656 mil
--     millones de combinaciones. Los códigos actuales se cambian por uno
--     nuevo (el viejo deja de servir).
--   * cambiar_codigo(): solo el DJ; el código y el link anteriores dejan
--     de servir.
--   * unirse_campania(): a lo más 10 códigos equivocados por usuario por
--     hora. Con un código equivocado regresa NULL en vez de error (un
--     error desharía el registro del intento); la app dice el mensaje.
-- Se puede correr más de una vez.
-- =====================================================================

begin;

create or replace function public.nuevo_codigo()
returns text language plpgsql volatile set search_path = public as $$
declare
  alfabeto constant text := '23456789ABCDEFGHJKMNPQRSTUWXYZ';
  c text;
begin
  loop
    select string_agg(substr(alfabeto, azar(30), 1), '') into c from generate_series(1, 8);
    exit when not exists (select 1 from campanias where codigo_invitacion = c);
  end loop;
  return c;
end;
$$;

alter table public.campanias alter column codigo_invitacion set default public.nuevo_codigo();

-- Los códigos de antes (6 hex) se cambian uno por uno (así cada uno ve
-- los anteriores al revisar que no se repita)
do $$
declare r record;
begin
  for r in select id from public.campanias where codigo_invitacion !~ '^[2-9A-HJKMNP-UW-Z]{8}$' loop
    update public.campanias set codigo_invitacion = public.nuevo_codigo() where id = r.id;
  end loop;
end $$;

-- Intentos equivocados de unirse. Nadie la lee ni escribe directo: solo
-- unirse_campania() (security definer).
create table if not exists public.intentos_union (
  usuario_id  uuid not null,
  momento     timestamptz not null default now()
);
create index if not exists intentos_union_usuario on public.intentos_union (usuario_id, momento);
alter table public.intentos_union enable row level security;
revoke all on public.intentos_union from public, anon, authenticated;

create or replace function public.unirse_campania(p_codigo text)
returns campanias language plpgsql security definer set search_path = public as $$
declare
  c campanias;
  limpio text := upper(regexp_replace(left(coalesce(p_codigo, ''), 64), '[^0-9A-Za-z]', '', 'g'));
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  if (select count(*) from intentos_union
       where usuario_id = auth.uid() and momento > now() - interval '1 hour') >= 10 then
    raise exception 'Demasiados códigos equivocados. Espera una hora o pídele al DJ el link de invitación.';
  end if;
  select * into c from campanias where codigo_invitacion = limpio;
  if not found then
    delete from intentos_union where usuario_id = auth.uid() and momento < now() - interval '1 hour';
    insert into intentos_union (usuario_id) values (auth.uid());
    return null;
  end if;
  perform asegurar_perfil();
  insert into miembros (campania_id, usuario_id, rol) values (c.id, auth.uid(), 'jugador')
  on conflict do nothing;
  return c;
end;
$$;

create or replace function public.cambiar_codigo(p_campania uuid)
returns text language plpgsql security definer set search_path = public as $$
declare nuevo text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  if not es_dj(p_campania) then raise exception 'Solo el DJ puede cambiar el código'; end if;
  update campanias set codigo_invitacion = nuevo_codigo() where id = p_campania
  returning codigo_invitacion into nuevo;
  return nuevo;
end;
$$;

-- Permisos (como en la 008): la app solo llama cambiar_codigo y
-- unirse_campania; nuevo_codigo es interna.
revoke execute on function public.cambiar_codigo(uuid) from public, anon;
grant execute on function public.cambiar_codigo(uuid) to authenticated;
revoke execute on function public.unirse_campania(text) from public, anon;
grant execute on function public.unirse_campania(text) to authenticated;
revoke execute on function public.nuevo_codigo() from public, anon, authenticated;

commit;

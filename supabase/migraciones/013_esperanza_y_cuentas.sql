-- =====================================================================
-- Dolor & Hambre · Mesa — migración 013: Esperanza en el servidor y
-- cuentas regresivas ocultas. Solo agrega cosas; se puede correr más de
-- una vez.
--
-- 1. gastar_esperanza(): gastar Esperanza en una Experiencia la resta el
--    servidor. Antes la app mandaba «esperanza = lo que yo veía − costo»;
--    si al mismo tiempo llegaba una ganancia (una tirada con Esperanza),
--    una pisaba a la otra.
-- 2. cuentas_revision: cuando el DJ oculta una cuenta regresiva, el tiempo
--    real no le manda nada al jugador (ya no la puede ver) y se le quedaba
--    en pantalla hasta recargar. Como con el lore (007): cada vez que una
--    cuenta se oculta o se muestra sube este contador y la app del jugador
--    vuelve a leer las cuentas.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Gastar Esperanza
-- ---------------------------------------------------------------------
create or replace function public.gastar_esperanza(p_personaje uuid, p_cantidad int)
returns personajes language plpgsql security definer set search_path = public as $$
declare pj personajes;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  if p_cantidad is null or p_cantidad < 1 or p_cantidad > 6 then
    raise exception 'La cantidad de Esperanza debe ser de 1 a 6';
  end if;
  select * into pj from personajes where id = p_personaje;
  if not found then raise exception 'Ese personaje no existe'; end if;
  if not es_dj(pj.campania_id)
     and not (pj.usuario_id = auth.uid() and es_miembro(pj.campania_id)) then
    raise exception 'Solo el dueño del personaje o el DJ pueden gastar su Esperanza';
  end if;
  -- Resta sobre lo que haya en ese momento (no sobre lo que veía la app)
  update personajes
     set esperanza = esperanza - p_cantidad, actualizado = now()
   where id = p_personaje and esperanza >= p_cantidad
  returning * into pj;
  if not found then raise exception 'Te falta Esperanza: cuesta %', p_cantidad; end if;
  return pj;
end;
$$;

revoke execute on function public.gastar_esperanza(uuid, int) from public, anon;
grant execute on function public.gastar_esperanza(uuid, int) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Aviso de cuentas ocultas
-- ---------------------------------------------------------------------
create table if not exists public.cuentas_revision (
  campania_id  uuid primary key references public.campanias (id) on delete cascade,
  rev          bigint not null default 0,
  actualizado  timestamptz not null default now()
);

create or replace function public.cuentas_avisar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.visible is not distinct from old.visible then return null; end if;
  insert into cuentas_revision (campania_id, rev) values (new.campania_id, 1)
  on conflict (campania_id) do update set rev = cuentas_revision.rev + 1, actualizado = now();
  return null;
end;
$$;
revoke execute on function public.cuentas_avisar() from public, anon, authenticated;

drop trigger if exists cuentas_avisar on public.cuentas_regresivas;
create trigger cuentas_avisar after update of visible on public.cuentas_regresivas
  for each row execute function public.cuentas_avisar();

-- El contador solo se lee; lo escribe el disparador
alter table public.cuentas_revision enable row level security;
drop policy if exists cuentas_revision_ver on public.cuentas_revision;
create policy cuentas_revision_ver on public.cuentas_revision for select to authenticated
  using (es_miembro(campania_id));

do $$
begin
  begin alter publication supabase_realtime add table public.cuentas_revision; exception when duplicate_object then null; end;
end $$;

commit;

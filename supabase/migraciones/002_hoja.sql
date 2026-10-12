-- =====================================================================
-- Dolor & Hambre · Mesa — migración 002: hoja de personaje y homebrew
-- Solo agrega cosas; no borra nada de la 001.
-- =====================================================================

-- La hoja completa vive en un JSON (ver datos/esquema_hoja.md)
alter table public.personajes add column if not exists hoja jsonb not null default '{}'::jsonb;
alter table public.personajes add column if not exists actualizado timestamptz not null default now();

-- Contenido casero por campaña: clases, subclases, cartas, armas, armaduras…
-- "datos" usa el mismo formato que los archivos del SRD en datos/es/.
create table if not exists public.contenido_casero (
  id           uuid primary key default gen_random_uuid(),
  campania_id  uuid not null references public.campanias (id) on delete cascade,
  tipo         text not null check (tipo in ('clase', 'subclase', 'carta', 'arma', 'armadura',
                                             'ancestria', 'comunidad', 'dominio', 'objeto')),
  nombre       text not null check (char_length(nombre) between 1 and 80),
  datos        jsonb not null default '{}'::jsonb,
  creado_por   uuid references public.perfiles (id) on delete set null,
  creado       timestamptz not null default now(),
  actualizado  timestamptz not null default now()
);
create index if not exists contenido_casero_campania on public.contenido_casero (campania_id, tipo);

-- ---------------------------------------------------------------------
-- ajustar_hoja(): cambia UNA parte de la hoja sin pisar las demás.
-- Si dos personas editan a la vez (tú los PG, el DJ el oro), no se borran
-- los cambios del otro, porque solo se reemplaza la ruta indicada.
--   p_ruta: '{pg}', '{oro,bolsas}', '{armas,0,activa}', …
-- ---------------------------------------------------------------------
create or replace function public.ajustar_hoja(p_personaje uuid, p_ruta text[], p_valor jsonb)
returns personajes language plpgsql security definer set search_path = public as $$
declare pj personajes;
begin
  select * into pj from personajes where id = p_personaje;
  if not found then raise exception 'Ese personaje no existe'; end if;
  if pj.usuario_id is distinct from auth.uid() and not es_dj(pj.campania_id) then
    raise exception 'Solo el dueño del personaje o el DJ pueden editarlo';
  end if;
  if p_ruta is null or array_length(p_ruta, 1) is null then raise exception 'Falta la ruta'; end if;
  if octet_length(p_valor::text) > 200000 then raise exception 'El valor es demasiado grande'; end if;
  update personajes
     set hoja = jsonb_set(hoja, p_ruta, p_valor, true), actualizado = now()
   where id = p_personaje
  returning * into pj;
  return pj;
end;
$$;

-- Tope de tamaño para que nadie infle la base por accidente
create or replace function public.vigilar_hoja()
returns trigger language plpgsql as $$
begin
  if octet_length(new.hoja::text) > 300000 then raise exception 'La hoja es demasiado grande'; end if;
  new.actualizado := now();
  return new;
end;
$$;
drop trigger if exists vigilar_hoja on public.personajes;
create trigger vigilar_hoja before insert or update of hoja on public.personajes
  for each row execute function public.vigilar_hoja();

-- Importar varios personajes de golpe (lo usa el DJ para traer los de Notion)
create or replace function public.importar_personajes(p_campania uuid, p_personajes jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare x jsonb; n int := 0;
begin
  if not es_dj(p_campania) then raise exception 'Solo el DJ puede importar personajes'; end if;
  for x in select * from jsonb_array_elements(p_personajes) loop
    insert into personajes (campania_id, usuario_id, nombre, color, esperanza, esperanza_max, estres, estres_max, hoja)
    values (
      p_campania, null, x ->> 'nombre', coalesce(x ->> 'color', '#e8b04a'),
      least(coalesce((x ->> 'esperanza')::int, 2), coalesce((x ->> 'esperanza_max')::int, 6)),
      coalesce((x ->> 'esperanza_max')::int, 6),
      least(coalesce((x ->> 'estres')::int, 0), coalesce((x ->> 'estres_max')::int, 6)),
      coalesce((x ->> 'estres_max')::int, 6),
      coalesce(x -> 'hoja', '{}'::jsonb)
    );
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- El DJ asigna un personaje a un jugador (los importados llegan sin dueño)
create or replace function public.asignar_personaje(p_personaje uuid, p_usuario uuid)
returns personajes language plpgsql security definer set search_path = public as $$
declare pj personajes;
begin
  select * into pj from personajes where id = p_personaje;
  if not found then raise exception 'Ese personaje no existe'; end if;
  if not es_dj(pj.campania_id) then raise exception 'Solo el DJ asigna personajes'; end if;
  if p_usuario is not null and not exists (select 1 from miembros where campania_id = pj.campania_id and usuario_id = p_usuario) then
    raise exception 'Esa persona no es parte de la campaña';
  end if;
  update personajes set usuario_id = p_usuario where id = p_personaje returning * into pj;
  return pj;
end;
$$;

-- El jugador no puede cambiar a quién pertenece su personaje ni moverlo de campaña
create or replace function public.proteger_personaje()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.usuario_id is distinct from old.usuario_id or new.campania_id <> old.campania_id)
     and not es_dj(old.campania_id) then
    raise exception 'Solo el DJ puede cambiar el dueño o la campaña de un personaje';
  end if;
  return new;
end;
$$;
drop trigger if exists proteger_personaje on public.personajes;
create trigger proteger_personaje before update on public.personajes
  for each row execute function public.proteger_personaje();

-- ---------------------------------------------------------------------
-- Seguridad del contenido casero: todos en la campaña lo ven; cualquiera
-- en la campaña puede crear; edita o borra quien lo creó o el DJ.
-- ---------------------------------------------------------------------
alter table public.contenido_casero enable row level security;

drop policy if exists casero_ver on public.contenido_casero;
create policy casero_ver on public.contenido_casero for select to authenticated
  using (es_miembro(campania_id));
drop policy if exists casero_crear on public.contenido_casero;
create policy casero_crear on public.contenido_casero for insert to authenticated
  with check (es_miembro(campania_id) and creado_por = auth.uid());
drop policy if exists casero_editar on public.contenido_casero;
create policy casero_editar on public.contenido_casero for update to authenticated
  using (creado_por = auth.uid() or es_dj(campania_id))
  with check (es_miembro(campania_id));
drop policy if exists casero_borrar on public.contenido_casero;
create policy casero_borrar on public.contenido_casero for delete to authenticated
  using (creado_por = auth.uid() or es_dj(campania_id));

do $$
begin
  begin alter publication supabase_realtime add table public.contenido_casero; exception when duplicate_object then null; end;
end $$;

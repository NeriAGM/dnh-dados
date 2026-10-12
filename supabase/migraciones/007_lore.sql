-- =====================================================================
-- Dolor & Hambre · Mesa — migración 007: lore de la campaña
-- Páginas en árbol (como Notion) que el DJ escribe dentro de la app.
-- Todo entra OCULTO: solo el DJ lo ve hasta que marca "Visible para la
-- mesa". Una subpágina solo se ve si ella Y todas sus páginas madre
-- están visibles. Solo agrega cosas.
-- =====================================================================

create table if not exists public.lore (
  id           uuid primary key default gen_random_uuid(),
  campania_id  uuid not null references public.campanias (id) on delete cascade,
  padre_id     uuid references public.lore (id) on delete cascade, -- null = raíz
  titulo       text not null default 'Página sin título' check (char_length(titulo) between 1 and 200),
  icono        text check (icono is null or char_length(icono) between 1 and 16), -- un emoji
  contenido    text not null default '' check (octet_length(contenido) <= 200000), -- markdown
  orden        int  not null default 0,          -- entre hermanas, de menor a mayor
  visible      boolean not null default false,  -- ¿la mesa la ve?
  origen       text check (origen is null or char_length(origen) <= 200), -- p. ej. id de Notion, para reimportar
  creado       timestamptz not null default now(),
  actualizado  timestamptz not null default now(),
  check (padre_id is distinct from id)
);
create index if not exists lore_campania on public.lore (campania_id, padre_id, orden);
create index if not exists lore_padre on public.lore (padre_id);
-- Para reimportar sin duplicar: una página de Notion = una fila por campaña
create unique index if not exists lore_origen on public.lore (campania_id, origen) where origen is not null;

-- ---------------------------------------------------------------------
-- La madre debe ser de la misma campaña y no puede haber ciclos
-- (una página dentro de su propia hija). También pone "actualizado".
-- ---------------------------------------------------------------------
create or replace function public.lore_validar()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c uuid;
  p uuid;
  n int := 0;
begin
  if tg_op = 'UPDATE' and new.campania_id <> old.campania_id then
    raise exception 'Una página no puede cambiar de campaña';
  end if;
  new.actualizado := now();
  if new.padre_id is not null and (tg_op = 'INSERT' or new.padre_id is distinct from old.padre_id) then
    select campania_id into c from lore where id = new.padre_id;
    if c is null or c <> new.campania_id then raise exception 'La página madre no es de esta campaña'; end if;
    p := new.padre_id;
    while p is not null loop
      if p = new.id then raise exception 'Una página no puede quedar dentro de sí misma'; end if;
      n := n + 1;
      if n > 64 then raise exception 'Demasiados niveles de páginas (máximo 64)'; end if;
      select padre_id into p from lore where id = p;
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists lore_validar on public.lore;
create trigger lore_validar before insert or update on public.lore
  for each row execute function public.lore_validar();

-- ---------------------------------------------------------------------
-- ¿La mesa ve esta página? Ella y todas sus madres deben estar visibles.
-- Es security definer para poder subir por el árbol aunque las madres
-- estén ocultas (y para que la política no se llame a sí misma).
-- ---------------------------------------------------------------------
create or replace function public.lore_visible(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with recursive cadena (id, padre_id, visible, n) as (
    select id, padre_id, visible, 1 from lore where id = p_id
    union all
    select l.id, l.padre_id, l.visible, c.n + 1
    from lore l join cadena c on l.id = c.padre_id
    where c.n < 65
  )
  select coalesce(bool_and(visible), false) from cadena
$$;
revoke execute on function public.lore_visible(uuid) from public, anon;
grant execute on function public.lore_visible(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Aviso para los jugadores: el tiempo real no les manda nada cuando una
-- página DEJA de ser visible para ellos (ni cuando se revela una madre
-- con hijas que ya estaban visibles). Cada cambio de visibilidad, de
-- lugar en el árbol o borrado sube este contador y la app de cada
-- jugador vuelve a pedir el índice. (Una página nueva no avisa: si ya es
-- visible, le llega directo por el tiempo real; si no, no hay nada que ver.)
-- ---------------------------------------------------------------------
create table if not exists public.lore_revision (
  campania_id  uuid primary key references public.campanias (id) on delete cascade,
  rev          bigint not null default 0,
  actualizado  timestamptz not null default now()
);

create or replace function public.lore_avisar()
returns trigger language plpgsql security definer set search_path = public as $$
declare c uuid := coalesce(new.campania_id, old.campania_id);
begin
  if tg_op = 'UPDATE' and new.visible = old.visible and new.padre_id is not distinct from old.padre_id then
    return null;
  end if;
  -- Si se está borrando la campaña entera, ya no hay a quién avisar
  insert into lore_revision (campania_id, rev)
    select c, 1 where exists (select 1 from campanias where id = c)
  on conflict (campania_id) do update set rev = lore_revision.rev + 1, actualizado = now();
  return null;
end $$;

drop trigger if exists lore_avisar on public.lore;
create trigger lore_avisar after update or delete on public.lore
  for each row execute function public.lore_avisar();

-- ---------------------------------------------------------------------
-- Seguridad (RLS)
-- ---------------------------------------------------------------------
alter table public.lore enable row level security;
alter table public.lore_revision enable row level security;

drop policy if exists lore_dj on public.lore;
create policy lore_dj on public.lore for all to authenticated
  using (es_dj(campania_id)) with check (es_dj(campania_id));

drop policy if exists lore_ver on public.lore;
create policy lore_ver on public.lore for select to authenticated
  using (visible and es_miembro(campania_id) and (padre_id is null or lore_visible(padre_id)));

-- El contador solo se lee; lo escribe el trigger
drop policy if exists lore_revision_ver on public.lore_revision;
create policy lore_revision_ver on public.lore_revision for select to authenticated
  using (es_miembro(campania_id));

-- ---------------------------------------------------------------------
-- Storage: bucket PRIVADO "lore" (imágenes de hasta 5 MB).
-- Ruta: "<campania_id>/<archivo>". En el markdown la imagen se escribe
-- ![texto](lore:<archivo>) y la app pide un enlace firmado.
-- El DJ sube, cambia y borra. Un jugador solo puede abrir una imagen si
-- aparece en alguna página que él puede ver.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lore', 'lore', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- Campaña de una ruta "<uuid>/<archivo>" (null si no empieza con un uuid)
create or replace function public.lore_campania(p_nombre text)
returns uuid language sql immutable set search_path = public as $$
  select case
    when split_part(p_nombre, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then split_part(p_nombre, '/', 1)::uuid
  end
$$;

create or replace function public.lore_imagen_visible(p_nombre text)
returns boolean language sql stable security definer set search_path = public as $$
  select split_part(p_nombre, '/', 2) <> '' and exists (
    select 1 from lore l
    where l.campania_id = lore_campania(p_nombre)
      and l.visible
      and position('lore:' || split_part(p_nombre, '/', 2) in l.contenido) > 0
      and lore_visible(l.id)
  )
$$;
revoke execute on function public.lore_imagen_visible(text) from public, anon;
grant execute on function public.lore_imagen_visible(text) to authenticated;

drop policy if exists lore_imagen_ver on storage.objects;
create policy lore_imagen_ver on storage.objects for select to authenticated
  using (
    bucket_id = 'lore'
    and (es_dj(lore_campania(name)) or (es_miembro(lore_campania(name)) and lore_imagen_visible(name)))
  );

drop policy if exists lore_imagen_subir on storage.objects;
create policy lore_imagen_subir on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lore'
    and array_length(storage.foldername(name), 1) = 1
    and es_dj(lore_campania(name))
  );

drop policy if exists lore_imagen_cambiar on storage.objects;
create policy lore_imagen_cambiar on storage.objects for update to authenticated
  using (bucket_id = 'lore' and es_dj(lore_campania(name)))
  with check (bucket_id = 'lore' and array_length(storage.foldername(name), 1) = 1 and es_dj(lore_campania(name)));

drop policy if exists lore_imagen_borrar on storage.objects;
create policy lore_imagen_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'lore' and es_dj(lore_campania(name)));

-- ---------------------------------------------------------------------
-- Tiempo real
-- ---------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.lore; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.lore_revision; exception when duplicate_object then null; end;
end $$;

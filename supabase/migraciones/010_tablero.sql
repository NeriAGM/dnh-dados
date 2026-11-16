-- =====================================================================
-- Dolor & Hambre · Mesa — migración 010: tablero compartido del DJ
-- El DJ arma tableros (mapa, ilustración o nota de texto) con fichas y
-- niebla, y muestra uno a la mesa. Los jugadores solo ven el tablero que
-- se está mostrando y solo mueven la ficha de su PJ (con mover_ficha).
-- No depende de la 009. Solo agrega cosas.
--
-- Riesgos aceptados por Neri (15/11/2026):
-- * La niebla se pinta en la pantalla del jugador: su navegador recibe el
--   mapa completo y las fichas tapadas. Con las herramientas del navegador
--   se puede ver lo que está bajo la niebla.
-- * Las señales («¡aquí!») viajan por el canal de tiempo real de la mesa,
--   que es público para quien sepa el id de la campaña (un uuid que no se
--   adivina). No llevan mapas, solo un punto y un color.
--
-- Requiere Postgres 15 o más (on delete set null de una sola columna).
-- =====================================================================

create table if not exists public.tableros (
  id           uuid primary key default gen_random_uuid(),
  campania_id  uuid not null references public.campanias (id) on delete cascade,
  nombre       text not null check (char_length(nombre) between 1 and 80),
  -- Nombre del archivo dentro de "<campania_id>/" en el bucket "tablero" (nulo = solo texto)
  imagen       text check (imagen is null or (char_length(imagen) between 1 and 200 and position('/' in imagen) = 0)),
  texto        text not null default '' check (char_length(texto) <= 2000),
  -- Cuadrícula de niebla { c, f, d } (ver src/lib/tablero.js); nula = sin niebla
  niebla       jsonb check (niebla is null or (jsonb_typeof(niebla) = 'object' and octet_length(niebla::text) <= 20000)),
  tam_ficha    real not null default 0.05 check (tam_ficha between 0.01 and 0.3),
  creado       timestamptz not null default now(),
  actualizado  timestamptz not null default now(),
  unique (id, campania_id)
);
create index if not exists tableros_campania on public.tableros (campania_id);

-- El tablero que la mesa está viendo. La llave compuesta impide apuntar al
-- tablero de otra campaña; al borrar el tablero queda en nulo.
alter table public.campanias add column if not exists tablero_id uuid;
do $$
begin
  alter table public.campanias add constraint campanias_tablero_fk
    foreign key (tablero_id, id) references public.tableros (id, campania_id) on delete set null (tablero_id);
exception when duplicate_object then null;
end $$;

create table if not exists public.fichas (
  id            uuid primary key default gen_random_uuid(),
  tablero_id    uuid not null,
  campania_id   uuid not null,
  personaje_id  uuid references public.personajes (id) on delete cascade, -- nulo = adversario o PNJ
  nombre        text not null check (char_length(nombre) between 1 and 40),
  color         text not null default '#a77ce8' check (color ~ '^#[0-9a-fA-F]{6}$'),
  x             real not null default 0.5 check (x between 0 and 1),
  y             real not null default 0.5 check (y between 0 and 1),
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now(),
  foreign key (tablero_id, campania_id) references public.tableros (id, campania_id) on delete cascade
);
create index if not exists fichas_tablero on public.fichas (tablero_id);

drop trigger if exists tableros_actualizado on public.tableros;
create trigger tableros_actualizado before update on public.tableros
  for each row execute function public.tocar_actualizado();
drop trigger if exists fichas_actualizado on public.fichas;
create trigger fichas_actualizado before update on public.fichas
  for each row execute function public.tocar_actualizado();

-- ¿Es el tablero que alguna campaña está mostrando?
create or replace function public.tablero_mostrado(p_tablero uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_tablero is not null and exists (select 1 from campanias where tablero_id = p_tablero)
$$;

-- ---------------------------------------------------------------------
-- RLS: el DJ todo; la mesa solo lee el tablero mostrado y sus fichas
-- ---------------------------------------------------------------------
alter table public.tableros enable row level security;
alter table public.fichas enable row level security;

drop policy if exists tableros_dj on public.tableros;
create policy tableros_dj on public.tableros for all to authenticated
  using (es_dj(campania_id)) with check (es_dj(campania_id));
drop policy if exists tableros_ver on public.tableros;
create policy tableros_ver on public.tableros for select to authenticated
  using (es_miembro(campania_id) and tablero_mostrado(id));

drop policy if exists fichas_dj on public.fichas;
create policy fichas_dj on public.fichas for all to authenticated
  using (es_dj(campania_id)) with check (es_dj(campania_id));
drop policy if exists fichas_ver on public.fichas;
create policy fichas_ver on public.fichas for select to authenticated
  using (es_miembro(campania_id) and tablero_mostrado(tablero_id));

-- Mover una ficha. El DJ mueve cualquiera de su campaña; un jugador solo
-- la de un PJ suyo y solo en el tablero que se está mostrando.
create or replace function public.mover_ficha(p_ficha uuid, p_x real, p_y real)
returns public.fichas language plpgsql security definer set search_path = public as $$
declare
  f fichas;
begin
  select * into f from fichas where id = p_ficha;
  if not found or not es_miembro(f.campania_id) then raise exception 'No existe esa ficha'; end if;
  if not es_dj(f.campania_id) and not (
    tablero_mostrado(f.tablero_id)
    and exists (select 1 from personajes p where p.id = f.personaje_id and p.usuario_id = auth.uid())
  ) then
    raise exception 'Solo puedes mover la ficha de tu personaje';
  end if;
  update fichas
     set x = least(greatest(coalesce(p_x, 0.5), 0), 1),
         y = least(greatest(coalesce(p_y, 0.5), 0), 1)
   where id = p_ficha
  returning * into f;
  return f;
end $$;

-- ---------------------------------------------------------------------
-- Storage: bucket PRIVADO "tablero" (imágenes de hasta 5 MB).
-- Ruta: "<campania_id>/<archivo>". El DJ sube y borra; un miembro solo
-- abre la imagen del tablero que se está mostrando (enlace firmado).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tablero', 'tablero', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create or replace function public.tablero_imagen_visible(p_nombre text)
returns boolean language sql stable security definer set search_path = public as $$
  select split_part(p_nombre, '/', 2) <> '' and split_part(p_nombre, '/', 3) = '' and exists (
    select 1 from campanias c join tableros t on t.id = c.tablero_id
    where c.id = lore_campania(p_nombre) and t.imagen = split_part(p_nombre, '/', 2)
  )
$$;

drop policy if exists tablero_imagen_ver on storage.objects;
create policy tablero_imagen_ver on storage.objects for select to authenticated
  using (
    bucket_id = 'tablero'
    and (es_dj(lore_campania(name)) or (es_miembro(lore_campania(name)) and tablero_imagen_visible(name)))
  );

drop policy if exists tablero_imagen_subir on storage.objects;
create policy tablero_imagen_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'tablero' and array_length(storage.foldername(name), 1) = 1 and es_dj(lore_campania(name)));

drop policy if exists tablero_imagen_cambiar on storage.objects;
create policy tablero_imagen_cambiar on storage.objects for update to authenticated
  using (bucket_id = 'tablero' and es_dj(lore_campania(name)))
  with check (bucket_id = 'tablero' and array_length(storage.foldername(name), 1) = 1 and es_dj(lore_campania(name)));

drop policy if exists tablero_imagen_borrar on storage.objects;
create policy tablero_imagen_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'tablero' and es_dj(lore_campania(name)));

-- ---------------------------------------------------------------------
-- Permisos de las funciones y tiempo real
-- ---------------------------------------------------------------------
revoke execute on function public.tablero_mostrado(uuid) from public, anon;
grant execute on function public.tablero_mostrado(uuid) to authenticated;
revoke execute on function public.tablero_imagen_visible(text) from public, anon;
grant execute on function public.tablero_imagen_visible(text) to authenticated;
revoke execute on function public.mover_ficha(uuid, real, real) from public, anon;
grant execute on function public.mover_ficha(uuid, real, real) to authenticated;

do $$
begin
  begin alter publication supabase_realtime add table public.tableros; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.fichas; exception when duplicate_object then null; end;
end $$;

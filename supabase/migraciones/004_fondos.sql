-- =====================================================================
-- Dolor & Hambre · Mesa — migración 004: fondos personalizados
-- Cada jugador guarda cómo quiere ver su fondo (tablero por momento del
-- día, modo de ajuste y barras) y puede subir hasta 10 imágenes suyas.
-- Solo agrega cosas.
--
-- Riesgo aceptado por Neri: el bucket "fondos" es PÚBLICO. Cualquiera
-- que tenga el enlace exacto de una imagen puede verla (no se puede
-- adivinar fácilmente, pero tampoco es privada).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Ajustes del fondo en el perfil
-- ---------------------------------------------------------------------
alter table public.perfiles
  add column if not exists fondo jsonb not null default '{}'::jsonb;

do $$
begin
  alter table public.perfiles add constraint perfiles_fondo_valido
    check (jsonb_typeof(fondo) = 'object' and octet_length(fondo::text) <= 8000);
exception when duplicate_object then null;
end $$;

-- Guarda el fondo de QUIEN LLAMA y nada más (no recibe id a propósito).
create or replace function public.guardar_fondo(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  if p is null or jsonb_typeof(p) <> 'object' then raise exception 'El ajuste del fondo no es válido'; end if;
  if octet_length(p::text) > 8000 then raise exception 'El ajuste del fondo es demasiado grande'; end if;
  update perfiles set fondo = p where id = auth.uid();
end $$;

revoke execute on function public.guardar_fondo(jsonb) from public, anon;
grant execute on function public.guardar_fondo(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Storage: bucket público "fondos" (solo imágenes, máximo 5 MB)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fondos', 'fondos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- Cuántas imágenes tiene quien llama en su carpeta "<uid>/".
-- Es security definer para que la política no dependa de otras políticas.
create or replace function public.fondos_cuantos()
returns int language sql stable security definer set search_path = public, storage as $$
  select count(*)::int from storage.objects
  where bucket_id = 'fondos' and (storage.foldername(name))[1] = auth.uid()::text
$$;
revoke execute on function public.fondos_cuantos() from public, anon;
grant execute on function public.fondos_cuantos() to authenticated;

-- Ver: cualquiera (el bucket es público de todas formas).
drop policy if exists fondos_ver on storage.objects;
create policy fondos_ver on storage.objects for select
  using (bucket_id = 'fondos');

-- Subir: solo dentro de tu carpeta y si todavía tienes menos de 10.
drop policy if exists fondos_subir on storage.objects;
create policy fondos_subir on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fondos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and array_length(storage.foldername(name), 1) = 1
    and public.fondos_cuantos() < 10
  );

-- Cambiar y borrar: solo lo tuyo.
drop policy if exists fondos_cambiar on storage.objects;
create policy fondos_cambiar on storage.objects for update to authenticated
  using (bucket_id = 'fondos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'fondos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists fondos_borrar on storage.objects;
create policy fondos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'fondos' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- Dolor & Hambre · Mesa — migración 005: la mesa ve el encuentro activo
-- Los encuentros siguen siendo solo del DJ. De ellos se saca una "escena"
-- con lo mínimo que la mesa puede ver: nombre del encuentro y, por cada
-- adversario NO oculto, su nombre, su tipo y un estado (ileso, herido,
-- grave, caído). Nada de PG, Dificultad, umbrales, ataques ni rasgos.
-- La escena la arma la base de datos (un trigger), nadie la escribe a mano.
-- Solo agrega cosas.
-- =====================================================================

-- Nombre del entorno para mostrar (el id del catálogo vive en "entorno")
alter table public.encuentros add column if not exists entorno_nombre text;

create table if not exists public.escenas (
  campania_id   uuid primary key references public.campanias (id) on delete cascade,
  encuentro_id  uuid references public.encuentros (id) on delete set null,
  nombre        text not null,
  entorno       text,                          -- solo el nombre para mostrar
  adversarios   jsonb not null default '[]'::jsonb,
  -- [{ uid, nombre, tipo, estado }]  estado: ileso | herido | grave | caido | null
  actualizado   timestamptz not null default now()
);

alter table public.escenas enable row level security;

drop policy if exists escenas_ver on public.escenas;
create policy escenas_ver on public.escenas for select to authenticated
  using (es_miembro(campania_id));
-- Sin políticas de insert/update/delete: nadie la escribe directo.
revoke insert, update, delete, truncate on public.escenas from anon, authenticated;

-- Estado según los PG marcados contra el máximo (regla ajustable):
--   0 marcados → ileso · menos de la mitad → herido
--   la mitad o más (sin llegar al total) → grave · todos → caido
create or replace function public.estado_adversario(p_pg numeric, p_max numeric)
returns text language sql immutable set search_path = public as $$
  select case
    when p_max is null or p_max <= 0 then null
    when coalesce(p_pg, 0) <= 0 then 'ileso'
    when p_pg >= p_max then 'caido'
    when p_pg * 2 >= p_max then 'grave'
    else 'herido'
  end
$$;

-- Lee un número de un jsonb sin tronar si viene raro
create or replace function public.numero_json(p jsonb)
returns numeric language sql immutable set search_path = public as $$
  select case when jsonb_typeof(p) = 'number' then (p #>> '{}')::numeric end
$$;

-- Vuelve a armar la escena de una campaña desde su encuentro activo.
-- Si no hay encuentro activo, o no queda ningún adversario a la vista
-- (p. ej. una emboscada con todo oculto), la mesa no ve nada.
create or replace function public.reconstruir_escena(p_campania uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  e   encuentros;
  adv jsonb;
begin
  if p_campania is null then return; end if;
  select * into e from encuentros
    where campania_id = p_campania and activo
    order by actualizado desc limit 1;
  if not found then
    delete from escenas where campania_id = p_campania;
    return;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'uid', x->>'uid',
           'nombre', coalesce(nullif(btrim(x->>'nombre'), ''), nullif(btrim(x->>'nombre_base'), ''), 'Adversario'),
           'tipo', x->>'tipo',
           'estado', estado_adversario(numero_json(x->'pg'), numero_json(x->'pg_max'))
         ) order by n), '[]'::jsonb)
    into adv
    from jsonb_array_elements(case when jsonb_typeof(e.adversarios) = 'array' then e.adversarios else '[]'::jsonb end)
         with ordinality as t(x, n)
    where jsonb_typeof(x) = 'object'
      and coalesce(x->'oculto', 'false'::jsonb) <> 'true'::jsonb;

  if jsonb_array_length(adv) = 0 then
    delete from escenas where campania_id = p_campania;
    return;
  end if;

  insert into escenas (campania_id, encuentro_id, nombre, entorno, adversarios, actualizado)
  values (p_campania, e.id, e.nombre, nullif(btrim(e.entorno_nombre), ''), adv, now())
  on conflict (campania_id) do update
    set encuentro_id = excluded.encuentro_id,
        nombre       = excluded.nombre,
        entorno      = excluded.entorno,
        adversarios  = excluded.adversarios,
        actualizado  = excluded.actualizado
    where (escenas.encuentro_id, escenas.nombre, escenas.entorno, escenas.adversarios)
          is distinct from (excluded.encuentro_id, excluded.nombre, excluded.entorno, excluded.adversarios);
end;
$$;

create or replace function public.encuentros_a_escena()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op <> 'INSERT' then perform reconstruir_escena(old.campania_id); end if;
  if tg_op <> 'DELETE' and (tg_op = 'INSERT' or new.campania_id is distinct from old.campania_id) then
    perform reconstruir_escena(new.campania_id);
  end if;
  return null;
end;
$$;

drop trigger if exists encuentros_escena on public.encuentros;
create trigger encuentros_escena after insert or update or delete on public.encuentros
  for each row execute function public.encuentros_a_escena();

revoke execute on function public.reconstruir_escena(uuid) from public, anon, authenticated;
revoke execute on function public.encuentros_a_escena() from public, anon, authenticated;

-- Por si ya había un encuentro activo antes de esta migración
select public.reconstruir_escena(id) from public.campanias;

do $$
begin
  begin alter publication supabase_realtime add table public.escenas; exception when duplicate_object then null; end;
end $$;

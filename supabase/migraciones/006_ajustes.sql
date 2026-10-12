-- =====================================================================
-- Dolor & Hambre · Mesa — migración 006: ajustes de campaña
-- "Reglas de la mesa" que decide el DJ y aplican a todos (daño masivo,
-- monedas, si la mesa ve el entorno…). Viven en campanias.ajustes como
-- un objeto jsonb; la lista y los valores por defecto están en
-- src/lib/ajustes.js. Los miembros ya pueden leer campanias (política
-- campanias_ver) y los cambios llegan por tiempo real (campanias ya está
-- en la publicación supabase_realtime desde la 001).
-- Solo agrega cosas (y vuelve a definir reconstruir_escena para que
-- respete "mostrarEntorno").
-- =====================================================================

alter table public.campanias add column if not exists ajustes jsonb not null default '{}'::jsonb;

do $$
begin
  alter table public.campanias add constraint campanias_ajustes_validos
    check (jsonb_typeof(ajustes) = 'object' and octet_length(ajustes::text) <= 4000);
exception when duplicate_object then null;
end $$;

-- Guarda ajustes: solo el DJ de esa campaña. Por defecto se mezclan con
-- los que ya había (p_reemplazar = true los reemplaza todos). Un valor
-- null borra esa llave (vuelve al valor por defecto). Solo se aceptan
-- valores sencillos: sí/no, número o texto corto.
create or replace function public.guardar_ajustes(p_campania uuid, p jsonb, p_reemplazar boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  k text;
  v jsonb;
  nuevos jsonb;
begin
  if not es_dj(p_campania) then raise exception 'Solo el DJ cambia las reglas de la mesa'; end if;
  if p is null or jsonb_typeof(p) <> 'object' then raise exception 'Los ajustes deben ser un objeto'; end if;
  if octet_length(p::text) > 4000 then raise exception 'Los ajustes son demasiado grandes'; end if;
  for k, v in select * from jsonb_each(p) loop
    if char_length(k) not between 1 and 40 then raise exception 'Nombre de ajuste inválido'; end if;
    if jsonb_typeof(v) not in ('boolean', 'number', 'string', 'null') then
      raise exception 'El ajuste % debe ser sí/no, número o texto', k;
    end if;
    if jsonb_typeof(v) = 'string' and char_length(v #>> '{}') > 200 then
      raise exception 'El ajuste % es demasiado largo', k;
    end if;
  end loop;

  select jsonb_strip_nulls(case when p_reemplazar then p else ajustes || p end)
    into nuevos from campanias where id = p_campania;
  update campanias set ajustes = nuevos where id = p_campania;

  -- La escena depende de "mostrarEntorno": se vuelve a armar
  perform reconstruir_escena(p_campania);
  return nuevos;
end;
$$;

-- Igual que en la 005, pero si el DJ apagó "mostrarEntorno" la escena
-- no lleva el nombre del entorno (así ni siquiera le llega a la mesa).
create or replace function public.reconstruir_escena(p_campania uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  e   encuentros;
  adv jsonb;
  ver_entorno boolean;
begin
  if p_campania is null then return; end if;
  select * into e from encuentros
    where campania_id = p_campania and activo
    order by actualizado desc limit 1;
  if not found then
    delete from escenas where campania_id = p_campania;
    return;
  end if;

  select coalesce(ajustes->'mostrarEntorno', 'true'::jsonb) <> 'false'::jsonb
    into ver_entorno from campanias where id = p_campania;

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
  values (p_campania, e.id, e.nombre,
          case when coalesce(ver_entorno, true) then nullif(btrim(e.entorno_nombre), '') end,
          adv, now())
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

revoke execute on function public.reconstruir_escena(uuid) from public, anon, authenticated;
revoke execute on function public.guardar_ajustes(uuid, jsonb, boolean) from public, anon;
grant execute on function public.guardar_ajustes(uuid, jsonb, boolean) to authenticated;

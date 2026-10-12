-- =====================================================================
-- Dolor & Hambre · Mesa — migración 008: auditoría de seguridad
-- Cierra huecos encontrados al revisar 001–007 (pruebas en
-- supabase/pruebas/auditoria.test.mjs). Solo agrega o reemplaza
-- funciones, políticas y disparadores; no borra tablas, columnas ni datos.
-- Se puede correr más de una vez.
--
-- Datos que ya existen: NO se agregan restricciones CHECK nuevas (una
-- fila vieja que no cumpliera ya no se podría editar). Las reglas nuevas
-- viven en disparadores que solo revisan el valor cuando CAMBIA.
-- =====================================================================

-- Todo o nada: si algo falla a la mitad, no se aplica nada.
begin;

-- ---------------------------------------------------------------------
-- 1. ajustar_hoja(): sin sesión se podía editar a los personajes sin
--    dueño (importados): "null is distinct from null" es falso y dejaba
--    pasar. Y quien ya no es miembro (lo sacaron o se salió) seguía
--    pudiendo editar la hoja de su personaje.
-- ---------------------------------------------------------------------
create or replace function public.ajustar_hoja(p_personaje uuid, p_ruta text[], p_valor jsonb)
returns personajes language plpgsql security definer set search_path = public as $$
declare pj personajes;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  select * into pj from personajes where id = p_personaje;
  if not found then raise exception 'Ese personaje no existe'; end if;
  if not es_dj(pj.campania_id)
     and not (pj.usuario_id = auth.uid() and es_miembro(pj.campania_id)) then
    raise exception 'Solo el dueño del personaje o el DJ pueden editarlo (y el dueño debe seguir en la campaña)';
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

-- Lo mismo por el camino directo (update a personajes): el dueño debe
-- seguir siendo miembro.
drop policy if exists personajes_editar on public.personajes;
create policy personajes_editar on public.personajes for update to authenticated
  using (es_dj(campania_id) or (usuario_id = auth.uid() and es_miembro(campania_id)))
  with check (es_dj(campania_id) or (usuario_id = auth.uid() and es_miembro(campania_id)));

-- ---------------------------------------------------------------------
-- 2. tirar(): el jugador armaba sus propios dados de Dualidad (d100 de
--    Esperanza contra d2 de Miedo, 30d12 quedándose el más alto, el Miedo
--    restando…) y así ganaba Esperanza o críticos (que limpian Estrés)
--    casi siempre y nunca le daba Miedo al DJ. Ahora:
--    * acción/reacción: exactamente un d12 de Esperanza y un d12 de Miedo,
--      sueltos y sumando; a lo más un d6 de ventaja (+) o desventaja (−).
--    * tipo "dj" (tirada de adversario): solo el DJ.
--    * daño crítico: solo en tiradas de daño.
--    * la etiqueta se recorta a 200 caracteres (antes no tenía tope).
-- ---------------------------------------------------------------------
create or replace function public.tirar(
  p_campania     uuid,
  p_personaje    uuid,
  p_tipo         text,
  p_grupos       jsonb,
  p_modificador  int     default 0,
  p_dificultad   int     default null,
  p_oculta       boolean default false,
  p_etiqueta     text    default null,
  p_dano_critico boolean default false
) returns lanzamientos
language plpgsql security definer set search_path = public, extensions as $$
declare
  g            jsonb;
  i            int;
  lados        int;
  cantidad     int;
  signo        int;
  signo_crudo  int;
  rol          text;
  conservar    text;
  valores      int[];
  idx_keep     int;
  total_dados  int := 0;
  dados_out    jsonb := '[]'::jsonb;
  partes       text[] := '{}';
  v_esp        int;
  v_miedo      int;
  v_total      int;
  v_desenlace  text;
  v_critico    boolean := false;
  v_exito      boolean;
  v_efectos    jsonb := '{}'::jsonb;
  v_formula    text;
  max_extra    int := 0;
  n_total      int := 0;
  n_esp        int := 0;
  n_miedo      int := 0;
  n_ventaja    int := 0;
  dual         boolean := p_tipo in ('accion', 'reaccion');
  v_miedo_dj   int;
  pj           personajes;
  fila         lanzamientos;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  if not es_miembro(p_campania) then raise exception 'No eres parte de esta campaña'; end if;
  if p_tipo is null or p_tipo not in ('accion', 'reaccion', 'dano', 'dj', 'libre') then
    raise exception 'Tipo de tirada desconocido: %', p_tipo;
  end if;
  if p_tipo = 'dj' and not es_dj(p_campania) then
    raise exception 'Solo el DJ hace tiradas de adversario';
  end if;
  if coalesce(p_dano_critico, false) and p_tipo <> 'dano' then
    raise exception 'El daño crítico solo aplica a tiradas de daño';
  end if;
  if p_grupos is null or jsonb_typeof(p_grupos) <> 'array' or jsonb_array_length(p_grupos) = 0 then
    raise exception 'La tirada no tiene dados';
  end if;
  if abs(coalesce(p_modificador, 0)) > 999 then raise exception 'Modificador fuera de rango'; end if;

  if p_personaje is not null then
    select * into pj from personajes where id = p_personaje and campania_id = p_campania;
    if not found then raise exception 'Ese personaje no está en esta campaña'; end if;
    if pj.usuario_id is distinct from auth.uid() and not es_dj(p_campania) then
      raise exception 'Solo puedes tirar con tu propio personaje';
    end if;
  end if;

  if p_oculta and not es_dj(p_campania) then
    raise exception 'Solo el DJ puede hacer tiradas ocultas';
  end if;

  for g in select * from jsonb_array_elements(p_grupos) loop
    if jsonb_typeof(g) <> 'object' then raise exception 'Dado inválido'; end if;
    lados       := (g ->> 'lados')::int;
    cantidad    := coalesce((g ->> 'cantidad')::int, 1);
    rol         := coalesce(g ->> 'rol', 'normal');
    signo_crudo := coalesce((g ->> 'signo')::int, 1);
    signo       := case when signo_crudo < 0 then -1 else 1 end;
    conservar   := g ->> 'conservar';

    if lados is null or lados < 2 or lados > 100 then raise exception 'Dado inválido'; end if;
    if cantidad < 1 or cantidad > 30 then raise exception 'Demasiados dados en un grupo'; end if;
    if rol not in ('esperanza', 'miedo', 'ventaja', 'desventaja', 'normal') then
      raise exception 'Rol de dado desconocido: %', rol;
    end if;

    -- Dados de Dualidad: siempre un d12 suelto que suma
    if dual and rol in ('esperanza', 'miedo') then
      if lados <> 12 or cantidad <> 1 or signo < 0 or conservar is not null then
        raise exception 'El dado de % debe ser un solo d12 que suma', case when rol = 'esperanza' then 'Esperanza' else 'Miedo' end;
      end if;
      if rol = 'esperanza' then n_esp := n_esp + 1; else n_miedo := n_miedo + 1; end if;
    end if;
    -- Ventaja / desventaja: un solo d6 (+ ventaja, − desventaja)
    if rol in ('ventaja', 'desventaja') then
      if lados <> 6 or cantidad <> 1 or conservar is not null
         or (rol = 'ventaja' and signo < 0) or (rol = 'desventaja' and signo > 0) then
        raise exception 'La ventaja es +1d6 y la desventaja −1d6';
      end if;
      n_ventaja := n_ventaja + 1;
      if n_ventaja > 1 then raise exception 'Solo va un d6 de ventaja o desventaja por tirada'; end if;
    end if;

    n_total := n_total + cantidad;
    if n_total > 40 then raise exception 'Máximo 40 dados por tirada'; end if;

    valores := '{}';
    for i in 1..cantidad loop
      valores := valores || azar(lados);
    end loop;

    -- Ventaja del DJ (2d20 y se queda con el más alto) o desventaja (el más bajo)
    idx_keep := null;
    if conservar in ('alto', 'bajo') and cantidad > 1 then
      idx_keep := 1;
      for i in 2..cantidad loop
        if (conservar = 'alto' and valores[i] > valores[idx_keep])
           or (conservar = 'bajo' and valores[i] < valores[idx_keep]) then
          idx_keep := i;
        end if;
      end loop;
    end if;

    for i in 1..cantidad loop
      dados_out := dados_out || jsonb_build_object(
        'lados', lados, 'valor', valores[i], 'rol', rol, 'signo', signo,
        'descartado', (idx_keep is not null and i <> idx_keep));
      if idx_keep is null or i = idx_keep then
        total_dados := total_dados + signo * valores[i];
        if rol = 'esperanza' then v_esp := valores[i]; end if;
        if rol = 'miedo' then v_miedo := valores[i]; end if;
        if p_tipo = 'dj' and lados = 20 and valores[i] = 20 then v_critico := true; end if;
      end if;
    end loop;

    if p_dano_critico and signo > 0 then
      max_extra := max_extra + lados * (case when idx_keep is null then cantidad else 1 end);
    end if;

    partes := partes || ((case when signo < 0 then '-' else '+' end)
              || case when conservar = 'alto' then cantidad || 'd' || lados || 'alto'
                      when conservar = 'bajo' then cantidad || 'd' || lados || 'bajo'
                      else cantidad || 'd' || lados end);
  end loop;

  v_formula := ltrim(array_to_string(partes, ' '), '+');
  if coalesce(p_modificador, 0) <> 0 then
    v_formula := v_formula || case when p_modificador > 0 then ' +' else ' ' end || p_modificador;
  end if;
  v_total := total_dados + coalesce(p_modificador, 0) + max_extra;
  if max_extra > 0 then
    v_efectos := v_efectos || jsonb_build_object('dano_critico_extra', max_extra);
  end if;

  -- Dualidad: acción y reacción necesitan exactamente un dado de Esperanza y uno de Miedo
  if dual then
    if n_esp <> 1 or n_miedo <> 1 then
      raise exception 'Una tirada de % necesita el d12 de Esperanza y el d12 de Miedo', p_tipo;
    end if;
    if v_esp = v_miedo then
      v_desenlace := 'critico'; v_critico := true;
    elsif v_esp > v_miedo then
      v_desenlace := 'esperanza';
    else
      v_desenlace := 'miedo';
    end if;
  end if;

  if p_dificultad is not null then
    v_exito := v_critico and p_tipo in ('accion', 'reaccion', 'dj') or v_total >= p_dificultad;
  elsif v_critico and dual then
    v_exito := true;
  end if;

  -- Efectos automáticos (solo tiradas de acción, nunca reacción).
  -- Cada update es atómico (least() con el tope y CHECK en la tabla), así
  -- que dos tiradas al mismo tiempo no pasan el máximo.
  if p_tipo = 'accion' then
    if v_desenlace in ('esperanza', 'critico') and pj.id is not null then
      update personajes
         set esperanza = least(esperanza + 1, esperanza_max),
             estres    = case when v_desenlace = 'critico' then greatest(estres - 1, 0) else estres end
       where id = pj.id
      returning * into pj;
      v_efectos := v_efectos || jsonb_build_object('esperanza', pj.esperanza);
      if v_desenlace = 'critico' then
        v_efectos := v_efectos || jsonb_build_object('estres_limpiado', true);
      end if;
    elsif v_desenlace = 'miedo' then
      update campanias set miedo = least(miedo + 1, 12) where id = p_campania returning miedo into v_miedo_dj;
      v_efectos := v_efectos || jsonb_build_object('miedo', v_miedo_dj);
    end if;
  end if;

  insert into lanzamientos (campania_id, usuario_id, personaje_id, tipo, etiqueta, formula, dados,
                            modificador, total, dificultad, desenlace, exito, critico, oculta, efectos)
  values (p_campania, auth.uid(), p_personaje, p_tipo, left(nullif(btrim(p_etiqueta), ''), 200), v_formula, dados_out,
          coalesce(p_modificador, 0), v_total, p_dificultad, v_desenlace, v_exito, v_critico,
          coalesce(p_oculta, false), v_efectos)
  returning * into fila;
  return fila;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Storage "fondos": la política de lectura era para TODOS (hasta sin
--    sesión), así que cualquiera con la llave pública podía LISTAR el
--    bucket entero: las carpetas (= ids de usuario) y cada imagen. Eso
--    rompe el riesgo aceptado en la 004 ("solo quien tenga el enlace
--    exacto"). Para mostrar una imagen de un bucket público no hace falta
--    esta política (el enlace público no pasa por RLS); la app solo lista
--    tu propia carpeta.
-- ---------------------------------------------------------------------
drop policy if exists fondos_ver on storage.objects;
create policy fondos_ver on storage.objects for select to authenticated
  using (bucket_id = 'fondos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 4. Imágenes del lore: se buscaba "lore:<archivo>" como pedazo de texto,
--    así que una imagen oculta "jefe" se abría si una página visible
--    mencionaba "lore:jefe-final.png". Ahora se busca la referencia
--    completa tal como la escribe la app: "(lore:<archivo>)".
-- ---------------------------------------------------------------------
create or replace function public.lore_imagen_visible(p_nombre text)
returns boolean language sql stable security definer set search_path = public as $$
  select split_part(p_nombre, '/', 2) <> '' and split_part(p_nombre, '/', 3) = '' and exists (
    select 1 from lore l
    where l.campania_id = lore_campania(p_nombre)
      and l.visible
      and position('(lore:' || split_part(p_nombre, '/', 2) || ')' in l.contenido) > 0
      and lore_visible(l.id)
  )
$$;

-- ---------------------------------------------------------------------
-- 5. Miembros: el DJ podía borrar su propia fila de DJ y la campaña se
--    quedaba sin DJ para siempre (nadie más puede manejar Miedo,
--    encuentros, lore ni ajustes, y nadie puede volverse DJ).
-- ---------------------------------------------------------------------
drop policy if exists miembros_salir on public.miembros;
create policy miembros_salir on public.miembros for delete to authenticated
  using (rol <> 'dj' and (usuario_id = auth.uid() or es_dj(campania_id)));

-- ---------------------------------------------------------------------
-- 6. Perfiles
--    * Nombre al registrarse: un global_name vacío ("") ganaba y el
--      perfil quedaba sin nombre; ahora se salta lo vacío y se recorta a
--      80. La foto solo se toma si es un enlace https razonable.
--    * Quien ya existía en auth.users antes de la 001 no tiene perfil y
--      crear/unirse a una campaña tronaba por la llave foránea: se crea
--      el perfil que falte (aquí, y al vuelo en crear/unirse).
--    * Cada quien podía poner en su perfil un nombre enorme o en blanco o
--      una "foto" javascript:…; ahora se revisa cuando cambia.
-- ---------------------------------------------------------------------
create or replace function public.nombre_de_perfil(p_meta jsonb, p_correo text)
returns text language sql immutable set search_path = public as $$
  select left(coalesce(
    nullif(btrim(p_meta -> 'custom_claims' ->> 'global_name'), ''),
    nullif(btrim(p_meta ->> 'full_name'), ''),
    nullif(btrim(p_meta ->> 'name'), ''),
    nullif(btrim(split_part(p_correo, '@', 1)), ''),
    'Aventurero'), 80)
$$;

create or replace function public.avatar_de_perfil(p_meta jsonb)
returns text language sql immutable set search_path = public as $$
  select case when a ~ '^https://' and char_length(a) <= 500 then a end
  from (select p_meta ->> 'avatar_url' as a) x
$$;

create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, nombre, avatar_url)
  values (new.id, nombre_de_perfil(new.raw_user_meta_data, new.email), avatar_de_perfil(new.raw_user_meta_data))
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.asegurar_perfil()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into perfiles (id, nombre, avatar_url)
    select u.id, nombre_de_perfil(u.raw_user_meta_data, u.email), avatar_de_perfil(u.raw_user_meta_data)
      from auth.users u where u.id = auth.uid()
  on conflict (id) do nothing;
end;
$$;

create or replace function public.crear_campania(p_nombre text)
returns campanias language plpgsql security definer set search_path = public as $$
declare c campanias;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  perform asegurar_perfil();
  insert into campanias (nombre, dj_id) values (trim(p_nombre), auth.uid()) returning * into c;
  insert into miembros (campania_id, usuario_id, rol) values (c.id, auth.uid(), 'dj');
  return c;
end;
$$;

create or replace function public.unirse_campania(p_codigo text)
returns campanias language plpgsql security definer set search_path = public as $$
declare c campanias;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  select * into c from campanias where codigo_invitacion = upper(trim(p_codigo));
  if not found then raise exception 'Ese código no existe. Revisa que esté bien escrito.'; end if;
  perform asegurar_perfil();
  insert into miembros (campania_id, usuario_id, rol) values (c.id, auth.uid(), 'jugador')
  on conflict do nothing;
  return c;
end;
$$;

-- Perfiles que falten (usuarios de antes de la 001). Solo inserta.
insert into public.perfiles (id, nombre, avatar_url)
select u.id, public.nombre_de_perfil(u.raw_user_meta_data, u.email), public.avatar_de_perfil(u.raw_user_meta_data)
  from auth.users u
on conflict (id) do nothing;

create or replace function public.vigilar_perfil()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.nombre is distinct from old.nombre then
    new.nombre := btrim(new.nombre);
    if new.nombre is null or char_length(new.nombre) not between 1 and 80 then
      raise exception 'El nombre debe tener entre 1 y 80 caracteres';
    end if;
  end if;
  if new.avatar_url is distinct from old.avatar_url and new.avatar_url is not null
     and (new.avatar_url !~ '^https://' or char_length(new.avatar_url) > 500) then
    raise exception 'La foto debe ser un enlace https de máximo 500 caracteres';
  end if;
  return new;
end;
$$;
drop trigger if exists vigilar_perfil on public.perfiles;
create trigger vigilar_perfil before update on public.perfiles
  for each row execute function public.vigilar_perfil();

-- ---------------------------------------------------------------------
-- 7. Entradas sin tope
--    * contenido_casero.datos: cualquier miembro podía guardar un JSON
--      de megas (llega a todos por tiempo real). Tope 300 KB, como la hoja.
--    * personajes.color va directo al CSS (style:background y --pj): se
--      podía poner url(https://…) y el navegador de cada miembro le
--      pedía esa imagen a un servidor ajeno (rastreo de IP). Solo se
--      aceptan #hex o un nombre de color; al importar, uno raro se
--      cambia por el de siempre en vez de tronar.
-- ---------------------------------------------------------------------
create or replace function public.vigilar_casero()
returns trigger language plpgsql set search_path = public as $$
begin
  if (tg_op = 'INSERT' or new.datos is distinct from old.datos)
     and octet_length(new.datos::text) > 300000 then
    raise exception 'El contenido casero es demasiado grande (máximo 300 KB)';
  end if;
  return new;
end;
$$;
drop trigger if exists vigilar_casero on public.contenido_casero;
create trigger vigilar_casero before insert or update of datos on public.contenido_casero
  for each row execute function public.vigilar_casero();

create or replace function public.vigilar_color()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.color ~ '^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{1,30})$' then return new; end if;
  if tg_op = 'INSERT' then
    new.color := '#e8b04a';
    return new;
  end if;
  if new.color is distinct from old.color then
    raise exception 'Ese color no es válido: usa uno como #e8b04a';
  end if;
  return new;
end;
$$;
drop trigger if exists vigilar_color on public.personajes;
create trigger vigilar_color before insert or update of color on public.personajes
  for each row execute function public.vigilar_color();

-- ---------------------------------------------------------------------
-- 8. Permisos de las funciones. Postgres (y Supabase por defecto) deja
--    que PUBLIC y anon ejecuten toda función nueva: sin sesión se podían
--    llamar todas por la API (así se colaba el hueco 1). Ahora solo
--    authenticated ejecuta las que usa la app o las políticas, y nadie
--    ejecuta directo las auxiliares ni las de disparadores.
-- ---------------------------------------------------------------------
do $$
declare
  f text;
  para_la_app text[] := array[
    'public.es_miembro(uuid)', 'public.es_dj(uuid)', 'public.comparte_campania(uuid)',
    'public.crear_campania(text)', 'public.unirse_campania(text)',
    'public.tirar(uuid, uuid, text, jsonb, int, int, boolean, text, boolean)',
    'public.ajustar_miedo(uuid, int)', 'public.ajustar_hoja(uuid, text[], jsonb)',
    'public.importar_personajes(uuid, jsonb)', 'public.asignar_personaje(uuid, uuid)',
    'public.activar_encuentro(uuid)', 'public.guardar_fondo(jsonb)', 'public.fondos_cuantos()',
    'public.guardar_ajustes(uuid, jsonb, boolean)', 'public.lore_visible(uuid)',
    'public.lore_campania(text)', 'public.lore_imagen_visible(text)'
  ];
  internas text[] := array[
    'public.azar(int)', 'public.crear_perfil()', 'public.vigilar_hoja()', 'public.proteger_personaje()',
    'public.tocar_actualizado()', 'public.estado_adversario(numeric, numeric)', 'public.numero_json(jsonb)',
    'public.reconstruir_escena(uuid)', 'public.encuentros_a_escena()', 'public.lore_validar()',
    'public.lore_avisar()', 'public.nombre_de_perfil(jsonb, text)', 'public.avatar_de_perfil(jsonb)',
    'public.asegurar_perfil()', 'public.vigilar_perfil()', 'public.vigilar_casero()', 'public.vigilar_color()'
  ];
begin
  foreach f in array para_la_app loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  foreach f in array internas loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;

commit;

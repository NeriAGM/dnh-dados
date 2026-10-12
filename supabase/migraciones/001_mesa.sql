-- =====================================================================
-- Dolor & Hambre · Mesa — migración 001
-- Tablas nuevas al lado de las viejas (tiradas, jugadores): no borra nada.
--
-- Idea central de seguridad: NADIE inserta tiradas directo en la tabla.
-- La única puerta es la función tirar(), que corre en el servidor, saca el
-- azar de un generador criptográfico (pgcrypto) y guarda el resultado.
-- Así ningún jugador puede "inventarse" un 12 desde la consola del navegador.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

create table if not exists public.perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text not null default 'Aventurero',
  avatar_url  text,
  creado      timestamptz not null default now()
);

create table if not exists public.campanias (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null check (char_length(nombre) between 1 and 80),
  dj_id              uuid not null references public.perfiles (id),
  miedo              int  not null default 0 check (miedo between 0 and 12),
  codigo_invitacion  text not null unique
                     default upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 6)),
  creado             timestamptz not null default now()
);

create table if not exists public.miembros (
  campania_id  uuid not null references public.campanias (id) on delete cascade,
  usuario_id   uuid not null references public.perfiles (id) on delete cascade,
  rol          text not null check (rol in ('dj', 'jugador')),
  unido        timestamptz not null default now(),
  primary key (campania_id, usuario_id)
);

-- Versión mínima del personaje: lo que las tiradas necesitan tocar.
-- La hoja completa (rasgos, armas, cartas…) llega en la fase 3.
create table if not exists public.personajes (
  id              uuid primary key default gen_random_uuid(),
  campania_id     uuid not null references public.campanias (id) on delete cascade,
  usuario_id      uuid references public.perfiles (id) on delete set null,
  nombre          text not null check (char_length(nombre) between 1 and 80),
  color           text not null default '#e8b04a',
  esperanza       int  not null default 2 check (esperanza >= 0),
  esperanza_max   int  not null default 6 check (esperanza_max between 0 and 6),
  estres          int  not null default 0 check (estres >= 0),
  estres_max      int  not null default 6 check (estres_max between 0 and 12),
  creado          timestamptz not null default now(),
  check (esperanza <= esperanza_max),
  check (estres <= estres_max)
);

create table if not exists public.lanzamientos (
  id             bigint generated always as identity primary key,
  campania_id    uuid not null references public.campanias (id) on delete cascade,
  usuario_id     uuid not null references public.perfiles (id) on delete cascade,
  personaje_id   uuid references public.personajes (id) on delete set null,
  tipo           text not null check (tipo in ('accion', 'reaccion', 'dano', 'dj', 'libre')),
  etiqueta       text,
  formula        text not null,
  dados          jsonb not null,            -- [{lados, valor, rol, signo, descartado}]
  modificador    int  not null default 0,
  total          int  not null,
  dificultad     int,
  desenlace      text check (desenlace in ('esperanza', 'miedo', 'critico')),
  exito          boolean,
  critico        boolean not null default false,
  oculta         boolean not null default false,
  efectos        jsonb not null default '{}'::jsonb,
  creado         timestamptz not null default now()
);

create index if not exists lanzamientos_campania_creado
  on public.lanzamientos (campania_id, creado desc);

-- ---------------------------------------------------------------------
-- Funciones auxiliares (security definer para que las políticas no se
-- llamen a sí mismas en bucle)
-- ---------------------------------------------------------------------

create or replace function public.es_miembro(p_campania uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from miembros
                 where campania_id = p_campania and usuario_id = auth.uid());
$$;

create or replace function public.es_dj(p_campania uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from miembros
                 where campania_id = p_campania and usuario_id = auth.uid() and rol = 'dj');
$$;

create or replace function public.comparte_campania(p_otro uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from miembros a join miembros b using (campania_id)
                 where a.usuario_id = auth.uid() and b.usuario_id = p_otro);
$$;

-- Entero aleatorio uniforme entre 1 y n, con muestreo por rechazo
-- (rejection sampling): se descartan los valores que harían que unos
-- números salieran un poquito más que otros.
create or replace function public.azar(n int)
returns int language plpgsql volatile set search_path = public, extensions as $$
declare
  limite bigint := (2147483648 / n) * n;
  r      bigint;
begin
  if n < 2 or n > 1000 then raise exception 'Dado inválido: d%', n; end if;
  loop
    r := (('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) & 2147483647;
    exit when r < limite;
  end loop;
  return (r % n) + 1;
end;
$$;

-- Perfil automático al registrarse (toma el nombre de Discord o del correo).
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, nombre, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data -> 'custom_claims' ->> 'global_name',
             new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name',
             split_part(new.email, '@', 1),
             'Aventurero'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_registrarse on auth.users;
create trigger al_registrarse after insert on auth.users
  for each row execute function public.crear_perfil();

-- ---------------------------------------------------------------------
-- Campañas: crear y unirse con código
-- ---------------------------------------------------------------------

create or replace function public.crear_campania(p_nombre text)
returns campanias language plpgsql security definer set search_path = public as $$
declare c campanias;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
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
  insert into miembros (campania_id, usuario_id, rol) values (c.id, auth.uid(), 'jugador')
  on conflict do nothing;
  return c;
end;
$$;

-- ---------------------------------------------------------------------
-- tirar(): la única forma de crear una tirada
--
-- p_grupos: [{ "lados": 12, "cantidad": 1, "rol": "esperanza", "signo": 1,
--              "conservar": null | "alto" | "bajo" }, ...]
--   rol: esperanza | miedo | ventaja | desventaja | normal
-- Reglas que aplica (SRD de Daggerheart):
--   * acción: con Esperanza → +1 Esperanza al personaje; con Miedo → +1 Miedo
--     al DJ; dados iguales → crítico: éxito automático, +1 Esperanza y
--     se limpia 1 Estrés.
--   * reacción: no genera Esperanza ni Miedo.
--   * dj: d20 natural 20 (en el dado que cuenta) → crítico.
--   * daño crítico: se suma el máximo posible de los dados.
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
  pj           personajes;
  fila         lanzamientos;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  if not es_miembro(p_campania) then raise exception 'No eres parte de esta campaña'; end if;
  if p_tipo not in ('accion', 'reaccion', 'dano', 'dj', 'libre') then
    raise exception 'Tipo de tirada desconocido: %', p_tipo;
  end if;
  if jsonb_typeof(p_grupos) <> 'array' or jsonb_array_length(p_grupos) = 0 then
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
    lados     := (g ->> 'lados')::int;
    cantidad  := coalesce((g ->> 'cantidad')::int, 1);
    rol       := coalesce(g ->> 'rol', 'normal');
    signo     := case when coalesce((g ->> 'signo')::int, 1) < 0 then -1 else 1 end;
    conservar := g ->> 'conservar';

    if lados is null or lados < 2 or lados > 100 then raise exception 'Dado inválido'; end if;
    if cantidad < 1 or cantidad > 30 then raise exception 'Demasiados dados en un grupo'; end if;
    if rol not in ('esperanza', 'miedo', 'ventaja', 'desventaja', 'normal') then
      raise exception 'Rol de dado desconocido: %', rol;
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
  if p_tipo in ('accion', 'reaccion') then
    if v_esp is null or v_miedo is null then
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
  elsif v_critico and p_tipo in ('accion', 'reaccion') then
    v_exito := true;
  end if;

  -- Efectos automáticos (solo tiradas de acción, nunca reacción)
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
      update campanias set miedo = least(miedo + 1, 12) where id = p_campania;
      v_efectos := v_efectos || jsonb_build_object('miedo', (select miedo from campanias where id = p_campania));
    end if;
  end if;

  insert into lanzamientos (campania_id, usuario_id, personaje_id, tipo, etiqueta, formula, dados,
                            modificador, total, dificultad, desenlace, exito, critico, oculta, efectos)
  values (p_campania, auth.uid(), p_personaje, p_tipo, nullif(trim(p_etiqueta), ''), v_formula, dados_out,
          coalesce(p_modificador, 0), v_total, p_dificultad, v_desenlace, v_exito, v_critico,
          coalesce(p_oculta, false), v_efectos)
  returning * into fila;
  return fila;
end;
$$;

-- Ajustes manuales del DJ al Miedo (gastarlo o corregirlo)
create or replace function public.ajustar_miedo(p_campania uuid, p_delta int)
returns int language plpgsql security definer set search_path = public as $$
declare m int;
begin
  if not es_dj(p_campania) then raise exception 'Solo el DJ maneja el Miedo'; end if;
  update campanias set miedo = greatest(0, least(12, miedo + p_delta))
   where id = p_campania returning miedo into m;
  return m;
end;
$$;

-- ---------------------------------------------------------------------
-- Seguridad a nivel de fila (RLS)
-- ---------------------------------------------------------------------

alter table public.perfiles     enable row level security;
alter table public.campanias    enable row level security;
alter table public.miembros     enable row level security;
alter table public.personajes   enable row level security;
alter table public.lanzamientos enable row level security;

drop policy if exists perfiles_ver on public.perfiles;
create policy perfiles_ver on public.perfiles for select to authenticated
  using (id = auth.uid() or comparte_campania(id));
drop policy if exists perfiles_editar on public.perfiles;
create policy perfiles_editar on public.perfiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists campanias_ver on public.campanias;
create policy campanias_ver on public.campanias for select to authenticated
  using (es_miembro(id));
drop policy if exists campanias_editar on public.campanias;
create policy campanias_editar on public.campanias for update to authenticated
  using (es_dj(id)) with check (es_dj(id));

drop policy if exists miembros_ver on public.miembros;
create policy miembros_ver on public.miembros for select to authenticated
  using (es_miembro(campania_id));
drop policy if exists miembros_salir on public.miembros;
create policy miembros_salir on public.miembros for delete to authenticated
  using (usuario_id = auth.uid() or es_dj(campania_id));

drop policy if exists personajes_ver on public.personajes;
create policy personajes_ver on public.personajes for select to authenticated
  using (es_miembro(campania_id));
drop policy if exists personajes_crear on public.personajes;
create policy personajes_crear on public.personajes for insert to authenticated
  with check (es_dj(campania_id) or (es_miembro(campania_id) and usuario_id = auth.uid()));
drop policy if exists personajes_editar on public.personajes;
create policy personajes_editar on public.personajes for update to authenticated
  using (es_dj(campania_id) or usuario_id = auth.uid())
  with check (es_dj(campania_id) or usuario_id = auth.uid());
drop policy if exists personajes_borrar on public.personajes;
create policy personajes_borrar on public.personajes for delete to authenticated
  using (es_dj(campania_id));

-- Las tiradas ocultas solo las ven el DJ y quien tiró.
drop policy if exists lanzamientos_ver on public.lanzamientos;
create policy lanzamientos_ver on public.lanzamientos for select to authenticated
  using (es_miembro(campania_id) and (not oculta or usuario_id = auth.uid() or es_dj(campania_id)));
drop policy if exists lanzamientos_borrar on public.lanzamientos;
create policy lanzamientos_borrar on public.lanzamientos for delete to authenticated
  using (es_dj(campania_id));
-- Sin política de insert/update: solo tirar() escribe aquí.

-- Las funciones auxiliares no se exponen como API.
revoke execute on function public.azar(int) from public, anon, authenticated;
revoke execute on function public.crear_perfil() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Tiempo real
-- ---------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.lanzamientos; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.campanias;    exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.personajes;   exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.miembros;     exception when duplicate_object then null; end;
end $$;

-- =====================================================================
-- 014 · Ayudar a un Aliado: cada ayudante lo confirma y la ayuda cancela
--       la desventaja (decisiones de Neri, 16/11/2026)
--
-- 1. ayudas: quien ayuda lo marca en su pantalla («te ayudo»). Sin esa
--    marca, tirar() no le resta Esperanza a nadie. La marca dura 10
--    minutos y se borra cuando su aliado hace una tirada de acción (se use
--    o no). Solo se escribe con ofrecer_ayuda(), retirar_ayuda() y tirar().
-- 2. Con desventaja también se puede recibir ayuda. Ventaja y desventaja se
--    cancelan una por una (SRD 2.0 p. 49): la ayuda del primer ayudante
--    cancela el d6 de desventaja (ninguno de los dos se tira) y, si ayudan
--    más, cuenta el d6 más alto de los demás. Todos gastan su Esperanza.
--
-- tirar() conserva sus parámetros (los de la 009): solo cambia por dentro.
-- Se puede correr más de una vez.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. Marcas de «te ayudo»
-- ---------------------------------------------------------------------
create table if not exists public.ayudas (
  ayudante_id  uuid primary key references public.personajes (id) on delete cascade,
  objetivo_id  uuid not null references public.personajes (id) on delete cascade,
  campania_id  uuid not null references public.campanias (id) on delete cascade,
  usuario_id   uuid not null,
  creado       timestamptz not null default now(),
  check (ayudante_id <> objetivo_id)
);
create index if not exists ayudas_objetivo on public.ayudas (objetivo_id);

alter table public.ayudas enable row level security;
drop policy if exists ayudas_ver on public.ayudas;
create policy ayudas_ver on public.ayudas for select to authenticated
  using (es_miembro(campania_id));
-- Nadie la escribe directo: solo las funciones de abajo
revoke insert, update, delete on public.ayudas from anon, authenticated;

create or replace function public.ofrecer_ayuda(p_ayudante uuid, p_objetivo uuid)
returns ayudas language plpgsql security definer set search_path = public as $$
declare a personajes; o personajes; fila ayudas;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  select * into a from personajes where id = p_ayudante;
  if not found then raise exception 'Ese personaje no existe'; end if;
  if not es_dj(a.campania_id)
     and not (a.usuario_id = auth.uid() and es_miembro(a.campania_id)) then
    raise exception 'Solo el dueño del personaje o el DJ pueden ofrecer su ayuda';
  end if;
  select * into o from personajes where id = p_objetivo and campania_id = a.campania_id;
  if not found then raise exception 'Ese aliado no está en esta campaña'; end if;
  if a.id = o.id then raise exception 'Un personaje no se puede ayudar a sí mismo'; end if;
  if a.esperanza < 1 then raise exception 'Para ayudar necesitas 1 Esperanza'; end if;
  insert into ayudas (ayudante_id, objetivo_id, campania_id, usuario_id)
  values (a.id, o.id, a.campania_id, auth.uid())
  on conflict (ayudante_id) do update
    set objetivo_id = excluded.objetivo_id, campania_id = excluded.campania_id,
        usuario_id = excluded.usuario_id, creado = now()
  returning * into fila;
  return fila;
end;
$$;

create or replace function public.retirar_ayuda(p_ayudante uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a personajes;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  select * into a from personajes where id = p_ayudante;
  if not found then return; end if;
  if not es_dj(a.campania_id)
     and not (a.usuario_id = auth.uid() and es_miembro(a.campania_id)) then
    raise exception 'Solo el dueño del personaje o el DJ pueden retirar su ayuda';
  end if;
  delete from ayudas where ayudante_id = p_ayudante;
end;
$$;

revoke execute on function public.ofrecer_ayuda(uuid, uuid) from public, anon;
grant execute on function public.ofrecer_ayuda(uuid, uuid) to authenticated;
revoke execute on function public.retirar_ayuda(uuid) from public, anon;
grant execute on function public.retirar_ayuda(uuid) to authenticated;

do $$
begin
  begin alter publication supabase_realtime add table public.ayudas; exception when duplicate_object then null; end;
end $$;

-- ---------------------------------------------------------------------
-- 2. tirar(): pide la confirmación y la ayuda cancela la desventaja
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
  p_dano_critico boolean default false,
  p_ayudantes    uuid[]  default null
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
  -- Ayudar a un Aliado
  v_ayudantes  uuid[] := '{}';
  n_ayud       int := 0;
  desv_cancelada boolean := false;
  n_tiran      int;
  desfase      int;
  v_adv_propio int;
  idx_adv      int;
  valores_ayud int[] := '{}';
  v_adv_max    int;
  keep_ayud    int;
  n_gastaron   int;
  v_gastos     jsonb;
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

  -- Ayudantes: sin repetidos, de esta campaña, nunca quien tira
  select coalesce(array_agg(distinct a), '{}') into v_ayudantes
    from unnest(coalesce(p_ayudantes, '{}'::uuid[])) a where a is not null;
  n_ayud := coalesce(array_length(v_ayudantes, 1), 0);
  if n_ayud > 0 then
    if p_tipo <> 'accion' then
      raise exception 'Ayudar a un Aliado solo va en tiradas de acción (no en reacciones)';
    end if;
    if p_personaje is null then raise exception 'Para recibir ayuda, tira con un personaje'; end if;
    if p_personaje = any(v_ayudantes) then raise exception 'Un personaje no se puede ayudar a sí mismo'; end if;
    if n_ayud > 12 then raise exception 'Demasiados ayudantes'; end if;
    if (select count(*) from personajes where id = any(v_ayudantes) and campania_id = p_campania) <> n_ayud then
      raise exception 'Uno de los ayudantes no está en esta campaña';
    end if;
    -- Cada ayudante lo confirma en su pantalla («te ayudo»); la marca dura 10 minutos
    if (select count(*) from ayudas where ayudante_id = any(v_ayudantes) and objetivo_id = p_personaje
         and creado > now() - interval '10 minutes') <> n_ayud then
      raise exception 'Alguien que marcaste no ha confirmado su ayuda en su pantalla';
    end if;
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
    -- Ventaja / desventaja propia: un solo d6 (+ ventaja, − desventaja)
    if rol in ('ventaja', 'desventaja') then
      if lados <> 6 or cantidad <> 1 or conservar is not null
         or (rol = 'ventaja' and signo < 0) or (rol = 'desventaja' and signo > 0) then
        raise exception 'La ventaja es +1d6 y la desventaja −1d6';
      end if;
      n_ventaja := n_ventaja + 1;
      if n_ventaja > 1 then raise exception 'Solo va un d6 de ventaja o desventaja por tirada'; end if;
      if rol = 'ventaja' then idx_adv := jsonb_array_length(dados_out); end if;
    end if;

    -- La ayuda cancela la desventaja, una por una (SRD 2.0 p. 49): ese d6 no se tira
    if rol = 'desventaja' and n_ayud > 0 then
      desv_cancelada := true;
      continue;
    end if;

    n_total := n_total + cantidad;
    if n_total + n_ayud > 40 then raise exception 'Máximo 40 dados por tirada'; end if;

    valores := '{}';
    for i in 1..cantidad loop
      valores := valores || azar(lados);
    end loop;
    if rol = 'ventaja' then v_adv_propio := valores[1]; end if;

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

    -- Con ayudantes, el d6 propio va dentro de "máx(Nd6)" en la fórmula
    if not (rol = 'ventaja' and n_ayud > 0) then
      partes := partes || ((case when signo < 0 then '-' else '+' end)
                || case when conservar = 'alto' then cantidad || 'd' || lados || 'alto'
                        when conservar = 'bajo' then cantidad || 'd' || lados || 'bajo'
                        else cantidad || 'd' || lados end);
    end if;
  end loop;

  -- Ayudar a un Aliado: cada ayudante gasta 1 Esperanza y tira su d6;
  -- cuenta solo el d6 de ventaja más alto de todos (SRD 2.0, p. 49).
  -- Con desventaja, la ayuda del primero la cancela (no tira) y los demás tiran.
  if n_ayud > 0 then
    with gasto as (
      update personajes set esperanza = esperanza - 1
       where id = any(v_ayudantes) and esperanza >= 1
      returning id, esperanza
    )
    select count(*)::int, coalesce(jsonb_agg(jsonb_build_object('id', id, 'esperanza', esperanza)), '[]'::jsonb)
      into n_gastaron, v_gastos
      from gasto;
    if n_gastaron <> n_ayud then
      raise exception 'Alguien que ayuda no tiene Esperanza para gastar';
    end if;

    desfase := case when desv_cancelada then 1 else 0 end;
    n_tiran := n_ayud - desfase;
    if desv_cancelada then
      v_efectos := v_efectos || jsonb_build_object('cancela_desventaja', v_ayudantes[1]);
    end if;

    if n_tiran > 0 then
      v_adv_max := coalesce(v_adv_propio, 0);
      for i in 1..n_tiran loop
        valores_ayud := valores_ayud || azar(6);
        if valores_ayud[i] > v_adv_max then v_adv_max := valores_ayud[i]; end if;
      end loop;

      -- Si el d6 propio empata con el más alto, se queda el propio
      keep_ayud := null;
      if v_adv_propio is null or v_adv_propio < v_adv_max then
        for i in 1..n_tiran loop
          if valores_ayud[i] = v_adv_max then keep_ayud := i; exit; end if;
        end loop;
        if v_adv_propio is not null then
          dados_out := jsonb_set(dados_out, array[idx_adv::text, 'descartado'], 'true'::jsonb);
        end if;
      end if;

      total_dados := total_dados - coalesce(v_adv_propio, 0) + v_adv_max;
      for i in 1..n_tiran loop
        dados_out := dados_out || jsonb_build_object(
          'lados', 6, 'valor', valores_ayud[i], 'rol', 'ventaja', 'signo', 1,
          'descartado', keep_ayud is distinct from i, 'ayudante', v_ayudantes[i + desfase]);
      end loop;
      partes := partes || ('+máx(' || (n_tiran + case when v_adv_propio is null then 0 else 1 end) || 'd6)');
    end if;
    v_efectos := v_efectos || jsonb_build_object('ayudantes', v_gastos);
  end if;

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

  -- Las marcas de «te ayudo» valen para una tirada de acción: se usan o se pierden
  if p_tipo = 'accion' and p_personaje is not null then
    delete from ayudas where objetivo_id = p_personaje;
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

revoke execute on function public.tirar(uuid, uuid, text, jsonb, int, int, boolean, text, boolean, uuid[]) from public, anon;
grant execute on function public.tirar(uuid, uuid, text, jsonb, int, int, boolean, text, boolean, uuid[]) to authenticated;

commit;

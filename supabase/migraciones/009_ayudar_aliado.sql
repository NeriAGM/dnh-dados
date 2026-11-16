-- =====================================================================
-- 009 · Ayudar a un Aliado (SRD 2.0, p. 49; no aplica en reacciones, p. 48)
--
-- Cada ayudante gasta 1 Esperanza y tira su propio d6 de ventaja. Quien
-- tira suma SOLO el d6 de ventaja más alto de todos (el suyo, si tenía
-- ventaja, y los de los ayudantes); los demás se descartan.
--
-- tirar() recibe p_ayudantes (ids de personajes de la misma campaña).
-- La Esperanza de los ayudantes se resta aquí, en la misma transacción:
-- si alguno no tiene Esperanza, la tirada no ocurre y nadie gasta nada.
--
-- Por confirmar con Neri: el SRD no dice qué pasa si quien tira tiene
-- desventaja y lo ayudan. Por ahora no se permite (mensaje claro).
--
-- Es la tirar() de la 008 con lo de los ayudantes agregado. Se borra la
-- versión anterior porque cambia la lista de parámetros (si no, quedarían
-- dos funciones tirar y la API no sabría cuál usar).
-- =====================================================================
begin;

drop function if exists public.tirar(uuid, uuid, text, jsonb, int, int, boolean, text, boolean);

create function public.tirar(
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
  hay_desv     boolean := false;
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
      if rol = 'desventaja' then hay_desv := true; end if;
      if rol = 'ventaja' then idx_adv := jsonb_array_length(dados_out); end if;
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
  -- cuenta solo el d6 de ventaja más alto de todos (SRD 2.0, p. 49)
  if n_ayud > 0 then
    if hay_desv then
      raise exception 'Con desventaja no se puede recibir ayuda (regla por confirmar con el DJ)';
    end if;

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

    v_adv_max := coalesce(v_adv_propio, 0);
    for i in 1..n_ayud loop
      valores_ayud := valores_ayud || azar(6);
      if valores_ayud[i] > v_adv_max then v_adv_max := valores_ayud[i]; end if;
    end loop;

    -- Si el d6 propio empata con el más alto, se queda el propio
    keep_ayud := null;
    if v_adv_propio is null or v_adv_propio < v_adv_max then
      for i in 1..n_ayud loop
        if valores_ayud[i] = v_adv_max then keep_ayud := i; exit; end if;
      end loop;
      if v_adv_propio is not null then
        dados_out := jsonb_set(dados_out, array[idx_adv::text, 'descartado'], 'true'::jsonb);
      end if;
    end if;

    total_dados := total_dados - coalesce(v_adv_propio, 0) + v_adv_max;
    for i in 1..n_ayud loop
      dados_out := dados_out || jsonb_build_object(
        'lados', 6, 'valor', valores_ayud[i], 'rol', 'ventaja', 'signo', 1,
        'descartado', keep_ayud is distinct from i, 'ayudante', v_ayudantes[i]);
    end loop;
    partes := partes || ('+máx(' || (n_ayud + case when v_adv_propio is null then 0 else 1 end) || 'd6)');
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

  insert into lanzamientos (campania_id, usuario_id, personaje_id, tipo, etiqueta, formula, dados,
                            modificador, total, dificultad, desenlace, exito, critico, oculta, efectos)
  values (p_campania, auth.uid(), p_personaje, p_tipo, left(nullif(btrim(p_etiqueta), ''), 200), v_formula, dados_out,
          coalesce(p_modificador, 0), v_total, p_dificultad, v_desenlace, v_exito, v_critico,
          coalesce(p_oculta, false), v_efectos)
  returning * into fila;
  return fila;
end;
$$;

-- Mismos permisos que la 008 (§8): toda función nueva nace ejecutable por
-- PUBLIC y anon; solo authenticated debe poder tirar.
revoke execute on function public.tirar(uuid, uuid, text, jsonb, int, int, boolean, text, boolean, uuid[]) from public, anon;
grant execute on function public.tirar(uuid, uuid, text, jsonb, int, int, boolean, text, boolean, uuid[]) to authenticated;

commit;

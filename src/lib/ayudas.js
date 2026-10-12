// Ayudas de reglas para la hoja: recibir daño, descansar y movimientos de muerte.
// Todo aquí es cálculo puro (sin pantalla ni base de datos) para poder probarlo.
// Fuente: SRD 1.0 (docs/reglas/reglas-3-combate.md).

import { pgPorDano, rangoDeNivel } from './reglas.js'

// ---------------------------------------------------------------------
// Recibir daño
// ---------------------------------------------------------------------
export const SEVERIDADES = ['Ninguno', 'Menor', 'Mayor', 'Grave', 'Masivo']

// Casillas de Armadura que quedan libres
export function armaduraLibre(hoja) {
  return Math.max(0, (hoja?.armadura?.puntuacion ?? 0) - (hoja?.armadura_marcada ?? 0))
}

// Orden del SRD: resistencia (mitad, redondeando hacia arriba) → reducciones
// planas → umbrales → marcar una casilla de Armadura (baja un escalón).
// opciones: { masivo, resistencia, reduccion, directo, usarArmadura }
export function resolverDano(dano, hoja, u, opciones = {}) {
  const { masivo = false, resistencia = false, reduccion = 0, directo = false, usarArmadura = false } = opciones
  let final = Math.max(0, Math.floor(Number(dano) || 0))
  if (resistencia) final = Math.ceil(final / 2)
  final = Math.max(0, final - Math.max(0, Math.floor(Number(reduccion) || 0)))
  const pgSinArmadura = pgPorDano(final, u, { masivo })
  const puedeArmadura = !directo && pgSinArmadura > 0 && armaduraLibre(hoja) > 0
  const conArmadura = puedeArmadura && usarArmadura
  const pg = conArmadura ? pgSinArmadura - 1 : pgSinArmadura

  const pgMax = hoja?.pg_max ?? 6
  const pgAntes = hoja?.pg ?? 0
  const pgDespues = Math.min(pgMax, pgAntes + pg)
  return {
    final,
    severidad: SEVERIDADES[pgSinArmadura],
    severidadFinal: SEVERIDADES[pg],
    pgSinArmadura,
    pg,
    puedeArmadura,
    conArmadura,
    pgDespues,
    armaduraDespues: (hoja?.armadura_marcada ?? 0) + (conArmadura ? 1 : 0),
    // Marcó su último PG: toca elegir un movimiento de muerte
    cae: pg > 0 && pgDespues >= pgMax,
  }
}

// ---------------------------------------------------------------------
// Descansos
// ---------------------------------------------------------------------
export const MOVIMIENTOS = {
  corto: [
    { id: 'heridas', nombre: 'Atender heridas', texto: 'Limpia 1d4 + Rango Puntos de Golpe (tuyos o de un aliado).', recurso: 'pg', tirada: true },
    { id: 'estres', nombre: 'Limpiar Estrés', texto: 'Limpia 1d4 + Rango de Estrés.', recurso: 'estres', tirada: true },
    { id: 'armadura', nombre: 'Reparar armadura', texto: 'Limpia 1d4 + Rango casillas de Armadura (tuyas o de un aliado).', recurso: 'armadura', tirada: true },
    { id: 'prepararse', nombre: 'Prepararse', texto: 'Ganas 1 de Esperanza; si te preparas junto con otros PJ, cada uno gana 2.', recurso: 'esperanza' },
  ],
  largo: [
    { id: 'heridas', nombre: 'Atender todas las heridas', texto: 'Limpia todos los Puntos de Golpe (tuyos o de un aliado).', recurso: 'pg', todo: true },
    { id: 'estres', nombre: 'Limpiar todo el Estrés', texto: 'Limpia todo tu Estrés.', recurso: 'estres', todo: true },
    { id: 'armadura', nombre: 'Reparar toda la armadura', texto: 'Limpia todas las casillas de Armadura (tuyas o de un aliado).', recurso: 'armadura', todo: true },
    { id: 'prepararse', nombre: 'Prepararse', texto: 'Ganas 1 de Esperanza; si te preparas junto con otros PJ, cada uno gana 2.', recurso: 'esperanza' },
    { id: 'proyecto', nombre: 'Trabajar en un proyecto', texto: 'Con permiso del DJ, avanza la cuenta regresiva de tu proyecto.', recurso: null },
  ],
}
export const MOVIMIENTOS_POR_DESCANSO = 2
export const MAX_CORTOS_SEGUIDOS = 3

// Fórmula de los movimientos de descanso corto: 1d4 + Rango
export function formulaDescanso(nivel = 1) {
  return { lados: 4, cantidad: 1, mod: rangoDeNivel(nivel) }
}

export function avisoMiedoDescanso(tipo) {
  return tipo === 'largo'
    ? 'El DJ gana 1d4 + número de PJ de Miedo y puede avanzar una cuenta regresiva de largo plazo.'
    : 'El DJ gana 1d4 de Miedo.'
}

// Valida la elección: exactamente dos movimientos (se puede repetir uno).
export function validarDescanso(tipo, elegidos) {
  const ids = MOVIMIENTOS[tipo]?.map((m) => m.id) ?? []
  if (!ids.length) return 'Tipo de descanso desconocido.'
  if (elegidos.length !== MOVIMIENTOS_POR_DESCANSO) return `Elige ${MOVIMIENTOS_POR_DESCANSO} movimientos (puedes repetir uno).`
  if (elegidos.some((e) => !ids.includes(e.id))) return 'Ese movimiento no existe en este descanso.'
  return null
}

// Calcula cómo quedan los recursos tras el descanso.
// estado: { pg, pg_max, estres, estres_max, armadura, armadura_max, esperanza, esperanza_max }
// elegidos: [{ id, valor?, enGrupo? }] — "valor" es el total de 1d4 + Rango ya tirado.
export function aplicarDescanso(tipo, estado, elegidos) {
  const s = { ...estado }
  const detalle = []
  for (const e of elegidos) {
    const mov = MOVIMIENTOS[tipo].find((m) => m.id === e.id)
    if (!mov) continue
    if (mov.recurso === 'esperanza') {
      const gana = e.enGrupo ? 2 : 1
      const antes = s.esperanza
      s.esperanza = Math.min(s.esperanza_max, s.esperanza + gana)
      detalle.push({ id: mov.id, nombre: mov.nombre, cantidad: s.esperanza - antes })
    } else if (mov.recurso) {
      const clave = mov.recurso
      const antes = s[clave]
      s[clave] = mov.todo ? 0 : Math.max(0, s[clave] - Math.max(0, e.valor ?? 0))
      detalle.push({ id: mov.id, nombre: mov.nombre, cantidad: antes - s[clave], tirada: e.valor ?? null })
    } else {
      detalle.push({ id: mov.id, nombre: mov.nombre, cantidad: 0 })
    }
  }
  return { ...s, detalle }
}

// Cambios en la hoja que trae el descanso además de los recursos
export function efectosDeDescanso(tipo, hoja) {
  const cortos = hoja?.descansos_cortos ?? 0
  const out = { descansos_cortos: tipo === 'largo' ? 0 : cortos + 1 }
  // Evitar la muerte: un PJ inconsciente despierta al terminar un descanso largo
  if (tipo === 'largo' && hoja?.estado === 'inconsciente') out.estado = null
  return out
}

export function avisoDescansosSeguidos(hoja) {
  return (hoja?.descansos_cortos ?? 0) >= MAX_CORTOS_SEGUIDOS
    ? `Ya llevan ${MAX_CORTOS_SEGUIDOS} descansos cortos seguidos: el siguiente debe ser largo.`
    : null
}

// ---------------------------------------------------------------------
// Movimientos de muerte (al marcar el último PG)
// ---------------------------------------------------------------------
export const ESTADOS = {
  gloria: { nombre: 'Llamarada de gloria', texto: 'Su última acción es un éxito crítico automático (con permiso del DJ). Después cruza el velo.' },
  inconsciente: { nombre: 'Inconsciente', texto: 'No puede moverse ni actuar, y no puede ser objetivo de ataques. Despierta cuando un aliado le limpia 1 PG o más, o al terminar un descanso largo.' },
  muerto: { nombre: 'Cruzó el velo', texto: 'El personaje murió. Antes de la siguiente sesión puedes crear uno nuevo al nivel actual del grupo.' },
}

export function necesitaMovimientoDeMuerte(hoja) {
  const max = hoja?.pg_max ?? 6
  return max > 0 && (hoja?.pg ?? 0) >= max && !hoja?.estado && !hoja?.reparto_pendiente
}

// Evitar la muerte: si el Dado de Esperanza sale ≤ nivel, gana una cicatriz
// (tacha para siempre una casilla de Esperanza). Sin casillas, su viaje termina.
export function resolverEvitarMuerte(dadoEsperanza, nivel, esperanzaMax) {
  const cicatriz = dadoEsperanza <= nivel
  const nuevoMax = cicatriz ? Math.max(0, esperanzaMax - 1) : esperanzaMax
  return { cicatriz, esperanzaMax: nuevoMax, finDelViaje: cicatriz && nuevoMax === 0 }
}

// Arriesgarlo todo: Esperanza > Miedo → limpia PG/Estrés por el valor del Dado
// de Esperanza; Miedo > Esperanza → muere; iguales (crítico) → limpia todo.
export function resolverArriesgarlo(esperanza, miedo) {
  if (esperanza === miedo) return { desenlace: 'critico', limpiar: Infinity }
  if (esperanza > miedo) return { desenlace: 'esperanza', limpiar: esperanza }
  return { desenlace: 'miedo', limpiar: 0 }
}

// Reparto de lo que limpia "Arriesgarlo todo" entre PG y Estrés.
export function repartoValido(reparto, limpiar, pg, estres) {
  const a = reparto.pg ?? 0, b = reparto.estres ?? 0
  if (a < 0 || b < 0) return 'No puedes limpiar cantidades negativas.'
  if (a > pg) return `Solo tienes ${pg} PG marcados.`
  if (b > estres) return `Solo tienes ${estres} de Estrés marcado.`
  if (a + b > limpiar) return `Puedes limpiar ${limpiar} en total.`
  return null
}

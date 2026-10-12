// Subir de nivel (SRD 1.0, docs/reglas/reglas-2-personajes.md §7).
// Cálculo puro: qué mejoras quedan, validar lo que eligió el jugador y armar
// la hoja nueva. La pantalla vive en componentes/hoja/SubirNivel.svelte.
//
// Cada mejora tomada se guarda en hoja.avances:
//   { nivel, tipo, rango, detalle }
// "rango" es la sección de la hoja de subida (Rango 2, 3 o 4) donde se marcó
// la casilla; así se respetan los límites de cada sección.

import { rangoDeNivel } from './reglas.js'
import { RASGOS } from './srd.js'

export const NIVEL_MAX = 10
export const MEJORAS_POR_NIVEL = 2
export const MAX_PG = 12
export const MAX_ESTRES = 12
export const MAX_MANO = 5

// Casillas por sección (Rango 2, 3, 4). Números de la hoja oficial de subida.
export const OPCIONES = [
  { id: 'rasgos', nombre: '+1 a dos rasgos', texto: 'Suma +1 a dos rasgos sin marcar y márcalos.', casillas: { 2: 3, 3: 3, 4: 3 }, costo: 1 },
  { id: 'pg', nombre: '+1 Punto de Golpe', texto: 'Ganas una casilla de PG para siempre.', casillas: { 2: 2, 3: 2, 4: 2 }, costo: 1 },
  { id: 'estres', nombre: '+1 Estrés', texto: 'Ganas una casilla de Estrés para siempre.', casillas: { 2: 2, 3: 2, 4: 2 }, costo: 1 },
  { id: 'experiencias', nombre: '+1 a dos Experiencias', texto: 'Suma +1 a dos de tus Experiencias para siempre.', casillas: { 2: 1, 3: 1, 4: 1 }, costo: 1 },
  { id: 'carta', nombre: 'Carta de dominio adicional', texto: 'Toma una carta de dominio extra de tu nivel o menor.', casillas: { 2: 1, 3: 1, 4: 1 }, costo: 1 },
  { id: 'evasion', nombre: '+1 Evasión', texto: 'Suma +1 a tu Evasión para siempre.', casillas: { 2: 1, 3: 1, 4: 1 }, costo: 1 },
  { id: 'subclase', nombre: 'Mejorar la subclase', texto: 'Toma la siguiente carta de subclase (Especialización y luego Maestría). Tacha la multiclase de esa sección.', casillas: { 3: 1, 4: 1 }, costo: 1 },
  { id: 'competencia', nombre: '+1 Competencia', texto: 'Suma +1 a tu Competencia (un dado de daño más). Cuesta las dos mejoras del nivel.', casillas: { 3: 1, 4: 1 }, costo: 2 },
  { id: 'multiclase', nombre: 'Multiclase', texto: 'Elige una clase más y uno de sus dominios; ganas su rasgo de clase y la carta Base de una de sus subclases. Cuesta las dos mejoras del nivel y solo se hace una vez.', casillas: { 3: 1, 4: 1 }, costo: 2 },
]
export const OPCION = Object.fromEntries(OPCIONES.map((o) => [o.id, o]))

export const ETAPAS_SUBCLASE = ['base', 'especializacion', 'maestria']
export const NOMBRE_ETAPA = { base: 'Base', especializacion: 'Especialización', maestria: 'Maestría' }

// Logros de rango: niveles 2, 5 y 8
export function logrosDeNivel(nivel) {
  const hay = [2, 5, 8].includes(nivel)
  return { experiencia: hay, competencia: hay, limpiarRasgos: nivel === 5 || nivel === 8 }
}

// Casillas usadas y tachadas en cada sección, según las mejoras ya tomadas.
export function contarSecciones(avances = []) {
  const usadas = {}
  const tachadas = new Set()
  const usar = (tipo, rango) => {
    usadas[tipo] ??= {}
    usadas[tipo][rango] = (usadas[tipo][rango] ?? 0) + 1
  }
  for (const a of avances) {
    usar(a.tipo, a.rango)
    if (a.tipo === 'subclase') tachadas.add(`multiclase:${a.rango}`)
    if (a.tipo === 'multiclase') {
      // Se tacha toda otra multiclase y una "mejorar subclase" sin usar
      for (const r of Object.keys(OPCION.multiclase.casillas)) if (+r !== a.rango) tachadas.add(`multiclase:${r}`)
      const libre = [a.rango, ...Object.keys(OPCION.subclase.casillas).map(Number)]
        .find((r) => OPCION.subclase.casillas[r] && !usadas.subclase?.[r] && !tachadas.has(`subclase:${r}`))
      if (libre != null) tachadas.add(`subclase:${libre}`)
    }
  }
  return { usadas, tachadas }
}

function libresEn(cuenta, tipo, rango) {
  const total = OPCION[tipo]?.casillas[rango] ?? 0
  if (!total || cuenta.tachadas.has(`${tipo}:${rango}`)) return 0
  return Math.max(0, total - (cuenta.usadas[tipo]?.[rango] ?? 0))
}

// Sección donde se marca la mejora: la más baja (de tu rango o menor) con casilla libre.
export function seccionPara(avances, tipo, nivel) {
  const cuenta = contarSecciones(avances)
  const rango = rangoDeNivel(nivel)
  for (let r = 2; r <= rango; r++) if (libresEn(cuenta, tipo, r) > 0) return r
  return null
}

function etapaSiguiente(hoja, extra = 0) {
  const i = ETAPAS_SUBCLASE.indexOf(hoja?.subclase_etapa ?? 'base')
  return ETAPAS_SUBCLASE[i + 1 + extra] ?? null
}

// Estado de cada opción para quien sube al nivel indicado.
export function opcionesDisponibles(hoja, nivel, avancesExtra = []) {
  const avances = [...(hoja?.avances ?? []), ...avancesExtra]
  const cuenta = contarSecciones(avances)
  const rango = rangoDeNivel(nivel)
  return OPCIONES.map((o) => {
    let libres = 0
    for (let r = 2; r <= rango; r++) libres += libresEn(cuenta, o.id, r)
    let razon = null
    const desde = Math.min(...Object.keys(o.casillas).map(Number))
    if (rango < desde) razon = `Se abre en el Rango ${desde} (nivel ${desde === 3 ? 5 : 8}).`
    else if (o.id === 'multiclase' && avances.some((a) => a.tipo === 'multiclase')) razon = 'Solo se puede hacer multiclase una vez.'
    else if (o.id === 'subclase' && !etapaSiguiente(hoja, avancesExtra.filter((a) => a.tipo === 'subclase').length)) razon = 'Tu subclase ya está en Maestría.'
    else if (!libres) razon = 'No quedan casillas libres.'
    return { ...o, libres, disponible: !razon, razon }
  })
}

// Valida lo que eligió el jugador. Devuelve una lista de errores (vacía = todo bien).
// eleccion: {
//   mejoras: [{ tipo, detalle }],     detalle según tipo:
//       rasgos → { rasgos: [id, id] } · experiencias → { indices: [i, j] }
//       carta → { carta: id } · multiclase → { clase: id, dominio: id }
//   experiencia: 'Nombre',            nueva Experiencia de los logros (niveles 2, 5, 8)
//   carta: id | null,                 carta de dominio del paso 4
// }
// cartasPorId (opcional) sirve para revisar el nivel de las cartas.
export function validarSubida(hoja, eleccion, cartasPorId = null) {
  const errores = []
  const nivelActual = hoja?.nivel ?? 1
  const nivel = nivelActual + 1
  if (nivelActual >= NIVEL_MAX) return [`Ya estás en el nivel ${NIVEL_MAX}, el máximo.`]
  const logros = logrosDeNivel(nivel)
  const mejoras = eleccion?.mejoras ?? []

  if (logros.experiencia && !String(eleccion?.experiencia ?? '').trim()) errores.push('Ponle nombre a tu Experiencia nueva.')

  const costo = mejoras.reduce((s, m) => s + (OPCION[m.tipo]?.costo ?? 99), 0)
  if (costo !== MEJORAS_POR_NIVEL) errores.push(`Elige ${MEJORAS_POR_NIVEL} mejoras (Competencia y Multiclase cuentan por dos).`)

  // Disponibilidad, simulando que se marcan una tras otra
  const simuladas = []
  const marcadosAntes = logros.limpiarRasgos ? [] : [...(hoja?.rasgos_mejorados ?? [])]
  const marcadosAhora = []
  const numExp = (hoja?.experiencias?.length ?? 0) + (logros.experiencia ? 1 : 0)
  for (const m of mejoras) {
    const op = OPCION[m.tipo]
    if (!op) { errores.push(`No conozco la mejora «${m.tipo}».`); continue }
    const estado = opcionesDisponibles(hoja, nivel, simuladas).find((o) => o.id === m.tipo)
    if (!estado.disponible) { errores.push(`${op.nombre}: ${estado.razon}`); continue }
    simuladas.push({ nivel, tipo: m.tipo, rango: seccionPara([...(hoja?.avances ?? []), ...simuladas], m.tipo, nivel), detalle: m.detalle ?? null })

    const d = m.detalle ?? {}
    if (m.tipo === 'rasgos') {
      const r = d.rasgos ?? []
      const validos = RASGOS.map((x) => x.id)
      if (r.length !== 2 || r[0] === r[1] || r.some((x) => !validos.includes(x))) errores.push('+1 a dos rasgos: elige dos rasgos distintos.')
      else if (r.some((x) => marcadosAntes.includes(x) || marcadosAhora.includes(x))) errores.push('+1 a dos rasgos: solo puedes subir rasgos que no estén marcados.')
      marcadosAhora.push(...r)
    } else if (m.tipo === 'experiencias') {
      const i = d.indices ?? []
      if (i.length !== 2 || i[0] === i[1] || i.some((x) => !Number.isInteger(x) || x < 0 || x >= numExp)) errores.push('+1 a dos Experiencias: elige dos Experiencias distintas.')
    } else if (m.tipo === 'carta') {
      if (!d.carta) errores.push('Carta de dominio adicional: elige la carta.')
      else if (d.carta === eleccion?.carta) errores.push('La carta adicional no puede ser la misma que la del paso de cartas.')
      else if (cartasPorId?.[d.carta]?.nivel > nivel) errores.push(`La carta adicional es de nivel ${cartasPorId[d.carta].nivel}; tu nivel es ${nivel}.`)
    } else if (m.tipo === 'multiclase') {
      if (!d.clase || !d.dominio) errores.push('Multiclase: elige la clase y uno de sus dominios.')
      else if (d.clase === hoja?.clase) errores.push('Multiclase: elige una clase distinta a la tuya.')
    }
  }
  if (eleccion?.carta && cartasPorId?.[eleccion.carta]?.nivel > nivel) {
    errores.push(`La carta nueva es de nivel ${cartasPorId[eleccion.carta].nivel}; tu nivel es ${nivel}.`)
  }
  return errores
}

function agregarCarta(cartas, id) {
  if (!id || [...cartas.mano, ...cartas.boveda].includes(id)) return
  if (cartas.mano.length < MAX_MANO) cartas.mano.push(id)
  else cartas.boveda.push(id)
}

// Arma la hoja del nuevo nivel. No valida: llama antes a validarSubida().
// Devuelve { hoja, pj: { estres_max }, resumen: [texto] }
export function aplicarSubida(hoja, pj, eleccion) {
  // JSON y no structuredClone: la hoja puede llegar como objeto reactivo de Svelte (Proxy)
  const h = JSON.parse(JSON.stringify(hoja ?? {}))
  const nivel = (h.nivel ?? 1) + 1
  const logros = logrosDeNivel(nivel)
  const resumen = [`Nivel ${nivel} (Rango ${rangoDeNivel(nivel)}).`]
  let estresMax = pj?.estres_max ?? 6

  h.nivel = nivel
  h.experiencias = [...(h.experiencias ?? [])]
  h.rasgos = { ...(h.rasgos ?? {}) }
  h.rasgos_mejorados = [...(h.rasgos_mejorados ?? [])]
  h.cartas = { mano: [...(h.cartas?.mano ?? [])], boveda: [...(h.cartas?.boveda ?? [])] }
  h.avances = [...(h.avances ?? [])]

  if (logros.experiencia) {
    h.experiencias.push({ nombre: String(eleccion.experiencia).trim(), valor: 2 })
    resumen.push(`Nueva Experiencia «${String(eleccion.experiencia).trim()}» +2.`)
  }
  if (logros.competencia) {
    h.competencia = (h.competencia ?? 1) + 1
    resumen.push(`Competencia ${h.competencia}.`)
  }
  if (logros.limpiarRasgos && h.rasgos_mejorados.length) {
    h.rasgos_mejorados = []
    resumen.push('Se borran las marcas de los rasgos.')
  }

  for (const m of eleccion.mejoras ?? []) {
    const d = m.detalle ?? {}
    const rango = seccionPara(h.avances, m.tipo, nivel)
    h.avances.push({ nivel, tipo: m.tipo, rango, detalle: m.detalle ?? null })
    if (m.tipo === 'rasgos') {
      for (const r of d.rasgos) {
        h.rasgos[r] = (Number(h.rasgos[r]) || 0) + 1
        if (!h.rasgos_mejorados.includes(r)) h.rasgos_mejorados.push(r)
      }
      resumen.push(`+1 a ${d.rasgos.map((r) => RASGOS.find((x) => x.id === r)?.nombre ?? r).join(' y ')}.`)
    } else if (m.tipo === 'pg') {
      h.pg_max = Math.min(MAX_PG, (h.pg_max ?? 6) + 1)
      resumen.push(`PG máximos: ${h.pg_max}.`)
    } else if (m.tipo === 'estres') {
      estresMax = Math.min(MAX_ESTRES, estresMax + 1)
      resumen.push(`Estrés máximo: ${estresMax}.`)
    } else if (m.tipo === 'experiencias') {
      for (const i of d.indices) {
        if (h.experiencias[i]) h.experiencias[i] = { ...h.experiencias[i], valor: (Number(h.experiencias[i].valor) || 0) + 1 }
      }
      resumen.push(`+1 a ${d.indices.map((i) => `«${h.experiencias[i]?.nombre || 'Experiencia'}»`).join(' y ')}.`)
    } else if (m.tipo === 'carta') {
      agregarCarta(h.cartas, d.carta)
      resumen.push('Carta de dominio adicional.')
    } else if (m.tipo === 'evasion') {
      h.evasion_extra = (h.evasion_extra ?? 0) + 1
      resumen.push('+1 a la Evasión.')
    } else if (m.tipo === 'subclase') {
      h.subclase_etapa = etapaSiguiente(h) ?? 'maestria'
      resumen.push(`Subclase: ${NOMBRE_ETAPA[h.subclase_etapa]}.`)
    } else if (m.tipo === 'competencia') {
      h.competencia = (h.competencia ?? 1) + 1
      resumen.push(`Competencia ${h.competencia} (mejora).`)
    } else if (m.tipo === 'multiclase') {
      h.multiclase = { clase: d.clase, dominio: d.dominio, subclase: d.subclase ?? null }
      h.dominios = [...new Set([...(h.dominios ?? []), d.dominio])]
      resumen.push('Multiclase.')
    }
  }

  // Paso 3: umbrales +1. Los automáticos ya suman el nivel; los manuales se suben aquí.
  if (h.umbrales_manuales?.mayor != null) {
    h.umbrales_manuales = { mayor: h.umbrales_manuales.mayor + 1, grave: h.umbrales_manuales.grave + 1 }
  }
  resumen.push('Umbrales de daño +1.')

  // Paso 4: carta de dominio nueva
  if (eleccion.carta) {
    agregarCarta(h.cartas, eleccion.carta)
    resumen.push('Carta de dominio nueva.')
  }
  return { hoja: h, pj: { estres_max: estresMax }, resumen }
}

// Claves de primer nivel que cambiaron (para guardar solo eso con ajustarHoja)
export function clavesCambiadas(antes, despues) {
  const claves = new Set([...Object.keys(antes ?? {}), ...Object.keys(despues ?? {})])
  return [...claves].filter((k) => JSON.stringify(antes?.[k]) !== JSON.stringify(despues?.[k]))
}

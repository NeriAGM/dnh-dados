// Estado compartido de la app: sesión, campaña, personajes, tiradas.
// Usa las "runas" de Svelte 5 ($state): cuando un valor cambia, la
// pantalla que lo muestra se actualiza sola.

import { supabase } from './supabase.js'
import { fusionarFila, esMasVieja, crearColas, leerRuta, ponerEnRuta } from './filas.js'
import { ajustesDe } from './ajustes.js'

export const app = $state({
  cargando: true,
  sesion: null,
  perfil: null,
  demo: false,
  campanias: [],
  campania: null,       // { id, nombre, miedo, codigo_invitacion, dj_id, ajustes }
  rol: null,            // 'dj' | 'jugador'
  miembros: [],         // [{ usuario_id, rol, perfiles: { nombre, avatar_url } }]
  personajes: [],
  lanzamientos: [],
  casero: [],           // contenido homebrew de la campaña
  encuentros: [],       // solo el DJ los recibe
  cuentas: [],          // cuentas regresivas
  escena: null,         // lo que la mesa ve del encuentro activo (ver lib/escena.js)
  personajeActivo: null, // id
  ajustesDemo: {},      // reglas de la mesa en el modo prueba (no se guardan)
  error: null,
})

const ESCUCHAS = new Set()
export function alLlegarTirada(fn) { ESCUCHAS.add(fn); return () => ESCUCHAS.delete(fn) }

let canal = null
// Suben cada vez que cambia el usuario o la campaña abierta: una respuesta
// que llega tarde (de otra campaña o de otro usuario) se tira en vez de pintarse.
let generacion = 0
let apertura = 0
// Escrituras en camino por fila (ver crearColas en lib/filas.js)
const colas = crearColas()

function reemplazar(lista, evento, nuevo, viejo, alPrincipio = false) {
  if (evento === 'DELETE') return lista.filter((x) => x.id !== viejo.id)
  const actual = lista.find((x) => x.id === nuevo.id)
  if (actual) return esMasVieja(nuevo, actual) ? lista : lista.map((x) => (x.id === nuevo.id ? fusionarFila(x, nuevo) : x))
  return alPrincipio ? [nuevo, ...lista] : [...lista, nuevo]
}
const CAMPANIA_GUARDADA = 'dnh.campania'
const PERSONAJE_GUARDADO = 'dnh.personaje'

function guardar(clave, valor) { try { valor == null ? localStorage.removeItem(clave) : localStorage.setItem(clave, valor) } catch {} }
function leer(clave) { try { return localStorage.getItem(clave) } catch { return null } }

const copiar = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)))
// Los valores que tenían las llaves que se van a cambiar (para deshacer)
const previos = (fila, cambios) => Object.fromEntries(Object.keys(cambios).map((k) => [k, copiar(fila?.[k])]))
const cambiarEn = (lista, id, fn) => lista.map((x) => (x.id === id ? fn(x) : x))

export async function iniciar() {
  try {
    const { data } = await supabase.auth.getSession()
    app.sesion = data.session
    supabase.auth.onAuthStateChange((_evento, sesion) => {
      const antes = app.sesion?.user?.id
      app.sesion = sesion
      if (sesion?.user?.id !== antes) cargarTodo().catch((e) => { app.error = e.message })
    })
    await cargarTodo()
  } catch (e) {
    app.error = `No se pudo preparar la mesa: ${e.message}`
  } finally {
    // Pase lo que pase, no se queda en "Preparando la mesa…" para siempre
    app.cargando = false
  }
}

// Deja la app sin campaña. Nada de la anterior (ni de otro usuario) se
// queda en pantalla ni sigue escuchando el tiempo real.
function limpiarCampania() {
  apertura++
  if (canal) supabase.removeChannel(canal)
  canal = null
  colas.vaciar()
  app.campania = null
  app.rol = null
  app.miembros = []
  app.personajes = []
  app.lanzamientos = []
  app.casero = []
  app.encuentros = []
  app.cuentas = []
  app.escena = null
  app.personajeActivo = null
}

async function cargarTodo() {
  const gen = ++generacion
  limpiarCampania()
  app.error = null
  if (!app.sesion) {
    app.perfil = null; app.campanias = []
    return
  }
  // Si alguien entra con su cuenta (por ejemplo en otra pestaña), se acaba el modo prueba
  app.demo = false
  const uid = app.sesion.user.id
  const [{ data: perfil }, { data: miembros, error }] = await Promise.all([
    supabase.from('perfiles').select('*').eq('id', uid).maybeSingle(),
    supabase.from('miembros').select('rol, campanias(*)').eq('usuario_id', uid),
  ])
  if (gen !== generacion) return
  app.perfil = perfil ?? null
  if (error) { app.campanias = []; app.error = `No se pudieron cargar tus campañas: ${error.message}`; return }
  app.campanias = (miembros || []).filter((m) => m.campanias).map((m) => ({ ...m.campanias, rol: m.rol }))
  const guardada = leer(CAMPANIA_GUARDADA)
  const elegida = app.campanias.find((c) => c.id === guardada) || (app.campanias.length === 1 ? app.campanias[0] : null)
  if (!elegida) return
  try { await abrirCampania(elegida.id) } catch (e) { if (gen === generacion) app.error = e.message }
}

// Todo lo de una campaña, de una vez. Si algo falla, se avisa (antes se
// quedaba la lista vacía sin decir nada).
async function cargarCampania(id, rol) {
  const resps = await Promise.all([
    supabase.from('campanias').select('*').eq('id', id).maybeSingle(),
    supabase.from('miembros').select('usuario_id, rol, perfiles(nombre, avatar_url)').eq('campania_id', id),
    supabase.from('personajes').select('*').eq('campania_id', id).order('nombre'),
    supabase.from('lanzamientos').select('*').eq('campania_id', id).order('creado', { ascending: false }).limit(60),
    supabase.from('contenido_casero').select('*').eq('campania_id', id).order('nombre'),
    rol === 'dj' ? supabase.from('encuentros').select('*').eq('campania_id', id).order('creado', { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from('cuentas_regresivas').select('*').eq('campania_id', id).order('creado'),
    supabase.from('escenas').select('*').eq('campania_id', id).maybeSingle(),
  ])
  const fallo = resps.find((r) => r?.error)
  if (fallo) throw new Error(`No se pudo abrir la campaña: ${fallo.error.message}`)
  const [campania, miembros, personajes, lanzamientos, casero, encuentros, cuentas, escena] = resps.map((r) => r.data)
  return { campania, miembros, personajes, lanzamientos, casero, encuentros, cuentas, escena }
}

// Si el personaje con el que tiras ya no existe o ya no es tuyo, se elige otro
function revisarActivo() {
  const uid = app.sesion?.user?.id
  const actual = app.personajes.find((p) => p.id === app.personajeActivo)
  if (actual && (actual.usuario_id === uid || app.rol === 'dj')) return
  // El DJ puede dejarlo en "Elige un personaje" a propósito
  if (app.personajeActivo == null && app.rol === 'dj') return
  app.personajeActivo = app.personajes.find((p) => p.usuario_id === uid)?.id ?? null
}

export async function abrirCampania(id) {
  const c = app.campanias.find((x) => x.id === id)
  if (!c) return
  limpiarCampania()
  const mia = apertura
  guardar(CAMPANIA_GUARDADA, id)
  const d = await cargarCampania(id, c.rol)
  // Mientras cargaba se abrió otra campaña, se cambió o se cerró sesión
  if (mia !== apertura || !app.sesion) return
  // La campaña recién leída (el Miedo o las reglas pudieron cambiar desde que se armó la lista)
  const fresca = { ...c, ...(d.campania ?? {}), rol: c.rol }
  app.campanias = app.campanias.map((x) => (x.id === id ? fresca : x))
  app.campania = fresca
  app.rol = c.rol
  app.miembros = d.miembros || []
  app.personajes = d.personajes || []
  app.lanzamientos = d.lanzamientos || []
  app.casero = d.casero || []
  app.encuentros = d.encuentros || []
  app.cuentas = d.cuentas || []
  app.escena = d.escena ?? null

  const uid = app.sesion.user.id
  const guardado = leer(PERSONAJE_GUARDADO)
  app.personajeActivo =
    (app.personajes.find((p) => p.id === guardado && (p.usuario_id === uid || app.rol === 'dj')) || app.personajes.find((p) => p.usuario_id === uid) || null)?.id ?? null

  escuchar(id)
}

// Al reconectarse el tiempo real (el celular se durmió, se fue el internet)
// los cambios de mientras no llegan: se vuelve a leer todo. Lo que tiene
// escrituras en camino se deja como está (su respuesta lo pondrá al día).
async function recargar(id) {
  const mia = apertura
  let d
  try { d = await cargarCampania(id, app.rol) } catch (e) { console.warn('[mesa] no se pudo recargar', e); return }
  if (mia !== apertura || app.campania?.id !== id) return
  const mantener = (lista, nuevas, clave) =>
    (nuevas || []).map((n) => (colas.ocupada(`${clave}:${n.id}`) ? lista.find((x) => x.id === n.id) ?? n : n))
  if (d.campania) {
    const fresca = { ...app.campania, ...d.campania, rol: app.campania.rol }
    if (colas.ocupada(`miedo:${id}`)) fresca.miedo = app.campania.miedo
    if (colas.ocupada(`ajustes:${id}`)) fresca.ajustes = app.campania.ajustes
    app.campania = fresca
  }
  app.miembros = d.miembros || []
  app.personajes = mantener(app.personajes, d.personajes, 'personaje')
  app.lanzamientos = d.lanzamientos || []
  app.casero = d.casero || []
  app.encuentros = mantener(app.encuentros, d.encuentros, 'encuentro')
  app.cuentas = mantener(app.cuentas, d.cuentas, 'cuenta')
  app.escena = d.escena ?? null
  revisarActivo()
}

function escuchar(id) {
  if (canal) supabase.removeChannel(canal)
  // Solo atiende mientras siga abierta esta campaña (un evento tardío del canal
  // anterior no debe meterse en la nueva)
  const aqui = (fn) => (payload) => { if (app.campania?.id === id && canal === este) return fn(payload) }
  const miembrosDeNuevo = async () => {
    const { data, error } = await supabase.from('miembros').select('usuario_id, rol, perfiles(nombre, avatar_url)').eq('campania_id', id)
    if (!error && app.campania?.id === id && canal === este) app.miembros = data || []
  }
  let uniones = 0
  const este = supabase
    .channel(`mesa-${id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lanzamientos', filter: `campania_id=eq.${id}` }, aqui(({ new: fila }) => {
      if (app.lanzamientos.some((l) => l.id === fila.id)) return
      app.lanzamientos = [fila, ...app.lanzamientos].slice(0, 100)
      for (const fn of ESCUCHAS) fn(fila)
    }))
    // Los borrados no se pueden filtrar en el tiempo real: llega la llave y se compara.
    // Los id son únicos en toda la base, así que quitar por id es seguro.
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'lanzamientos' }, aqui(({ old }) => {
      app.lanzamientos = app.lanzamientos.filter((l) => l.id !== old.id)
    }))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'campanias', filter: `id=eq.${id}` }, aqui(({ new: c }) => {
      const cambios = { ...c }
      // Si tú estás cambiando el Miedo o las reglas, manda lo tuyo hasta que responda el servidor
      if (colas.ocupada(`miedo:${id}`)) delete cambios.miedo
      if (colas.ocupada(`ajustes:${id}`)) delete cambios.ajustes
      app.campania = { ...app.campania, ...cambios }
      // Que la lista también los tenga, por si se vuelve a abrir la campaña
      app.campanias = app.campanias.map((x) => (x.id === c.id ? { ...x, ...cambios } : x))
    }))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'personajes', filter: `campania_id=eq.${id}` }, aqui(({ eventType, new: p, old }) => {
      if (eventType === 'DELETE') app.personajes = app.personajes.filter((x) => x.id !== old.id)
      else if (colas.ocupada(`personaje:${p.id}`)) return
      else {
        const actual = app.personajes.find((x) => x.id === p.id)
        if (actual) { if (!esMasVieja(p, actual)) app.personajes = cambiarEn(app.personajes, p.id, (x) => fusionarFila(x, p)) }
        else app.personajes = [...app.personajes, p].sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)))
      }
      revisarActivo()
    }))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'personajes' }, aqui(({ old }) => {
      if (!app.personajes.some((x) => x.id === old?.id)) return
      app.personajes = app.personajes.filter((x) => x.id !== old.id)
      revisarActivo()
    }))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'encuentros', filter: `campania_id=eq.${id}` }, aqui(({ eventType, new: e, old }) => {
      if (eventType !== 'DELETE' && colas.ocupada(`encuentro:${e.id}`)) return
      app.encuentros = reemplazar(app.encuentros, eventType, e, old, true)
    }))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'encuentros' }, aqui(({ old }) => {
      app.encuentros = app.encuentros.filter((x) => x.id !== old?.id)
    }))
    // La escena la arma la base de datos; aquí solo se recibe
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'escenas', filter: `campania_id=eq.${id}` }, aqui(({ new: e }) => { app.escena = e }))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'escenas', filter: `campania_id=eq.${id}` }, aqui(async ({ new: e }) => {
      if (app.escena) { app.escena = fusionarFila(app.escena, e); return }
      // Sin escena previa no hay con qué mezclar lo que no llegó: se lee completa
      const { data, error } = await supabase.from('escenas').select('*').eq('campania_id', id).maybeSingle()
      if (!error && app.campania?.id === id && canal === este) app.escena = data ?? null
    }))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'escenas' }, aqui(async ({ old }) => {
      if (old?.campania_id === id) { app.escena = null; return }
      if (old?.campania_id) return
      const { data, error } = await supabase.from('escenas').select('*').eq('campania_id', id).maybeSingle()
      if (!error && app.campania?.id === id && canal === este) app.escena = data ?? null
    }))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cuentas_regresivas', filter: `campania_id=eq.${id}` }, aqui(({ eventType, new: c, old }) => {
      if (eventType !== 'DELETE' && colas.ocupada(`cuenta:${c.id}`)) return
      // Una cuenta oculta no es para los jugadores
      if (eventType !== 'DELETE' && !c.visible && app.rol !== 'dj') app.cuentas = app.cuentas.filter((x) => x.id !== c.id)
      else app.cuentas = reemplazar(app.cuentas, eventType, c, old)
    }))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'cuentas_regresivas' }, aqui(({ old }) => {
      app.cuentas = app.cuentas.filter((x) => x.id !== old?.id)
    }))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contenido_casero', filter: `campania_id=eq.${id}` }, aqui(({ eventType, new: c, old }) => {
      app.casero = reemplazar(app.casero, eventType, c, old)
    }))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'contenido_casero' }, aqui(({ old }) => {
      app.casero = app.casero.filter((x) => x.id !== old?.id)
    }))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'miembros', filter: `campania_id=eq.${id}` }, aqui(miembrosDeNuevo))
    // La llave de miembros es (campania_id, usuario_id): el borrado sí trae la campaña
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'miembros' }, aqui(({ old }) => {
      if (old?.campania_id === id) return miembrosDeNuevo()
    }))
    .subscribe((estado) => {
      // La primera unión es la normal; las siguientes son reconexiones
      if (estado === 'SUBSCRIBED' && uniones++ > 0 && canal === este) recargar(id)
    })
  canal = este
}

// Mi propia tirada: se agrega al historial sin esperar al tiempo real.
// Si mientras rodaban los dados se cambió de campaña, no se mete en la otra.
export function registrarPropia(fila) {
  if (!app.campania || (fila.campania_id && fila.campania_id !== app.campania.id)) return
  if (!app.lanzamientos.some((l) => l.id === fila.id)) app.lanzamientos = [fila, ...app.lanzamientos].slice(0, 100)
  if (fila.efectos?.esperanza != null && fila.personaje_id) {
    app.personajes = cambiarEn(app.personajes, fila.personaje_id, (p) => ({ ...p, esperanza: fila.efectos.esperanza }))
  }
  if (fila.efectos?.miedo != null) app.campania = { ...app.campania, miedo: fila.efectos.miedo }
}

export function elegirPersonaje(id) {
  app.personajeActivo = id
  guardar(PERSONAJE_GUARDADO, id)
}

export async function crearCampania(nombre) {
  const { data, error } = await supabase.rpc('crear_campania', { p_nombre: nombre })
  if (error) throw new Error(error.message)
  app.campanias = [...app.campanias, { ...data, rol: 'dj' }]
  await abrirCampania(data.id)
}

// El código se escribe como sea (minúsculas, espacios, guiones): se limpia aquí
export function limpiarCodigo(codigo) {
  return String(codigo ?? '').replace(/[^0-9a-z]/gi, '').toUpperCase()
}

export async function unirseCampania(codigo) {
  const { data, error } = await supabase.rpc('unirse_campania', { p_codigo: limpiarCodigo(codigo) })
  if (error) throw new Error(error.message)
  if (!app.campanias.some((c) => c.id === data.id)) app.campanias = [...app.campanias, { ...data, rol: 'jugador' }]
  await abrirCampania(data.id)
}

export async function crearPersonaje(nombre, usuarioId, color) {
  const { data, error } = await supabase
    .from('personajes')
    .insert({ campania_id: app.campania.id, nombre, usuario_id: usuarioId, color })
    .select()
    .single()
  if (error) throw new Error(error.message)
  if (!app.personajes.some((p) => p.id === data.id)) app.personajes = [...app.personajes, data]
  if (!app.personajeActivo && usuarioId === app.sesion.user.id) elegirPersonaje(data.id)
  return data
}

// Vuelve a leer una fila del servidor y la pone tal cual (tras un error,
// para no quedarse con un valor que el servidor rechazó)
async function releer(tabla, lista, id) {
  const { data, error } = await supabase.from(tabla).select('*').eq('id', id).maybeSingle()
  if (error || !data) return
  app[lista] = cambiarEn(app[lista], id, (x) => fusionarFila(x, data))
}

// Escritura de una fila con cambio optimista: se ve al instante, las
// escrituras de la misma fila van en orden y solo la última respuesta se
// pinta. Si una falla, se regresan solo sus llaves y, si ya no hay más en
// camino, se relee la fila para quedar igual que el servidor.
async function escribirFila({ lista, tabla, clave, id, aplicar, deshacer, enviar }) {
  app[lista] = cambiarEn(app[lista], id, aplicar)
  const campania = app.campania?.id
  await colas.poner(clave, async () => {
    const { data, error } = await enviar()
    if (app.campania?.id !== campania) return
    if (error) {
      app[lista] = cambiarEn(app[lista], id, deshacer)
      if (colas.ultima(clave)) await releer(tabla, lista, id)
      throw new Error(error.message)
    }
    if (colas.ultima(clave) && data) app[lista] = cambiarEn(app[lista], id, (x) => fusionarFila(x, data))
  })
}

export async function ajustarPersonaje(id, cambios) {
  const actual = app.personajes.find((p) => p.id === id)
  const antes = previos(actual, cambios)
  await escribirFila({
    lista: 'personajes', tabla: 'personajes', clave: `personaje:${id}`, id,
    aplicar: (p) => ({ ...p, ...cambios }),
    deshacer: (p) => ({ ...p, ...antes }),
    enviar: () => supabase.from('personajes').update(cambios).eq('id', id).select().single(),
  })
}

export async function ajustarMiedo(delta) {
  const id = app.campania.id
  const clave = `miedo:${id}`
  app.campania = { ...app.campania, miedo: Math.max(0, Math.min(12, (app.campania.miedo ?? 0) + delta)) }
  await colas.poner(clave, async () => {
    const { data, error } = await supabase.rpc('ajustar_miedo', { p_campania: id, p_delta: delta })
    if (app.campania?.id !== id) return
    if (error) {
      // El servidor suma y resta: lo seguro es preguntarle cuánto quedó
      if (colas.ultima(clave)) {
        const { data: c } = await supabase.from('campanias').select('miedo').eq('id', id).maybeSingle()
        if (c && app.campania?.id === id) app.campania = { ...app.campania, miedo: c.miedo }
      } else app.campania = { ...app.campania, miedo: Math.max(0, Math.min(12, (app.campania.miedo ?? 0) - delta)) }
      throw new Error(error.message)
    }
    if (colas.ultima(clave) && typeof data === 'number') app.campania = { ...app.campania, miedo: data }
  })
}

// ---------------------------------------------------------------------
// Reglas de la mesa (ajustes de campaña, ver lib/ajustes.js)
// ---------------------------------------------------------------------

// Los ajustes que aplican ahora, con sus valores por defecto ya puestos
export function ajustesMesa() {
  return ajustesDe(app.demo ? { ajustes: app.ajustesDemo } : app.campania)
}

// Solo el DJ. Se ve al instante y luego se guarda; si falla, se regresa.
export async function guardarAjustes(cambios) {
  if (app.demo) { app.ajustesDemo = { ...app.ajustesDemo, ...cambios }; return }
  const id = app.campania.id
  const clave = `ajustes:${id}`
  const antes = previos(app.campania.ajustes ?? {}, cambios)
  app.campania = { ...app.campania, ajustes: { ...(app.campania.ajustes ?? {}), ...cambios } }
  await colas.poner(clave, async () => {
    const { data, error } = await supabase.rpc('guardar_ajustes', { p_campania: id, p: cambios })
    if (error) {
      // Solo se regresan las reglas de este cambio (otro toque pudo cambiar otras)
      if (app.campania?.id === id) {
        const ajustes = { ...(app.campania.ajustes ?? {}) }
        for (const [k, v] of Object.entries(antes)) v === undefined ? delete ajustes[k] : (ajustes[k] = v)
        app.campania = { ...app.campania, ajustes }
      }
      throw new Error(error.message)
    }
    if (!colas.ultima(clave)) return
    if (app.campania?.id === id) app.campania = { ...app.campania, ajustes: data }
    app.campanias = app.campanias.map((x) => (x.id === id ? { ...x, ajustes: data } : x))
  })
}

export async function salir() {
  guardar(CAMPANIA_GUARDADA, null)
  guardar(PERSONAJE_GUARDADO, null)
  limpiarCampania()
  let fallo = null
  try { ({ error: fallo } = await supabase.auth.signOut()) } catch (e) { fallo = e }
  // Sin internet el cierre "global" falla y la sesión seguía abierta aquí:
  // por lo menos se cierra en este dispositivo
  if (fallo) await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
}

export function cambiarCampania() {
  limpiarCampania()
  guardar(CAMPANIA_GUARDADA, null)
}

// Modo prueba: siempre empieza limpio y al salir no deja nada
export function entrarDemo() {
  limpiarCampania()
  app.ajustesDemo = {}
  app.demo = true
}

export function salirDemo() {
  app.demo = false
  limpiarCampania()
  app.ajustesDemo = {}
}

export function nombreDe(usuarioId) {
  return app.miembros.find((m) => m.usuario_id === usuarioId)?.perfiles?.nombre ?? 'Alguien'
}

// ---------------------------------------------------------------------
// Hoja de personaje
// ---------------------------------------------------------------------

// Cambia una parte de la hoja. Se ve al instante y luego se guarda;
// si falla, regresa al valor anterior (solo esa parte).
export async function ajustarHoja(id, ruta, valor) {
  const ruta_s = ruta.map(String)
  const actual = app.personajes.find((p) => p.id === id)
  if (!actual) return
  const antes = copiar(leerRuta(actual.hoja, ruta_s))
  await escribirFila({
    lista: 'personajes', tabla: 'personajes', clave: `personaje:${id}`, id,
    aplicar: (p) => ({ ...p, hoja: ponerEnRuta(p.hoja, ruta_s, valor) }),
    deshacer: (p) => ({ ...p, hoja: ponerEnRuta(p.hoja, ruta_s, antes) }),
    enviar: () => supabase.rpc('ajustar_hoja', { p_personaje: id, p_ruta: ruta_s, p_valor: valor }),
  })
}

export async function crearPersonajeCompleto({ nombre, usuarioId, color, hoja, esperanza_max = 6, estres_max = 6 }) {
  const { data, error } = await supabase
    .from('personajes')
    .insert({ campania_id: app.campania.id, nombre, usuario_id: usuarioId, color, hoja, esperanza: 2, esperanza_max, estres: 0, estres_max })
    .select()
    .single()
  if (error) throw new Error(error.message)
  if (!app.personajes.some((p) => p.id === data.id)) app.personajes = [...app.personajes, data]
  if (!app.personajeActivo && usuarioId === app.sesion.user.id) elegirPersonaje(data.id)
  return data
}

export async function importarPersonajes(lista) {
  const id = app.campania.id
  const { data, error } = await supabase.rpc('importar_personajes', { p_campania: id, p_personajes: lista })
  if (error) throw new Error(error.message)
  // Si la relectura falla, se queda la lista que había (antes se vaciaba)
  const { data: personajes, error: e2 } = await supabase.from('personajes').select('*').eq('campania_id', id).order('nombre')
  if (!e2 && app.campania?.id === id) { app.personajes = personajes || []; revisarActivo() }
  return data
}

export async function asignarPersonaje(id, usuarioId) {
  const { data, error } = await supabase.rpc('asignar_personaje', { p_personaje: id, p_usuario: usuarioId })
  if (error) throw new Error(error.message)
  app.personajes = cambiarEn(app.personajes, id, (p) => fusionarFila(p, data))
  revisarActivo()
}

export async function borrarPersonaje(id) {
  const { error } = await supabase.from('personajes').delete().eq('id', id)
  if (error) throw new Error(error.message)
  app.personajes = app.personajes.filter((p) => p.id !== id)
  revisarActivo()
}

// ---------------------------------------------------------------------
// Homebrew
// ---------------------------------------------------------------------

export async function guardarCasero({ id, tipo, nombre, datos }) {
  const fila = { campania_id: app.campania.id, tipo, nombre, datos, actualizado: new Date().toISOString() }
  const q = id
    ? supabase.from('contenido_casero').update(fila).eq('id', id)
    : supabase.from('contenido_casero').insert({ ...fila, creado_por: app.sesion.user.id })
  const { data, error } = await q.select().single()
  if (error) throw new Error(error.message)
  app.casero = app.casero.some((x) => x.id === data.id) ? app.casero.map((x) => (x.id === data.id ? data : x)) : [...app.casero, data]
  return data
}

export async function borrarCasero(id) {
  const { error } = await supabase.from('contenido_casero').delete().eq('id', id)
  if (error) throw new Error(error.message)
  app.casero = app.casero.filter((x) => x.id !== id)
}

// ---------------------------------------------------------------------
// Panel del DJ: encuentros y cuentas regresivas
// ---------------------------------------------------------------------

const local = () => app.demo
const idLocal = () => `local-${Math.random().toString(36).slice(2, 10)}`

export async function crearEncuentro(nombre = 'Encuentro nuevo') {
  if (local()) {
    const e = { id: idLocal(), nombre, entorno: null, ajustes: [], pjs: null, adversarios: [], activo: !app.encuentros.length, notas: '' }
    app.encuentros = [e, ...app.encuentros]
    return e
  }
  const { data, error } = await supabase.from('encuentros').insert({ campania_id: app.campania.id, nombre }).select().single()
  if (error) throw new Error(error.message)
  app.encuentros = reemplazar(app.encuentros, 'INSERT', data, null, true)
  return data
}

export async function guardarEncuentro(id, cambios) {
  if (local()) { app.encuentros = cambiarEn(app.encuentros, id, (e) => ({ ...e, ...cambios })); return }
  const actual = app.encuentros.find((e) => e.id === id)
  const antes = previos(actual, cambios)
  await escribirFila({
    lista: 'encuentros', tabla: 'encuentros', clave: `encuentro:${id}`, id,
    aplicar: (e) => ({ ...e, ...cambios }),
    deshacer: (e) => ({ ...e, ...antes }),
    enviar: () => supabase.from('encuentros').update(cambios).eq('id', id).select().single(),
  })
}

export async function borrarEncuentro(id) {
  if (local()) { app.encuentros = app.encuentros.filter((e) => e.id !== id); return }
  const { error } = await supabase.from('encuentros').delete().eq('id', id)
  if (error) throw new Error(error.message)
  app.encuentros = app.encuentros.filter((e) => e.id !== id)
}

export async function activarEncuentro(id) {
  if (local()) { app.encuentros = app.encuentros.map((e) => ({ ...e, activo: e.id === id })); return }
  const { error } = await supabase.rpc('activar_encuentro', { p_encuentro: id })
  if (error) throw new Error(error.message)
  app.encuentros = app.encuentros.map((e) => ({ ...e, activo: e.id === id }))
}

// Termina el encuentro activo: deja de estar en escena (la mesa ya no lo ve)
export async function terminarEncuentro(id) {
  if (local()) { app.encuentros = cambiarEn(app.encuentros, id, (e) => ({ ...e, activo: false })); return }
  await guardarEncuentro(id, { activo: false })
}

export async function crearCuenta(cuenta) {
  if (local()) { app.cuentas = [...app.cuentas, { id: idLocal(), ...cuenta }]; return }
  const { data, error } = await supabase.from('cuentas_regresivas').insert({ campania_id: app.campania.id, ...cuenta }).select().single()
  if (error) throw new Error(error.message)
  app.cuentas = reemplazar(app.cuentas, 'INSERT', data, null)
}

export async function guardarCuenta(id, cambios) {
  if (local()) { app.cuentas = cambiarEn(app.cuentas, id, (c) => ({ ...c, ...cambios })); return }
  const actual = app.cuentas.find((c) => c.id === id)
  const antes = previos(actual, cambios)
  await escribirFila({
    lista: 'cuentas', tabla: 'cuentas_regresivas', clave: `cuenta:${id}`, id,
    aplicar: (c) => ({ ...c, ...cambios }),
    deshacer: (c) => ({ ...c, ...antes }),
    enviar: () => supabase.from('cuentas_regresivas').update(cambios).eq('id', id).select().single(),
  })
}

export async function borrarCuenta(id) {
  if (local()) { app.cuentas = app.cuentas.filter((c) => c.id !== id); return }
  const { error } = await supabase.from('cuentas_regresivas').delete().eq('id', id)
  if (error) throw new Error(error.message)
  app.cuentas = app.cuentas.filter((c) => c.id !== id)
}

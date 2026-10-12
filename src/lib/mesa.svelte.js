// Estado compartido de la app: sesión, campaña, personajes, tiradas.
// Usa las "runas" de Svelte 5 ($state): cuando un valor cambia, la
// pantalla que lo muestra se actualiza sola.

import { supabase } from './supabase.js'
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

function reemplazar(lista, evento, nuevo, viejo, alPrincipio = false) {
  if (evento === 'DELETE') return lista.filter((x) => x.id !== viejo.id)
  if (lista.some((x) => x.id === nuevo.id)) return lista.map((x) => (x.id === nuevo.id ? nuevo : x))
  return alPrincipio ? [nuevo, ...lista] : [...lista, nuevo]
}
const CAMPANIA_GUARDADA = 'dnh.campania'
const PERSONAJE_GUARDADO = 'dnh.personaje'

function guardar(clave, valor) { try { valor == null ? localStorage.removeItem(clave) : localStorage.setItem(clave, valor) } catch {} }
function leer(clave) { try { return localStorage.getItem(clave) } catch { return null } }

export async function iniciar() {
  const { data } = await supabase.auth.getSession()
  app.sesion = data.session
  supabase.auth.onAuthStateChange((_evento, sesion) => {
    const antes = app.sesion?.user?.id
    app.sesion = sesion
    if (sesion?.user?.id !== antes) cargarTodo()
  })
  await cargarTodo()
  app.cargando = false
}

async function cargarTodo() {
  if (!app.sesion) {
    app.perfil = null; app.campanias = []; app.campania = null
    return
  }
  const uid = app.sesion.user.id
  const [{ data: perfil }, { data: miembros, error }] = await Promise.all([
    supabase.from('perfiles').select('*').eq('id', uid).maybeSingle(),
    supabase.from('miembros').select('rol, campanias(*)').eq('usuario_id', uid),
  ])
  if (error) { app.error = error.message; return }
  app.perfil = perfil
  app.campanias = (miembros || []).map((m) => ({ ...m.campanias, rol: m.rol }))
  const guardada = leer(CAMPANIA_GUARDADA)
  const elegida = app.campanias.find((c) => c.id === guardada) || (app.campanias.length === 1 ? app.campanias[0] : null)
  if (elegida) await abrirCampania(elegida.id)
}

export async function abrirCampania(id) {
  const c = app.campanias.find((x) => x.id === id)
  if (!c) return
  app.campania = c
  app.rol = c.rol
  guardar(CAMPANIA_GUARDADA, id)

  const [{ data: miembros }, { data: personajes }, { data: lanz }, { data: casero }] = await Promise.all([
    supabase.from('miembros').select('usuario_id, rol, perfiles(nombre, avatar_url)').eq('campania_id', id),
    supabase.from('personajes').select('*').eq('campania_id', id).order('nombre'),
    supabase.from('lanzamientos').select('*').eq('campania_id', id).order('creado', { ascending: false }).limit(60),
    supabase.from('contenido_casero').select('*').eq('campania_id', id).order('nombre'),
  ])
  app.casero = casero || []
  const [{ data: encuentros }, { data: cuentas }, { data: escena }] = await Promise.all([
    c.rol === 'dj' ? supabase.from('encuentros').select('*').eq('campania_id', id).order('creado', { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from('cuentas_regresivas').select('*').eq('campania_id', id).order('creado'),
    supabase.from('escenas').select('*').eq('campania_id', id).maybeSingle(),
  ])
  app.encuentros = encuentros || []
  app.cuentas = cuentas || []
  app.escena = escena ?? null
  app.miembros = miembros || []
  app.personajes = personajes || []
  app.lanzamientos = lanz || []

  const uid = app.sesion.user.id
  const guardado = leer(PERSONAJE_GUARDADO)
  const mios = app.personajes.filter((p) => p.usuario_id === uid)
  app.personajeActivo =
    (app.personajes.find((p) => p.id === guardado && (p.usuario_id === uid || app.rol === 'dj')) || mios[0] || null)?.id ?? null

  escuchar(id)
}

function escuchar(id) {
  if (canal) supabase.removeChannel(canal)
  canal = supabase
    .channel(`mesa-${id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lanzamientos', filter: `campania_id=eq.${id}` }, ({ new: fila }) => {
      if (app.lanzamientos.some((l) => l.id === fila.id)) return
      app.lanzamientos = [fila, ...app.lanzamientos].slice(0, 100)
      for (const fn of ESCUCHAS) fn(fila)
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'lanzamientos' }, ({ old }) => {
      app.lanzamientos = app.lanzamientos.filter((l) => l.id !== old.id)
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'campanias', filter: `id=eq.${id}` }, ({ new: c }) => {
      app.campania = { ...app.campania, ...c }
      // Que la lista también los tenga, por si se vuelve a abrir la campaña
      app.campanias = app.campanias.map((x) => (x.id === c.id ? { ...x, ...c } : x))
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'personajes', filter: `campania_id=eq.${id}` }, ({ eventType, new: p, old }) => {
      if (eventType === 'DELETE') app.personajes = app.personajes.filter((x) => x.id !== old.id)
      else if (app.personajes.some((x) => x.id === p.id)) app.personajes = app.personajes.map((x) => (x.id === p.id ? p : x))
      else app.personajes = [...app.personajes, p].sort((a, b) => a.nombre.localeCompare(b.nombre))
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'encuentros', filter: `campania_id=eq.${id}` }, ({ eventType, new: e, old }) => {
      app.encuentros = reemplazar(app.encuentros, eventType, e, old, true)
    })
    // La escena la arma la base de datos; aquí solo se recibe
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'escenas', filter: `campania_id=eq.${id}` }, ({ new: e }) => { app.escena = e })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'escenas', filter: `campania_id=eq.${id}` }, ({ new: e }) => { app.escena = e })
    // Los borrados no se pueden filtrar en el tiempo real: llega la llave y se compara
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'escenas' }, async ({ old }) => {
      if (old?.campania_id === id) { app.escena = null; return }
      if (old?.campania_id) return
      const { data } = await supabase.from('escenas').select('*').eq('campania_id', id).maybeSingle()
      app.escena = data ?? null
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cuentas_regresivas', filter: `campania_id=eq.${id}` }, ({ eventType, new: c, old }) => {
      // Si el DJ la oculta, a los jugadores les llega como borrada o sin permiso: se quita
      if (eventType !== 'DELETE' && !c.visible && app.rol !== 'dj') app.cuentas = app.cuentas.filter((x) => x.id !== c.id)
      else app.cuentas = reemplazar(app.cuentas, eventType, c, old)
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contenido_casero', filter: `campania_id=eq.${id}` }, ({ eventType, new: c, old }) => {
      if (eventType === 'DELETE') app.casero = app.casero.filter((x) => x.id !== old.id)
      else if (app.casero.some((x) => x.id === c.id)) app.casero = app.casero.map((x) => (x.id === c.id ? c : x))
      else app.casero = [...app.casero, c]
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'miembros', filter: `campania_id=eq.${id}` }, async () => {
      const { data } = await supabase.from('miembros').select('usuario_id, rol, perfiles(nombre, avatar_url)').eq('campania_id', id)
      app.miembros = data || []
    })
    .subscribe()
}

// Mi propia tirada: se agrega al historial sin esperar al tiempo real
export function registrarPropia(fila) {
  if (!app.lanzamientos.some((l) => l.id === fila.id)) app.lanzamientos = [fila, ...app.lanzamientos].slice(0, 100)
  if (fila.efectos?.esperanza != null && fila.personaje_id) {
    app.personajes = app.personajes.map((p) => (p.id === fila.personaje_id ? { ...p, esperanza: fila.efectos.esperanza } : p))
  }
  if (fila.efectos?.miedo != null && app.campania) app.campania = { ...app.campania, miedo: fila.efectos.miedo }
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

export async function unirseCampania(codigo) {
  const { data, error } = await supabase.rpc('unirse_campania', { p_codigo: codigo })
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

export async function ajustarPersonaje(id, cambios) {
  const { data, error } = await supabase.from('personajes').update(cambios).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  app.personajes = app.personajes.map((p) => (p.id === id ? data : p))
}

export async function ajustarMiedo(delta) {
  const { data, error } = await supabase.rpc('ajustar_miedo', { p_campania: app.campania.id, p_delta: delta })
  if (error) throw new Error(error.message)
  app.campania = { ...app.campania, miedo: data }
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
  const antes = app.campania.ajustes ?? {}
  app.campania = { ...app.campania, ajustes: { ...antes, ...cambios } }
  const { data, error } = await supabase.rpc('guardar_ajustes', { p_campania: id, p: cambios })
  if (error) {
    if (app.campania?.id === id) app.campania = { ...app.campania, ajustes: antes }
    throw new Error(error.message)
  }
  if (app.campania?.id === id) app.campania = { ...app.campania, ajustes: data }
  app.campanias = app.campanias.map((x) => (x.id === id ? { ...x, ajustes: data } : x))
}

export async function salir() {
  if (canal) supabase.removeChannel(canal)
  canal = null
  guardar(CAMPANIA_GUARDADA, null)
  await supabase.auth.signOut()
  app.campania = null
  app.escena = null
}

export function cambiarCampania() {
  if (canal) supabase.removeChannel(canal)
  canal = null
  app.escena = null
  guardar(CAMPANIA_GUARDADA, null)
  app.campania = null
}

export function nombreDe(usuarioId) {
  return app.miembros.find((m) => m.usuario_id === usuarioId)?.perfiles?.nombre ?? 'Alguien'
}

// ---------------------------------------------------------------------
// Hoja de personaje
// ---------------------------------------------------------------------

function ponerEnRuta(obj, ruta, valor) {
  const copia = structuredClone($state.snapshot(obj) ?? {})
  let o = copia
  for (let i = 0; i < ruta.length - 1; i++) {
    const k = ruta[i]
    if (o[k] == null || typeof o[k] !== 'object') o[k] = /^\d+$/.test(ruta[i + 1]) ? [] : {}
    o = o[k]
  }
  o[ruta.at(-1)] = valor
  return copia
}

// Cambia una parte de la hoja. Se ve al instante y luego se guarda;
// si falla, regresa al valor anterior.
export async function ajustarHoja(id, ruta, valor) {
  const ruta_s = ruta.map(String)
  const antes = app.personajes.find((p) => p.id === id)
  if (!antes) return
  const optimista = { ...antes, hoja: ponerEnRuta(antes.hoja, ruta_s, valor) }
  app.personajes = app.personajes.map((p) => (p.id === id ? optimista : p))
  const { data, error } = await supabase.rpc('ajustar_hoja', { p_personaje: id, p_ruta: ruta_s, p_valor: valor })
  if (error) {
    app.personajes = app.personajes.map((p) => (p.id === id ? antes : p))
    throw new Error(error.message)
  }
  app.personajes = app.personajes.map((p) => (p.id === id ? data : p))
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
  const { data, error } = await supabase.rpc('importar_personajes', { p_campania: app.campania.id, p_personajes: lista })
  if (error) throw new Error(error.message)
  const { data: personajes } = await supabase.from('personajes').select('*').eq('campania_id', app.campania.id).order('nombre')
  app.personajes = personajes || []
  return data
}

export async function asignarPersonaje(id, usuarioId) {
  const { data, error } = await supabase.rpc('asignar_personaje', { p_personaje: id, p_usuario: usuarioId })
  if (error) throw new Error(error.message)
  app.personajes = app.personajes.map((p) => (p.id === id ? data : p))
}

export async function borrarPersonaje(id) {
  const { error } = await supabase.from('personajes').delete().eq('id', id)
  if (error) throw new Error(error.message)
  app.personajes = app.personajes.filter((p) => p.id !== id)
  if (app.personajeActivo === id) app.personajeActivo = null
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
  if (local()) { app.encuentros = app.encuentros.map((e) => (e.id === id ? { ...e, ...cambios } : e)); return }
  const antes = app.encuentros.find((e) => e.id === id)
  app.encuentros = app.encuentros.map((e) => (e.id === id ? { ...e, ...cambios } : e))
  const { data, error } = await supabase.from('encuentros').update(cambios).eq('id', id).select().single()
  if (error) {
    if (antes) app.encuentros = app.encuentros.map((e) => (e.id === id ? antes : e))
    throw new Error(error.message)
  }
  app.encuentros = app.encuentros.map((e) => (e.id === id ? data : e))
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
  if (local()) { app.encuentros = app.encuentros.map((e) => (e.id === id ? { ...e, activo: false } : e)); return }
  await guardarEncuentro(id, { activo: false })
}

export async function crearCuenta(cuenta) {
  if (local()) { app.cuentas = [...app.cuentas, { id: idLocal(), ...cuenta }]; return }
  const { data, error } = await supabase.from('cuentas_regresivas').insert({ campania_id: app.campania.id, ...cuenta }).select().single()
  if (error) throw new Error(error.message)
  app.cuentas = reemplazar(app.cuentas, 'INSERT', data, null)
}

export async function guardarCuenta(id, cambios) {
  app.cuentas = app.cuentas.map((c) => (c.id === id ? { ...c, ...cambios } : c))
  if (local()) return
  const { error } = await supabase.from('cuentas_regresivas').update(cambios).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function borrarCuenta(id) {
  if (local()) { app.cuentas = app.cuentas.filter((c) => c.id !== id); return }
  const { error } = await supabase.from('cuentas_regresivas').delete().eq('id', id)
  if (error) throw new Error(error.message)
  app.cuentas = app.cuentas.filter((c) => c.id !== id)
}

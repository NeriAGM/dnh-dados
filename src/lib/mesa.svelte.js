// Estado compartido de la app: sesión, campaña, personajes, tiradas.
// Usa las "runas" de Svelte 5 ($state): cuando un valor cambia, la
// pantalla que lo muestra se actualiza sola.

import { supabase } from './supabase.js'

export const app = $state({
  cargando: true,
  sesion: null,
  perfil: null,
  demo: false,
  campanias: [],
  campania: null,       // { id, nombre, miedo, codigo_invitacion, dj_id }
  rol: null,            // 'dj' | 'jugador'
  miembros: [],         // [{ usuario_id, rol, perfiles: { nombre, avatar_url } }]
  personajes: [],
  lanzamientos: [],
  personajeActivo: null, // id
  error: null,
})

const ESCUCHAS = new Set()
export function alLlegarTirada(fn) { ESCUCHAS.add(fn); return () => ESCUCHAS.delete(fn) }

let canal = null
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

  const [{ data: miembros }, { data: personajes }, { data: lanz }] = await Promise.all([
    supabase.from('miembros').select('usuario_id, rol, perfiles(nombre, avatar_url)').eq('campania_id', id),
    supabase.from('personajes').select('*').eq('campania_id', id).order('nombre'),
    supabase.from('lanzamientos').select('*').eq('campania_id', id).order('creado', { ascending: false }).limit(60),
  ])
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
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'personajes', filter: `campania_id=eq.${id}` }, ({ eventType, new: p, old }) => {
      if (eventType === 'DELETE') app.personajes = app.personajes.filter((x) => x.id !== old.id)
      else if (app.personajes.some((x) => x.id === p.id)) app.personajes = app.personajes.map((x) => (x.id === p.id ? p : x))
      else app.personajes = [...app.personajes, p].sort((a, b) => a.nombre.localeCompare(b.nombre))
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

export async function salir() {
  if (canal) supabase.removeChannel(canal)
  canal = null
  guardar(CAMPANIA_GUARDADA, null)
  await supabase.auth.signOut()
  app.campania = null
}

export function cambiarCampania() {
  if (canal) supabase.removeChannel(canal)
  canal = null
  guardar(CAMPANIA_GUARDADA, null)
  app.campania = null
}

export function nombreDe(usuarioId) {
  return app.miembros.find((m) => m.usuario_id === usuarioId)?.perfiles?.nombre ?? 'Alguien'
}

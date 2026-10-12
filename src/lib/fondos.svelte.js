// Fondos personalizados de cada jugador: qué fondo va en cada momento del
// día, cómo se acomoda la imagen y las barras (tono, vidrio, etc.).
//
// - Con sesión: los ajustes viven en perfiles.fondo (RPC guardar_fondo) y
//   las imágenes en el bucket público "fondos", carpeta "<uid>/".
// - En modo prueba (o sin sesión): ajustes en localStorage e imágenes en
//   IndexedDB del navegador (se muestran con URLs de objeto).
// localStorage también sirve de caché para que el fondo salga al instante.

import { supabase } from './supabase.js'
import { app } from './mesa.svelte.js'
import {
  normalizar, olvidarImagen, validarArchivo, nombreSeguro, fondoInicial,
  esPueblo, pueblo, MAX_BYTES, MAX_IMAGENES, BARRAS,
} from './fondo/ajustes.js'

const CLAVE = 'dnh.fondo'
const BUCKET = 'fondos'

function leerLocal() { try { return JSON.parse(localStorage.getItem(CLAVE) || 'null') } catch { return null } }
function guardarLocal(cfg) { try { localStorage.setItem(CLAVE, JSON.stringify(cfg)) } catch {} }

export const fondos = $state({
  config: normalizar(leerLocal()),
  imagenes: [],     // [{ id, url, nombre }] — las más nuevas primero
  vista: null,      // id que se está probando desde el panel (vista previa)
  rotas: [],        // ids que no cargaron (borradas en otro lado, sin red…)
  subiendo: false,
  error: '',
  legibilidad: null, // { nivel, brillo } calculado por App.svelte
})

const esLocal = () => app.demo || !app.sesion
const uid = () => app.sesion?.user?.id

// ---------------------------------------------------------------------
// Qué fondo toca y de dónde sale su imagen
// ---------------------------------------------------------------------
export function urlDe(id) {
  if (!id || esPueblo(id)) return null
  if (id.startsWith('local/')) return fondos.imagenes.find((i) => i.id === id)?.url ?? null
  return supabase.storage.from(BUCKET).getPublicUrl(id).data.publicUrl
}

export function fuenteActiva(momento) {
  const id = fondos.vista ?? fondos.config.tablero[momento] ?? pueblo(momento)
  if (esPueblo(id)) return id
  if (fondos.rotas.includes(id) || !urlDe(id)) return pueblo(momento)
  return id
}

export function marcarRota(id) { if (!fondos.rotas.includes(id)) fondos.rotas = [...fondos.rotas, id] }

// ---------------------------------------------------------------------
// Ajustes (con guardado diferido para no saturar mientras arrastras)
// ---------------------------------------------------------------------
let temporizador = 0
export function cambiar(parcial) {
  fondos.config = { ...fondos.config, ...parcial }
  guardarLocal($state.snapshot(fondos.config))
  clearTimeout(temporizador)
  temporizador = setTimeout(guardarRemoto, 700)
}

// Si la app se cierra o se va a segundo plano antes de los 700 ms, se
// guarda ya: si no, al volver a entrar el perfil (viejo) pisaba el último
// cambio que sí se había quedado en este navegador.
function guardarPendiente() {
  if (!temporizador) return
  clearTimeout(temporizador)
  guardarRemoto()
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') guardarPendiente() })
  addEventListener('pagehide', guardarPendiente)
}

export function asignar(momento, id) { cambiar({ tablero: { ...fondos.config.tablero, [momento]: id } }) }
export function cambiarModo(id, modo) { cambiar({ modos: { ...fondos.config.modos, [id]: modo } }) }
export function restablecerBarras() { cambiar(Object.fromEntries(Object.entries(BARRAS).map(([k, b]) => [k, b.defecto]))) }
export function restablecerTablero() { cambiar({ tablero: fondoInicial().tablero }) }

async function guardarRemoto() {
  temporizador = 0
  if (esLocal()) return
  const p = $state.snapshot(fondos.config)
  const { error } = await supabase.rpc('guardar_fondo', { p })
  if (error) fondos.error = `No se pudo guardar tu fondo en la nube (${error.message}). Se quedó en este navegador.`
  else if (app.perfil) app.perfil.fondo = p
}

// ---------------------------------------------------------------------
// Sincronizar con quien esté usando la mesa
// ---------------------------------------------------------------------
let dueno = null
let perfilAdoptado = null

export async function sincronizar() {
  const nuevo = esLocal() ? 'local' : uid()
  // El perfil llega después de la sesión: si trae fondo guardado, manda él
  const perfil = app.perfil
  if (!esLocal() && perfil?.id && perfil.id !== perfilAdoptado) {
    perfilAdoptado = perfil.id
    if (perfil.fondo && Object.keys(perfil.fondo).length) {
      fondos.config = normalizar(perfil.fondo)
      guardarLocal($state.snapshot(fondos.config))
    }
  }
  if (nuevo === dueno) return
  dueno = nuevo
  soltarUrls(fondos.imagenes)
  fondos.imagenes = []
  fondos.rotas = []
  fondos.error = ''
  try {
    const lista = nuevo === 'local' ? await listarLocal() : await listarRemoto(nuevo)
    // Si mientras cargaba cambió quién usa la mesa (entró o salió), esta lista ya no va
    if (dueno !== nuevo) { soltarUrls(lista); return }
    fondos.imagenes = lista
  } catch (e) {
    if (dueno === nuevo) fondos.error = `No se pudieron cargar tus imágenes: ${e.message}`
  }
}

// Las imágenes del modo prueba se muestran con URLs de objeto: hay que
// soltarlas al dejar de usarlas o se quedan ocupando memoria
function soltarUrls(lista) {
  for (const i of lista || []) if (i?.url?.startsWith('blob:')) URL.revokeObjectURL(i.url)
}

async function listarRemoto(u) {
  const { data, error } = await supabase.storage.from(BUCKET).list(u, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
  if (error) throw new Error(error.message)
  return (data || [])
    .filter((o) => o.name && !o.name.startsWith('.'))
    .map((o) => {
      const id = `${u}/${o.name}`
      return { id, url: supabase.storage.from(BUCKET).getPublicUrl(id).data.publicUrl, nombre: o.name.replace(/^\d+-/, '') }
    })
}

// ---------------------------------------------------------------------
// Subir y borrar
// ---------------------------------------------------------------------
export async function subir(archivo) {
  fondos.error = ''
  if (!archivo) return
  // Primero lo que no tiene arreglo: tipo y cantidad
  const previo = validarArchivo({ type: archivo.type, size: 0 }, fondos.imagenes.length)
  if (previo) { fondos.error = previo; return }
  fondos.subiendo = true
  try {
    const listo = await reducir(archivo)
    const error = validarArchivo(listo, fondos.imagenes.length)
    if (error) { fondos.error = error; return }
    const nombre = nombreSeguro(archivo.name)
    let nueva
    if (esLocal()) {
      nueva = { id: `local/${Date.now()}-${nombre}`, nombre, url: URL.createObjectURL(listo) }
      await guardarBlobLocal({ id: nueva.id, nombre, blob: listo, creado: Date.now() })
    } else {
      const id = `${uid()}/${Date.now()}-${nombre}`
      const { error: e } = await supabase.storage.from(BUCKET).upload(id, listo, { contentType: listo.type, cacheControl: '31536000', upsert: false })
      if (e) {
        const m = e.message || ''
        throw new Error(/row-level|security|policy/i.test(m) ? `No se pudo subir: ya tienes ${MAX_IMAGENES} fondos o no tienes permiso.` : /bucket/i.test(m) ? 'Falta crear el espacio de fondos en Supabase (migración 004).' : m)
      }
      nueva = { id, nombre, url: supabase.storage.from(BUCKET).getPublicUrl(id).data.publicUrl }
    }
    fondos.imagenes = [nueva, ...fondos.imagenes]
    return nueva
  } catch (e) {
    fondos.error = e.message || 'No se pudo subir la imagen.'
  } finally {
    fondos.subiendo = false
  }
}

export async function borrar(id) {
  fondos.error = ''
  try {
    if (id.startsWith('local/')) {
      await borrarBlobLocal(id)
      const vieja = fondos.imagenes.find((i) => i.id === id)
      if (vieja?.url?.startsWith('blob:')) URL.revokeObjectURL(vieja.url)
    } else {
      // RLS solo deja borrar lo de tu carpeta; por si acaso, ni lo intentamos con lo ajeno
      if (!id.startsWith(`${uid()}/`)) throw new Error('Solo puedes borrar tus propias imágenes.')
      const { error } = await supabase.storage.from(BUCKET).remove([id])
      if (error) throw new Error(error.message)
    }
    fondos.imagenes = fondos.imagenes.filter((i) => i.id !== id)
    if (fondos.vista === id) fondos.vista = null
    fondos.config = olvidarImagen($state.snapshot(fondos.config), id)
    cambiar({})
  } catch (e) {
    fondos.error = `No se pudo borrar: ${e.message}`
  }
}

// Las fotos enormes (de celular, 4000 px y 8 MB) se achican en el navegador
// antes de subirlas. Los GIF no se tocan para no perder la animación.
const LADO_MAX = 3200
async function reducir(archivo) {
  if (archivo.type === 'image/gif' || typeof createImageBitmap !== 'function') return archivo
  let bmp
  try { bmp = await createImageBitmap(archivo) } catch { throw new Error('No se pudo leer la imagen; ¿está dañada?') }
  const lado = Math.max(bmp.width, bmp.height)
  if (lado <= LADO_MAX && archivo.size <= MAX_BYTES) { bmp.close?.(); return archivo }
  const k = Math.min(1, LADO_MAX / lado)
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close?.()
  for (const calidad of [0.9, 0.8, 0.68]) {
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/webp', calidad))
    // Safari viejo regresa PNG cuando no sabe hacer WEBP: entonces JPG
    const final = blob?.type === 'image/webp' ? blob : await new Promise((ok) => c.toBlob(ok, 'image/jpeg', calidad))
    if (final && final.size <= MAX_BYTES) return final
  }
  throw new Error('La imagen sigue pesando más de 5 MB aun achicada; prueba con otra.')
}

// ---------------------------------------------------------------------
// IndexedDB para el modo prueba (con respaldo en memoria si no hay)
// ---------------------------------------------------------------------
const memoria = new Map()
function abrirBD() {
  return new Promise((ok, mal) => {
    const r = indexedDB.open('dnh-fondos', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('imagenes', { keyPath: 'id' })
    r.onsuccess = () => ok(r.result)
    r.onerror = () => mal(r.error)
  })
}
async function bd(modo, fn) {
  const db = await abrirBD()
  return new Promise((ok, mal) => {
    const tx = db.transaction('imagenes', modo)
    const req = fn(tx.objectStore('imagenes'))
    tx.oncomplete = () => { db.close(); ok(req?.result) }
    tx.onerror = () => { db.close(); mal(tx.error) }
  })
}
async function guardarBlobLocal(fila) {
  try { await bd('readwrite', (s) => s.put(fila)) } catch { memoria.set(fila.id, fila) }
}
async function borrarBlobLocal(id) {
  memoria.delete(id)
  try { await bd('readwrite', (s) => s.delete(id)) } catch {}
}
async function listarLocal() {
  let filas = [...memoria.values()]
  try { filas = [...filas, ...((await bd('readonly', (s) => s.getAll())) || [])] } catch {}
  return filas
    .sort((a, b) => b.creado - a.creado)
    .map((f) => ({ id: f.id, nombre: f.nombre, url: URL.createObjectURL(f.blob) }))
}

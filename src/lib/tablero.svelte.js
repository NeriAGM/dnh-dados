// Tablero compartido: los tableros del DJ, el que ve la mesa, sus fichas y
// las señales («¡aquí!»).
//
// - En línea: tablas "tableros" y "fichas" (migración 010). El jugador solo
//   recibe el tablero que se está mostrando (campanias.tablero_id); cuando
//   cambia, se vuelve a leer todo. Las imágenes van al bucket privado
//   "tablero" y se ven con enlace firmado.
// - Las señales no se guardan: viajan por broadcast en el canal del tablero.
// - En modo prueba todo vive en memoria y las imágenes son URL de objeto.
// Las reglas puras (niebla, quién mueve qué) están en tablero.js.

import { supabase } from './supabase.js'
import { app } from './mesa.svelte.js'
import { crearColas, fusionarFila, esMasVieja } from './filas.js'
import { nombreSeguro } from './fondo/ajustes.js'
import { reducir } from './lore.svelte.js'
import { recortar, pjsSinFicha, posicionInicial } from './tablero.js'

export const tablero = $state({
  lista: [],          // DJ: todos los de la campaña; jugador: solo el que se muestra
  fichas: [],         // DJ: todas; jugador: las del tablero que se muestra
  abierto: null,      // DJ: el que está viendo o preparando (nulo = el que se muestra)
  mostradoDemo: null, // modo prueba: el que "ve la mesa"
  senales: [],        // [{ id, x, y, color, tablero_id }] — duran 3 s
  subiendo: false,
  error: '',
})

const BUCKET = 'tablero'
const MAX_BYTES = 5 * 1024 * 1024
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MORADO = '#a77ce8'
const COLOR = /^#[0-9a-fA-F]{6}$/

let clave = null     // id de la campaña cargada ('demo' en modo prueba)
let rolCargado = null
let mostrado = null // tablero que se mostraba en la última sincronización
let canal = null
let turno = 0        // sube en cada carga: una respuesta vieja se tira
let numSenal = 0
const colas = crearColas()
const locales = new Map()  // modo prueba: archivo -> URL de objeto
const firmadas = new Map() // ruta -> { url, vence }

const local = () => clave === 'demo'
const idLocal = () => `local-${Math.random().toString(36).slice(2, 10)}`
const ahora = () => new Date().toISOString()

export const esDJTablero = () => app.demo || app.rol === 'dj'
export const idMostrado = () => (app.demo ? tablero.mostradoDemo : app.campania?.tablero_id ?? null)

export function tableroVisible() {
  const id = esDJTablero() ? tablero.abierto ?? idMostrado() : idMostrado()
  return tablero.lista.find((t) => t.id === id) ?? null
}

// Pone una fila que llegó (tiempo real o respuesta) sin pisar algo más nuevo
function poner(lista, fila) {
  const actual = lista.find((x) => x.id === fila.id)
  if (!actual) return [...lista, fila]
  if (esMasVieja(fila, actual)) return lista
  return lista.map((x) => (x.id === fila.id ? fusionarFila(x, fila) : x))
}
const cambiarEn = (lista, id, cambios) => lista.map((x) => (x.id === id ? { ...x, ...cambios } : x))

// ---------------------------------------------------------------------
// Cargar y escuchar
// ---------------------------------------------------------------------

// La llama Tablero.svelte cada vez que cambia la campaña, el modo prueba,
// el rol o el tablero que se muestra.
export function sincronizarTablero() {
  const nueva = app.demo ? 'demo' : app.campania?.id ?? null
  const rol = app.demo ? 'dj' : app.rol
  if (nueva !== clave || rol !== rolCargado) {
    soltar()
    clave = nueva
    rolCargado = rol
    mostrado = idMostrado()
    if (clave && !local()) { escuchar(clave); cargar() }
    return
  }
  const m = idMostrado()
  if (m === mostrado) return
  mostrado = m
  // El DJ ya tiene todos; el jugador no podía ver el nuevo hasta ahora
  if (clave && !local() && !esDJTablero()) cargar()
}

function soltar() {
  if (canal) supabase.removeChannel(canal)
  canal = null
  turno++
  colas.vaciar()
  for (const url of locales.values()) URL.revokeObjectURL(url)
  locales.clear()
  firmadas.clear()
  Object.assign(tablero, { lista: [], fichas: [], abierto: null, mostradoDemo: null, senales: [], subiendo: false, error: '' })
}

async function cargar() {
  const c = clave
  if (!c || c === 'demo') return // sin campaña (o en modo prueba) no hay nada que pedir
  const t = ++turno
  // La RLS ya le deja al jugador solo el tablero que se muestra
  const [rt, rf] = await Promise.all([
    supabase.from('tableros').select('*').eq('campania_id', c).order('creado'),
    supabase.from('fichas').select('*').eq('campania_id', c).order('creado'),
  ])
  if (t !== turno || c !== clave) return
  const error = rt.error || rf.error
  if (error) { tablero.error = `No se pudo cargar el tablero: ${error.message}`; return }
  // Lo que tiene escrituras en camino se queda como está (su respuesta lo pondrá al día)
  const mantener = (lista, nuevas, prefijo) =>
    (nuevas || []).map((n) => (colas.ocupada(`${prefijo}:${n.id}`) ? lista.find((x) => x.id === n.id) ?? n : n))
  tablero.lista = mantener(tablero.lista, rt.data, 'tablero')
  tablero.fichas = mantener(tablero.fichas, rf.data, 'ficha')
}

function escuchar(c) {
  const aqui = (fn) => (payload) => { if (clave === c && canal === este) fn(payload) }
  const quitarTablero = (id) => {
    tablero.lista = tablero.lista.filter((x) => x.id !== id)
    tablero.fichas = tablero.fichas.filter((f) => f.tablero_id !== id)
    if (tablero.abierto === id) tablero.abierto = null
  }
  let uniones = 0
  const este = supabase
    .channel(`tablero-${c}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tableros', filter: `campania_id=eq.${c}` }, aqui(({ eventType, new: t, old }) => {
      if (eventType === 'DELETE') return quitarTablero(old?.id)
      if (!colas.ocupada(`tablero:${t.id}`)) tablero.lista = poner(tablero.lista, t)
    }))
    // Los borrados no se pueden filtrar por campaña: llega la llave y se compara
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tableros' }, aqui(({ old }) => quitarTablero(old?.id)))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fichas', filter: `campania_id=eq.${c}` }, aqui(({ eventType, new: f, old }) => {
      if (eventType === 'DELETE') { tablero.fichas = tablero.fichas.filter((x) => x.id !== old?.id); return }
      if (!colas.ocupada(`ficha:${f.id}`)) tablero.fichas = poner(tablero.fichas, f)
    }))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'fichas' }, aqui(({ old }) => {
      tablero.fichas = tablero.fichas.filter((x) => x.id !== old?.id)
    }))
    .on('broadcast', { event: 'senal' }, aqui(({ payload }) => agregarSenal(payload)))
    .subscribe((estado) => {
      // La primera unión es la normal; las siguientes son reconexiones
      if (estado === 'SUBSCRIBED' && uniones++ > 0 && canal === este) cargar()
    })
  canal = este
}

// ---------------------------------------------------------------------
// Tableros (solo el DJ; la base de datos lo vuelve a revisar)
// ---------------------------------------------------------------------
export async function crearTablero({ archivo = null, nombre = '' } = {}) {
  tablero.error = ''
  const c = clave
  if (!c) return
  let imagen = null
  try {
    if (archivo) {
      if (!TIPOS.includes(archivo.type)) throw new Error('Solo se aceptan imágenes JPG, PNG, WEBP o GIF.')
      tablero.subiendo = true
      const listo = await reducir(archivo)
      if (listo.size > MAX_BYTES) throw new Error(`La imagen pesa ${(listo.size / 1048576).toFixed(1)} MB; el máximo es 5 MB.`)
      const base = nombreSeguro(archivo.name.replace(/\.[^.]+$/, '')).replace(/\./g, '-').slice(0, 50) || 'mapa'
      const ext = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' }[listo.type] ?? 'img'
      imagen = `${Date.now()}-${base}.${ext}`
      if (local()) locales.set(imagen, URL.createObjectURL(listo))
      else {
        const { error } = await supabase.storage.from(BUCKET).upload(`${c}/${imagen}`, listo, { contentType: listo.type, cacheControl: '31536000', upsert: false })
        if (error) {
          const m = error.message || ''
          throw new Error(/bucket/i.test(m) ? 'Falta crear el espacio "tablero" en Supabase (migración 010).' : /row-level|security|policy/i.test(m) ? 'Solo el DJ puede subir imágenes al tablero.' : m)
        }
      }
    }
    const fila = {
      campania_id: c,
      nombre: (String(nombre).trim() || archivo?.name.replace(/\.[^.]+$/, '').trim() || 'Nota').slice(0, 80),
      imagen,
      texto: '',
      niebla: null,
      tam_ficha: 0.05,
    }
    let nueva
    if (local()) nueva = { ...fila, id: idLocal(), creado: ahora(), actualizado: ahora() }
    else {
      const { data, error } = await supabase.from('tableros').insert(fila).select().single()
      if (error) {
        if (imagen) supabase.storage.from(BUCKET).remove([`${c}/${imagen}`]).catch(() => {})
        throw new Error(/tableros/.test(error.message) && /exist/.test(error.message) ? 'Falta aplicar la migración 010 en Supabase.' : error.message)
      }
      nueva = data
    }
    if (clave !== c) return
    tablero.lista = poner(tablero.lista, nueva)
    tablero.abierto = nueva.id
    return nueva
  } catch (e) {
    tablero.error = e.message || 'No se pudo crear el tablero.'
  } finally {
    tablero.subiendo = false
  }
}

// Cambios optimistas; si el servidor dice que no, se regresa solo lo que falló
export function guardarTablero(id, cambios) {
  const actual = tablero.lista.find((t) => t.id === id)
  if (!actual) return
  const antes = Object.fromEntries(Object.keys(cambios).map((k) => [k, actual[k]]))
  tablero.lista = cambiarEn(tablero.lista, id, cambios)
  if (local()) return
  const llave = `tablero:${id}`
  return colas.poner(llave, async () => {
    const { data, error } = await supabase.from('tableros').update(cambios).eq('id', id).select().single()
    if (error) {
      tablero.error = `No se pudo guardar el tablero: ${error.message}`
      tablero.lista = cambiarEn(tablero.lista, id, antes)
    } else if (colas.ultima(llave)) tablero.lista = poner(tablero.lista, data)
  })
}

export async function mostrarTablero(id) {
  tablero.error = ''
  if (app.demo) { tablero.mostradoDemo = id; return }
  const c = app.campania
  if (!c) return
  const antes = c.tablero_id ?? null
  app.campania = { ...c, tablero_id: id }
  const { error } = await supabase.from('campanias').update({ tablero_id: id }).eq('id', c.id)
  if (error && app.campania?.id === c.id) {
    tablero.error = `No se pudo mostrar el tablero: ${error.message}`
    app.campania = { ...app.campania, tablero_id: antes }
  }
}

export async function borrarTablero(id) {
  tablero.error = ''
  const t = tablero.lista.find((x) => x.id === id)
  if (!t) return
  const lista = tablero.lista
  const fichas = tablero.fichas
  tablero.lista = lista.filter((x) => x.id !== id)
  tablero.fichas = fichas.filter((f) => f.tablero_id !== id)
  if (tablero.abierto === id) tablero.abierto = null
  if (local()) {
    if (tablero.mostradoDemo === id) tablero.mostradoDemo = null
    if (locales.has(t.imagen)) { URL.revokeObjectURL(locales.get(t.imagen)); locales.delete(t.imagen) }
    return
  }
  const { error } = await supabase.from('tableros').delete().eq('id', id)
  if (error) {
    tablero.error = `No se pudo borrar el tablero: ${error.message}`
    tablero.lista = lista
    tablero.fichas = fichas
    return
  }
  // La base ya dejó tablero_id en nulo; aquí solo se adelanta en pantalla
  if (app.campania?.tablero_id === id) app.campania = { ...app.campania, tablero_id: null }
  if (t.imagen) supabase.storage.from(BUCKET).remove([`${t.campania_id}/${t.imagen}`]).catch(() => {})
}

// ---------------------------------------------------------------------
// Fichas
// ---------------------------------------------------------------------
async function insertarFichas(filas) {
  if (!filas.length) return
  tablero.error = ''
  if (local()) {
    tablero.fichas = [...tablero.fichas, ...filas.map((f) => ({ ...f, id: idLocal(), creado: ahora(), actualizado: ahora() }))]
    return
  }
  const c = clave
  const { data, error } = await supabase.from('fichas').insert(filas).select()
  if (error) { tablero.error = `No se pudo poner la ficha: ${error.message}`; return }
  if (clave === c) for (const f of data) tablero.fichas = poner(tablero.fichas, f)
}

const enTablero = (tableroId) => tablero.fichas.filter((f) => f.tablero_id === tableroId).length

export function crearFicha({ tablero_id, personaje_id = null, nombre, color, x, y }) {
  const n = String(nombre ?? '').trim().slice(0, 40)
  if (!n) { tablero.error = 'Ponle nombre a la ficha.'; return }
  const lugar = posicionInicial(enTablero(tablero_id))
  return insertarFichas([{
    tablero_id, campania_id: clave, personaje_id, nombre: n,
    color: COLOR.test(color ?? '') ? color : MORADO,
    x: x == null ? lugar.x : recortar(x),
    y: y == null ? lugar.y : recortar(y),
  }])
}

// Una ficha por cada PJ de la campaña que aún no esté en ese tablero
export function agregarPJs(tableroId) {
  const base = enTablero(tableroId)
  return insertarFichas(pjsSinFicha(app.personajes, tablero.fichas, tableroId).map((p, i) => ({
    tablero_id: tableroId, campania_id: clave, personaje_id: p.id,
    nombre: String(p.nombre || 'PJ').slice(0, 40),
    color: COLOR.test(p.color ?? '') ? p.color : MORADO,
    ...posicionInicial(base + i),
  })))
}

export function moverFicha(id, x, y) {
  const actual = tablero.fichas.find((f) => f.id === id)
  if (!actual) return
  const antes = { x: actual.x, y: actual.y }
  tablero.fichas = cambiarEn(tablero.fichas, id, { x: recortar(x), y: recortar(y) })
  if (local()) return
  const llave = `ficha:${id}`
  return colas.poner(llave, async () => {
    const { data, error } = await supabase.rpc('mover_ficha', { p_ficha: id, p_x: recortar(x), p_y: recortar(y) })
    if (error) {
      tablero.error = `No se pudo mover la ficha: ${error.message}`
      tablero.fichas = cambiarEn(tablero.fichas, id, antes)
    } else if (colas.ultima(llave) && data) tablero.fichas = poner(tablero.fichas, data)
  })
}

export async function borrarFicha(id) {
  const fichas = tablero.fichas
  tablero.fichas = fichas.filter((f) => f.id !== id)
  if (local()) return
  const { error } = await supabase.from('fichas').delete().eq('id', id)
  if (error) { tablero.error = `No se pudo quitar la ficha: ${error.message}`; tablero.fichas = fichas }
}

// ---------------------------------------------------------------------
// Señales e imágenes
// ---------------------------------------------------------------------
function colorPropio() {
  if (esDJTablero()) return MORADO
  const pj = app.personajes.find((p) => p.id === app.personajeActivo)
  return COLOR.test(pj?.color ?? '') ? pj.color : MORADO
}

// Lo que llega de otros se revisa: el color va a un estilo y x, y a la posición
function agregarSenal(s) {
  if (!s || s.tablero_id !== tableroVisible()?.id) return
  const id = ++numSenal
  const senal = { id, tablero_id: s.tablero_id, x: recortar(s.x), y: recortar(s.y), color: COLOR.test(s.color ?? '') ? s.color : MORADO }
  tablero.senales = [...tablero.senales, senal].slice(-12)
  setTimeout(() => { tablero.senales = tablero.senales.filter((x) => x.id !== id) }, 3000)
}

export function senalar(x, y) {
  const t = tableroVisible()
  if (!t) return
  const s = { tablero_id: t.id, x: recortar(x), y: recortar(y), color: colorPropio() }
  agregarSenal(s)
  // El broadcast no le regresa la señal a quien la manda
  if (!local() && canal) canal.send({ type: 'broadcast', event: 'senal', payload: s }).catch(() => {})
}

// Enlace (firmado, dura una hora) para mostrar la imagen de un tablero
export async function urlTablero(fila) {
  if (!fila?.imagen) return null
  if (locales.has(fila.imagen)) return locales.get(fila.imagen)
  if (local() || !clave) return null
  const ruta = `${fila.campania_id}/${fila.imagen}`
  const guardada = firmadas.get(ruta)
  if (guardada && guardada.vence > Date.now()) return guardada.url
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 3600)
  if (error || !data?.signedUrl) return null
  firmadas.set(ruta, { url: data.signedUrl, vence: Date.now() + 50 * 60 * 1000 })
  return data.signedUrl
}

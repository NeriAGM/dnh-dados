// Lore de la campaña: páginas en árbol que el DJ escribe aquí mismo.
//
// - Todo entra oculto; el DJ revela página por página ("visible").
// - Los jugadores solo reciben lo que pueden ver (lo decide la base de
//   datos, ver supabase/migraciones/007_lore.sql). Cuando el DJ oculta o
//   mueve algo, sube un contador (lore_revision) y la app del jugador
//   vuelve a pedir el índice.
// - Las imágenes van al bucket privado "lore" y en el texto se escriben
//   ![texto](lore:archivo). Para verlas se pide un enlace firmado.
// - En modo prueba todo vive en memoria (con unas páginas de ejemplo).

import { supabase } from './supabase.js'
import { app } from './mesa.svelte.js'
import { nombreSeguro } from './fondo/ajustes.js'
import { imagenesDe } from './md.js'
import { paginasDemo, imagenesDemo } from './loreDemo.js'
import { ordenar, hijasDe, descendencia, ruta, ocultaPor, ponerFila } from './loreFilas.js'

export const lore = $state({
  clave: null,     // id de la campaña cargada ('demo' en modo prueba)
  paginas: [],     // filas completas de la tabla lore
  cargando: false,
  error: '',
})

const BUCKET = 'lore'
const COLUMNAS_INDICE = 'id, padre_id, titulo, icono, orden, visible, actualizado'
export const MAX_CONTENIDO = 200000
const MAX_BYTES = 5 * 1024 * 1024
const LADO_MAX = 2200
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

let canal = null
let esperaRefresco = 0
const imagenesLocales = new Map() // modo prueba: archivo -> URL de objeto
const firmadas = new Map()        // archivo -> { url, vence }

export const esDJLore = () => app.demo || app.rol === 'dj'
const esLocal = () => lore.clave === 'demo'
const idLocal = () => `local-${Math.random().toString(36).slice(2, 10)}`

// ---------------------------------------------------------------------
// Árbol (las reglas puras viven en loreFilas.js, con pruebas)
// ---------------------------------------------------------------------
export { ordenar, hijasDe, descendencia, ruta, ocultaPor }

// ---------------------------------------------------------------------
// Cargar y escuchar
// ---------------------------------------------------------------------
export async function abrirLore() {
  const clave = app.demo ? 'demo' : app.campania?.id
  if (!clave || lore.clave === clave) return
  soltarLore()
  lore.clave = clave
  lore.error = ''
  if (clave === 'demo') {
    for (const [archivo, url] of imagenesDemo()) imagenesLocales.set(archivo, url)
    lore.paginas = paginasDemo()
    return
  }
  lore.cargando = true
  try {
    const { data, error } = await supabase.from('lore').select('*').eq('campania_id', clave)
    if (error) throw new Error(/relation|does not exist|schema cache/i.test(error.message) ? 'Falta correr la migración 007 (lore) en Supabase.' : error.message)
    if (lore.clave !== clave) return
    lore.paginas = data || []
    escuchar(clave)
  } catch (e) {
    lore.error = e.message
  } finally {
    lore.cargando = false
  }
}

export function soltarLore() {
  if (canal) supabase.removeChannel(canal)
  canal = null
  clearTimeout(esperaRefresco)
  refrescos++
  lore.clave = null
  lore.paginas = []
  firmadas.clear()
}

function quitar(ids) { lore.paginas = lore.paginas.filter((p) => !ids.has(p.id)) }

function poner(fila) {
  const antes = lore.paginas
  const despues = ponerFila(antes, fila)
  if (despues !== antes) lore.paginas = despues
}

function programarRefresco() {
  clearTimeout(esperaRefresco)
  esperaRefresco = setTimeout(refrescar, 250)
}

function escuchar(id) {
  canal = supabase
    .channel(`lore-${id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lore', filter: `campania_id=eq.${id}` }, ({ eventType, new: fila, old }) => {
      if (eventType === 'DELETE') { quitar(descendencia(lore.paginas, old.id)); return }
      // Si al jugador le llega algo que ya no puede ver, se quita con sus hijas
      if (!esDJLore() && !fila.visible) { quitar(descendencia(lore.paginas, fila.id)); return }
      // Una página que se acaba de revelar llega SIN contenido (el tiempo real
      // no manda las columnas grandes que no cambiaron): se pide completa.
      const nueva = !lore.paginas.some((p) => p.id === fila.id)
      poner(fila)
      if (nueva && fila.contenido == null) programarRefresco()
    })
    // Los borrados no se pueden filtrar por campaña: llega la llave y se compara
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'lore' }, ({ old }) => {
      if (old?.id && lore.paginas.some((p) => p.id === old.id)) quitar(descendencia(lore.paginas, old.id))
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lore_revision', filter: `campania_id=eq.${id}` }, () => {
      if (esDJLore()) return
      programarRefresco()
    })
    .subscribe()
}

// Vuelve a pedir el índice (ligero) y solo baja completo lo nuevo o cambiado.
// Si mientras tanto empezó otro refresco, este se descarta: si no, una
// respuesta lenta y vieja pisaría la nueva (p. ej. el DJ oculta dos páginas
// seguidas y la segunda se le seguía viendo al jugador).
let refrescos = 0
async function refrescar() {
  const clave = lore.clave
  if (!clave || esLocal()) return
  const turno = ++refrescos
  const vigente = () => turno === refrescos && lore.clave === clave
  const { data, error } = await supabase.from('lore').select(COLUMNAS_INDICE).eq('campania_id', clave)
  if (error || !vigente()) return
  const antes = new Map(lore.paginas.map((p) => [p.id, p]))
  const ids = new Set(data.map((p) => p.id))
  const faltan = data.filter((p) => antes.get(p.id)?.actualizado !== p.actualizado || antes.get(p.id)?.contenido == null).map((p) => p.id)
  let nuevas = []
  for (let i = 0; i < faltan.length; i += 80) {
    const { data: filas } = await supabase.from('lore').select('*').in('id', faltan.slice(i, i + 80))
    if (!vigente()) return
    nuevas = nuevas.concat(filas || [])
  }
  if (!vigente()) return
  // Se mezcla con lo que hay AHORA (pudo llegar algo más nuevo por el tiempo real)
  const completas = new Map(nuevas.map((p) => [p.id, p]))
  const ahora = new Map(lore.paginas.map((p) => [p.id, p]))
  lore.paginas = data.map((p) => {
    const fila = completas.get(p.id) ?? p
    const hay = ahora.get(p.id)
    return hay ? ponerFila([hay], fila)[0] : fila
  }).filter((p) => ids.has(p.id))
}

// ---------------------------------------------------------------------
// Escribir (solo el DJ; la base de datos lo vuelve a revisar)
// ---------------------------------------------------------------------
export async function crearPagina({ padre_id = null, titulo = 'Página nueva', icono = null, contenido = '' } = {}) {
  const hermanas = hijasDe(lore.paginas, padre_id)
  const orden = (hermanas.at(-1)?.orden ?? 0) + 10
  const fila = { padre_id, titulo, icono, contenido, orden, visible: false }
  if (esLocal()) {
    const p = { id: idLocal(), campania_id: 'demo', origen: null, ...fila, creado: new Date().toISOString(), actualizado: new Date().toISOString() }
    lore.paginas = [...lore.paginas, p]
    return p
  }
  const { data, error } = await supabase.from('lore').insert({ campania_id: lore.clave, ...fila }).select().single()
  if (error) throw new Error(error.message)
  poner(data)
  return data
}

export async function guardarPagina(id, cambios) {
  const antes = lore.paginas.find((p) => p.id === id)
  if (!antes) return
  if (cambios.contenido != null && new Blob([cambios.contenido]).size > MAX_CONTENIDO) {
    throw new Error('La página es demasiado larga (máximo 200 mil caracteres); pártela en subpáginas.')
  }
  lore.paginas = lore.paginas.map((p) => (p.id === id ? { ...p, ...cambios } : p))
  if (esLocal()) { lore.paginas = lore.paginas.map((p) => (p.id === id ? { ...p, actualizado: new Date().toISOString() } : p)); return }
  const { data, error } = await supabase.from('lore').update(cambios).eq('id', id).select().single()
  if (error) {
    lore.paginas = lore.paginas.map((p) => (p.id === id ? antes : p))
    throw new Error(error.message)
  }
  poner(data)
}

// Pone la página dentro de "padre" en la posición indicada y renumera a
// sus hermanas (de 10 en 10). Solo guarda las filas que cambiaron.
export async function moverPagina(id, padre = null, posicion = Infinity) {
  if (padre && descendencia(lore.paginas, id).has(padre)) throw new Error('Una página no puede quedar dentro de sí misma.')
  const hermanas = hijasDe(lore.paginas, padre).filter((p) => p.id !== id)
  const movida = lore.paginas.find((p) => p.id === id)
  if (!movida) return
  hermanas.splice(Math.max(0, Math.min(posicion, hermanas.length)), 0, movida)
  const cambios = []
  hermanas.forEach((p, i) => {
    const c = {}
    if (p.orden !== (i + 1) * 10) c.orden = (i + 1) * 10
    if (p.id === id && (p.padre_id ?? null) !== padre) c.padre_id = padre
    if (Object.keys(c).length) cambios.push([p.id, c])
  })
  const antes = lore.paginas
  lore.paginas = lore.paginas.map((p) => {
    const c = cambios.find(([cid]) => cid === p.id)
    return c ? { ...p, ...c[1] } : p
  })
  if (esLocal()) return
  // Primero la que cambia de madre (la base de datos revisa los ciclos)
  cambios.sort(([a], [b]) => (a === id ? -1 : b === id ? 1 : 0))
  for (const [cid, c] of cambios) {
    const { error } = await supabase.from('lore').update(c).eq('id', cid)
    if (error) { lore.paginas = antes; throw new Error(error.message) }
  }
}

export async function borrarPagina(id) {
  const fuera = descendencia(lore.paginas, id)
  const borradas = lore.paginas.filter((p) => fuera.has(p.id))
  const quedan = lore.paginas.filter((p) => !fuera.has(p.id))
  // Imágenes que solo usaban las páginas borradas
  const usadas = new Set(quedan.flatMap((p) => imagenesDe(p.contenido)))
  const huerfanas = [...new Set(borradas.flatMap((p) => imagenesDe(p.contenido)))].filter((a) => !usadas.has(a))
  if (esLocal()) { lore.paginas = quedan; return }
  const { error } = await supabase.from('lore').delete().eq('id', id)
  if (error) throw new Error(error.message)
  lore.paginas = quedan
  if (huerfanas.length) supabase.storage.from(BUCKET).remove(huerfanas.map((a) => `${lore.clave}/${a}`)).catch(() => {})
}

// ---------------------------------------------------------------------
// Imágenes
// ---------------------------------------------------------------------
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
  for (const calidad of [0.88, 0.76, 0.64]) {
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/webp', calidad))
    const final = blob?.type === 'image/webp' ? blob : await new Promise((ok) => c.toBlob(ok, 'image/jpeg', calidad))
    if (final && final.size <= MAX_BYTES) return final
  }
  throw new Error('La imagen sigue pesando más de 5 MB aun achicada; prueba con otra.')
}

// Sube la imagen y regresa el pedazo de markdown para pegarlo en la página
export async function subirImagen(archivo) {
  if (!archivo) throw new Error('No elegiste ningún archivo.')
  if (!TIPOS.includes(archivo.type)) throw new Error('Solo se aceptan imágenes JPG, PNG, WEBP o GIF.')
  const listo = await reducir(archivo)
  if (listo.size > MAX_BYTES) throw new Error(`La imagen pesa ${(listo.size / 1048576).toFixed(1)} MB; el máximo es 5 MB.`)
  const base = nombreSeguro(archivo.name.replace(/\.[^.]+$/, '')).replace(/\./g, '-').slice(0, 50) || 'imagen'
  const ext = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' }[listo.type] ?? 'img'
  const archivoFinal = `${Date.now()}-${base}.${ext}`
  if (esLocal()) {
    imagenesLocales.set(archivoFinal, URL.createObjectURL(listo))
  } else {
    const { error } = await supabase.storage.from(BUCKET).upload(`${lore.clave}/${archivoFinal}`, listo, { contentType: listo.type, cacheControl: '31536000', upsert: false })
    if (error) {
      const m = error.message || ''
      throw new Error(/bucket/i.test(m) ? 'Falta crear el espacio "lore" en Supabase (migración 007).' : /row-level|security|policy/i.test(m) ? 'Solo el DJ puede subir imágenes al lore.' : m)
    }
  }
  const alt = archivo.name.replace(/\.[^.]+$/, '').replace(/[[\]()]/g, '').slice(0, 80) || 'Imagen'
  return `![${alt}](lore:${archivoFinal})`
}

// Enlace (firmado, dura una hora) para mostrar una imagen del lore
export async function urlImagen(archivo) {
  if (imagenesLocales.has(archivo)) return imagenesLocales.get(archivo)
  if (esLocal() || !lore.clave) return null
  const guardada = firmadas.get(archivo)
  if (guardada && guardada.vence > Date.now()) return guardada.url
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(`${lore.clave}/${archivo}`, 3600)
  if (error || !data?.signedUrl) return null
  firmadas.set(archivo, { url: data.signedUrl, vence: Date.now() + 50 * 60 * 1000 })
  return data.signedUrl
}

// Reglas puras del lore (sin Svelte ni Supabase) para poder probarlas con
// node: el árbol de páginas y cómo se mezcla una fila que llega.

export const ordenar = (a, b) => a.orden - b.orden || String(a.titulo ?? '').localeCompare(String(b.titulo ?? ''), 'es')
export const hijasDe = (paginas, padre) => paginas.filter((p) => (p.padre_id ?? null) === (padre ?? null)).sort(ordenar)

// La página y todas las que cuelgan de ella
export function descendencia(paginas, id) {
  const fuera = new Set([id])
  let otra = true
  while (otra) {
    otra = false
    for (const p of paginas) if (p.padre_id && fuera.has(p.padre_id) && !fuera.has(p.id)) { fuera.add(p.id); otra = true }
  }
  return fuera
}

// Las madres de una página, de la raíz hacia abajo
export function ruta(paginas, id) {
  const porId = new Map(paginas.map((p) => [p.id, p]))
  const r = []
  let p = porId.get(id)
  const vistas = new Set()
  while (p?.padre_id && !vistas.has(p.padre_id)) { vistas.add(p.padre_id); p = porId.get(p.padre_id); if (p) r.unshift(p) }
  return r
}

// La primera madre oculta (o la página misma) que la esconde de la mesa
export function ocultaPor(paginas, id) {
  const p = paginas.find((x) => x.id === id)
  if (!p) return null
  if (!p.visible) return p
  return ruta(paginas, id).find((m) => !m.visible) ?? null
}

// Marca de tiempo de Postgres ("2026-10-12T15:04:05.123456+00:00") en
// microsegundos, para comparar sin perder los decimales. null si no se entiende.
export function microsegundos(s) {
  const m = /^(\d{4}-\d\d-\d\d)[T ](\d\d:\d\d:\d\d)(?:\.(\d{1,6})\d*)?(Z|[+-]\d\d(?::?\d\d)?)?$/i.exec(String(s ?? ''))
  if (!m) return null
  let zona = (m[4] ?? 'Z').toUpperCase()
  if (/^[+-]\d\d$/.test(zona)) zona += ':00'
  else if (/^[+-]\d{4}$/.test(zona)) zona = `${zona.slice(0, 3)}:${zona.slice(3)}`
  const ms = Date.parse(`${m[1]}T${m[2]}${zona}`)
  if (!Number.isFinite(ms)) return null
  return ms * 1000 + Number((m[3] ?? '').padEnd(6, '0'))
}

// ¿La fila que llega es más vieja que la que ya se tiene? (un eco atrasado
// del tiempo real o la respuesta de un guardado anterior)
export function esMasVieja(nueva, vieja) {
  const a = microsegundos(nueva?.actualizado)
  const b = microsegundos(vieja?.actualizado)
  return a != null && b != null && a < b
}

// Mete (o mezcla) una fila en la lista. El tiempo real no manda las columnas
// grandes que no cambiaron (el contenido), así que se mezcla, no se reemplaza.
// Si la fila es más vieja que la que ya hay, se ignora: así un eco atrasado
// no regresa la página a un texto anterior.
export function ponerFila(paginas, fila) {
  const vieja = paginas.find((p) => p.id === fila.id)
  if (!vieja) return [...paginas, fila]
  if (esMasVieja(fila, vieja)) return paginas
  return paginas.map((p) => (p.id === fila.id ? { ...p, ...fila } : p))
}

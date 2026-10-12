// Markdown mínimo para los textos del SRD: **negritas**, _cursivas_,
// listas con "- ", tablas con "|" y saltos de línea. Escapa todo el HTML.

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

function enLinea(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(¿¡"])_(.+?)_(?=[\s.,;:!?)"]|$)/g, '$1<em>$2</em>')
}

export function md(texto = '') {
  const lineas = String(texto).replace(/\r/g, '').split('\n')
  const out = []
  let lista = false
  let tabla = null
  const cerrar = () => {
    if (lista) { out.push('</ul>'); lista = false }
    if (tabla) {
      const [cab, ...filas] = tabla.filter((f) => !/^\s*\|?\s*:?-{2,}/.test(f.join('')))
      out.push('<table><thead><tr>' + cab.map((c) => `<th>${enLinea(c)}</th>`).join('') + '</tr></thead><tbody>' +
        filas.map((f) => '<tr>' + f.map((c) => `<td>${enLinea(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>')
      tabla = null
    }
  }
  for (const l of lineas) {
    const t = l.trim()
    if (/^\|.*\|$/.test(t)) {
      if (lista) { out.push('</ul>'); lista = false }
      tabla = tabla || []
      tabla.push(t.slice(1, -1).split('|').map((c) => c.trim()))
      continue
    }
    if (/^[-*•]\s+/.test(t)) {
      if (tabla) cerrar()
      if (!lista) { out.push('<ul>'); lista = true }
      out.push(`<li>${enLinea(t.replace(/^[-*•]\s+/, ''))}</li>`)
      continue
    }
    cerrar()
    if (!t) continue
    if (/^#{1,6}\s/.test(t)) { out.push(`<p><strong>${enLinea(t.replace(/^#+\s*/, ''))}</strong></p>`); continue }
    out.push(`<p>${enLinea(t)}</p>`)
  }
  cerrar()
  return out.join('')
}

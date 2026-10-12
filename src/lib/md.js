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

// ---------------------------------------------------------------------
// Markdown del lore (más completo): títulos, párrafos, listas (con viñeta,
// numeradas y de casillas), citas, separadores, bloques de código,
// tablas, imágenes, enlaces, negritas, cursivas, tachado y código.
//
// Seguridad: primero se escapa TODO el HTML y luego se arman las
// etiquetas permitidas. Los enlaces solo aceptan http(s), mailto,
// rutas relativas y los propios del lore:
//   ![texto](lore:archivo.webp)   imagen del bucket privado (data-lore)
//   [texto](lore:pagina/<uuid>)   enlace a otra página (data-pagina)
// ---------------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Recibe la URL YA escapada. Regresa { tipo, valor } o null si no se permite.
export function urlSegura(url) {
  // Los navegadores ignoran tabuladores y saltos dentro de una URL
  // ("java\tscript:"), así que se quitan antes de revisar el esquema.
  const u = String(url ?? '').replace(/[\u0000- \u007f]/g, '')
  if (!u) return null
  const esquema = /^([a-z][a-z0-9+.-]*):/i.exec(u)?.[1]?.toLowerCase()
  if (!esquema) return { tipo: 'relativa', valor: u }
  if (esquema === 'http' || esquema === 'https' || esquema === 'mailto') return { tipo: 'web', valor: u }
  if (esquema === 'lore') {
    const resto = u.slice(5)
    if (resto.startsWith('pagina/') && UUID.test(resto.slice(7))) return { tipo: 'pagina', valor: resto.slice(7).toLowerCase() }
    if (/^[a-z0-9._-]{1,120}$/i.test(resto) && !resto.startsWith('.')) return { tipo: 'imagen', valor: resto }
  }
  return null
}

function imagenHTML(alt, url) {
  const s = urlSegura(url)
  if (!s) return alt
  if (s.tipo === 'imagen') return `<img data-lore="${s.valor}" alt="${alt}" loading="lazy">`
  if (s.tipo === 'pagina' || /^mailto:/i.test(s.valor)) return alt
  return `<img src="${s.valor}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer">`
}

function enlaceHTML(texto, url) {
  const s = urlSegura(url)
  if (!s || s.tipo === 'imagen') return texto
  if (s.tipo === 'pagina') return `<a href="#" data-pagina="${s.valor}">${texto}</a>`
  return `<a href="${s.valor}" target="_blank" rel="noopener noreferrer nofollow">${texto}</a>`
}

// Formato en línea sobre texto ya escapado. El código va primero y se
// aparta para que nada de adentro se interprete.
function enLineaLore(crudo) {
  const codigos = []
  let s = esc(crudo).replace(/`([^`]+)`/g, (_, c) => `\u0000${codigos.push(c) - 1}\u0000`)
  const URL_MD = '([^()\\s]*(?:\\([^()\\s]*\\)[^()\\s]*)*)'
  s = s
    .replace(new RegExp(`!\\[([^\\]]*)\\]\\(${URL_MD}\\)`, 'g'), (_, alt, url) => imagenHTML(alt, url))
    .replace(new RegExp(`\\[([^\\]]+)\\]\\(${URL_MD}\\)`, 'g'), (_, t, url) => enlaceHTML(t, url))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/(^|[^*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[\s(¿¡>])_(?!\s)(.+?)(?<!\s)_(?=[\s.,;:!?)<]|$)/g, '$1<em>$2</em>')
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codigos[+i]}</code>`)
}

export function mdLore(texto = '') {
  const lineas = String(texto ?? '').replace(/\r/g, '').split('\n')
  const out = []
  let parrafo = []
  let cita = []
  let lista = null // { tipo: 'ul' | 'ol', items: [] }
  let tabla = null
  const cerrarParrafo = () => { if (parrafo.length) out.push(`<p>${parrafo.map(enLineaLore).join('<br>')}</p>`); parrafo = [] }
  const cerrarCita = () => { if (cita.length) out.push(`<blockquote>${mdLore(cita.join('\n'))}</blockquote>`); cita = [] }
  const cerrarLista = () => {
    if (!lista) return
    out.push(`<${lista.tipo}>` + lista.items.map((i) =>
      `<li${i.clase ? ` class="${i.clase}"` : ''}${i.sangria ? ` style="margin-left:${Math.min(i.sangria, 6) * 1.2}em"` : ''}>${i.html}</li>`).join('') + `</${lista.tipo}>`)
    lista = null
  }
  const cerrarTabla = () => {
    if (!tabla) return
    const [cab = [], ...filas] = tabla.filter((f) => !f.every((c) => /^:?-{2,}:?$/.test(c)))
    out.push('<div class="tabla"><table><thead><tr>' + cab.map((c) => `<th>${enLineaLore(c)}</th>`).join('') + '</tr></thead><tbody>' +
      filas.map((f) => '<tr>' + f.map((c) => `<td>${enLineaLore(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>')
    tabla = null
  }
  const cerrarTodo = () => { cerrarParrafo(); cerrarCita(); cerrarLista(); cerrarTabla() }

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i]
    const t = l.trim()
    // Bloque de código
    if (/^```/.test(t)) {
      cerrarTodo()
      const codigo = []
      while (++i < lineas.length && !/^```/.test(lineas[i].trim())) codigo.push(lineas[i])
      out.push(`<pre><code>${esc(codigo.join('\n'))}</code></pre>`)
      continue
    }
    if (/^>/.test(t)) { cerrarParrafo(); cerrarLista(); cerrarTabla(); cita.push(t.replace(/^>\s?/, '')); continue }
    cerrarCita()
    if (/^\|.*\|$/.test(t)) {
      cerrarParrafo(); cerrarLista()
      tabla = tabla || []
      tabla.push(t.slice(1, -1).split('|').map((c) => c.trim()))
      continue
    }
    cerrarTabla()
    if (!t) { cerrarParrafo(); cerrarLista(); continue }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t.replace(/\s/g, ''))) { cerrarTodo(); out.push('<hr>'); continue }
    const titulo = /^(#{1,6})\s+(.*)$/.exec(t)
    if (titulo) {
      cerrarTodo()
      const n = Math.min(titulo[1].length + 1, 6) // "#" es h2: el h1 es el título de la página
      out.push(`<h${n}>${enLineaLore(titulo[2].replace(/\s+#+$/, ''))}</h${n}>`)
      continue
    }
    const sangria = Math.floor(/^\s*/.exec(l.replace(/\t/g, '  '))[0].length / 2)
    const vineta = /^[-*+•]\s+(.*)$/.exec(t)
    const numero = /^\d{1,4}[.)]\s+(.*)$/.exec(t)
    if (vineta || numero) {
      cerrarParrafo()
      const tipo = vineta ? 'ul' : 'ol'
      if (lista && lista.tipo !== tipo && sangria === 0) cerrarLista()
      lista = lista || { tipo, items: [] }
      let cuerpo = (vineta || numero)[1]
      let clase = ''
      const casilla = /^\[( |x|X)\]\s+(.*)$/.exec(cuerpo)
      if (vineta && casilla) { clase = casilla[1] === ' ' ? 'casilla' : 'casilla hecha'; cuerpo = casilla[2] }
      lista.items.push({ html: enLineaLore(cuerpo), clase, sangria })
      continue
    }
    cerrarLista()
    parrafo.push(t)
  }
  cerrarTodo()
  return out.join('')
}

// Los archivos de imagen del lore que menciona un texto
export function imagenesDe(texto = '') {
  return [...String(texto).matchAll(/!\[[^\]]*\]\(lore:([a-z0-9._-]{1,120})\)/gi)].map((m) => m[1])
}

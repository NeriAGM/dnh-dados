<script>
  import { onMount, onDestroy, tick } from 'svelte'
  import { app } from '../../lib/mesa.svelte.js'
  import {
    lore, abrirLore, esDJLore, hijasDe, descendencia, ruta, ocultaPor, ordenar,
    crearPagina, guardarPagina, moverPagina, borrarPagina, subirImagen, urlImagen, MAX_CONTENIDO,
  } from '../../lib/lore.svelte.js'
  import { mdLore } from '../../lib/md.js'

  let { onCerrar } = $props()

  const esDJ = $derived(esDJLore())
  const CLAVE_ELEGIDA = 'dnh.lore.pagina'
  const ICONOS = ['📜', '🕳️', '🌿', '🦴', '🗝️', '👁️', '🏚️', '⚔️', '🐟', '🌙', '🔥', '💀', '🧭', '🗺️', '🏛️', '🕯️', '🪦', '🐉', '🍄', '⚙️']

  let buscar = $state('')
  let elegida = $state(null)
  let desplegadas = $state(new Set())
  let vista = $state('indice') // en celular: 'indice' | 'pagina'
  let error = $state('')
  let confirmar = $state(null)
  let tConfirmar = 0
  let verMover = $state(false)
  let verIconos = $state(false)

  // Edición
  let editando = $state(false)
  let borrador = $state({ titulo: '', icono: '', contenido: '' })
  let estado = $state('guardado') // guardado | pendiente | guardando | error
  let pestanaEditor = $state('escribir') // en pantallas angostas
  let subiendo = $state(false)
  let area = $state()
  let archivoInput = $state()
  let editandoId = null
  let version = 0
  let tGuardar = 0

  // Arrastrar en el índice
  let arrastrando = $state(null)
  let destino = $state(null) // { id, modo: 'antes' | 'dentro' } | { id: null }

  const porId = $derived(new Map(lore.paginas.map((p) => [p.id, p])))
  const pagina = $derived(elegida ? porId.get(elegida) ?? null : null)
  const madres = $derived(pagina ? ruta(lore.paginas, pagina.id) : [])
  const hijas = $derived(pagina ? hijasDe(lore.paginas, pagina.id) : [])
  const escondida = $derived(pagina && esDJ ? ocultaPor(lore.paginas, pagina.id) : null)
  const conHijas = $derived(new Set(lore.paginas.map((p) => p.padre_id).filter(Boolean)))

  // Índice aplanado (respetando lo plegado) para pintarlo sin recursión
  const filas = $derived.by(() => {
    const out = []
    const recorrer = (padre, nivel) => {
      for (const p of hijasDe(lore.paginas, padre)) {
        out.push({ p, nivel })
        if (conHijas.has(p.id) && desplegadas.has(p.id)) recorrer(p.id, nivel + 1)
      }
    }
    recorrer(null, 0)
    return out
  })

  const normal = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const resultados = $derived.by(() => {
    const t = normal(buscar.trim())
    if (!t) return []
    return lore.paginas
      .map((p) => ({ p, enTitulo: normal(p.titulo).includes(t), enTexto: normal(p.contenido).includes(t) }))
      .filter((r) => r.enTitulo || r.enTexto)
      .sort((a, b) => b.enTitulo - a.enTitulo || ordenar(a.p, b.p))
      .slice(0, 60)
  })

  const html = $derived(pagina ? mdLore(editando ? borrador.contenido : pagina.contenido) : '')
  const bytes = $derived(editando ? new Blob([borrador.contenido]).size : 0)

  // ---------------------------------------------------------------
  // Navegar
  // ---------------------------------------------------------------
  function guardarElegida(id) { try { localStorage.setItem(`${CLAVE_ELEGIDA}.${lore.clave}`, id ?? '') } catch {} }
  function leerElegida() { try { return localStorage.getItem(`${CLAVE_ELEGIDA}.${lore.clave}`) } catch { return null } }

  async function ir(id, { abrir = true } = {}) {
    if (editando) await terminarEdicion()
    if (id && !porId.has(id)) { error = 'Esa página no existe o todavía no está a la vista.'; return }
    elegida = id
    verMover = false
    verIconos = false
    confirmar = null
    if (id) {
      const d = new Set(desplegadas)
      for (const m of ruta(lore.paginas, id)) d.add(m.id)
      desplegadas = d
      if (abrir) vista = 'pagina'
    }
    guardarElegida(id)
    document.querySelector('.lore .lector')?.scrollTo?.({ top: 0 })
  }

  function plegar(id) {
    const d = new Set(desplegadas)
    d.has(id) ? d.delete(id) : d.add(id)
    desplegadas = d
  }

  onMount(async () => {
    await abrirLore()
    const guardada = leerElegida()
    const ancho = matchMedia('(min-width: 760px)').matches
    if (guardada && porId.has(guardada)) ir(guardada, { abrir: ancho })
    else if (ancho && filas[0]) ir(filas[0].p.id, { abrir: false })
    // Al inicio, la primera capa del índice desplegada
    if (!desplegadas.size) desplegadas = new Set(hijasDe(lore.paginas, null).slice(0, 3).map((p) => p.id))
  })

  // Si la página que estabas leyendo desaparece (la ocultaron o borraron)
  $effect(() => {
    if (elegida && !lore.cargando && lore.clave && !porId.has(elegida)) {
      elegida = null
      editando = false
      vista = 'indice'
    }
  })

  // ---------------------------------------------------------------
  // Contenido vivo: imágenes del bucket y enlaces entre páginas
  // ---------------------------------------------------------------
  function vivo(nodo, _html) {
    const resolver = () => {
      for (const img of nodo.querySelectorAll('img[data-lore]:not([src])')) {
        img.classList.add('cargando')
        urlImagen(img.dataset.lore).then((u) => {
          img.classList.remove('cargando')
          if (u) img.src = u
          else { img.classList.add('rota'); img.title = 'No se pudo cargar esta imagen' }
        })
      }
    }
    const clic = (e) => {
      const a = e.target.closest?.('a[data-pagina]')
      if (!a) return
      e.preventDefault()
      ir(a.dataset.pagina)
    }
    nodo.addEventListener('click', clic)
    resolver()
    return { update: () => tick().then(resolver), destroy: () => nodo.removeEventListener('click', clic) }
  }

  // ---------------------------------------------------------------
  // Acciones del DJ
  // ---------------------------------------------------------------
  async function hacer(fn) {
    error = ''
    try { return await fn() } catch (e) { error = e.message || String(e) }
  }

  async function nueva(padre = null) {
    const p = await hacer(() => crearPagina({ padre_id: padre }))
    if (!p) return
    if (padre) desplegadas = new Set([...desplegadas, padre])
    await ir(p.id)
    empezarEdicion()
    await tick()
    document.querySelector('.lore .editor-titulo')?.select?.()
  }

  function alternarVisible(p) { hacer(() => guardarPagina(p.id, { visible: !p.visible })) }

  function pedirBorrar(p) {
    clearTimeout(tConfirmar)
    if (confirmar === p.id) {
      confirmar = null
      const madre = p.padre_id
      editando = false
      hacer(async () => { await borrarPagina(p.id); elegida = null; if (madre && porId.has(madre)) ir(madre); else vista = 'indice' })
      return
    }
    confirmar = p.id
    tConfirmar = setTimeout(() => (confirmar = null), 4000)
  }

  const cuantasDentro = (id) => descendencia(lore.paginas, id).size - 1

  // Mover con botones
  function hermanasDe(p) { return hijasDe(lore.paginas, p.padre_id ?? null) }
  function subir(p) { const h = hermanasDe(p); const i = h.findIndex((x) => x.id === p.id); if (i > 0) hacer(() => moverPagina(p.id, p.padre_id ?? null, i - 1)) }
  function bajar(p) { const h = hermanasDe(p); const i = h.findIndex((x) => x.id === p.id); if (i < h.length - 1) hacer(() => moverPagina(p.id, p.padre_id ?? null, i + 1)) }
  function meter(p) {
    const h = hermanasDe(p); const i = h.findIndex((x) => x.id === p.id)
    if (i <= 0) return
    const nuevaMadre = h[i - 1].id
    desplegadas = new Set([...desplegadas, nuevaMadre])
    hacer(() => moverPagina(p.id, nuevaMadre))
  }
  function sacar(p) {
    const madre = porId.get(p.padre_id)
    if (!madre) return
    const h = hermanasDe(madre)
    hacer(() => moverPagina(p.id, madre.padre_id ?? null, h.findIndex((x) => x.id === madre.id) + 1))
  }
  // Opciones de "Mover dentro de…": todo menos la página y lo que cuelga de ella
  const opcionesMover = $derived.by(() => {
    if (!pagina) return []
    const fuera = descendencia(lore.paginas, pagina.id)
    const out = []
    const recorrer = (padre, nivel) => {
      for (const p of hijasDe(lore.paginas, padre)) {
        if (fuera.has(p.id)) continue
        out.push({ p, nivel })
        recorrer(p.id, nivel + 1)
      }
    }
    recorrer(null, 0)
    return out
  })
  function moverDentro(valor) {
    if (!pagina) return
    const madre = valor || null
    if (madre) desplegadas = new Set([...desplegadas, madre])
    hacer(() => moverPagina(pagina.id, madre))
  }

  // Arrastrar y soltar (en computadora)
  function alArrastrar(e, p) {
    arrastrando = p.id
    e.dataTransfer.effectAllowed = 'move'
    try { e.dataTransfer.setData('text/plain', p.id) } catch {}
  }
  function sobre(e, p) {
    if (!arrastrando || arrastrando === p.id || descendencia(lore.paginas, arrastrando).has(p.id)) { destino = null; return }
    e.preventDefault()
    const r = e.currentTarget.getBoundingClientRect()
    destino = { id: p.id, modo: e.clientY - r.top < r.height * 0.35 ? 'antes' : 'dentro' }
  }
  function soltar(e) {
    e.preventDefault()
    const id = arrastrando, d = destino
    arrastrando = null; destino = null
    if (!id || !d) return
    if (d.id === null) { hacer(() => moverPagina(id, null)); return }
    const t = porId.get(d.id)
    if (!t) return
    if (d.modo === 'dentro') {
      desplegadas = new Set([...desplegadas, t.id])
      hacer(() => moverPagina(id, t.id))
    } else {
      const h = hijasDe(lore.paginas, t.padre_id ?? null).filter((x) => x.id !== id)
      hacer(() => moverPagina(id, t.padre_id ?? null, h.findIndex((x) => x.id === t.id)))
    }
  }

  // ---------------------------------------------------------------
  // Editar con guardado automático
  // ---------------------------------------------------------------
  function empezarEdicion() {
    if (!pagina) return
    editandoId = pagina.id
    borrador = { titulo: pagina.titulo, icono: pagina.icono ?? '', contenido: pagina.contenido ?? '' }
    estado = 'guardado'
    pestanaEditor = 'escribir'
    editando = true
  }

  function cambio(campo, valor) {
    borrador[campo] = valor
    version++
    estado = 'pendiente'
    clearTimeout(tGuardar)
    tGuardar = setTimeout(guardarYa, 900)
  }

  async function guardarYa() {
    clearTimeout(tGuardar)
    if (estado !== 'pendiente' || !editandoId) return
    const v = version
    const id = editandoId
    const c = {
      titulo: borrador.titulo.trim().slice(0, 200) || 'Página sin título',
      icono: borrador.icono.trim() ? [...borrador.icono.trim()].slice(0, 4).join('') : null,
      contenido: borrador.contenido,
    }
    estado = 'guardando'
    try {
      await guardarPagina(id, c)
      if (version === v) estado = 'guardado'
      else estado = 'pendiente'
    } catch (e) {
      estado = 'error'
      error = e.message
    }
  }

  async function terminarEdicion() {
    await guardarYa()
    if (estado === 'error') return
    editando = false
    editandoId = null
    verIconos = false
  }

  onDestroy(() => { if (editando) guardarYa() })

  // Barra de herramientas
  function aplicar(nuevo, ini, fin) {
    cambio('contenido', nuevo)
    tick().then(() => { area?.focus(); area?.setSelectionRange(ini, fin) })
  }
  function envolver(antes, despues = antes, ejemplo = 'texto') {
    if (!area) return
    const { selectionStart: a, selectionEnd: b, value } = area
    const sel = value.slice(a, b) || ejemplo
    aplicar(value.slice(0, a) + antes + sel + despues + value.slice(b), a + antes.length, a + antes.length + sel.length)
  }
  function prefijo(p) {
    if (!area) return
    const { selectionStart: a, selectionEnd: b, value } = area
    const ini = value.lastIndexOf('\n', a - 1) + 1
    const f = value.indexOf('\n', b)
    const fin = f === -1 ? value.length : f
    const lineas = value.slice(ini, fin).split('\n')
    const todas = lineas.every((l) => l.startsWith(p))
    const bloque = lineas.map((l, i) => {
      if (todas) return l.slice(p.length)
      const limpia = l.replace(/^(#{1,6}\s|>\s?|[-*]\s(\[[ xX]\]\s)?|\d+[.)]\s)/, '')
      return (p === '1. ' ? `${i + 1}. ` : p) + limpia
    }).join('\n')
    aplicar(value.slice(0, ini) + bloque + value.slice(fin), ini, ini + bloque.length)
  }
  function insertar(texto) {
    const v = borrador.contenido
    const a = area ? area.selectionStart : v.length
    const antes = v.slice(0, a)
    const pre = antes && !antes.endsWith('\n\n') ? (antes.endsWith('\n') ? '\n' : '\n\n') : ''
    const nuevo = antes + pre + texto + '\n\n' + v.slice(a).replace(/^\n+/, '')
    const pos = (antes + pre + texto).length
    aplicar(nuevo, pos, pos)
  }
  function enlace() {
    if (!area) return
    const { selectionStart: a, selectionEnd: b, value } = area
    const sel = value.slice(a, b) || 'texto'
    const t = `[${sel}](https://)`
    aplicar(value.slice(0, a) + t + value.slice(b), a + sel.length + 3, a + t.length - 1)
  }
  async function subirArchivos(archivos) {
    const lista = [...(archivos ?? [])].filter((f) => f.type?.startsWith('image/'))
    if (!lista.length) return
    subiendo = true
    error = ''
    try {
      for (const f of lista) insertar(await subirImagen(f))
    } catch (e) {
      error = e.message
    } finally {
      subiendo = false
      if (archivoInput) archivoInput.value = ''
    }
  }
  function teclas(e) {
    if (!(e.ctrlKey || e.metaKey)) return
    const k = e.key.toLowerCase()
    if (k === 'b') { e.preventDefault(); envolver('**') }
    else if (k === 'i') { e.preventDefault(); envolver('*') }
    else if (k === 's') { e.preventDefault(); guardarYa() }
  }
  function pegar(e) {
    const archivos = [...(e.clipboardData?.files ?? [])]
    if (archivos.some((f) => f.type.startsWith('image/'))) { e.preventDefault(); subirArchivos(archivos) }
  }
  function soltarEnTexto(e) {
    const archivos = [...(e.dataTransfer?.files ?? [])]
    if (archivos.length) { e.preventDefault(); subirArchivos(archivos) }
  }

  async function cerrar() {
    if (editando) await guardarYa()
    onCerrar?.()
  }
  function tecla(e) { if (e.key === 'Escape' && !editando) cerrar() }

  const TEXTO_ESTADO = { guardado: 'Guardado', pendiente: 'Sin guardar…', guardando: 'Guardando…', error: 'No se guardó' }
  const fecha = (iso) => { try { return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' } }
  const ESPORAS = Array.from({ length: 14 }, (_, i) => ({ x: (i * 37) % 100, d: 14 + ((i * 7) % 11), r: (i * 1.7) % 9, t: 2 + (i % 3) }))
</script>

<svelte:window onkeydown={tecla} />

<div class="velo" onclick={cerrar} role="presentation"></div>
<section class="lore" class:en-pagina={vista === 'pagina'} aria-label="Lore de la campaña">
  <div class="esporas" aria-hidden="true">
    {#each ESPORAS as s}<span style:left="{s.x}%" style:animation-duration="{s.d}s" style:animation-delay="-{s.r}s" style:width="{s.t}px" style:height="{s.t}px"></span>{/each}
  </div>

  <header class="cabecera">
    {#if vista === 'pagina'}
      <button class="volver solo-angosto" onclick={async () => { if (editando) await terminarEdicion(); vista = 'indice' }} aria-label="Volver al índice">‹ Índice</button>
    {/if}
    <h2 class="titulo"><span class="sello" aria-hidden="true">✦</span> Códice del Abismo</h2>
    {#if esDJ}
      <button class="boton chico nueva" onclick={() => nueva(null)} aria-label="Nueva página">+ Nueva<span class="largo-lore"> página</span></button>
    {/if}
    <button class="cerrar" onclick={cerrar} aria-label="Cerrar el lore">✕</button>
  </header>

  {#if error}<div role="alert"><button class="error" onclick={() => (error = '')} title="Cerrar aviso">{error}</button></div>{/if}

  <div class="cuerpo">
    <!-- ================= Índice ================= -->
    <aside class="indice" aria-label="Índice del lore">
      <label class="buscar">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input type="search" placeholder="Buscar en el lore" bind:value={buscar} aria-label="Buscar en el lore" />
      </label>

      {#if lore.cargando}
        <p class="vacio">Abriendo el códice…</p>
      {:else if lore.error}
        <p class="vacio error-texto">{lore.error}</p>
      {:else if buscar.trim()}
        <ul class="arbol" role="list">
          {#each resultados as r (r.p.id)}
            {@const camino = ruta(lore.paginas, r.p.id)}
            <li>
              <button class="fila resultado" class:activa={r.p.id === elegida} onclick={() => ir(r.p.id)}>
                <span class="ico">{r.p.icono || '📜'}</span>
                <span class="nom">
                  {r.p.titulo}
                  {#if camino.length}<small>{camino.map((m) => m.titulo).join(' › ')}</small>{/if}
                  {#if !r.enTitulo}<small class="en-texto">aparece en el texto</small>{/if}
                </span>
              </button>
            </li>
          {:else}
            <li class="vacio">Nada coincide con «{buscar}».</li>
          {/each}
        </ul>
      {:else if !filas.length}
        <div class="vacio grande">
          {#if esDJ}
            <p>El códice está vacío.</p>
            <button class="boton" onclick={() => nueva(null)}>Escribir la primera página</button>
          {:else}
            <p>El DJ todavía no ha revelado nada del lore.</p>
          {/if}
        </div>
      {:else}
        <ul class="arbol" role="tree">
          {#each filas as { p, nivel } (p.id)}
            {@const oculta = esDJ && !!ocultaPor(lore.paginas, p.id)}
            <li
              role="treeitem"
              aria-selected={p.id === elegida}
              aria-expanded={conHijas.has(p.id) ? desplegadas.has(p.id) : undefined}
              class:destino-antes={destino?.id === p.id && destino.modo === 'antes'}
              class:destino-dentro={destino?.id === p.id && destino.modo === 'dentro'}
              class:arrastrada={arrastrando === p.id}
              style:--nivel={nivel}
              draggable={esDJ}
              ondragstart={(e) => alArrastrar(e, p)}
              ondragend={() => { arrastrando = null; destino = null }}
              ondragover={(e) => sobre(e, p)}
              ondragleave={() => { if (destino?.id === p.id) destino = null }}
              ondrop={soltar}
            >
              <div class="fila" class:activa={p.id === elegida} class:oculta>
                {#if conHijas.has(p.id)}
                  <button class="plegar" class:abierta={desplegadas.has(p.id)} onclick={() => plegar(p.id)} aria-label={desplegadas.has(p.id) ? `Plegar ${p.titulo}` : `Desplegar ${p.titulo}`}>
                    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                {:else}
                  <span class="plegar vacio-plegar" aria-hidden="true">·</span>
                {/if}
                <button class="abrir" onclick={() => ir(p.id)}>
                  <span class="ico">{p.icono || '📜'}</span>
                  <span class="nom">{p.titulo}</span>
                </button>
                {#if esDJ}
                  <button class="ojo" class:cerrado={!p.visible} onclick={() => alternarVisible(p)} aria-label={p.visible ? `Ocultar «${p.titulo}» a la mesa` : `Mostrar «${p.titulo}» a la mesa`} title={p.visible ? 'Visible para la mesa' : 'Oculta para la mesa'}>
                    {#if p.visible}
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
                    {:else}
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 3l18 18M10.6 5.6A9.9 9.9 0 0 1 12 5.5C18.4 5.5 22 12 22 12a17 17 0 0 1-3.2 3.9M6.4 6.9C3.7 8.7 2 12 2 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.2-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                    {/if}
                  </button>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
        {#if esDJ && arrastrando}
          <div
            class="zona-raiz"
            class:activa={destino?.id === null}
            role="presentation"
            ondragover={(e) => { e.preventDefault(); destino = { id: null } }}
            ondragleave={() => { if (destino?.id === null) destino = null }}
            ondrop={soltar}
          >Soltar aquí para dejarla en la raíz</div>
        {/if}
      {/if}
    </aside>

    <!-- ================= Lector ================= -->
    <article class="lector">
      {#if pagina}
        <div class="folio" class:editando>
          {#if madres.length}
            <nav class="migas" aria-label="Dónde está esta página">
              {#each madres as m (m.id)}<button onclick={() => ir(m.id)}>{m.icono || '📜'} {m.titulo}</button><span aria-hidden="true">›</span>{/each}
            </nav>
          {/if}

          {#if esDJ}
            <div class="herramientas-dj">
              <label class="interruptor" title="Los jugadores solo ven las páginas visibles (y sus madres también deben serlo)">
                <input type="checkbox" checked={pagina.visible} onchange={() => alternarVisible(pagina)} />
                <span class="riel" aria-hidden="true"><span></span></span>
                Visible para la mesa
              </label>
              <span class="separa"></span>
              {#if editando}
                <span class="estado" class:error={estado === 'error'} class:pendiente={estado !== 'guardado'} aria-live="polite">{TEXTO_ESTADO[estado]}</span>
                <button class="boton chico listo" onclick={terminarEdicion}>Listo</button>
              {:else}
                <button class="boton chico" onclick={empezarEdicion}>Editar</button>
              {/if}
              <button class="boton chico" onclick={() => nueva(pagina.id)}>+ Subpágina</button>
              <button class="boton chico" aria-pressed={verMover} onclick={() => (verMover = !verMover)}>Mover</button>
              <button class="boton chico borrar" class:confirmando={confirmar === pagina.id} onclick={() => pedirBorrar(pagina)}>
                {confirmar === pagina.id ? (cuantasDentro(pagina.id) ? `¿Borrar con ${cuantasDentro(pagina.id)} subpágina${cuantasDentro(pagina.id) === 1 ? '' : 's'}? Toca otra vez` : '¿Seguro? Toca otra vez') : 'Borrar'}
              </button>
            </div>

            {#if verMover}
              {@const h = hermanasDe(pagina)}
              {@const i = h.findIndex((x) => x.id === pagina.id)}
              <div class="mover">
                <button class="boton chico" disabled={i <= 0} onclick={() => subir(pagina)}>↑ Subir</button>
                <button class="boton chico" disabled={i >= h.length - 1} onclick={() => bajar(pagina)}>↓ Bajar</button>
                <button class="boton chico" disabled={i <= 0} onclick={() => meter(pagina)} title="Dentro de la página de arriba">→ Dentro de la anterior</button>
                <button class="boton chico" disabled={!pagina.padre_id} onclick={() => sacar(pagina)}>← Un nivel afuera</button>
                <select class="campo" value={pagina.padre_id ?? ''} onchange={(e) => moverDentro(e.currentTarget.value)} aria-label="Mover dentro de otra página">
                  <option value="">Raíz del códice</option>
                  {#each opcionesMover as o (o.p.id)}<option value={o.p.id}>{'  '.repeat(o.nivel)}{o.p.icono || '📜'} {o.p.titulo}</option>{/each}
                </select>
                <p class="ayuda">En computadora también puedes arrastrar páginas en el índice: arriba de otra para ponerla antes, en medio para meterla dentro.</p>
              </div>
            {/if}

            {#if escondida}
              <p class="sello-oculta">
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M3 3l18 18M6.4 6.9C3.7 8.7 2 12 2 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.2-1M10.6 5.6A9.9 9.9 0 0 1 12 5.5C18.4 5.5 22 12 22 12a17 17 0 0 1-3.2 3.9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                Oculta para la mesa{#if escondida.id !== pagina.id}<span> · la esconde «{escondida.titulo}»</span>{/if}
              </p>
            {/if}
          {/if}

          {#if editando}
            <div class="cabeza-editor">
              <div class="icono-editor">
                <button class="ico-grande" onclick={() => (verIconos = !verIconos)} aria-label="Elegir ícono" aria-expanded={verIconos}>{borrador.icono || '📜'}</button>
                {#if verIconos}
                  <div class="paleta" role="dialog" aria-label="Íconos">
                    {#each ICONOS as e}<button onclick={() => { cambio('icono', e); verIconos = false }}>{e}</button>{/each}
                    <input class="campo" maxlength="8" placeholder="Otro emoji" value={borrador.icono} oninput={(e) => cambio('icono', e.currentTarget.value)} aria-label="Emoji del ícono" />
                    <button class="quitar" onclick={() => { cambio('icono', ''); verIconos = false }}>Sin ícono</button>
                  </div>
                {/if}
              </div>
              <input class="editor-titulo titulo" maxlength="200" value={borrador.titulo} oninput={(e) => cambio('titulo', e.currentTarget.value)} aria-label="Título de la página" placeholder="Título" />
            </div>

            <div class="barra-md" role="toolbar" aria-label="Formato">
              <button onclick={() => prefijo('# ')} title="Título">T1</button>
              <button onclick={() => prefijo('## ')} title="Subtítulo">T2</button>
              <button onclick={() => prefijo('### ')} title="Título chico">T3</button>
              <span class="sep"></span>
              <button onclick={() => envolver('**')} title="Negritas (Ctrl+B)"><b>N</b></button>
              <button onclick={() => envolver('*')} title="Cursivas (Ctrl+I)"><i>C</i></button>
              <button onclick={() => envolver('~~')} title="Tachado"><s>S</s></button>
              <span class="sep"></span>
              <button onclick={() => prefijo('- ')} title="Lista">• Lista</button>
              <button onclick={() => prefijo('1. ')} title="Lista numerada">1. Lista</button>
              <button onclick={() => prefijo('> ')} title="Cita">❝ Cita</button>
              <button onclick={() => insertar('---')} title="Separador">✦</button>
              <button onclick={enlace} title="Enlace">Enlace</button>
              <button onclick={() => archivoInput?.click()} disabled={subiendo} title="Subir imagen (también puedes pegarla o soltarla en el texto)">{subiendo ? 'Subiendo…' : '🖼 Imagen'}</button>
              <input class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple bind:this={archivoInput} onchange={(e) => subirArchivos(e.currentTarget.files)} tabindex="-1" aria-hidden="true" />
            </div>

            <div class="pestanas-editor solo-angosto-editor">
              <button class:activa={pestanaEditor === 'escribir'} onclick={() => (pestanaEditor = 'escribir')}>Escribir</button>
              <button class:activa={pestanaEditor === 'ver'} onclick={() => (pestanaEditor = 'ver')}>Vista previa</button>
            </div>

            <div class="editor" class:ver={pestanaEditor === 'ver'}>
              <textarea
                bind:this={area}
                class="fuente-md"
                value={borrador.contenido}
                oninput={(e) => cambio('contenido', e.currentTarget.value)}
                onkeydown={teclas}
                onpaste={pegar}
                ondrop={soltarEnTexto}
                ondragover={(e) => e.preventDefault()}
                spellcheck="true"
                lang="es"
                placeholder="Escribe en markdown: # título, **negritas**, *cursivas*, - listas, > citas…"
                aria-label="Contenido de la página (markdown)"
              ></textarea>
              <div class="previa">
                <p class="rotulo-previa">Vista previa</p>
                <div class="texto" use:vivo={html}>{@html html}</div>
              </div>
            </div>
            <p class="medida" class:pasado={bytes > MAX_CONTENIDO}>{Math.round(bytes / 1000)} de 200 mil caracteres</p>
          {:else}
            <header class="encabezado">
              {#if pagina.icono}<span class="ico-titulo" aria-hidden="true">{pagina.icono}</span>{/if}
              <h1 class="titulo">{pagina.titulo}</h1>
              <svg class="ornamento" viewBox="0 0 240 16" aria-hidden="true">
                <path d="M0 8h96M144 8h96" stroke="currentColor" stroke-width="1"/>
                <path d="M120 1l7 7-7 7-7-7z" fill="none" stroke="currentColor" stroke-width="1.2"/>
                <circle cx="120" cy="8" r="1.8" fill="currentColor"/>
                <circle cx="104" cy="8" r="1.4" fill="currentColor"/><circle cx="136" cy="8" r="1.4" fill="currentColor"/>
              </svg>
            </header>
            {#if pagina.contenido?.trim()}
              <div class="texto" use:vivo={html}>{@html html}</div>
            {:else}
              <p class="vacio">{esDJ ? 'Página en blanco. Toca «Editar» para escribirla.' : 'Esta página está en blanco.'}</p>
            {/if}
          {/if}

          {#if hijas.length && !editando}
            <section class="dentro">
              <h3 class="titulo">Dentro de esta página</h3>
              <div class="tarjetas">
                {#each hijas as h (h.id)}
                  <button class="tarjeta" class:oculta={esDJ && !h.visible} onclick={() => ir(h.id)}>
                    <span class="ico">{h.icono || '📜'}</span>
                    <span>{h.titulo}</span>
                    {#if esDJ && !h.visible}<small>oculta</small>{/if}
                  </button>
                {/each}
              </div>
            </section>
          {/if}

          {#if !editando}<p class="pie">Actualizada el {fecha(pagina.actualizado)}</p>{/if}
        </div>
      {:else if !lore.cargando && filas.length}
        <div class="portada">
          <svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true" class="emblema">
            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" stroke-width="1.2"/>
            <circle cx="60" cy="60" r="40" fill="none" stroke="currentColor" stroke-width="0.8" stroke-dasharray="3 5"/>
            <ellipse cx="60" cy="60" rx="14" ry="24" fill="none" stroke="currentColor" stroke-width="1.4"/>
            <circle cx="60" cy="60" r="4" fill="currentColor"/>
          </svg>
          <p class="titulo">Elige una página del índice</p>
        </div>
      {/if}
    </article>
  </div>
</section>

<style>
  .velo { position: fixed; inset: 0; background: rgba(6, 3, 14, 0.55); z-index: 8; }
  .lore {
    --oro: #d9b56b;
    --oro-claro: #f3dfb0;
    --brote: #8fe3c4;
    --tinta-lore: #ecdfc6;
    position: fixed; z-index: 9; top: 0; bottom: 0; left: 0; width: min(100%, 1120px);
    display: flex; flex-direction: column; overflow: hidden;
    border-radius: 0 var(--radio-panel) var(--radio-panel) 0;
    background:
      radial-gradient(110% 55% at 0% 0%, rgba(80, 190, 160, 0.13), transparent 60%),
      radial-gradient(80% 60% at 100% 100%, rgba(217, 181, 107, 0.11), transparent 65%),
      linear-gradient(180deg, rgba(20, 14, 34, 0.985), rgba(11, 8, 20, 0.99));
    border-right: 1px solid rgba(217, 181, 107, 0.35);
    border-left: 4px solid var(--oro);
    box-shadow: var(--sombra);
    animation: entrar 0.28s ease-out;
    text-shadow: none;
  }
  @keyframes entrar { from { transform: translateX(-28px); opacity: 0; } }

  /* Esporas que flotan hacia arriba, como en lo hondo de una caverna */
  .esporas { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
  .esporas span {
    position: absolute; bottom: -10px; border-radius: 50%;
    background: var(--brote); box-shadow: 0 0 10px 2px rgba(143, 227, 196, 0.55);
    opacity: 0; animation: flotar linear infinite;
  }
  @media (prefers-reduced-motion: reduce) { .esporas { display: none; } }
  .esporas span:nth-child(3n) { background: var(--oro-claro); box-shadow: 0 0 10px 2px rgba(243, 223, 176, 0.5); }
  @keyframes flotar {
    0% { transform: translate(0, 0); opacity: 0; }
    12% { opacity: 0.55; }
    50% { transform: translate(18px, -50vh); }
    85% { opacity: 0.35; }
    100% { transform: translate(-10px, -105vh); opacity: 0; }
  }

  .cabecera { position: relative; flex: none; display: flex; align-items: center; gap: 0.6rem; padding: calc(0.75rem + env(safe-area-inset-top, 0px)) 1rem 0.6rem; border-bottom: 1px solid rgba(217, 181, 107, 0.2); }
  .cabecera h2 { margin: 0; flex: 1; font-size: 1.45rem; color: var(--oro-claro); text-shadow: 0 0 22px rgba(217, 181, 107, 0.35); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sello { color: var(--oro); font-size: 0.9em; }
  .chico { padding: 0.35rem 0.7rem; font-size: 0.82rem; }
  .nueva { border-color: rgba(217, 181, 107, 0.55); background: rgba(217, 181, 107, 0.14); white-space: nowrap; }
  .cerrar { border: 0; background: none; font-size: 1.15rem; padding: 0.25rem 0.5rem; }
  .volver { border: 1px solid var(--linea); background: none; border-radius: 999px; padding: 0.3rem 0.7rem; font-weight: 700; font-size: 0.85rem; white-space: nowrap; }
  .error { position: relative; margin: 0.5rem 1rem 0; padding: 0.45rem 0.75rem; border-radius: 10px; border: 1px solid rgba(217, 74, 92, 0.5); background: rgba(217, 74, 92, 0.15); color: #ffc9d0; text-align: left; font-size: 0.86rem; }
  .error-texto { color: #ffc9d0; }

  .cuerpo { position: relative; flex: 1; min-height: 0; display: grid; grid-template-columns: 290px 1fr; }

  /* ---------- Índice ---------- */
  .indice { min-height: 0; min-width: 0; overflow-y: auto; overflow-x: hidden; border-right: 1px solid rgba(217, 181, 107, 0.16); padding: 0.7rem 0.5rem calc(1.2rem + var(--seguro-abajo)); overscroll-behavior: contain; background: rgba(5, 3, 12, 0.25); }
  .buscar { display: flex; align-items: center; gap: 0.45rem; margin: 0 0.25rem 0.6rem; padding: 0.45rem 0.7rem; border-radius: 999px; border: 1px solid var(--linea); background: rgba(10, 6, 22, 0.55); color: var(--pergamino-suave); }
  .buscar:focus-within { border-color: var(--oro); }
  .buscar input { flex: 1; min-width: 0; border: 0; background: none; outline: none; font-size: 0.9rem; }
  .arbol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 1px; }
  .arbol li { position: relative; min-width: 0; border-radius: 10px; }
  .arbol li.arrastrada { opacity: 0.4; }
  .arbol li.destino-antes::before { content: ''; position: absolute; left: calc(0.6rem + var(--nivel, 0) * 0.95rem); right: 0.3rem; top: -1px; height: 2px; background: var(--brote); border-radius: 2px; box-shadow: 0 0 8px var(--brote); }
  .arbol li.destino-dentro > .fila { outline: 1.5px dashed var(--brote); outline-offset: -1px; }
  .fila { display: flex; align-items: center; gap: 0.15rem; padding-left: calc(var(--nivel, 0) * 0.95rem); border-radius: 10px; transition: background 0.15s; }
  .fila:hover { background: rgba(255, 240, 210, 0.06); }
  .fila.activa { background: linear-gradient(90deg, rgba(217, 181, 107, 0.24), rgba(217, 181, 107, 0.06)); box-shadow: inset 2px 0 0 var(--oro); }
  .fila.oculta .nom { color: rgba(236, 223, 198, 0.55); font-style: italic; }
  .plegar { flex: none; width: 1.5rem; height: 1.9rem; display: grid; place-items: center; border: 0; background: none; padding: 0; color: var(--pergamino-suave); }
  .plegar svg { transition: transform 0.15s; }
  .plegar.abierta svg { transform: rotate(90deg); }
  .vacio-plegar { color: rgba(217, 181, 107, 0.4); }
  .abrir, .resultado { flex: 1; min-width: 0; display: flex; align-items: center; gap: 0.45rem; border: 0; background: none; padding: 0.38rem 0.3rem; text-align: left; font-size: 0.9rem; line-height: 1.25; }
  .resultado { border-radius: 10px; padding: 0.45rem 0.55rem; }
  .resultado.activa { background: rgba(217, 181, 107, 0.2); }
  .ico { flex: none; width: 1.3rem; text-align: center; font-size: 1rem; }
  .nom { min-width: 0; overflow: hidden; text-overflow: ellipsis; display: grid; }
  .abrir .nom { white-space: nowrap; display: block; }
  .nom small { color: var(--pergamino-suave); font-size: 0.72rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nom .en-texto { color: var(--brote); }
  .ojo { flex: none; border: 0; background: none; padding: 0.3rem 0.4rem; color: var(--brote); opacity: 0.85; display: grid; place-items: center; border-radius: 8px; }
  .ojo.cerrado { color: rgba(236, 223, 198, 0.45); }
  .ojo:hover { background: rgba(255, 240, 210, 0.08); opacity: 1; }
  .zona-raiz { margin: 0.6rem 0.3rem 0; padding: 0.7rem; border: 1.5px dashed rgba(143, 227, 196, 0.45); border-radius: 12px; text-align: center; font-size: 0.8rem; color: var(--pergamino-suave); }
  .zona-raiz.activa { background: rgba(143, 227, 196, 0.12); color: var(--pergamino); }
  .vacio { margin: 0.6rem; color: var(--pergamino-suave); font-size: 0.9rem; }
  .vacio.grande { display: grid; gap: 0.7rem; justify-items: start; margin: 1rem 0.6rem; }
  .vacio.grande p { margin: 0; font-family: var(--fuente-titulo); font-size: 1.05rem; color: var(--tinta-lore); }

  /* ---------- Lector ---------- */
  .lector { min-height: 0; overflow-y: auto; padding: 1.2rem 1.4rem calc(2rem + var(--seguro-abajo)); overscroll-behavior: contain; scroll-behavior: smooth; }
  .folio {
    position: relative; max-width: 72ch; margin: 0 auto; padding: 1.4rem 2rem 1.6rem;
    border-radius: 16px;
    background:
      radial-gradient(120% 70% at 50% 0%, rgba(255, 236, 196, 0.06), transparent 70%),
      rgba(255, 240, 210, 0.025);
    box-shadow: inset 0 0 0 1px rgba(217, 181, 107, 0.22), inset 0 0 0 6px rgba(0, 0, 0, 0.12), inset 0 0 0 7px rgba(217, 181, 107, 0.1), 0 30px 60px -30px rgba(0, 0, 0, 0.6);
  }
  .folio.editando { max-width: none; }
  .folio::before, .folio::after {
    content: '❦'; position: absolute; top: 0.55rem; color: rgba(217, 181, 107, 0.45); font-size: 0.95rem; line-height: 1;
  }
  .folio::before { left: 0.75rem; }
  .folio::after { right: 0.75rem; transform: scaleX(-1); }

  .migas { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem; margin: 0 0 0.7rem; font-size: 0.8rem; color: var(--pergamino-suave); }
  .migas button { border: 0; background: none; padding: 0.1rem 0.25rem; border-radius: 6px; color: var(--pergamino-suave); max-width: 16rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .migas button:hover { color: var(--oro-claro); background: rgba(217, 181, 107, 0.1); }

  .herramientas-dj { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; padding: 0.5rem 0.6rem; margin-bottom: 0.7rem; border-radius: 12px; background: rgba(8, 5, 18, 0.5); border: 1px solid rgba(217, 181, 107, 0.18); }
  .separa { flex: 1; }
  .interruptor { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
  .interruptor input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .riel { width: 2.4rem; height: 1.35rem; border-radius: 999px; background: rgba(236, 223, 198, 0.15); border: 1px solid var(--linea); position: relative; transition: background 0.2s; }
  .riel span { position: absolute; top: 2px; left: 2px; width: calc(1.35rem - 6px); height: calc(1.35rem - 6px); border-radius: 50%; background: var(--pergamino-suave); transition: transform 0.2s, background 0.2s; }
  .interruptor input:checked + .riel { background: rgba(143, 227, 196, 0.35); border-color: var(--brote); }
  .interruptor input:checked + .riel span { transform: translateX(1.05rem); background: var(--brote); box-shadow: 0 0 10px var(--brote); }
  .interruptor input:focus-visible + .riel { outline: 2px solid var(--esperanza); outline-offset: 2px; }
  .estado { font-size: 0.78rem; font-weight: 700; color: var(--brote); }
  .estado.pendiente { color: var(--pergamino-suave); }
  .estado.error { color: #ffb3bd; }
  .listo { border-color: var(--brote); background: rgba(143, 227, 196, 0.16); }
  .borrar.confirmando { background: var(--sangre); border-color: #ffb3bd; color: white; }
  .mover { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; margin: -0.3rem 0 0.8rem; padding: 0.55rem 0.6rem; border-radius: 12px; border: 1px dashed rgba(143, 227, 196, 0.35); }
  .mover .campo { flex: 1 1 14rem; width: auto; padding: 0.35rem 0.6rem; font-size: 0.85rem; }
  .ayuda { flex-basis: 100%; margin: 0.15rem 0 0; font-size: 0.75rem; color: var(--pergamino-suave); }
  .sello-oculta {
    display: inline-flex; align-items: center; gap: 0.4rem; margin: 0 0 0.6rem; padding: 0.3rem 0.75rem 0.3rem 0.6rem;
    border-radius: 999px; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.02em;
    color: #ffd7a8; background: rgba(160, 70, 30, 0.28); border: 1px solid rgba(255, 170, 100, 0.45);
  }
  .sello-oculta span { font-weight: 600; color: var(--pergamino-suave); }

  .encabezado { text-align: center; margin: 0.4rem 0 1.2rem; }
  .ico-titulo { display: block; font-size: 2.6rem; line-height: 1; margin-bottom: 0.35rem; filter: drop-shadow(0 4px 14px rgba(217, 181, 107, 0.35)); }
  .encabezado h1 { margin: 0; font-size: clamp(1.6rem, 3.2vw, 2.3rem); line-height: 1.15; color: var(--oro-claro); text-shadow: 0 0 28px rgba(217, 181, 107, 0.35), 0 2px 0 rgba(0, 0, 0, 0.4); text-wrap: balance; }
  .ornamento { display: block; width: min(240px, 70%); height: 16px; margin: 0.7rem auto 0; color: var(--oro); opacity: 0.8; }

  /* El texto del códice */
  .texto { font-family: var(--fuente-titulo); font-weight: 500; font-size: 1.06rem; line-height: 1.75; color: var(--tinta-lore); overflow-wrap: anywhere; }
  .texto :global(p) { margin: 0 0 0.9em; }
  .texto > :global(p:first-child::first-letter) {
    float: left; font-size: 3.3em; line-height: 0.9; font-weight: 900; margin: 0.06em 0.12em 0 0; padding: 0.05em 0.12em;
    color: var(--oro-claro); border: 1px solid rgba(217, 181, 107, 0.45); border-radius: 4px;
    background: linear-gradient(160deg, rgba(217, 181, 107, 0.22), rgba(80, 190, 160, 0.1));
    text-shadow: 0 0 16px rgba(217, 181, 107, 0.45);
  }
  .texto :global(h2), .texto :global(h3), .texto :global(h4), .texto :global(h5), .texto :global(h6) { font-family: var(--fuente-titulo); font-weight: 900; color: var(--oro-claro); line-height: 1.25; margin: 1.5em 0 0.55em; }
  .texto :global(h2) { font-size: 1.45rem; display: flex; align-items: center; gap: 0.6rem; }
  .texto :global(h2::after) { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(217, 181, 107, 0.55), transparent); }
  .texto :global(h3) { font-size: 1.2rem; }
  .texto :global(h4) { font-size: 1.05rem; color: var(--brote); }
  .texto :global(strong) { color: #fff3da; font-weight: 900; }
  .texto :global(em) { color: #f0e2c6; }
  .texto :global(a) { color: var(--brote); text-decoration: underline; text-decoration-color: rgba(143, 227, 196, 0.45); text-underline-offset: 3px; }
  .texto :global(a:hover) { text-decoration-color: var(--brote); }
  .texto :global(ul), .texto :global(ol) { margin: 0 0 1em; padding-left: 1.4em; }
  .texto :global(li) { margin: 0.2em 0; }
  .texto :global(ul li::marker) { color: var(--oro); content: '◆  '; font-size: 0.7em; }
  .texto :global(ol li::marker) { color: var(--oro); font-weight: 900; }
  .texto :global(li.casilla) { list-style: none; margin-left: -1.2em; }
  .texto :global(li.casilla::marker) { content: ''; }
  .texto :global(:is(ul, ol, blockquote, h2, h3, h4, h5, h6, img, pre, hr, .tabla)) { clear: left; }
  .texto :global(li.casilla::before) { content: '☐'; color: var(--oro); margin-right: 0.45em; }
  .texto :global(li.casilla.hecha::before) { content: '☑'; color: var(--brote); }
  .texto :global(li.casilla.hecha) { color: var(--pergamino-suave); text-decoration: line-through; text-decoration-color: rgba(236, 223, 198, 0.4); }
  .texto :global(blockquote) {
    margin: 1.1em 0; padding: 0.7em 1.1em; border-left: 2px solid var(--oro); border-radius: 0 10px 10px 0;
    background: linear-gradient(90deg, rgba(217, 181, 107, 0.12), rgba(217, 181, 107, 0.02)); font-style: italic; color: #f4e7cc;
  }
  .texto :global(blockquote p:last-child) { margin-bottom: 0; }
  .texto :global(hr) { border: 0; height: 1.4em; margin: 1.4em 0; text-align: center; overflow: visible; }
  .texto :global(hr::after) { content: '✦  ❖  ✦'; color: var(--oro); letter-spacing: 0.3em; font-size: 0.9rem; }
  .texto :global(img) {
    display: block; max-width: 100%; height: auto; margin: 1.1em auto; border-radius: 8px;
    border: 1px solid rgba(217, 181, 107, 0.45); box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.25), 0 18px 40px -16px rgba(0, 0, 0, 0.8);
  }
  .texto :global(img.cargando), .texto :global(img:not([src])) { min-height: 8rem; width: 100%; background: linear-gradient(90deg, rgba(255, 240, 210, 0.04), rgba(255, 240, 210, 0.1), rgba(255, 240, 210, 0.04)); }
  .texto :global(img.rota) { min-height: 3rem; border-style: dashed; }
  .texto :global(code) { font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace; font-size: 0.85em; padding: 0.1em 0.35em; border-radius: 5px; background: rgba(0, 0, 0, 0.35); }
  .texto :global(pre) { overflow-x: auto; padding: 0.8em 1em; border-radius: 10px; background: rgba(0, 0, 0, 0.4); border: 1px solid var(--linea); }
  .texto :global(pre code) { padding: 0; background: none; }
  .texto :global(.tabla) { overflow-x: auto; margin: 0 0 1em; }
  .texto :global(table) { border-collapse: collapse; width: 100%; font-size: 0.92em; font-family: var(--fuente); }
  .texto :global(th), .texto :global(td) { padding: 0.45em 0.7em; border-bottom: 1px solid rgba(217, 181, 107, 0.2); text-align: left; }
  .texto :global(th) { color: var(--oro-claro); font-family: var(--fuente-titulo); border-bottom-color: rgba(217, 181, 107, 0.5); }
  .texto :global(del) { opacity: 0.6; }

  .dentro { margin-top: 1.8rem; padding-top: 1rem; border-top: 1px solid rgba(217, 181, 107, 0.18); }
  .dentro h3 { margin: 0 0 0.6rem; font-size: 1rem; color: var(--pergamino-suave); text-shadow: none; }
  .tarjetas { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 0.45rem; }
  .tarjeta { display: flex; align-items: center; gap: 0.5rem; text-align: left; padding: 0.6rem 0.75rem; border-radius: 12px; border: 1px solid rgba(217, 181, 107, 0.25); background: rgba(217, 181, 107, 0.06); font-family: var(--fuente-titulo); font-weight: 700; font-size: 0.95rem; transition: background 0.15s, transform 0.15s; }
  .tarjeta:hover { background: rgba(217, 181, 107, 0.14); transform: translateY(-1px); }
  .tarjeta.oculta { border-style: dashed; color: rgba(236, 223, 198, 0.65); }
  .tarjeta small { margin-left: auto; font-family: var(--fuente); font-size: 0.7rem; color: #ffd7a8; }
  .pie { margin: 1.4rem 0 0; text-align: center; font-size: 0.75rem; color: rgba(236, 223, 198, 0.5); }

  .portada { height: 100%; min-height: 50vh; display: grid; place-content: center; justify-items: center; gap: 0.8rem; color: rgba(217, 181, 107, 0.55); }
  .portada p { margin: 0; color: var(--pergamino-suave); font-size: 1.1rem; text-shadow: none; }
  .emblema { animation: girar 60s linear infinite; }
  @keyframes girar { to { transform: rotate(360deg); } }

  /* ---------- Editor ---------- */
  .cabeza-editor { display: flex; gap: 0.6rem; align-items: center; margin-bottom: 0.6rem; }
  .icono-editor { position: relative; }
  .ico-grande { width: 3rem; height: 3rem; font-size: 1.7rem; border-radius: 12px; border: 1px dashed rgba(217, 181, 107, 0.5); background: rgba(217, 181, 107, 0.08); display: grid; place-items: center; padding: 0; }
  .paleta { position: absolute; z-index: 3; top: calc(100% + 0.35rem); left: 0; width: 15.5rem; display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.2rem; padding: 0.5rem; border-radius: 14px; background: rgb(24, 17, 40); border: 1px solid rgba(217, 181, 107, 0.4); box-shadow: var(--sombra); }
  .paleta button { border: 0; background: none; font-size: 1.3rem; padding: 0.25rem; border-radius: 8px; }
  .paleta button:hover { background: rgba(255, 240, 210, 0.1); }
  .paleta .campo { grid-column: 1 / -1; padding: 0.35rem 0.55rem; font-size: 0.9rem; }
  .paleta .quitar { grid-column: 1 / -1; font-size: 0.8rem; color: var(--pergamino-suave); }
  .editor-titulo { flex: 1; min-width: 0; font-size: 1.6rem; color: var(--oro-claro); background: transparent; border: 0; border-bottom: 1px solid rgba(217, 181, 107, 0.35); padding: 0.2rem 0.1rem; outline: none; text-shadow: none; }
  .editor-titulo:focus { border-bottom-color: var(--oro); }
  .barra-md { display: flex; flex-wrap: wrap; gap: 0.2rem; align-items: center; padding: 0.3rem; border-radius: 12px 12px 0 0; background: rgba(8, 5, 18, 0.6); border: 1px solid var(--linea); border-bottom: 0; }
  .barra-md button { border: 0; background: none; border-radius: 8px; padding: 0.3rem 0.55rem; font-size: 0.82rem; font-weight: 700; min-width: 2rem; }
  .barra-md button:hover { background: rgba(255, 240, 210, 0.1); }
  .barra-md button:disabled { opacity: 0.5; }
  .barra-md .sep { width: 1px; height: 1.2rem; background: var(--linea); margin: 0 0.2rem; }
  .pestanas-editor { display: none; }
  .editor { display: grid; grid-template-columns: 1fr 1fr; min-height: 55vh; border: 1px solid var(--linea); border-radius: 0 0 12px 12px; overflow: hidden; }
  .fuente-md { resize: none; border: 0; outline: none; padding: 0.9rem 1rem; min-height: 55vh; background: rgba(5, 3, 12, 0.55); font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace; font-size: 0.88rem; line-height: 1.65; color: var(--pergamino); border-right: 1px solid var(--linea); }
  .fuente-md:focus { background: rgba(5, 3, 12, 0.7); }
  .previa { padding: 0.6rem 1rem 1rem; overflow-y: auto; max-height: 70vh; }
  .rotulo-previa { margin: 0 0 0.5rem; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(217, 181, 107, 0.7); }
  .medida { margin: 0.35rem 0 0; text-align: right; font-size: 0.72rem; color: rgba(236, 223, 198, 0.5); }
  .medida.pasado { color: #ffb3bd; font-weight: 800; }

  .solo-angosto { display: none; }

  @media (min-width: 1100px) { .velo { background: rgba(6, 3, 14, 0.35); } }
  @media (max-width: 1099px) {
    .editor { grid-template-columns: 1fr; }
    .pestanas-editor { display: flex; gap: 0.2rem; margin: 0 0 0; padding: 0.3rem; background: rgba(8, 5, 18, 0.6); border: 1px solid var(--linea); border-bottom: 0; }
    .pestanas-editor button { flex: 1; border: 0; background: none; border-radius: 8px; padding: 0.35rem; font-weight: 700; font-size: 0.85rem; color: var(--pergamino-suave); }
    .pestanas-editor button.activa { background: rgba(217, 181, 107, 0.2); color: var(--pergamino); }
    .editor .previa { display: none; max-height: none; }
    .editor.ver .previa { display: block; }
    .editor.ver .fuente-md { display: none; }
    .fuente-md { border-right: 0; }
  }
  @media (max-width: 759px) {
    .lore { width: 100%; border-radius: 0; border-left: 0; border-right: 0; border-top: 3px solid var(--oro); }
    .cuerpo { grid-template-columns: 1fr; }
    .indice { border-right: 0; padding: 0.7rem 0.6rem calc(1.2rem + var(--seguro-abajo)); }
    .lector { display: none; padding: 0.7rem 0.6rem calc(1.6rem + var(--seguro-abajo)); }
    .en-pagina .indice { display: none; }
    .en-pagina .lector { display: block; }
    .solo-angosto { display: inline-flex; }
    .largo-lore { display: none; }
    .en-pagina .cabecera h2 { font-size: 1.1rem; }
    .en-pagina .nueva { display: none; }
    .folio { padding: 1.1rem 1rem 1.3rem; }
    .fila { min-height: 2.6rem; }
    .abrir { font-size: 0.98rem; }
    .texto { font-size: 1.02rem; }
    .herramientas-dj .separa { display: none; }
    .interruptor { flex-basis: 100%; }
  }
</style>

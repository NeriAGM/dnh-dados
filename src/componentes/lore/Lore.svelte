<script>
  import { onMount, onDestroy, tick } from 'svelte'
  import { app } from '../../lib/mesa.svelte.js'
  import {
    lore, abrirLore, esDJLore, hijasDe, descendencia, ruta, ocultaPor, ordenar,
    crearPagina, guardarPagina, moverPagina, borrarPagina, subirImagen, urlImagen, MAX_CONTENIDO,
  } from '../../lib/lore.svelte.js'
  import { mdLore } from '../../lib/md.js'
  import Icono from '../Icono.svelte'

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
  let enVuelo = null // el guardado que va en camino (solo uno a la vez)

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
    // Si no se pudo guardar, se queda en la página que editas: si no, el
    // borrador de esta se vería (y guardaría) encima de la otra
    if (editando) return false
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
    return true
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
    // Si el borrador anterior no se guardó, no se tira: se queda ahí
    if (!(await ir(p.id))) return
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

  // Un guardado a la vez: con la red lenta, dos guardados al mismo tiempo
  // podían llegar en desorden y dejar en la base de datos el texto VIEJO
  // (se perdían las últimas teclas aunque decía «Guardado»).
  async function guardarYa() {
    clearTimeout(tGuardar)
    while (enVuelo) await enVuelo
    if (estado !== 'pendiente' || !editandoId) return
    const v = version
    const id = editandoId
    const c = {
      titulo: borrador.titulo.trim().slice(0, 200) || 'Página sin título',
      icono: borrador.icono.trim() ? [...borrador.icono.trim()].slice(0, 4).join('') : null,
      contenido: borrador.contenido,
    }
    estado = 'guardando'
    const vuelo = (async () => {
      try {
        await guardarPagina(id, c)
        if (version === v) estado = 'guardado'
        else estado = 'pendiente'
      } catch (e) {
        estado = 'error'
        error = e.message
      }
    })()
    enVuelo = vuelo
    try { await vuelo } finally { if (enVuelo === vuelo) enVuelo = null }
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
</script>

<svelte:window onkeydown={tecla} />

<div class="velo" onclick={cerrar} role="presentation"></div>
<section class="lore" class:en-pagina={vista === 'pagina'} aria-label="Lore de la campaña">
  <header class="cabecera">
    {#if vista === 'pagina'}
      <button class="volver solo-angosto" onclick={async () => { if (editando) await terminarEdicion(); vista = 'indice' }} aria-label="Volver al índice"><Icono nombre="izquierda" tam={16} /> Índice</button>
    {/if}
    <h2 class="titulo">Códice del Abismo</h2>
    {#if esDJ}
      <button class="boton nueva" onclick={() => nueva(null)} aria-label="Nueva página"><Icono nombre="mas" tam={16} /> Nueva<span class="largo-lore">página</span></button>
    {/if}
    <button class="icono" onclick={cerrar} aria-label="Cerrar el lore"><Icono nombre="cerrar" /></button>
  </header>

  {#if error}<div role="alert"><button class="error" onclick={() => (error = '')} title="Cerrar aviso">{error}</button></div>{/if}

  <div class="cuerpo">
    <!-- ================= Índice ================= -->
    <aside class="indice" aria-label="Índice del lore">
      <label class="buscar">
        <Icono nombre="buscar" tam={16} />
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
            <button class="boton solido" onclick={() => nueva(null)}>Escribir la primera página</button>
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
                    <Icono nombre="derecha" tam={14} />
                  </button>
                {:else}
                  <span class="plegar" aria-hidden="true"></span>
                {/if}
                <button class="abrir" onclick={() => ir(p.id)}>
                  <span class="ico">{p.icono || '📜'}</span>
                  <span class="nom">{p.titulo}</span>
                </button>
                {#if esDJ}
                  <button class="ojo" class:cerrado={!p.visible} onclick={() => alternarVisible(p)} aria-label={p.visible ? `Ocultar «${p.titulo}» a la mesa` : `Mostrar «${p.titulo}» a la mesa`} title={p.visible ? 'Visible para la mesa' : 'Oculta para la mesa'}>
                    {#if p.visible}
                      <Icono nombre="ojo" tam={18} />
                    {:else}
                      <Icono nombre="ojo-no" tam={18} />
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
              {#each madres as m (m.id)}<button onclick={() => ir(m.id)}>{m.icono || '📜'} {m.titulo}</button><Icono nombre="derecha" tam={12} />{/each}
            </nav>
          {/if}

          {#if esDJ}
            <div class="herramientas-dj">
              <span class="interruptor" title="Los jugadores solo ven las páginas visibles (y sus madres también deben serlo)">
                <button class="interruptor-si" role="switch" aria-checked={pagina.visible} aria-label="Visible para la mesa" onclick={() => alternarVisible(pagina)}></button>
                Visible para la mesa
              </span>
              <span class="separa"></span>
              {#if editando}
                <span class="estado" class:error={estado === 'error'} class:pendiente={estado !== 'guardado'} aria-live="polite">{TEXTO_ESTADO[estado]}</span>
                <button class="boton solido" onclick={terminarEdicion}>Listo</button>
              {:else}
                <button class="boton" onclick={empezarEdicion}>Editar</button>
              {/if}
              <button class="boton" onclick={() => nueva(pagina.id)}>+ Subpágina</button>
              <button class="boton" aria-pressed={verMover} onclick={() => (verMover = !verMover)}>Mover</button>
              <button class="boton peligro" class:confirmando={confirmar === pagina.id} onclick={() => pedirBorrar(pagina)}>
                {confirmar === pagina.id ? (cuantasDentro(pagina.id) ? `¿Borrar con ${cuantasDentro(pagina.id)} subpágina${cuantasDentro(pagina.id) === 1 ? '' : 's'}? Toca otra vez` : '¿Seguro? Toca otra vez') : 'Borrar'}
              </button>
            </div>

            {#if verMover}
              {@const h = hermanasDe(pagina)}
              {@const i = h.findIndex((x) => x.id === pagina.id)}
              <div class="mover">
                <button class="boton" disabled={i <= 0} onclick={() => subir(pagina)}><Icono nombre="arriba" tam={16} /> Subir</button>
                <button class="boton" disabled={i >= h.length - 1} onclick={() => bajar(pagina)}><Icono nombre="abajo" tam={16} /> Bajar</button>
                <button class="boton" disabled={i <= 0} onclick={() => meter(pagina)} title="Dentro de la página de arriba"><Icono nombre="derecha" tam={16} /> Dentro de la anterior</button>
                <button class="boton" disabled={!pagina.padre_id} onclick={() => sacar(pagina)}><Icono nombre="izquierda" tam={16} /> Un nivel afuera</button>
                <select class="campo" value={pagina.padre_id ?? ''} onchange={(e) => moverDentro(e.currentTarget.value)} aria-label="Mover dentro de otra página">
                  <option value="">Raíz del códice</option>
                  {#each opcionesMover as o (o.p.id)}<option value={o.p.id}>{'  '.repeat(o.nivel)}{o.p.icono || '📜'} {o.p.titulo}</option>{/each}
                </select>
                <p class="ayuda">En computadora también puedes arrastrar páginas en el índice: arriba de otra para ponerla antes, en medio para meterla dentro.</p>
              </div>
            {/if}

            {#if escondida}
              <p class="sello-oculta">
                <Icono nombre="ojo-no" tam={16} />
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
              <button onclick={() => prefijo('- ')} title="Lista">Lista</button>
              <button onclick={() => prefijo('1. ')} title="Lista numerada">1. Lista</button>
              <button onclick={() => prefijo('> ')} title="Cita">Cita</button>
              <button onclick={() => insertar('---')} title="Separador">Línea</button>
              <button onclick={enlace} title="Enlace">Enlace</button>
              <button onclick={() => archivoInput?.click()} disabled={subiendo} title="Subir imagen (también puedes pegarla o soltarla en el texto)">{subiendo ? 'Subiendo…' : 'Imagen'}</button>
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
          <span class="emblema" aria-hidden="true"><Icono nombre="lore" tam={56} /></span>
          <p class="titulo">Elige una página del índice</p>
        </div>
      {/if}
    </article>
  </div>
</section>

<style>
  .velo { position: fixed; inset: 0; background: var(--velo); z-index: 8; animation: aparecer-velo 0.25s ease-out; }
  .lore {
    position: fixed; z-index: 9; top: 12px; bottom: 12px; left: 12px; width: min(calc(100% - 24px), 1120px);
    display: flex; flex-direction: column; overflow: hidden;
    border-radius: var(--radio-panel);
    background: var(--superficie-firme);
    backdrop-filter: blur(var(--vidrio-desenfoque)) saturate(1.5);
    -webkit-backdrop-filter: blur(var(--vidrio-desenfoque)) saturate(1.5);
    border: 1px solid var(--brillo);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.35), var(--sombra-alta);
    color: var(--texto);
    animation: entrar 0.28s var(--suave);
  }
  @keyframes entrar { from { transform: translateX(-24px); opacity: 0; } }

  .cabecera { position: relative; flex: none; display: flex; align-items: center; gap: 0.6rem; padding: 0.9rem 1rem 0.75rem 1.25rem; border-bottom: 1px solid var(--filete); }
  .cabecera h2 { margin: 0; flex: 1; font-size: 1.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nueva { white-space: nowrap; }
  .volver { display: inline-flex; align-items: center; gap: 0.2rem; border: 1px solid var(--filete); background: var(--hundido); border-radius: 999px; min-height: 2.5rem; padding: 0.3rem 0.8rem 0.3rem 0.5rem; font-weight: 700; font-size: 0.9rem; white-space: nowrap; }
  .error { margin: 0.5rem 1rem 0; padding: 0.5rem 0.8rem; border-radius: 10px; border: 1px solid color-mix(in srgb, var(--peligro) 40%, transparent); background: var(--peligro-suave); color: var(--peligro-hondo); text-align: left; font-size: 0.88rem; font-weight: 700; width: calc(100% - 2rem); }
  .error-texto { color: var(--peligro-hondo); }

  .cuerpo { position: relative; flex: 1; min-height: 0; display: grid; grid-template-columns: 300px 1fr; }

  /* ---------- Índice ---------- */
  .indice { min-height: 0; min-width: 0; overflow-y: auto; overflow-x: hidden; border-right: 1px solid var(--filete); padding: 0.75rem 0.5rem calc(1.2rem + var(--seguro-abajo)); overscroll-behavior: contain; background: var(--hundido); }
  .buscar { display: flex; align-items: center; gap: 0.5rem; margin: 0 0.25rem 0.6rem; padding: 0 0.8rem; min-height: 2.5rem; border-radius: 999px; border: 1px solid var(--filete); background: rgb(255 255 255 / 0.62); color: var(--texto-suave); }
  .buscar:focus-within { border-color: var(--esperanza-hondo); box-shadow: 0 0 0 3px var(--esperanza-suave); }
  .buscar input { flex: 1; min-width: 0; border: 0; background: none; outline: none !important; font-size: 0.92rem; color: var(--texto); }
  .buscar input::placeholder { color: rgb(71 79 110 / 0.75); }
  .arbol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 1px; }
  .arbol li { position: relative; min-width: 0; border-radius: 10px; }
  .arbol li.arrastrada { opacity: 0.4; }
  .arbol li.destino-antes::before { content: ''; position: absolute; left: calc(0.6rem + var(--nivel, 0) * 0.95rem); right: 0.3rem; top: -1px; height: 2px; background: var(--esperanza-hondo); border-radius: 2px; }
  .arbol li.destino-dentro > .fila { outline: 1.5px dashed var(--esperanza-hondo); outline-offset: -1px; }
  .fila { display: flex; align-items: center; gap: 0.15rem; padding-left: calc(var(--nivel, 0) * 0.95rem); border-radius: 10px; transition: background 0.15s; }
  .fila:hover { background: var(--hundido-2); }
  .fila.activa { background: var(--esperanza-suave); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--esperanza-hondo) 35%, transparent); }
  .fila.activa .nom { color: var(--esperanza-hondo); font-weight: 900; }
  .fila.oculta .nom { color: var(--texto-suave); font-style: italic; }
  .plegar { flex: none; width: 1.6rem; height: 2.2rem; display: grid; place-items: center; border: 0; background: none; padding: 0; color: var(--texto-suave); }
  .plegar :global(svg) { transition: transform 0.15s; }
  .plegar.abierta :global(svg) { transform: rotate(90deg); }
  .abrir, .resultado { flex: 1; min-width: 0; display: flex; align-items: center; gap: 0.45rem; border: 0; background: none; padding: 0.4rem 0.3rem; text-align: left; font-size: 0.92rem; font-weight: 700; line-height: 1.25; }
  .resultado { border-radius: 10px; padding: 0.5rem 0.55rem; width: 100%; }
  .resultado:hover { background: var(--hundido-2); }
  .resultado.activa { background: var(--esperanza-suave); }
  .ico { flex: none; width: 1.3rem; text-align: center; font-size: 1rem; }
  .nom { min-width: 0; overflow: hidden; text-overflow: ellipsis; display: grid; }
  .abrir .nom { white-space: nowrap; display: block; }
  .nom small { color: var(--texto-suave); font-size: 0.75rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nom .en-texto { color: var(--esperanza-hondo); }
  .ojo { flex: none; border: 0; background: none; width: 2.2rem; height: 2.2rem; color: var(--esperanza-hondo); display: grid; place-items: center; border-radius: 8px; }
  .ojo.cerrado { color: var(--texto-suave); }
  .ojo:hover { background: var(--hundido-2); }
  .zona-raiz { margin: 0.6rem 0.3rem 0; padding: 0.7rem; border: 1.5px dashed var(--filete-fuerte); border-radius: 12px; text-align: center; font-size: 0.82rem; color: var(--texto-suave); }
  .zona-raiz.activa { background: var(--esperanza-suave); color: var(--texto); border-color: var(--esperanza-hondo); }
  .vacio { margin: 0.6rem; color: var(--texto-suave); font-size: 0.92rem; }
  .vacio.grande { display: grid; gap: 0.7rem; justify-items: start; margin: 1rem 0.6rem; }
  .vacio.grande p { margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--texto); }

  /* ---------- Lector ---------- */
  .lector { min-height: 0; overflow-y: auto; padding: 1.5rem 1.6rem calc(2.5rem + var(--seguro-abajo)); overscroll-behavior: contain; scroll-behavior: smooth; }
  .folio { position: relative; max-width: 72ch; margin: 0 auto; }
  .folio.editando { max-width: none; }

  .migas { display: flex; flex-wrap: wrap; align-items: center; gap: 0.15rem; margin: 0 0 0.8rem; font-size: 0.85rem; color: var(--texto-suave); }
  .migas button { display: inline-flex; align-items: center; gap: 0.25rem; border: 0; background: none; padding: 0.2rem 0.35rem; border-radius: 6px; color: var(--texto-suave); font-weight: 700; max-width: 16rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .migas button:hover { color: var(--texto); background: var(--hundido); }

  .herramientas-dj { display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem; padding: 0.55rem 0.7rem; margin-bottom: 0.9rem; border-radius: 14px; background: var(--hundido); border: 1px solid var(--filete); }
  .separa { flex: 1; }
  .interruptor { display: inline-flex; align-items: center; gap: 0.6rem; font-size: 0.9rem; font-weight: 700; }
  .estado { font-size: 0.8rem; font-weight: 700; color: var(--exito-hondo); }
  .estado.pendiente { color: var(--texto-suave); }
  .estado.error { color: var(--peligro-hondo); }
  .boton.peligro.confirmando { background: var(--peligro); border-color: var(--peligro); color: var(--sobre-color); }
  .mover { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin: -0.3rem 0 0.9rem; padding: 0.6rem 0.7rem; border-radius: 14px; border: 1px dashed var(--filete-fuerte); }
  .mover .campo { flex: 1 1 14rem; width: auto; }
  .ayuda { flex-basis: 100%; margin: 0.15rem 0 0; font-size: 0.8rem; color: var(--texto-suave); }
  .sello-oculta { display: inline-flex; align-items: center; gap: 0.4rem; margin: 0 0 0.7rem; padding: 0.3rem 0.8rem 0.3rem 0.65rem; border-radius: 999px; font-size: 0.82rem; font-weight: 800; color: var(--critico-hondo); background: var(--critico-suave); border: 1px solid color-mix(in srgb, var(--critico-hondo) 30%, transparent); }
  .sello-oculta span { font-weight: 500; }

  .encabezado { margin: 0.2rem 0 1.4rem; padding-bottom: 1rem; border-bottom: 1px solid var(--filete); }
  .ico-titulo { display: block; font-size: 2.4rem; line-height: 1; margin-bottom: 0.5rem; }
  .encabezado h1 { margin: 0; font-size: clamp(1.7rem, 3.2vw, 2.4rem); font-weight: 900; line-height: 1.15; }

  /* El texto del códice: medida de lectura de ~70 caracteres */
  .texto { font-size: 1.075rem; font-weight: 500; line-height: 1.6; color: var(--texto); overflow-wrap: anywhere; }
  .texto :global(p) { margin: 0 0 1em; }
  .texto :global(h2), .texto :global(h3), .texto :global(h4), .texto :global(h5), .texto :global(h6) { font-weight: 900; color: var(--texto); line-height: 1.25; margin: 1.7em 0 0.55em; }
  .texto :global(h2) { font-size: 1.5rem; }
  .texto :global(h3) { font-size: 1.2rem; }
  .texto :global(h4) { font-size: 1.05rem; color: var(--texto-suave); }
  .texto :global(strong) { font-weight: 900; }
  .texto :global(a) { color: var(--esperanza-hondo); font-weight: 700; text-decoration: underline; text-decoration-color: color-mix(in srgb, var(--esperanza-hondo) 40%, transparent); text-underline-offset: 3px; }
  .texto :global(a:hover) { text-decoration-color: var(--esperanza-hondo); }
  .texto :global(ul), .texto :global(ol) { margin: 0 0 1em; padding-left: 1.5em; }
  .texto :global(li) { margin: 0.3em 0; padding-left: 0.2em; }
  .texto :global(ul li::marker) { color: var(--texto-suave); }
  .texto :global(ol li::marker) { color: var(--texto-suave); font-weight: 900; }
  .texto :global(li.casilla) { list-style: none; margin-left: -1.2em; }
  .texto :global(:is(ul, ol, blockquote, h2, h3, h4, h5, h6, img, pre, hr, .tabla)) { clear: left; }
  .texto :global(li.casilla::before) { content: '○'; color: var(--texto-suave); margin-right: 0.45em; }
  .texto :global(li.casilla.hecha::before) { content: '●'; color: var(--exito-hondo); }
  .texto :global(li.casilla.hecha) { color: var(--texto-suave); text-decoration: line-through; }
  .texto :global(blockquote) { margin: 1.2em 0; padding: 0.1em 0 0.1em 1.1em; border-left: 1px solid var(--texto-suave); color: var(--texto-suave); font-style: italic; }
  .texto :global(blockquote p:last-child) { margin-bottom: 0; }
  .texto :global(hr) { border: 0; height: 1px; margin: 1.8em 0; background: var(--filete-fuerte); }
  .texto :global(img) { display: block; max-width: 100%; height: auto; margin: 1.2em auto; border-radius: 12px; border: 1px solid var(--filete); background: #fff; box-shadow: var(--sombra); }
  .texto :global(img.cargando), .texto :global(img:not([src])) { min-height: 8rem; width: 100%; background: var(--hundido); }
  .texto :global(img.rota) { min-height: 3rem; border-style: dashed; }
  .texto :global(code) { font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace; font-size: 0.85em; padding: 0.1em 0.4em; border-radius: 6px; background: var(--hundido-2); }
  .texto :global(pre) { overflow-x: auto; padding: 0.8em 1em; border-radius: 12px; background: var(--hundido); border: 1px solid var(--filete); }
  .texto :global(pre code) { padding: 0; background: none; }
  .texto :global(.tabla) { overflow-x: auto; margin: 0 0 1em; }
  .texto :global(table) { border-collapse: collapse; width: 100%; font-size: 0.92em; }
  .texto :global(th), .texto :global(td) { padding: 0.5em 0.75em; border-bottom: 1px solid var(--filete); text-align: left; }
  .texto :global(th) { font-weight: 900; border-bottom-color: var(--filete-fuerte); }
  .texto :global(del) { opacity: 0.6; }

  .dentro { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--filete); }
  .dentro h3 { margin: 0 0 0.7rem; font-size: 1.1rem; }
  .tarjetas { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem; }
  .tarjeta { display: flex; align-items: center; gap: 0.5rem; min-height: 2.75rem; text-align: left; padding: 0.55rem 0.8rem; border-radius: var(--radio-control); border: 1px solid var(--filete); background: var(--hundido); font-weight: 700; font-size: 0.95rem; transition: background 0.15s; }
  .tarjeta:hover { background: var(--hundido-2); }
  .tarjeta.oculta { border-style: dashed; color: var(--texto-suave); }
  .tarjeta small { margin-left: auto; font-size: 0.75rem; color: var(--critico-hondo); }
  .pie { margin: 1.6rem 0 0; font-size: 0.8rem; color: var(--texto-suave); }

  .portada { height: 100%; min-height: 50vh; display: grid; place-content: center; justify-items: center; gap: 0.8rem; color: var(--texto-suave); }
  .portada p { margin: 0; font-size: 1.1rem; font-weight: 700; }

  /* ---------- Editor ---------- */
  .cabeza-editor { display: flex; gap: 0.7rem; align-items: center; margin-bottom: 0.7rem; }
  .icono-editor { position: relative; }
  .ico-grande { width: 3rem; height: 3rem; font-size: 1.7rem; border-radius: var(--radio-control); border: 1px dashed var(--filete-fuerte); background: var(--hundido); display: grid; place-items: center; padding: 0; }
  .paleta { position: absolute; z-index: 3; top: calc(100% + 0.35rem); left: 0; width: 15.5rem; display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.2rem; padding: 0.5rem; border-radius: 14px; background: var(--superficie-firme); backdrop-filter: blur(20px); border: 1px solid var(--brillo); box-shadow: var(--sombra-alta); }
  .paleta button { border: 0; background: none; font-size: 1.3rem; padding: 0.25rem; border-radius: 8px; }
  .paleta button:hover { background: var(--hundido-2); }
  .paleta .campo { grid-column: 1 / -1; }
  .paleta .quitar { grid-column: 1 / -1; font-size: 0.85rem; font-weight: 700; color: var(--texto-suave); }
  .editor-titulo { flex: 1; min-width: 0; font-weight: 900; font-size: 1.6rem; color: var(--texto); background: transparent; border: 0; border-bottom: 2px solid var(--filete); padding: 0.2rem 0.1rem; outline: none; }
  .editor-titulo:focus { border-bottom-color: var(--esperanza-hondo); }
  .barra-md { display: flex; flex-wrap: wrap; gap: 0.2rem; align-items: center; padding: 0.3rem; border-radius: 14px 14px 0 0; background: var(--hundido); border: 1px solid var(--filete); border-bottom: 0; }
  .barra-md button { border: 0; background: none; border-radius: 8px; padding: 0.3rem 0.6rem; min-height: 2rem; font-size: 0.85rem; font-weight: 700; min-width: 2rem; }
  .barra-md button:hover { background: var(--hundido-2); }
  .barra-md button:disabled { opacity: 0.5; }
  .barra-md .sep { width: 1px; height: 1.2rem; background: var(--filete-fuerte); margin: 0 0.2rem; }
  .pestanas-editor { display: none; }
  .editor { display: grid; grid-template-columns: 1fr 1fr; min-height: 55vh; border: 1px solid var(--filete); border-radius: 0 0 14px 14px; overflow: hidden; background: rgb(255 255 255 / 0.55); }
  .fuente-md { resize: none; border: 0; outline: none; padding: 0.9rem 1rem; min-height: 55vh; background: transparent; font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace; font-size: 0.9rem; line-height: 1.65; color: var(--texto); border-right: 1px solid var(--filete); }
  .fuente-md:focus { background: rgb(255 255 255 / 0.5); box-shadow: inset 0 0 0 2px var(--esperanza-suave); }
  .previa { padding: 0.6rem 1rem 1rem; overflow-y: auto; max-height: 70vh; }
  .rotulo-previa { margin: 0 0 0.5rem; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--texto-suave); }
  .medida { margin: 0.4rem 0 0; text-align: right; font-size: 0.75rem; color: var(--texto-suave); }
  .medida.pasado { color: var(--peligro-hondo); font-weight: 800; }

  .solo-angosto { display: none; }

  @media (max-width: 1099px) {
    .editor { grid-template-columns: 1fr; }
    .pestanas-editor { display: flex; gap: 0.2rem; padding: 0.3rem; background: var(--hundido); border: 1px solid var(--filete); border-bottom: 0; }
    .pestanas-editor button { flex: 1; border: 0; background: none; border-radius: 8px; min-height: 2.5rem; font-weight: 700; font-size: 0.9rem; color: var(--texto-suave); }
    .pestanas-editor button.activa { background: var(--texto); color: var(--sobre-color); }
    .barra-md { border-radius: 0; border-bottom: 1px solid var(--filete); }
    .editor .previa { display: none; max-height: none; }
    .editor.ver .previa { display: block; }
    .editor.ver .fuente-md { display: none; }
    .fuente-md { border-right: 0; }
  }
  @media (max-width: 759px) {
    .lore { inset: 0; width: 100%; border-radius: 0; border: 0; padding-top: var(--seguro-arriba); }
    .cabecera { padding: 0.6rem 0.6rem 0.6rem 1rem; }
    .cuerpo { grid-template-columns: 1fr; }
    .indice { border-right: 0; padding: 0.7rem 0.6rem calc(1.2rem + var(--seguro-abajo)); }
    .lector { display: none; padding: 1rem 1rem calc(1.6rem + var(--seguro-abajo)); }
    .en-pagina .indice { display: none; }
    .en-pagina .lector { display: block; }
    .solo-angosto { display: inline-flex; }
    .largo-lore { display: none; }
    .en-pagina .cabecera h2 { font-size: 1.15rem; }
    .en-pagina .nueva { display: none; }
    .fila { min-height: 2.75rem; }
    .abrir { font-size: 1rem; }
    .ojo, .plegar { height: 2.75rem; width: 2.5rem; }
    .herramientas-dj .separa { display: none; }
    .interruptor { flex-basis: 100%; }
    .texto { font-size: 1.05rem; }
  }
</style>

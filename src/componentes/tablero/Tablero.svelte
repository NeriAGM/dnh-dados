<script>
  // Capa del tablero compartido: va al centro de la mesa, encima del fondo de
  // cada quien y detrás de los dados 3D. Acercar, mover y minimizar es solo
  // en esta pantalla; fichas, niebla y señales las ve toda la mesa.
  import { untrack } from 'svelte'
  import { md } from '../../lib/md.js'
  import { app } from '../../lib/mesa.svelte.js'
  import {
    tablero, sincronizarTablero, tableroVisible, idMostrado, esDJTablero, urlTablero, olvidarUrl,
    guardarTablero, mostrarTablero, moverFicha, borrarFicha, senalar,
  } from '../../lib/tablero.svelte.js'
  import Icono from '../Icono.svelte'
  import { crearNiebla, leerNiebla, escribirNiebla, dibujarNiebla, pintar, llenar, recortar, puedeMover, vistaFicha, fichasVisibles } from '../../lib/tablero.js'

  const PINCEL = 0.04
  const ESPERA_SENAL = 500
  const TOLERANCIA = 6

  $effect(() => {
    app.demo; app.campania?.id; app.rol; idMostrado()
    untrack(sincronizarTablero)
  })

  const t = $derived(tableroVisible())
  const esDJ = $derived(esDJTablero())
  const enPrevia = $derived(esDJ && !!t && t.id !== idMostrado())

  // ---- Minimizar (local); un tablero nuevo en la mesa se vuelve a abrir ----
  let minimizado = $state(false)
  let ultimo = null
  $effect(() => {
    const id = t?.id ?? null
    if (id !== ultimo) {
      ultimo = id
      // Lo que se estaba haciendo con el tablero anterior se cierra (la pincelada se guarda en su tablero)
      untrack(soltarGestos)
      minimizado = false; centrar(); seleccionada = null; herramienta = 'mover'
    }
  })

  // ---- Imagen ----
  let url = $state(null)
  let natural = $state({ w: 0, h: 0 })
  // Solo cuando cambia la imagen (no cada vez que cambia la niebla o la nota).
  // Si no se pudo (sin red, enlace vencido) se vuelve a intentar cada vez más espaciado.
  const claveImagen = $derived(t?.imagen ? `${t.id}|${t.imagen}` : null)
  let reintento = $state(0)
  let fallos = $state(0)
  let claveAnterior = null
  $effect(() => {
    reintento
    if (claveImagen !== claveAnterior) { claveAnterior = claveImagen; fallos = 0 }
    if (!claveImagen) { url = null; natural = { w: 0, h: 0 }; return }
    const fila = untrack(() => t)
    const demora = untrack(() => fallos) ? Math.min(30000, 2000 * untrack(() => fallos)) : 0
    let vigente = true
    url = null
    natural = { w: 0, h: 0 }
    const espera = setTimeout(() => {
      urlTablero(fila).then((u) => {
        if (!vigente) return
        if (u) url = u
        else { fallos++; reintento++ }
      })
    }, demora)
    return () => { vigente = false; clearTimeout(espera) }
  })
  function imagenFallo() {
    olvidarUrl(t)
    fallos++
    reintento++
  }

  // ---- Acomodo: la imagen cabe en el marco y la vista se mueve encima ----
  let anchoMarco = $state(0)
  let altoMarco = $state(0)
  let vista = $state({ x: 0, y: 0, z: 1 })
  const caja = $derived.by(() => {
    if (!natural.w || !anchoMarco) return { w: 0, h: 0 }
    const k = Math.min(anchoMarco / natural.w, altoMarco / natural.h)
    return { w: natural.w * k, h: natural.h * k }
  })
  function centrar() { vista = { x: 0, y: 0, z: 1 } }
  function zoom(k, px = null, py = null) {
    const z = Math.min(6, Math.max(0.5, vista.z * k))
    const real = z / vista.z
    if (px == null || !marco) { vista = { ...vista, z }; return }
    const r = marco.getBoundingClientRect()
    const dx = px - (r.left + r.width / 2 + vista.x)
    const dy = py - (r.top + r.height / 2 + vista.y)
    vista = { x: vista.x + dx * (1 - real), y: vista.y + dy * (1 - real), z }
  }

  // ---- Niebla ----
  let herramienta = $state('mover') // mover | destapar | tapar
  const nieblaGuardada = $derived(leerNiebla(t?.niebla))
  let trabajo = null // la niebla mientras el DJ pinta (se guarda al soltar)
  let lienzoNiebla = $state()
  const chico = typeof document !== 'undefined' ? document.createElement('canvas') : null
  function dibujar(n) {
    if (lienzoNiebla && n && chico) dibujarNiebla(lienzoNiebla, chico, n)
  }
  $effect(() => { dibujar(nieblaGuardada) })

  function ponerNiebla() {
    if (!t || !natural.w) return
    guardarTablero(t.id, { niebla: escribirNiebla(crearNiebla(natural.w, natural.h)) })
    herramienta = 'destapar'
  }
  function todo(tapar) {
    const n = leerNiebla(t?.niebla)
    if (!n) return
    llenar(n, tapar)
    guardarTablero(t.id, { niebla: escribirNiebla(n) })
  }
  function quitarNiebla() {
    if (!t || !confirm('¿Quitar la niebla de este tablero? La mesa verá todo el mapa.')) return
    guardarTablero(t.id, { niebla: null })
    herramienta = 'mover'
  }

  // ---- Fichas ----
  let seleccionada = $state(null)
  let arrastre = $state(null) // { id, x, y }
  const fichas = $derived.by(() => {
    if (!t) return []
    const propias = tablero.fichas.filter((f) => f.tablero_id === t.id)
    const quien = { uid: app.sesion?.user?.id, esDJ, personajes: app.personajes }
    return fichasVisibles(propias, nieblaGuardada, esDJ, (f) => puedeMover(f, quien)).map((f) => {
      const v = vistaFicha(f, app.personajes)
      const enMano = arrastre?.id === f.id
      return { ...f, ...v, x: enMano ? arrastre.x : f.x, y: enMano ? arrastre.y : f.y, mia: puedeMover(f, quien) }
    })
  })
  const fichaSel = $derived(fichas.find((f) => f.id === seleccionada) ?? null)

  // ---- Gestos ----
  let marco = $state()
  let lienzo = $state()
  const punteros = new Map()
  let gesto = null // { modo, ... }
  let esperaSenal = 0

  const relativo = (e) => {
    const r = lienzo.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }

  // Se guarda en el tablero donde empezó la pincelada (aunque ya se vea otro)
  function terminarPincel() {
    if (gesto?.modo !== 'pincel' || !trabajo) return
    if (gesto.cambio) guardarTablero(gesto.tableroId, { niebla: escribirNiebla(trabajo) })
    trabajo = null
  }

  // Suelta todo gesto a medias: dedos cuyo pointerup nunca llegó (el marco
  // desapareció al cambiar de tablero), arrastres y pinceladas
  function soltarGestos() {
    terminarPincel()
    clearTimeout(esperaSenal)
    punteros.clear()
    gesto = null
    arrastre = null
    trabajo = null
  }

  function alBajar(e) {
    if (!t || !lienzo || e.button > 0) return
    // Un dedo "primario" empieza un gesto nuevo: lo que haya quedado colgado ya no cuenta
    if (e.isPrimary && punteros.size) soltarGestos()
    try { marco.setPointerCapture(e.pointerId) } catch {} // sin captura el gesto sigue funcionando dentro del marco
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY })
    clearTimeout(esperaSenal)
    if (punteros.size === 2) {
      // Dos dedos: pellizco para acercar (lo que se estaba haciendo se suelta)
      terminarPincel()
      if (gesto?.modo === 'ficha') arrastre = null
      const [a, b] = [...punteros.values()]
      gesto = { modo: 'pellizco', dist: Math.hypot(a.x - b.x, a.y - b.y) }
      return
    }
    if (punteros.size > 2) return
    const idFicha = e.target.closest?.('[data-ficha]')?.dataset.ficha
    const ficha = idFicha && fichas.find((f) => f.id === idFicha)
    if (ficha && herramienta === 'mover') {
      if (esDJ) seleccionada = ficha.id
      if (ficha.mia) { gesto = { modo: 'ficha', id: ficha.id, x0: e.clientX, y0: e.clientY, movio: false }; return }
    } else if (!ficha) seleccionada = null
    if (esDJ && herramienta !== 'mover' && nieblaGuardada) {
      trabajo = leerNiebla(t.niebla)
      gesto = { modo: 'pincel', cambio: false, ultimo: null, tableroId: t.id }
      pintarEn(e)
      return
    }
    gesto = { modo: 'vista', x0: e.clientX, y0: e.clientY, vx: vista.x, vy: vista.y, movio: false }
    const p = relativo(e)
    if (p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1) {
      esperaSenal = setTimeout(() => { if (gesto?.modo === 'vista' && !gesto.movio) senalar(p.x, p.y) }, ESPERA_SENAL)
    }
  }

  // Pinta la línea desde el punto anterior: si el dedo va rápido no quedan huecos
  function pintarEn(e) {
    const p = relativo(e)
    const a = gesto.ultimo ?? p
    const pasos = Math.max(1, Math.ceil(Math.hypot(p.x - a.x, p.y - a.y) / (PINCEL / 2)))
    let cambio = false
    for (let i = 1; i <= pasos; i++) {
      const k = i / pasos
      cambio = pintar(trabajo, a.x + (p.x - a.x) * k, a.y + (p.y - a.y) * k, PINCEL, herramienta === 'tapar') || cambio
    }
    gesto.ultimo = p
    if (cambio) { gesto.cambio = true; dibujar(trabajo) }
  }

  function alMover(e) {
    if (!punteros.has(e.pointerId) || !gesto) return
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (gesto.modo === 'pellizco' && punteros.size >= 2) {
      const [a, b] = [...punteros.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (gesto.dist > 0) zoom(dist / gesto.dist, (a.x + b.x) / 2, (a.y + b.y) / 2)
      gesto.dist = dist
    } else if (gesto.modo === 'pincel') {
      pintarEn(e)
    } else if (gesto.modo === 'ficha') {
      if (!gesto.movio && Math.hypot(e.clientX - gesto.x0, e.clientY - gesto.y0) < TOLERANCIA) return
      gesto.movio = true
      const p = relativo(e)
      arrastre = { id: gesto.id, x: recortar(p.x), y: recortar(p.y) }
    } else if (gesto.modo === 'vista') {
      const dx = e.clientX - gesto.x0
      const dy = e.clientY - gesto.y0
      if (!gesto.movio && Math.hypot(dx, dy) < TOLERANCIA) return
      gesto.movio = true
      clearTimeout(esperaSenal)
      vista = { ...vista, x: gesto.vx + dx, y: gesto.vy + dy }
    }
  }

  function alSoltar(e) {
    if (!punteros.delete(e.pointerId)) return
    clearTimeout(esperaSenal)
    if (gesto?.modo === 'ficha' && arrastre) moverFicha(arrastre.id, arrastre.x, arrastre.y)
    if (gesto?.modo === 'ficha') arrastre = null
    terminarPincel()
    // Al quitar un dedo del pellizco se sigue moviendo con el otro
    if (gesto?.modo === 'pellizco' && punteros.size === 1) {
      const [p] = punteros.values()
      gesto = { modo: 'vista', x0: p.x, y0: p.y, vx: vista.x, vy: vista.y, movio: true }
      return
    }
    if (!punteros.size) gesto = null
  }

  // La rueda tiene que poder cancelar el desplazamiento de la página: va sin "passive"
  $effect(() => {
    // Se guarda el elemento: al cambiar a una nota sin imagen, "marco" ya es null al limpiar
    const el = marco
    if (!el) return
    const rueda = (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY) }
    el.addEventListener('wheel', rueda, { passive: false })
    return () => el.removeEventListener('wheel', rueda)
  })
  $effect(() => () => clearTimeout(esperaSenal))
</script>

{#if t}
  <div class="capa-tablero">
    {#if minimizado}
      <button class="pastilla vidrio" onclick={() => (minimizado = false)} aria-label="Abrir el tablero «{t.nombre}»">
        <Icono nombre="mapa" tam={18} /><span class="p-nombre">{t.nombre}</span>
      </button>
    {:else}
      <section class="tablero vidrio" class:solo-texto={!t.imagen} aria-label="Tablero: {t.nombre}">
        <header class="barra">
          <h2 class="nombre titulo">{t.nombre}</h2>
          {#if enPrevia}
            <span class="previa">Vista previa: la mesa no lo ve</span>
            <button class="boton chico enviar" onclick={() => mostrarTablero(t.id)}>Mostrar a la mesa</button>
          {/if}
          <span class="controles">
            {#if t.imagen}
              <button class="boton chico" onclick={() => zoom(1 / 1.25)} aria-label="Alejar"><Icono nombre="menos" tam={18} /></button>
              <button class="boton chico" onclick={() => zoom(1.25)} aria-label="Acercar"><Icono nombre="mas" tam={18} /></button>
              <button class="boton chico" onclick={centrar} aria-label="Centrar el mapa"><Icono nombre="mover" tam={18} /></button>
            {/if}
            <button class="boton chico" onclick={() => (minimizado = true)} aria-label="Minimizar el tablero"><Icono nombre="abajo" tam={18} /></button>
          </span>
        </header>

        {#if esDJ && t.imagen}
          <div class="herramientas">
            {#if nieblaGuardada}
              <span class="grupo" role="group" aria-label="Herramienta">
                <button class="boton chico" aria-pressed={herramienta === 'mover'} onclick={() => (herramienta = 'mover')}>Mover</button>
                <button class="boton chico" aria-pressed={herramienta === 'destapar'} onclick={() => (herramienta = 'destapar')}>Destapar</button>
                <button class="boton chico" aria-pressed={herramienta === 'tapar'} onclick={() => (herramienta = 'tapar')}>Tapar</button>
              </span>
              {#if herramienta !== 'mover'}
                <button class="boton chico" onclick={() => todo(false)}>Destapar todo</button>
                <button class="boton chico" onclick={() => todo(true)}>Tapar todo</button>
                <button class="boton chico" onclick={quitarNiebla}>Quitar niebla</button>
              {/if}
            {:else}
              <button class="boton chico" onclick={ponerNiebla} disabled={!natural.w}>Agregar niebla</button>
            {/if}
            {#if fichaSel && herramienta === 'mover'}
              <button class="boton chico peligro" onclick={() => { borrarFicha(fichaSel.id); seleccionada = null }}>Quitar «{fichaSel.nombre}»</button>
            {/if}
          </div>
        {/if}

        {#if t.imagen}
          <div
            class="marco"
            class:pincel={esDJ && herramienta !== 'mover' && nieblaGuardada}
            bind:this={marco}
            bind:clientWidth={anchoMarco}
            bind:clientHeight={altoMarco}
            onpointerdown={alBajar}
            onpointermove={alMover}
            onpointerup={alSoltar}
            onpointercancel={alSoltar}
            oncontextmenu={(e) => e.preventDefault()}
            role="application"
            aria-label="Mapa. Arrastra para mover, rueda o pellizco para acercar, mantén presionado para señalar."
          >
            {#if url}
              <div
                class="lienzo"
                bind:this={lienzo}
                style:width="{caja.w}px"
                style:height="{caja.h}px"
                style:transform="translate(-50%, -50%) translate({vista.x}px, {vista.y}px) scale({vista.z})"
              >
                <img src={url} alt={t.nombre} draggable="false" onload={(e) => (natural = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} onerror={imagenFallo} />
                {#if nieblaGuardada}
                  <canvas class="niebla" class:dj={esDJ} bind:this={lienzoNiebla} aria-hidden="true"></canvas>
                {/if}
                {#each fichas as f (f.id)}
                  <div
                    class="ficha"
                    class:mia={f.mia}
                    class:elegida={f.id === seleccionada}
                    class:en-mano={arrastre?.id === f.id}
                    data-ficha={f.id}
                    style:left="{f.x * 100}%"
                    style:top="{f.y * 100}%"
                    style:width="{t.tam_ficha * 100}%"
                    style:font-size="{t.tam_ficha * caja.w * 0.48}px"
                    style:--color-ficha={f.color}
                    title={f.nombre}
                  >
                    <span aria-hidden="true">{f.inicial}</span>
                    <span class="sr-only">{f.nombre}</span>
                  </div>
                {/each}
                {#each tablero.senales.filter((s) => s.tablero_id === t.id) as s (s.id)}
                  <span class="senal" style:left="{s.x * 100}%" style:top="{s.y * 100}%" style:--color-senal={s.color} aria-hidden="true"></span>
                {/each}
              </div>
            {:else}
              <p class="cargando vacio-texto">{fallos ? 'No se pudo cargar el mapa; vuelvo a intentar…' : 'Cargando el mapa…'}</p>
            {/if}
          </div>
        {/if}

        {#if t.texto}
          <div class="nota" class:sola={!t.imagen}>{@html md(t.texto)}</div>
        {/if}
        <!-- También al jugador: una ficha rechazada solo regresaba, sin decir por qué -->
        {#if tablero.error}
          <p class="aviso-error error" role="alert">{tablero.error}</p>
        {/if}
      </section>
    {/if}
  </div>
{/if}

<style>
  .capa-tablero { position: fixed; inset: 0; z-index: 1; pointer-events: none; }
  .tablero, .pastilla { pointer-events: auto; }
  /* El tablero ocupa el hueco central que publica la mesa (--centro-*) */
  .tablero {
    position: absolute;
    left: var(--centro-x, 12px);
    top: var(--centro-y, 84px);
    width: var(--centro-ancho, calc(100vw - 24px));
    height: var(--centro-alto, calc(100dvh - 200px));
    display: flex;
    flex-direction: column;
    border-radius: var(--radio-panel);
    overflow: hidden;
    background: var(--superficie-firme);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.35), var(--sombra-alta);
  }
  /* Una nota sin imagen mide lo que su texto, sin pasar del hueco */
  .tablero.solo-texto { height: auto; max-height: var(--centro-alto, 60dvh); }
  .barra { flex: none; display: flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.6rem 0.45rem 1rem; flex-wrap: wrap; }
  .nombre { margin: 0; font-size: 1.1rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1 1 8rem; }
  .controles { display: flex; gap: 0.25rem; margin-left: auto; }
  .previa { font-size: 0.85rem; font-weight: 700; color: var(--esperanza-hondo); }
  .boton.chico { min-height: 2.25rem; padding: 0.25rem 0.7rem; font-size: 0.85rem; min-width: 2.25rem; }
  .boton.enviar { background: var(--esperanza-suave); border-color: color-mix(in srgb, var(--esperanza) 45%, transparent); color: var(--esperanza-hondo); }
  .herramientas { flex: none; display: flex; gap: 0.3rem; flex-wrap: wrap; padding: 0 0.6rem 0.5rem 1rem; }
  .grupo { display: inline-flex; gap: 0.2rem; }

  .marco {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    touch-action: none;
    cursor: grab;
    background: var(--hundido-2);
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }
  .marco:active { cursor: grabbing; }
  .marco.pincel { cursor: crosshair; }
  .lienzo { position: absolute; left: 50%; top: 50%; transform-origin: center; }
  .lienzo img { display: block; width: 100%; height: 100%; pointer-events: none; }
  .niebla { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  .niebla.dj { opacity: 0.55; }
  .cargando { position: absolute; inset: 0; display: grid; place-items: center; }

  .ficha {
    position: absolute;
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: var(--color-ficha);
    border: 2px solid rgb(255 255 255 / 0.9);
    box-shadow: 0 3px 8px rgb(18 20 50 / 0.5);
    display: grid;
    place-items: center;
    color: var(--sobre-color);
    font-weight: 900;
    text-shadow: 0 1px 3px rgb(12 14 36 / 0.7);
    line-height: 1;
  }
  .ficha.mia { cursor: grab; }
  .ficha.en-mano { cursor: grabbing; transform: translate(-50%, -50%) scale(1.15); z-index: 2; }
  .ficha.elegida { outline: 3px solid var(--esperanza-hondo); outline-offset: 2px; }

  .senal {
    position: absolute;
    width: 6%;
    aspect-ratio: 1;
    border-radius: 50%;
    border: 3px solid var(--color-senal);
    box-shadow: 0 0 12px var(--color-senal);
    transform: translate(-50%, -50%);
    pointer-events: none;
    animation: onda 1s ease-out 3 forwards;
  }
  @keyframes onda {
    from { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
    to { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
  }
  @keyframes desvanecer { from { opacity: 1; } to { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .senal { animation: desvanecer 3s linear forwards; }
  }

  .nota {
    flex: none;
    max-height: 30%;
    overflow: auto;
    padding: 0.6rem 1rem 0.8rem;
    border-top: 1px solid var(--filete);
    font-size: 0.95rem;
    line-height: 1.45;
  }
  .nota.sola { max-height: none; flex: 1; border-top: 0; font-size: 1.05rem; padding: 0.4rem 1.2rem 1.1rem; }
  .nota :global(p) { margin: 0 0 0.5rem; }
  .error { flex: none; padding: 0.4rem 1rem; font-size: 0.85rem; }

  .pastilla {
    position: absolute;
    left: var(--centro-x, 12px);
    top: var(--centro-y, 84px);
    max-width: var(--centro-ancho, calc(100vw - 24px));
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    min-height: 2.5rem;
    border-radius: 999px;
    padding: 0.35rem 1rem;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--texto);
  }
  .p-nombre { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  @media (max-width: 759px) {
    .boton.chico { min-height: 2.5rem; min-width: 2.5rem; }
  }
</style>

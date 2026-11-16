<script>
  import { onMount, onDestroy } from 'svelte'
  import {
    app, alLlegarTirada, registrarPropia, elegirPersonaje, ajustarPersonaje, ajustarMiedo, nombreDe, ajustarHoja, ajustesMesa,
  } from '../lib/mesa.svelte.js'
  import { cargarSRD, conCasero } from '../lib/srd.js'
  import { hojaDemo } from '../lib/demo.js'
  import Hoja from './hoja/Hoja.svelte'
  import PanelDJ from './dj/PanelDJ.svelte'
  import { supabase } from '../lib/supabase.js'
  import { tirar } from '../lib/tirador.js'
  import { estiloDe } from '../lib/dados3d/estilos.js'
  import Lanzador from './Lanzador.svelte'
  import Resultado from './Resultado.svelte'
  import Historial from './Historial.svelte'
  import Escena from './Escena.svelte'
  import { escenaDe } from '../lib/escena.js'
  import Ajustes from './Ajustes.svelte'
  import Lore from './lore/Lore.svelte'
  import PanelTablero from './tablero/PanelTablero.svelte'
  import { soltarLore } from '../lib/lore.svelte.js'
  import { crearCola } from '../lib/cola.js'
  import Icono from './Icono.svelte'

  let { mesa3d, momento, onMomento } = $props()

  let ocupado = $state(false)
  let resultado = $state(null) // { tirada, autor, personaje }
  let verHistorial = $state(false)
  let verAjustes = $state(false)
  let verHoja = $state(null) // id del personaje cuya hoja está abierta
  let verDJ = $state(false)
  let verLore = $state(false)
  let verTablero = $state(false)
  // El lore escucha su propio canal: se suelta al salir de la mesa
  onDestroy(soltarLore)
  let catBase = $state(null)
  const cat = $derived(conCasero(catBase, app.demo ? [] : app.casero))
  let aviso = $state('')
  let temporizador
  onDestroy(() => clearTimeout(temporizador))

  // Modo prueba: todo vive aquí, nada se guarda
  let demoPJ = $state({ id: 'demo', nombre: 'Tu personaje', esperanza: 2, esperanza_max: 6, estres: 0, estres_max: 6, color: '#e9b44c' })
  let demoMiedo = $state(0)
  let demoTiradas = $state([])

  const uid = $derived(app.sesion?.user?.id)
  const esDJ = $derived(!app.demo && app.rol === 'dj')
  const pj = $derived(app.demo ? demoPJ : app.personajes.find((p) => p.id === app.personajeActivo) ?? null)
  const misPJs = $derived(app.demo ? [demoPJ] : esDJ ? app.personajes : app.personajes.filter((p) => p.usuario_id === uid))
  // Escrituras de la tarjeta (Esperanza, Estrés, Miedo) en orden y calculadas
  // desde lo último que pediste: antes, dos toques rápidos en "+" de Estrés
  // partían del mismo valor viejo y solo se marcaba 1; en el Miedo (que se
  // guarda como diferencia) tocar 4 y luego 5 rápido terminaba en 6.
  const cola = crearCola()
  let pendiente = $state({}) // `${id}:${campo}` → valor que se está guardando
  let miedoObjetivo = $state(null)
  const miedo = $derived(app.demo ? demoMiedo : miedoObjetivo ?? app.campania?.miedo ?? 0)
  const tiradas = $derived(app.demo ? demoTiradas : app.lanzamientos)
  const puedoEditarPJ = $derived(app.demo || (pj && (esDJ || pj.usuario_id === uid)))
  const esperanzaVista = $derived(pj ? pendiente[`${pj.id}:esperanza`] ?? pj.esperanza : 0)
  const estresVista = $derived(pj ? pendiente[`${pj.id}:estres`] ?? pj.estres : 0)
  // Encuentro activo tal como lo ve la mesa: en prueba se arma aquí mismo
  const escena = $derived(app.demo ? escenaDe(app.encuentros.find((e) => e.activo), ajustesMesa()) : app.escena)

  function dadosPara3D(t) {
    return t.dados.map((d) => ({ lados: d.lados, valor: d.valor, estilo: estiloDe(d.rol, t.tipo), descartado: d.descartado }))
  }

  function mostrar(t, autor, personaje) {
    clearTimeout(temporizador)
    resultado = { tirada: t, autor, personaje }
    temporizador = setTimeout(() => (resultado = null), 9000)
  }

  // Devuelve la tirada. Con propagar=true lanza el error en vez de solo
  // mostrarlo (lo usan los descansos y movimientos de muerte de la hoja).
  async function alTirar(params, { propagar = false } = {}) {
    if (ocupado) { if (propagar) throw new Error('Espera a que terminen de caer los dados'); return }
    ocupado = true
    resultado = null
    aviso = ''
    try {
      const deHoja = params.personajeId !== undefined
      const personaje = params.tipo === 'dj' ? null : app.demo ? null : deHoja ? params.personajeId : pj?.id ?? null
      const nombrePJ = deHoja ? (app.demo ? demoPJ : app.personajes.find((p) => p.id === params.personajeId))?.nombre : pj?.nombre
      delete params.personajeId
      const t = await tirar({ ...params, campania: app.demo ? null : app.campania.id, personaje })
      if (app.demo) aplicarDemo(t)
      else registrarPropia(t)
      await mesa3d?.lanzar(dadosPara3D(t), { instantaneo: matchMedia('(prefers-reduced-motion: reduce)').matches })
      mostrar(t, app.perfil?.nombre ?? 'Tú', params.tipo === 'dj' ? 'DJ' : nombrePJ)
      return t
    } catch (e) {
      aviso = e.message
      if (propagar) throw e
    } finally {
      ocupado = false
    }
  }

  function aplicarDemo(t) {
    t.usuario_id = 'demo'
    t.personaje_id = t.tipo === 'dj' ? null : 'demo'
    if (t.tipo === 'accion') {
      if (t.desenlace === 'esperanza' || t.desenlace === 'critico') {
        demoPJ.esperanza = Math.min(demoPJ.esperanza + 1, demoPJ.esperanza_max)
        if (t.desenlace === 'critico') demoPJ.estres = Math.max(0, demoPJ.estres - 1)
      } else if (t.desenlace === 'miedo') demoMiedo = Math.min(12, demoMiedo + 1)
    }
    demoTiradas = [t, ...demoTiradas].slice(0, 100)
  }

  // Avisa a la mesa 3D qué parte de la pantalla está libre para los dados:
  // la celda vacía del centro de la retícula (ver estilos). Todo lo demás
  // (barra, PJ, escena, registro, resultado y lanzador) queda fuera de ella.
  let elCentro = $state()
  $effect(() => {
    if (!elCentro) return
    const medir = () => {
      const r = elCentro.getBoundingClientRect()
      if (!r.width || !r.height) return
      // El tablero compartido (debajo de los dados) se acomoda en esta misma celda
      const raiz = document.documentElement.style
      raiz.setProperty('--centro-x', `${Math.round(r.left)}px`)
      raiz.setProperty('--centro-y', `${Math.round(r.top)}px`)
      raiz.setProperty('--centro-ancho', `${Math.round(r.width)}px`)
      raiz.setProperty('--centro-alto', `${Math.round(r.height)}px`)
      // Margen extra: por la perspectiva, un dado junto a la pared del fondo
      // se dibuja más arriba de ella (su cara de arriba) y uno junto a la del
      // frente, un poco más abajo
      mesa3d?.ajustarZona({
        arriba: Math.round(r.top + 36),
        abajo: Math.round(window.innerHeight - r.bottom + 28),
        izquierda: Math.round(r.left + 8),
        derecha: Math.round(window.innerWidth - r.right + 8),
      })
    }
    const obs = new ResizeObserver(medir)
    obs.observe(elCentro)
    window.addEventListener('resize', medir)
    medir()
    return () => { obs.disconnect(); window.removeEventListener('resize', medir) }
  })

  onMount(() => {
    cargarSRD().then((c) => {
      catBase = c
      if (!demoPJ.hoja) demoPJ.hoja = hojaDemo(c)
    }).catch((e) => (aviso = `No se pudo cargar el catálogo de reglas: ${e.message}`))
  })

  // Hoja: abrir, editar y tirar
  const pjHoja = $derived(verHoja == null ? null : app.demo ? demoPJ : app.personajes.find((p) => p.id === verHoja))
  const puedoEditarHoja = $derived(app.demo || (pjHoja && (esDJ || pjHoja.usuario_id === uid)))

  function ponerEnRuta(obj, ruta, valor) {
    const copia = structuredClone($state.snapshot(obj) ?? {})
    let o = copia
    for (let i = 0; i < ruta.length - 1; i++) {
      if (o[ruta[i]] == null || typeof o[ruta[i]] !== 'object') o[ruta[i]] = typeof ruta[i + 1] === 'number' ? [] : {}
      o = o[ruta[i]]
    }
    o[ruta.at(-1)] = valor
    return copia
  }
  async function cambiarHoja(ruta, valor) {
    if (app.demo) { demoPJ.hoja = ponerEnRuta(demoPJ.hoja, ruta, valor); return }
    await ajustarHoja(pjHoja.id, ruta, valor)
  }
  async function cambiarPJHoja(cambios) {
    if (app.demo) { Object.assign(demoPJ, cambios); return }
    await ajustarPersonaje(pjHoja.id, cambios)
  }
  function tirarDesdeHoja(params) {
    const id = pjHoja?.id
    if (!matchMedia('(min-width: 1100px)').matches) verHoja = null
    alTirar({ ...params, personajeId: app.demo ? 'demo' : id })
  }

  onMount(() =>
    alLlegarTirada(async (t) => {
      // Una tirada tuya que llega por tiempo real mientras esta pestaña está
      // tirando es la misma que ya se anima aquí. Si no estás tirando, viene de
      // otro aparato con tu cuenta (p. ej. el DJ en el celular y la mesa en la
      // tele) o llegó tarde tras un corte: antes no se veía ni la tarjeta.
      if (t.usuario_id === uid && ocupado) return
      const p = app.personajes.find((x) => x.id === t.personaje_id)
      const autor = nombreDe(t.usuario_id)
      // Si tú estás tirando, no se interrumpe tu animación; si no, la última tirada manda
      if (!ocupado) {
        try { await mesa3d?.lanzar(dadosPara3D(t), { desdeArriba: true }) } catch (e) { console.error('[dados]', e) }
      }
      mostrar(t, autor, t.tipo === 'dj' ? 'DJ' : p?.nombre ?? autor)
    })
  )

  function guardarPJ(id, campo, valor) {
    const clave = `${id}:${campo}`
    pendiente[clave] = valor
    return cola.agregar(() => ajustarPersonaje(id, { [campo]: valor }))
      .catch((e) => (aviso = e.message))
      .finally(() => { if (cola.vacia) pendiente = {} })
  }
  function cambiarEsperanza(n) {
    if (!puedoEditarPJ || !pj) return
    const nuevo = esperanzaVista === n ? n - 1 : n
    if (app.demo) { demoPJ.esperanza = nuevo; return }
    return guardarPJ(pj.id, 'esperanza', nuevo)
  }
  function cambiarEstres(delta) {
    if (!puedoEditarPJ || !pj) return
    const nuevo = Math.max(0, Math.min(pj.estres_max, estresVista + delta))
    if (app.demo) { demoPJ.estres = nuevo; return }
    return guardarPJ(pj.id, 'estres', nuevo)
  }
  function sumarMiedo(delta) {
    if (app.demo) { demoMiedo = Math.max(0, Math.min(12, demoMiedo + delta)); return }
    return cola.agregar(() => ajustarMiedo(delta))
  }
  const ladoOcupado = $derived(!!pjHoja || verDJ || verTablero)
  const nombreMesa = $derived(app.demo ? 'Mesa de prueba' : app.campania?.nombre ?? '')
  // Punto en «Tiradas» cuando llegó algo y el registro está cerrado (celular)
  let vistaHasta = $state(null)
  $effect(() => { if ((verHistorial || vistaHasta === null) && tiradas.length) vistaHasta = tiradas[0].id })
  // Color de la placa del resultado: el del PJ que tiró (el DJ va en tinta)
  const colorResultado = $derived.by(() => {
    const t = resultado?.tirada
    if (!t || t.tipo === 'dj') return null
    const p = app.demo ? demoPJ : app.personajes.find((x) => x.id === t.personaje_id)
    return p?.color ?? null
  })
  const hayNuevas = $derived(!verHistorial && !!tiradas[0] && vistaHasta !== null && tiradas[0].id !== vistaHasta)
  const puedeDJ = $derived(app.demo || esDJ)

  function cambiarMiedo(n) {
    if (app.demo) { demoMiedo = miedo === n ? n - 1 : n; return }
    if (!esDJ) return
    const objetivo = miedo === n ? n - 1 : n
    miedoObjetivo = objetivo
    // La diferencia se calcula al momento de enviar, con el Miedo ya confirmado
    return cola.agregar(async () => {
      const actual = app.campania?.miedo ?? 0
      if (objetivo !== actual) await ajustarMiedo(objetivo - actual)
    })
      .catch((e) => (aviso = e.message))
      .finally(() => { if (cola.vacia) miedoObjetivo = null })
  }
  async function borrar(t) {
    const { error } = await supabase.from('lanzamientos').delete().eq('id', t.id)
    if (error) aviso = error.message
    else app.lanzamientos = app.lanzamientos.filter((x) => x.id !== t.id)
  }
</script>


<div class="mesa" class:enfocada={ladoOcupado} class:con-dj={verDJ} class:con-tablero={verTablero}>
  <header class="barra vidrio">
    <h1 class="nombre" title={nombreMesa}>{nombreMesa}</h1>

    <div class="miedo" class:editable={esDJ || app.demo} role="group" aria-label="Miedo del DJ: {miedo} de 12">
      <span class="rotulo">Miedo</span>
      <span class="pips">
        {#each Array(12) as _, i}
          <button
            class="pip-miedo"
            class:lleno={i < miedo}
            disabled={!(esDJ || app.demo)}
            onclick={() => cambiarMiedo(i + 1)}
            aria-label="Poner Miedo en {i + 1}"
          ></button>
        {/each}
      </span>
      <span class="cifra num" aria-hidden="true">{miedo}</span>
    </div>

    <nav class="nav" aria-label="Secciones de la mesa">
      {#if pj}
        <button class="nav-b nav-hoja" aria-pressed={verHoja === pj.id} disabled={!catBase} onclick={() => { verDJ = false; verLore = false; verTablero = false; verHoja = verHoja === pj.id ? null : pj.id }}>
          <Icono nombre="hoja" /><span>Hoja</span>
        </button>
      {/if}
      {#if puedeDJ}
        <button class="nav-b" aria-label="Panel del DJ" aria-pressed={verDJ} disabled={!catBase} onclick={() => { verHoja = null; verLore = false; verTablero = false; verDJ = !verDJ }}>
          <Icono nombre="dj" /><span>DJ</span>
        </button>
        <button class="nav-b" aria-label="Tablero para la mesa" aria-pressed={verTablero} onclick={() => { verHoja = null; verLore = false; verDJ = false; verTablero = !verTablero }}>
          <Icono nombre="mapa" /><span>Tablero</span>
        </button>
      {/if}
      <button class="nav-b" aria-label="Lore de la campaña" aria-pressed={verLore} onclick={() => { verDJ = false; verHoja = null; verTablero = false; verLore = !verLore }}>
        <Icono nombre="lore" /><span>Lore</span>
      </button>
      <button class="nav-b nav-tiradas" aria-label="Ver historial de tiradas" aria-pressed={verHistorial} onclick={() => (verHistorial = !verHistorial)}>
        <Icono nombre="tiradas" /><span>Tiradas</span>
        {#if hayNuevas}<i class="punto" aria-hidden="true"></i><span class="sr-only">(hay tiradas nuevas)</span>{/if}
      </button>
      <button class="nav-b" aria-label="Ajustes" aria-pressed={verAjustes} onclick={() => (verAjustes = true)}>
        <Icono nombre="ajustes" /><span>Ajustes</span>
      </button>
    </nav>
  </header>

  <div class="lado">
    {#if pj || misPJs.length}
      <section class="pj vidrio" style:--color-pj={pj?.color ?? '#e0873a'} aria-label="Tu personaje">
        <div class="pj-cabeza">
          {#if misPJs.length > 1}
            <select class="placa selector" value={app.personajeActivo ?? ''} onchange={(e) => elegirPersonaje(e.currentTarget.value || null)} aria-label="Personaje con el que tiras">
              {#if esDJ}<option value="">Elige un personaje</option>{/if}
              {#each misPJs as p (p.id)}<option value={p.id}>{p.nombre}</option>{/each}
            </select>
          {:else}
            <h2 class="placa">{pj?.nombre}</h2>
          {/if}
          {#if pj}
            <button class="boton ver-hoja" onclick={() => (verHoja = pj.id)} disabled={!catBase}><Icono nombre="hoja" tam={18} />Ver hoja</button>
          {/if}
        </div>
        {#if pj}
          <div class="medidor">
            <span class="rotulo">Esperanza</span>
            <span class="pips-esp" role="group" aria-label="Esperanza: {esperanzaVista} de {pj.esperanza_max}">
              {#each Array(pj.esperanza_max) as _, i}
                <button class="pip-esp" class:lleno={i < esperanzaVista} disabled={!puedoEditarPJ} onclick={() => cambiarEsperanza(i + 1)} aria-label="Poner Esperanza en {i + 1}"></button>
              {/each}
            </span>
            <span class="de num">{esperanzaVista}/{pj.esperanza_max}</span>
          </div>
          <div class="medidor">
            <span class="rotulo">Estrés</span>
            <span class="estres">
              <button class="paso" disabled={!puedoEditarPJ || estresVista <= 0} onclick={() => cambiarEstres(-1)} aria-label="Limpiar 1 Estrés"><Icono nombre="menos" tam={16} /></button>
              <span class="cajas" role="img" aria-label="Estrés: {estresVista} de {pj.estres_max}">
                {#each Array(pj.estres_max) as _, i}<span class:marcado={i < estresVista}></span>{/each}
              </span>
              <button class="paso" disabled={!puedoEditarPJ || estresVista >= pj.estres_max} onclick={() => cambiarEstres(1)} aria-label="Marcar 1 Estrés"><Icono nombre="mas" tam={16} /></button>
            </span>
            <span class="de num">{estresVista}/{pj.estres_max}</span>
          </div>
        {/if}
      </section>
    {:else if !esDJ}
      <section class="pj vidrio vacio">
        <p><b>Aún no tienes personaje en esta campaña.</b> Créalo o pide que te asignen uno en Ajustes → Personajes.</p>
        <button class="boton" onclick={() => (verAjustes = true)}><Icono nombre="ajustes" tam={18} />Abrir Ajustes</button>
      </section>
    {/if}

    {#if escena || app.cuentas.length}
      <div class="lado-abajo">
        {#if escena}<Escena {escena} />{/if}
        {#if app.cuentas.length}
          <section class="cuentas vidrio" aria-label="Cuentas regresivas">
            <h2 class="rotulo">Cuentas regresivas</h2>
            <ul>
              {#each app.cuentas as c (c.id)}
                <li class="cuenta" class:cero={c.valor <= 0} class:oculta={!c.visible}>
                  <b class="num">{c.valor}</b>
                  <span>{c.nombre}</span>
                  {#if !c.visible}<span class="oculta-marca" title="Solo la ves tú"><Icono nombre="ojo-no" tam={16} /><span class="sr-only">(oculta para la mesa)</span></span>{/if}
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      </div>
    {/if}
  </div>

  <div class="centro" bind:this={elCentro} aria-hidden="true"></div>

  <div class="zona-resultado" style:--color-pj={colorResultado}>
    {#if resultado}
      <Resultado tirada={resultado.tirada} autor={resultado.autor} personaje={resultado.personaje} onCerrar={() => (resultado = null)} />
    {/if}
  </div>

  {#if verHistorial}<div class="cortina cortina-historial" onclick={() => (verHistorial = false)} role="presentation"></div>{/if}
  <div class="zona-historial" class:abierto={verHistorial}>
    <Historial
      {tiradas}
      nombreDe={(id) => (app.demo ? 'Tú' : nombreDe(id))}
      pjDe={(id) => (app.demo ? (id ? demoPJ : null) : app.personajes.find((p) => p.id === id))}
      puedeBorrar={esDJ}
      onBorrar={borrar}
      onCerrar={verHistorial ? () => (verHistorial = false) : null}
    />
  </div>

  <div class="zona-lanzador">
    <Lanzador esDJ={esDJ} {ocupado} aliados={app.demo || !pj ? [] : app.personajes.filter((p) => p.id !== pj.id)} onTirar={alTirar} />
  </div>

  {#if aviso}
    <button class="aviso vidrio" role="alert" onclick={() => (aviso = '')}>
      <Icono nombre="alerta" /><span>{aviso}</span><span class="cerrar-aviso" aria-hidden="true"><Icono nombre="cerrar" tam={16} /></span>
    </button>
  {/if}

  {#if verAjustes}
    <Ajustes {momento} {onMomento} {cat} onCerrar={() => (verAjustes = false)} onAbrirHoja={(id) => { verAjustes = false; verDJ = false; verHoja = id }} />
  {/if}

  {#if verDJ && cat}
    <PanelDJ {cat} {miedo} onMiedo={sumarMiedo} onTirar={(p) => { if (!matchMedia('(min-width: 1100px)').matches) verDJ = false; alTirar(p) }} onCerrar={() => (verDJ = false)} />
  {/if}

  {#if verTablero}
    <PanelTablero onCerrar={() => (verTablero = false)} />
  {/if}

  {#if verLore}
    <Lore onCerrar={() => (verLore = false)} />
  {/if}

  {#if pjHoja && cat}
    <Hoja
      pj={pjHoja}
      {cat}
      editable={puedoEditarHoja}
      jugador={app.demo || !pjHoja.usuario_id ? '' : nombreDe(pjHoja.usuario_id)}
      onHoja={cambiarHoja}
      onPJ={cambiarPJHoja}
      onTirar={tirarDesdeHoja}
      onTirarResultado={(p) => alTirar({ ...p, personajeId: app.demo ? 'demo' : pjHoja.id }, { propagar: true })}
      onCerrar={() => (verHoja = null)}
    />
  {/if}
</div>

<style>
  /* La mesa es una retícula: cada cosa tiene su celda y la celda vacía del
     centro es donde caen los dados (se mide en el script). */
  .mesa {
    --col-izq: 300px;
    --col-der: 320px;
    --hueco: 12px;
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: var(--col-izq) minmax(0, 1fr) var(--col-der);
    grid-template-rows: auto minmax(0, 1fr) minmax(8.5rem, auto) auto;
    grid-template-areas:
      'barra barra barra'
      'lado centro historial'
      'lado resultado historial'
      'lado lanzador historial';
    gap: var(--hueco);
    padding: calc(var(--hueco) + var(--seguro-arriba)) var(--hueco) calc(var(--hueco) + var(--seguro-abajo));
    pointer-events: none;
  }
  .mesa > :global(*) { pointer-events: auto; min-width: 0; }
  .centro { grid-area: centro; pointer-events: none !important; }

  /* ---- Barra superior ---- */
  .barra {
    grid-area: barra;
    display: flex;
    align-items: center;
    gap: 1rem;
    min-height: 3.5rem;
    padding: 0.35rem 0.4rem 0.35rem 1.1rem;
    border-radius: 20px;
  }
  .nombre {
    margin: 0;
    font-size: 1.3rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 0 1 auto;
  }
  .miedo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: none;
    padding: 0.2rem 0.35rem 0.2rem 0.85rem;
    border-radius: 999px;
    background: var(--miedo-suave);
  }
  .miedo .rotulo { color: var(--miedo-hondo); }
  .pips { display: flex; }
  .pip-miedo {
    display: grid;
    place-items: center;
    width: 21px;
    height: 28px;
    padding: 0;
    border: 0;
    background: none;
  }
  .pip-miedo::before {
    content: '';
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--miedo);
    transition: background 0.2s, transform 0.15s var(--suave);
  }
  .pip-miedo.lleno::before { background: var(--miedo); }
  .pip-miedo:not(:disabled):hover::before { transform: scale(1.25); }
  .pip-miedo:disabled { cursor: default; }
  .cifra { min-width: 2ch; font-size: 1.25rem; font-weight: 900; text-align: center; color: var(--miedo-hondo); }

  .nav { display: flex; gap: 0.2rem; margin-left: auto; }
  .nav-b {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 2.6rem;
    padding: 0.4rem 0.85rem;
    border: 0;
    border-radius: 13px;
    background: none;
    color: var(--texto);
    font-weight: 700;
    transition: background 0.15s, color 0.15s;
  }
  .nav-b:hover { background: var(--hundido-2); }
  .nav-b[aria-pressed='true'] { background: #fff; box-shadow: 0 1px 2px rgb(18 20 50 / 0.12), 0 4px 12px -6px rgb(18 20 50 / 0.4); }
  .nav-b:disabled { opacity: 0.45; cursor: progress; }
  .nav-tiradas { display: none; }
  .punto {
    position: absolute;
    top: 5px;
    right: 7px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--esperanza);
    box-shadow: 0 0 0 2px #fff;
  }

  /* ---- Columna izquierda: PJ, escena y cuentas ---- */
  .lado {
    grid-area: lado;
    align-self: start;
    max-height: 100%;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--hueco);
    padding: 2px;
    margin: -2px;
  }
  .lado-abajo { display: flex; flex-direction: column; gap: var(--hueco); }

  .pj {
    display: grid;
    gap: 0.55rem;
    padding: 0.85rem 1rem 0.95rem;
    border-radius: var(--radio-panel);
  }
  .pj-cabeza { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; min-width: 0; }
  .pj-cabeza .placa { flex: 0 1 auto; }
  .pj .placa { margin: 0; font-size: 1.1rem; }
  .selector {
    min-width: 0;
    border: 0;
    appearance: none;
    padding-right: 1.9rem;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6.5 9.5 12 15l5.5-5.5'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
    background-size: 1rem;
  }
  .selector option { background: #fff; color: var(--texto); font-weight: 500; }
  .ver-hoja { min-height: 2.3rem; padding: 0.3rem 0.8rem; font-size: 0.9rem; flex: none; }
  .vacio { gap: 0.7rem; }
  .vacio p { margin: 0; font-size: 0.92rem; }

  /* En la columna: rótulo y cuenta arriba, el control abajo */
  .medidor {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: 'rot de' 'ctl ctl';
    align-items: center;
    gap: 0.1rem 0.5rem;
  }
  .medidor .rotulo { grid-area: rot; }
  .de { grid-area: de; }
  .pips-esp, .estres { grid-area: ctl; }
  .de { font-size: 0.92rem; font-weight: 900; color: var(--texto-suave); }
  .pips-esp { margin-left: -5px; }
  .pips-esp { display: flex; flex-wrap: wrap; }
  .pip-esp {
    display: grid;
    place-items: center;
    width: 28px;
    height: 30px;
    padding: 0;
    border: 0;
    background: none;
  }
  .pip-esp::before {
    content: '';
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid var(--esperanza);
    transition: background 0.2s, transform 0.15s var(--suave), box-shadow 0.2s;
  }
  .pip-esp.lleno::before { background: var(--esperanza); box-shadow: 0 0 0 3px var(--esperanza-suave); }
  .pip-esp:not(:disabled):hover::before { transform: scale(1.15); }
  .pip-esp:disabled { cursor: default; }
  .estres { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }
  .paso {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid var(--filete);
    border-radius: 9px;
    background: var(--hundido);
    color: var(--texto);
  }
  .paso:hover:not(:disabled) { background: var(--hundido-2); }
  .paso:disabled { opacity: 0.35; cursor: default; }
  .cajas { display: flex; gap: 3px; flex-wrap: wrap; }
  .cajas span { width: 13px; height: 18px; border-radius: 4px; border: 1.5px solid var(--filete-fuerte); transition: background 0.2s; }
  .cajas span.marcado { background: var(--texto); border-color: var(--texto); }

  .cuentas { display: grid; gap: 0.5rem; padding: 0.75rem 0.9rem 0.85rem; border-radius: var(--radio-panel); }
  .cuentas h2 { margin: 0; }
  .cuentas ul { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0; padding: 0; list-style: none; }
  .cuenta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.2rem 0.75rem 0.2rem 0.2rem;
    border-radius: 999px;
    background: var(--hundido);
    font-size: 0.88rem;
    font-weight: 700;
  }
  .cuenta b {
    display: grid;
    place-items: center;
    min-width: 1.9rem;
    height: 1.9rem;
    border-radius: 999px;
    background: var(--texto);
    color: var(--sobre-color);
    font-size: 1rem;
  }
  .cuenta.cero { color: var(--peligro-hondo); background: var(--peligro-suave); animation: latido 1.4s ease-in-out infinite; }
  .cuenta.cero b { background: var(--peligro); }
  .cuenta.oculta { background: none; outline: 1.5px dashed var(--filete-fuerte); outline-offset: -1.5px; }
  .oculta-marca { display: grid; color: var(--texto-suave); }
  @keyframes latido { 50% { box-shadow: 0 0 0 4px var(--peligro-suave); } }

  /* ---- Centro: resultado y lanzador ---- */
  .zona-resultado {
    grid-area: resultado;
    display: grid;
    align-items: end;
    justify-items: center;
    min-height: 0;
    pointer-events: none !important;
  }
  .zona-resultado > :global(*) { pointer-events: auto; width: min(100%, 640px); }
  .zona-lanzador { grid-area: lanzador; justify-self: center; width: min(100%, 640px); }

  /* ---- Derecha: registro de tiradas ---- */
  .zona-historial { grid-area: historial; display: flex; flex-direction: column; min-height: 0; transition: opacity 0.25s; }
  .cortina-historial { display: none; }

  .aviso {
    position: fixed;
    z-index: 30;
    top: calc(5rem + var(--seguro-arriba));
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.6rem;
    max-width: min(90vw, 520px);
    padding: 0.7rem 0.9rem;
    border-radius: 16px;
    color: var(--peligro-hondo);
    font-weight: 700;
    text-align: left;
    background: var(--superficie-firme);
    animation: bajar 0.3s var(--suave);
  }
  .cerrar-aviso { color: var(--texto-suave); }
  @keyframes bajar { from { opacity: 0; transform: translate(-50%, -8px); } }

  /* ---- Con la hoja o el panel del DJ abierto (escritorio): la mesa se aparta ---- */
  @media (min-width: 1100px) {
    .mesa.enfocada { --col-izq: 560px; }
    .mesa.enfocada.con-dj { --col-izq: 600px; }
    .mesa.enfocada.con-tablero { --col-izq: 380px; }
    .enfocada .lado { visibility: hidden; }
    .enfocada .zona-historial { opacity: 0.55; }
    .enfocada .zona-historial:hover, .enfocada .zona-historial:focus-within { opacity: 1; }
  }
  @media (min-width: 1100px) and (max-width: 1359px) {
    .mesa.enfocada { --col-der: 0px; }
    .enfocada .zona-historial { display: none; }
  }

  /* ---- Pantallas medianas: botones con su nombre debajo del ícono ---- */
  @media (max-width: 1099px) {
    .mesa { --col-izq: 270px; --col-der: 280px; }
    .barra { gap: 0.7rem; padding-left: 0.95rem; }
    .nav-b { flex-direction: column; gap: 0.05rem; min-width: 3.2rem; min-height: 2.9rem; padding: 0.3rem 0.4rem; font-size: 0.7rem; }
    .nav-hoja { display: none; }
  }

  /* ---- Dos columnas: el registro se abre desde «Tiradas» ---- */
  @media (max-width: 959px) {
    .mesa {
      --col-izq: 280px;
      grid-template-columns: var(--col-izq) minmax(0, 1fr);
      grid-template-areas:
        'barra barra'
        'lado centro'
        'lado resultado'
        'lado lanzador';
    }
    .nav-tiradas { display: inline-flex; }
    .cortina-historial { display: block; z-index: 6; }
    .zona-historial {
      position: fixed;
      z-index: 7;
      top: calc(var(--hueco) + var(--seguro-arriba));
      right: var(--hueco);
      bottom: var(--hueco);
      width: min(340px, calc(100% - 2 * var(--hueco)));
      transform: translateX(calc(100% + 2rem));
      transition: transform 0.3s var(--suave);
    }
    .zona-historial.abierto { transform: none; }
  }

  /* ---- Celular ---- */
  @media (max-width: 759px) {
    .mesa {
      --hueco: 8px;
      grid-template-columns: minmax(0, 1fr);
      /* La escena va arriba con el PJ y las cuentas abajo con el resultado:
         la mesa 3D no deja que los dados pasen de ~45 % arriba ni de 50 %
         abajo (dados3d/mesa.js), así que se reparte lo que rodea su zona */
      grid-template-rows: auto auto auto minmax(0, 1fr) auto minmax(8.25rem, auto) auto;
      grid-template-areas: 'barra' 'pj' 'escena' 'centro' 'cuentas' 'resultado' 'lanzador';
      padding: calc(8px + var(--seguro-arriba)) 8px 0;
    }
    .lado { display: contents; }
    .pj { grid-area: pj; padding: 0.7rem 0.85rem 0.75rem; gap: 0.35rem; }
    .lado-abajo { display: contents; }
    .lado-abajo > :global(.escena) { grid-area: escena; }
    .cuentas { grid-area: cuentas; }
    .cuentas { padding: 0.55rem 0.7rem; }
    .cuentas h2 { display: none; }
    .medidor { grid-template-columns: 5rem minmax(0, 1fr) auto; grid-template-areas: 'rot ctl de'; }
    .pips-esp { margin-left: 0; }
    .barra {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas: 'nombre nav' 'miedo miedo';
      gap: 0.3rem 0.5rem;
      padding: 0.35rem 0.35rem 0.5rem 0.85rem;
    }
    .nombre { grid-area: nombre; font-size: 1.08rem; }
    .nav { grid-area: nav; gap: 0; }
    .nav-b { min-width: 3rem; padding: 0.25rem 0.3rem; }
    .miedo { grid-area: miedo; padding-left: 0.75rem; }
    .pips { flex: 1; justify-content: space-between; }
    .pip-miedo { flex: 1; width: auto; max-width: 26px; }
    .zona-lanzador { width: auto; margin: 0 -8px; justify-self: stretch; }
    .zona-historial {
      top: auto;
      left: 0;
      right: 0;
      bottom: 0;
      width: auto;
      height: min(78dvh, 640px);
      transform: translateY(calc(100% + 2rem));
    }
    .zona-historial :global(.historial) { border-radius: var(--radio-panel) var(--radio-panel) 0 0; height: 100%; }
    .aviso { top: calc(7.5rem + var(--seguro-arriba)); }
  }

  /* ---- Celular acostado y pantallas muy bajas: lanzador a la derecha ---- */
  @media (max-height: 560px) and (min-width: 600px) {
    .mesa {
      --hueco: 8px;
      --col-izq: 260px;
      --col-der: 360px;
      grid-template-columns: var(--col-izq) minmax(0, 1fr) var(--col-der);
      grid-template-rows: auto minmax(0, 1fr) auto;
      grid-template-areas:
        'barra barra barra'
        'lado centro resultado'
        'lado centro lanzador';
      padding: calc(8px + var(--seguro-arriba)) 8px calc(8px + var(--seguro-abajo));
    }
    .lado { display: flex; gap: 6px; }
    .lado-abajo { gap: 6px; }
    .pj { padding: 0.55rem 0.8rem 0.6rem; gap: 0.2rem; }
    .pip-esp, .pip-miedo { height: 26px; }
    .cuentas { padding: 0.45rem 0.6rem; }
    .cuentas h2 { display: none; }
    .cuentas ul { flex-direction: column; align-items: flex-start; gap: 0.3rem; }
    /* PJ en dos renglones: la cuenta 3/6 la dicen los mismos puntos */
    .medidor { grid-template-columns: 4.3rem minmax(0, 1fr); grid-template-areas: 'rot ctl'; }
    .medidor .rotulo { font-size: 0.68rem; }
    .de { display: none; }
    .pips-esp { margin-left: 0; }
    .pip-esp { width: 22px; height: 24px; }
    .pip-esp::before { width: 15px; height: 15px; }
    .paso { width: 26px; height: 26px; }
    .cajas span { width: 11px; height: 16px; }
    .barra { min-height: 3rem; padding-block: 0.2rem; }
    .nav-b { min-height: 2.6rem; }
    .zona-resultado { align-items: end; overflow-y: auto; padding-top: 1rem; }
    .zona-lanzador { width: 100%; margin: 0; }
    .ver-hoja { font-size: 0; gap: 0; width: 2.3rem; padding: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .cuenta.cero { animation: none; }
  }
</style>

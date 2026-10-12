<script>
  import { onMount } from 'svelte'
  import {
    app, alLlegarTirada, registrarPropia, elegirPersonaje, ajustarPersonaje, ajustarMiedo, nombreDe, ajustarHoja,
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

  let { mesa3d, momento, onMomento } = $props()

  let ocupado = $state(false)
  let resultado = $state(null) // { tirada, autor, personaje }
  let verHistorial = $state(false)
  let verAjustes = $state(false)
  let verHoja = $state(null) // id del personaje cuya hoja está abierta
  let verDJ = $state(false)
  let catBase = $state(null)
  const cat = $derived(conCasero(catBase, app.demo ? [] : app.casero))
  let aviso = $state('')
  let animando = false
  let temporizador

  // Modo prueba: todo vive aquí, nada se guarda
  let demoPJ = $state({ id: 'demo', nombre: 'Tu personaje', esperanza: 2, esperanza_max: 6, estres: 0, estres_max: 6, color: '#e9b44c' })
  let demoMiedo = $state(0)
  let demoTiradas = $state([])

  const uid = $derived(app.sesion?.user?.id)
  const esDJ = $derived(!app.demo && app.rol === 'dj')
  const pj = $derived(app.demo ? demoPJ : app.personajes.find((p) => p.id === app.personajeActivo) ?? null)
  const misPJs = $derived(app.demo ? [demoPJ] : esDJ ? app.personajes : app.personajes.filter((p) => p.usuario_id === uid))
  const miedo = $derived(app.demo ? demoMiedo : app.campania?.miedo ?? 0)
  const tiradas = $derived(app.demo ? demoTiradas : app.lanzamientos)
  const puedoEditarPJ = $derived(app.demo || (pj && (esDJ || pj.usuario_id === uid)))
  // Encuentro activo tal como lo ve la mesa: en prueba se arma aquí mismo
  const escena = $derived(app.demo ? escenaDe(app.encuentros.find((e) => e.activo)) : app.escena)

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
      animando = true
      await mesa3d?.lanzar(dadosPara3D(t), { instantaneo: matchMedia('(prefers-reduced-motion: reduce)').matches })
      animando = false
      mostrar(t, app.perfil?.nombre ?? 'Tú', params.tipo === 'dj' ? 'DJ' : nombrePJ)
      return t
    } catch (e) {
      aviso = e.message
      if (propagar) throw e
    } finally {
      ocupado = false
      animando = false
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

  // Avisa a la mesa 3D qué parte de la pantalla está libre para los dados
  let elBarra = $state(), elPJ = $state(), elLanzador = $state(), elHistorial = $state(), elEscena = $state(), elCuentas = $state()
  $effect(() => {
    if (!mesa3d || !elLanzador) return
    const medir = () => {
      const h = window.innerHeight, w = window.innerWidth
      const ancho = w >= 760
      const techo = Math.max(elBarra?.getBoundingClientRect().bottom ?? 0, elPJ?.getBoundingClientRect().bottom ?? 0)
      const resultadoAlto = ancho ? 210 : 120
      // En pantalla ancha las cuentas van arriba: el resultado se acomoda debajo de ellas
      const finCuentas = ancho && elCuentas ? Math.round(elCuentas.getBoundingClientRect().bottom + 6) : 0
      document.documentElement.style.setProperty('--fin-cuentas', `${finCuentas}px`)
      const arriba = Math.max(techo, Math.max(ancho ? 64 : 56, finCuentas) + resultadoAlto) + 8
      const topeLanzador = elLanzador.getBoundingClientRect().top
      document.documentElement.style.setProperty('--alto-lanzador', `${Math.round(h - topeLanzador + 8)}px`)
      // La escena y (en celular) las cuentas se apilan sobre el lanzador: los dados no caen ahí
      let tope = topeLanzador
      for (const el of [elEscena, elCuentas]) {
        const r = el?.getBoundingClientRect()
        if (r && r.height > 0 && r.top > h / 2) tope = Math.min(tope, r.top)
      }
      const abajo = h - tope + 8
      const derecha = ancho && elHistorial ? w - elHistorial.getBoundingClientRect().left + 8 : 0
      const hojaAbierta = w >= 1100 ? document.querySelector('.hoja, .panel') : null
      const izquierda = hojaAbierta ? hojaAbierta.getBoundingClientRect().right + 8 : 0
      mesa3d.ajustarZona({ arriba, abajo, derecha, izquierda })
    }
    verHoja; verDJ
    const obs = new ResizeObserver(medir)
    for (const el of [elBarra, elPJ, elLanzador, elHistorial, elEscena, elCuentas]) if (el) obs.observe(el)
    window.addEventListener('resize', medir)
    medir()
    const t = setTimeout(medir, 350)
    return () => { clearTimeout(t); obs.disconnect(); window.removeEventListener('resize', medir) }
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
      if (t.usuario_id === uid) return
      const p = app.personajes.find((x) => x.id === t.personaje_id)
      const autor = nombreDe(t.usuario_id)
      if (!animando && !ocupado) {
        animando = true
        await mesa3d?.lanzar(dadosPara3D(t), { desdeArriba: true })
        animando = false
      }
      mostrar(t, autor, t.tipo === 'dj' ? 'DJ' : p?.nombre ?? autor)
    })
  )

  async function cambiarEsperanza(n) {
    if (!puedoEditarPJ || !pj) return
    const nuevo = pj.esperanza === n ? n - 1 : n
    if (app.demo) { demoPJ.esperanza = nuevo; return }
    try { await ajustarPersonaje(pj.id, { esperanza: nuevo }) } catch (e) { aviso = e.message }
  }
  async function cambiarEstres(delta) {
    if (!puedoEditarPJ || !pj) return
    const nuevo = Math.max(0, Math.min(pj.estres_max, pj.estres + delta))
    if (app.demo) { demoPJ.estres = nuevo; return }
    try { await ajustarPersonaje(pj.id, { estres: nuevo }) } catch (e) { aviso = e.message }
  }
  async function sumarMiedo(delta) {
    if (app.demo) { demoMiedo = Math.max(0, Math.min(12, demoMiedo + delta)); return }
    await ajustarMiedo(delta)
  }
  const ladoOcupado = $derived(!!pjHoja || verDJ)
  const puedeDJ = $derived(app.demo || esDJ)

  async function cambiarMiedo(n) {
    if (app.demo) { demoMiedo = miedo === n ? n - 1 : n; return }
    if (!esDJ) return
    try { await ajustarMiedo((miedo === n ? n - 1 : n) - miedo) } catch (e) { aviso = e.message }
  }
  async function borrar(t) {
    const { error } = await supabase.from('lanzamientos').delete().eq('id', t.id)
    if (error) aviso = error.message
    else app.lanzamientos = app.lanzamientos.filter((x) => x.id !== t.id)
  }
</script>

<div class="mesa">
  <header class="barra" bind:this={elBarra}>
    <h1 class="titulo nombre">{app.demo ? 'Mesa de prueba' : app.campania?.nombre}</h1>

    <div class="miedo" class:editable={esDJ || app.demo} aria-label="Miedo del DJ: {miedo} de 12">
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
      <span class="cifra">{miedo}</span>
    </div>

    <div class="botones">
      {#if puedeDJ}
        <button class="boton dj" aria-label="Panel del DJ" onclick={() => { verHoja = null; verDJ = !verDJ }} disabled={!catBase} aria-pressed={verDJ}><span class="largo">Panel del DJ</span><span class="corto">DJ</span></button>
      {/if}
      <button class="boton icono solo-movil" onclick={() => (verHistorial = true)} aria-label="Ver historial">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M4 6h16M4 12h16M4 18h10"/></svg>
      </button>
      <button class="boton icono" onclick={() => (verAjustes = true)} aria-label="Ajustes">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>
      </button>
    </div>
  </header>

  {#if pj || misPJs.length}
    <section class="pj vidrio" bind:this={elPJ} style:--color-pj={pj?.color ?? '#e9b44c'}>
      {#if misPJs.length > 1}
        <select class="selector titulo" value={app.personajeActivo ?? ''} onchange={(e) => elegirPersonaje(e.currentTarget.value || null)} aria-label="Personaje con el que tiras">
          {#if esDJ}<option value="">Elige un personaje</option>{/if}
          {#each misPJs as p (p.id)}<option value={p.id}>{p.nombre}</option>{/each}
        </select>
      {:else}
        <h2 class="titulo pj-nombre">{pj?.nombre}</h2>
      {/if}
      {#if pj}
        <button class="ver-hoja" onclick={() => (verHoja = pj.id)} disabled={!catBase}>Ver hoja</button>
      {/if}
      {#if pj}
        <div class="esperanza" aria-label="Esperanza: {pj.esperanza} de {pj.esperanza_max}">
          {#each Array(pj.esperanza_max) as _, i}
            <button class="pip-esp" class:lleno={i < pj.esperanza} disabled={!puedoEditarPJ} onclick={() => cambiarEsperanza(i + 1)} aria-label="Poner Esperanza en {i + 1}"></button>
          {/each}
          <span class="rotulo">Esperanza</span>
        </div>
        <div class="estres">
          <span class="rotulo">Estrés</span>
          <button class="mini" disabled={!puedoEditarPJ} onclick={() => cambiarEstres(-1)} aria-label="Limpiar 1 Estrés">−</button>
          <span class="barra-estres" aria-label="Estrés: {pj.estres} de {pj.estres_max}">
            {#each Array(pj.estres_max) as _, i}<span class:marcado={i < pj.estres}></span>{/each}
          </span>
          <button class="mini" disabled={!puedoEditarPJ} onclick={() => cambiarEstres(1)} aria-label="Marcar 1 Estrés">+</button>
        </div>
      {/if}
    </section>
  {:else if !esDJ}
    <section class="pj vidrio vacio">
      <p>Aún no tienes personaje en esta campaña. Créalo en <button class="enlace" onclick={() => (verAjustes = true)}>Ajustes</button>.</p>
    </section>
  {/if}

  {#if resultado}
    <div class="zona-resultado" class:con-hoja={ladoOcupado}>
      <Resultado tirada={resultado.tirada} autor={resultado.autor} personaje={resultado.personaje} onCerrar={() => (resultado = null)} />
    </div>
  {/if}

  {#if aviso}
    <button class="aviso vidrio" role="alert" onclick={() => (aviso = '')}>{aviso}</button>
  {/if}

  <div class="zona-historial" class:abierto={verHistorial} bind:this={elHistorial}>
    <Historial
      {tiradas}
      nombreDe={(id) => (app.demo ? 'Tú' : nombreDe(id))}
      pjDe={(id) => (app.demo ? (id ? demoPJ : null) : app.personajes.find((p) => p.id === id))}
      puedeBorrar={esDJ}
      onBorrar={borrar}
      onCerrar={verHistorial ? () => (verHistorial = false) : null}
    />
  </div>

  <div class="zona-lanzador" class:con-hoja={ladoOcupado} bind:this={elLanzador}>
    <Lanzador esDJ={esDJ} {ocupado} onTirar={alTirar} />
  </div>

  {#if verAjustes}
    <Ajustes {momento} {onMomento} {cat} onCerrar={() => (verAjustes = false)} onAbrirHoja={(id) => { verAjustes = false; verDJ = false; verHoja = id }} />
  {/if}

  <!-- En celular, la escena y las cuentas se apilan justo arriba del lanzador -->
  <div class="pila">
    {#if escena}
      <div class="zona-escena" class:con-hoja={ladoOcupado} bind:this={elEscena}>
        <Escena {escena} />
      </div>
    {/if}
    {#if app.cuentas.length}
      <div class="cuentas" class:con-hoja={ladoOcupado} aria-label="Cuentas regresivas" bind:this={elCuentas}>
        {#each app.cuentas as c (c.id)}
          <span class="cuenta" class:cero={c.valor <= 0} class:oculta={!c.visible}><b class="titulo">{c.valor}</b>{c.nombre}</span>
        {/each}
      </div>
    {/if}
  </div>

  {#if verDJ && cat}
    <PanelDJ {cat} {miedo} onMiedo={sumarMiedo} onTirar={(p) => { if (!matchMedia('(min-width: 1100px)').matches) verDJ = false; alTirar(p) }} onCerrar={() => (verDJ = false)} />
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
  .mesa { position: absolute; inset: 0; pointer-events: none; }
  .mesa > :global(*) { pointer-events: auto; }

  .barra {
    position: absolute;
    top: 0; left: 0; right: 0;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: calc(0.6rem + env(safe-area-inset-top, 0px)) 0.8rem 0.4rem;
    pointer-events: none;
  }
  .barra > * { pointer-events: auto; }
  .nombre { margin: 0; font-size: clamp(1.1rem, 3.5vw, 1.6rem); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 0 1 auto; }
  .botones { display: flex; gap: 0.4rem; margin-left: auto; }
  .icono { padding: 0.5rem; display: grid; place-items: center; background: var(--vidrio); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }

  .miedo {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.35rem 0.7rem;
    border-radius: 999px;
    background: rgba(30, 14, 52, 0.55);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(167, 124, 232, 0.35);
  }
  .rotulo { font-size: 0.75rem; font-weight: 700; color: var(--pergamino-suave); }
  .pips { display: grid; grid-template-columns: repeat(12, auto); gap: 3px; }
  .pip-miedo {
    width: 11px; height: 11px;
    padding: 0;
    border: 1.5px solid rgba(167, 124, 232, 0.6);
    background: transparent;
    transform: rotate(45deg);
    border-radius: 2px;
    transition: background 0.2s, box-shadow 0.2s;
  }
  .pip-miedo.lleno { background: var(--miedo); box-shadow: 0 0 8px rgba(167, 124, 232, 0.9); border-color: #d6bfff; }
  .pip-miedo:disabled { cursor: default; }
  .cifra { font-family: var(--fuente-titulo); font-weight: 900; font-size: 1.1rem; color: #d6bfff; min-width: 1.4ch; text-align: right; }

  .pj {
    position: absolute;
    top: calc(3.6rem + env(safe-area-inset-top, 0px));
    left: 0.8rem;
    border-radius: 18px;
    padding: 0.55rem 0.8rem 0.65rem;
    display: grid;
    gap: 0.35rem;
    border-left: 3px solid var(--color-pj);
    max-width: calc(100% - 1.6rem);
  }
  .pj.vacio p { margin: 0; font-size: 0.9rem; }
  .enlace { border: 0; background: none; padding: 0; color: var(--esperanza); text-decoration: underline; font-weight: 700; }
  .pj-nombre, .selector { margin: 0; font-size: 1.15rem; }
  .ver-hoja {
    justify-self: start; border: 1px solid var(--linea); background: rgba(255, 245, 230, 0.08);
    border-radius: 999px; padding: 0.2rem 0.7rem; font-size: 0.78rem; font-weight: 700;
  }
  .ver-hoja:hover { background: color-mix(in srgb, var(--color-pj) 30%, transparent); }
  .selector { background: transparent; border: 0; padding: 0; outline: none; }
  .selector option { background: #241a3a; font-family: var(--fuente); }
  .esperanza { display: flex; align-items: center; gap: 0.35rem; }
  .pip-esp {
    width: 18px; height: 18px;
    padding: 0;
    border: 0;
    background: none;
    clip-path: polygon(50% 0, 64% 34%, 100% 50%, 64% 66%, 50% 100%, 36% 66%, 0 50%, 36% 34%);
    background: rgba(240, 189, 85, 0.25);
    transition: background 0.2s, transform 0.15s;
  }
  .pip-esp.lleno { background: var(--esperanza); filter: drop-shadow(0 0 6px rgba(240, 189, 85, 0.9)); }
  .pip-esp:not(:disabled):hover { transform: scale(1.15); }
  .pip-esp:disabled { cursor: default; }
  .esperanza .rotulo { margin-left: 0.25rem; }
  .estres { display: flex; align-items: center; gap: 0.35rem; }
  .mini { border: 1px solid var(--linea); background: none; border-radius: 6px; width: 1.4rem; height: 1.4rem; padding: 0; line-height: 1; font-weight: 800; }
  .mini:disabled { opacity: 0.35; cursor: default; }
  .barra-estres { display: flex; gap: 2px; }
  .barra-estres span { width: 9px; height: 12px; border-radius: 2px; border: 1px solid rgba(255, 179, 189, 0.5); }
  .barra-estres span.marcado { background: var(--sangre); border-color: #ffb3bd; }

  .zona-resultado {
    position: absolute;
    left: 50%;
    top: max(calc(4rem + env(safe-area-inset-top, 0px)), var(--fin-cuentas, 0px));
    transform: translateX(-50%);
    z-index: 4;
  }
  @media (min-width: 1100px) {
    .cuentas.con-hoja { left: calc(50% + 140px); }
    .zona-resultado.con-hoja { left: calc(50% + 140px); z-index: 10; }
    .zona-lanzador.con-hoja { left: calc(50% + 140px); width: min(520px, calc(100% - 560px - 360px - 2rem)); min-width: 380px; }
  }
  .boton.dj { background: rgba(91, 47, 145, 0.55); border-color: rgba(167, 124, 232, 0.6); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); font-size: 0.85rem; padding: 0.45rem 0.8rem; }
  .boton.dj[aria-pressed='true'] { background: var(--miedo); color: var(--tinta); }
  .cuentas {
    position: absolute; left: 50%; transform: translateX(-50%);
    top: calc(3.2rem + env(safe-area-inset-top, 0px));
    display: flex; gap: 0.35rem; flex-wrap: wrap; justify-content: center; max-width: min(92vw, 640px); z-index: 2;
  }
  .cuenta {
    display: flex; gap: 0.4rem; align-items: center; padding: 0.25rem 0.7rem 0.25rem 0.35rem; border-radius: 999px;
    background: rgba(24, 17, 42, 0.75); border: 1px solid rgba(240, 189, 85, 0.45); font-size: 0.8rem; font-weight: 700;
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  }
  .corto { display: none; }
  .pila { display: contents; }
  .zona-escena { position: absolute; z-index: 2; bottom: var(--alto-lanzador, 13rem); left: 0.6rem; right: 0.6rem; }
  @media (min-width: 760px) {
    .zona-escena { left: 50%; right: auto; transform: translateX(-50%); width: min(560px, calc(100% - 360px - 2rem)); }
  }
  @media (min-width: 760px) and (max-width: 1100px) {
    .zona-escena { left: 0.8rem; transform: none; }
  }
  @media (min-width: 1100px) {
    .zona-escena.con-hoja { left: calc(50% + 140px); width: min(520px, calc(100% - 560px - 360px - 2rem)); min-width: 380px; }
  }
  @media (max-width: 759px) {
    .largo { display: none; }
    .corto { display: inline; }
    .pila {
      display: flex; flex-direction: column; gap: 0.35rem; align-items: stretch;
      position: absolute; left: 0.6rem; right: 0.6rem; bottom: var(--alto-lanzador, 13rem); z-index: 2;
      pointer-events: none;
    }
    .pila > * { pointer-events: auto; }
    .zona-escena { position: static; }
    .cuentas { position: static; transform: none; max-width: none; align-self: center; }
  }
  .cuenta b { display: grid; place-items: center; min-width: 1.6rem; height: 1.6rem; border-radius: 50%; background: var(--esperanza); color: var(--tinta); text-shadow: none; font-size: 0.95rem; }
  .cuenta.cero { border-color: var(--sangre); animation: latido 1.2s ease-in-out infinite; }
  .cuenta.cero b { background: var(--sangre); color: white; }
  .cuenta.oculta { opacity: 0.6; border-style: dashed; }
  @keyframes latido { 50% { box-shadow: 0 0 18px rgba(217, 74, 92, 0.8); } }
  .aviso {
    position: absolute;
    left: 50%;
    top: 14%;
    transform: translateX(-50%);
    margin: 0;
    padding: 0.6rem 1rem;
    border-radius: 12px;
    color: #ffd0d6;
    max-width: 90vw;
    z-index: 4;
  }

  .zona-lanzador {
    position: absolute;
    left: 0; right: 0; bottom: 0;
  }
  .zona-historial {
    position: absolute;
    right: 0.8rem;
    top: calc(3.6rem + env(safe-area-inset-top, 0px));
    bottom: 1rem;
    width: 320px;
    display: flex;
    flex-direction: column;
    z-index: 3;
  }
  .solo-movil { display: none; }

  @media (min-width: 760px) {
    .zona-lanzador { left: 50%; transform: translateX(-50%); bottom: 1rem; width: min(560px, calc(100% - 360px - 2rem)); }
  }
  @media (min-width: 760px) and (max-width: 1100px) {
    .zona-lanzador { left: 0.8rem; transform: none; }
  }
  @media (max-width: 759px) {
    .solo-movil { display: grid; }
    .miedo .rotulo { display: none; }
    .pip-miedo { width: 8px; height: 8px; }
    .zona-historial {
      left: 0; right: 0; top: auto; bottom: 0; width: auto;
      height: 72vh;
      transform: translateY(105%);
      transition: transform 0.3s ease;
      z-index: 5;
    }
    .zona-historial.abierto { transform: none; }
    .zona-historial :global(.historial) { border-radius: var(--radio-panel) var(--radio-panel) 0 0; height: 100%; }
    .zona-resultado { top: calc(3.5rem + env(safe-area-inset-top, 0px)); width: calc(100% - 1.2rem); }
  }
</style>

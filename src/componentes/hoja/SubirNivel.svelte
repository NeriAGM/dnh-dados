<script>
  // Subir de nivel en 4 pasos (SRD): logros de rango, dos mejoras, umbrales +1 y carta nueva.
  import Dialogo from './Dialogo.svelte'
  import Carta from './Carta.svelte'
  import { RASGOS } from '../../lib/srd.js'
  import { rangoDeNivel } from '../../lib/reglas.js'
  import {
    OPCION, MEJORAS_POR_NIVEL, NOMBRE_ETAPA, logrosDeNivel, opcionesDisponibles, seccionPara, validarSubida, aplicarSubida, clavesCambiadas,
  } from '../../lib/avance.js'

  let { pj, hoja, cat, onHoja, onPJ, onCerrar } = $props()

  const base = $state.snapshot(hoja)
  const nivel = (base.nivel ?? 1) + 1
  const logros = logrosDeNivel(nivel)
  const PASOS = [
    ...(logros.experiencia ? [{ id: 'logros', nombre: 'Logros' }] : []),
    { id: 'mejoras', nombre: 'Mejoras' },
    { id: 'carta', nombre: 'Carta' },
    { id: 'listo', nombre: 'Resumen' },
  ]

  let paso = $state(0)
  let experiencia = $state('')
  let mejoras = $state([]) // [{ tipo, detalle }]
  let carta = $state(null)
  let elegirCartaPara = $state(null) // 'paso' | índice de la mejora "carta"
  let buscar = $state('')
  let guardando = $state(false)
  let hecho = $state(null)
  let error = $state('')

  const eleccion = $derived({ mejoras: $state.snapshot(mejoras), experiencia, carta })
  const costo = $derived(mejoras.reduce((s, m) => s + (OPCION[m.tipo]?.costo ?? 0), 0))
  const restante = $derived(MEJORAS_POR_NIVEL - costo)
  const opciones = $derived(opcionesDisponiblesCon(mejoras))
  const errores = $derived(validarSubida(base, eleccion, cat?.porId?.cartas))
  const vistaPrevia = $derived(errores.length ? null : aplicarSubida(base, pj, eleccion))

  // Disponibilidad contando lo que ya se eligió en este nivel
  function opcionesDisponiblesCon(lista) {
    const extra = []
    const avances = [...(base.avances ?? [])]
    for (const m of lista) extra.push({ nivel, tipo: m.tipo, rango: seccionPara([...avances, ...extra], m.tipo, nivel) ?? 0 })
    return opcionesDisponibles(base, nivel, extra)
  }
  const ETAPAS = ['base', 'especializacion', 'maestria']
  const etapaTras = (i) => NOMBRE_ETAPA[ETAPAS[ETAPAS.indexOf(base.subclase_etapa ?? 'base') + 1 + mejoras.slice(0, i).filter((x) => x.tipo === 'subclase').length]] ?? 'Maestría'

  function agregar(tipo) {
    const detalle = tipo === 'rasgos' ? { rasgos: [] } : tipo === 'experiencias' ? { indices: [] } : tipo === 'carta' ? { carta: null } : tipo === 'multiclase' ? { clase: null, dominio: null, subclase: null } : null
    mejoras = [...mejoras, { tipo, detalle }]
  }
  function quitar(i) { mejoras = mejoras.filter((_, j) => j !== i) }
  function alternar(lista, valor, max = 2) {
    if (lista.includes(valor)) return lista.filter((x) => x !== valor)
    return lista.length >= max ? [...lista.slice(1), valor] : [...lista, valor]
  }

  // Rasgos marcados que no se pueden subir (al nivel 5 y 8 se borran las marcas)
  const marcadosBase = logros.limpiarRasgos ? [] : base.rasgos_mejorados ?? []
  const rasgoOcupado = (id, i) => marcadosBase.includes(id) || mejoras.some((m, j) => j !== i && m.tipo === 'rasgos' && m.detalle.rasgos.includes(id))

  const experiencias = $derived([...(base.experiencias ?? []).map((x) => x.nombre || 'Sin nombre'), ...(logros.experiencia ? [experiencia.trim() || 'Experiencia nueva'] : [])])

  // Cartas válidas: de tus dominios, nivel ≤ nuevo nivel; del dominio de multiclase, ≤ la mitad (hacia arriba)
  const multiDominio = $derived(mejoras.find((m) => m.tipo === 'multiclase')?.detalle?.dominio ?? base.multiclase?.dominio ?? null)
  const misDominios = $derived(base.dominios?.length ? base.dominios : cat?.porId?.clases?.[base.clase]?.dominios ?? [])
  const tengo = $derived(new Set([...(base.cartas?.mano ?? []), ...(base.cartas?.boveda ?? [])]))
  const elegidas = $derived(new Set([carta, ...mejoras.filter((m) => m.tipo === 'carta').map((m) => m.detalle.carta)].filter(Boolean)))
  const quitarAcentos = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const cartasValidas = $derived.by(() => {
    const t = quitarAcentos(buscar.trim())
    return (cat?.cartas ?? [])
      .filter((c) => {
        const n = c.nivel ?? 1
        if (tengo.has(c.id) || elegidas.has(c.id)) return false
        if (c.fuente === 'Casero') return n <= nivel
        if (misDominios.includes(c.dominio) && c.dominio !== multiDominio) return n <= nivel
        if (c.dominio === multiDominio) return n <= Math.ceil(nivel / 2)
        return false
      })
      .filter((c) => !t || quitarAcentos(`${c.nombre} ${c.nombre_en ?? ''} ${c.texto ?? ''}`).includes(t))
      .sort((a, b) => (b.nivel ?? 1) - (a.nivel ?? 1) || a.nombre.localeCompare(b.nombre))
      .slice(0, 60)
  })
  const nombreCarta = (id) => cat?.porId?.cartas?.[id]?.nombre ?? id
  function tomarCarta(id) {
    if (elegirCartaPara === 'paso') carta = id
    else if (typeof elegirCartaPara === 'number') mejoras[elegirCartaPara].detalle.carta = id
    elegirCartaPara = null
    buscar = ''
  }

  const clasesMulti = $derived((cat?.clases ?? []).filter((c) => c.id !== base.clase))
  const pasoActual = $derived(PASOS[paso].id)
  const puedeSeguir = $derived(
    pasoActual === 'logros' ? !!experiencia.trim()
    : pasoActual === 'mejoras' ? restante === 0
    : true,
  )

  async function subir() {
    error = ''
    if (errores.length) { error = errores[0]; return }
    guardando = true
    try {
      const r = aplicarSubida(base, pj, eleccion)
      for (const k of clavesCambiadas(base, r.hoja)) await onHoja([k], r.hoja[k])
      if (r.pj.estres_max !== pj.estres_max) await onPJ({ estres_max: r.pj.estres_max })
      hecho = r
    } catch (e) {
      error = e.message
    } finally {
      guardando = false
    }
  }
</script>

<Dialogo titulo={hecho ? `¡Nivel ${nivel}!` : `Subir a nivel ${nivel}`} subtitulo={hecho ? '' : `Rango ${rangoDeNivel(nivel)} · paso ${paso + 1} de ${PASOS.length}`} {onCerrar} ancho={540}>
  {#if hecho}
    <ul class="resumen">{#each hecho.resumen as linea}<li>{linea}</li>{/each}</ul>
    <p class="nota">Puedes cambiar una carta que ya tenías por otra de nivel igual o menor desde la pestaña Cartas.</p>
  {:else}
    <nav class="pasos" aria-label="Pasos">
      {#each PASOS as p, i}
        <span class:activo={i === paso} class:hecho={i < paso}>{i + 1}. {p.nombre}</span>
      {/each}
    </nav>

    {#if elegirCartaPara !== null}
      <div class="buscador">
        <input class="campo" placeholder="Buscar carta" bind:value={buscar} aria-label="Buscar carta" />
        <button class="boton chico" onclick={() => (elegirCartaPara = null)}>Volver</button>
      </div>
      <p class="nota">Cartas de tus dominios de nivel {nivel} o menor{multiDominio ? `; del dominio de multiclase, nivel ${Math.ceil(nivel / 2)} o menor` : ''}.</p>
      <div class="cartas">
        {#each cartasValidas as c (c.id)}
          <Carta carta={c} dominio={cat?.porId?.dominios?.[c.dominio]} compacta>
            {#snippet acciones()}<button class="boton chico" onclick={() => tomarCarta(c.id)}>Elegir</button>{/snippet}
          </Carta>
        {:else}
          <p class="nota">No hay cartas que coincidan.</p>
        {/each}
      </div>

    {:else if pasoActual === 'logros'}
      <h4>Logros de rango</h4>
      <ul class="lista">
        <li>Ganas una Experiencia nueva a <b>+2</b>.</li>
        <li>Tu Competencia sube a <b>{(base.competencia ?? 1) + 1}</b>.</li>
        {#if logros.limpiarRasgos}<li>Se borran las marcas de tus rasgos: puedes volver a subirlos.</li>{/if}
      </ul>
      <label class="campo-etq">Nombre de tu Experiencia nueva
        <input class="campo" bind:value={experiencia} placeholder="p. ej. Negociar con mercaderes" />
      </label>

    {:else if pasoActual === 'mejoras'}
      <h4>Elige {MEJORAS_POR_NIVEL} mejoras <small>te {restante === 1 ? 'queda' : 'quedan'} {restante}</small></h4>
      <div class="opciones">
        {#each opciones as o (o.id)}
          {@const caro = o.costo > restante}
          <button class="opcion" disabled={!o.disponible || caro} onclick={() => agregar(o.id)} title={o.razon ?? ''}>
            <span class="cab"><strong>{o.nombre}</strong>{#if o.costo === 2}<span class="etq">cuesta 2</span>{/if}<span class="libres">{o.disponible ? `${o.libres} libre${o.libres === 1 ? '' : 's'}` : '—'}</span></span>
            <small>{o.razon ?? o.texto}</small>
          </button>
        {/each}
      </div>

      {#if mejoras.length}
        <h4>Elegidas</h4>
        {#each mejoras as m, i}
          <div class="elegida">
            <div class="cab"><strong>{OPCION[m.tipo].nombre}</strong><button class="quitar" onclick={() => quitar(i)} aria-label="Quitar {OPCION[m.tipo].nombre}">✕</button></div>
            {#if m.tipo === 'rasgos'}
              <div class="chips">
                {#each RASGOS as r (r.id)}
                  {@const v = Number(base.rasgos?.[r.id] ?? 0)}
                  <button class="chip" class:activo={m.detalle.rasgos.includes(r.id)} disabled={rasgoOcupado(r.id, i)} aria-pressed={m.detalle.rasgos.includes(r.id)}
                    onclick={() => (mejoras[i].detalle.rasgos = alternar(m.detalle.rasgos, r.id))}>{r.nombre} {v >= 0 ? '+' : '−'}{Math.abs(v)}</button>
                {/each}
              </div>
            {:else if m.tipo === 'experiencias'}
              <div class="chips">
                {#each experiencias as nombre, j}
                  <button class="chip" class:activo={m.detalle.indices.includes(j)} aria-pressed={m.detalle.indices.includes(j)}
                    onclick={() => (mejoras[i].detalle.indices = alternar(m.detalle.indices, j))}>{nombre}</button>
                {/each}
              </div>
            {:else if m.tipo === 'carta'}
              <button class="boton chico" onclick={() => (elegirCartaPara = i)}>{m.detalle.carta ? nombreCarta(m.detalle.carta) : 'Elegir carta'}</button>
            {:else if m.tipo === 'multiclase'}
              <div class="selects">
                <label>Clase
                  <select class="campo" value={m.detalle.clase ?? ''} onchange={(e) => (mejoras[i].detalle = { clase: e.currentTarget.value || null, dominio: null, subclase: null })}>
                    <option value="">Elegir…</option>
                    {#each clasesMulti as c (c.id)}<option value={c.id}>{c.nombre}</option>{/each}
                  </select>
                </label>
                {#if m.detalle.clase}
                  {@const cl = cat?.porId?.clases?.[m.detalle.clase]}
                  <label>Dominio
                    <select class="campo" value={m.detalle.dominio ?? ''} onchange={(e) => (mejoras[i].detalle.dominio = e.currentTarget.value || null)}>
                      <option value="">Elegir…</option>
                      {#each cl?.dominios ?? [] as d}<option value={d}>{cat?.porId?.dominios?.[d]?.nombre ?? d}</option>{/each}
                    </select>
                  </label>
                  <label>Subclase (carta Base)
                    <select class="campo" value={m.detalle.subclase ?? ''} onchange={(e) => (mejoras[i].detalle.subclase = e.currentTarget.value || null)}>
                      <option value="">Elegir…</option>
                      {#each cl?.subclases ?? [] as s}<option value={s}>{cat?.porId?.subclases?.[s]?.nombre ?? s}</option>{/each}
                    </select>
                  </label>
                {/if}
              </div>
              <p class="nota">Ganas el rasgo de clase (no el de Esperanza). Anótalo en Rasgos caseros si hace falta.</p>
            {:else if m.tipo === 'subclase'}
              <p class="nota">Tu subclase pasa a {etapaTras(i)}.</p>
            {/if}
          </div>
        {/each}
      {/if}

    {:else if pasoActual === 'carta'}
      <h4>Carta de dominio nueva</h4>
      <p class="nota">Toma una carta de tus dominios de nivel {nivel} o menor. Si tu mano está llena ({(base.cartas?.mano ?? []).length}/5), va a la bóveda.</p>
      {#if carta}
        <Carta carta={cat?.porId?.cartas?.[carta]} dominio={cat?.porId?.dominios?.[cat?.porId?.cartas?.[carta]?.dominio]} compacta>
          {#snippet acciones()}
            <button class="boton chico" onclick={() => (elegirCartaPara = 'paso')}>Cambiar</button>
            <button class="boton chico" onclick={() => (carta = null)}>Quitar</button>
          {/snippet}
        </Carta>
      {:else}
        <button class="boton" onclick={() => (elegirCartaPara = 'paso')}>Elegir carta</button>
        <p class="nota">Si no la eliges ahora, puedes agregarla después desde la pestaña Cartas.</p>
      {/if}

    {:else}
      <h4>Así queda tu personaje</h4>
      {#if errores.length}
        <ul class="errores">{#each errores as e}<li>{e}</li>{/each}</ul>
      {:else if vistaPrevia}
        <ul class="resumen">{#each vistaPrevia.resumen as linea}<li>{linea}</li>{/each}</ul>
      {/if}
    {/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  {/if}

  {#snippet pie()}
    {#if hecho}
      <button class="boton principal" onclick={onCerrar}>Listo</button>
    {:else if elegirCartaPara === null}
      {#if paso > 0}<button class="boton" onclick={() => paso--}>Anterior</button>{/if}
      {#if paso < PASOS.length - 1}
        <button class="boton principal" disabled={!puedeSeguir} onclick={() => paso++}>Siguiente</button>
      {:else}
        <button class="boton principal" disabled={!!errores.length || guardando} onclick={subir}>Subir a nivel {nivel}</button>
      {/if}
    {/if}
  {/snippet}
</Dialogo>

<style>
  h4 { margin: 0.2rem 0 0; font-family: var(--fuente-titulo); font-size: 1.05rem; display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap; }
  h4 small { font-family: var(--fuente); font-size: 0.78rem; color: var(--pergamino-suave); font-weight: 600; }
  .pasos { display: flex; gap: 0.3rem; flex-wrap: wrap; }
  .pasos span { font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 999px; border: 1px solid var(--linea); color: var(--pergamino-suave); }
  .pasos .activo { background: var(--pergamino); color: var(--tinta); border-color: var(--pergamino); }
  .pasos .hecho { border-color: rgba(127, 214, 168, 0.6); color: var(--pergamino); }
  .lista, .resumen, .errores { margin: 0; padding-left: 1.2rem; display: grid; gap: 0.25rem; font-size: 0.9rem; }
  .resumen li::marker { color: var(--exito); }
  .errores { color: #ffd0d6; }
  .campo-etq { display: grid; gap: 0.3rem; font-size: 0.86rem; font-weight: 700; }
  .opciones { display: grid; gap: 0.35rem; }
  .opcion { display: grid; gap: 0.1rem; text-align: left; border: 1px solid var(--linea); background: rgba(255, 245, 230, 0.05); border-radius: 12px; padding: 0.45rem 0.7rem; }
  .opcion:not(:disabled):hover { background: rgba(255, 245, 230, 0.11); border-color: var(--esperanza); }
  .opcion:disabled { opacity: 0.5; cursor: not-allowed; }
  .opcion small { color: var(--pergamino-suave); font-size: 0.78rem; }
  .cab { display: flex; gap: 0.45rem; align-items: center; flex-wrap: wrap; }
  .cab strong { flex: 1; min-width: 8rem; }
  .etq { font-size: 0.7rem; font-weight: 800; padding: 0 0.45rem; border-radius: 999px; background: rgba(167, 124, 232, 0.35); }
  .libres { font-size: 0.72rem; font-weight: 800; color: var(--pergamino-suave); }
  .elegida { display: grid; gap: 0.4rem; padding: 0.55rem 0.7rem; border-radius: 12px; border: 1px solid rgba(240, 189, 85, 0.5); background: rgba(240, 189, 85, 0.08); }
  .quitar { border: 0; background: none; color: var(--pergamino-suave); padding: 0.1rem 0.35rem; }
  .chips { display: flex; gap: 0.3rem; flex-wrap: wrap; }
  .chip { border: 1px solid var(--linea); background: none; border-radius: 999px; padding: 0.3rem 0.65rem; font-weight: 700; font-size: 0.82rem; }
  .chip.activo { background: var(--esperanza); color: var(--tinta); border-color: var(--esperanza); }
  .chip:disabled { opacity: 0.35; text-decoration: line-through; cursor: not-allowed; }
  .selects { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 0.4rem; }
  .selects label { display: grid; gap: 0.2rem; font-size: 0.78rem; color: var(--pergamino-suave); }
  .selects select { padding: 0.4rem; }
  .buscador { display: flex; gap: 0.4rem; }
  .cartas { display: grid; gap: 0.45rem; }
  .nota { margin: 0; font-size: 0.82rem; color: var(--pergamino-suave); }
  .chico { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
  .error { margin: 0; color: #ffb3bd; font-size: 0.88rem; }
  .principal { background: linear-gradient(135deg, #f6cf72, #e09a35 55%, #b9641c); color: #2a1606; border: 0; }
</style>

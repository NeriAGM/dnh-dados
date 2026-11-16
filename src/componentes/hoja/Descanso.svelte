<script>
  // Descanso corto o largo: dos movimientos (se puede repetir uno), tiradas de 1d4 + Rango
  // por el lanzador del servidor y recordatorios para la mesa.
  import Dialogo from './Dialogo.svelte'
  import Icono from '../Icono.svelte'
  import {
    MOVIMIENTOS, MOVIMIENTOS_POR_DESCANSO, formulaDescanso, validarDescanso, aplicarDescanso,
    efectosDeDescanso, avisoDescansosSeguidos, avisoMiedoDescanso,
  } from '../../lib/ayudas.js'

  let { pj, hoja, tirarDado, onHoja, onPJ, onCerrar } = $props()

  let tipo = $state(avisoDescansosSeguidos(hoja) ? 'largo' : 'corto')
  let elegidos = $state([]) // [{ id, enGrupo }]
  let proyecto = $state('')
  let trabajando = $state(false)
  let resultado = $state(null) // { detalle, tiradas }
  let error = $state('')

  const f = $derived(formulaDescanso(hoja.nivel ?? 1))
  const movs = $derived(MOVIMIENTOS[tipo])
  const avisoSeguidos = $derived(avisoDescansosSeguidos(hoja))
  const listo = $derived(!validarDescanso(tipo, elegidos))

  function cambiarTipo(t) { tipo = t; elegidos = [] }
  function elegir(id) {
    if (elegidos.length >= MOVIMIENTOS_POR_DESCANSO) elegidos = [elegidos[1]]
    elegidos = [...elegidos, { id, enGrupo: false }]
  }
  const veces = (id) => elegidos.filter((e) => e.id === id).length
  const nombreMov = (id) => movs.find((m) => m.id === id)?.nombre ?? id

  async function descansar() {
    error = ''
    const fallo = validarDescanso(tipo, elegidos)
    if (fallo) { error = fallo; return }
    trabajando = true
    try {
      const conValor = []
      const tiradas = []
      for (const e of elegidos) {
        const mov = movs.find((m) => m.id === e.id)
        let valor = null
        if (mov.tirada) {
          const t = await tirarDado({ tipo: 'libre', grupos: [{ lados: f.lados, cantidad: 1, rol: 'normal' }], modificador: f.mod, etiqueta: `${mov.nombre} (descanso)` })
          valor = t.total
          tiradas.push({ nombre: mov.nombre, dado: t.dados?.[0]?.valor, total: t.total })
        }
        conValor.push({ ...e, valor })
      }
      const antes = {
        pg: hoja.pg ?? 0, pg_max: hoja.pg_max ?? 6,
        estres: pj.estres, estres_max: pj.estres_max,
        armadura: hoja.armadura_marcada ?? 0, armadura_max: hoja.armadura?.puntuacion ?? 0,
        esperanza: pj.esperanza, esperanza_max: pj.esperanza_max,
      }
      const s = aplicarDescanso(tipo, antes, conValor)
      if (s.pg !== antes.pg) await onHoja(['pg'], s.pg)
      if (s.armadura !== antes.armadura) await onHoja(['armadura_marcada'], s.armadura)
      const cambiosPJ = {}
      if (s.estres !== antes.estres) cambiosPJ.estres = s.estres
      if (s.esperanza !== antes.esperanza) cambiosPJ.esperanza = s.esperanza
      if (Object.keys(cambiosPJ).length) await onPJ(cambiosPJ)
      for (const [k, v] of Object.entries(efectosDeDescanso(tipo, hoja))) await onHoja([k], v)
      if (tipo === 'largo' && proyecto.trim() && elegidos.some((e) => e.id === 'proyecto')) {
        const linea = `- Proyecto (descanso largo, nivel ${hoja.nivel ?? 1}): ${proyecto.trim()}`
        await onHoja(['notas'], [hoja.notas ?? '', linea].filter(Boolean).join('\n'))
      }
      resultado = { detalle: s.detalle, tiradas, tipo }
    } catch (e) {
      error = e.message
    } finally {
      trabajando = false
    }
  }
</script>

<Dialogo titulo={resultado ? 'Descanso terminado' : 'Descansar'} subtitulo={resultado ? '' : `Elige ${MOVIMIENTOS_POR_DESCANSO} movimientos; puedes repetir el mismo`} {onCerrar}>
  {#if !resultado}
    <div class="segmentos" role="radiogroup" aria-label="Tipo de descanso">
      <button role="radio" aria-checked={tipo === 'corto'} class:on={tipo === 'corto'} onclick={() => cambiarTipo('corto')}>Descanso corto <small>~1 hora</small></button>
      <button role="radio" aria-checked={tipo === 'largo'} class:on={tipo === 'largo'} onclick={() => cambiarTipo('largo')}>Descanso largo <small>varias horas</small></button>
    </div>
    {#if avisoSeguidos}<p class="aviso">{avisoSeguidos}</p>{/if}
    <p class="nota">Antes de empezar puedes mover cartas entre tu mano y tu bóveda sin pagar Estrés.</p>

    <div class="movimientos">
      {#each movs as m (m.id)}
        {@const n = veces(m.id)}
        <button class="mov" class:on={n > 0} onclick={() => elegir(m.id)} aria-pressed={n > 0}>
          <span class="cab">
            <strong>{m.nombre}</strong>
            {#if m.tirada}<span class="formula">1d4 + {f.mod}</span>{/if}
            {#if n}<span class="veces" aria-label="Elegido {n} {n === 1 ? 'vez' : 'veces'}">×{n}</span>{/if}
          </span>
          <small>{m.texto}</small>
        </button>
      {/each}
    </div>

    <ol class="elegidos" aria-label="Movimientos elegidos">
      {#each Array(MOVIMIENTOS_POR_DESCANSO) as _, i}
        {@const e = elegidos[i]}
        <li class:vacio={!e}>
          {#if e}
            <span>{nombreMov(e.id)}</span>
            {#if e.id === 'prepararse'}
              <label class="grupo"><input type="checkbox" bind:checked={elegidos[i].enGrupo} /> con el grupo (+2)</label>
            {/if}
            <button class="icono" onclick={() => (elegidos = elegidos.filter((_, j) => j !== i))} aria-label="Quitar {nombreMov(e.id)}"><Icono nombre="cerrar" tam={16} /></button>
          {:else}
            <span>Movimiento {i + 1}: toca uno de arriba</span>
          {/if}
        </li>
      {/each}
    </ol>

    {#if tipo === 'largo' && elegidos.some((e) => e.id === 'proyecto')}
      <label class="proyecto">¿En qué avanzaste tu proyecto? <small>(se anota en tus notas; el DJ avanza la cuenta regresiva)</small>
        <input class="campo" bind:value={proyecto} placeholder="p. ej. Descifrar el mapa de la torre" />
      </label>
    {/if}
  {:else}
    <ul class="resumen">
      {#each resultado.detalle as d}
        <li><strong>{d.nombre}</strong>
          <span>{#if d.id === 'proyecto'}pídele al DJ que avance tu cuenta regresiva{:else if d.id === 'prepararse'}+{d.cantidad} de Esperanza{:else}limpiaste {d.cantidad}{d.tirada != null ? ` (1d4 + ${f.mod} = ${d.tirada})` : ''}{/if}</span>
        </li>
      {/each}
    </ul>
    {#if resultado.tipo === 'largo'}<p class="nota">Se recargan los usos «por descanso» y «por descanso largo».</p>{:else}<p class="nota">Se recargan los usos «por descanso».</p>{/if}
  {/if}

  <p class="miedo"><Icono nombre="alerta" tam={18} /> {avisoMiedoDescanso(resultado?.tipo ?? tipo)}</p>
  {#if error}<p class="aviso-error" role="alert">{error}</p>{/if}

  {#snippet pie()}
    {#if resultado}
      <button class="boton solido" onclick={onCerrar}>Listo</button>
    {:else}
      <button class="boton" onclick={onCerrar}>Cancelar</button>
      <button class="boton solido" disabled={!listo || trabajando} onclick={descansar}>{trabajando ? 'Tirando…' : 'Descansar'}</button>
    {/if}
  {/snippet}
</Dialogo>

<style>
  .segmentos { display: flex; gap: 0.4rem; }
  .segmentos button { flex: 1; display: grid; min-height: 3rem; border: 1px solid var(--filete); background: var(--hundido); border-radius: var(--radio-control); padding: 0.45rem 0.5rem; font-weight: 900; color: var(--texto); }
  .segmentos button:hover { background: var(--hundido-2); }
  .segmentos small { font-weight: 500; font-size: 0.8rem; color: var(--texto-suave); }
  .segmentos .on { background: var(--texto); border-color: var(--texto); color: var(--sobre-color); }
  .segmentos .on small { color: var(--sobre-color); opacity: 0.85; }
  .nota { margin: 0; font-size: 0.85rem; color: var(--texto-suave); }
  .aviso { margin: 0; padding: 0.5rem 0.75rem; border-radius: var(--radio-control); background: var(--critico-suave); border: 1px solid color-mix(in srgb, var(--critico) 50%, transparent); color: var(--critico-hondo); font-size: 0.9rem; font-weight: 700; }
  .movimientos { display: grid; gap: 0.45rem; }
  .mov { display: grid; gap: 0.1rem; text-align: left; border: 1px solid var(--filete); background: var(--hundido); border-radius: var(--radio-control); padding: 0.6rem 0.8rem; min-height: 3rem; color: var(--texto); }
  .mov:hover { background: var(--hundido-2); }
  .mov.on { border-color: var(--esperanza-hondo); background: var(--esperanza-suave); }
  .cab { display: flex; gap: 0.45rem; align-items: center; flex-wrap: wrap; }
  .cab strong { flex: 1; min-width: 8rem; }
  .formula { font-size: 0.8rem; font-weight: 700; padding: 0.05rem 0.5rem; border-radius: 999px; background: var(--hundido-2); font-variant-numeric: tabular-nums; }
  .veces { font-weight: 900; color: var(--sobre-color); background: var(--esperanza-hondo); border-radius: 999px; padding: 0 0.5rem; font-size: 0.85rem; }
  .mov small { color: var(--texto-suave); font-size: 0.85rem; }
  .elegidos { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
  .elegidos li { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; padding: 0.3rem 0.4rem 0.3rem 0.75rem; min-height: 2.75rem; border-radius: var(--radio-control); background: var(--hundido-2); font-weight: 700; }
  .elegidos li span { flex: 1; }
  .elegidos li.vacio { background: none; border: 1px dashed var(--filete-fuerte); color: var(--texto-suave); font-weight: 500; padding-left: 0.75rem; }
  .grupo { display: flex; gap: 0.3rem; align-items: center; font-weight: 500; font-size: 0.85rem; }
  .proyecto { display: grid; gap: 0.3rem; font-size: 0.9rem; font-weight: 700; }
  .proyecto small { font-weight: 500; color: var(--texto-suave); }
  .resumen { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
  .resumen li { display: grid; padding: 0.55rem 0.8rem; border-radius: var(--radio-control); background: var(--exito-suave); border: 1px solid color-mix(in srgb, var(--exito) 40%, transparent); }
  .resumen span { font-size: 0.9rem; }
  .miedo { margin: 0; display: flex; gap: 0.5rem; align-items: flex-start; padding: 0.55rem 0.75rem; border-radius: var(--radio-control); background: var(--miedo-suave); border: 1px solid color-mix(in srgb, var(--miedo) 40%, transparent); font-size: 0.9rem; }
  .miedo :global(svg) { flex: none; margin-top: 0.1rem; color: var(--miedo-hondo); }
</style>

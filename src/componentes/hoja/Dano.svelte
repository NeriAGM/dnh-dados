<script>
  // Recibir daño: umbrales → PG a marcar, con la opción de gastar una casilla de Armadura.
  import Dialogo from './Dialogo.svelte'
  import Icono from '../Icono.svelte'
  import { resolverDano, armaduraLibre } from '../../lib/ayudas.js'
  import { ajustesMesa } from '../../lib/mesa.svelte.js'

  let { hoja, u, onAplicar, onCerrar } = $props()

  // El daño masivo es una regla de la mesa: la decide el DJ en Ajustes
  const masivo = $derived(ajustesMesa().danoMasivo)

  let dano = $state('')
  let tipo = $state('fisico')
  let resistencia = $state(false)
  let directo = $state(false)
  let reduccion = $state('')
  let usarArmadura = $state(false)
  let aplicando = $state(false)
  let error = $state('')

  const r = $derived(resolverDano(dano, hoja, u, { masivo, resistencia, reduccion, directo, usarArmadura }))
  const libres = $derived(armaduraLibre(hoja))
  const hayDano = $derived(dano !== '' && Number(dano) > 0)
  const TONO = { Ninguno: 'ninguno', Menor: 'menor', Mayor: 'mayor', Grave: 'grave', Masivo: 'masivo' }

  async function aplicar() {
    error = ''
    aplicando = true
    try {
      await onAplicar({ pg: r.pgDespues, armadura_marcada: r.armaduraDespues, cae: r.cae })
    } catch (e) {
      error = e.message
    } finally {
      aplicando = false
    }
  }
</script>

<Dialogo titulo="Recibir daño" subtitulo="Umbrales {u.mayor} / {u.grave}{u.sinArmadura ? ' (sin armadura)' : ''}" {onCerrar}>
  <label class="cifra">
    <span class="rotulo">Daño entrante</span>
    <input class="campo" type="number" inputmode="numeric" min="0" placeholder="0" bind:value={dano} aria-label="Daño entrante" />
  </label>

  <div class="segmentos" role="radiogroup" aria-label="Tipo de daño">
    <button role="radio" aria-checked={tipo === 'fisico'} class:on={tipo === 'fisico'} onclick={() => (tipo = 'fisico')}>Físico</button>
    <button role="radio" aria-checked={tipo === 'magico'} class:on={tipo === 'magico'} onclick={() => (tipo = 'magico')}>Mágico</button>
  </div>

  <div class="opciones">
    <label><input type="checkbox" bind:checked={resistencia} /> Tengo resistencia al daño {tipo === 'fisico' ? 'físico' : 'mágico'} <small>(mitad, hacia arriba)</small></label>
    <label><input type="checkbox" bind:checked={directo} /> Daño directo <small>(la Armadura no lo reduce)</small></label>
    <label class="reduce">Reducirlo en <input class="campo num" type="number" min="0" inputmode="numeric" placeholder="0" bind:value={reduccion} /> <small>(rasgos, cartas…)</small></label>
  </div>

  <div class="escala" aria-label="Severidad">
    {#each ['Menor', 'Mayor', 'Grave', ...(masivo ? ['Masivo'] : [])] as s, i}
      <span class="paso {TONO[s]}" class:activo={hayDano && r.severidad === s} class:final={hayDano && r.conArmadura && r.severidadFinal === s}>
        {s}<b>{i + 1} PG</b>
      </span>
    {/each}
  </div>

  {#if masivo}<p class="regla">Regla de la mesa: daño masivo. El doble del umbral Grave ({u.grave * 2}) o más marca 4 PG.</p>{/if}

  {#if hayDano}
    <div class="veredicto {TONO[r.severidadFinal]}" aria-live="polite">
      <strong>{r.pg ? `Marca ${r.pg} PG` : 'No marcas PG'}</strong>
      <small>
        {r.final !== Number(dano) ? `Daño final ${r.final} · ` : ''}{r.severidad}{r.conArmadura ? ` → ${r.severidadFinal} con Armadura` : ''}
        · quedarías en {r.pgDespues}/{hoja.pg_max ?? 6} PG
      </small>
    </div>

    <button class="boton armadura" class:on={r.conArmadura} aria-pressed={r.conArmadura} disabled={!r.puedeArmadura}
      onclick={() => (usarArmadura = !usarArmadura)}>
      {#if r.conArmadura}<Icono nombre="listo" tam={16} />{/if}Marcar una casilla de Armadura
      <small>{directo ? 'no sirve contra daño directo' : libres ? `bajas un escalón · te quedan ${libres}` : 'no te quedan casillas libres'}</small>
    </button>

    {#if r.cae}<p class="aviso">Con esto marcas tu último Punto de Golpe: tendrás que elegir un movimiento de muerte.</p>{/if}
  {/if}
  {#if error}<p class="aviso-error" role="alert">{error}</p>{/if}

  {#snippet pie()}
    <button class="boton" onclick={onCerrar}>Cancelar</button>
    <button class="boton solido" disabled={!hayDano || aplicando} onclick={aplicar}>Aplicar</button>
  {/snippet}
</Dialogo>

<style>
  .cifra { display: grid; gap: 0.25rem; }
  .cifra input { font-size: 2.2rem; font-weight: 900; text-align: center; padding: 0.3rem; min-height: 3.4rem; }
  .segmentos { display: flex; gap: 0.35rem; }
  .segmentos button { flex: 1; min-height: 2.5rem; border: 1px solid var(--filete); background: var(--hundido); border-radius: var(--radio-control); padding: 0.4rem 0.75rem; font-weight: 700; color: var(--texto); }
  .segmentos button:hover { background: var(--hundido-2); }
  .segmentos .on { background: var(--texto); border-color: var(--texto); color: var(--sobre-color); }
  .opciones { display: grid; gap: 0.5rem; font-size: 0.95rem; }
  .opciones label { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; min-height: 2rem; }
  .opciones input[type='checkbox'] { width: 1.2rem; height: 1.2rem; }
  .opciones small { color: var(--texto-suave); font-size: 0.85rem; }
  .num { width: 4.2rem; text-align: center; padding: 0.35rem; }
  .escala { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; border-radius: var(--radio-control); overflow: hidden; border: 1px solid var(--filete); }
  .paso { display: grid; justify-items: center; font-size: 0.85rem; font-weight: 700; padding: 0.5rem 0.2rem; opacity: 0.6; transition: opacity 0.15s, box-shadow 0.15s; }
  .paso b { font-size: 0.75rem; color: var(--texto-suave); }
  .paso.activo, .paso.final { opacity: 1; box-shadow: inset 0 0 0 2.5px var(--texto); }
  .paso.final { box-shadow: inset 0 0 0 2.5px var(--esperanza-hondo); }
  .menor { background: var(--exito-suave); }
  .mayor { background: var(--critico-suave); }
  .grave { background: var(--peligro-suave); }
  .masivo { background: var(--miedo-suave); }
  .ninguno { background: var(--hundido); }
  .veredicto { display: grid; justify-items: center; text-align: center; padding: 0.7rem; border-radius: var(--radio-control); border: 1px solid var(--filete); }
  .veredicto strong { font-size: 1.6rem; font-weight: 900; }
  .veredicto small { font-size: 0.85rem; font-weight: 700; color: var(--texto-suave); }
  .armadura { flex-direction: column; gap: 0.1rem; min-height: 3rem; }
  .armadura small { font-weight: 500; font-size: 0.85rem; color: var(--texto-suave); }
  .armadura.on { background: var(--esperanza-suave); border-color: var(--esperanza-hondo); color: var(--texto); }
  .regla { margin: 0; font-size: 0.85rem; color: var(--texto-suave); }
  .aviso { margin: 0; padding: 0.55rem 0.75rem; border-radius: var(--radio-control); background: var(--peligro-suave); border: 1px solid color-mix(in srgb, var(--peligro) 40%, transparent); color: var(--peligro-hondo); font-size: 0.9rem; font-weight: 700; }
</style>

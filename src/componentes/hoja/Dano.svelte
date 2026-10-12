<script>
  // Recibir daño: umbrales → PG a marcar, con la opción de gastar una casilla de Armadura.
  import Dialogo from './Dialogo.svelte'
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
    <span>Daño entrante</span>
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
      <span class="titulo">{r.pg ? `Marca ${r.pg} PG` : 'No marcas PG'}</span>
      <small>
        {r.final !== Number(dano) ? `Daño final ${r.final} · ` : ''}{r.severidad}{r.conArmadura ? ` → ${r.severidadFinal} con Armadura` : ''}
        · quedarías en {r.pgDespues}/{hoja.pg_max ?? 6} PG
      </small>
    </div>

    <button class="boton armadura" class:on={r.conArmadura} aria-pressed={r.conArmadura} disabled={!r.puedeArmadura}
      onclick={() => (usarArmadura = !usarArmadura)}>
      {r.conArmadura ? '✓ ' : ''}Marcar una casilla de Armadura
      <small>{directo ? 'no sirve contra daño directo' : libres ? `bajas un escalón · te quedan ${libres}` : 'no te quedan casillas libres'}</small>
    </button>

    {#if r.cae}<p class="aviso">Con esto marcas tu último Punto de Golpe: tendrás que elegir un movimiento de muerte.</p>{/if}
  {/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}

  {#snippet pie()}
    <button class="boton" onclick={onCerrar}>Cancelar</button>
    <button class="boton principal" disabled={!hayDano || aplicando} onclick={aplicar}>Aplicar</button>
  {/snippet}
</Dialogo>

<style>
  .cifra { display: grid; gap: 0.25rem; font-size: 0.82rem; color: var(--pergamino-suave); font-weight: 700; }
  .cifra input { font-size: 2rem; font-family: var(--fuente-titulo); font-weight: 900; text-align: center; padding: 0.3rem; }
  .segmentos { display: flex; gap: 0.3rem; }
  .segmentos button { flex: 1; border: 1px solid var(--linea); background: none; border-radius: 999px; padding: 0.4rem 0.75rem; font-weight: 700; font-size: 0.88rem; }
  .segmentos .on { background: var(--pergamino); color: var(--tinta); }
  .opciones { display: grid; gap: 0.4rem; font-size: 0.88rem; }
  .opciones label { display: flex; gap: 0.45rem; align-items: center; flex-wrap: wrap; }
  .opciones small { color: var(--pergamino-suave); }
  .num { width: 4.2rem; text-align: center; padding: 0.35rem; }
  .escala { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; border-radius: 14px; overflow: hidden; border: 1px solid var(--linea); }
  .paso { display: grid; justify-items: center; font-size: 0.78rem; font-weight: 700; padding: 0.45rem 0.2rem; opacity: 0.55; transition: opacity 0.15s, box-shadow 0.15s; }
  .paso b { font-size: 0.7rem; opacity: 0.85; }
  .paso.activo, .paso.final { opacity: 1; box-shadow: inset 0 0 0 2px var(--pergamino); }
  .paso.final { box-shadow: inset 0 0 0 2px #8fb7d9; }
  .menor { background: rgba(127, 214, 168, 0.18); }
  .mayor { background: rgba(240, 189, 85, 0.2); }
  .grave { background: rgba(217, 74, 92, 0.28); }
  .masivo { background: rgba(167, 124, 232, 0.3); }
  .ninguno { background: rgba(255, 245, 230, 0.06); }
  .veredicto { display: grid; justify-items: center; text-align: center; padding: 0.6rem; border-radius: 14px; border: 1px solid var(--linea); }
  .veredicto .titulo { font-size: 1.6rem; text-shadow: none; }
  .veredicto small { font-size: 0.82rem; font-weight: 600; }
  .armadura { display: grid; justify-items: center; gap: 0.1rem; border-color: rgba(143, 183, 217, 0.55); }
  .armadura small { font-weight: 500; font-size: 0.78rem; color: var(--pergamino-suave); }
  .armadura.on { background: rgba(143, 183, 217, 0.3); border-color: #8fb7d9; }
  .regla { margin: 0; font-size: 0.8rem; color: var(--pergamino-suave); }
  .aviso { margin: 0; padding: 0.5rem 0.7rem; border-radius: 12px; background: rgba(217, 74, 92, 0.18); border: 1px solid rgba(217, 74, 92, 0.5); font-size: 0.86rem; }
  .error { margin: 0; color: #ffb3bd; font-size: 0.88rem; }
  .principal { background: linear-gradient(135deg, #f6cf72, #e09a35 55%, #b9641c); color: #2a1606; border: 0; }
</style>

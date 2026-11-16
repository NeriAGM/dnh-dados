<script>
  import { md } from '../../lib/md.js'

  let { carta, dominio = null, compacta = false, acciones } = $props()

  const COLOR = {
    arcana: '#7a5cff', blade: '#d94a5c', bone: '#c9c2b2', codex: '#4a8fe0', grace: '#e86fb5',
    midnight: '#3a3f8f', sage: '#4fae6b', splendor: '#f0bd55', valor: '#e07b2e', dread: '#6b2a3a',
  }
  const TIPO = { habilidad: 'Habilidad', hechizo: 'Hechizo', grimorio: 'Grimorio' }
  let abierta = $state(false)
  const color = $derived(COLOR[carta?.dominio] ?? '#8a90a8')
</script>

{#if carta}
  <article class="carta" class:compacta style:--dom={color}>
    <button class="cabeza" onclick={() => (abierta = !abierta)} aria-expanded={!compacta || abierta}>
      <span class="nivel" aria-label="Nivel {carta.nivel}"><small>Nv</small>{carta.nivel ?? '·'}</span>
      <span class="titulo-carta">
        <strong>{carta.nombre}</strong>
        <span class="dominio"><i aria-hidden="true"></i>{dominio?.nombre ?? carta.dominio} · {TIPO[carta.tipo] ?? carta.tipo}{carta.fuente && carta.fuente !== 'SRD 1.0' ? ` · ${carta.fuente}` : ''}</span>
      </span>
      {#if carta.recuerdo}<span class="recuerdo" title="Costo de recuperación: Estrés que pagas para sacarla de la bóveda" aria-label="Costo de recuperación {carta.recuerdo}"><small>Costo</small>{carta.recuerdo}</span>{/if}
    </button>
    {#if !compacta || abierta}
      <div class="texto">{@html md(carta.texto)}</div>
    {/if}
    {#if acciones}<div class="acciones">{@render acciones()}</div>{/if}
  </article>
{/if}

<style>
  .carta {
    border-radius: var(--radio-control);
    border: 1px solid var(--filete);
    background: rgb(255 255 255 / 0.7);
    box-shadow: inset 0 3px 0 var(--dom);
    overflow: hidden;
  }
  .cabeza {
    display: flex; align-items: center; gap: 0.7rem; width: 100%; min-height: 3.2rem;
    background: none; border: 0; padding: 0.7rem 0.8rem 0.6rem; text-align: left; color: var(--texto);
  }
  .cabeza:hover { background: var(--hundido); }
  .nivel {
    display: grid; place-items: center; flex: none;
    width: 2.4rem; height: 2.6rem; line-height: 1;
    background: color-mix(in srgb, var(--dom) 30%, white); border: 1.5px solid var(--dom); color: var(--texto);
    border-radius: 10px;
    font-weight: 900; font-size: 1.15rem;
  }
  .nivel small, .recuerdo small { display: block; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--texto-suave); }
  .titulo-carta { display: grid; min-width: 0; flex: 1; gap: 0.1rem; }
  .titulo-carta strong { font-weight: 900; font-size: 1.05rem; line-height: 1.2; }
  .dominio { display: flex; align-items: center; gap: 0.4rem; color: var(--texto-suave); font-size: 0.85rem; font-weight: 700; }
  .dominio i { flex: none; width: 0.7rem; height: 0.7rem; border-radius: 50%; background: var(--dom); border: 1px solid var(--filete-fuerte); }
  .recuerdo {
    flex: none; min-width: 2.6rem; padding: 0.2rem 0.4rem; border-radius: 10px; text-align: center; line-height: 1.1;
    font-weight: 900; font-size: 1.1rem; background: var(--hundido); border: 1px solid var(--filete);
  }
  .texto { padding: 0 0.9rem 0.7rem; font-size: 0.95rem; line-height: 1.5; }
  .texto :global(p) { margin: 0 0 0.45rem; }
  .texto :global(ul) { margin: 0 0 0.45rem; padding-left: 1.1rem; }
  .texto :global(table) { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 0.45rem; }
  .texto :global(th), .texto :global(td) { border: 1px solid var(--filete); padding: 0.25rem 0.35rem; text-align: left; vertical-align: top; }
  .acciones { display: flex; gap: 0.4rem; padding: 0 0.8rem 0.8rem; flex-wrap: wrap; }
</style>

<script>
  import { md } from '../../lib/md.js'

  let { carta, dominio = null, compacta = false, acciones } = $props()

  const COLOR = {
    arcana: '#7a5cff', blade: '#d94a5c', bone: '#c9c2b2', codex: '#4a8fe0', grace: '#e86fb5',
    midnight: '#3a3f8f', sage: '#4fae6b', splendor: '#f0bd55', valor: '#e07b2e', dread: '#6b2a3a',
  }
  const TIPO = { habilidad: 'Habilidad', hechizo: 'Hechizo', grimorio: 'Grimorio' }
  let abierta = $state(false)
  const color = $derived(COLOR[carta?.dominio] ?? '#9aa0a6')
</script>

{#if carta}
  <article class="carta" class:compacta style:--dom={color}>
    <button class="cabeza" onclick={() => (abierta = !abierta)} aria-expanded={!compacta || abierta}>
      <span class="nivel" aria-label="Nivel {carta.nivel}">{carta.nivel ?? '·'}</span>
      <span class="titulo-carta">
        <strong>{carta.nombre}</strong>
        <small>{dominio?.nombre ?? carta.dominio} · {TIPO[carta.tipo] ?? carta.tipo}{carta.fuente && carta.fuente !== 'SRD 1.0' ? ` · ${carta.fuente}` : ''}</small>
      </span>
      {#if carta.recuerdo}<span class="recuerdo" title="Costo de recuperación">{carta.recuerdo}</span>{/if}
    </button>
    {#if !compacta || abierta}
      <div class="texto">{@html md(carta.texto)}</div>
    {/if}
    {#if acciones}<div class="acciones">{@render acciones()}</div>{/if}
  </article>
{/if}

<style>
  .carta {
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--dom) 45%, transparent);
    background: linear-gradient(160deg, color-mix(in srgb, var(--dom) 22%, rgba(20, 14, 34, 0.9)), rgba(20, 14, 34, 0.92) 45%);
    overflow: hidden;
  }
  .cabeza {
    display: flex; align-items: center; gap: 0.6rem; width: 100%;
    background: none; border: 0; padding: 0.6rem 0.75rem; text-align: left;
  }
  .nivel {
    display: grid; place-items: center; flex: none;
    width: 2rem; height: 2.3rem;
    background: var(--dom); color: #160f24;
    clip-path: polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%);
    font-family: var(--fuente-titulo); font-weight: 900; font-size: 1.05rem;
  }
  .titulo-carta { display: grid; min-width: 0; flex: 1; }
  .titulo-carta strong { font-family: var(--fuente-titulo); font-size: 1.02rem; line-height: 1.2; }
  .titulo-carta small { color: var(--pergamino-suave); font-size: 0.75rem; }
  .recuerdo {
    flex: none; width: 1.7rem; height: 1.7rem; border-radius: 50%;
    display: grid; place-items: center; font-weight: 800; font-size: 0.85rem;
    border: 1.5px solid var(--dom);
  }
  .texto { padding: 0 0.85rem 0.7rem; font-size: 0.9rem; line-height: 1.5; }
  .texto :global(p) { margin: 0 0 0.45rem; }
  .texto :global(ul) { margin: 0 0 0.45rem; padding-left: 1.1rem; }
  .texto :global(table) { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-bottom: 0.45rem; }
  .texto :global(th), .texto :global(td) { border: 1px solid var(--linea); padding: 0.25rem 0.35rem; text-align: left; vertical-align: top; }
  .acciones { display: flex; gap: 0.4rem; padding: 0 0.75rem 0.7rem; flex-wrap: wrap; }
</style>

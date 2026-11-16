<script>
  // Fila de casillas marcables (PG, Estrés, Armadura, Esperanza).
  // Tocar la casilla N deja marcadas N; tocar la última marcada la desmarca.
  // "tachadas" son casillas perdidas para siempre (p. ej. cicatrices en la Esperanza).
  let { nombre, marcadas = 0, maximo = 6, forma = 'cuadro', color = 'var(--peligro)', editable = true, onCambiar, ayuda = '', tachadas = 0 } = $props()

  // Un máximo que no es número (o con decimales) tronaba Array(): "Invalid array length"
  const total = $derived(Math.max(0, Math.floor(Number(maximo) || 0)))
  const perdidas = $derived(Math.max(0, Math.floor(Number(tachadas) || 0)))
  const llenas = $derived(Number(marcadas) || 0)

  function tocar(i) {
    if (!editable) return
    onCambiar?.(llenas === i + 1 ? i : i + 1)
  }
</script>

<div class="casillas" style:--c={color}>
  <span class="nombre" title={ayuda}>{nombre}</span>
  <span class="fila" role="group" aria-label="{nombre}: {llenas} de {total}">
    {#each Array(total) as _, i}
      <button
        class="caja {forma}"
        class:marcada={i < llenas}
        disabled={!editable}
        onclick={() => tocar(i)}
        aria-label="{nombre} {i + 1}"
      ></button>
    {/each}
    {#each Array(perdidas) as _, i}
      <span class="caja {forma} tachada" role="img" aria-label="{nombre}: casilla tachada {i + 1}" title="Tachada para siempre"></span>
    {/each}
  </span>
  <span class="cifra">{llenas}/{total}</span>
</div>

<style>
  .casillas { display: grid; grid-template-columns: 8.5rem 1fr auto; align-items: center; gap: 0.6rem; }
  .nombre { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--texto-suave); }
  .fila { display: flex; flex-wrap: wrap; gap: 6px; }
  .caja {
    width: 28px; height: 28px; padding: 0;
    border: 2px solid var(--c);
    background: transparent;
    border-radius: 8px;
    transition: background 0.15s, transform 0.1s;
  }
  .caja:not(:disabled):active { transform: scale(0.9); }
  /* Esperanza: el mismo círculo que en la tarjeta de la mesa */
  .caja.estrella { border-radius: 50%; }
  .caja.estrella.marcada { box-shadow: 0 0 0 3px var(--esperanza-suave); }
  .caja.escudo { border-radius: 6px 6px 14px 14px; }
  .caja.marcada { background: var(--c); }
  .caja:not(:disabled):hover { background: color-mix(in srgb, var(--c) 40%, transparent); }
  .caja.marcada:not(:disabled):hover { background: color-mix(in srgb, var(--c) 82%, black); }
  .caja:disabled { cursor: default; }
  .caja.tachada { position: relative; display: inline-block; opacity: 0.6; background: transparent; border: 2px dashed var(--texto-suave); clip-path: none; }
  .caja.tachada::after { content: ''; position: absolute; left: -3px; right: -3px; top: 50%; height: 2px; background: var(--peligro); transform: rotate(-45deg); }
  .cifra { font-weight: 900; font-size: 1.1rem; min-width: 3.2ch; text-align: right; font-variant-numeric: tabular-nums; }
  @media (max-width: 480px) { .casillas { grid-template-columns: 1fr auto; } .nombre { grid-column: 1 / -1; } .caja { width: 32px; height: 32px; } }
</style>

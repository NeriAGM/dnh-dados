<script>
  // Fila de casillas marcables (PG, Estrés, Armadura, Esperanza).
  // Tocar la casilla N deja marcadas N; tocar la última marcada la desmarca.
  // "tachadas" son casillas perdidas para siempre (p. ej. cicatrices en la Esperanza).
  let { nombre, marcadas = 0, maximo = 6, forma = 'cuadro', color = 'var(--sangre)', editable = true, onCambiar, ayuda = '', tachadas = 0 } = $props()

  function tocar(i) {
    if (!editable) return
    onCambiar?.(marcadas === i + 1 ? i : i + 1)
  }
</script>

<div class="casillas" style:--c={color}>
  <span class="nombre" title={ayuda}>{nombre}</span>
  <span class="fila" role="group" aria-label="{nombre}: {marcadas} de {maximo}">
    {#each Array(Math.max(0, maximo)) as _, i}
      <button
        class="caja {forma}"
        class:marcada={i < marcadas}
        disabled={!editable}
        onclick={() => tocar(i)}
        aria-label="{nombre} {i + 1}"
      ></button>
    {/each}
    {#each Array(Math.max(0, tachadas)) as _, i}
      <span class="caja {forma} tachada" role="img" aria-label="{nombre}: casilla tachada {i + 1}" title="Tachada para siempre"></span>
    {/each}
  </span>
  <span class="cifra">{marcadas}/{maximo}</span>
</div>

<style>
  .casillas { display: grid; grid-template-columns: 6.5rem 1fr auto; align-items: center; gap: 0.5rem; }
  .nombre { font-size: 0.85rem; font-weight: 700; color: var(--pergamino-suave); }
  .fila { display: flex; flex-wrap: wrap; gap: 4px; }
  .caja {
    width: 20px; height: 20px; padding: 0;
    border: 1.5px solid color-mix(in srgb, var(--c) 70%, white);
    background: transparent;
    border-radius: 4px;
    transition: background 0.15s, transform 0.1s;
  }
  .caja.rombo { transform: rotate(45deg) scale(0.82); border-radius: 3px; }
  .caja.estrella {
    border: 0;
    clip-path: polygon(50% 0, 64% 34%, 100% 50%, 64% 66%, 50% 100%, 36% 66%, 0 50%, 36% 34%);
    background: color-mix(in srgb, var(--c) 28%, transparent);
  }
  .caja.escudo { border-radius: 4px 4px 10px 10px; }
  .caja.marcada { background: var(--c); box-shadow: 0 0 8px color-mix(in srgb, var(--c) 60%, transparent); }
  .caja:not(:disabled):hover { filter: brightness(1.2); }
  .caja:disabled { cursor: default; }
  .caja.tachada { position: relative; display: inline-block; opacity: 0.55; background: transparent; border: 1.5px dashed var(--pergamino-suave); clip-path: none; transform: none; }
  .caja.tachada::after { content: ''; position: absolute; left: -2px; right: -2px; top: 50%; height: 2px; background: var(--sangre); transform: rotate(-45deg); }
  .cifra { font-family: var(--fuente-titulo); font-weight: 900; font-size: 0.95rem; min-width: 3ch; text-align: right; }
  @media (max-width: 480px) { .casillas { grid-template-columns: 5.2rem 1fr auto; } .caja { width: 22px; height: 22px; } }
</style>

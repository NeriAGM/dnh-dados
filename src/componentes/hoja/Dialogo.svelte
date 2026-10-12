<script>
  // Ventana encima de la hoja para las ayudas de reglas (daño, descanso, muerte, nivel).
  let { titulo, subtitulo = '', onCerrar, children, pie, ancho = 480 } = $props()
</script>

<div class="velo" onclick={onCerrar} role="presentation"></div>
<div class="dialogo vidrio" role="dialog" aria-modal="true" aria-label={titulo} style:--ancho="{ancho}px">
  <header>
    <div>
      <h3 class="titulo">{titulo}</h3>
      {#if subtitulo}<p>{subtitulo}</p>{/if}
    </div>
    <button class="cerrar" onclick={onCerrar} aria-label="Cerrar">✕</button>
  </header>
  <div class="contenido">{@render children()}</div>
  {#if pie}<footer>{@render pie()}</footer>{/if}
</div>

<style>
  .velo { position: fixed; inset: 0; z-index: 22; background: rgba(8, 4, 18, 0.5); }
  .dialogo {
    position: fixed; z-index: 23; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: min(var(--ancho), calc(100vw - 1.2rem));
    max-height: calc(100dvh - 1.2rem);
    display: flex; flex-direction: column;
    border-radius: var(--radio-panel);
    background: rgb(24, 16, 41);
    animation: aparecer 0.18s ease-out;
  }
  @keyframes aparecer { from { opacity: 0; transform: translate(-50%, -46%); } }
  header { display: flex; gap: 0.5rem; align-items: flex-start; padding: 0.9rem 1rem 0.4rem; }
  header > div { flex: 1; min-width: 0; }
  h3 { margin: 0; font-size: 1.35rem; line-height: 1.15; }
  header p { margin: 0.15rem 0 0; font-size: 0.82rem; color: var(--pergamino-suave); }
  .cerrar { border: 0; background: none; font-size: 1.1rem; padding: 0.2rem 0.45rem; }
  .contenido { overflow-y: auto; overscroll-behavior: contain; padding: 0.3rem 1rem 0.8rem; display: grid; gap: 0.7rem; align-content: start; }
  footer { padding: 0.6rem 1rem calc(0.9rem + var(--seguro-abajo)); border-top: 1px solid var(--linea); display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end; align-items: center; }
  @media (prefers-reduced-motion: reduce) { .dialogo { animation: none; } }
</style>

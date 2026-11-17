<script>
  // Ventana encima de la hoja para las ayudas de reglas (daño, descanso, muerte, nivel).
  import { onMount } from 'svelte'
  import Icono from '../Icono.svelte'
  let { titulo, subtitulo = '', onCerrar, children, pie, ancho = 480 } = $props()

  // Lo mínimo de accesibilidad: Esc cierra, al abrir el foco va al botón «Cerrar» y al cerrar regresa a quien abrió.
  // (No es una trampa de foco completa.)
  let cerrar
  onMount(() => {
    const antes = document.activeElement
    cerrar?.focus()
    return () => { if (antes instanceof HTMLElement && antes.isConnected) antes.focus() }
  })
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onCerrar() } }} />
<div class="cortina arriba" onclick={onCerrar} role="presentation"></div>
<div class="dialogo vidrio" role="dialog" aria-modal="true" aria-label={titulo} style:--ancho="{ancho}px">
  <header>
    <div>
      <h3>{titulo}</h3>
      {#if subtitulo}<p>{subtitulo}</p>{/if}
    </div>
    <button class="icono" bind:this={cerrar} onclick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" /></button>
  </header>
  <div class="contenido">{@render children()}</div>
  {#if pie}<footer>{@render pie()}</footer>{/if}
</div>

<style>
  .cortina.arriba { z-index: 22; }
  .dialogo {
    position: fixed; z-index: 23; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: min(var(--ancho), calc(100vw - 1.2rem));
    max-height: calc(100dvh - 1.2rem);
    display: flex; flex-direction: column;
    border-radius: var(--radio-panel);
    background: var(--superficie-firme);
    box-shadow: var(--sombra-alta);
    animation: aparecer 0.18s var(--suave);
  }
  @keyframes aparecer { from { opacity: 0; transform: translate(-50%, -46%); } }
  header { display: flex; gap: 0.5rem; align-items: flex-start; padding: 1rem 0.75rem 0.4rem 1.1rem; }
  header > div { flex: 1; min-width: 0; padding-top: 0.2rem; }
  h3 { margin: 0; font-size: 1.5rem; line-height: 1.15; }
  header p { margin: 0.15rem 0 0; font-size: 0.85rem; color: var(--texto-suave); }
  .contenido { overflow-y: auto; overscroll-behavior: contain; padding: 0.3rem 1.1rem 0.9rem; display: grid; gap: 0.75rem; align-content: start; }
  footer { padding: 0.7rem 1.1rem calc(0.9rem + var(--seguro-abajo)); border-top: 1px solid var(--filete); display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end; align-items: center; }
  @media (prefers-reduced-motion: reduce) { .dialogo { animation: none; } }
</style>

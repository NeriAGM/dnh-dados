<script>
  import { onMount } from 'svelte'
  import { app, iniciar } from './lib/mesa.svelte.js'
  import { crearPaisaje, momentoActual } from './lib/fondo/paisaje.js'
  import { crearMesa } from './lib/dados3d/mesa.js'
  import Entrada from './componentes/Entrada.svelte'
  import Campanias from './componentes/Campanias.svelte'
  import Mesa from './componentes/Mesa.svelte'

  let lienzoFondo
  let lienzoDados
  let paisaje = $state(null)
  let mesa3d = $state(null)
  let momento = $state('auto')

  const GUARDADO = 'dnh.momento'

  function aplicarMomento(m) {
    momento = m
    try { localStorage.setItem(GUARDADO, m) } catch {}
    const real = m === 'auto' ? momentoActual() : m
    paisaje?.cambiarMomento(real)
    mesa3d?.ajustarLuz(real)
  }

  onMount(() => {
    const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches
    let guardado = 'auto'
    try { guardado = localStorage.getItem(GUARDADO) || 'auto' } catch {}
    momento = guardado
    const real = guardado === 'auto' ? momentoActual() : guardado
    paisaje = crearPaisaje(lienzoFondo, { momento: real, reducido })
    mesa3d = crearMesa(lienzoDados)
    mesa3d.ajustarLuz(real)

    // En automático, revisa cada minuto si ya cambió el momento del día
    const reloj = setInterval(() => {
      if (momento === 'auto' && paisaje.momento !== momentoActual()) aplicarMomento('auto')
    }, 60_000)

    iniciar()
    return () => { clearInterval(reloj); paisaje.destruir(); mesa3d.destruir() }
  })
</script>

<canvas class="capa fondo" bind:this={lienzoFondo} aria-hidden="true"></canvas>
<canvas class="capa dados" bind:this={lienzoDados} aria-hidden="true"></canvas>

<main class="interfaz">
  {#if app.cargando}
    <p class="cargando titulo">Preparando la mesa…</p>
  {:else if app.demo || app.campania}
    <Mesa {mesa3d} {momento} onMomento={aplicarMomento} />
  {:else if app.sesion}
    <Campanias />
  {:else}
    <Entrada />
  {/if}
</main>

<style>
  .capa {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
  .fondo { z-index: 0; }
  .dados { z-index: 1; pointer-events: none; }
  .interfaz {
    position: fixed;
    inset: 0;
    z-index: 2;
    pointer-events: none;
  }
  .interfaz :global(> *) { pointer-events: auto; }
  .cargando {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    margin: 0;
    font-size: 1.4rem;
  }
</style>

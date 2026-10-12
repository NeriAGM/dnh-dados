<script>
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { app, iniciar } from './lib/mesa.svelte.js'
  import { crearPaisaje, momentoActual } from './lib/fondo/paisaje.js'
  import { crearMesa } from './lib/dados3d/mesa.js'
  import { fondos, fuenteActiva, urlDe, marcarRota, sincronizar } from './lib/fondos.svelte.js'
  import { esPueblo, momentoDePueblo, estiloModo, variablesLegibilidad } from './lib/fondo/ajustes.js'
  import { medirLienzo, medirImagen, cargarImagen } from './lib/fondo/medir.js'
  import Entrada from './componentes/Entrada.svelte'
  import Campanias from './componentes/Campanias.svelte'
  import Mesa from './componentes/Mesa.svelte'

  let lienzoFondo
  let lienzoDados
  let paisaje = $state(null)
  let mesa3d = $state(null)
  let momento = $state('auto')
  let momentoReal = $state(momentoActual())
  let reducido = $state(false)

  const GUARDADO = 'dnh.momento'

  function aplicarMomento(m) {
    momento = m
    try { localStorage.setItem(GUARDADO, m) } catch {}
    momentoReal = m === 'auto' ? momentoActual() : m
  }

  // ---- Qué fondo se ve ahora ----
  const fuente = $derived(fuenteActiva(momentoReal))
  const momentoPueblo = $derived(esPueblo(fuente) ? momentoDePueblo(fuente) : null)
  const modo = $derived(fondos.config.modos[fuente] ?? 'cubrir')
  // La imagen solo se cambia cuando ya cargó, para que el fundido no muestre un hueco
  let mostrada = $state(null) // { id, url, modo, img }
  const brillos = new Map() // caché: 'pueblo:noche' o 'url|modo' -> brillo

  $effect(() => {
    const id = fuente, m = modo
    if (esPueblo(id)) { mostrada = null; return }
    const url = urlDe(id)
    let vigente = true
    cargarImagen(url)
      .then((img) => { if (vigente) mostrada = { id, url, modo: m, img } })
      .catch(() => { if (vigente) marcarRota(id) })
    return () => { vigente = false }
  })

  // ---- El paisaje animado: momento, luz de los dados y pausa ----
  $effect(() => {
    if (!paisaje) return
    const mp = momentoPueblo
    if (mp && paisaje.momento !== mp) paisaje.cambiarMomento(mp)
    mesa3d?.ajustarLuz(mp ?? momentoReal)
    if (mostrada) {
      // Cuando la imagen ya tapó el paisaje, se deja de animar (ahorra batería)
      const t = setTimeout(() => paisaje.pausar(true), 1000)
      return () => clearTimeout(t)
    }
    paisaje.pausar(false)
  })

  // ---- Legibilidad automática ----
  let brillo = $state(0.3)
  let medicion = $state(0) // sube al redimensionar para volver a medir
  $effect(() => {
    medicion
    if (!paisaje) return
    if (mostrada) {
      const clave = `${mostrada.url}|${mostrada.modo}`
      if (!brillos.has(clave)) brillos.set(clave, medirImagen(mostrada.img, mostrada.modo))
      brillo = brillos.get(clave)
    } else if (momentoPueblo) {
      const clave = `pueblo:${momentoPueblo}`
      if (!brillos.has(clave)) brillos.set(clave, medirLienzo(lienzoFondo))
      brillo = brillos.get(clave)
    }
  })
  const leg = $derived(variablesLegibilidad(brillo, fondos.config))
  $effect(() => {
    const raiz = document.documentElement.style
    for (const [k, v] of Object.entries(leg.vars)) raiz.setProperty(k, v)
    fondos.legibilidad = { nivel: leg.nivel, brillo: leg.brillo }
  })

  // ---- Filtros de las barras ----
  const c = $derived(fondos.config)
  const filtro = $derived(
    [c.tono ? `hue-rotate(${c.tono}deg)` : '', c.contraste !== 100 ? `contrast(${c.contraste}%)` : '', c.desenfoque ? `blur(${c.desenfoque}px)` : '']
      .filter(Boolean).join(' ') || null,
  )
  // Velo: lo que el jugador oscurece es parejo; lo automático es una viñeta
  // (más oscura en las orillas, donde está la interfaz) para no apagar la imagen
  const veloAuto = $derived(Number(leg.vars['--velo-auto']))
  const veloFondo = $derived(
    `radial-gradient(ellipse 70% 65% at 50% 52%, rgba(10, 6, 22, ${(veloAuto * 0.3).toFixed(3)}), rgba(10, 6, 22, ${Math.min(0.85, veloAuto * 1.5).toFixed(3)}))`,
  )
  const est = $derived(estiloModo(mostrada?.modo))
  const fundido = $derived(reducido ? 0 : 900)

  // Cuando cambian la sesión, el modo prueba o el perfil, recarga lo del jugador
  $effect(() => { app.demo; app.sesion; app.perfil; sincronizar() })

  onMount(() => {
    reducido = matchMedia('(prefers-reduced-motion: reduce)').matches
    let guardado = 'auto'
    try { guardado = localStorage.getItem(GUARDADO) || 'auto' } catch {}
    momento = guardado
    momentoReal = guardado === 'auto' ? momentoActual() : guardado
    paisaje = crearPaisaje(lienzoFondo, { momento: momentoPueblo ?? momentoReal, reducido })
    mesa3d = crearMesa(lienzoDados)

    // En automático, revisa cada minuto si ya cambió el momento del día
    const reloj = setInterval(() => {
      if (momento === 'auto' && momentoReal !== momentoActual()) momentoReal = momentoActual()
    }, 60_000)
    // Al cambiar el tamaño de la ventana cambia lo que se ve: medir de nuevo
    let espera = 0
    const alRedimensionar = () => { clearTimeout(espera); espera = setTimeout(() => { brillos.clear(); medicion++ }, 400) }
    addEventListener('resize', alRedimensionar)

    iniciar()
    return () => { clearInterval(reloj); removeEventListener('resize', alRedimensionar); paisaje.destruir(); mesa3d.destruir() }
  })
</script>

<div class="capa fondo" class:borroso={c.desenfoque > 0} style:filter={filtro} aria-hidden="true">
  <canvas class="capa lienzo" class:oculto={!!mostrada} style:transition-duration="{fundido}ms" bind:this={lienzoFondo}></canvas>
  {#key mostrada ? `${mostrada.url}|${mostrada.modo}` : ''}
    {#if mostrada}
      <div class="capa" transition:fade={{ duration: fundido }}>
        {#if est.relleno}<div class="capa relleno" style:background-image={`url("${mostrada.url}")`}></div>{/if}
        <div class="capa imagen" style:background-image={`url("${mostrada.url}")`} style:background-size={est.size} style:background-repeat={est.repeat}></div>
      </div>
    {/if}
  {/key}
</div>
<div class="capa velo" style:background-color="rgba(10, 6, 22, {c.oscurecer / 100})" style:background-image={veloFondo} aria-hidden="true"></div>
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
  .fondo { z-index: 0; overflow: hidden; background: #2a1d3d; }
  .fondo .capa { position: absolute; }
  /* El desenfoque deja bordes transparentes: se agranda un poco para taparlos */
  .fondo.borroso { transform: scale(1.06); }
  .lienzo { transition: opacity 0.9s ease; }
  .lienzo.oculto { opacity: 0; }
  .imagen { background-position: center; }
  .relleno {
    background-size: cover;
    background-position: center;
    filter: blur(28px) brightness(0.7);
    transform: scale(1.15);
  }
  .velo { z-index: 0; pointer-events: none; transition: background-color 0.6s ease; }
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

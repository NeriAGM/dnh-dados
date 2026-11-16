<script>
  import Icono from '../Icono.svelte'
  // Ventana para elegir algo del catálogo (cartas, armas, armaduras…) con buscador.
  let { titulo, items = [], filtros = [], onElegir, onCerrar, item } = $props()

  let texto = $state('')
  let filtro = $state(filtros[0]?.id ?? null)

  const quitarAcentos = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const visibles = $derived.by(() => {
    const t = quitarAcentos(texto.trim())
    const f = filtros.find((x) => x.id === filtro)
    return items
      .filter((x) => !f || f.prueba(x))
      .filter((x) => !t || quitarAcentos(`${x.nombre} ${x.nombre_en ?? ''} ${x.texto ?? ''}`).includes(t))
      .slice(0, 120)
  })
</script>

<div class="cortina arriba" onclick={onCerrar} role="presentation"></div>
<div class="selector vidrio" role="dialog" aria-label={titulo}>
  <header>
    <h3>{titulo}</h3>
    <button class="icono" onclick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" /></button>
  </header>
  <input class="campo" placeholder="Buscar por nombre o texto" bind:value={texto} aria-label="Buscar" />
  {#if filtros.length > 1}
    <div class="filtros">
      {#each filtros as f (f.id)}
        <button class="chip" class:activo={filtro === f.id} onclick={() => (filtro = f.id)}>{f.nombre}</button>
      {/each}
    </div>
  {/if}
  <div class="lista">
    {#each visibles as x (x.id)}
      {@render item(x, () => onElegir(x))}
    {:else}
      <p class="vacio-texto">No hay nada que coincida. Prueba con otra palabra o crea uno casero en Ajustes → Contenido casero.</p>
    {/each}
  </div>
</div>

<style>
  .cortina.arriba { z-index: 20; }
  .selector {
    position: fixed; z-index: 21;
    left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: min(620px, calc(100vw - 1.2rem)); max-height: min(86dvh, 900px);
    display: flex; flex-direction: column; gap: 0.6rem;
    border-radius: var(--radio-panel); padding: 1rem;
    background: var(--superficie-firme);
    box-shadow: var(--sombra-alta);
  }
  header { display: flex; justify-content: space-between; align-items: center; }
  h3 { margin: 0; font-size: 1.5rem; }
  .filtros { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .chip { border: 1px solid var(--filete); background: var(--hundido); border-radius: 999px; padding: 0.4rem 0.8rem; font-size: 0.85rem; font-weight: 700; color: var(--texto); min-height: 2.25rem; }
  .chip:hover { background: var(--hundido-2); }
  .chip.activo { background: var(--texto); border-color: var(--texto); color: var(--sobre-color); }
  .lista { overflow-y: auto; display: grid; grid-auto-rows: max-content; gap: 0.45rem; padding-right: 0.2rem; overscroll-behavior: contain; min-height: 0; }
</style>

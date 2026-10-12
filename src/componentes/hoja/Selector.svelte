<script>
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

<div class="velo" onclick={onCerrar} role="presentation"></div>
<div class="selector vidrio" role="dialog" aria-label={titulo}>
  <header>
    <h3 class="titulo">{titulo}</h3>
    <button class="cerrar" onclick={onCerrar} aria-label="Cerrar">✕</button>
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
      <p class="vacio">No hay nada que coincida. Prueba con otra palabra o crea uno casero en Ajustes → Contenido casero.</p>
    {/each}
  </div>
</div>

<style>
  .velo { position: fixed; inset: 0; background: rgba(8, 4, 18, 0.55); z-index: 20; }
  .selector {
    position: fixed; z-index: 21;
    left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: min(620px, calc(100vw - 1.2rem)); max-height: min(86vh, 900px);
    display: flex; flex-direction: column; gap: 0.6rem;
    border-radius: var(--radio-panel); padding: 1rem;
    background: rgba(22, 15, 38, 0.97);
  }
  header { display: flex; justify-content: space-between; align-items: center; }
  h3 { margin: 0; font-size: 1.3rem; }
  .cerrar { border: 0; background: none; font-size: 1.1rem; padding: 0.3rem 0.5rem; }
  .filtros { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .chip { border: 1px solid var(--linea); background: none; border-radius: 999px; padding: 0.3rem 0.7rem; font-size: 0.82rem; font-weight: 700; }
  .chip.activo { background: var(--pergamino); color: var(--tinta); }
  .lista { overflow-y: auto; display: grid; grid-auto-rows: max-content; gap: 0.45rem; padding-right: 0.2rem; overscroll-behavior: contain; min-height: 0; }
  .vacio { color: var(--pergamino-suave); font-size: 0.9rem; }
</style>

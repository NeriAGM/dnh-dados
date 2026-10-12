<script>
  // Lo que la mesa ve del encuentro activo: nombre del encuentro y, por
  // cada adversario a la vista, su nombre, su tipo y cómo va (sin números).
  // "incrustada" = vista previa dentro del panel del DJ.
  import { NOMBRE_TIPO } from '../lib/reglas.js'
  import { NOMBRE_ESTADO } from '../lib/escena.js'

  let { escena, incrustada = false } = $props()

  const PLEGADA = 'dnh.escena.plegada'
  let plegada = $state((() => { try { return localStorage.getItem(PLEGADA) === '1' } catch { return false } })())
  function plegar() {
    plegada = !plegada
    try { localStorage.setItem(PLEGADA, plegada ? '1' : '0') } catch {}
  }

  const lista = $derived(escena?.adversarios ?? [])
  const caidos = $derived(lista.filter((a) => a.estado === 'caido').length)
  const enPie = $derived(lista.length - caidos)
  const abierta = $derived(incrustada || !plegada)
</script>

{#if escena}
  <section class="escena" class:incrustada class:vidrio={!incrustada} aria-label="En escena: {escena.nombre}">
    <header>
      <svg class="sello" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 4l10 10M4 4h4M4 4v4M20 4L10 14M20 4h-4M20 4v4M7 15l2 2M17 15l-2 2M6 18l-2 2M18 18l2 2"/>
      </svg>
      <span class="titulos">
        <b class="titulo nombre">{escena.nombre}</b>
        {#if escena.entorno}<small>{escena.entorno}</small>{/if}
      </span>
      <span class="resumen">{enPie} en pie{caidos ? ` · ${caidos} ${caidos > 1 ? 'caídos' : 'caído'}` : ''}</span>
      {#if !incrustada}
        <button class="plegar" onclick={plegar} aria-expanded={!plegada} aria-label={plegada ? 'Mostrar adversarios' : 'Ocultar adversarios'}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d={plegada ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}/></svg>
        </button>
      {/if}
    </header>
    {#if abierta}
      <ul class="chips">
        {#each lista as a (a.uid)}
          <li class="chip e-{a.estado ?? 'nada'}" aria-label="{a.nombre}{a.tipo ? `, ${NOMBRE_TIPO[a.tipo] ?? a.tipo}` : ''}{a.estado ? `, ${NOMBRE_ESTADO[a.estado]}` : ''}">
            <span class="c-nombre" title={a.nombre}>{a.nombre}</span>
            <span class="c-pie">
              {#if a.tipo}<span class="c-tipo">{NOMBRE_TIPO[a.tipo] ?? a.tipo}</span>{/if}
              {#if a.estado}<span class="c-estado">{NOMBRE_ESTADO[a.estado]}</span>{/if}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}

<style>
  .escena {
    display: grid; gap: 0.35rem;
    padding: 0.45rem 0.6rem 0.5rem;
    border-radius: 16px;
    border: 1px solid rgba(217, 74, 92, 0.4);
    border-left: 3px solid var(--sangre);
    min-width: 0;
  }
  .escena.incrustada { background: rgba(10, 6, 22, 0.35); }
  header { display: flex; align-items: center; gap: 0.45rem; min-width: 0; }
  .sello { flex: none; color: #ffb3bd; }
  .titulos { display: flex; align-items: baseline; gap: 0.45rem; min-width: 0; flex: 1; overflow: hidden; }
  .nombre { font-size: 0.98rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: none; min-width: 3.5em; flex: 0 1 auto; }
  /* Si no cabe, se recorta primero el entorno y luego el nombre */
  .titulos small { flex: 0 1000 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; font-size: 0.72rem; color: var(--pergamino-suave); font-weight: 700; white-space: nowrap; }
  .titulos small::before { content: '· '; }
  .resumen { flex: none; font-size: 0.72rem; font-weight: 700; color: var(--pergamino-suave); white-space: nowrap; }
  .plegar { flex: none; display: grid; place-items: center; width: 1.7rem; height: 1.7rem; padding: 0; border-radius: 50%; border: 1px solid var(--linea); background: rgba(255, 245, 230, 0.06); }

  .chips {
    list-style: none; margin: 0; padding: 0 0 0.15rem;
    display: flex; gap: 0.35rem; overflow-x: auto; scrollbar-width: thin;
    overscroll-behavior-x: contain;
    /* Se desvanece a la derecha: hay más si deslizas */
    -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 1.4rem), transparent);
    mask-image: linear-gradient(to right, #000 calc(100% - 1.4rem), transparent);
    padding-right: 1.2rem;
  }
  .chip {
    --c: var(--pergamino-suave);
    flex: none; display: grid; gap: 0.05rem; max-width: 11rem;
    padding: 0.25rem 0.6rem 0.3rem;
    border-radius: 12px;
    background: rgba(24, 17, 42, 0.7);
    border: 1px solid color-mix(in srgb, var(--c) 55%, transparent);
    border-top: 3px solid var(--c);
    transition: opacity 0.3s, border-color 0.3s;
  }
  .c-nombre { font-weight: 800; font-size: 0.82rem; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .c-pie { display: flex; gap: 0.35rem; align-items: center; font-size: 0.68rem; font-weight: 700; white-space: nowrap; }
  .c-tipo { color: var(--pergamino-suave); }
  .c-estado { color: var(--tinta); background: var(--c); padding: 0 0.4rem; border-radius: 999px; }
  .e-ileso { --c: var(--exito); }
  .e-herido { --c: var(--esperanza); }
  .e-grave { --c: var(--sangre); }
  .e-grave .c-estado { color: white; }
  .e-grave { animation: latir 1.6s ease-in-out infinite; }
  .e-caido { --c: rgba(247, 238, 223, 0.35); opacity: 0.55; }
  .e-caido .c-nombre { text-decoration: line-through; text-decoration-thickness: 2px; }
  .e-caido .c-estado { background: rgba(247, 238, 223, 0.25); color: var(--pergamino); }
  @keyframes latir { 50% { box-shadow: 0 0 12px rgba(217, 74, 92, 0.55); } }
  @media (prefers-reduced-motion: reduce) { .e-grave { animation: none; } }
</style>

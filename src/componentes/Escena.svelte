<script>
  // Lo que la mesa ve del encuentro activo: nombre del encuentro y, por
  // cada adversario a la vista, su nombre, su tipo y cómo va (sin números).
  // "incrustada" = vista previa dentro del panel del DJ.
  import { NOMBRE_TIPO } from '../lib/reglas.js'
  import { NOMBRE_ESTADO } from '../lib/escena.js'
  import Icono from './Icono.svelte'

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
      <span class="sello"><Icono nombre="espadas" tam={18} /></span>
      <span class="titulos">
        <b class="nombre">{escena.nombre}</b>
        {#if escena.entorno}<small>{escena.entorno}</small>{/if}
      </span>
      <span class="resumen">{enPie} en pie{caidos ? ` · ${caidos} ${caidos > 1 ? 'caídos' : 'caído'}` : ''}</span>
      {#if !incrustada}
        <button class="icono plegar" onclick={plegar} aria-expanded={!plegada} aria-label={plegada ? 'Mostrar adversarios' : 'Ocultar adversarios'}>
          <Icono nombre={plegada ? 'abajo' : 'arriba'} tam={18} />
        </button>
      {/if}
    </header>
    {#if abierta}
      <ul class="chips">
        {#each lista as a (a.uid)}
          <li class="chip e-{a.estado ?? 'nada'}" aria-label="{a.nombre}{a.tipo ? `, ${NOMBRE_TIPO[a.tipo] ?? a.tipo}` : ''}{a.estado ? `, ${NOMBRE_ESTADO[a.estado]}` : ''}">
            <span class="c-nombre" title={a.nombre}>{a.nombre}</span>
            <span class="c-pie">
              {#if a.estado}<span class="c-estado"><i aria-hidden="true"></i>{NOMBRE_ESTADO[a.estado]}</span>{/if}
              {#if a.tipo}<span class="c-tipo">{NOMBRE_TIPO[a.tipo] ?? a.tipo}</span>{/if}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}

<style>
  .escena {
    display: grid;
    gap: 0.5rem;
    min-width: 0;
    padding: 0.6rem 0.6rem 0.7rem 0.9rem;
    border-radius: var(--radio-panel);
  }
  .escena.incrustada { padding: 0.6rem 0.7rem; border-radius: 16px; background: var(--hundido); }
  header { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
  .sello { display: grid; flex: none; color: var(--peligro-hondo); }
  .titulos { display: flex; align-items: baseline; gap: 0.4rem; flex: 1; min-width: 0; overflow: hidden; }
  .nombre { min-width: 3.5em; flex: 0 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 1rem; font-weight: 900; }
  /* Si no cabe, se recorta primero el entorno y luego el nombre */
  .titulos small { flex: 0 1000 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem; font-weight: 700; color: var(--texto-suave); }
  .titulos small::before { content: '· '; }
  .resumen { flex: none; font-size: 0.78rem; font-weight: 700; color: var(--texto-suave); white-space: nowrap; }
  .plegar { flex: none; width: 2.2rem; height: 2.2rem; }

  .chips {
    display: flex;
    gap: 0.4rem;
    margin: 0;
    padding: 0 1.2rem 0.15rem 0;
    list-style: none;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    /* Se desvanece a la derecha: hay más si deslizas */
    -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 1.4rem), transparent);
    mask-image: linear-gradient(to right, #000 calc(100% - 1.4rem), transparent);
  }
  .chip {
    --c: var(--texto-suave);
    flex: none;
    display: grid;
    gap: 0.1rem;
    max-width: 11rem;
    padding: 0.35rem 0.7rem 0.4rem;
    border-radius: 12px;
    background: var(--hundido);
    transition: opacity 0.3s;
  }
  .c-nombre { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.88rem; font-weight: 900; line-height: 1.25; }
  .c-pie { display: flex; align-items: center; gap: 0.45rem; font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
  .c-tipo { color: var(--texto-suave); }
  .c-estado { display: inline-flex; align-items: center; gap: 0.3rem; color: var(--c); }
  .c-estado i { width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
  .e-ileso { --c: var(--exito-hondo); }
  .e-herido { --c: var(--critico-hondo); }
  .e-grave { --c: var(--peligro-hondo); background: var(--peligro-suave); }
  .e-caido { opacity: 0.55; }
  .e-caido .c-nombre { text-decoration: line-through; text-decoration-thickness: 2px; }

  @media (max-width: 759px) {
    .escena { padding: 0.45rem 0.45rem 0.5rem 0.75rem; gap: 0.35rem; }
  }
</style>

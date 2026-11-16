<script>
  import { resumenDesenlace, nombreDado, hora } from '../lib/textos.js'
  import Icono from './Icono.svelte'

  let { tiradas = [], nombreDe = () => '', pjDe = () => null, puedeBorrar = false, onBorrar, onCerrar } = $props()

  function dia(iso) {
    const d = new Date(iso)
    const hoy = new Date()
    const ayer = new Date(Date.now() - 864e5)
    if (d.toDateString() === hoy.toDateString()) return 'Hoy'
    if (d.toDateString() === ayer.toDateString()) return 'Ayer'
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  // Se ordena por hora del servidor: la tirada propia se agrega cuando contesta
  // el servidor y puede llegar DESPUÉS de una ajena más nueva. Sin ordenar, a
  // la medianoche quedaban dos grupos "Ayer" (llave repetida en el #each).
  const fecha = (t) => Date.parse(t.creado) || 0
  const grupos = $derived.by(() => {
    const salida = []
    for (const t of [...tiradas].sort((a, b) => fecha(b) - fecha(a))) {
      const d = dia(t.creado)
      if (!salida.length || salida.at(-1).dia !== d) salida.push({ dia: d, items: [] })
      salida.at(-1).items.push(t)
    }
    return salida
  })
  // Solo la tirada más nueva va a todo color; las demás quedan en tinta
  const reciente = $derived(grupos[0]?.items[0]?.id)
</script>

<aside class="historial vidrio" aria-label="Historial de tiradas">
  <header>
    <h2>Tiradas</h2>
    {#if onCerrar}<button class="icono" onclick={onCerrar} aria-label="Cerrar historial"><Icono nombre="cerrar" /></button>{/if}
  </header>
  {#if !tiradas.length}
    <div class="vacio">
      <Icono nombre="dado" tam={30} />
      <p>Todavía nadie tira. Cuando alguien tire, la tirada aparecerá aquí para toda la mesa.</p>
    </div>
  {/if}
  <div class="lista">
    {#each grupos as g (g.dia)}
      <h3>{g.dia}</h3>
      <ol>
        {#each g.items as t (t.id)}
          {@const des = resumenDesenlace(t)}
          {@const pj = pjDe(t.personaje_id)}
          <li class={des.clase} class:reciente={t.id === reciente}>
            <span class="total">{t.total}</span>
            <div class="detalle">
              <div class="cabeza">
                <strong>{pj?.nombre ?? nombreDe(t.usuario_id)}</strong>
                {#if des.texto}<span class="des">{des.texto}</span>{/if}
                {#if t.oculta}<span class="etiqueta-oculta"><Icono nombre="ojo-no" tam={13} />oculta</span>{/if}
                <time>{hora(t.creado)}</time>
              </div>
              {#if t.etiqueta}<span class="nota">{t.etiqueta}</span>{/if}
              <span class="formula">
                {#each t.dados as d, i}{i ? ' · ' : ''}<span class:tachado={d.descartado}>{nombreDado(d)} {d.signo < 0 ? '−' : ''}{d.valor}</span>{/each}{t.modificador ? ` · ${t.modificador > 0 ? '+' : ''}${t.modificador}` : ''}
              </span>
            </div>
            {#if puedeBorrar && !t.local}
              <button class="borrar icono" onclick={() => onBorrar?.(t)} aria-label="Borrar esta tirada"><Icono nombre="basura" tam={16} /></button>
            {/if}
          </li>
        {/each}
      </ol>
    {/each}
  </div>
</aside>

<style>
  .historial {
    display: flex;
    flex-direction: column;
    max-height: 100%;
    min-height: 0;
    border-radius: var(--radio-panel);
  }
  header { display: flex; align-items: center; justify-content: space-between; min-height: 3.2rem; padding: 0.5rem 0.6rem 0.2rem 1.1rem; }
  h2 { margin: 0; font-size: 1.15rem; }
  .vacio { display: grid; justify-items: center; gap: 0.5rem; padding: 0.8rem 1.4rem 1.4rem; color: var(--texto-suave); text-align: center; }
  .vacio p { margin: 0; font-size: 0.92rem; }
  .lista { overflow-y: auto; padding: 0 0.6rem 0.8rem; overscroll-behavior: contain; }
  h3 { margin: 0.8rem 0.5rem 0.35rem; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--texto-suave); }
  ol { display: grid; margin: 0; padding: 0; list-style: none; }
  li {
    --acento: var(--texto);
    display: grid;
    grid-template-columns: 2.6rem minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.7rem;
    padding: 0.55rem 0.5rem;
    border-radius: 14px;
  }
  li + li { box-shadow: 0 -1px 0 var(--filete); }
  .esperanza { --acento: var(--esperanza-hondo); }
  .miedo { --acento: var(--miedo-hondo); }
  .critico { --acento: var(--critico-hondo); }
  .critico-dj { --acento: var(--peligro-hondo); }
  .total { font-size: 1.6rem; font-weight: 900; text-align: right; line-height: 1; font-variant-numeric: tabular-nums; color: var(--texto); }
  .detalle { display: grid; gap: 0.05rem; min-width: 0; font-size: 0.82rem; line-height: 1.35; }
  .cabeza { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.1rem 0.45rem; font-size: 0.9rem; }
  .cabeza strong { font-weight: 900; }
  .des { font-weight: 700; color: var(--acento); }
  .cabeza time { margin-left: auto; font-size: 0.78rem; color: var(--texto-suave); font-variant-numeric: tabular-nums; }
  .nota { font-weight: 700; }
  .formula { color: var(--texto-suave); font-variant-numeric: tabular-nums; }
  .tachado { text-decoration: line-through; opacity: 0.6; }
  .etiqueta-oculta { display: inline-flex; align-items: center; gap: 0.2rem; padding: 0 0.45rem; border-radius: 999px; background: var(--hundido-2); font-size: 0.72rem; font-weight: 700; }
  .borrar { width: 2.1rem; height: 2.1rem; color: var(--texto-suave); }
  .borrar:hover { color: var(--peligro-hondo); }

  /* La más nueva, a todo color */
  li.reciente { background: color-mix(in srgb, var(--acento) 11%, transparent); box-shadow: none; }
  li.reciente + li { box-shadow: none; }
  li.reciente .total { color: var(--acento); font-size: 1.9rem; }
</style>

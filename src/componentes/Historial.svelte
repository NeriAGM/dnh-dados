<script>
  import { resumenDesenlace, nombreDado, hora } from '../lib/textos.js'

  let { tiradas = [], nombreDe = () => '', pjDe = () => null, puedeBorrar = false, onBorrar, onCerrar } = $props()

  function dia(iso) {
    const d = new Date(iso)
    const hoy = new Date()
    const ayer = new Date(Date.now() - 864e5)
    if (d.toDateString() === hoy.toDateString()) return 'Hoy'
    if (d.toDateString() === ayer.toDateString()) return 'Ayer'
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const grupos = $derived.by(() => {
    const salida = []
    for (const t of tiradas) {
      const d = dia(t.creado)
      if (!salida.length || salida.at(-1).dia !== d) salida.push({ dia: d, items: [] })
      salida.at(-1).items.push(t)
    }
    return salida
  })
</script>

<aside class="historial vidrio" aria-label="Historial de tiradas">
  <header>
    <h2 class="titulo">Tiradas</h2>
    {#if onCerrar}<button class="cerrar" onclick={onCerrar} aria-label="Cerrar historial">✕</button>{/if}
  </header>
  {#if !tiradas.length}
    <p class="vacio">Todavía nadie tira. La primera tirada aparecerá aquí para toda la mesa.</p>
  {/if}
  <div class="lista">
    {#each grupos as g (g.dia)}
      <h3>{g.dia}</h3>
      <ol>
        {#each g.items as t (t.id)}
          {@const des = resumenDesenlace(t)}
          {@const pj = pjDe(t.personaje_id)}
          <li class={des.clase}>
            <div class="cabeza">
              <strong>{pj?.nombre ?? nombreDe(t.usuario_id)}</strong>
              {#if t.oculta}<span class="etiqueta-oculta">oculta</span>{/if}
              <time>{hora(t.creado)}</time>
            </div>
            <div class="cuerpo">
              <span class="total titulo">{t.total}</span>
              <span class="detalle">
                {#if des.texto}<span class="des">{des.texto}</span>{/if}
                {#if t.etiqueta}<span class="nota">{t.etiqueta}</span>{/if}
                <span class="formula">
                  {#each t.dados as d, i}{i ? ' · ' : ''}<span class:tachado={d.descartado}>{nombreDado(d)} {d.valor}</span>{/each}{t.modificador ? ` · ${t.modificador > 0 ? '+' : ''}${t.modificador}` : ''}
                </span>
              </span>
              {#if puedeBorrar && !t.local}
                <button class="borrar" onclick={() => onBorrar?.(t)} aria-label="Borrar esta tirada">✕</button>
              {/if}
            </div>
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
    border-radius: var(--radio-panel);
    max-height: 100%;
    min-height: 0;
  }
  header { display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 1rem 0.3rem; }
  h2 { margin: 0; font-size: 1.25rem; }
  .cerrar { border: 0; background: none; font-size: 1.1rem; padding: 0.3rem 0.5rem; }
  .vacio { margin: 0.3rem 1rem 1rem; color: var(--pergamino-suave); font-size: 0.92rem; }
  .lista { overflow-y: auto; padding: 0 0.6rem 0.8rem; overscroll-behavior: contain; }
  h3 {
    margin: 0.7rem 0.4rem 0.35rem;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--pergamino-suave);
  }
  ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
  li {
    border-radius: 14px;
    padding: 0.5rem 0.65rem;
    background: rgba(255, 245, 230, 0.05);
    border-left: 3px solid rgba(255, 245, 230, 0.2);
  }
  li.esperanza { border-left-color: var(--esperanza); }
  li.miedo { border-left-color: var(--miedo); }
  li.critico { border-left-color: #fff0b0; background: linear-gradient(90deg, rgba(240, 189, 85, 0.16), rgba(167, 124, 232, 0.1)); }
  li.critico-dj { border-left-color: var(--sangre); }
  .cabeza { display: flex; gap: 0.4rem; align-items: baseline; font-size: 0.85rem; }
  .cabeza time { margin-left: auto; color: var(--pergamino-suave); font-size: 0.78rem; }
  .etiqueta-oculta { font-size: 0.7rem; padding: 0 0.4rem; border-radius: 999px; background: rgba(217, 74, 92, 0.35); }
  .cuerpo { display: flex; gap: 0.6rem; align-items: center; }
  .total { font-size: 1.7rem; min-width: 2.2ch; text-align: center; text-shadow: none; }
  .esperanza .total, .esperanza .des { color: var(--esperanza); }
  .miedo .total, .miedo .des { color: var(--miedo); }
  .critico .des { color: #fff0b0; }
  .critico-dj .total, .critico-dj .des { color: var(--sangre); }
  .detalle { display: grid; font-size: 0.8rem; line-height: 1.3; min-width: 0; }
  .des { font-weight: 800; font-size: 0.86rem; }
  .nota { font-style: italic; }
  .formula { color: var(--pergamino-suave); }
  .tachado { text-decoration: line-through; opacity: 0.6; }
  .borrar { margin-left: auto; border: 0; background: none; color: var(--pergamino-suave); padding: 0.2rem 0.4rem; }
</style>

<script>
  import { resumenDesenlace, consecuencias, nombreDado } from '../lib/textos.js'
  import { conSigno } from '../lib/formula.js'

  let { tirada, autor = '', personaje = '', onCerrar } = $props()

  const des = $derived(resumenDesenlace(tirada))
  const lista = $derived(consecuencias(tirada, personaje))
</script>

<button class="resultado vidrio {des.clase}" onclick={onCerrar} aria-live="polite" aria-label="Cerrar resultado">
  {#if des.clase === 'critico'}<span class="destello" aria-hidden="true"></span>{/if}
  <span class="quien">{personaje || autor}{tirada.etiqueta ? ` · ${tirada.etiqueta}` : ''}{tirada.oculta ? ' · oculta' : ''}</span>
  <span class="total titulo">{tirada.total}</span>
  {#if des.texto}<span class="desenlace titulo">{des.texto}</span>{/if}
  <span class="dados">
    {#each tirada.dados as d}
      <span class="dado {d.rol}" class:descartado={d.descartado}>{nombreDado(d)} {d.signo < 0 ? '−' : ''}{d.valor}</span>
    {/each}
    {#if tirada.modificador}<span class="dado">{conSigno(tirada.modificador)}</span>{/if}
  </span>
  {#if lista.length}
    <span class="efectos">{lista.join(' · ')}</span>
  {/if}
</button>

<style>
  .resultado {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    display: grid;
    justify-items: center;
    gap: 0.15rem;
    border-radius: var(--radio-panel);
    padding: 0.9rem 1.4rem 1rem;
    min-width: min(88vw, 300px);
    max-width: min(92vw, 420px);
    text-align: center;
    animation: aparecer 0.35s cubic-bezier(0.2, 1.3, 0.4, 1);
  }
  @keyframes aparecer { from { transform: scale(0.85) translateY(-8px); opacity: 0; } }
  .quien { font-size: 0.85rem; color: var(--pergamino-suave); font-weight: 700; }
  .total { font-size: 3.6rem; line-height: 1; }
  .desenlace { font-size: 1.3rem; line-height: 1.2; }
  .esperanza .desenlace, .esperanza .total { color: var(--esperanza); }
  .miedo .desenlace, .miedo .total { color: var(--miedo); }
  .critico { border-color: rgba(255, 220, 140, 0.8); box-shadow: 0 0 0 1px rgba(255, 220, 140, 0.4), 0 0 60px -6px rgba(255, 190, 90, 0.75); }
  .critico .total, .critico .desenlace {
    background: linear-gradient(100deg, #fff3c4, #f0bd55 40%, #c79bff 80%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .critico-dj .total, .critico-dj .desenlace { color: var(--sangre); }
  .dados { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.3rem; margin-top: 0.35rem; }
  .dado {
    font-size: 0.78rem;
    font-weight: 800;
    padding: 0.12rem 0.5rem;
    border-radius: 999px;
    background: rgba(255, 245, 230, 0.1);
  }
  .dado.esperanza { background: rgba(240, 189, 85, 0.22); color: #ffd98a; }
  .dado.miedo { background: rgba(167, 124, 232, 0.25); color: #d6bfff; }
  .dado.ventaja { background: rgba(47, 143, 122, 0.35); }
  .dado.desventaja { background: rgba(168, 50, 62, 0.4); }
  .dado.descartado { opacity: 0.4; text-decoration: line-through; }
  .efectos { margin-top: 0.4rem; font-size: 0.88rem; font-weight: 700; }
  .destello {
    position: absolute;
    inset: -40%;
    background: conic-gradient(from 0deg, transparent, rgba(255, 220, 140, 0.35), transparent 30%, rgba(199, 155, 255, 0.3), transparent 60%);
    animation: girar 3s linear infinite;
    z-index: -1;
  }
  @keyframes girar { to { transform: rotate(1turn); } }
  @media (max-width: 759px) {
    .resultado {
      width: 100%;
      max-width: none;
      grid-template-columns: auto 1fr;
      justify-items: start;
      text-align: left;
      column-gap: 0.9rem;
      row-gap: 0.1rem;
      padding: 0.7rem 1rem;
      background: rgba(24, 17, 42, 0.94);
    }
    .total { grid-row: 1 / span 3; align-self: center; font-size: 3rem; }
    .quien, .desenlace, .dados, .efectos { grid-column: 2; }
    .dados { justify-content: flex-start; margin-top: 0.15rem; }
    .efectos { margin-top: 0.15rem; font-size: 0.8rem; }
    .desenlace { font-size: 1.15rem; }
  }
</style>

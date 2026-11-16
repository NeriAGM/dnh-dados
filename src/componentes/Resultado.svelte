<script>
  import { resumenDesenlace, consecuencias, nombreDado } from '../lib/textos.js'
  import { conSigno } from '../lib/formula.js'

  let { tirada, autor = '', personaje = '', onCerrar } = $props()

  const des = $derived(resumenDesenlace(tirada))
  const lista = $derived(consecuencias(tirada, personaje))
</script>

<!-- La tirada llega como una línea de diálogo: placa con quién tiró, el número
     y el desenlace escribiéndose; abajo los dados y lo que pasa. -->
<button class="resultado vidrio {des.clase}" onclick={onCerrar} aria-live="polite" aria-label="Cerrar resultado">
  <span class="placa">{personaje || autor}{tirada.oculta ? ' · oculta' : ''}</span>
  <span class="linea">
    {#if tirada.etiqueta}<span class="que">{tirada.etiqueta}…</span>{/if}
    <span class="total">{tirada.total}</span>
    {#if des.texto}<span class="desenlace">{des.texto}</span>{/if}
  </span>
  <span class="dados">
    {#each tirada.dados as d}
      <span class="dado {d.rol}" class:descartado={d.descartado}>{nombreDado(d)} {d.signo < 0 ? '−' : ''}{d.valor}</span>
    {/each}
    {#if tirada.modificador}<span class="dado">{conSigno(tirada.modificador)}</span>{/if}
  </span>
  {#if lista.length}
    <span class="efectos">
      {#each lista as e}<span class="efecto">{e}</span>{/each}
    </span>
  {/if}
  <span class="sigue" aria-hidden="true"></span>
</button>

<style>
  .resultado {
    --acento: var(--texto);
    position: relative;
    display: grid;
    justify-items: start;
    gap: 0.4rem;
    width: 100%;
    margin-top: 0.9rem;
    padding: 1.3rem 2.6rem 1rem 1.4rem;
    border-radius: var(--radio-panel);
    text-align: left;
    background: var(--superficie-firme);
    box-shadow: inset 0 0 0 5px var(--superficie-firme), inset 0 0 0 6px var(--filete-fuerte), var(--sombra);
    animation: aparecer 0.3s var(--suave);
  }
  @keyframes aparecer { from { opacity: 0; transform: translateY(10px); } }
  .esperanza { --acento: var(--esperanza-hondo); }
  .miedo { --acento: var(--miedo-hondo); }
  .critico { --acento: var(--critico-hondo); }
  .critico-dj { --acento: var(--peligro-hondo); }

  /* Placa de nombre, montada sobre el borde como en una novela visual */
  .placa {
    position: absolute;
    top: -0.95rem;
    left: 1.1rem;
    max-width: calc(100% - 2.2rem);
    font-size: 1rem;
  }

  /* La línea se "escribe" de izquierda a derecha */
  .linea {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.15rem 0.6rem;
    font-size: 1.35rem;
    font-weight: 700;
    line-height: 1.2;
    animation: escribir 0.5s steps(14, end) both;
  }
  @keyframes escribir { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
  .que { color: var(--texto); }
  .total {
    font-size: 2.7rem;
    font-weight: 900;
    line-height: 1;
    color: var(--acento);
    font-variant-numeric: tabular-nums;
  }
  .desenlace { font-weight: 900; color: var(--acento); }

  .dados, .efectos { display: flex; flex-wrap: wrap; gap: 0.35rem; animation: asomar 0.3s 0.4s var(--suave) both; }
  @keyframes asomar { from { opacity: 0; transform: translateY(4px); } }
  .dado {
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    background: var(--hundido);
    font-size: 0.85rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .dado.esperanza { background: var(--esperanza-suave); color: var(--esperanza-hondo); }
  .dado.miedo { background: var(--miedo-suave); color: var(--miedo-hondo); }
  .dado.ventaja { background: var(--exito-suave); color: var(--exito-hondo); }
  .dado.desventaja { background: var(--peligro-suave); color: var(--peligro-hondo); }
  .dado.descartado { opacity: 0.5; text-decoration: line-through; }
  .efecto {
    padding: 0.2rem 0.65rem;
    border-radius: 9px;
    background: color-mix(in srgb, var(--acento) 12%, transparent);
    color: var(--acento);
    font-size: 0.9rem;
    font-weight: 900;
  }
  .neutro .efecto { background: var(--hundido); }

  /* Marca de "sigue" que respira, como al terminar una línea de diálogo */
  .sigue {
    position: absolute;
    right: 1.2rem;
    bottom: 1rem;
    border: 7px solid transparent;
    border-top: 10px solid var(--acento);
    border-bottom: 0;
    animation: respirar 1.6s 0.6s ease-in-out infinite;
  }
  @keyframes respirar { 50% { transform: translateY(3px); opacity: 0.45; } }

  /* Crítico: el vidrio se enciende una vez con luz cálida */
  .critico { box-shadow: 0 0 0 2px var(--critico), var(--sombra); animation: aparecer 0.3s var(--suave), encender 1.2s 0.2s var(--suave); }
  @keyframes encender { from { box-shadow: 0 0 0 2px var(--critico), 0 0 0 18px var(--critico-suave), var(--sombra); } }
  .critico .placa { background: var(--critico-hondo); }

  @media (max-width: 759px), (max-height: 560px) and (min-width: 600px) {
    .resultado { padding: 1.05rem 2.2rem 0.65rem 1rem; gap: 0.25rem; margin-top: 0.8rem; }
    .linea { font-size: 1.05rem; }
    .total { font-size: 2.1rem; }
    .dados { flex-wrap: nowrap; overflow: hidden; }
    .dado { flex: none; font-size: 0.78rem; padding: 0.1rem 0.5rem; }
    /* Las consecuencias como una sola frase: ocupan menos que varias píldoras */
    .efectos { display: block; font-size: 0.85rem; font-weight: 900; line-height: 1.3; color: var(--acento); }
    .efecto { display: inline; padding: 0; background: none; font-size: inherit; }
    .efecto + .efecto::before { content: ' · '; color: var(--texto-suave); }
  }
  @media (prefers-reduced-motion: reduce) {
    .linea, .dados, .efectos, .sigue { animation: none; }
  }
</style>

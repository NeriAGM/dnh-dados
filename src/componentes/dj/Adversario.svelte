<script>
  // Bloque de estadísticas de un adversario. Si recibe "instancia", muestra
  // sus casillas de PG/Estrés y los botones para tirar y recibir daño.
  import { md } from '../../lib/md.js'
  import { NOMBRE_TIPO, pgPorDano } from '../../lib/reglas.js'
  import { ALCANCES } from '../../lib/srd.js'
  import { conSigno } from '../../lib/formula.js'
  import Casillas from '../hoja/Casillas.svelte'
  import Icono from '../Icono.svelte'
  import { danoActual, textoAtaque } from '../../lib/escena.js'

  let { adv, instancia = null, abierto = false, onCambiar, onTirarAtaque, onTirarDano, onQuitar, onDuplicar, acciones } = $props()

  let ver = $state(abierto)
  let dano = $state('')
  let aviso = $state('')
  let tAviso = 0
  const CLASE = { accion: 'Acción', reaccion: 'Reacción', pasiva: 'Pasiva', evolucion: 'Evolución' } // Evolución: SRD 2.0 p. 105

  // Una Horda a la mitad de sus PG o más pega con el daño de su rasgo «Horda (…)»
  const d = $derived(danoActual(adv, instancia))
  const textoDano = $derived((d.lados ? `${d.dados || 1}d${d.lados}${d.mod ? (d.mod > 0 ? `+${d.mod}` : d.mod) : ''}` : `${d.mod ?? 0}`)
    + (adv?.ataque?.dano?.directo ? ' directo' : ''))  // daño directo: no se reduce con Armadura (Ejecutor temporal, SRD 2.0 p. 155)
  const caido = $derived(instancia && adv && (instancia.pg ?? 0) >= (adv.pg ?? 1))
  const oculto = $derived(!!instancia?.oculto)

  function recibir() {
    const n = parseInt(dano, 10)
    if (!Number.isFinite(n) || n <= 0) return
    let marcas
    if (!adv.umbrales) marcas = adv.pg  // Esbirros: cualquier daño los derriba
    else marcas = pgPorDano(n, { mayor: adv.umbrales.mayor ?? Infinity, grave: adv.umbrales.grave ?? Infinity })
    const nuevo = Math.min(adv.pg, (instancia.pg ?? 0) + marcas)
    onCambiar?.({ pg: nuevo })
    aviso = `${n} de daño → marca ${marcas} PG${nuevo >= adv.pg ? ' · ¡Cae!' : ''}`
    dano = ''
    // Un golpe nuevo reinicia la espera (si no, el aviso viejo borraba el nuevo antes de tiempo)
    clearTimeout(tAviso)
    tAviso = setTimeout(() => (aviso = ''), 4000)
  }
</script>

{#if adv}
  <article class="adv" class:caido class:oculto class:en-escena={!!instancia}>
    <header>
      <button class="titulo-adv" onclick={() => (ver = !ver)} aria-expanded={ver}>
        <span class="nombre">{instancia?.nombre || adv.nombre}</span>
        <span class="etiquetas">
          <span class="tipo t-{adv.tipo}">{NOMBRE_TIPO[adv.tipo] ?? adv.tipo}{adv.horda_por_pg ? ` (${adv.horda_por_pg}/PG)` : ''}</span>
          <span>Rango {adv.nivel}</span>
          {#if adv.fuente === 'Casero'}<span>Casero</span>{/if}
          {#if oculto}<span class="marca-oculto">Oculto</span>{/if}
        </span>
      </button>
      {#if instancia}
        <button class="ojo" class:tapado={oculto} onclick={() => onCambiar?.({ oculto: !oculto })}
          aria-label={oculto ? 'Mostrar a la mesa' : 'Ocultar a la mesa'} title={oculto ? 'La mesa no lo ve · tócalo para mostrarlo' : 'La mesa lo ve · tócalo para ocultarlo'}>
          <Icono nombre={oculto ? 'ojo-no' : 'ojo'} tam={20} />
        </button>
      {/if}
      {#if acciones}<div class="acc-cab">{@render acciones()}</div>{/if}
    </header>

    <div class="numeros">
      <span title="Dificultad"><b>{adv.dificultad ?? '—'}</b>Dificultad</span>
      <span title="Umbrales Mayor / Grave"><b>{adv.umbrales ? `${adv.umbrales.mayor ?? '—'}/${adv.umbrales.grave ?? '—'}` : '—'}</b>Umbrales</span>
      <span><b>{adv.pg}</b>PG</span>
      <span><b>{adv.estres ?? 0}</b>Estrés</span>
      <span title="{adv.ataque?.nombre} · {ALCANCES[adv.ataque?.alcance] ?? ''}"><b>{textoAtaque(adv)}</b>{adv.ataque?.nombre}</span>
      <span title={d.horda ? 'Daño de Horda: ya marcó la mitad de sus PG' : undefined}><b>{textoDano}</b>{d.tipo === 'magico' ? 'mág.' : 'fís.'}{d.horda ? ' · horda' : ''}</span>
    </div>

    {#if instancia}
      <div class="vida">
        <Casillas nombre="PG" marcadas={instancia.pg ?? 0} maximo={adv.pg ?? 1} color="var(--peligro)" onCambiar={(n) => onCambiar?.({ pg: n })} />
        {#if adv.estres}
          <Casillas nombre="Estrés" marcadas={instancia.estres ?? 0} maximo={adv.estres} color="var(--texto)" onCambiar={(n) => onCambiar?.({ estres: n })} />
        {/if}
      </div>
      <div class="botones">
        <button class="boton tirar" onclick={() => onTirarAtaque?.()}><Icono nombre="dado" tam={18} />Atacar {textoAtaque(adv)}</button>
        {#if d.lados}
          <button class="boton tirar" onclick={() => onTirarDano?.(false, d)}>Daño {textoDano}</button>
          <button class="boton critico" onclick={() => onTirarDano?.(true, d)}>Crítico</button>
        {/if}
        <form class="recibir" onsubmit={(e) => { e.preventDefault(); recibir() }}>
          <input class="campo" type="number" min="1" inputmode="numeric" placeholder="Daño" bind:value={dano} aria-label="Daño recibido" />
          <button class="boton">Recibir</button>
        </form>
      </div>
      {#if aviso}<p class="aviso" role="status">{aviso}</p>{/if}
    {/if}

    {#if ver}
      <div class="detalle">
        {#if adv.descripcion}<p class="desc">{adv.descripcion}</p>{/if}
        {#if adv.motivos}<p><b>Motivos y tácticas:</b> {adv.motivos}</p>{/if}
        {#if adv.experiencias?.length}<p><b>Experiencias:</b> {adv.experiencias.map((x) => `${x.nombre} ${conSigno(x.valor)}`).join(', ')}</p>{/if}
        {#each adv.rasgos ?? [] as r}
          <div class="rasgo">
            <p class="r-nombre"><b>{r.nombre}</b> <span class="clase c-{r.clase}">{CLASE[r.clase] ?? r.clase}</span>{#if r.cuenta_regresiva}<span class="clase">{r.cuenta_regresiva}</span>{/if}</p>
            <div class="r-texto">{@html md(r.texto)}</div>
          </div>
        {/each}
        {#if instancia}
          <div class="pie">
            <input class="campo" value={instancia.nombre ?? ''} placeholder="Nombre en escena (p. ej. Oso herido)" onchange={(e) => onCambiar?.({ nombre: e.currentTarget.value })} aria-label="Nombre en escena" />
            <button class="boton" onclick={() => onDuplicar?.()}>Duplicar</button>
            <button class="boton" onclick={() => onQuitar?.()}>Quitar</button>
          </div>
        {/if}
      </div>
    {/if}
  </article>
{/if}

<style>
  .adv { border-radius: var(--radio-control); border: 1px solid var(--filete); background: rgb(255 255 255 / 0.5); padding: 0.75rem 0.85rem; display: grid; gap: 0.65rem; }
  .adv.caido { opacity: 0.55; filter: grayscale(0.6); }
  .adv.oculto { border-style: dashed; border-color: var(--filete-fuerte); background: var(--hundido); }
  .adv.oculto > :not(header) { opacity: 0.6; }
  .marca-oculto { background: var(--texto) !important; color: var(--sobre-color) !important; }
  .ojo { flex: none; display: grid; place-items: center; width: 2.5rem; height: 2.5rem; padding: 0; border-radius: 50%; border: 1px solid var(--filete); background: var(--hundido); color: var(--texto); }
  .ojo:hover { background: var(--hundido-2); }
  .ojo.tapado { border-style: dashed; border-color: var(--filete-fuerte); color: var(--texto-suave); }
  header { display: flex; gap: 0.5rem; align-items: flex-start; }
  .titulo-adv { flex: 1; min-width: 0; display: grid; text-align: left; background: none; border: 0; padding: 0; gap: 0.3rem; color: var(--texto); }
  .nombre { font-size: 1.1rem; font-weight: 900; line-height: 1.2; }
  .etiquetas { display: flex; gap: 0.3rem; flex-wrap: wrap; font-size: 0.75rem; color: var(--texto-suave); font-weight: 700; }
  .etiquetas span { padding: 0.1rem 0.55rem; border-radius: 999px; background: var(--hundido); }
  .tipo.t-solo, .tipo.t-lider { background: var(--peligro-suave) !important; color: var(--peligro-hondo); }
  .tipo.t-bruto { background: var(--critico-suave) !important; color: var(--critico-hondo); }
  .tipo.t-esbirro, .tipo.t-horda { background: var(--miedo-suave) !important; color: var(--miedo-hondo); }
  .acc-cab { display: flex; gap: 0.3rem; }
  .numeros { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.4rem; }
  .numeros span { display: grid; justify-items: center; font-size: 0.75rem; font-weight: 700; color: var(--texto-suave); text-align: center; line-height: 1.15; padding: 0.4rem 0.2rem; border-radius: var(--radio-chico); background: var(--hundido); overflow: hidden; }
  .numeros b { font-size: 1.15rem; font-weight: 900; color: var(--texto); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .vida { display: grid; gap: 0.5rem; }
  .botones { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
  /* Azul y rosa quedan solo para Esperanza y Miedo: las tiradas del DJ van en tinta */
  .tirar { background: var(--hundido-2); border-color: var(--filete-fuerte); color: var(--texto); }
  .tirar:hover:not(:disabled) { background: rgb(29 36 64 / 0.16); }
  .critico { background: var(--critico-suave); border-color: color-mix(in srgb, var(--critico) 60%, transparent); color: var(--critico-hondo); }
  .recibir { display: flex; gap: 0.4rem; margin-left: auto; }
  .recibir .campo { width: 5rem; }
  .aviso { margin: 0; font-size: 0.9rem; color: var(--peligro-hondo); font-weight: 700; }
  .detalle { display: grid; gap: 0.5rem; font-size: 0.92rem; line-height: 1.5; border-top: 1px solid var(--filete); padding-top: 0.65rem; }
  .detalle p { margin: 0; }
  .desc { color: var(--texto-suave); }
  .r-nombre { display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center; }
  .clase { font-size: 0.75rem; font-weight: 800; padding: 0.05rem 0.5rem; border-radius: 999px; background: var(--hundido-2); }
  .clase.c-accion { background: var(--peligro-suave); color: var(--peligro-hondo); }
  .clase.c-reaccion { background: var(--hundido-2); color: var(--texto); }
  .r-texto :global(p) { margin: 0 0 0.3rem; }
  .r-texto :global(ul) { margin: 0 0 0.3rem; padding-left: 1.1rem; }
  .pie { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
  .pie .campo { flex: 1; min-width: 10rem; }
  @media (max-width: 480px) { .recibir { margin-left: 0; width: 100%; } .recibir .campo { flex: 1; width: auto; } }
</style>

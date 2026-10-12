<script>
  // Bloque de estadísticas de un adversario. Si recibe "instancia", muestra
  // sus casillas de PG/Estrés y los botones para tirar y recibir daño.
  import { md } from '../../lib/md.js'
  import { NOMBRE_TIPO, pgPorDano } from '../../lib/reglas.js'
  import { ALCANCES } from '../../lib/srd.js'
  import { conSigno } from '../../lib/formula.js'
  import Casillas from '../hoja/Casillas.svelte'

  let { adv, instancia = null, abierto = false, onCambiar, onTirarAtaque, onTirarDano, onQuitar, onDuplicar, acciones } = $props()

  let ver = $state(abierto)
  let dano = $state('')
  let aviso = $state('')
  const CLASE = { accion: 'Acción', reaccion: 'Reacción', pasiva: 'Pasiva' }

  const d = $derived(adv?.ataque?.dano ?? {})
  const textoDano = $derived(d.lados ? `${d.dados || 1}d${d.lados}${d.mod ? (d.mod > 0 ? `+${d.mod}` : d.mod) : ''}` : `${d.mod ?? 0}`)
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
    setTimeout(() => (aviso = ''), 4000)
  }
</script>

{#if adv}
  <article class="adv" class:caido class:oculto class:en-escena={!!instancia}>
    <header>
      <button class="titulo-adv" onclick={() => (ver = !ver)} aria-expanded={ver}>
        <span class="nombre titulo">{instancia?.nombre || adv.nombre}</span>
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
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/>
            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
            {#if oculto}<path stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M4 4l16 16"/>{/if}
          </svg>
        </button>
      {/if}
      {#if acciones}<div class="acc-cab">{@render acciones()}</div>{/if}
    </header>

    <div class="numeros">
      <span title="Dificultad"><b>{adv.dificultad ?? '—'}</b>Dif.</span>
      <span title="Umbrales Mayor / Grave"><b>{adv.umbrales ? `${adv.umbrales.mayor ?? '—'}/${adv.umbrales.grave ?? '—'}` : '—'}</b>Umbrales</span>
      <span><b>{adv.pg}</b>PG</span>
      <span><b>{adv.estres ?? 0}</b>Estrés</span>
      <span title="{adv.ataque?.nombre} · {ALCANCES[adv.ataque?.alcance] ?? ''}"><b>{conSigno(adv.ataque?.mod ?? 0) || '+0'}</b>{adv.ataque?.nombre}</span>
      <span><b>{textoDano}</b>{d.tipo === 'magico' ? 'mág.' : 'fís.'}</span>
    </div>

    {#if instancia}
      <div class="vida">
        <Casillas nombre="PG" marcadas={instancia.pg ?? 0} maximo={adv.pg ?? 1} color="var(--sangre)" onCambiar={(n) => onCambiar?.({ pg: n })} />
        {#if adv.estres}
          <Casillas nombre="Estrés" marcadas={instancia.estres ?? 0} maximo={adv.estres} color="#ff8a5c" onCambiar={(n) => onCambiar?.({ estres: n })} />
        {/if}
      </div>
      <div class="botones">
        <button class="boton chico" onclick={() => onTirarAtaque?.()}>Atacar {conSigno(adv.ataque?.mod ?? 0) || '+0'}</button>
        {#if d.lados}
          <button class="boton chico" onclick={() => onTirarDano?.(false)}>Daño {textoDano}</button>
          <button class="boton chico critico" onclick={() => onTirarDano?.(true)}>Crítico</button>
        {/if}
        <form class="recibir" onsubmit={(e) => { e.preventDefault(); recibir() }}>
          <input class="campo" type="number" min="1" inputmode="numeric" placeholder="Daño" bind:value={dano} aria-label="Daño recibido" />
          <button class="boton chico">Recibir</button>
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
            <p class="r-nombre"><b>{r.nombre}</b> <span class="clase c-{r.clase}">{CLASE[r.clase] ?? r.clase}</span>{#if r.cuenta_regresiva}<span class="clase">Cuenta: {r.cuenta_regresiva}</span>{/if}</p>
            <div class="r-texto">{@html md(r.texto)}</div>
          </div>
        {/each}
        {#if instancia}
          <div class="pie">
            <input class="campo" value={instancia.nombre ?? ''} placeholder="Nombre en escena (p. ej. Oso herido)" onchange={(e) => onCambiar?.({ nombre: e.currentTarget.value })} aria-label="Nombre en escena" />
            <button class="boton chico" onclick={() => onDuplicar?.()}>Duplicar</button>
            <button class="boton chico" onclick={() => onQuitar?.()}>Quitar</button>
          </div>
        {/if}
      </div>
    {/if}
  </article>
{/if}

<style>
  .adv { border-radius: 14px; border: 1px solid var(--linea); background: rgba(255, 245, 230, 0.04); padding: 0.55rem 0.7rem; display: grid; gap: 0.45rem; }
  .adv.en-escena { border-left: 3px solid var(--sangre); }
  .adv.caido { opacity: 0.5; filter: grayscale(0.6); }
  .adv.oculto { border-style: dashed; background: rgba(10, 6, 22, 0.35); }
  .adv.oculto > :not(header) { opacity: 0.55; }
  .adv.oculto .nombre { opacity: 0.7; }
  .marca-oculto { background: rgba(10, 6, 22, 0.7) !important; color: var(--pergamino) !important; border: 1px dashed var(--pergamino-suave); }
  .ojo { flex: none; display: grid; place-items: center; width: 2.1rem; height: 2.1rem; padding: 0; border-radius: 50%; border: 1px solid rgba(240, 189, 85, 0.55); background: rgba(240, 189, 85, 0.14); color: var(--esperanza); }
  .ojo:hover { background: rgba(240, 189, 85, 0.28); }
  .ojo.tapado { border-style: dashed; border-color: var(--pergamino-suave); background: rgba(10, 6, 22, 0.5); color: var(--pergamino-suave); }
  header { display: flex; gap: 0.5rem; align-items: flex-start; }
  .titulo-adv { flex: 1; min-width: 0; display: grid; text-align: left; background: none; border: 0; padding: 0; gap: 0.15rem; }
  .nombre { font-size: 1.08rem; text-shadow: none; line-height: 1.2; }
  .etiquetas { display: flex; gap: 0.3rem; flex-wrap: wrap; font-size: 0.72rem; color: var(--pergamino-suave); font-weight: 700; }
  .etiquetas span { padding: 0.05rem 0.45rem; border-radius: 999px; background: rgba(255, 245, 230, 0.07); }
  .tipo.t-solo, .tipo.t-lider { background: rgba(217, 74, 92, 0.3) !important; color: #ffd0d6; }
  .tipo.t-bruto { background: rgba(240, 140, 60, 0.3) !important; }
  .tipo.t-esbirro, .tipo.t-horda { background: rgba(167, 124, 232, 0.28) !important; }
  .acc-cab { display: flex; gap: 0.3rem; }
  .numeros { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.3rem; }
  .numeros span { display: grid; justify-items: center; font-size: 0.66rem; color: var(--pergamino-suave); text-align: center; line-height: 1.15; padding: 0.25rem 0.1rem; border-radius: 8px; background: rgba(10, 6, 22, 0.35); overflow: hidden; }
  .numeros b { font-family: var(--fuente-titulo); font-size: 1rem; color: var(--pergamino); white-space: nowrap; }
  .vida { display: grid; gap: 0.35rem; }
  .botones { display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center; }
  .chico { padding: 0.35rem 0.65rem; font-size: 0.82rem; }
  .critico { border-color: rgba(217, 74, 92, 0.6); }
  .recibir { display: flex; gap: 0.3rem; margin-left: auto; }
  .recibir .campo { width: 4.5rem; padding: 0.35rem 0.5rem; }
  .aviso { margin: 0; font-size: 0.82rem; color: #ffd0d6; font-weight: 700; }
  .detalle { display: grid; gap: 0.4rem; font-size: 0.86rem; line-height: 1.45; border-top: 1px dashed var(--linea); padding-top: 0.45rem; }
  .detalle p { margin: 0; }
  .desc { font-style: italic; color: var(--pergamino-suave); }
  .r-nombre { display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center; }
  .clase { font-size: 0.68rem; font-weight: 800; padding: 0.05rem 0.4rem; border-radius: 999px; background: rgba(255, 245, 230, 0.1); }
  .clase.c-accion { background: rgba(240, 189, 85, 0.25); }
  .clase.c-reaccion { background: rgba(111, 176, 232, 0.25); }
  .r-texto :global(p) { margin: 0 0 0.3rem; }
  .r-texto :global(ul) { margin: 0 0 0.3rem; padding-left: 1.1rem; }
  .pie { display: flex; gap: 0.35rem; align-items: center; }
  .pie .campo { flex: 1; padding: 0.4rem 0.6rem; }
  @media (max-width: 480px) { .numeros { grid-template-columns: repeat(3, minmax(0, 1fr)); } .recibir { margin-left: 0; } }
</style>

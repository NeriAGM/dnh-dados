<script>
  import { leerFormula, leerDificultad, conSigno } from '../lib/formula.js'

  // aliados: los personajes que ya marcaron «Ayudar a» con tu nombre en su pantalla (014)
  let { esDJ = false, ocupado = false, aliados = [], onTirar } = $props()

  const MODOS = [
    { id: 'accion', nombre: 'Acción', ayuda: 'Dados de Dualidad: Esperanza contra Miedo' },
    { id: 'reaccion', nombre: 'Reacción', ayuda: 'Dualidad sin ganar Esperanza ni dar Miedo' },
    { id: 'dano', nombre: 'Daño', ayuda: 'Los dados de tu arma o hechizo' },
    { id: 'libre', nombre: 'Libre', ayuda: 'Cualquier combinación de dados' },
  ]
  const modos = $derived(esDJ ? [{ id: 'dj', nombre: 'Adversario', ayuda: 'd20 del DJ contra la Evasión' }, ...MODOS] : MODOS)

  let modo = $state('accion')
  let modificador = $state(0)
  let ventaja = $state('ninguna') // ninguna | ventaja | desventaja
  let dificultad = $state('')
  let etiqueta = $state('')
  let formula = $state('')
  let critico = $state(false)
  let oculta = $state(false)
  let mas = $state(false)
  let error = $state('')
  let quitados = $state([]) // aliados que confirmaron pero quien tira no quiere usar

  $effect(() => { if (esDJ && modo === 'accion' && !tocado) modo = 'dj' })
  // Si dejas de ser DJ (cambias a una campaña donde eres jugador), el modo
  // Adversario ya no tiene pestaña: sin esto se seguía tirando como "dj"
  $effect(() => { if (!esDJ && modo === 'dj') { modo = 'accion'; ventaja = 'ninguna' } })
  let tocado = false

  const dual = $derived(modo === 'accion' || modo === 'reaccion')
  const conFormula = $derived(modo === 'dano' || modo === 'libre')
  // Ayudar a un Aliado (SRD 2.0, p. 48–49): solo en acción. Cada ayudante ya
  // lo confirmó en su pantalla; con desventaja, la ayuda la cancela (p. 49)
  const puedenAyudar = $derived(modo === 'accion' && aliados.length > 0)
  const ayudantes = $derived(puedenAyudar ? aliados.filter((a) => !quitados.includes(a.id) && (a.esperanza ?? 0) >= 1).map((a) => a.id) : [])

  function alternarAyuda(id) {
    quitados = quitados.includes(id) ? quitados.filter((x) => x !== id) : [...quitados, id]
  }

  function agregarDado(lados) {
    const f = leerFormula(formula)
    if (f.error) { formula = formula.trim() ? `${formula.trim()}+1d${lados}` : `1d${lados}`; return }
    const g = f.grupos.find((x) => x.lados === lados && x.signo > 0)
    if (g) g.cantidad++
    else f.grupos.push({ lados, cantidad: 1, signo: 1 })
    formula = f.grupos.map((x, i) => `${x.signo < 0 ? '-' : i ? '+' : ''}${x.cantidad}d${x.lados}`).join('') + (f.modificador ? conSigno(f.modificador).replace('−', '-') : '')
  }

  const vista = $derived.by(() => {
    if (dual) {
      // Con desventaja, el primer ayudante la cancela y los demás tiran
      const cancela = ayudantes.length > 0 && ventaja === 'desventaja'
      const d6 = ayudantes.length - (cancela ? 1 : 0) + (ventaja === 'ventaja' ? 1 : 0)
      const extra = cancela
        ? `${d6 ? ` + el más alto de ${d6}d6` : ''} (la ayuda cancela tu desventaja)`
        : ayudantes.length ? ` + el más alto de ${d6}d6` : ventaja === 'ventaja' ? ' + d6' : ventaja === 'desventaja' ? ' − d6' : ''
      return `Esperanza d12 + Miedo d12${extra} ${conSigno(modificador)}`.trim()
    }
    if (modo === 'dj') {
      const base = ventaja === 'ninguna' ? 'd20' : ventaja === 'ventaja' ? '2d20 (el más alto)' : '2d20 (el más bajo)'
      return `${base} ${conSigno(modificador)}`.trim()
    }
    return formula || 'Escribe o toca los dados'
  })

  function armar() {
    const base = { tipo: modo, dificultad: leerDificultad(dificultad), etiqueta: etiqueta.trim() || null, oculta: esDJ && oculta }
    if (dual) {
      const grupos = [{ lados: 12, rol: 'esperanza' }, { lados: 12, rol: 'miedo' }]
      if (ventaja === 'ventaja') grupos.push({ lados: 6, rol: 'ventaja', signo: 1 })
      if (ventaja === 'desventaja') grupos.push({ lados: 6, rol: 'desventaja', signo: -1 })
      return { ...base, grupos, modificador, ayudantes: [...ayudantes] }
    }
    if (modo === 'dj') {
      const grupos = ventaja === 'ninguna'
        ? [{ lados: 20 }]
        : [{ lados: 20, cantidad: 2, conservar: ventaja === 'ventaja' ? 'alto' : 'bajo' }]
      return { ...base, grupos, modificador }
    }
    const f = leerFormula(formula)
    if (f.error) throw new Error(f.error)
    return { ...base, grupos: f.grupos, modificador: f.modificador, danoCritico: modo === 'dano' && critico }
  }

  function tirar() {
    error = ''
    try { onTirar(armar()); quitados = [] } catch (e) { error = e.message }
  }

  function elegirModo(id) {
    tocado = true
    modo = id
    if (id !== 'dj' && !dual) ventaja = 'ninguna'
  }
</script>

<div class="lanzador vidrio">
  <div class="pestanas modos" role="tablist" aria-label="Tipo de tirada">
    {#each modos as m (m.id)}
      <button role="tab" aria-selected={modo === m.id} class:activo={modo === m.id} onclick={() => elegirModo(m.id)} title={m.ayuda}>
        {m.nombre}
      </button>
    {/each}
  </div>
  {#each modos as m (m.id)}{#if m.id === modo}<p class="explica">{m.ayuda}</p>{/if}{/each}

  <div class="controles">
    {#if dual || modo === 'dj'}
      <div class="fila">
        <div class="paso" role="group" aria-label="Modificador">
          <button class="boton-paso" onclick={() => (modificador = Math.max(-10, modificador - 1))} aria-label="Restar 1">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5.5 12h13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
          </button>
          <output aria-label="Modificador">{modificador > 0 ? '+' : ''}{modificador}</output>
          <button class="boton-paso" onclick={() => (modificador = Math.min(20, modificador + 1))} aria-label="Sumar 1">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 5.5v13M5.5 12h13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
          </button>
        </div>
        <div class="segmentos" role="radiogroup" aria-label="Ventaja">
          <button role="radio" aria-checked={ventaja === 'ventaja'} class:ven={ventaja === 'ventaja'} onclick={() => (ventaja = ventaja === 'ventaja' ? 'ninguna' : 'ventaja')}>Ventaja</button>
          <button role="radio" aria-checked={ventaja === 'desventaja'} class:des={ventaja === 'desventaja'} onclick={() => (ventaja = ventaja === 'desventaja' ? 'ninguna' : 'desventaja')}>Desventaja</button>
        </div>
      </div>
    {/if}

    {#if puedenAyudar}
      <div class="chips ayuda" role="group" aria-label="Ayudar a un Aliado: quién te ayuda (ya lo confirmaron; gastan 1 Esperanza)">
        <span class="rotulo">Te ayudan</span>
        {#each aliados as a (a.id)}
          {@const sinEsperanza = (a.esperanza ?? 0) < 1}
          <button class="chip" class:prendido={ayudantes.includes(a.id)} aria-pressed={ayudantes.includes(a.id)} disabled={sinEsperanza}
            title={sinEsperanza ? 'No tiene Esperanza para gastar' : 'Lo confirmó: gasta 1 Esperanza y tira su d6. Tócalo para no usar su ayuda.'} onclick={() => alternarAyuda(a.id)}>
            {a.nombre} · {a.esperanza ?? 0}
          </button>
        {/each}
      </div>
    {/if}

    {#if conFormula}
      <div class="fila">
        <label class="sr-only" for="formula">Fórmula</label>
        <input id="formula" class="campo formula" placeholder="p. ej. 2d8+3" bind:value={formula} onkeydown={(e) => e.key === 'Enter' && tirar()} />
        {#if modo === 'dano'}
          <button class="boton interruptor" class:prendido={critico} aria-pressed={critico} onclick={() => (critico = !critico)}>Crítico</button>
        {/if}
      </div>
      <div class="chips" role="group" aria-label="Agregar dados">
        {#each [4, 6, 8, 10, 12, 20] as l}
          <button class="chip" onclick={() => agregarDado(l)}>d{l}</button>
        {/each}
        <button class="chip borrar" onclick={() => (formula = '')} aria-label="Borrar fórmula">Borrar</button>
      </div>
    {/if}

    {#if mas}
      <div class="fila extras">
        <input class="campo" type="number" inputmode="numeric" placeholder="Dificultad" bind:value={dificultad} aria-label="Dificultad" />
        <input class="campo nota" placeholder="¿Qué intentas?" maxlength="60" bind:value={etiqueta} aria-label="Descripción de la tirada" />
        {#if esDJ}
          <button class="boton interruptor" class:prendido={oculta} aria-pressed={oculta} onclick={() => (oculta = !oculta)}>Oculta</button>
        {/if}
      </div>
    {/if}
  </div>

  <div class="accion">
    <button class="mas" onclick={() => (mas = !mas)} aria-expanded={mas}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d={mas ? 'M6.5 14.5 12 9l5.5 5.5' : 'M6.5 9.5 12 15l5.5-5.5'} fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      {mas ? 'Menos' : 'Dificultad y nota'}
    </button>
    <button class="tirar" onclick={tirar} disabled={ocupado}>
      <span class="palabra">{ocupado ? 'Rodando…' : 'Tirar'}</span>
      <small>{vista}</small>
    </button>
  </div>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</div>

<style>
  .lanzador {
    display: grid;
    gap: 0.6rem;
    padding: 0.3rem 0.9rem 0.9rem;
    border-radius: var(--radio-panel);
  }
  .modos { margin: 0 -0.35rem; }
  .modos button { flex: 1 0 auto; }
  .explica { margin: -0.15rem 0 0; font-size: 0.82rem; color: var(--texto-suave); }
  .controles { display: grid; gap: 0.55rem; }
  .controles:empty { display: none; }
  .fila { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }

  .paso { display: flex; align-items: center; gap: 0.25rem; }
  .boton-paso {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    border: 1px solid var(--filete);
    border-radius: 12px;
    background: var(--hundido);
    color: var(--texto);
    transition: background 0.15s, transform 0.1s;
  }
  .boton-paso:hover { background: var(--hundido-2); }
  .boton-paso:active { transform: scale(0.94); }
  .paso output {
    min-width: 2.8ch;
    text-align: center;
    font-size: 1.45rem;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
  }

  .segmentos {
    display: flex;
    margin-left: auto;
    border: 1px solid var(--filete);
    border-radius: 12px;
    background: var(--hundido);
    overflow: hidden;
  }
  .segmentos button {
    min-height: 2.5rem;
    padding: 0.4rem 0.95rem;
    border: 0;
    background: none;
    font-weight: 700;
    font-size: 0.92rem;
    color: var(--texto);
    transition: background 0.15s, color 0.15s;
  }
  .segmentos button + button { border-left: 1px solid var(--filete); }
  .segmentos button:hover { background: var(--hundido-2); }
  .segmentos .ven { background: var(--exito); color: var(--sobre-color); }
  .segmentos .des { background: var(--peligro); color: var(--sobre-color); }
  .segmentos .ven:hover { background: var(--exito-hondo); }
  .segmentos .des:hover { background: var(--peligro-hondo); }

  .formula { flex: 1; min-width: 9rem; font-weight: 700; letter-spacing: 0.03em; font-variant-numeric: tabular-nums; }
  .interruptor.prendido { background: var(--peligro); border-color: var(--peligro); color: var(--sobre-color); }
  .chips { display: flex; gap: 0.35rem; flex-wrap: wrap; }
  .chip {
    min-width: 2.75rem;
    min-height: 2.25rem;
    padding: 0.3rem 0.65rem;
    border: 1px solid var(--filete);
    border-radius: 10px;
    background: var(--hundido);
    font-weight: 900;
    font-size: 0.9rem;
    transition: background 0.15s;
  }
  .chip:hover { background: var(--hundido-2); }
  .chip.borrar { margin-left: auto; font-weight: 700; color: var(--texto-suave); background: none; border-color: transparent; }
  /* Ayudar a un Aliado: quién te ayuda (cada uno gasta 1 Esperanza) */
  .ayuda { align-items: center; }
  .ayuda .rotulo { margin-right: 0.15rem; }
  .ayuda .chip { font-weight: 700; }
  .ayuda .chip.prendido { background: var(--exito); border-color: var(--exito); color: var(--sobre-color); }
  .ayuda .chip:disabled { opacity: 0.45; cursor: not-allowed; }
  .extras .campo { flex: 1; min-width: 7rem; }
  .extras .nota { flex: 2; }

  .accion { display: flex; gap: 0.5rem; align-items: center; }
  .mas {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    max-width: 8.5rem;
    padding: 0.4rem 0.35rem;
    border: 0;
    border-radius: 10px;
    background: none;
    color: var(--texto-suave);
    font-weight: 700;
    font-size: 0.85rem;
    line-height: 1.2;
    text-align: left;
  }
  .mas:hover { color: var(--texto); background: var(--hundido); }
  /* El único plato sólido de la mesa */
  .tirar {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 3.5rem;
    padding: 0.55rem 1.2rem;
    border: 0;
    border-radius: 16px;
    background: var(--texto);
    color: var(--sobre-color);
    box-shadow: 0 12px 24px -14px rgb(18 20 50 / 0.85);
    transition: background 0.15s, transform 0.1s;
  }
  .tirar:hover { background: #2c3459; }
  .tirar:active { transform: scale(0.98); }
  .tirar:disabled { background: #555b78; cursor: wait; }
  .palabra { font-size: 1.45rem; font-weight: 900; letter-spacing: 0.02em; }
  .tirar small { font-size: 0.85rem; font-weight: 700; opacity: 0.85; text-align: right; font-variant-numeric: tabular-nums; }
  .error { margin: 0; color: var(--peligro-hondo); font-size: 0.88rem; font-weight: 700; }

  @media (max-width: 759px) {
    .lanzador {
      gap: 0.5rem;
      padding: 0.2rem 0.75rem calc(0.75rem + var(--seguro-abajo));
      border-radius: var(--radio-panel) var(--radio-panel) 0 0;
      border-bottom: 0;
    }
    .explica { display: none; }
    .segmentos button { padding-inline: 0.75rem; }
    .tirar { min-height: 3.25rem; }
  }
  @media (max-height: 560px) and (min-width: 600px) {
    .lanzador { gap: 0.45rem; padding: 0.15rem 0.75rem 0.7rem; border-radius: var(--radio-panel); border-bottom: 1px solid var(--brillo); }
    .explica { display: none; }
    .tirar { min-height: 3rem; }
    .tirar small { font-size: 0.75rem; }
  }
</style>

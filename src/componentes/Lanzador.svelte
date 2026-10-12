<script>
  import { leerFormula, leerDificultad, conSigno } from '../lib/formula.js'

  let { esDJ = false, ocupado = false, onTirar } = $props()

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

  $effect(() => { if (esDJ && modo === 'accion' && !tocado) modo = 'dj' })
  // Si dejas de ser DJ (cambias a una campaña donde eres jugador), el modo
  // Adversario ya no tiene pestaña: sin esto se seguía tirando como "dj"
  $effect(() => { if (!esDJ && modo === 'dj') { modo = 'accion'; ventaja = 'ninguna' } })
  let tocado = false

  const dual = $derived(modo === 'accion' || modo === 'reaccion')
  const conFormula = $derived(modo === 'dano' || modo === 'libre')

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
      const extra = ventaja === 'ventaja' ? ' + d6' : ventaja === 'desventaja' ? ' − d6' : ''
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
      return { ...base, grupos, modificador }
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
    try { onTirar(armar()) } catch (e) { error = e.message }
  }

  function elegirModo(id) {
    tocado = true
    modo = id
    if (id !== 'dj' && !dual) ventaja = 'ninguna'
  }
</script>

<div class="lanzador vidrio">
  <div class="modos" role="tablist" aria-label="Tipo de tirada">
    {#each modos as m (m.id)}
      <button role="tab" aria-selected={modo === m.id} class:activo={modo === m.id} onclick={() => elegirModo(m.id)} title={m.ayuda}>
        {m.nombre}
      </button>
    {/each}
  </div>

  <div class="controles">
    {#if dual || modo === 'dj'}
      <div class="fila">
        <div class="paso" aria-label="Modificador">
          <button class="boton chico" onclick={() => (modificador = Math.max(-10, modificador - 1))} aria-label="Restar 1">−</button>
          <output>{modificador > 0 ? '+' : ''}{modificador}</output>
          <button class="boton chico" onclick={() => (modificador = Math.min(20, modificador + 1))} aria-label="Sumar 1">+</button>
        </div>
        <div class="segmentos" role="radiogroup" aria-label="Ventaja">
          <button role="radio" aria-checked={ventaja === 'ventaja'} class:ven={ventaja === 'ventaja'} onclick={() => (ventaja = ventaja === 'ventaja' ? 'ninguna' : 'ventaja')}>Ventaja</button>
          <button role="radio" aria-checked={ventaja === 'desventaja'} class:des={ventaja === 'desventaja'} onclick={() => (ventaja = ventaja === 'desventaja' ? 'ninguna' : 'desventaja')}>Desventaja</button>
        </div>
      </div>
    {/if}

    {#if conFormula}
      <div class="fila">
        <label class="sr-only" for="formula">Fórmula</label>
        <input id="formula" class="campo formula" placeholder="p. ej. 2d8+3" bind:value={formula} onkeydown={(e) => e.key === 'Enter' && tirar()} />
        {#if modo === 'dano'}
          <button class="boton chico interruptor" class:prendido={critico} aria-pressed={critico} onclick={() => (critico = !critico)}>Crítico</button>
        {/if}
      </div>
      <div class="chips">
        {#each [4, 6, 8, 10, 12, 20] as l}
          <button class="chip" onclick={() => agregarDado(l)}>d{l}</button>
        {/each}
        <button class="chip borrar" onclick={() => (formula = '')} aria-label="Borrar fórmula">Borrar</button>
      </div>
    {/if}

    {#if mas}
      <div class="fila extras">
        <input class="campo" type="number" inputmode="numeric" placeholder="Dificultad" bind:value={dificultad} aria-label="Dificultad" />
        <input class="campo" placeholder="¿Qué intentas?" maxlength="60" bind:value={etiqueta} aria-label="Descripción de la tirada" />
        {#if esDJ}
          <button class="boton chico interruptor" class:prendido={oculta} aria-pressed={oculta} onclick={() => (oculta = !oculta)}>Oculta</button>
        {/if}
      </div>
    {/if}
  </div>

  <div class="accion">
    <button class="mas" onclick={() => (mas = !mas)} aria-expanded={mas}>{mas ? 'Menos' : 'Dificultad y nota'}</button>
    <button class="tirar" onclick={tirar} disabled={ocupado}>
      <span class="titulo">{ocupado ? 'Rodando…' : 'Tirar'}</span>
      <small>{vista}</small>
    </button>
  </div>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</div>

<style>
  .lanzador {
    border-radius: var(--radio-panel) var(--radio-panel) 0 0;
    padding: 0.7rem 0.8rem calc(0.8rem + var(--seguro-abajo));
    display: grid;
    gap: 0.6rem;
    border-bottom: 0;
  }
  @media (min-width: 760px) {
    .lanzador { border-radius: var(--radio-panel); border-bottom: 1px solid var(--linea); padding-bottom: 0.9rem; }
  }
  .modos {
    display: flex;
    gap: 0.25rem;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .modos button {
    flex: 1 0 auto;
    border: 0;
    background: none;
    padding: 0.45rem 0.7rem;
    border-radius: 999px;
    color: var(--pergamino-suave);
    font-weight: 700;
    font-size: 0.92rem;
  }
  .modos button.activo { background: var(--pergamino); color: var(--tinta); }
  .controles { display: grid; gap: 0.5rem; }
  .fila { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
  .paso { display: flex; align-items: center; gap: 0.35rem; }
  .paso output {
    min-width: 2.6ch;
    text-align: center;
    font-family: var(--fuente-titulo);
    font-size: 1.35rem;
    font-weight: 900;
  }
  .chico { padding: 0.4rem 0.75rem; min-width: 2.4rem; }
  .segmentos { display: flex; gap: 0.3rem; margin-left: auto; }
  .segmentos button {
    border: 1px solid var(--linea);
    background: none;
    border-radius: 999px;
    padding: 0.4rem 0.8rem;
    font-weight: 700;
    font-size: 0.88rem;
  }
  .segmentos .ven { background: #2f8f7a; border-color: #6fd3b8; }
  .segmentos .des { background: #a8323e; border-color: #f2a3ab; }
  .formula { flex: 1; min-width: 9rem; font-weight: 700; letter-spacing: 0.03em; }
  .interruptor.prendido { background: var(--sangre); border-color: #ffb3bd; }
  .chips { display: flex; gap: 0.35rem; flex-wrap: wrap; }
  .chip {
    border: 1px solid var(--linea);
    background: rgba(255, 245, 230, 0.06);
    border-radius: 8px;
    padding: 0.3rem 0.6rem;
    font-weight: 800;
    font-size: 0.88rem;
  }
  .chip.borrar { color: var(--pergamino-suave); font-weight: 600; }
  .extras .campo { flex: 1; min-width: 7rem; }
  .accion { display: flex; gap: 0.6rem; align-items: stretch; }
  .mas {
    border: 0;
    background: none;
    color: var(--pergamino-suave);
    font-size: 0.82rem;
    text-decoration: underline;
    text-underline-offset: 3px;
    padding: 0 0.2rem;
    max-width: 6.5rem;
    text-align: left;
  }
  .tirar {
    flex: 1;
    border: 0;
    border-radius: 16px;
    padding: 0.55rem 1rem 0.6rem;
    background: linear-gradient(135deg, #f6cf72, #e09a35 55%, #b9641c);
    color: #2a1606;
    box-shadow: 0 8px 24px -8px rgba(240, 160, 60, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.5);
    display: grid;
    justify-items: center;
    transition: transform 0.1s, filter 0.15s;
  }
  .tirar:hover { filter: brightness(1.06); }
  .tirar:active { transform: scale(0.98); }
  .tirar:disabled { filter: saturate(0.4) brightness(0.8); cursor: wait; }
  .tirar .titulo { font-size: 1.45rem; line-height: 1.1; text-shadow: none; }
  .tirar small { font-weight: 700; font-size: 0.78rem; opacity: 0.8; }
  .error { margin: 0; color: #ffb3bd; font-size: 0.88rem; }
</style>

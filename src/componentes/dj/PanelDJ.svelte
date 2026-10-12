<script>
  import {
    app, crearEncuentro, guardarEncuentro, borrarEncuentro, activarEncuentro, terminarEncuentro,
    crearCuenta, guardarCuenta, borrarCuenta, ajustesMesa,
  } from '../../lib/mesa.svelte.js'
  import { untrack } from 'svelte'
  import { escenaDe, completarInstancia, leFalta } from '../../lib/escena.js'
  import Escena from '../Escena.svelte'
  import { puntosDeBatalla, AJUSTES_BATALLA, NOMBRE_TIPO } from '../../lib/reglas.js'
  import { md } from '../../lib/md.js'
  import Adversario from './Adversario.svelte'

  let { cat, miedo = 0, onMiedo, onTirar, onCerrar } = $props()

  let pestana = $state('encuentro')
  let elegido = $state(null)
  let error = $state('')
  let oculta = $state(false)
  let ventaja = $state('ninguna')
  let confirmar = $state(null)

  // Bestiario
  let buscar = $state('')
  let fNivel = $state(0)
  let fTipo = $state('')

  // Cuentas
  let cNombre = $state('')
  let cValor = $state(4)
  let cTipo = $state('estandar')
  let cVisible = $state(true)

  const encuentro = $derived(app.encuentros.find((e) => e.id === elegido) ?? app.encuentros.find((e) => e.activo) ?? app.encuentros[0] ?? null)
  const advPorId = $derived(cat?.porId?.adversarios ?? {})
  const pjsCampania = $derived(app.personajes.filter((p) => p.usuario_id).length || app.personajes.length || 4)
  const pjs = $derived(encuentro?.pjs ?? pjsCampania)
  const puntos = $derived(encuentro ? puntosDeBatalla(encuentro.adversarios ?? [], advPorId, pjs, encuentro.ajustes ?? []) : null)
  const entorno = $derived(encuentro?.entorno ? cat?.porId?.entornos?.[encuentro.entorno] : null)

  const quitarAcentos = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const bestiario = $derived.by(() => {
    const t = quitarAcentos(buscar.trim())
    return (cat?.adversarios ?? [])
      .filter((a) => !fNivel || a.nivel === fNivel)
      .filter((a) => !fTipo || a.tipo === fTipo)
      .filter((a) => !t || quitarAcentos(`${a.nombre} ${a.nombre_en ?? ''} ${a.motivos}`).includes(t))
      .slice(0, 80)
  })

  async function hacer(fn) {
    error = ''
    try { await fn() } catch (e) { error = e.message }
  }

  const uid = () => Math.random().toString(36).slice(2, 10)
  const instancias = () => structuredClone($state.snapshot(encuentro?.adversarios ?? []))
  // Cada instancia lleva lo que la mesa necesita (nombre del catálogo, tipo, PG máximos)
  const completar = (lista) => lista.map((i) => completarInstancia(i, advPorId[i.ref]))
  const guardarAdversarios = (id, lista) => guardarEncuentro(id, { adversarios: completar(lista) })

  // Lo que la mesa ve de este encuentro (la base de datos hace la misma cuenta)
  const vistaMesa = $derived(encuentro ? escenaDe({ ...encuentro, adversarios: completar(encuentro.adversarios ?? []) }, ajustesMesa()) : null)
  const ocultos = $derived((encuentro?.adversarios ?? []).filter((i) => i.oculto).length)

  // Encuentros guardados antes de que existiera la escena: se completan una vez
  const rellenados = new Set()
  $effect(() => {
    const e = app.encuentros.find((x) => x.activo)
    if (!e || !cat || rellenados.has(e.id)) return
    const lista = $state.snapshot(e.adversarios ?? [])
    const faltaEntorno = e.entorno && !e.entorno_nombre && cat.porId?.entornos?.[e.entorno]
    if (!faltaEntorno && !lista.some((i) => leFalta(i, advPorId[i.ref]))) return
    rellenados.add(e.id)
    const cambios = { adversarios: completar(lista) }
    if (faltaEntorno) cambios.entorno_nombre = cat.porId.entornos[e.entorno].nombre
    untrack(() => hacer(() => guardarEncuentro(e.id, cambios)))
  })

  async function nuevoEncuentro() {
    await hacer(async () => {
      const e = await crearEncuentro(`Encuentro ${app.encuentros.length + 1}`)
      elegido = e.id
      pestana = 'encuentro'
    })
  }

  async function asegurarEncuentro() {
    if (encuentro) return encuentro
    const e = await crearEncuentro('Encuentro 1')
    elegido = e.id
    return e
  }

  function agregar(adv, cantidad = 1) {
    hacer(async () => {
      const e = await asegurarEncuentro()
      const lista = structuredClone($state.snapshot(e.adversarios ?? []))
      const iguales = lista.filter((x) => x.ref === adv.id).length
      for (let i = 0; i < cantidad; i++) {
        lista.push({ uid: uid(), ref: adv.id, nombre: iguales + i > 0 || cantidad > 1 ? `${adv.nombre} ${iguales + i + 1}` : '', pg: 0, estres: 0, oculto: false })
      }
      await guardarAdversarios(e.id, lista)
    })
  }

  function cambiarInstancia(i, cambios) {
    const lista = instancias()
    lista[i] = { ...lista[i], ...cambios }
    hacer(() => guardarAdversarios(encuentro.id, lista))
  }
  function quitarInstancia(i) {
    const lista = instancias()
    lista.splice(i, 1)
    hacer(() => guardarAdversarios(encuentro.id, lista))
  }
  function duplicarInstancia(i) {
    const lista = instancias()
    lista.splice(i + 1, 0, { ...lista[i], uid: uid(), pg: 0, estres: 0, nombre: lista[i].nombre ? `${lista[i].nombre} (copia)` : '' })
    hacer(() => guardarAdversarios(encuentro.id, lista))
  }
  function alternarAjuste(id) {
    const a = encuentro.ajustes ?? []
    hacer(() => guardarEncuentro(encuentro.id, { ajustes: a.includes(id) ? a.filter((x) => x !== id) : [...a, id] }))
  }

  function tirarAtaque(adv, inst) {
    const grupos = ventaja === 'ninguna' ? [{ lados: 20 }] : [{ lados: 20, cantidad: 2, conservar: ventaja === 'ventaja' ? 'alto' : 'bajo' }]
    onTirar({ tipo: 'dj', grupos, modificador: adv.ataque?.mod ?? 0, oculta, etiqueta: `${inst.nombre || adv.nombre} · ${adv.ataque?.nombre ?? 'Ataque'}` })
  }
  function tirarDano(adv, inst, critico) {
    const d = adv.ataque.dano
    onTirar({ tipo: 'dano', grupos: [{ lados: d.lados, cantidad: d.dados || 1 }], modificador: d.mod ?? 0, oculta, danoCritico: critico, etiqueta: `Daño · ${inst.nombre || adv.nombre}` })
  }

  const GASTOS = [
    { texto: 'Interrumpir y tomar el foco' },
    { texto: 'Dar el foco a otro adversario' },
    { texto: 'Rasgo de Miedo' },
    { texto: 'Sumar una Experiencia' },
  ]

  function nuevaCuenta(e) {
    e.preventDefault()
    if (!cNombre.trim()) return
    const v = Math.max(0, Math.min(99, +cValor || 0))
    hacer(async () => {
      await crearCuenta({ nombre: cNombre.trim(), valor: v, inicial: v, tipo: cTipo, visible: cVisible })
      cNombre = ''
    })
  }

  const TIPOS_CUENTA = { estandar: 'Estándar', dinamica: 'Dinámica', bucle: 'En bucle', 'largo-plazo': 'Largo plazo' }
</script>

<div class="velo" onclick={onCerrar} role="presentation"></div>
<section class="panel vidrio" aria-label="Panel del DJ">
  <header class="cabecera">
    <h2 class="titulo">Panel del DJ</h2>
    <div class="miedo-ctl" aria-label="Miedo: {miedo} de 12">
      <button class="boton chico" disabled={miedo <= 0} onclick={() => hacer(() => onMiedo(-1))} aria-label="Gastar 1 Miedo">−</button>
      <span class="miedo-num titulo">{miedo}<small>Miedo</small></span>
      <button class="boton chico" disabled={miedo >= 12} onclick={() => hacer(() => onMiedo(1))} aria-label="Ganar 1 Miedo">+</button>
    </div>
    <button class="cerrar" onclick={onCerrar} aria-label="Cerrar panel">✕</button>
  </header>

  <div class="gastos" aria-label="Gastar Miedo">
    {#each GASTOS as g}
      <button class="gasto" disabled={miedo <= 0} onclick={() => hacer(() => onMiedo(-1))}>{g.texto}<small>−1</small></button>
    {/each}
  </div>

  <nav class="pestanas">
    {#each [['encuentro', 'Encuentro'], ['bestiario', 'Bestiario'], ['entornos', 'Entornos'], ['cuentas', `Cuentas (${app.cuentas.length})`]] as [id, n]}
      <button class:activa={pestana === id} onclick={() => (pestana = id)} aria-current={pestana === id}>{n}</button>
    {/each}
  </nav>

  {#if error}<p class="error" role="alert">{error}</p>{/if}

  <div class="cuerpo">
    {#if pestana === 'encuentro'}
      <div class="fila">
        <select class="campo" value={encuentro?.id ?? ''} onchange={(e) => (elegido = e.currentTarget.value)} aria-label="Encuentro">
          {#each app.encuentros as e (e.id)}<option value={e.id}>{e.nombre}{e.activo ? ' · activo' : ''}</option>{/each}
          {#if !app.encuentros.length}<option value="">Sin encuentros</option>{/if}
        </select>
        <button class="boton chico" onclick={nuevoEncuentro}>Nuevo</button>
      </div>

      {#if encuentro}
        <div class="fila">
          <input class="campo" value={encuentro.nombre} onchange={(e) => hacer(() => guardarEncuentro(encuentro.id, { nombre: e.currentTarget.value || 'Encuentro' }))} aria-label="Nombre del encuentro" />
          {#if encuentro.activo}
            <button class="boton chico" onclick={() => hacer(() => terminarEncuentro(encuentro.id))} title="La mesa deja de verlo">Terminar encuentro</button>
          {:else}
            <button class="boton chico" onclick={() => hacer(async () => { await guardarAdversarios(encuentro.id, instancias()); await activarEncuentro(encuentro.id) })}>Activar</button>
          {/if}
          <button class="boton chico" onclick={() => { if (confirmar === encuentro.id) { hacer(() => borrarEncuentro(encuentro.id)); confirmar = null; elegido = null } else confirmar = encuentro.id }}>{confirmar === encuentro.id ? '¿Borrar?' : 'Borrar'}</button>
        </div>

        <div class="presupuesto" class:pasado={puntos.restante < 0}>
          <div class="barra" aria-hidden="true"><span style:width="{Math.min(100, (puntos.gastado / Math.max(1, puntos.presupuesto)) * 100)}%"></span></div>
          <p class="pb">
            <b class="titulo">{puntos.gastado} / {puntos.presupuesto}</b> puntos de batalla
            {#if puntos.restante > 0}· te quedan {puntos.restante}{:else if puntos.restante < 0}· te pasaste por {-puntos.restante}{:else}· justo{/if}
          </p>
          <p class="ayuda">
            Base 3 × <input class="campo mini" type="number" min="1" max="12" value={pjs} onchange={(e) => hacer(() => guardarEncuentro(encuentro.id, { pjs: Math.max(1, +e.currentTarget.value || 1) }))} aria-label="PJ en el combate" /> PJ + 2 = {puntos.base}
            {#each puntos.automaticos as a} · {a.texto} {a.puntos > 0 ? '+' : ''}{a.puntos}{/each}
          </p>
          <div class="ajustes">
            {#each AJUSTES_BATALLA as a (a.id)}
              <button class="chip" class:activo={(encuentro.ajustes ?? []).includes(a.id)} onclick={() => alternarAjuste(a.id)}>{a.texto} {a.puntos > 0 ? '+' : ''}{a.puntos}</button>
            {/each}
          </div>
        </div>

        <div class="opciones-tirada">
          <div class="segmentos" role="radiogroup" aria-label="Ventaja del adversario">
            <button role="radio" aria-checked={ventaja === 'ventaja'} class:ven={ventaja === 'ventaja'} onclick={() => (ventaja = ventaja === 'ventaja' ? 'ninguna' : 'ventaja')}>Ventaja</button>
            <button role="radio" aria-checked={ventaja === 'desventaja'} class:des={ventaja === 'desventaja'} onclick={() => (ventaja = ventaja === 'desventaja' ? 'ninguna' : 'desventaja')}>Desventaja</button>
          </div>
          <label class="ocultas"><input type="checkbox" bind:checked={oculta} /> Tiradas ocultas</label>
        </div>

        {#if entorno}
          <details class="entorno">
            <summary><b>{entorno.nombre}</b> · Entorno · Dificultad {entorno.dificultad ?? '—'}</summary>
            <p class="ayuda">{entorno.impulsos}</p>
            {#each entorno.rasgos ?? [] as r}
              <div class="r"><p><b>{r.nombre}</b> <small>{r.clase}</small></p>{@html md(r.texto)}</div>
            {/each}
            <button class="boton chico" onclick={() => hacer(() => guardarEncuentro(encuentro.id, { entorno: null, entorno_nombre: null }))}>Quitar entorno</button>
          </details>
        {/if}

        <div class="lista">
          {#each encuentro.adversarios ?? [] as inst, i (inst.uid)}
            {@const adv = advPorId[inst.ref]}
            {#if adv}
              <Adversario {adv} instancia={inst}
                onCambiar={(c) => cambiarInstancia(i, c)}
                onTirarAtaque={() => tirarAtaque(adv, inst)}
                onTirarDano={(crit) => tirarDano(adv, inst, crit)}
                onQuitar={() => quitarInstancia(i)}
                onDuplicar={() => duplicarInstancia(i)} />
            {:else}
              <p class="vacio">«{inst.ref}» ya no existe en el catálogo. <button class="boton chico" onclick={() => quitarInstancia(i)}>Quitar</button></p>
            {/if}
          {:else}
            <p class="vacio">Sin adversarios. Agrégalos desde el Bestiario.</p>
          {/each}
        </div>
        <button class="boton" onclick={() => (pestana = 'bestiario')}>Agregar adversarios</button>

        <section class="vista-mesa" aria-label="Así lo ve la mesa">
          <p class="vm-titulo">
            <b>Así lo ve la mesa</b>
            <small>{encuentro.activo ? 'en escena ahora' : 'cuando lo actives'}{ocultos ? ` · ${ocultos} oculto${ocultos > 1 ? 's' : ''}` : ''}</small>
          </p>
          {#if vistaMesa}
            <Escena escena={vistaMesa} incrustada />
          {:else}
            <p class="ayuda">{encuentro.adversarios?.length ? 'Todo está oculto: la mesa no ve nada, ni el nombre del encuentro.' : 'Sin adversarios, la mesa no ve nada.'}</p>
          {/if}
          <p class="ayuda">Sin números: solo nombre, tipo y estado (Ileso · Herido · Grave · Caído).</p>
        </section>
      {:else}
        <p class="vacio">Crea tu primer encuentro para empezar a armar la pelea.</p>
      {/if}

    {:else if pestana === 'bestiario'}
      <input class="campo" placeholder="Buscar: oso, bandido, sombra…" bind:value={buscar} aria-label="Buscar adversario" />
      <div class="filtros">
        {#each [0, 1, 2, 3, 4] as n}<button class="chip" class:activo={fNivel === n} onclick={() => (fNivel = n)}>{n ? `Rango ${n}` : 'Todos'}</button>{/each}
      </div>
      <div class="filtros">
        <button class="chip" class:activo={!fTipo} onclick={() => (fTipo = '')}>Todo tipo</button>
        {#each Object.entries(NOMBRE_TIPO) as [k, v]}<button class="chip" class:activo={fTipo === k} onclick={() => (fTipo = k)}>{v}</button>{/each}
      </div>
      <p class="ayuda">{encuentro ? `Se agregan a «${encuentro.nombre}».` : 'Al agregar se crea un encuentro.'}{puntos ? ` Te quedan ${puntos.restante} puntos.` : ''}</p>
      <div class="lista">
        {#each bestiario as a (a.id)}
          <Adversario adv={a}>
            {#snippet acciones()}
              {#if a.tipo === 'esbirro'}
                <button class="boton chico" onclick={() => agregar(a, pjs)} title="Un grupo del tamaño de tu mesa cuesta 1 punto">+{pjs}</button>
              {:else}
                <button class="boton chico" onclick={() => agregar(a)}>+1</button>
              {/if}
            {/snippet}
          </Adversario>
        {:else}
          <p class="vacio">Nada coincide con esa búsqueda.</p>
        {/each}
      </div>

    {:else if pestana === 'entornos'}
      <div class="lista">
        {#each cat?.entornos ?? [] as e (e.id)}
          <details class="entorno">
            <summary><b>{e.nombre}</b> · Rango {e.nivel} · Dificultad {e.dificultad ?? '—'}</summary>
            <p class="desc">{e.descripcion}</p>
            <p class="ayuda"><b>Impulsos:</b> {e.impulsos}</p>
            {#if e.posibles_adversarios}<p class="ayuda"><b>Posibles adversarios:</b> {e.posibles_adversarios}</p>{/if}
            {#each e.rasgos ?? [] as r}
              <div class="r"><p><b>{r.nombre}</b> <small>{r.clase}{r.cuenta_regresiva ? ` · ${r.cuenta_regresiva}` : ''}</small></p>{@html md(r.texto)}</div>
            {/each}
            <button class="boton chico" onclick={() => hacer(async () => { const enc = await asegurarEncuentro(); await guardarEncuentro(enc.id, { entorno: e.id, entorno_nombre: e.nombre }); pestana = 'encuentro' })}>Usar en el encuentro</button>
          </details>
        {/each}
      </div>

    {:else if pestana === 'cuentas'}
      <form class="nueva-cuenta" onsubmit={nuevaCuenta}>
        <input class="campo" placeholder="¿Qué pasa cuando llegue a 0?" bind:value={cNombre} maxlength="80" aria-label="Nombre de la cuenta" />
        <input class="campo mini" type="number" min="1" max="99" bind:value={cValor} aria-label="Valor inicial" />
        <select class="campo" bind:value={cTipo} aria-label="Tipo">
          {#each Object.entries(TIPOS_CUENTA) as [k, v]}<option value={k}>{v}</option>{/each}
        </select>
        <label class="ocultas"><input type="checkbox" bind:checked={cVisible} /> La mesa la ve</label>
        <button class="boton chico" disabled={!cNombre.trim()}>Crear</button>
      </form>
      <p class="ayuda">Estándar: baja 1 en cada tirada. Dinámica: baja 0–3 según el resultado. En bucle: al llegar a 0 vuelve a empezar.</p>
      <div class="lista">
        {#each app.cuentas as c (c.id)}
          <div class="cuenta" class:cero={c.valor <= 0}>
            <span class="c-num titulo">{c.valor}</span>
            <span class="c-info"><b>{c.nombre}</b><small>{TIPOS_CUENTA[c.tipo]} · empezó en {c.inicial}{c.visible ? '' : ' · oculta'}</small></span>
            <span class="c-btn">
              <button class="boton chico" disabled={c.valor <= 0} onclick={() => hacer(() => guardarCuenta(c.id, { valor: c.valor - 1 }))} aria-label="Bajar">−1</button>
              <button class="boton chico" onclick={() => hacer(() => guardarCuenta(c.id, { valor: c.valor + 1 }))} aria-label="Subir">+1</button>
              <button class="boton chico" onclick={() => hacer(() => guardarCuenta(c.id, { valor: c.inicial }))} title="Reiniciar">↺</button>
              <button class="boton chico" onclick={() => hacer(() => guardarCuenta(c.id, { visible: !c.visible }))}>{c.visible ? 'Ocultar' : 'Mostrar'}</button>
              <button class="boton chico" onclick={() => hacer(() => borrarCuenta(c.id))} aria-label="Borrar">✕</button>
            </span>
          </div>
        {:else}
          <p class="vacio">Sin cuentas regresivas.</p>
        {/each}
      </div>
    {/if}
  </div>
</section>

<style>
  .velo { position: fixed; inset: 0; background: rgba(8, 4, 18, 0.45); z-index: 8; }
  .panel {
    position: fixed; z-index: 9; top: 0; bottom: 0; left: 0; width: min(100%, 600px);
    display: flex; flex-direction: column;
    border-radius: 0 var(--radio-panel) var(--radio-panel) 0;
    background: rgba(22, 15, 38, 0.97); border-left: 4px solid var(--miedo);
    animation: entrar 0.25s ease-out;
  }
  @keyframes entrar { from { transform: translateX(-24px); opacity: 0; } }
  .cabecera, .gastos, .pestanas { flex: none; }
  .cabecera { display: flex; align-items: center; gap: 0.7rem; padding: calc(0.8rem + env(safe-area-inset-top, 0px)) 1rem 0.3rem; }
  h2 { margin: 0; font-size: 1.5rem; flex: 1; }
  .miedo-ctl { display: flex; align-items: center; gap: 0.35rem; }
  .miedo-num { display: grid; justify-items: center; font-size: 1.6rem; line-height: 1; color: #d6bfff; min-width: 3.2rem; text-shadow: 0 0 14px rgba(167, 124, 232, 0.6); }
  .miedo-num small { font-family: var(--fuente); font-size: 0.65rem; color: var(--pergamino-suave); font-weight: 700; }
  .chico { padding: 0.35rem 0.65rem; font-size: 0.82rem; }
  .cerrar { border: 0; background: none; font-size: 1.15rem; padding: 0.25rem 0.5rem; }
  .gastos { display: flex; gap: 0.3rem; padding: 0 1rem 0.5rem; overflow-x: auto; scrollbar-width: none; }
  .gasto { flex: none; border: 1px solid rgba(167, 124, 232, 0.4); background: rgba(91, 47, 145, 0.25); border-radius: 999px; padding: 0.3rem 0.7rem; font-size: 0.78rem; font-weight: 700; display: flex; gap: 0.35rem; align-items: center; }
  .gasto small { color: #d6bfff; }
  .gasto:disabled { opacity: 0.4; }
  .pestanas { display: flex; gap: 0.2rem; overflow-x: auto; padding: 0.2rem 0.8rem 0.5rem; border-bottom: 1px solid var(--linea); scrollbar-width: none; }
  .pestanas button { flex: none; border: 0; background: none; color: var(--pergamino-suave); font-weight: 700; padding: 0.4rem 0.75rem; border-radius: 999px; font-size: 0.9rem; }
  .pestanas button.activa { background: rgba(167, 124, 232, 0.3); color: var(--pergamino); }
  .error { margin: 0.4rem 1rem 0; color: #ffb3bd; font-size: 0.88rem; }
  .cuerpo { overflow-y: auto; padding: 0.7rem 1rem calc(1.4rem + var(--seguro-abajo)); display: grid; gap: 0.6rem; align-content: start; overscroll-behavior: contain; }
  .fila { display: flex; gap: 0.4rem; align-items: center; }
  .fila .campo { flex: 1; min-width: 0; }
  .mini { width: 3.6rem; padding: 0.3rem 0.4rem; text-align: center; display: inline-block; }
  .presupuesto { border-radius: 14px; padding: 0.6rem 0.75rem; background: rgba(255, 245, 230, 0.05); border: 1px solid var(--linea); display: grid; gap: 0.35rem; }
  .barra { height: 8px; border-radius: 999px; background: rgba(255, 245, 230, 0.1); overflow: hidden; }
  .barra span { display: block; height: 100%; background: linear-gradient(90deg, var(--exito), var(--esperanza)); transition: width 0.3s; }
  .pasado .barra span { background: var(--sangre); }
  .pb { margin: 0; font-size: 0.9rem; }
  .pb b { font-size: 1.15rem; text-shadow: none; }
  .ayuda { margin: 0; color: var(--pergamino-suave); font-size: 0.8rem; }
  .ajustes, .filtros { display: flex; gap: 0.3rem; flex-wrap: wrap; }
  .chip { border: 1px solid var(--linea); background: none; border-radius: 999px; padding: 0.25rem 0.6rem; font-size: 0.76rem; font-weight: 700; }
  .chip.activo { background: var(--pergamino); color: var(--tinta); }
  .opciones-tirada { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
  .segmentos { display: flex; gap: 0.3rem; }
  .segmentos button { border: 1px solid var(--linea); background: none; border-radius: 999px; padding: 0.3rem 0.7rem; font-weight: 700; font-size: 0.8rem; }
  .segmentos .ven { background: #2f8f7a; border-color: #6fd3b8; }
  .segmentos .des { background: #a8323e; border-color: #f2a3ab; }
  .ocultas { display: flex; gap: 0.3rem; align-items: center; font-size: 0.82rem; }
  .lista { display: grid; gap: 0.5rem; }
  .vacio { margin: 0; color: var(--pergamino-suave); font-size: 0.9rem; }
  .entorno { border-radius: 14px; border: 1px solid rgba(79, 174, 107, 0.45); background: rgba(79, 174, 107, 0.08); padding: 0.55rem 0.75rem; font-size: 0.86rem; line-height: 1.45; }
  .entorno summary { cursor: pointer; }
  .entorno .r p { margin: 0.4rem 0 0.1rem; }
  .entorno :global(p) { margin: 0.2rem 0; }
  .desc { font-style: italic; color: var(--pergamino-suave); margin: 0.3rem 0; }
  .vista-mesa { border-radius: 14px; border: 1px dashed rgba(240, 189, 85, 0.45); padding: 0.55rem 0.7rem; display: grid; gap: 0.4rem; background: rgba(240, 189, 85, 0.05); }
  .vm-titulo { margin: 0; display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap; font-size: 0.88rem; }
  .vm-titulo small { color: var(--pergamino-suave); font-size: 0.76rem; }
  .nueva-cuenta { display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center; }
  .nueva-cuenta .campo:first-child { flex: 1 1 100%; }
  .cuenta { display: flex; gap: 0.6rem; align-items: center; padding: 0.5rem 0.65rem; border-radius: 12px; background: rgba(255, 245, 230, 0.05); border: 1px solid var(--linea); flex-wrap: wrap; }
  .cuenta.cero { border-color: var(--sangre); background: rgba(217, 74, 92, 0.15); }
  .c-num { font-size: 1.8rem; min-width: 2.2ch; text-align: center; text-shadow: none; }
  .c-info { flex: 1; display: grid; min-width: 8rem; }
  .c-info small { color: var(--pergamino-suave); font-size: 0.75rem; }
  .c-btn { display: flex; gap: 0.25rem; flex-wrap: wrap; }
  @media (min-width: 1100px) { .velo { display: none; } }
  @media (max-width: 600px) { .panel { width: 100%; border-radius: 0; border-left: 0; border-top: 4px solid var(--miedo); background: rgb(22, 15, 38); } }
</style>

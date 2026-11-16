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
  import Icono from '../Icono.svelte'
  import { crearCola } from './cola.js'

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

  // Guardados en fila (ver cola.js): mientras el servidor no confirma, se ve
  // la copia local, para que una respuesta o un eco viejo no borre clics nuevos
  let localesE = $state({})
  let localesC = $state({})
  const colaE = crearCola((id, c) => guardarEncuentro(id, c), { alCambiar: (v) => { localesE = v } })
  const colaC = crearCola((id, c) => guardarCuenta(id, c), { alCambiar: (v) => { localesC = v } })
  const conLocal = (fila, locales) => (fila && locales[fila.id] ? { ...fila, ...locales[fila.id] } : fila)
  const guardarE = (id, cambios) => colaE.poner(id, cambios)

  const encuentroBase = $derived(app.encuentros.find((e) => e.id === elegido) ?? app.encuentros.find((e) => e.activo) ?? app.encuentros[0] ?? null)
  const encuentro = $derived(conLocal(encuentroBase, localesE))
  const cuentas = $derived(app.cuentas.map((c) => conLocal(c, localesC)))
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
  const guardarAdversarios = (id, lista) => guardarE(id, { adversarios: completar(lista) })

  // Lo que la mesa ve de este encuentro (la base de datos hace la misma cuenta)
  const vistaMesa = $derived(encuentro ? escenaDe({ ...encuentro, adversarios: completar(encuentro.adversarios ?? []) }, ajustesMesa()) : null)
  const ocultos = $derived((encuentro?.adversarios ?? []).filter((i) => i.oculto).length)

  // Encuentros guardados antes de que existiera la escena: se completan una vez
  const rellenados = new Set()
  $effect(() => {
    const e = app.encuentros.find((x) => x.activo)
    if (!e || !cat || rellenados.has(e.id)) return
    const lista = $state.snapshot(colaE.local(e.id)?.adversarios ?? e.adversarios ?? [])
    const faltaEntorno = e.entorno && !e.entorno_nombre && cat.porId?.entornos?.[e.entorno]
    if (!faltaEntorno && !lista.some((i) => leFalta(i, advPorId[i.ref]))) return
    rellenados.add(e.id)
    const cambios = { adversarios: completar(lista) }
    if (faltaEntorno) cambios.entorno_nombre = cat.porId.entornos[e.entorno].nombre
    untrack(() => hacer(() => guardarE(e.id, cambios)))
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
    hacer(() => guardarE(encuentro.id, { ajustes: a.includes(id) ? a.filter((x) => x !== id) : [...a, id] }))
  }

  function tirarAtaque(adv, inst) {
    const grupos = ventaja === 'ninguna' ? [{ lados: 20 }] : [{ lados: 20, cantidad: 2, conservar: ventaja === 'ventaja' ? 'alto' : 'bajo' }]
    onTirar({ tipo: 'dj', grupos, modificador: adv.ataque?.mod ?? 0, oculta, etiqueta: `${inst.nombre || adv.nombre} · ${adv.ataque?.nombre ?? 'Ataque'}` })
  }
  function tirarDano(adv, inst, critico, dano) {
    const d = dano ?? adv.ataque.dano
    onTirar({ tipo: 'dano', grupos: [{ lados: d.lados, cantidad: d.dados || 1 }], modificador: d.mod ?? 0, oculta, danoCritico: critico, etiqueta: `Daño · ${inst.nombre || adv.nombre}${d.horda ? ' (horda)' : ''}` })
  }

  const GASTOS = [
    { texto: 'Interrumpir y tomar el foco', costo: 1 },
    { texto: 'Dar el foco a otro adversario', costo: 1 },
    { texto: 'Rasgo de Miedo', costo: 1 },
    { texto: 'Sumar una Experiencia', costo: 1 },
  ]

  function nuevaCuenta(e) {
    e.preventDefault()
    if (!cNombre.trim()) return
    const v = Math.max(1, Math.min(99, Math.round(+cValor) || 1))
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
    <div class="miedo-ctl" role="group" aria-label="Miedo: {miedo} de 12">
      <button class="boton paso" disabled={miedo <= 0} onclick={() => hacer(() => onMiedo(-1))} aria-label="Gastar 1 Miedo"><Icono nombre="menos" /></button>
      <span class="miedo-num num">{miedo}<small>Miedo</small></span>
      <button class="boton paso" disabled={miedo >= 12} onclick={() => hacer(() => onMiedo(1))} aria-label="Ganar 1 Miedo"><Icono nombre="mas" /></button>
    </div>
    <button class="icono" onclick={onCerrar} aria-label="Cerrar panel"><Icono nombre="cerrar" /></button>
  </header>

  <div class="gastos" role="group" aria-label="Gastar Miedo">
    {#each GASTOS as g}
      <button class="boton gasto" disabled={miedo < g.costo} onclick={() => hacer(() => onMiedo(-g.costo))}>{g.texto}<small>−{g.costo} Miedo</small></button>
    {/each}
  </div>

  <nav class="pestanas" aria-label="Secciones del panel">
    {#each [['encuentro', 'Encuentro'], ['bestiario', 'Bestiario'], ['entornos', 'Entornos'], ['cuentas', `Cuentas (${app.cuentas.length})`]] as [id, n]}
      <button class:activa={pestana === id} onclick={() => (pestana = id)} aria-selected={pestana === id}>{n}</button>
    {/each}
  </nav>

  {#if error}<p class="aviso-error error" role="alert">{error}</p>{/if}

  <div class="cuerpo">
    {#if pestana === 'encuentro'}
      <div class="fila">
        <select class="campo" value={encuentro?.id ?? ''} onchange={(e) => (elegido = e.currentTarget.value)} aria-label="Encuentro">
          {#each app.encuentros as e (e.id)}<option value={e.id}>{e.nombre}{e.activo ? ' · activo' : ''}</option>{/each}
          {#if !app.encuentros.length}<option value="">Sin encuentros</option>{/if}
        </select>
        <button class="boton" onclick={nuevoEncuentro}><Icono nombre="mas" tam={18} />Nuevo</button>
      </div>

      {#if encuentro}
        <div class="fila">
          <input class="campo" value={encuentro.nombre} onchange={(e) => { const nombre = e.currentTarget.value.trim().slice(0, 80) || 'Encuentro'; hacer(() => guardarE(encuentro.id, { nombre })) }} aria-label="Nombre del encuentro" />
          {#if encuentro.activo}
            <button class="boton" onclick={() => hacer(async () => { await colaE.esperar(); await terminarEncuentro(encuentro.id) })} title="La mesa deja de verlo">Terminar encuentro</button>
          {:else}
            <button class="boton" onclick={() => hacer(async () => { await guardarAdversarios(encuentro.id, instancias()); await colaE.esperar(); await activarEncuentro(encuentro.id) })}>Activar</button>
          {/if}
          <button class="boton" onclick={() => { if (confirmar === encuentro.id) { const id = encuentro.id; hacer(async () => { await colaE.esperar(); colaE.olvidar(id); await borrarEncuentro(id) }); confirmar = null; elegido = null } else confirmar = encuentro.id }}>{confirmar === encuentro.id ? '¿Borrar?' : 'Borrar'}</button>
        </div>

        <div class="presupuesto" class:pasado={puntos.restante < 0}>
          <div class="barra" aria-hidden="true"><span style:width="{Math.min(100, (puntos.gastado / Math.max(1, puntos.presupuesto)) * 100)}%"></span></div>
          <p class="pb">
            <b class="titulo">{puntos.gastado} / {puntos.presupuesto}</b> puntos de batalla
            {#if puntos.restante > 0}· te quedan {puntos.restante}{:else if puntos.restante < 0}· te pasaste por {-puntos.restante}{:else}· justo{/if}
          </p>
          <p class="ayuda">
            Base 3 × <input class="campo mini" type="number" min="1" max="12" value={pjs} onchange={(e) => { const pjs = Math.max(1, Math.min(12, Math.round(+e.currentTarget.value) || 1)); hacer(() => guardarE(encuentro.id, { pjs })) }} aria-label="PJ en el combate" /> PJ + 2 = {puntos.base}
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
            <button class="boton" onclick={() => hacer(() => guardarE(encuentro.id, { entorno: null, entorno_nombre: null }))}>Quitar entorno</button>
          </details>
        {/if}

        <div class="lista">
          {#each encuentro.adversarios ?? [] as inst, i (inst.uid)}
            {@const adv = advPorId[inst.ref]}
            {#if adv}
              <Adversario {adv} instancia={inst}
                onCambiar={(c) => cambiarInstancia(i, c)}
                onTirarAtaque={() => tirarAtaque(adv, inst)}
                onTirarDano={(crit, dano) => tirarDano(adv, inst, crit, dano)}
                onQuitar={() => quitarInstancia(i)}
                onDuplicar={() => duplicarInstancia(i)} />
            {:else}
              <p class="vacio">«{inst.ref}» ya no existe en el catálogo. <button class="boton" onclick={() => quitarInstancia(i)}>Quitar de la lista</button></p>
            {/if}
          {:else}
            <p class="vacio">Este encuentro está vacío. Abre el Bestiario y toca «+1» en un adversario para sumarlo.</p>
          {/each}
        </div>
        <button class="boton" onclick={() => (pestana = 'bestiario')}><Icono nombre="mas" tam={18} />Agregar adversarios</button>

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
        <p class="vacio">Aún no hay encuentros. Crea uno con «Nuevo» para armar la pelea.</p>
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
                <button class="boton" onclick={() => agregar(a, pjs)} title="Un grupo del tamaño de tu mesa cuesta 1 punto">+{pjs}</button>
              {:else}
                <button class="boton" onclick={() => agregar(a)}>+1</button>
              {/if}
            {/snippet}
          </Adversario>
        {:else}
          <p class="vacio">Nada coincide con esa búsqueda. Prueba otra palabra o quita los filtros.</p>
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
            <button class="boton" onclick={() => hacer(async () => { const enc = await asegurarEncuentro(); await guardarE(enc.id, { entorno: e.id, entorno_nombre: e.nombre }); pestana = 'encuentro' })}>Usar en el encuentro</button>
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
        <button class="boton" disabled={!cNombre.trim()}>Crear</button>
      </form>
      <p class="ayuda">Estándar: baja 1 en cada tirada. Dinámica: baja 0–3 según el resultado. En bucle: al llegar a 0 vuelve a empezar.</p>
      <div class="lista">
        {#each cuentas as c (c.id)}
          <div class="cuenta" class:cero={c.valor <= 0}>
            <span class="c-num titulo">{c.valor}</span>
            <span class="c-info"><b>{c.nombre}</b><small>{TIPOS_CUENTA[c.tipo]} · empezó en {c.inicial}{c.visible ? '' : ' · oculta'}</small></span>
            <span class="c-btn">
              <button class="boton" disabled={c.valor <= 0} onclick={() => hacer(() => colaC.poner(c.id, { valor: Math.max(0, c.valor - 1) }))} aria-label="Bajar">−1</button>
              <button class="boton" disabled={c.valor >= 99} onclick={() => hacer(() => colaC.poner(c.id, { valor: Math.min(99, c.valor + 1) }))} aria-label="Subir">+1</button>
              <button class="boton" onclick={() => hacer(() => colaC.poner(c.id, { valor: c.inicial }))} title="Reiniciar" aria-label="Reiniciar"><Icono nombre="reiniciar" tam={18} /></button>
              <button class="boton" onclick={() => hacer(() => colaC.poner(c.id, { visible: !c.visible }))}>{c.visible ? 'Ocultar' : 'Mostrar'}</button>
              <button class="boton" onclick={() => hacer(async () => { await colaC.esperar(); colaC.olvidar(c.id); await borrarCuenta(c.id) })} aria-label="Borrar"><Icono nombre="basura" tam={18} /></button>
            </span>
          </div>
        {:else}
          <p class="vacio">Aún no hay cuentas regresivas. Escribe un nombre arriba, elige su valor y toca «Crear».</p>
        {/each}
      </div>
    {/if}
  </div>
</section>

<style>
  .velo { position: fixed; inset: 0; background: var(--velo); z-index: 8; animation: aparecer-velo 0.25s ease-out; }
  @keyframes aparecer-velo { from { opacity: 0; } }
  .panel {
    position: fixed; z-index: 9; top: calc(84px + var(--seguro-arriba)); bottom: 12px; left: 12px; width: min(600px, calc(100% - 24px));
    display: flex; flex-direction: column; overflow: hidden;
    border-radius: var(--radio-panel);
    background: var(--superficie-firme); box-shadow: var(--sombra-alta);
    animation: entrar 0.25s var(--suave);
  }
  @keyframes entrar { from { transform: translateX(-24px); opacity: 0; } }
  .cabecera, .gastos, .pestanas { flex: none; }
  .cabecera { display: flex; align-items: center; gap: 0.7rem; padding: 0.9rem 1rem 0.5rem 1.2rem; }
  h2 { margin: 0; font-size: 1.5rem; flex: 1; min-width: 0; }
  .miedo-ctl { display: flex; align-items: center; gap: 0.3rem; }
  .paso { width: 2.5rem; padding: 0; border-radius: 50%; }
  .miedo-num { display: grid; justify-items: center; font-size: 2rem; font-weight: 900; line-height: 1; color: var(--miedo-hondo); min-width: 3.4rem; }
  .miedo-num small { font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--texto-suave); font-weight: 700; }
  .gastos { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0.3rem 1rem 0.7rem; }
  .gasto { flex: none; border-radius: 999px; background: var(--miedo-suave); border-color: color-mix(in srgb, var(--miedo) 35%, transparent); color: var(--miedo-hondo); font-size: 0.85rem; }
  .gasto:hover:not(:disabled) { background: color-mix(in srgb, var(--miedo) 22%, transparent); }
  .gasto small { font-size: 0.75rem; font-weight: 900; padding: 0.05rem 0.45rem; border-radius: 999px; background: var(--miedo-hondo); color: var(--sobre-color); }
  .pestanas { padding: 0 0.8rem; }
  .error { margin: 0.5rem 1rem 0; }
  .cuerpo { flex: 1; min-height: 0; overflow-y: auto; padding: 1rem 1rem calc(1.4rem + var(--seguro-abajo)); display: grid; gap: 0.75rem; align-content: start; overscroll-behavior: contain; }
  .fila { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
  .fila .campo { flex: 1; min-width: 8rem; }
  .mini { width: 4rem; text-align: center; display: inline-block; }
  .presupuesto { border-radius: var(--radio-control); padding: 0.75rem 0.9rem; background: var(--hundido); border: 1px solid var(--filete); display: grid; gap: 0.5rem; }
  .barra { height: 8px; border-radius: 999px; background: var(--hundido-2); overflow: hidden; }
  .barra span { display: block; height: 100%; background: var(--exito); transition: width 0.3s; }
  .pasado .barra span { background: var(--peligro); }
  .pb { margin: 0; font-size: 1rem; }
  .pb b { font-size: 1.1rem; font-weight: 900; font-variant-numeric: tabular-nums; }
  .pasado .pb { color: var(--peligro-hondo); }
  .ayuda { margin: 0; color: var(--texto-suave); font-size: 0.85rem; }
  .ajustes, .filtros { display: flex; gap: 0.35rem; flex-wrap: wrap; }
  .chip { min-height: 2.25rem; border: 1px solid var(--filete); background: var(--hundido); color: var(--texto); border-radius: 999px; padding: 0.3rem 0.8rem; font-size: 0.85rem; font-weight: 700; }
  .chip:hover { background: var(--hundido-2); }
  .chip.activo { background: #fff; border-color: var(--filete-fuerte); box-shadow: inset 0 0 0 1.5px var(--texto); }
  .opciones-tirada { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
  .segmentos { display: flex; gap: 0.35rem; }
  .segmentos button { min-height: 2.5rem; border: 1px solid var(--filete); background: var(--hundido); border-radius: 999px; padding: 0.4rem 0.9rem; font-weight: 700; font-size: 0.9rem; }
  .segmentos .ven { background: var(--exito-hondo); border-color: var(--exito-hondo); color: var(--sobre-color); }
  .segmentos .des { background: var(--peligro-hondo); border-color: var(--peligro-hondo); color: var(--sobre-color); }
  .ocultas { display: flex; gap: 0.4rem; align-items: center; font-size: 0.9rem; font-weight: 700; }
  .lista { display: grid; gap: 0.6rem; }
  .vacio { margin: 0; padding: 1rem; border: 1px dashed var(--filete-fuerte); border-radius: var(--radio-control); color: var(--texto-suave); font-size: 0.95rem; text-align: center; display: grid; gap: 0.6rem; justify-items: center; }
  .entorno { border-radius: var(--radio-control); border: 1px solid color-mix(in srgb, var(--exito) 40%, transparent); background: var(--exito-suave); padding: 0.65rem 0.85rem; font-size: 0.92rem; line-height: 1.45; }
  .entorno summary { cursor: pointer; min-height: 1.5rem; }
  .entorno .r p { margin: 0.5rem 0 0.1rem; }
  .entorno :global(p) { margin: 0.25rem 0; }
  .entorno .boton { margin-top: 0.5rem; }
  .desc { color: var(--texto-suave); margin: 0.3rem 0; }
  .vista-mesa { border-radius: var(--radio-control); border: 1px dashed var(--filete-fuerte); padding: 0.7rem 0.85rem; display: grid; gap: 0.5rem; background: var(--hundido); }
  .vm-titulo { margin: 0; display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap; font-size: 0.95rem; }
  .vm-titulo small { color: var(--texto-suave); font-size: 0.85rem; }
  .nueva-cuenta { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
  .nueva-cuenta .campo:first-child { flex: 1 1 100%; }
  .nueva-cuenta .campo:not(.mini):not(:first-child) { flex: 1; min-width: 8rem; }
  .cuenta { display: flex; gap: 0.7rem; align-items: center; padding: 0.65rem 0.8rem; border-radius: var(--radio-control); background: var(--hundido); border: 1px solid var(--filete); flex-wrap: wrap; }
  .cuenta.cero { border-color: var(--peligro); background: var(--peligro-suave); }
  .c-num { font-size: 1.8rem; font-weight: 900; min-width: 2.2ch; text-align: center; font-variant-numeric: tabular-nums; }
  .c-info { flex: 1; display: grid; min-width: 8rem; }
  .c-info small { color: var(--texto-suave); font-size: 0.85rem; }
  .c-btn { display: flex; gap: 0.3rem; flex-wrap: wrap; }
  @media (min-width: 1100px) { .velo { display: none; } }
  @media (max-width: 759px) {
    .panel { inset: 0; width: 100%; border-radius: 0; }
    .cabecera { padding-top: calc(0.9rem + var(--seguro-arriba)); }
    .chip { min-height: 2.5rem; }
  }
</style>

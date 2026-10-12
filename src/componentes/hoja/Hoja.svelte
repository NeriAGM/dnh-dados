<script>
  import { RASGOS, NOMBRE_RASGO, ALCANCES } from '../../lib/srd.js'
  import { umbrales, evasion, avisos, bonoAtaque, grupoDano, textoDano, rangoDeNivel, MAX_MANO, normalizarHoja, ajustarOro } from '../../lib/reglas.js'
  import { md as mdBase } from '../../lib/md.js'
  import { conSigno } from '../../lib/formula.js'
  import Casillas from './Casillas.svelte'
  import Carta from './Carta.svelte'
  import Selector from './Selector.svelte'
  import Dano from './Dano.svelte'
  import Descanso from './Descanso.svelte'
  import Muerte from './Muerte.svelte'
  import SubirNivel from './SubirNivel.svelte'
  import { ESTADOS, necesitaMovimientoDeMuerte } from '../../lib/ayudas.js'
  import { NOMBRE_ETAPA, NIVEL_MAX } from '../../lib/avance.js'
  import { tirarDesdeHoja } from '../../lib/tiradaHoja.js'
  import { ajustesMesa } from '../../lib/mesa.svelte.js'

  let {
    pj, cat, editable = true, jugador = '',
    onHoja, onPJ, onTirar, onCerrar,
    onTirarResultado = null, // opcional: tira, anima y devuelve la tirada (para descansos y muerte)
  } = $props()

  // Las hojas importadas traen números como texto, nulos y cartas repetidas: se leen normalizadas
  const hoja = $derived(normalizarHoja(pj.hoja))
  // md(null) escribía «null» (rasgos caseros importados sin texto)
  const md = (t) => mdBase(t ?? '')
  const clase = $derived(cat?.porId?.clases?.[hoja.clase])
  const subclase = $derived(cat?.porId?.subclases?.[hoja.subclase])
  const ancestria = $derived(cat?.porId?.ancestrias?.[hoja.ancestria])
  const comunidad = $derived(cat?.porId?.comunidades?.[hoja.comunidad])
  const dominios = $derived((hoja.dominios?.length ? hoja.dominios : clase?.dominios ?? []).map((d) => cat?.porId?.dominios?.[d]).filter(Boolean))
  const u = $derived(umbrales(hoja))
  const listaAvisos = $derived(avisos(hoja, cat))
  const competencia = $derived(hoja.competencia ?? 1)
  const rasgoLanz = $derived(subclase?.rasgo_lanzamiento)
  // Monedas: regla opcional de la mesa. Si ya había monedas anotadas, se siguen viendo
  const conMonedas = $derived(ajustesMesa().monedas || (hoja.oro?.monedas ?? 0) > 0)

  const PESTANAS = $derived([
    { id: 'personaje', nombre: 'Personaje' },
    { id: 'armas', nombre: 'Armas' },
    { id: 'cartas', nombre: `Cartas` },
    { id: 'equipo', nombre: 'Equipo' },
    ...(hoja.companero || hoja.subclase === 'beastbound' ? [{ id: 'companero', nombre: 'Compañero' }] : []),
    { id: 'rasgos', nombre: 'Rasgos' },
    { id: 'notas', nombre: 'Notas' },
  ])
  let pestana = $state('personaje')
  let editar = $state(false)
  let selector = $state(null) // { tipo }
  let tirada = $state(null)   // { etiqueta, mod, rasgo }
  let expUsadas = $state([])
  let ventaja = $state('ninguna')
  let dificultad = $state('')
  let error = $state('')
  let ayuda = $state(null) // 'dano' | 'descanso' | 'muerte' | 'nivel'

  const estado = $derived(hoja.estado ? ESTADOS[hoja.estado] : null)
  const pideMuerte = $derived(editable && necesitaMovimientoDeMuerte(hoja))
  const tirarDado = (params) => (onTirarResultado ? onTirarResultado(params) : tirarDesdeHoja(pj, params))
  const multiclase = $derived(hoja.multiclase?.clase ? cat?.porId?.clases?.[hoja.multiclase.clase] : null)

  async function aplicarDano({ pg, armadura_marcada, cae }) {
    if (pg !== (hoja.pg ?? 0)) await onHoja(['pg'], pg)
    if (armadura_marcada !== (hoja.armadura_marcada ?? 0)) await onHoja(['armadura_marcada'], armadura_marcada)
    ayuda = cae ? 'muerte' : null
  }

  async function cambiar(ruta, valor) {
    error = ''
    try { await onHoja(ruta, valor); return true } catch (e) { error = e.message; return false }
  }
  // Inconsciente: despierta cuando un aliado le limpia 1 PG o más. Con todos los PG
  // marcados, quitar el estado volvía a pedir un movimiento de muerte al instante.
  async function despertar() {
    const max = hoja.pg_max ?? 6
    if ((hoja.pg ?? 0) >= max && !(await cambiar(['pg'], Math.max(0, max - 1)))) return
    await cambiar(['estado'], null)
  }
  async function cambiarPG(n) {
    const despierta = hoja.estado === 'inconsciente' && n < (hoja.pg ?? 0)
    if ((await cambiar(['pg'], n)) && despierta) await cambiar(['estado'], null)
  }
  // Lee un número de un campo, lo acota y lo deja escrito así en el campo. Si el valor
  // acotado era el mismo de antes, Svelte no repinta y el campo seguía mostrando lo
  // tecleado (p. ej. «15» en Nivel cuando la hoja quedó en 10).
  function leerNum(e, { min = -Infinity, max = Infinity, def = 0 } = {}) {
    const el = e.currentTarget
    const n = el.value === '' ? def : Number(el.value)
    const v = Math.max(min, Math.min(max, Number.isFinite(n) ? Math.trunc(n) : def))
    el.value = String(v)
    return v
  }
  function cambiarOro(e, k) {
    const nuevo = ajustarOro(hoja.oro, k, leerNum(e, { min: 0 }))
    e.currentTarget.value = String(nuevo[k])
    cambiar(['oro'], nuevo)
  }

  // Umbrales a mano: cada uno por su lado. Vaciar uno lo regresa a armadura + nivel
  // sin borrar el otro (antes vaciar uno borraba los dos).
  function cambiarUmbral(e, cual) {
    const v = e.currentTarget.value === '' ? null : leerNum(e, { min: 1 })
    const m = { mayor: hoja.umbrales_manuales?.mayor ?? null, grave: hoja.umbrales_manuales?.grave ?? null, [cual]: v }
    cambiar(['umbrales_manuales'], m.mayor == null && m.grave == null ? null : m)
  }

  async function cambiarPJ(c) {
    error = ''
    try { await onPJ(c) } catch (e) { error = e.message }
  }

  // ---------- Tiradas desde la hoja ----------
  function abrirTirada(etiqueta, mod, extra = {}) {
    tirada = { etiqueta, mod, ...extra }
    expUsadas = []
    ventaja = 'ninguna'
    dificultad = ''
  }
  const bonoExp = $derived(expUsadas.reduce((s, i) => s + (Number(hoja.experiencias?.[i]?.valor) || 0), 0))
  const costoExp = $derived(expUsadas.length)

  async function confirmarTirada() {
    const t = tirada
    if (!t) return
    const costo = costoExp
    if (costo > pj.esperanza) { error = `Te falta Esperanza: usar ${costo} Experiencia(s) cuesta ${costo}.`; return }
    const grupos = [{ lados: 12, rol: 'esperanza' }, { lados: 12, rol: 'miedo' }]
    if (ventaja === 'ventaja') grupos.push({ lados: 6, rol: 'ventaja', signo: 1 })
    if (ventaja === 'desventaja') grupos.push({ lados: 6, rol: 'desventaja', signo: -1 })
    const exps = expUsadas.map((i) => hoja.experiencias[i]?.nombre).filter(Boolean)
    const dif = dificultad === '' || dificultad == null ? null : Number(dificultad)
    const params = {
      tipo: t.reaccion ? 'reaccion' : 'accion',
      grupos,
      modificador: t.mod + bonoExp,
      dificultad: Number.isFinite(dif) ? dif : null,
      etiqueta: [t.etiqueta, ...exps].join(' + ').slice(0, 60),
    }
    // Se cierra antes de esperar: un doble toque pagaba dos veces y tronaba (tirada ya era null)
    tirada = null
    if (costo) {
      error = ''
      try { await onPJ({ esperanza: pj.esperanza - costo }) } catch (e) {
        // Sin pagar la Esperanza no se suma la Experiencia
        error = `No se pudo gastar la Esperanza: ${e.message}`
        return
      }
    }
    onTirar(params)
  }

  function tirarDano(arma, critico = false) {
    const g = grupoDano(arma, competencia)
    onTirar({
      tipo: 'dano',
      grupos: [{ lados: g.lados, cantidad: g.cantidad }],
      modificador: g.mod,
      etiqueta: `Daño · ${arma.nombre}`,
      danoCritico: critico,
    })
  }

  function tirarCompanero(critico = false) {
    const c = hoja.companero
    onTirar({ tipo: 'dano', grupos: [{ lados: c?.dano_lados || 6, cantidad: 1 }], modificador: 0, etiqueta: `Daño · ${c?.nombre || 'Compañero'}`, danoCritico: critico })
  }

  // ---------- Listas editables ----------
  const lista = (clave) => structuredClone($state.snapshot(hoja[clave]) ?? [])
  function agregarEn(clave, item) { cambiar([clave], [...lista(clave), item]) }
  function quitarDe(clave, i) { const l = lista(clave); l.splice(i, 1); cambiar([clave], l) }

  function moverCarta(id, de, a) {
    const c = structuredClone($state.snapshot(hoja.cartas) ?? { mano: [], boveda: [] })
    c[de] = (c[de] ?? []).filter((x) => x !== id)
    if (a) c[a] = [...(c[a] ?? []), id]
    cambiar(['cartas'], c)
  }

  async function elegir(x) {
    const t = selector.tipo
    selector = null
    if (t === 'carta') {
      const c = structuredClone($state.snapshot(hoja.cartas) ?? { mano: [], boveda: [] })
      if ([...c.mano, ...c.boveda].includes(x.id)) return
      if (c.mano.length < MAX_MANO) c.mano.push(x.id)
      else c.boveda.push(x.id)
      cambiar(['cartas'], c)
    } else if (t === 'arma') {
      agregarEn('armas', { id: x.id, nombre: x.nombre, tipo: x.tipo, rasgo: x.rasgo, alcance: x.alcance, dano: x.dano, manos: x.manos, rasgos: x.rasgos ?? [], activa: true })
    } else if (t === 'armadura') {
      cambiar(['armadura'], { id: x.id, nombre: x.nombre, puntuacion: x.puntuacion, umbrales: x.umbrales, rasgos: x.rasgos ?? [] })
    } else if (t === 'clase') {
      // Una tras otra: dos escrituras a la vez podían pisarse al volver del servidor
      const sinDominios = !hoja.dominios?.length
      if ((await cambiar(['clase'], x.id)) && sinDominios) await cambiar(['dominios'], x.dominios ?? [])
    } else if (t === 'subclase') cambiar(['subclase'], x.id)
    else if (t === 'ancestria') cambiar(['ancestria'], x.id)
    else if (t === 'comunidad') cambiar(['comunidad'], x.id)
  }

  const nivelMax = $derived(hoja.nivel ?? 1)
  const dominiosIds = $derived(dominios.map((d) => d.id))
  const SELECTORES = $derived({
    carta: {
      titulo: 'Agregar carta de dominio',
      items: cat?.cartas ?? [],
      filtros: [
        { id: 'mios', nombre: `Mis dominios hasta nivel ${nivelMax}`, prueba: (c) => (dominiosIds.includes(c.dominio) || c.fuente === 'Casero') && (c.nivel ?? 1) <= nivelMax },
        { id: 'todas', nombre: 'Todas', prueba: () => true },
      ],
    },
    arma: {
      titulo: 'Agregar arma',
      items: cat?.armas ?? [],
      filtros: [
        { id: 'rango', nombre: `Rango ${rangoDeNivel(nivelMax)} o menor`, prueba: (a) => (a.nivel ?? 1) <= rangoDeNivel(nivelMax) },
        { id: 'prim', nombre: 'Primarias', prueba: (a) => a.tipo === 'primaria' },
        { id: 'sec', nombre: 'Secundarias', prueba: (a) => a.tipo === 'secundaria' },
        { id: 'todas', nombre: 'Todas', prueba: () => true },
      ],
    },
    armadura: { titulo: 'Elegir armadura', items: cat?.armaduras ?? [], filtros: [{ id: 'rango', nombre: `Rango ${rangoDeNivel(nivelMax)} o menor`, prueba: (a) => (a.nivel ?? 1) <= rangoDeNivel(nivelMax) }, { id: 'todas', nombre: 'Todas', prueba: () => true }] },
    clase: { titulo: 'Elegir clase', items: cat?.clases ?? [] },
    subclase: { titulo: 'Elegir subclase', items: (cat?.subclases ?? []).filter((s) => !hoja.clase || s.clase === hoja.clase || s.fuente === 'Casero') },
    ancestria: { titulo: 'Elegir ancestría', items: cat?.ancestrias ?? [] },
    comunidad: { titulo: 'Elegir comunidad', items: cat?.comunidades ?? [] },
  })

  const rasgosDe = (x) => [
    ...(x?.rasgos ?? []),
    ...(x?.base ?? []).map((r) => ({ ...r, etapa: 'Base' })),
    ...(x?.especializacion ?? []).map((r) => ({ ...r, etapa: 'Especialización' })),
    ...(x?.maestria ?? []).map((r) => ({ ...r, etapa: 'Maestría' })),
  ]
</script>

<div class="velo" onclick={onCerrar} role="presentation"></div>
<section class="hoja vidrio" style:--pj={pj.color} aria-label="Hoja de {pj.nombre}">
  <header class="cabecera">
    <div class="identidad">
      <h2 class="titulo">{pj.nombre}</h2>
      <p class="linea">
        Nivel {hoja.nivel ?? 1}
        · {clase?.nombre ?? hoja.clase_texto ?? 'Sin clase'}{subclase ? ` (${subclase.nombre}${hoja.subclase_etapa && hoja.subclase_etapa !== 'base' ? `, ${NOMBRE_ETAPA[hoja.subclase_etapa]}` : ''})` : hoja.subclase_texto ? ` (${hoja.subclase_texto})` : ''}
        · {ancestria?.nombre ?? (hoja.ancestria_texto || 'Sin ancestría')}{comunidad ? ` · ${comunidad.nombre}` : ''}
      </p>
      <p class="linea suave">
        {dominios.map((d) => d.nombre).join(' y ') || 'Sin dominios'}{hoja.pronombres ? ` · ${hoja.pronombres}` : ''}{jugador ? ` · Juega ${jugador}` : ''}
      </p>
    </div>
    <div class="botones">
      {#if editable}<button class="boton chico" class:prendido={editar} aria-pressed={editar} onclick={() => (editar = !editar)}>{editar ? 'Listo' : 'Editar'}</button>{/if}
      <button class="cerrar" onclick={onCerrar} aria-label="Cerrar hoja">✕</button>
    </div>
  </header>

  <nav class="pestanas" aria-label="Secciones de la hoja">
    {#each PESTANAS as p (p.id)}
      <button class:activa={pestana === p.id} onclick={() => (pestana = p.id)} aria-current={pestana === p.id}>{p.nombre}</button>
    {/each}
  </nav>

  {#if listaAvisos.length && editar}
    <ul class="avisos" aria-label="Avisos de reglas">
      {#each listaAvisos as a}<li>{a.texto}</li>{/each}
    </ul>
  {/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}

  {#if hoja.reparto_pendiente}
    <div class="estado gloria" role="status">
      <span><strong>Arriesgarlo todo:</strong> reparte {hoja.reparto_pendiente} entre PG y Estrés.</span>
      {#if editable}<button class="boton chico" onclick={() => (ayuda = 'muerte')}>Repartir</button>{/if}
    </div>
  {:else if estado}
    <div class="estado {hoja.estado}" role="status">
      <span><strong>{estado.nombre}.</strong> {estado.texto}</span>
      {#if editable}
        {#if hoja.estado === 'gloria'}<button class="boton chico" onclick={() => cambiar(['estado'], 'muerto')}>Ya hizo su última acción</button>
        {:else if hoja.estado === 'inconsciente'}<button class="boton chico" onclick={despertar}>Despertó</button>
        {:else}<button class="boton chico" onclick={() => cambiar(['estado'], null)} title="Por si se marcó por error">Deshacer</button>{/if}
      {/if}
    </div>
  {:else if pideMuerte}
    <div class="estado cayendo" role="alert">
      <span><strong>Marcó su último Punto de Golpe.</strong> Elige un movimiento de muerte.</span>
      <button class="boton chico" onclick={() => (ayuda = 'muerte')}>Elegir</button>
    </div>
  {/if}

  <div class="cuerpo">
    {#if pestana === 'personaje'}
      {#if editar}
        <div class="datos">
          <label>Nivel <input class="campo num" type="number" min="1" max="10" value={hoja.nivel ?? 1} onchange={(e) => cambiar(['nivel'], leerNum(e, { min: 1, max: 10, def: 1 }))} /></label>
          <label>Pronombres <input class="campo" value={hoja.pronombres ?? ''} onchange={(e) => cambiar(['pronombres'], e.currentTarget.value)} /></label>
          <div class="eleccion"><span>Clase</span><button class="boton chico" onclick={() => (selector = { tipo: 'clase' })}>{clase?.nombre ?? 'Elegir'}</button></div>
          <div class="eleccion"><span>Subclase</span><button class="boton chico" onclick={() => (selector = { tipo: 'subclase' })}>{subclase?.nombre ?? 'Elegir'}</button></div>
          <div class="eleccion"><span>Ancestría</span><button class="boton chico" onclick={() => (selector = { tipo: 'ancestria' })}>{ancestria?.nombre ?? 'Elegir'}</button></div>
          <label>Ancestría (texto libre) <input class="campo" value={hoja.ancestria_texto ?? ''} placeholder="p. ej. Híbrido Infernis-Humano" onchange={(e) => cambiar(['ancestria_texto'], e.currentTarget.value)} /></label>
          <div class="eleccion"><span>Comunidad</span><button class="boton chico" onclick={() => (selector = { tipo: 'comunidad' })}>{comunidad?.nombre ?? 'Elegir'}</button></div>
          <label>Competencia <input class="campo num" type="number" min="1" max="6" value={competencia} onchange={(e) => cambiar(['competencia'], leerNum(e, { min: 1, max: 6, def: 1 }))} /></label>
        </div>
      {/if}

      <div class="defensas">
        <div class="defensa">
          <span class="valor titulo">{evasion(hoja)}</span>
          <span class="etq">Evasión</span>
          {#if editar}
            <span class="mini-campos">
              <label>base <input class="campo num" type="number" value={hoja.evasion_base ?? 10} onchange={(e) => cambiar(['evasion_base'], leerNum(e))} /></label>
              <label>extra <input class="campo num" type="number" value={hoja.evasion_extra ?? 0} onchange={(e) => cambiar(['evasion_extra'], leerNum(e))} /></label>
            </span>
          {/if}
        </div>
        <div class="umbrales" aria-label="Umbrales de daño">
          <span class="u menor">Menor<b>1 PG</b></span>
          <span class="corte titulo">{u.mayor}</span>
          <span class="u mayor">Mayor<b>2 PG</b></span>
          <span class="corte titulo">{u.grave}</span>
          <span class="u grave">Grave<b>3 PG</b></span>
        </div>
        {#if editar}
          <div class="mini-campos">
            <label>Mayor <input class="campo num" type="number" value={hoja.umbrales_manuales?.mayor ?? ''} placeholder={String(u.mayor)} onchange={(e) => cambiarUmbral(e, 'mayor')} /></label>
            <label>Grave <input class="campo num" type="number" value={hoja.umbrales_manuales?.grave ?? ''} placeholder={String(u.grave)} onchange={(e) => cambiarUmbral(e, 'grave')} /></label>
            <small>Vacíos = armadura + nivel</small>
          </div>
        {/if}
      </div>

      <div class="marcadores">
        <Casillas nombre="Puntos de Golpe" marcadas={hoja.pg ?? 0} maximo={hoja.pg_max ?? 6} color="var(--sangre)" {editable} onCambiar={cambiarPG} ayuda="Daño recibido" />
        <Casillas nombre="Estrés" marcadas={pj.estres} maximo={pj.estres_max} color="#ff8a5c" {editable} onCambiar={(n) => cambiarPJ({ estres: n })} />
        <Casillas nombre="Armadura" marcadas={hoja.armadura_marcada ?? 0} maximo={hoja.armadura?.puntuacion ?? 0} forma="escudo" color="#8fb7d9" {editable} onCambiar={(n) => cambiar(['armadura_marcada'], n)} ayuda="Casillas de Armadura gastadas" />
        <Casillas nombre="Esperanza" marcadas={pj.esperanza} maximo={pj.esperanza_max} tachadas={hoja.cicatrices ?? 0} forma="estrella" color="var(--esperanza)" {editable} onCambiar={(n) => cambiarPJ({ esperanza: n })} ayuda={hoja.cicatrices ? `${hoja.cicatrices} cicatriz(es)` : ''} />
        {#if editar}
          <div class="mini-campos">
            <label>PG máx <input class="campo num" type="number" min="1" max="12" value={hoja.pg_max ?? 6} onchange={(e) => cambiar(['pg_max'], leerNum(e, { min: 1, max: 12, def: 6 }))} /></label>
            <label>Estrés máx <input class="campo num" type="number" min="1" max="12" value={pj.estres_max} onchange={(e) => { const v = leerNum(e, { min: 1, max: 12, def: 6 }); cambiarPJ({ estres_max: v, estres: Math.min(pj.estres, v) }) }} /></label>
          </div>
        {/if}
      </div>

      {#if editable}
        <div class="ayudas" aria-label="Ayudas de reglas">
          <button class="boton ayuda dano" onclick={() => (ayuda = 'dano')}><span aria-hidden="true">⚔</span> Recibir daño</button>
          <button class="boton ayuda" onclick={() => (ayuda = 'descanso')}><span aria-hidden="true">☾</span> Descansar</button>
          <button class="boton ayuda" disabled={(hoja.nivel ?? 1) >= NIVEL_MAX} onclick={() => (ayuda = 'nivel')}><span aria-hidden="true">✦</span> Subir de nivel</button>
        </div>
      {/if}

      <h3 class="seccion">Rasgos <small>toca uno para tirar</small></h3>
      <div class="rasgos">
        {#each RASGOS as r (r.id)}
          {@const v = Number(hoja.rasgos?.[r.id] ?? 0)}
          <div class="rasgo" class:mejorado={hoja.rasgos_mejorados?.includes(r.id)}>
            <button class="tirar-rasgo" onclick={() => abrirTirada(r.nombre, v)} title={r.ayuda}>
              <span class="mod titulo">{conSigno(v) || '0'}</span>
              <span class="nom">{r.nombre}</span>
            </button>
            {#if editar}
              <span class="pasos">
                <button onclick={() => cambiar(['rasgos', r.id], v - 1)} aria-label="Bajar {r.nombre}">−</button>
                <button onclick={() => cambiar(['rasgos', r.id], v + 1)} aria-label="Subir {r.nombre}">+</button>
                <button class:on={hoja.rasgos_mejorados?.includes(r.id)} title="Mejorado al subir de nivel" aria-pressed={hoja.rasgos_mejorados?.includes(r.id)}
                  onclick={() => cambiar(['rasgos_mejorados'], hoja.rasgos_mejorados?.includes(r.id) ? hoja.rasgos_mejorados.filter((x) => x !== r.id) : [...(hoja.rasgos_mejorados ?? []), r.id])}>✓</button>
              </span>
            {/if}
          </div>
        {/each}
      </div>
      {#if rasgoLanz}
        <button class="boton lanzamiento" onclick={() => abrirTirada(`Lanzamiento (${NOMBRE_RASGO[rasgoLanz]})`, Number(hoja.rasgos?.[rasgoLanz] ?? 0))}>
          Tirada de Lanzamiento · {NOMBRE_RASGO[rasgoLanz]} {conSigno(Number(hoja.rasgos?.[rasgoLanz] ?? 0)) || '+0'}
        </button>
      {/if}

      <h3 class="seccion">Experiencias <small>+valor por 1 de Esperanza</small></h3>
      <ul class="experiencias">
        {#each hoja.experiencias ?? [] as x, i}
          <li>
            {#if editar}
              <input class="campo" value={x.nombre} placeholder="Experiencia" onchange={(e) => cambiar(['experiencias', i, 'nombre'], e.currentTarget.value)} />
              <input class="campo num" type="number" value={x.valor} onchange={(e) => cambiar(['experiencias', i, 'valor'], leerNum(e))} />
              <button class="quitar" onclick={() => quitarDe('experiencias', i)} aria-label="Quitar experiencia">✕</button>
            {:else}
              <span>{x.nombre || 'Sin nombre'}</span><b>{conSigno(Number(x.valor)) || '+0'}</b>
            {/if}
          </li>
        {/each}
      </ul>
      {#if editar}<button class="boton chico" onclick={() => agregarEn('experiencias', { nombre: '', valor: 2 })}>Agregar experiencia</button>{/if}

    {:else if pestana === 'armas'}
      <p class="ayuda">Competencia {competencia}: tus armas tiran {competencia} {competencia === 1 ? 'dado' : 'dados'} de daño.</p>
      {#each hoja.armas ?? [] as a, i}
        {@const bono = bonoAtaque(a)}
        {@const mod = Number(hoja.rasgos?.[a.rasgo] ?? 0) + bono}
        <article class="arma">
          <header>
            <strong class="titulo">{a.nombre}</strong>
            <small>{[a.tipo === 'secundaria' ? 'Secundaria' : 'Primaria', ALCANCES[a.alcance] ?? a.alcance, NOMBRE_RASGO[a.rasgo] ?? a.rasgo, a.manos === 2 ? 'Dos manos' : 'Una mano', a.dano?.tipo === 'magico' ? 'mágico' : 'físico'].filter(Boolean).join(' · ')}</small>
          </header>
          {#each a.rasgos ?? [] as r}<p class="rasgo-arma"><b>{r.nombre}:</b> {r.texto}</p>{/each}
          <div class="acciones">
            <button class="boton" onclick={() => abrirTirada(`Ataque · ${a.nombre}`, mod)}>Atacar {conSigno(mod) || '+0'}</button>
            <button class="boton" onclick={() => tirarDano(a)}>Daño {textoDano(a, competencia)}</button>
            <button class="boton critico" onclick={() => tirarDano(a, true)} title="Daño crítico: suma el máximo de los dados">Crítico</button>
            {#if editar}<button class="quitar" onclick={() => quitarDe('armas', i)} aria-label="Quitar {a.nombre}">✕</button>{/if}
          </div>
        </article>
      {:else}
        <p class="vacio">Sin armas. {editable ? 'Agrega una desde el catálogo.' : ''}</p>
      {/each}
      {#if editable}<button class="boton" onclick={() => (selector = { tipo: 'arma' })}>Agregar arma</button>{/if}

    {:else if pestana === 'cartas'}
      {@const mano = hoja.cartas?.mano ?? []}
      {@const boveda = hoja.cartas?.boveda ?? []}
      <h3 class="seccion">Mano <small>{mano.length}/{MAX_MANO} · las que puedes usar ahora</small></h3>
      <div class="cartas">
        {#each mano as id (id)}
          <Carta carta={cat?.porId?.cartas?.[id] ?? { nombre: id, texto: 'Carta no encontrada en el catálogo.' }} dominio={cat?.porId?.dominios?.[cat?.porId?.cartas?.[id]?.dominio]}>
            {#snippet acciones()}
              {#if editable}
                <button class="boton chico" onclick={() => moverCarta(id, 'mano', 'boveda')}>A la bóveda</button>
                {#if editar}<button class="boton chico" onclick={() => moverCarta(id, 'mano', null)}>Quitar</button>{/if}
              {/if}
            {/snippet}
          </Carta>
        {:else}
          <p class="vacio">Tu mano está vacía.</p>
        {/each}
      </div>
      <h3 class="seccion">Bóveda <small>recuperarla cuesta su número de recuperación en Estrés, salvo en un descanso</small></h3>
      <div class="cartas">
        {#each boveda as id (id)}
          {@const c = cat?.porId?.cartas?.[id]}
          <Carta carta={c ?? { nombre: id, texto: '' }} dominio={cat?.porId?.dominios?.[c?.dominio]} compacta>
            {#snippet acciones()}
              {#if editable}
                <button class="boton chico" disabled={mano.length >= MAX_MANO} onclick={() => moverCarta(id, 'boveda', 'mano')}>A la mano</button>
                {#if editar}<button class="boton chico" onclick={() => moverCarta(id, 'boveda', null)}>Quitar</button>{/if}
              {/if}
            {/snippet}
          </Carta>
        {:else}
          <p class="vacio">Nada en la bóveda.</p>
        {/each}
      </div>
      {#if editable}<button class="boton" onclick={() => (selector = { tipo: 'carta' })}>Agregar carta</button>{/if}

    {:else if pestana === 'equipo'}
      <h3 class="seccion">Armadura</h3>
      {#if hoja.armadura}
        <article class="arma">
          <header><strong class="titulo">{hoja.armadura.nombre}</strong><small>Puntuación {hoja.armadura.puntuacion} · umbrales base {hoja.armadura.umbrales?.mayor}/{hoja.armadura.umbrales?.grave}</small></header>
          {#each hoja.armadura.rasgos ?? [] as r}<p class="rasgo-arma"><b>{r.nombre}:</b> {r.texto}</p>{/each}
          {#if editar}
            <div class="mini-campos">
              <label>Puntuación <input class="campo num" type="number" min="0" max="12" value={hoja.armadura.puntuacion} onchange={(e) => cambiar(['armadura', 'puntuacion'], leerNum(e, { min: 0, max: 12 }))} /></label>
            </div>
          {/if}
        </article>
      {:else}
        <p class="vacio">Sin armadura.</p>
      {/if}
      {#if editable}<button class="boton chico" onclick={() => (selector = { tipo: 'armadura' })}>{hoja.armadura ? 'Cambiar armadura' : 'Elegir armadura'}</button>{/if}

      <h3 class="seccion">Oro</h3>
      <div class="oro">
        {#each [...(conMonedas ? [['monedas', 'Monedas']] : []), ['punados', 'Puñados'], ['bolsas', 'Bolsas'], ['cofres', 'Cofres']] as [k, n]}
          <label class="moneda">
            <span>{n}</span>
            <input class="campo num" type="number" min="0" disabled={!editable} value={hoja.oro?.[k] ?? 0} onchange={(e) => cambiarOro(e, k)} />
          </label>
        {/each}
      </div>
      <p class="ayuda">{conMonedas ? '10 monedas = 1 puñado · ' : ''}10 puñados = 1 bolsa · 10 bolsas = 1 cofre.</p>

      <h3 class="seccion">Inventario</h3>
      <ul class="inventario">
        {#each hoja.inventario ?? [] as x, i}
          <li>
            {#if editar}
              <input class="campo num" type="number" min="0" value={x.cantidad ?? 1} onchange={(e) => cambiar(['inventario', i, 'cantidad'], leerNum(e, { min: 0 }))} />
              <input class="campo" value={x.nombre} onchange={(e) => cambiar(['inventario', i, 'nombre'], e.currentTarget.value)} />
              <input class="campo" value={x.nota ?? ''} placeholder="Nota" onchange={(e) => cambiar(['inventario', i, 'nota'], e.currentTarget.value)} />
              <button class="quitar" onclick={() => quitarDe('inventario', i)} aria-label="Quitar">✕</button>
            {:else}
              <b>{x.cantidad ?? 1}×</b> <span>{x.nombre}</span>{#if x.nota}<small> · {x.nota}</small>{/if}
            {/if}
          </li>
        {:else}
          <li class="vacio">Inventario vacío.</li>
        {/each}
      </ul>
      {#if editable}<button class="boton chico" onclick={() => { editar = true; agregarEn('inventario', { nombre: '', cantidad: 1, nota: '' }) }}>Agregar objeto</button>{/if}

    {:else if pestana === 'companero'}
      {@const c = hoja.companero}
      {#if c}
        <div class="companero">
          <h3 class="titulo">{c.nombre || 'Compañero'}{c.especie ? ` · ${c.especie}` : ''}</h3>
          <div class="defensas">
            <div class="defensa"><span class="valor titulo">{c.evasion ?? 10}</span><span class="etq">Evasión</span></div>
            <div class="defensa"><span class="valor titulo">d{c.dano_lados ?? 6}</span><span class="etq">Daño · {ALCANCES[c.alcance] ?? c.alcance ?? 'Cuerpo a cuerpo'}</span></div>
          </div>
          <Casillas nombre="Estrés" marcadas={c.estres ?? 0} maximo={c.estres_max ?? 3} color="#ff8a5c" {editable} onCambiar={(n) => cambiar(['companero', 'estres'], n)} />
          <div class="acciones">
            <button class="boton" onclick={() => tirarCompanero()}>Daño d{c.dano_lados ?? 6}</button>
            <button class="boton critico" onclick={() => tirarCompanero(true)}>Crítico</button>
          </div>
          <p class="ayuda">Para atacar con tu compañero haces una tirada de Lanzamiento; si aciertas, tira su daño.</p>
          <ul class="experiencias">
            {#each c.experiencias ?? [] as x}<li><span>{x.nombre}</span><b>{conSigno(Number(x.valor)) || '+0'}</b></li>{/each}
          </ul>
          {#if editar}
            <div class="datos">
              <label>Nombre <input class="campo" value={c.nombre ?? ''} onchange={(e) => cambiar(['companero', 'nombre'], e.currentTarget.value)} /></label>
              <label>Evasión <input class="campo num" type="number" value={c.evasion ?? 10} onchange={(e) => cambiar(['companero', 'evasion'], leerNum(e))} /></label>
              <label>Dado de daño <input class="campo num" type="number" value={c.dano_lados ?? 6} onchange={(e) => cambiar(['companero', 'dano_lados'], leerNum(e, { min: 2, max: 100, def: 6 }))} /></label>
              <label>Estrés máx <input class="campo num" type="number" value={c.estres_max ?? 3} onchange={(e) => cambiar(['companero', 'estres_max'], leerNum(e, { min: 1, max: 12, def: 3 }))} /></label>
            </div>
          {/if}
          {#if c.notas}<div class="texto-largo">{@html md(c.notas)}</div>{/if}
        </div>
      {:else if editable}
        <button class="boton" onclick={() => cambiar(['companero'], { nombre: '', especie: '', evasion: 10, estres_max: 3, estres: 0, dano_lados: 6, alcance: 'cuerpo', experiencias: [], rasgos: [], notas: '' })}>Agregar compañero animal</button>
      {/if}

    {:else if pestana === 'rasgos'}
      {#if clase}
        <h3 class="seccion">{clase.nombre}</h3>
        <div class="texto-largo">
          <p><strong>{clase.esperanza?.nombre}</strong> <small>(rasgo de Esperanza)</small></p>{@html md(clase.esperanza?.texto)}
          {#each clase.rasgos ?? [] as r}<p><strong>{r.nombre}</strong></p>{@html md(r.texto)}{/each}
        </div>
      {/if}
      {#if multiclase}
        <h3 class="seccion">Multiclase: {multiclase.nombre} <small>{cat?.porId?.dominios?.[hoja.multiclase.dominio]?.nombre ?? hoja.multiclase.dominio}{hoja.multiclase.subclase ? ` · ${cat?.porId?.subclases?.[hoja.multiclase.subclase]?.nombre ?? ''}` : ''}</small></h3>
        <div class="texto-largo">{#each multiclase.rasgos ?? [] as r}<p><strong>{r.nombre}</strong></p>{@html md(r.texto)}{/each}</div>
      {/if}
      {#if subclase}
        <h3 class="seccion">{subclase.nombre}</h3>
        <div class="texto-largo">
          {#each rasgosDe(subclase) as r}
            <p><strong>{r.nombre}</strong> <small>{r.etapa}</small></p>{@html md(r.texto)}
          {/each}
        </div>
      {/if}
      {#if ancestria}
        <h3 class="seccion">{ancestria.nombre}</h3>
        <div class="texto-largo">{#each ancestria.rasgos ?? [] as r}<p><strong>{r.nombre}</strong></p>{@html md(r.texto)}{/each}</div>
      {/if}
      {#if comunidad}
        <h3 class="seccion">{comunidad.nombre}</h3>
        <div class="texto-largo">{#each comunidad.rasgos ?? [] as r}<p><strong>{r.nombre}</strong></p>{@html md(r.texto)}{/each}</div>
      {/if}
      {#if hoja.rasgos_extra?.length || editar}
        <h3 class="seccion">Rasgos caseros</h3>
        {#each hoja.rasgos_extra ?? [] as r, i}
          <div class="texto-largo">
            {#if editar}
              <input class="campo" value={r.nombre} onchange={(e) => cambiar(['rasgos_extra', i, 'nombre'], e.currentTarget.value)} />
              <textarea class="campo" rows="4" value={r.texto} onchange={(e) => cambiar(['rasgos_extra', i, 'texto'], e.currentTarget.value)}></textarea>
              <button class="boton chico" onclick={() => quitarDe('rasgos_extra', i)}>Quitar</button>
            {:else}
              <p><strong>{r.nombre}</strong></p>{@html md(r.texto)}
            {/if}
          </div>
        {/each}
        {#if editar}<button class="boton chico" onclick={() => agregarEn('rasgos_extra', { nombre: 'Nuevo rasgo', texto: '' })}>Agregar rasgo casero</button>{/if}
      {/if}

    {:else if pestana === 'notas'}
      {#if editable}
        <textarea class="campo notas" rows="14" value={hoja.notas ?? ''} placeholder="Historia, contactos, pendientes…" onchange={(e) => cambiar(['notas'], e.currentTarget.value)}></textarea>
        <p class="ayuda">Se guarda al salir del cuadro.</p>
      {:else}
        <div class="texto-largo">{@html md(hoja.notas || 'Sin notas.')}</div>
      {/if}
    {/if}
  </div>
</section>

{#if tirada}
  <div class="velo arriba" onclick={() => (tirada = null)} role="presentation"></div>
  <div class="tirada vidrio" role="dialog" aria-label="Tirada de {tirada.etiqueta}">
    <h3 class="titulo">{tirada.etiqueta} {conSigno(tirada.mod) || '+0'}</h3>
    {#if hoja.experiencias?.some((x) => x.nombre)}
      <p class="ayuda">Experiencias (1 de Esperanza cada una · tienes {pj.esperanza})</p>
      <div class="chips-exp">
        {#each hoja.experiencias as x, i}
          {#if x.nombre}
            <button class="chip" class:activo={expUsadas.includes(i)} aria-pressed={expUsadas.includes(i)}
              onclick={() => (expUsadas = expUsadas.includes(i) ? expUsadas.filter((j) => j !== i) : [...expUsadas, i])}>
              {x.nombre} {conSigno(Number(x.valor))}
            </button>
          {/if}
        {/each}
      </div>
    {/if}
    <div class="fila-tirada">
      <div class="segmentos" role="radiogroup" aria-label="Ventaja">
        <button role="radio" aria-checked={ventaja === 'ventaja'} class:ven={ventaja === 'ventaja'} onclick={() => (ventaja = ventaja === 'ventaja' ? 'ninguna' : 'ventaja')}>Ventaja</button>
        <button role="radio" aria-checked={ventaja === 'desventaja'} class:des={ventaja === 'desventaja'} onclick={() => (ventaja = ventaja === 'desventaja' ? 'ninguna' : 'desventaja')}>Desventaja</button>
      </div>
      <input class="campo num" type="number" placeholder="Dif." bind:value={dificultad} aria-label="Dificultad" />
      <label class="reaccion"><input type="checkbox" bind:checked={tirada.reaccion} /> Reacción</label>
    </div>
    <button class="tirar-ya" onclick={confirmarTirada}>
      <span class="titulo">Tirar</span>
      <small>Dualidad {conSigno(tirada.mod + bonoExp) || '+0'}{ventaja === 'ventaja' ? ' + d6' : ventaja === 'desventaja' ? ' − d6' : ''}{costoExp ? ` · gasta ${costoExp} de Esperanza` : ''}</small>
    </button>
  </div>
{/if}

{#if ayuda === 'dano'}
  <Dano {hoja} {u} onAplicar={aplicarDano} onCerrar={() => (ayuda = null)} />
{:else if ayuda === 'descanso'}
  <Descanso {pj} {hoja} {tirarDado} {onHoja} {onPJ} onCerrar={() => (ayuda = null)} />
{:else if ayuda === 'muerte'}
  <Muerte {pj} {hoja} {tirarDado} {onHoja} {onPJ} onCerrar={() => (ayuda = null)} />
{:else if ayuda === 'nivel'}
  <SubirNivel {pj} {hoja} {cat} {onHoja} {onPJ} onCerrar={() => (ayuda = null)} />
{/if}

{#if selector}
  {@const s = SELECTORES[selector.tipo]}
  <Selector titulo={s.titulo} items={s.items} filtros={s.filtros ?? []} onElegir={elegir} onCerrar={() => (selector = null)}>
    {#snippet item(x, elegirlo)}
      {#if selector.tipo === 'carta'}
        <Carta carta={x} dominio={cat?.porId?.dominios?.[x.dominio]} compacta>
          {#snippet acciones()}<button class="boton chico" onclick={elegirlo}>Agregar</button>{/snippet}
        </Carta>
      {:else}
        <button class="opcion" onclick={elegirlo}>
          <strong>{x.nombre}</strong>
          <small>
            {#if selector.tipo === 'arma'}Rango {x.nivel} · {x.tipo} · {NOMBRE_RASGO[x.rasgo]} · {ALCANCES[x.alcance]} · d{x.dano?.lados}{x.dano?.mod ? `+${x.dano.mod}` : ''} {x.dano?.tipo === 'magico' ? 'mág.' : 'fís.'}{x.rasgos?.length ? ` · ${x.rasgos.map((r) => r.nombre).join(', ')}` : ''}
            {:else if selector.tipo === 'armadura'}Rango {x.nivel} · Puntuación {x.puntuacion} · {x.umbrales?.mayor}/{x.umbrales?.grave}{x.rasgos?.length ? ` · ${x.rasgos.map((r) => r.nombre).join(', ')}` : ''}
            {:else if selector.tipo === 'clase'}Evasión {x.evasion} · PG {x.pg} · {(x.dominios ?? []).map((d) => cat?.porId?.dominios?.[d]?.nombre ?? d).join(' y ')}
            {:else}{x.fuente}{/if}
          </small>
        </button>
      {/if}
    {/snippet}
  </Selector>
{/if}

<style>
  .velo { position: fixed; inset: 0; background: rgba(8, 4, 18, 0.45); z-index: 8; }
  .velo.arriba { z-index: 22; background: rgba(8, 4, 18, 0.4); }
  .hoja {
    position: fixed; z-index: 9;
    top: 0; bottom: 0; left: 0;
    width: min(100%, 560px);
    display: flex; flex-direction: column;
    border-radius: 0 var(--radio-panel) var(--radio-panel) 0;
    background: rgba(22, 15, 38, 0.96);
    border-left: 4px solid var(--pj);
    animation: entrar 0.25s ease-out;
  }
  @keyframes entrar { from { transform: translateX(-24px); opacity: 0; } }
  .cabecera { display: flex; gap: 0.6rem; padding: calc(0.9rem + env(safe-area-inset-top, 0px)) 1rem 0.4rem; }
  .identidad { flex: 1; min-width: 0; }
  h2 { margin: 0; font-size: 1.7rem; line-height: 1.1; }
  .linea { margin: 0.2rem 0 0; font-size: 0.86rem; font-weight: 600; }
  .linea.suave { color: var(--pergamino-suave); font-weight: 500; }
  .botones { display: flex; gap: 0.3rem; align-items: flex-start; }
  .chico { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
  .prendido { background: var(--pergamino); color: var(--tinta); }
  .cerrar { border: 0; background: none; font-size: 1.15rem; padding: 0.25rem 0.5rem; }
  .pestanas { display: flex; gap: 0.2rem; overflow-x: auto; padding: 0.3rem 0.8rem 0.5rem; scrollbar-width: none; border-bottom: 1px solid var(--linea); }
  .pestanas button { flex: none; border: 0; background: none; color: var(--pergamino-suave); font-weight: 700; padding: 0.4rem 0.7rem; border-radius: 999px; font-size: 0.9rem; }
  .pestanas button.activa { background: color-mix(in srgb, var(--pj) 35%, transparent); color: var(--pergamino); }
  .avisos { margin: 0.5rem 1rem 0; padding: 0.5rem 0.8rem 0.5rem 1.6rem; border-radius: 12px; background: rgba(240, 189, 85, 0.12); border: 1px solid rgba(240, 189, 85, 0.35); font-size: 0.84rem; }
  .error { margin: 0.4rem 1rem 0; color: #ffb3bd; font-size: 0.88rem; }
  .cuerpo { overflow-y: auto; padding: 0.7rem 1rem calc(1.4rem + var(--seguro-abajo)); display: grid; gap: 0.7rem; align-content: start; overscroll-behavior: contain; }
  .seccion { margin: 0.5rem 0 0; font-size: 1rem; font-family: var(--fuente-titulo); display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap; }
  .seccion small { font-family: var(--fuente); font-size: 0.75rem; color: var(--pergamino-suave); font-weight: 500; }
  .ayuda { margin: 0; color: var(--pergamino-suave); font-size: 0.82rem; }
  .vacio { margin: 0; color: var(--pergamino-suave); font-size: 0.9rem; }

  .datos { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .datos label, .eleccion { display: grid; gap: 0.2rem; font-size: 0.8rem; color: var(--pergamino-suave); }
  .num { width: 4.5rem; text-align: center; padding: 0.45rem; }
  .mini-campos { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; font-size: 0.8rem; color: var(--pergamino-suave); }
  .mini-campos label { display: flex; gap: 0.3rem; align-items: center; }

  .defensas { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: stretch; }
  .defensa {
    display: grid; justify-items: center; align-content: center; padding: 0.4rem 0.9rem; min-width: 5.5rem;
    border-radius: 14px 14px 28px 28px; background: rgba(143, 183, 217, 0.12); border: 1px solid rgba(143, 183, 217, 0.4);
  }
  .defensa .valor { font-size: 2rem; line-height: 1; text-shadow: none; }
  .defensa .etq { font-size: 0.75rem; font-weight: 700; color: var(--pergamino-suave); }
  .umbrales { flex: 1; min-width: 15rem; display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; align-items: center; border-radius: 14px; overflow: hidden; border: 1px solid var(--linea); }
  .u { display: grid; justify-items: center; font-size: 0.75rem; padding: 0.45rem 0.2rem; font-weight: 700; }
  .u b { font-size: 0.7rem; opacity: 0.8; }
  .u.menor { background: rgba(127, 214, 168, 0.15); }
  .u.mayor { background: rgba(240, 189, 85, 0.17); }
  .u.grave { background: rgba(217, 74, 92, 0.22); }
  .corte { font-size: 1.35rem; padding: 0 0.45rem; text-shadow: none; }

  .estado { margin: 0.5rem 1rem 0; display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; padding: 0.5rem 0.75rem; border-radius: 12px; font-size: 0.84rem; line-height: 1.4; border: 1px solid; }
  .estado span { flex: 1 1 14rem; }
  .estado.cayendo { background: rgba(217, 74, 92, 0.2); border-color: rgba(217, 74, 92, 0.6); }
  .estado.inconsciente { background: rgba(143, 183, 217, 0.16); border-color: rgba(143, 183, 217, 0.5); }
  .estado.gloria { background: rgba(240, 189, 85, 0.16); border-color: rgba(240, 189, 85, 0.55); }
  .estado.muerto { background: rgba(167, 124, 232, 0.18); border-color: rgba(167, 124, 232, 0.55); }
  .ayudas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; }
  .ayuda { display: flex; gap: 0.35rem; align-items: center; justify-content: center; padding: 0.55rem 0.4rem; font-size: 0.88rem; line-height: 1.15; text-align: center; }
  .ayuda span { font-size: 1rem; }
  .ayuda.dano { border-color: rgba(217, 74, 92, 0.55); }

  .marcadores { display: grid; gap: 0.55rem; padding: 0.7rem; border-radius: 14px; background: rgba(255, 245, 230, 0.04); }

  .rasgos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.45rem; }
  .rasgo { display: grid; gap: 0.25rem; }
  .tirar-rasgo {
    display: grid; justify-items: center; gap: 0.05rem; padding: 0.5rem 0.3rem;
    border-radius: 14px; border: 1px solid var(--linea); background: rgba(255, 245, 230, 0.06);
    transition: background 0.15s, transform 0.1s;
  }
  .tirar-rasgo:hover { background: color-mix(in srgb, var(--pj) 25%, transparent); }
  .tirar-rasgo:active { transform: scale(0.97); }
  .rasgo.mejorado .tirar-rasgo { border-color: var(--esperanza); }
  .mod { font-size: 1.5rem; line-height: 1.1; text-shadow: none; }
  .nom { font-size: 0.78rem; font-weight: 700; }
  .pasos { display: flex; justify-content: center; gap: 0.2rem; }
  .pasos button { border: 1px solid var(--linea); background: none; border-radius: 6px; width: 1.7rem; height: 1.6rem; padding: 0; font-weight: 800; }
  .pasos button.on { background: var(--esperanza); color: var(--tinta); }
  .lanzamiento { justify-self: start; }

  .experiencias, .inventario { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
  .experiencias li, .inventario li { display: flex; gap: 0.45rem; align-items: center; padding: 0.4rem 0.6rem; border-radius: 10px; background: rgba(255, 245, 230, 0.05); }
  .experiencias li span { flex: 1; }
  .experiencias li .campo:first-child, .inventario li .campo:nth-child(2) { flex: 1; }
  .quitar { border: 0; background: none; color: var(--pergamino-suave); padding: 0.2rem 0.4rem; }

  .arma { border-radius: 14px; border: 1px solid var(--linea); padding: 0.65rem 0.8rem; display: grid; gap: 0.35rem; background: rgba(255, 245, 230, 0.04); }
  .arma header { display: grid; }
  .arma strong { font-size: 1.1rem; }
  .arma small { color: var(--pergamino-suave); font-size: 0.78rem; }
  .rasgo-arma { margin: 0; font-size: 0.85rem; }
  .acciones { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
  .critico { border-color: rgba(217, 74, 92, 0.6); }
  .cartas { display: grid; gap: 0.5rem; }
  .oro { display: flex; gap: 0.6rem; }
  .moneda { display: grid; gap: 0.2rem; font-size: 0.8rem; color: var(--pergamino-suave); }
  .companero { display: grid; gap: 0.6rem; }
  .companero h3 { margin: 0; font-size: 1.3rem; }
  .texto-largo { font-size: 0.9rem; line-height: 1.5; display: grid; gap: 0.3rem; }
  .texto-largo :global(p) { margin: 0; }
  .texto-largo :global(ul) { margin: 0; padding-left: 1.1rem; }
  .texto-largo :global(table) { border-collapse: collapse; font-size: 0.8rem; }
  .texto-largo :global(td), .texto-largo :global(th) { border: 1px solid var(--linea); padding: 0.2rem 0.35rem; }
  .notas { resize: vertical; line-height: 1.5; }
  .opcion { display: grid; text-align: left; gap: 0.1rem; width: 100%; border: 1px solid var(--linea); background: rgba(255, 245, 230, 0.05); border-radius: 12px; padding: 0.55rem 0.75rem; }
  .opcion:hover { background: rgba(255, 245, 230, 0.12); }
  .opcion small { color: var(--pergamino-suave); font-size: 0.78rem; }

  .tirada {
    position: fixed; z-index: 23; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: min(440px, calc(100vw - 1.2rem));
    border-radius: var(--radio-panel); padding: 1rem; display: grid; gap: 0.6rem;
    background: rgba(22, 15, 38, 0.97);
  }
  .tirada h3 { margin: 0; font-size: 1.35rem; }
  .chips-exp { display: flex; gap: 0.35rem; flex-wrap: wrap; }
  .chip { border: 1px solid var(--linea); background: none; border-radius: 999px; padding: 0.35rem 0.75rem; font-weight: 700; font-size: 0.85rem; }
  .chip.activo { background: var(--esperanza); color: var(--tinta); border-color: var(--esperanza); }
  .fila-tirada { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
  .segmentos { display: flex; gap: 0.3rem; }
  .segmentos button { border: 1px solid var(--linea); background: none; border-radius: 999px; padding: 0.35rem 0.75rem; font-weight: 700; font-size: 0.85rem; }
  .segmentos .ven { background: #2f8f7a; border-color: #6fd3b8; }
  .segmentos .des { background: #a8323e; border-color: #f2a3ab; }
  .reaccion { display: flex; gap: 0.3rem; align-items: center; font-size: 0.85rem; }
  .tirar-ya {
    border: 0; border-radius: 16px; padding: 0.55rem 1rem;
    background: linear-gradient(135deg, #f6cf72, #e09a35 55%, #b9641c); color: #2a1606;
    display: grid; justify-items: center;
  }
  .tirar-ya .titulo { font-size: 1.4rem; text-shadow: none; }
  .tirar-ya small { font-weight: 700; font-size: 0.78rem; }

  @media (min-width: 1100px) {
    .velo:not(.arriba) { display: none; }
  }
  @media (max-width: 600px) {
    .hoja { width: 100%; border-radius: 0; border-left: 0; border-top: 4px solid var(--pj); background: rgb(22, 15, 38); }
    .pestanas { flex: none; }
    .rasgos { grid-template-columns: repeat(3, 1fr); }
    .datos { grid-template-columns: 1fr; }
  }
  @media (max-width: 480px) {
    .ayuda { flex-direction: column; gap: 0.1rem; font-size: 0.82rem; padding: 0.45rem 0.3rem; }
  }
</style>

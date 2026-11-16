<script>
  // Editor de contenido casero (homebrew) de la campaña.
  import { app, guardarCasero, borrarCasero } from '../lib/mesa.svelte.js'
  import { RASGOS, ALCANCES } from '../lib/srd.js'
  import Icono from './Icono.svelte'

  let { cat, onCerrar } = $props()

  const TIPOS = [
    { id: 'clase', nombre: 'Clase' },
    { id: 'subclase', nombre: 'Subclase' },
    { id: 'carta', nombre: 'Carta' },
    { id: 'arma', nombre: 'Arma' },
    { id: 'armadura', nombre: 'Armadura' },
    { id: 'ancestria', nombre: 'Ancestría' },
    { id: 'comunidad', nombre: 'Comunidad' },
  ]

  const VACIO = {
    clase: () => ({ descripcion: '', dominios: ['', ''], evasion: 10, pg: 6, esperanza: { nombre: '', texto: '' }, rasgos: [{ nombre: '', texto: '' }] }),
    subclase: () => ({ clase: '', descripcion: '', rasgo_lanzamiento: '', base: [{ nombre: '', texto: '' }], especializacion: [], maestria: [] }),
    carta: () => ({ dominio: '', nivel: 1, recuerdo: 0, tipo: 'habilidad', texto: '' }),
    arma: () => ({ nivel: 1, tipo: 'primaria', rasgo: 'agilidad', alcance: 'cuerpo', dano: { dados: 1, lados: 8, mod: 0, tipo: 'fisico' }, manos: 1, rasgos: [] }),
    armadura: () => ({ nivel: 1, puntuacion: 3, umbrales: { mayor: 5, grave: 11 }, rasgos: [] }),
    ancestria: () => ({ descripcion: '', rasgos: [{ nombre: '', texto: '' }, { nombre: '', texto: '' }] }),
    comunidad: () => ({ descripcion: '', rasgos: [{ nombre: '', texto: '' }] }),
  }

  let filtro = $state('todos')
  let edicion = $state(null) // { id?, tipo, nombre, datos }
  let error = $state('')
  let guardando = $state(false)
  let confirmar = $state(null)

  const lista = $derived(app.casero.filter((c) => filtro === 'todos' || c.tipo === filtro))
  const clases = $derived(cat?.clases ?? [])
  const dominios = $derived(cat?.dominios ?? [])
  const puedoEditar = (c) => c.creado_por === app.sesion?.user?.id || app.rol === 'dj'

  function nuevo(tipo) { edicion = { tipo, nombre: '', datos: VACIO[tipo]() } }
  // Solo se editan aquí los tipos de TIPOS (la base también acepta adversarios, entornos…:
  // abrir uno de esos tronaba con «VACIO[c.tipo] is not a function»).
  const editableAqui = (c) => !!VACIO[c.tipo]
  function abrir(c) {
    if (!editableAqui(c)) return
    const base = VACIO[c.tipo]()
    const datos = { ...base, ...(structuredClone($state.snapshot(c.datos)) ?? {}) }
    // Lo anidado puede venir a medias o nulo (p. ej. esperanza: null) y el formulario lo lee directo
    for (const [k, v] of Object.entries(base)) {
      if (Array.isArray(v)) {
        if (!Array.isArray(datos[k])) datos[k] = v
        else if (k !== 'dominios') datos[k] = datos[k].map((x) => ({ nombre: '', texto: '', ...(x && typeof x === 'object' ? x : {}) }))
      } else if (v && typeof v === 'object') datos[k] = { ...v, ...(datos[k] && typeof datos[k] === 'object' ? datos[k] : {}) }
    }
    edicion = { id: c.id, tipo: c.tipo, nombre: c.nombre ?? '', datos }
  }

  async function guardar() {
    error = ''
    if (!edicion.nombre.trim()) { error = 'Ponle nombre.'; return }
    guardando = true
    try {
      await guardarCasero({ ...edicion, nombre: edicion.nombre.trim(), datos: $state.snapshot(edicion.datos) })
      edicion = null
    } catch (e) { error = e.message } finally { guardando = false }
  }

  async function borrar(c) {
    if (confirmar !== c.id) { confirmar = c.id; return }
    try { await borrarCasero(c.id); confirmar = null } catch (e) { error = e.message }
  }

  const nombreTipo = (t) => TIPOS.find((x) => x.id === t)?.nombre ?? t
</script>

{#snippet listaRasgos(arr, titulo)}
  <fieldset>
    <legend>{titulo}</legend>
    {#each arr as r, i}
      <div class="rasgo">
        <input class="campo" placeholder="Nombre del rasgo" bind:value={r.nombre} />
        <textarea class="campo" rows="3" placeholder="Qué hace (puedes usar **negritas**)" bind:value={r.texto}></textarea>
        <button type="button" class="boton peligro quitar" onclick={() => arr.splice(i, 1)}><Icono nombre="basura" tam={16} />Quitar rasgo</button>
      </div>
    {/each}
    <button type="button" class="boton" onclick={() => arr.push({ nombre: '', texto: '' })}><Icono nombre="mas" tam={16} />Agregar rasgo</button>
  </fieldset>
{/snippet}

<div class="velo" onclick={onCerrar} role="presentation"></div>
<section class="casero vidrio" aria-label="Contenido casero">
  <header>
    <h2>{edicion ? `${edicion.id ? 'Editar' : 'Nueva'} ${nombreTipo(edicion.tipo).toLowerCase()}` : 'Contenido casero'}</h2>
    <button class="icono" onclick={edicion ? () => (edicion = null) : onCerrar} aria-label={edicion ? 'Volver a la lista' : 'Cerrar'}><Icono nombre={edicion ? 'izquierda' : 'cerrar'} /></button>
  </header>

  {#if !edicion}
    <p class="ayuda">Lo que crees aquí aparece en las hojas de todos, junto a lo oficial, marcado como «Casero». Elige qué crear:</p>
    <div class="nuevos">
      {#each TIPOS as t (t.id)}<button class="boton" onclick={() => nuevo(t.id)}><Icono nombre="mas" tam={16} />{t.nombre}</button>{/each}
    </div>
    <div class="filtros">
      <button class="chip" class:activo={filtro === 'todos'} onclick={() => (filtro = 'todos')}>Todo</button>
      {#each TIPOS as t (t.id)}<button class="chip" class:activo={filtro === t.id} onclick={() => (filtro = t.id)}>{t.nombre}</button>{/each}
    </div>
    <ul class="lista">
      {#each lista as c (c.id)}
        <li>
          <button class="fila" onclick={() => abrir(c)} disabled={!puedoEditar(c) || !editableAqui(c)}>
            <strong>{c.nombre}</strong><small>{nombreTipo(c.tipo)}</small>
          </button>
          {#if puedoEditar(c)}<button class="boton fantasma" class:peligro={confirmar === c.id} onclick={() => borrar(c)} aria-label={confirmar === c.id ? 'Confirmar borrado' : 'Borrar'}>{#if confirmar === c.id}¿Borrar?{:else}<Icono nombre="basura" tam={18} />{/if}</button>{/if}
        </li>
      {:else}
        <li class="vacio">Todavía no hay contenido casero. Toca uno de los botones de arriba (Clase, Carta, Arma…) para crear el primero.</li>
      {/each}
    </ul>
  {:else}
    {@const d = edicion.datos}
    <form class="formulario" onsubmit={(e) => { e.preventDefault(); guardar() }}>
      <label><span>Nombre</span> <input class="campo" bind:value={edicion.nombre} maxlength="80" /></label>

      {#if edicion.tipo === 'clase'}
        <label><span>Descripción</span> <textarea class="campo" rows="3" bind:value={d.descripcion}></textarea></label>
        <div class="dos">
          {#each [0, 1] as i}
            <label><span>Dominio {i + 1}</span>
              <select class="campo" bind:value={d.dominios[i]}>
                <option value="">—</option>
                {#each dominios as x (x.id)}<option value={x.id}>{x.nombre}</option>{/each}
              </select>
            </label>
          {/each}
          <label><span>Evasión inicial</span> <input class="campo" type="number" bind:value={d.evasion} /></label>
          <label><span>PG iniciales</span> <input class="campo" type="number" bind:value={d.pg} /></label>
        </div>
        <fieldset>
          <legend>Rasgo de Esperanza</legend>
          <input class="campo" placeholder="Nombre" bind:value={d.esperanza.nombre} />
          <textarea class="campo" rows="3" placeholder="Qué hace" bind:value={d.esperanza.texto}></textarea>
        </fieldset>
        {@render listaRasgos(d.rasgos, 'Rasgos de clase')}

      {:else if edicion.tipo === 'subclase'}
        <div class="dos">
          <label><span>Clase</span>
            <select class="campo" bind:value={d.clase}>
              <option value="">—</option>
              {#each clases as x (x.id)}<option value={x.id}>{x.nombre}</option>{/each}
            </select>
          </label>
          <label><span>Rasgo de Lanzamiento</span>
            <select class="campo" bind:value={d.rasgo_lanzamiento}>
              <option value="">Ninguno</option>
              {#each RASGOS as r (r.id)}<option value={r.id}>{r.nombre}</option>{/each}
            </select>
          </label>
        </div>
        <label><span>Descripción</span> <textarea class="campo" rows="2" bind:value={d.descripcion}></textarea></label>
        {@render listaRasgos(d.base, 'Base')}
        {@render listaRasgos(d.especializacion, 'Especialización')}
        {@render listaRasgos(d.maestria, 'Maestría')}

      {:else if edicion.tipo === 'carta'}
        <div class="dos">
          <label><span>Dominio</span>
            <select class="campo" bind:value={d.dominio}>
              <option value="">—</option>
              {#each dominios as x (x.id)}<option value={x.id}>{x.nombre}</option>{/each}
            </select>
          </label>
          <label><span>Tipo</span>
            <select class="campo" bind:value={d.tipo}>
              <option value="habilidad">Habilidad</option><option value="hechizo">Hechizo</option><option value="grimorio">Grimorio</option>
            </select>
          </label>
          <label><span>Nivel</span> <input class="campo" type="number" min="1" max="10" bind:value={d.nivel} /></label>
          <label><span>Costo de recuperación</span> <input class="campo" type="number" min="0" bind:value={d.recuerdo} /></label>
        </div>
        <label><span>Texto</span> <textarea class="campo" rows="6" bind:value={d.texto}></textarea></label>

      {:else if edicion.tipo === 'arma'}
        <div class="dos">
          <label><span>Tipo</span> <select class="campo" bind:value={d.tipo}><option value="primaria">Primaria</option><option value="secundaria">Secundaria</option></select></label>
          <label><span>Rango</span> <input class="campo" type="number" min="1" max="4" bind:value={d.nivel} /></label>
          <label><span>Rasgo</span> <select class="campo" bind:value={d.rasgo}>{#each RASGOS as r (r.id)}<option value={r.id}>{r.nombre}</option>{/each}</select></label>
          <label><span>Alcance</span> <select class="campo" bind:value={d.alcance}>{#each Object.entries(ALCANCES) as [k, v]}<option value={k}>{v}</option>{/each}</select></label>
          <label><span>Dado de daño (d…)</span> <input class="campo" type="number" min="2" max="20" bind:value={d.dano.lados} /></label>
          <label><span>Bono de daño</span> <input class="campo" type="number" bind:value={d.dano.mod} /></label>
          <label><span>Daño</span> <select class="campo" bind:value={d.dano.tipo}><option value="fisico">Físico</option><option value="magico">Mágico</option></select></label>
          <label><span>Manos</span> <select class="campo" bind:value={d.manos}><option value={1}>Una</option><option value={2}>Dos</option></select></label>
        </div>
        {@render listaRasgos(d.rasgos, 'Rasgos del arma')}

      {:else if edicion.tipo === 'armadura'}
        <div class="dos">
          <label><span>Rango</span> <input class="campo" type="number" min="1" max="4" bind:value={d.nivel} /></label>
          <label><span>Puntuación</span> <input class="campo" type="number" min="0" max="12" bind:value={d.puntuacion} /></label>
          <label><span>Umbral Mayor (base)</span> <input class="campo" type="number" bind:value={d.umbrales.mayor} /></label>
          <label><span>Umbral Grave (base)</span> <input class="campo" type="number" bind:value={d.umbrales.grave} /></label>
        </div>
        {@render listaRasgos(d.rasgos, 'Rasgos de la armadura')}

      {:else}
        <label><span>Descripción</span> <textarea class="campo" rows="3" bind:value={d.descripcion}></textarea></label>
        {@render listaRasgos(d.rasgos, 'Rasgos')}
      {/if}

      {#if error}<p class="aviso-error" role="alert">{error}</p>{/if}
      <div class="pie">
        <button type="button" class="boton" onclick={() => (edicion = null)}>Cancelar</button>
        <button class="boton solido" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  {/if}
  {#if error && !edicion}<p class="aviso-error" role="alert">{error}</p>{/if}
</section>

<style>
  .velo { position: fixed; inset: 0; background: var(--velo); z-index: 12; animation: aparecer-velo 0.25s ease-out; }
  .casero {
    position: fixed; z-index: 13; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: min(640px, calc(100vw - 1.5rem)); max-height: min(90vh, 960px); overflow-y: auto;
    border-radius: var(--radio-panel); padding: 1rem 1.2rem 1.3rem;
    background: var(--superficie-firme); box-shadow: var(--sombra-alta);
  }
  header { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
  h2 { margin: 0; font-size: 1.5rem; }
  .ayuda { color: var(--texto-suave); font-size: 0.92rem; margin: 0.4rem 0 0.75rem; }
  .nuevos, .filtros { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
  .chip { min-height: 2.25rem; border: 1px solid var(--filete); background: var(--hundido); color: var(--texto); border-radius: 999px; padding: 0.3rem 0.8rem; font-size: 0.85rem; font-weight: 700; }
  .chip:hover { background: var(--hundido-2); }
  .chip.activo { background: var(--texto); border-color: var(--texto); color: var(--sobre-color); }
  .lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
  .lista li { display: flex; align-items: center; gap: 0.4rem; }
  .fila { flex: 1; min-height: 2.75rem; display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; border: 1px solid var(--filete); background: var(--hundido); border-radius: var(--radio-control); padding: 0.55rem 0.85rem; text-align: left; }
  .fila:hover:not(:disabled) { background: var(--hundido-2); }
  .fila:disabled { cursor: default; opacity: 0.7; }
  .fila small { color: var(--texto-suave); font-size: 0.85rem; }
  .vacio { display: block !important; padding: 1rem; border: 1px dashed var(--filete-fuerte); border-radius: var(--radio-control); color: var(--texto-suave); text-align: center; }
  .formulario { display: grid; gap: 0.85rem; margin-top: 0.75rem; }
  .formulario label { display: grid; gap: 0.3rem; }
  .formulario label > span { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--texto-suave); }
  .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  fieldset { border: 1px solid var(--filete); border-radius: var(--radio-control); padding: 0.75rem 0.85rem; display: grid; gap: 0.6rem; min-width: 0; margin: 0; }
  legend { font-weight: 900; font-size: 1.05rem; padding: 0 0.4rem; }
  .rasgo { display: grid; gap: 0.4rem; padding-bottom: 0.65rem; border-bottom: 1px solid var(--filete); }
  .rasgo .quitar { justify-self: start; }
  textarea { resize: vertical; line-height: 1.45; }
  .pie { display: flex; justify-content: flex-end; gap: 0.5rem; }
  @media (max-width: 520px) { .dos { grid-template-columns: 1fr; } .casero { padding: 0.9rem 1rem 1.2rem; } }
</style>

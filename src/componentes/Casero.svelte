<script>
  // Editor de contenido casero (homebrew) de la campaña.
  import { app, guardarCasero, borrarCasero } from '../lib/mesa.svelte.js'
  import { RASGOS, ALCANCES } from '../lib/srd.js'

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
  function abrir(c) { edicion = { id: c.id, tipo: c.tipo, nombre: c.nombre, datos: { ...VACIO[c.tipo](), ...structuredClone($state.snapshot(c.datos)) } } }

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
        <button type="button" class="quitar" onclick={() => arr.splice(i, 1)}>Quitar</button>
      </div>
    {/each}
    <button type="button" class="boton chico" onclick={() => arr.push({ nombre: '', texto: '' })}>Agregar rasgo</button>
  </fieldset>
{/snippet}

<div class="velo" onclick={onCerrar} role="presentation"></div>
<section class="casero vidrio" aria-label="Contenido casero">
  <header>
    <h2 class="titulo">{edicion ? `${edicion.id ? 'Editar' : 'Nueva'} ${nombreTipo(edicion.tipo).toLowerCase()}` : 'Contenido casero'}</h2>
    <button class="cerrar" onclick={edicion ? () => (edicion = null) : onCerrar} aria-label={edicion ? 'Volver' : 'Cerrar'}>{edicion ? '←' : '✕'}</button>
  </header>

  {#if !edicion}
    <p class="ayuda">Lo que crees aquí aparece en las hojas de todos, junto a lo oficial, marcado como «Casero».</p>
    <div class="nuevos">
      {#each TIPOS as t (t.id)}<button class="boton chico" onclick={() => nuevo(t.id)}>+ {t.nombre}</button>{/each}
    </div>
    <div class="filtros">
      <button class="chip" class:activo={filtro === 'todos'} onclick={() => (filtro = 'todos')}>Todo</button>
      {#each TIPOS as t (t.id)}<button class="chip" class:activo={filtro === t.id} onclick={() => (filtro = t.id)}>{t.nombre}</button>{/each}
    </div>
    <ul class="lista">
      {#each lista as c (c.id)}
        <li>
          <button class="fila" onclick={() => abrir(c)} disabled={!puedoEditar(c)}>
            <strong>{c.nombre}</strong><small>{nombreTipo(c.tipo)}</small>
          </button>
          {#if puedoEditar(c)}<button class="quitar" onclick={() => borrar(c)}>{confirmar === c.id ? '¿Borrar?' : '✕'}</button>{/if}
        </li>
      {:else}
        <li class="ayuda">Todavía no hay contenido casero.</li>
      {/each}
    </ul>
  {:else}
    {@const d = edicion.datos}
    <form class="formulario" onsubmit={(e) => { e.preventDefault(); guardar() }}>
      <label>Nombre <input class="campo" bind:value={edicion.nombre} maxlength="80" /></label>

      {#if edicion.tipo === 'clase'}
        <label>Descripción <textarea class="campo" rows="3" bind:value={d.descripcion}></textarea></label>
        <div class="dos">
          {#each [0, 1] as i}
            <label>Dominio {i + 1}
              <select class="campo" bind:value={d.dominios[i]}>
                <option value="">—</option>
                {#each dominios as x (x.id)}<option value={x.id}>{x.nombre}</option>{/each}
              </select>
            </label>
          {/each}
          <label>Evasión inicial <input class="campo" type="number" bind:value={d.evasion} /></label>
          <label>PG iniciales <input class="campo" type="number" bind:value={d.pg} /></label>
        </div>
        <fieldset>
          <legend>Rasgo de Esperanza</legend>
          <input class="campo" placeholder="Nombre" bind:value={d.esperanza.nombre} />
          <textarea class="campo" rows="3" placeholder="Qué hace" bind:value={d.esperanza.texto}></textarea>
        </fieldset>
        {@render listaRasgos(d.rasgos, 'Rasgos de clase')}

      {:else if edicion.tipo === 'subclase'}
        <div class="dos">
          <label>Clase
            <select class="campo" bind:value={d.clase}>
              <option value="">—</option>
              {#each clases as x (x.id)}<option value={x.id}>{x.nombre}</option>{/each}
            </select>
          </label>
          <label>Rasgo de Lanzamiento
            <select class="campo" bind:value={d.rasgo_lanzamiento}>
              <option value="">Ninguno</option>
              {#each RASGOS as r (r.id)}<option value={r.id}>{r.nombre}</option>{/each}
            </select>
          </label>
        </div>
        <label>Descripción <textarea class="campo" rows="2" bind:value={d.descripcion}></textarea></label>
        {@render listaRasgos(d.base, 'Base')}
        {@render listaRasgos(d.especializacion, 'Especialización')}
        {@render listaRasgos(d.maestria, 'Maestría')}

      {:else if edicion.tipo === 'carta'}
        <div class="dos">
          <label>Dominio
            <select class="campo" bind:value={d.dominio}>
              <option value="">—</option>
              {#each dominios as x (x.id)}<option value={x.id}>{x.nombre}</option>{/each}
            </select>
          </label>
          <label>Tipo
            <select class="campo" bind:value={d.tipo}>
              <option value="habilidad">Habilidad</option><option value="hechizo">Hechizo</option><option value="grimorio">Grimorio</option>
            </select>
          </label>
          <label>Nivel <input class="campo" type="number" min="1" max="10" bind:value={d.nivel} /></label>
          <label>Costo de recuperación <input class="campo" type="number" min="0" bind:value={d.recuerdo} /></label>
        </div>
        <label>Texto <textarea class="campo" rows="6" bind:value={d.texto}></textarea></label>

      {:else if edicion.tipo === 'arma'}
        <div class="dos">
          <label>Tipo <select class="campo" bind:value={d.tipo}><option value="primaria">Primaria</option><option value="secundaria">Secundaria</option></select></label>
          <label>Rango <input class="campo" type="number" min="1" max="4" bind:value={d.nivel} /></label>
          <label>Rasgo <select class="campo" bind:value={d.rasgo}>{#each RASGOS as r (r.id)}<option value={r.id}>{r.nombre}</option>{/each}</select></label>
          <label>Alcance <select class="campo" bind:value={d.alcance}>{#each Object.entries(ALCANCES) as [k, v]}<option value={k}>{v}</option>{/each}</select></label>
          <label>Dado de daño (d…) <input class="campo" type="number" min="2" max="20" bind:value={d.dano.lados} /></label>
          <label>Bono de daño <input class="campo" type="number" bind:value={d.dano.mod} /></label>
          <label>Daño <select class="campo" bind:value={d.dano.tipo}><option value="fisico">Físico</option><option value="magico">Mágico</option></select></label>
          <label>Manos <select class="campo" bind:value={d.manos}><option value={1}>Una</option><option value={2}>Dos</option></select></label>
        </div>
        {@render listaRasgos(d.rasgos, 'Rasgos del arma')}

      {:else if edicion.tipo === 'armadura'}
        <div class="dos">
          <label>Rango <input class="campo" type="number" min="1" max="4" bind:value={d.nivel} /></label>
          <label>Puntuación <input class="campo" type="number" min="0" max="12" bind:value={d.puntuacion} /></label>
          <label>Umbral Mayor (base) <input class="campo" type="number" bind:value={d.umbrales.mayor} /></label>
          <label>Umbral Grave (base) <input class="campo" type="number" bind:value={d.umbrales.grave} /></label>
        </div>
        {@render listaRasgos(d.rasgos, 'Rasgos de la armadura')}

      {:else}
        <label>Descripción <textarea class="campo" rows="3" bind:value={d.descripcion}></textarea></label>
        {@render listaRasgos(d.rasgos, 'Rasgos')}
      {/if}

      {#if error}<p class="error" role="alert">{error}</p>{/if}
      <div class="pie">
        <button type="button" class="boton" onclick={() => (edicion = null)}>Cancelar</button>
        <button class="boton guardar" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  {/if}
  {#if error && !edicion}<p class="error" role="alert">{error}</p>{/if}
</section>

<style>
  .velo { position: fixed; inset: 0; background: rgba(8, 4, 18, 0.5); z-index: 12; }
  .casero {
    position: fixed; z-index: 13; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: min(640px, calc(100vw - 1rem)); max-height: min(90vh, 960px); overflow-y: auto;
    border-radius: var(--radio-panel); padding: 1rem 1.1rem 1.3rem; background: rgba(22, 15, 38, 0.97);
  }
  header { display: flex; justify-content: space-between; align-items: center; }
  h2 { margin: 0; font-size: 1.4rem; }
  .cerrar { border: 0; background: none; font-size: 1.15rem; padding: 0.3rem 0.5rem; }
  .ayuda { color: var(--pergamino-suave); font-size: 0.86rem; }
  .nuevos, .filtros { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.6rem; }
  .chico { padding: 0.35rem 0.7rem; font-size: 0.85rem; }
  .chip { border: 1px solid var(--linea); background: none; border-radius: 999px; padding: 0.25rem 0.65rem; font-size: 0.8rem; font-weight: 700; }
  .chip.activo { background: var(--pergamino); color: var(--tinta); }
  .lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.3rem; }
  .lista li { display: flex; align-items: center; gap: 0.4rem; }
  .fila { flex: 1; display: flex; justify-content: space-between; align-items: baseline; border: 1px solid var(--linea); background: rgba(255, 245, 230, 0.05); border-radius: 10px; padding: 0.5rem 0.7rem; text-align: left; }
  .fila small { color: var(--pergamino-suave); }
  .quitar { border: 0; background: none; color: var(--pergamino-suave); font-size: 0.82rem; padding: 0.2rem 0.4rem; }
  .formulario { display: grid; gap: 0.7rem; margin-top: 0.6rem; }
  .formulario label { display: grid; gap: 0.25rem; font-size: 0.82rem; color: var(--pergamino-suave); }
  .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
  fieldset { border: 1px solid var(--linea); border-radius: 12px; padding: 0.6rem 0.7rem; display: grid; gap: 0.45rem; }
  legend { font-weight: 700; font-size: 0.85rem; padding: 0 0.3rem; }
  .rasgo { display: grid; gap: 0.3rem; padding-bottom: 0.45rem; border-bottom: 1px dashed var(--linea); }
  .rasgo .quitar { justify-self: start; }
  textarea { resize: vertical; line-height: 1.45; }
  .error { color: #ffb3bd; margin: 0; }
  .pie { display: flex; justify-content: flex-end; gap: 0.5rem; }
  .guardar { background: var(--esperanza); color: var(--tinta); border-color: var(--esperanza); }
  @media (max-width: 520px) { .dos { grid-template-columns: 1fr; } }
</style>

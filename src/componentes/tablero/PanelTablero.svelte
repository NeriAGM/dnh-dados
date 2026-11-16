<script>
  // Panel del DJ para el tablero compartido: galería de tableros, qué ve la
  // mesa, nota, fichas y borrar. La niebla se pinta directo en el mapa.
  import { app } from '../../lib/mesa.svelte.js'
  import {
    tablero, tableroVisible, idMostrado, crearTablero, guardarTablero, mostrarTablero,
    borrarTablero, crearFicha, agregarPJs,
  } from '../../lib/tablero.svelte.js'
  import { pjsSinFicha } from '../../lib/tablero.js'

  let { onCerrar } = $props()

  const sel = $derived(tableroVisible())
  const mostrado = $derived(idMostrado())
  const faltan = $derived(sel ? pjsSinFicha(app.personajes, tablero.fichas, sel.id).length : 0)
  const fichasSel = $derived(sel ? tablero.fichas.filter((f) => f.tablero_id === sel.id).length : 0)

  let nombreFicha = $state('')
  let colorFicha = $state('#c2416b')

  async function alElegirArchivo(e) {
    const archivo = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (archivo) await crearTablero({ archivo })
  }
  function cambiarNombre(e) {
    const n = e.currentTarget.value.trim().slice(0, 80)
    if (!n) { e.currentTarget.value = sel.nombre; return }
    if (n !== sel.nombre) guardarTablero(sel.id, { nombre: n })
  }
  function cambiarTexto(e) {
    const texto = e.currentTarget.value.slice(0, 2000)
    if (texto !== sel.texto) guardarTablero(sel.id, { texto })
  }
  async function ponerFicha(e) {
    e.preventDefault()
    if (!nombreFicha.trim()) return
    await crearFicha({ tablero_id: sel.id, nombre: nombreFicha, color: colorFicha })
    nombreFicha = ''
  }
  function borrar() {
    const extra = sel.imagen ? ', sus fichas y su imagen' : ''
    if (confirm(`¿Borrar «${sel.nombre}»${extra}? No se puede deshacer.`)) borrarTablero(sel.id)
  }
</script>

<section class="panel vidrio" aria-label="Tablero">
  <header class="cabecera">
    <h2 class="titulo">Tablero</h2>
    <button class="boton cerrar" onclick={onCerrar} aria-label="Cerrar el panel del tablero">✕</button>
  </header>

  <div class="cuerpo">
    <div class="nuevo">
      <label class="boton subir" class:ocupado={tablero.subiendo}>
        {tablero.subiendo ? 'Subiendo…' : 'Subir mapa o imagen'}
        <input class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onchange={alElegirArchivo} disabled={tablero.subiendo} />
      </label>
      <button class="boton" onclick={() => crearTablero({ nombre: 'Nota' })}>Nota de texto</button>
    </div>
    {#if tablero.error}<p class="error" role="alert">{tablero.error}</p>{/if}

    {#if tablero.lista.length}
      <ul class="lista" aria-label="Tus tableros">
        {#each tablero.lista as t (t.id)}
          <li>
            <button class="elemento" class:activo={t.id === sel?.id} aria-current={t.id === sel?.id} onclick={() => (tablero.abierto = t.id)}>
              <span aria-hidden="true">{t.imagen ? '🗺' : '📝'}</span>
              <span class="texto">{t.nombre}</span>
              {#if t.id === mostrado}<span class="en-mesa">En la mesa</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="vacio">Sube un mapa, una ilustración o una carta, o escribe una nota. Luego tócala aquí y elige «Mostrar a la mesa».</p>
    {/if}

    {#if sel}
      <div class="editor">
        {#if sel.id === mostrado}
          <button class="boton ancho" onclick={() => mostrarTablero(null)}>Quitar de la mesa</button>
        {:else}
          <button class="boton ancho primario" onclick={() => mostrarTablero(sel.id)}>Mostrar a la mesa</button>
        {/if}

        <label class="campo-con-titulo">
          <span>Nombre</span>
          <input class="campo" maxlength="80" value={sel.nombre} onchange={cambiarNombre} />
        </label>
        <label class="campo-con-titulo">
          <span>Nota para la mesa <small>(opcional; **negritas** y _cursivas_)</small></span>
          <textarea class="campo" rows="4" maxlength="2000" value={sel.texto} onchange={cambiarTexto}></textarea>
        </label>

        {#if sel.imagen}
          <fieldset class="fichas">
            <legend>Fichas <small>({fichasSel})</small></legend>
            <button class="boton ancho" onclick={() => agregarPJs(sel.id)} disabled={!faltan}>
              {faltan ? `Agregar PJ (${faltan})` : 'Todos los PJ ya están'}
            </button>
            <form class="nueva-ficha" onsubmit={ponerFicha}>
              <input class="campo" maxlength="40" placeholder="Adversario o PNJ" aria-label="Nombre de la ficha" bind:value={nombreFicha} />
              <input type="color" aria-label="Color de la ficha" bind:value={colorFicha} />
              <button class="boton" disabled={!nombreFicha.trim()}>Agregar</button>
            </form>
            <label class="campo-con-titulo">
              <span>Tamaño de las fichas</span>
              <input type="range" min="0.02" max="0.15" step="0.005" value={sel.tam_ficha} onchange={(e) => guardarTablero(sel.id, { tam_ficha: Number(e.currentTarget.value) })} />
            </label>
            <p class="ayuda">Cada jugador arrastra la ficha de su PJ; tú mueves todas. Toca una ficha en el mapa para quitarla. Para la niebla, usa «Agregar niebla» arriba del mapa.</p>
          </fieldset>
        {/if}

        <button class="boton ancho peligro" onclick={borrar}>Borrar tablero</button>
      </div>
    {/if}
  </div>
</section>

<style>
  .panel {
    position: fixed; z-index: 9; top: 0; bottom: 0; right: 0; width: min(100%, 360px);
    display: flex; flex-direction: column;
    border-radius: var(--radio-panel) 0 0 var(--radio-panel);
  }
  .cabecera { display: flex; align-items: center; justify-content: space-between; padding: calc(0.8rem + env(safe-area-inset-top, 0px)) 1rem 0.5rem; }
  .cabecera h2 { margin: 0; font-size: 1.3rem; }
  .cerrar { padding: 0.3rem 0.65rem; }
  .cuerpo { flex: 1; overflow: auto; padding: 0 1rem calc(1rem + var(--seguro-abajo)); display: grid; gap: 0.8rem; align-content: start; }
  .nuevo { display: grid; grid-template-columns: 1fr auto; gap: 0.4rem; }
  .subir { text-align: center; cursor: pointer; }
  .subir.ocupado { opacity: 0.6; cursor: progress; }
  .subir:focus-within { outline: 2px solid var(--esperanza); outline-offset: 2px; }
  .vacio, .ayuda { margin: 0; font-size: 0.85rem; color: var(--pergamino-suave); }
  .error { margin: 0; color: #ffb3bd; font-size: 0.85rem; }
  .lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.3rem; }
  .elemento {
    width: 100%; display: flex; align-items: center; gap: 0.5rem; text-align: left;
    padding: 0.5rem 0.7rem; border-radius: var(--radio-control);
    border: 1px solid var(--linea); background: var(--vidrio-claro); color: inherit; font: inherit;
  }
  .elemento.activo { border-color: var(--miedo); background: rgba(167, 124, 232, 0.22); }
  .elemento .texto { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .en-mesa { font-size: 0.72rem; font-weight: 800; color: var(--tinta); background: var(--esperanza); border-radius: 999px; padding: 0.1rem 0.5rem; }
  .editor { display: grid; gap: 0.7rem; border-top: 1px solid var(--linea); padding-top: 0.8rem; }
  .campo-con-titulo { display: grid; gap: 0.25rem; font-size: 0.85rem; font-weight: 700; }
  .campo-con-titulo small, legend small { font-weight: 400; color: var(--pergamino-suave); }
  textarea.campo { resize: vertical; font: inherit; }
  .fichas { border: 1px solid var(--linea); border-radius: var(--radio-control); padding: 0.6rem 0.7rem 0.7rem; display: grid; gap: 0.55rem; margin: 0; }
  legend { font-weight: 800; font-size: 0.9rem; padding: 0 0.3rem; }
  .nueva-ficha { display: grid; grid-template-columns: 1fr 2.6rem auto; gap: 0.35rem; align-items: center; }
  .nueva-ficha input[type='color'] { width: 100%; height: 2.3rem; padding: 0; border: 1px solid var(--linea); border-radius: 8px; background: none; }
  .ancho { width: 100%; }
  .primario { background: var(--miedo); color: var(--tinta); border-color: transparent; font-weight: 800; }
  .peligro { border-color: rgba(217, 74, 92, 0.7); color: #ffb3bd; }
  input[type='range'] { width: 100%; accent-color: var(--miedo); }
  @media (max-width: 600px) {
    /* En celular va abajo y deja ver el mapa arriba */
    .panel { top: auto; height: 55vh; width: 100%; border-radius: var(--radio-panel) var(--radio-panel) 0 0; background: rgb(22, 15, 38); }
  }
</style>

<script>
  // Panel del DJ para el tablero compartido: galería de tableros, qué ve la
  // mesa, nota, fichas y borrar. La niebla se pinta directo en el mapa.
  import { app } from '../../lib/mesa.svelte.js'
  import {
    tablero, tableroVisible, idMostrado, crearTablero, guardarTablero, mostrarTablero,
    borrarTablero, crearFicha, agregarPJs,
  } from '../../lib/tablero.svelte.js'
  import { pjsSinFicha } from '../../lib/tablero.js'
  import Icono from '../Icono.svelte'

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

<div class="velo" onclick={onCerrar} role="presentation"></div>
<section class="panel vidrio" aria-label="Tablero para la mesa">
  <header class="cabecera">
    <div class="titulos">
      <h2 class="titulo">Tablero</h2>
      <p class="sub">Un mapa, una imagen o una nota para toda la mesa.</p>
    </div>
    <button class="icono" onclick={onCerrar} aria-label="Cerrar el panel del tablero"><Icono nombre="cerrar" /></button>
  </header>

  <div class="cuerpo">
    <div class="nuevo">
      <label class="boton subir" class:ocupado={tablero.subiendo}>
        <Icono nombre="subir" tam={18} />{tablero.subiendo ? 'Subiendo…' : 'Subir mapa o imagen'}
        <input class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onchange={alElegirArchivo} disabled={tablero.subiendo} />
      </label>
      <button class="boton" onclick={() => crearTablero({ nombre: 'Nota' })}><Icono nombre="letra" tam={18} />Nota de texto</button>
    </div>
    {#if tablero.error}<p class="aviso-error" role="alert">{tablero.error}</p>{/if}

    {#if tablero.lista.length}
      <ul class="lista" aria-label="Tus tableros">
        {#each tablero.lista as t (t.id)}
          <li>
            <button class="elemento" class:activo={t.id === sel?.id} aria-current={t.id === sel?.id} onclick={() => (tablero.abierto = t.id)}>
              <Icono nombre={t.imagen ? 'mapa' : 'letra'} tam={20} />
              <span class="texto">{t.nombre}</span>
              {#if t.id === mostrado}<span class="en-mesa">En la mesa</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="vacio">Aún no tienes tableros. Sube un mapa, una ilustración o una carta, o crea una nota de texto. Luego elígela aquí y toca «Mostrar a la mesa».</p>
    {/if}

    {#if sel}
      <div class="editor">
        {#if sel.id === mostrado}
          <button class="boton ancho" onclick={() => mostrarTablero(null)}><Icono nombre="ojo-no" tam={18} />Quitar de la mesa</button>
        {:else}
          <button class="boton solido ancho" onclick={() => mostrarTablero(sel.id)}><Icono nombre="ojo" tam={18} />Mostrar a la mesa</button>
        {/if}

        <label class="dato">
          <span class="rotulo">Nombre</span>
          <input class="campo" maxlength="80" value={sel.nombre} onchange={cambiarNombre} />
        </label>
        <label class="dato">
          <span class="rotulo">Nota para la mesa</span>
          <textarea class="campo" rows="4" maxlength="2000" value={sel.texto} onchange={cambiarTexto}></textarea>
          <small class="ayuda">Opcional. Escribe **negritas** y _cursivas_ así.</small>
        </label>

        {#if sel.imagen}
          <fieldset class="fichas">
            <legend class="rotulo">Fichas ({fichasSel})</legend>
            <button class="boton ancho" onclick={() => agregarPJs(sel.id)} disabled={!faltan}>
              <Icono nombre="persona" tam={18} />{faltan ? `Agregar PJ (${faltan})` : app.personajes.length ? 'Todos los PJ ya están' : 'Aún no hay PJ en la campaña'}
            </button>
            <form class="nueva-ficha" onsubmit={ponerFicha}>
              <input class="campo" maxlength="40" placeholder="Adversario o PNJ" aria-label="Nombre de la ficha" bind:value={nombreFicha} />
              <input type="color" aria-label="Color de la ficha" bind:value={colorFicha} />
              <button class="boton" disabled={!nombreFicha.trim()}>Agregar</button>
            </form>
            <label class="dato">
              <span class="rotulo">Tamaño de las fichas</span>
              <input type="range" min="0.02" max="0.15" step="0.005" value={sel.tam_ficha} onchange={(e) => guardarTablero(sel.id, { tam_ficha: Number(e.currentTarget.value) })} />
            </label>
            <p class="ayuda">Cada jugador arrastra la ficha de su PJ; tú mueves todas. Toca una ficha en el mapa para quitarla. Para la niebla, usa «Agregar niebla» arriba del mapa.</p>
          </fieldset>
        {/if}

        <button class="boton peligro ancho" onclick={borrar}><Icono nombre="basura" tam={18} />Borrar tablero</button>
      </div>
    {/if}
  </div>
</section>

<style>
  .velo { position: fixed; inset: 0; background: var(--velo); z-index: 8; animation: aparecer-velo 0.25s ease-out; }
  @keyframes aparecer-velo { from { opacity: 0; } }
  .panel {
    position: fixed; z-index: 9; top: calc(84px + var(--seguro-arriba)); bottom: 12px; left: 12px; width: min(380px, calc(100% - 24px));
    display: flex; flex-direction: column; overflow: hidden;
    border-radius: var(--radio-panel);
    background: var(--superficie-firme); box-shadow: var(--sombra-alta);
    animation: entrar 0.25s var(--suave);
  }
  @keyframes entrar { from { transform: translateX(-24px); opacity: 0; } }
  .cabecera { flex: none; display: flex; align-items: flex-start; gap: 0.7rem; padding: 0.9rem 1rem 0.5rem 1.2rem; }
  .titulos { flex: 1; min-width: 0; }
  h2 { margin: 0; font-size: 1.5rem; }
  .sub { margin: 0.15rem 0 0; font-size: 0.85rem; color: var(--texto-suave); }
  .cuerpo { flex: 1; min-height: 0; overflow-y: auto; padding: 0.75rem 1rem calc(1.4rem + var(--seguro-abajo)); display: grid; gap: 0.75rem; align-content: start; overscroll-behavior: contain; }
  .nuevo { display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; }
  .subir { cursor: pointer; }
  .subir.ocupado { opacity: 0.6; cursor: progress; }
  .subir:focus-within { outline: 2.5px solid var(--esperanza-hondo); outline-offset: 2px; }
  .vacio { margin: 0; padding: 1rem; border: 1px dashed var(--filete-fuerte); border-radius: var(--radio-control); color: var(--texto-suave); font-size: 0.95rem; text-align: center; }
  .ayuda { margin: 0; font-size: 0.85rem; color: var(--texto-suave); }
  .lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
  .elemento {
    width: 100%; min-height: 2.75rem; display: flex; align-items: center; gap: 0.6rem; text-align: left;
    padding: 0.5rem 0.8rem; border-radius: var(--radio-control);
    border: 1px solid var(--filete); background: var(--hundido); color: var(--texto); font-weight: 700;
  }
  .elemento:hover { background: var(--hundido-2); }
  .elemento.activo { background: #fff; border-color: var(--filete-fuerte); box-shadow: inset 0 0 0 1.5px var(--texto); }
  .elemento :global(svg) { flex: none; }
  .elemento .texto { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .en-mesa { flex: none; font-size: 0.75rem; font-weight: 900; color: var(--esperanza-hondo); background: var(--esperanza-suave); border-radius: 999px; padding: 0.15rem 0.6rem; }
  .editor { display: grid; gap: 0.75rem; border-top: 1px solid var(--filete); padding-top: 0.9rem; }
  .dato { display: grid; gap: 0.3rem; }
  textarea.campo { resize: vertical; }
  .fichas { border: 1px solid var(--filete); border-radius: var(--radio-control); padding: 0.6rem 0.8rem 0.8rem; display: grid; gap: 0.6rem; margin: 0; min-width: 0; }
  legend { padding: 0 0.3rem; }
  .nueva-ficha { display: grid; grid-template-columns: 1fr 2.6rem auto; gap: 0.4rem; align-items: center; }
  .nueva-ficha input[type='color'] { width: 100%; height: 2.5rem; padding: 0.15rem; border: 1px solid var(--filete); border-radius: 12px; background: rgb(255 255 255 / 0.62); }
  .ancho { width: 100%; }
  input[type='range'] { width: 100%; }
  @media (min-width: 1100px) { .velo { display: none; } }
  @media (max-width: 759px) {
    .panel { inset: 0; width: 100%; border-radius: 0; }
    .cabecera { padding-top: calc(0.9rem + var(--seguro-arriba)); }
  }
</style>

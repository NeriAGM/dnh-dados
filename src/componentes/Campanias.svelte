<script>
  import Icono from './Icono.svelte'
  import { app, abrirCampania, crearCampania, unirseCampania, salir, limpiarCodigo } from '../lib/mesa.svelte.js'

  let codigo = $state('')
  let nombre = $state('')
  let error = $state('')
  let ocupado = $state(false)
  let abriendo = $state(null) // id de la campaña que se está abriendo
  // Al pegar " 2da8ea " (con espacios) el tope de 6 letras cortaba el código
  const codigoLimpio = $derived(limpiarCodigo(codigo))

  async function hacer(fn) {
    error = ''
    app.error = null
    ocupado = true
    try { await fn() } catch (e) { error = e.message } finally { ocupado = false }
  }
</script>

<section class="campanias">
  <h1 class="sobre-fondo">Hola, {app.perfil?.nombre ?? 'aventurero'}</h1>

  <div class="tarjeta vidrio">
    {#if app.campanias.length}
      <h2>Tus campañas</h2>
      <ul>
        {#each app.campanias as c (c.id)}
          <li>
            <button class="boton fila" disabled={ocupado} onclick={() => { abriendo = c.id; hacer(() => abrirCampania(c.id)).finally(() => (abriendo = null)) }}>
              <span class="nombre">{c.nombre}</span>
              <small>{abriendo === c.id ? 'Abriendo…' : c.rol === 'dj' ? 'Eres DJ' : 'Juegas'}</small>
              <Icono nombre="derecha" tam={18} />
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <h2>Unirme con código</h2>
    <form onsubmit={(e) => { e.preventDefault(); hacer(() => unirseCampania(codigoLimpio)) }}>
      <label class="etiqueta" for="codigo"><span class="rotulo">Código de invitación</span></label>
      <div class="en-linea">
        <input id="codigo" class="campo codigo" maxlength="12" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="Ej. 2DA8EA" bind:value={codigo} />
        <button class="boton" disabled={ocupado || codigoLimpio.length < 6}>Unirme</button>
      </div>
    </form>

    <h2>Dirigir una campaña nueva</h2>
    <form onsubmit={(e) => { e.preventDefault(); hacer(() => crearCampania(nombre)) }}>
      <label class="etiqueta" for="nombre"><span class="rotulo">Nombre de la campaña</span></label>
      <div class="en-linea">
        <input id="nombre" class="campo" placeholder="Dolor & Hambre" bind:value={nombre} />
        <button class="boton" disabled={ocupado || !nombre.trim()}>Crear</button>
      </div>
    </form>

    {#if error || app.error}<p class="aviso-error" role="alert">{error || app.error}</p>{/if}
  </div>

  <button class="boton fantasma salir sobre-fondo" onclick={salir}>Cerrar sesión</button>
</section>

<style>
  .campanias {
    position: absolute;
    inset: 0;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 1.2rem;
    padding: calc(1.5rem + var(--seguro-arriba)) 1rem calc(1.5rem + var(--seguro-abajo));
    overflow-y: auto;
  }
  h1 { margin: 0; font-size: clamp(2rem, 7vw, 3rem); text-align: center; }
  .tarjeta {
    width: min(100%, 420px);
    border-radius: var(--radio-panel);
    background: var(--superficie-firme);
    box-shadow: var(--sombra-alta);
    padding: 1.2rem 1.3rem 1.4rem;
  }
  h2 { font-size: 1.1rem; margin: 1.4rem 0 0.5rem; }
  h2:first-child { margin-top: 0; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }
  .fila { width: 100%; min-height: 3.4rem; justify-content: flex-start; gap: 0.7rem; text-align: left; padding: 0.6rem 0.9rem; }
  .fila .nombre { flex: 1; min-width: 0; font-size: 1.1rem; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fila small { color: var(--texto-suave); font-size: 0.85rem; font-weight: 700; }
  form { display: grid; gap: 0.3rem; }
  .en-linea { display: flex; gap: 0.5rem; }
  .codigo { text-transform: uppercase; letter-spacing: 0.2em; font-weight: 800; }
  .aviso-error { margin: 0.9rem 0 0; }
  .salir { text-shadow: var(--sombra-texto); font-weight: 700; }
  .salir:hover { background: rgb(255 255 255 / 0.18); }
</style>

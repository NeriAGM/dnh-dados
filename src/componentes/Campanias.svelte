<script>
  import { app, abrirCampania, crearCampania, unirseCampania, salir } from '../lib/mesa.svelte.js'

  let codigo = $state('')
  let nombre = $state('')
  let error = $state('')
  let ocupado = $state(false)

  async function hacer(fn) {
    error = ''
    ocupado = true
    try { await fn() } catch (e) { error = e.message } finally { ocupado = false }
  }
</script>

<section class="campanias">
  <h1 class="titulo">Hola, {app.perfil?.nombre ?? 'aventurero'}</h1>

  <div class="tarjeta vidrio">
    {#if app.campanias.length}
      <h2>Tus campañas</h2>
      <ul>
        {#each app.campanias as c (c.id)}
          <li>
            <button class="boton fila" onclick={() => hacer(() => abrirCampania(c.id))}>
              <span>{c.nombre}</span>
              <small>{c.rol === 'dj' ? 'Eres DJ' : 'Juegas'}</small>
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <h2>Unirme con código</h2>
    <form class="en-linea" onsubmit={(e) => { e.preventDefault(); hacer(() => unirseCampania(codigo)) }}>
      <label class="sr-only" for="codigo">Código de invitación</label>
      <input id="codigo" class="campo codigo" maxlength="6" placeholder="Ej. 2DA8EA" bind:value={codigo} />
      <button class="boton" disabled={ocupado || codigo.trim().length < 6}>Unirme</button>
    </form>

    <h2>Dirigir una campaña nueva</h2>
    <form class="en-linea" onsubmit={(e) => { e.preventDefault(); hacer(() => crearCampania(nombre)) }}>
      <label class="sr-only" for="nombre">Nombre de la campaña</label>
      <input id="nombre" class="campo" placeholder="Dolor & Hambre" bind:value={nombre} />
      <button class="boton" disabled={ocupado || !nombre.trim()}>Crear</button>
    </form>

    {#if error}<p class="error" role="alert">{error}</p>{/if}
  </div>

  <button class="salir" onclick={salir}>Cerrar sesión</button>
</section>

<style>
  .campanias {
    position: absolute;
    inset: 0;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 1.2rem;
    padding: 1.5rem 1rem;
    overflow-y: auto;
  }
  h1 { margin: 0; font-size: clamp(2rem, 7vw, 3rem); text-align: center; }
  .tarjeta {
    width: min(100%, 420px);
    border-radius: var(--radio-panel);
    padding: 1.2rem 1.3rem 1.4rem;
  }
  h2 { font-size: 0.95rem; margin: 1.1rem 0 0.5rem; color: var(--pergamino-suave); font-weight: 700; }
  h2:first-child { margin-top: 0; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.45rem; }
  .fila { width: 100%; display: flex; justify-content: space-between; align-items: baseline; text-align: left; }
  .fila span { font-family: var(--fuente-titulo); font-size: 1.15rem; }
  .fila small { color: var(--pergamino-suave); font-weight: 500; }
  .en-linea { display: flex; gap: 0.5rem; }
  .codigo { text-transform: uppercase; letter-spacing: 0.2em; font-weight: 800; }
  .error { color: #ffb3bd; margin: 0.8rem 0 0; }
  .salir { background: none; border: 0; color: var(--pergamino-suave); text-decoration: underline; }
</style>

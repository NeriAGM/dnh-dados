<script>
  import { app, crearPersonajeCompleto, asignarPersonaje, borrarPersonaje, cambiarCampania, salir, salirDemo, ajustesMesa, guardarAjustes } from '../lib/mesa.svelte.js'
  import { AJUSTES } from '../lib/ajustes.js'
  import { hojaNueva } from '../lib/reglas.js'
  import Casero from './Casero.svelte'
  import Fondos from './Fondos.svelte'
  import Icono from './Icono.svelte'
  import Invitar from './Invitar.svelte'
  import { fondos } from '../lib/fondos.svelte.js'
  import { esPueblo, MOMENTOS as MOMENTOS_FONDO } from '../lib/fondo/ajustes.js'

  let { momento, onMomento, onCerrar, onAbrirHoja, cat = null } = $props()
  let claseNueva = $state('')
  let verCasero = $state(false)
  let verFondos = $state(false)
  const imagenesEnTablero = $derived(Object.values(fondos.config.tablero).filter((id) => !esPueblo(id)).length)

  const MOMENTOS = [{ id: 'auto', nombre: 'Según la hora', icono: 'reloj' }, ...MOMENTOS_FONDO]
  const COLORES = ['#e9b44c', '#d9646a', '#6fb0e8', '#7fd6a8', '#c79bff', '#f2a65a']

  let nombre = $state('')
  let para = $state('')
  let color = $state(COLORES[0])
  let error = $state('')
  let confirmarBorrar = $state(null)

  const uid = $derived(app.sesion?.user?.id)
  const esDJ = $derived(app.rol === 'dj')

  // Reglas de la mesa: en el modo prueba tú eres el DJ
  const reglas = $derived(ajustesMesa())
  const decidoReglas = $derived(app.demo || esDJ)
  let errorReglas = $state('')
  async function cambiarRegla(id, valor) {
    errorReglas = ''
    try { await guardarAjustes({ [id]: valor }) } catch (err) { errorReglas = err.message }
  }

  async function nuevo(e) {
    e.preventDefault()
    error = ''
    try {
      const clase = cat?.porId?.clases?.[claseNueva]
      const pjNuevo = await crearPersonajeCompleto({ nombre: nombre.trim(), usuarioId: esDJ ? para || null : uid, color, hoja: hojaNueva(clase) })
      nombre = ''
      onAbrirHoja?.(pjNuevo.id)
    } catch (err) { error = err.message }
  }
</script>

{#if verFondos}
  <Fondos {momento} onVolver={() => (verFondos = false)} {onCerrar} />
{:else}
<div class="cortina velo-aj" onclick={onCerrar} role="presentation"></div>
<section class="ajustes vidrio" aria-label="Ajustes de la mesa">
  <header>
    <h2>Ajustes</h2>
    <button class="icono" onclick={onCerrar} aria-label="Cerrar ajustes"><Icono nombre="cerrar" /></button>
  </header>

  <div class="cuerpo">
    <section class="grupo">
      <h3>Apariencia</h3>
      <p class="rotulo">Momento del día</p>
      <div class="segmentos" role="group" aria-label="Momento del día">
        {#each MOMENTOS as m (m.id)}
          <button class="segmento" aria-pressed={momento === m.id} onclick={() => onMomento(m.id)}>
            <Icono nombre={m.icono} tam={20} />
            <span>{m.nombre}</span>
          </button>
        {/each}
      </div>
      <button class="fila-accion" onclick={() => (verFondos = true)}>
        <Icono nombre="pincel" tam={20} />
        <span class="txt"><b>Personalizar fondo y letra</b><small>{imagenesEnTablero ? `${imagenesEnTablero} momento${imagenesEnTablero > 1 ? 's' : ''} con imagen tuya` : 'Pueblo animado, tus imágenes, tono, vidrio y letra'}</small></span>
        <Icono nombre="derecha" tam={18} />
      </button>
    </section>

    {#if !app.demo && app.campania}
      {#if esDJ}<Invitar />{/if}

      {@render reglasDeLaMesa()}

      <section class="grupo">
        <h3>Personajes</h3>
        <ul class="pjs">
          {#each app.personajes as p (p.id)}
            <li>
              <button class="pj-fila" onclick={() => onAbrirHoja?.(p.id)} disabled={!cat}>
                <span class="punto" style:background={p.color}></span>
                <span class="pj-nombre">{p.nombre}</span>
                <small>{cat?.porId?.clases?.[p.hoja?.clase]?.nombre ?? p.hoja?.clase_texto ?? ''}{p.hoja?.nivel ? ` · nivel ${p.hoja.nivel}` : ''}</small>
              </button>
              {#if esDJ}
                <div class="pj-acciones">
                  <select class="campo asignar" value={p.usuario_id ?? ''} aria-label="Jugador de {p.nombre}"
                    onchange={async (e) => {
                      const sel = e.currentTarget
                      error = ''
                      // Si el servidor no acepta, la lista vuelve a mostrar al jugador que sí tiene
                      try { await asignarPersonaje(p.id, sel.value || null) } catch (err) { error = err.message; sel.value = p.usuario_id ?? '' }
                    }}>
                    <option value="">Sin jugador</option>
                    {#each app.miembros as m (m.usuario_id)}<option value={m.usuario_id}>{m.perfiles?.nombre ?? 'Jugador'}</option>{/each}
                  </select>
                  {#if confirmarBorrar === p.id}
                    <button class="boton peligro" aria-label="Confirmar: borrar {p.nombre}"
                      onclick={async () => { try { await borrarPersonaje(p.id) } catch (err) { error = err.message } confirmarBorrar = null }}>¿Seguro?</button>
                  {:else}
                    <button class="icono" aria-label="Borrar {p.nombre}" title="Borrar personaje" onclick={() => (confirmarBorrar = p.id)}><Icono nombre="basura" tam={18} /></button>
                  {/if}
                </div>
              {:else}
                <small class="jugador">{app.miembros.find((m) => m.usuario_id === p.usuario_id)?.perfiles?.nombre ?? 'Sin jugador'}</small>
              {/if}
            </li>
          {:else}
            <li class="vacio-texto">Todavía no hay personajes. Agrega el primero abajo.</li>
          {/each}
        </ul>
        {#if app.personajes.length}<p class="ayuda">Toca un personaje para abrir su hoja.</p>{/if}

        <form onsubmit={nuevo}>
          <h4>Agregar personaje</h4>
          <label class="etiqueta">
            <span class="rotulo">Nombre</span>
            <input class="campo" placeholder="Nombre del personaje" maxlength="80" bind:value={nombre} />
          </label>
          <label class="etiqueta">
            <span class="rotulo">Clase</span>
            <select class="campo" bind:value={claseNueva}>
              <option value="">Clase (puedes elegirla después)</option>
              {#each cat?.clases ?? [] as c (c.id)}<option value={c.id}>{c.nombre}{c.fuente === 'SRD 1.0' ? '' : ` · ${c.fuente}`}</option>{/each}
            </select>
          </label>
          {#if esDJ}
            <label class="etiqueta">
              <span class="rotulo">Jugador</span>
              <select class="campo" bind:value={para}>
                <option value="">Sin jugador (PNJ)</option>
                {#each app.miembros as m (m.usuario_id)}
                  <option value={m.usuario_id}>{m.perfiles?.nombre ?? 'Jugador'}{m.rol === 'dj' ? ' (tú)' : ''}</option>
                {/each}
              </select>
            </label>
          {/if}
          <div class="etiqueta">
            <span class="rotulo" id="rotulo-color">Color</span>
            <div class="colores" role="radiogroup" aria-labelledby="rotulo-color">
              {#each COLORES as c}
                <button type="button" role="radio" aria-checked={color === c} aria-label={c} class:activo={color === c} style:background={c} onclick={() => (color = c)}></button>
              {/each}
            </div>
          </div>
          <button class="boton" disabled={!nombre.trim()}>Agregar personaje</button>
        </form>
        {#if error}<p class="aviso-error" role="alert">{error}</p>{/if}
      </section>

      <section class="grupo">
        <h3>Contenido casero</h3>
        <p class="ayuda">Clases, cartas, armas y armaduras inventadas por la mesa ({app.casero.length}).</p>
        <button class="boton" onclick={() => (verCasero = true)}>Abrir contenido casero</button>
      </section>

      <section class="grupo">
        <h3>Cuenta</h3>
        <div class="cuenta">
          <button class="boton" onclick={() => { onCerrar(); cambiarCampania() }}>Cambiar de campaña</button>
          <button class="boton" onclick={salir}><Icono nombre="salir" tam={18} />Cerrar sesión</button>
        </div>
      </section>
    {:else}
      {#if app.demo}{@render reglasDeLaMesa()}{/if}
      <section class="grupo">
        <button class="boton" onclick={() => { onCerrar(); salirDemo() }}><Icono nombre="salir" tam={18} />Salir del modo prueba</button>
      </section>
    {/if}
  </div>
</section>
{/if}

{#snippet reglasDeLaMesa()}
  <section class="grupo">
    <h3>Reglas de la mesa</h3>
    <p class="ayuda">{decidoReglas ? 'Las decides tú y aplican a todos en la campaña.' : 'Las decide el DJ; así se juega en esta mesa.'}{app.demo ? ' En el modo prueba no se guardan.' : ''}</p>
    <ul class="reglas">
      {#each AJUSTES as a (a.id)}
        {@const on = reglas[a.id]}
        <li class="regla">
          <span class="regla-txt">
            <b id="nombre-regla-{a.id}">{a.nombre}</b>
            <small id="regla-{a.id}">{a.descripcion}</small>
          </span>
          {#if decidoReglas}
            <button class="interruptor-si" role="switch" aria-checked={on}
              aria-labelledby="nombre-regla-{a.id}" aria-describedby="regla-{a.id}" onclick={() => cambiarRegla(a.id, !on)}></button>
          {:else}
            <span class="estado" class:on>{on ? 'Sí' : 'No'}</span>
          {/if}
        </li>
      {/each}
    </ul>
    {#if errorReglas}<p class="aviso-error" role="alert">{errorReglas}</p>{/if}
  </section>
{/snippet}

{#if verCasero}
  <Casero {cat} onCerrar={() => (verCasero = false)} />
{/if}

<style>
  .velo-aj { z-index: 5; }
  .ajustes {
    position: fixed;
    z-index: 6;
    right: 12px; top: 12px; bottom: 12px;
    width: min(380px, calc(100vw - 24px));
    display: flex; flex-direction: column;
    border-radius: var(--radio-panel);
    background: var(--superficie-firme);
    box-shadow: var(--sombra-alta);
    overflow: hidden;
    animation: entrar 0.25s var(--suave);
  }
  @keyframes entrar { from { transform: translateX(24px); opacity: 0; } }
  header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0.75rem 0.4rem 1.1rem; }
  h2 { margin: 0; font-size: 1.5rem; }
  .cuerpo { flex: 1; min-height: 0; overflow-y: auto; padding: 0.4rem 1.1rem calc(1.4rem + var(--seguro-abajo)); display: grid; gap: 1.4rem; align-content: start; overscroll-behavior: contain; }
  .grupo { display: grid; gap: 0.6rem; align-content: start; }
  h3 { margin: 0; font-size: 1.1rem; }
  h4 { margin: 0.4rem 0 0; font-size: 1rem; }
  .rotulo { margin: 0; }
  .ayuda { color: var(--texto-suave); font-size: 0.85rem; margin: 0; }

  .segmentos { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.3rem; padding: 0.25rem; border-radius: var(--radio-control); background: var(--hundido); }
  .segmento {
    display: grid; justify-items: center; align-content: center; gap: 0.15rem; min-height: 3.4rem; padding: 0.35rem 0.1rem;
    border: 0; border-radius: 11px; background: none; color: var(--texto);
    font-size: 0.72rem; font-weight: 700; line-height: 1.15; text-align: center; transition: background 0.15s;
  }
  .segmento:hover { background: var(--hundido-2); }
  .segmento[aria-pressed='true'] { background: #fff; box-shadow: 0 1px 2px rgb(18 20 50 / 0.12), 0 4px 12px -6px rgb(18 20 50 / 0.4); }

  .fila-accion {
    display: flex; align-items: center; gap: 0.7rem; width: 100%; padding: 0.7rem 0.85rem; text-align: left;
    border: 1px solid var(--filete); border-radius: var(--radio-control); background: var(--hundido); transition: background 0.15s;
  }
  .fila-accion:hover { background: var(--hundido-2); }
  .fila-accion .txt { flex: 1; display: grid; min-width: 0; }
  .fila-accion small { color: var(--texto-suave); font-size: 0.85rem; font-weight: 500; }


  .reglas { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
  .regla { display: flex; align-items: center; gap: 0.8rem; padding: 0.6rem 0.8rem; border: 1px solid var(--filete); border-radius: var(--radio-control); background: var(--hundido); }
  .regla-txt { flex: 1; min-width: 0; display: grid; gap: 0.1rem; }
  .regla-txt b { font-size: 1rem; }
  .regla-txt small { color: var(--texto-suave); font-size: 0.85rem; font-weight: 500; line-height: 1.3; }
  .estado { flex: none; min-width: 2.6rem; text-align: center; font-size: 0.85rem; font-weight: 900; padding: 0.2rem 0.6rem; border-radius: 999px; background: var(--hundido-2); color: var(--texto-suave); }
  .estado.on { background: var(--exito-suave); color: var(--exito-hondo); }

  .pjs { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
  .pjs li { display: grid; gap: 0.3rem; padding: 0.3rem 0.4rem; border: 1px solid var(--filete); border-radius: var(--radio-control); background: var(--hundido); }
  .pjs li.vacio-texto { border: 0; background: none; }
  .pj-fila { display: flex; align-items: center; gap: 0.6rem; min-height: 2.5rem; border: 0; background: none; padding: 0.3rem 0.4rem; text-align: left; border-radius: 10px; }
  .pj-fila:not(:disabled):hover { background: var(--hundido-2); }
  .pj-nombre { font-weight: 900; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pj-fila small { margin-left: auto; color: var(--texto-suave); font-weight: 500; font-size: 0.85rem; white-space: nowrap; }
  .punto { flex: none; width: 0.85rem; height: 0.85rem; border-radius: 50%; box-shadow: 0 0 0 2px rgb(255 255 255 / 0.7); }
  .pj-acciones { display: flex; gap: 0.4rem; align-items: center; padding: 0 0.2rem 0.2rem; }
  .asignar { flex: 1; min-width: 0; }
  .jugador { color: var(--texto-suave); font-size: 0.85rem; padding: 0 0.6rem 0.3rem; }

  form { display: grid; gap: 0.6rem; padding-top: 0.4rem; }
  .etiqueta { display: grid; gap: 0.25rem; }
  .colores { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .colores button { width: 2.2rem; height: 2.2rem; border-radius: 50%; border: 2px solid rgb(255 255 255 / 0.8); box-shadow: 0 0 0 1px var(--filete-fuerte); }
  .colores button.activo { box-shadow: 0 0 0 3px var(--texto); }

  .cuenta { display: grid; gap: 0.5rem; }

  @media (max-width: 759px) {
    .ajustes { inset: 0; width: 100%; border-radius: 0; box-shadow: none; }
    header { padding-top: calc(0.9rem + var(--seguro-arriba)); }
  }
</style>

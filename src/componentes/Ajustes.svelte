<script>
  import { app, crearPersonajeCompleto, asignarPersonaje, borrarPersonaje, cambiarCampania, salir, salirDemo, ajustesMesa, guardarAjustes } from '../lib/mesa.svelte.js'
  import { AJUSTES } from '../lib/ajustes.js'
  import { hojaNueva } from '../lib/reglas.js'
  import Casero from './Casero.svelte'
  import Fondos from './Fondos.svelte'
  import { fondos } from '../lib/fondos.svelte.js'
  import { esPueblo } from '../lib/fondo/ajustes.js'

  let { momento, onMomento, onCerrar, onAbrirHoja, cat = null } = $props()
  let claseNueva = $state('')
  let verCasero = $state(false)
  let verFondos = $state(false)
  const imagenesEnTablero = $derived(Object.values(fondos.config.tablero).filter((id) => !esPueblo(id)).length)

  const MOMENTOS = [
    { id: 'auto', nombre: 'Según la hora' },
    { id: 'amanecer', nombre: 'Amanecer' },
    { id: 'dia', nombre: 'Día' },
    { id: 'atardecer', nombre: 'Atardecer' },
    { id: 'noche', nombre: 'Noche' },
  ]
  const COLORES = ['#e9b44c', '#d9646a', '#6fb0e8', '#7fd6a8', '#c79bff', '#f2a65a']

  let nombre = $state('')
  let para = $state('')
  let color = $state(COLORES[0])
  let error = $state('')
  let copiado = $state(false)
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

  async function copiar() {
    try { await navigator.clipboard.writeText(app.campania.codigo_invitacion); copiado = true; setTimeout(() => (copiado = false), 1800) } catch {}
  }
</script>

{#if verFondos}
  <Fondos {momento} onVolver={() => (verFondos = false)} {onCerrar} />
{:else}
<div class="velo" onclick={onCerrar} role="presentation"></div>
<section class="ajustes vidrio" aria-label="Ajustes de la mesa">
  <header>
    <h2 class="titulo">Ajustes</h2>
    <button class="cerrar" onclick={onCerrar} aria-label="Cerrar ajustes">✕</button>
  </header>

  <h3>Momento del día</h3>
  <div class="opciones">
    {#each MOMENTOS as m (m.id)}
      <button class="opcion" class:activo={momento === m.id} onclick={() => onMomento(m.id)}>{m.nombre}</button>
    {/each}
  </div>
  <button class="personalizar" onclick={() => (verFondos = true)}>
    <span class="brillo-anim" aria-hidden="true"></span>
    <span class="txt"><b>Personalizar fondo</b><small>{imagenesEnTablero ? `${imagenesEnTablero} momento${imagenesEnTablero > 1 ? 's' : ''} con imagen tuya` : 'Pueblo animado, tus imágenes, tono y vidrio'}</small></span>
    <span aria-hidden="true">›</span>
  </button>

  {#if !app.demo && app.campania}
    {#if esDJ}
      <h3>Invitar jugadores</h3>
      <p class="ayuda">Compárteles este código; lo escriben en "Unirme con código".</p>
      <button class="codigo titulo" onclick={copiar}>{app.campania.codigo_invitacion}<small>{copiado ? 'Copiado' : 'Toca para copiar'}</small></button>
    {/if}

    {@render reglasDeLaMesa()}

    <h3>Personajes</h3>
    <ul class="pjs">
      {#each app.personajes as p (p.id)}
        <li>
          <button class="pj-fila" onclick={() => onAbrirHoja?.(p.id)} disabled={!cat}>
            <span class="punto" style:background={p.color}></span>{p.nombre}
            <small>{cat?.porId?.clases?.[p.hoja?.clase]?.nombre ?? p.hoja?.clase_texto ?? ''}{p.hoja?.nivel ? ` · nivel ${p.hoja.nivel}` : ''}</small>
          </button>
          {#if esDJ}
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
            <button class="quitar" aria-label="Borrar {p.nombre}" title="Borrar personaje"
              onclick={async () => { if (confirmarBorrar === p.id) { try { await borrarPersonaje(p.id) } catch (err) { error = err.message } confirmarBorrar = null } else confirmarBorrar = p.id }}>
              {confirmarBorrar === p.id ? '¿Seguro?' : '✕'}
            </button>
          {:else}
            <small>{app.miembros.find((m) => m.usuario_id === p.usuario_id)?.perfiles?.nombre ?? 'Sin jugador'}</small>
          {/if}
        </li>
      {:else}
        <li class="ayuda">Todavía no hay personajes.</li>
      {/each}
    </ul>
    <form onsubmit={nuevo}>
      <input class="campo" placeholder="Nombre del personaje" maxlength="80" bind:value={nombre} aria-label="Nombre del personaje" />
      <select class="campo" bind:value={claseNueva} aria-label="Clase">
        <option value="">Clase (puedes elegirla después)</option>
        {#each cat?.clases ?? [] as c (c.id)}<option value={c.id}>{c.nombre}{c.fuente === 'SRD 1.0' ? '' : ` · ${c.fuente}`}</option>{/each}
      </select>
      {#if esDJ}
        <select class="campo" bind:value={para} aria-label="Jugador">
          <option value="">Sin jugador (PNJ)</option>
          {#each app.miembros as m (m.usuario_id)}
            <option value={m.usuario_id}>{m.perfiles?.nombre ?? 'Jugador'}{m.rol === 'dj' ? ' (tú)' : ''}</option>
          {/each}
        </select>
      {/if}
      <div class="colores" role="radiogroup" aria-label="Color">
        {#each COLORES as c}
          <button type="button" role="radio" aria-checked={color === c} aria-label={c} class:activo={color === c} style:background={c} onclick={() => (color = c)}></button>
        {/each}
      </div>
      <button class="boton" disabled={!nombre.trim()}>Agregar personaje</button>
    </form>
    <p class="ayuda">Toca un personaje para abrir su hoja.</p>

    <h3>Contenido casero</h3>
    <p class="ayuda">Clases, cartas, armas y armaduras inventadas por la mesa ({app.casero.length}).</p>
    <button class="boton" onclick={() => (verCasero = true)}>Abrir contenido casero</button>
    {#if error}<p class="error" role="alert">{error}</p>{/if}

    <div class="pie">
      <button class="boton" onclick={() => { onCerrar(); cambiarCampania() }}>Cambiar de campaña</button>
      <button class="boton" onclick={salir}>Cerrar sesión</button>
    </div>
  {:else}
    {#if app.demo}{@render reglasDeLaMesa()}{/if}
    <div class="pie">
      <button class="boton" onclick={() => { onCerrar(); salirDemo() }}>Salir del modo prueba</button>
    </div>
  {/if}
  <p class="ayuda"><a href="./legado/">Abrir el tirador anterior</a></p>
</section>
{/if}

{#snippet reglasDeLaMesa()}
  <h3>Reglas de la mesa</h3>
  <p class="ayuda">{decidoReglas ? 'Las decides tú y aplican a todos en la campaña.' : 'Las decide el DJ; así se juega en esta mesa.'}{app.demo ? ' En el modo prueba no se guardan.' : ''}</p>
  <ul class="reglas">
    {#each AJUSTES as a (a.id)}
      {@const on = reglas[a.id]}
      <li>
        <button class="regla" class:on role="switch" aria-checked={on} disabled={!decidoReglas}
          aria-describedby="regla-{a.id}" onclick={() => cambiarRegla(a.id, !on)}>
          <span class="regla-txt">
            <b>{a.nombre}</b>
            <small id="regla-{a.id}">{a.descripcion}</small>
          </span>
          {#if decidoReglas}
            <span class="interruptor" aria-hidden="true"><span></span></span>
          {:else}
            <span class="estado">{on ? 'Sí' : 'No'}</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
  {#if errorReglas}<p class="error" role="alert">{errorReglas}</p>{/if}
{/snippet}

{#if verCasero}
  <Casero {cat} onCerrar={() => (verCasero = false)} />
{/if}

<style>
  .velo { position: fixed; inset: 0; background: rgba(10, 5, 22, 0.35); z-index: 5; }
  .ajustes {
    position: fixed;
    z-index: 6;
    right: 0;
    top: 0;
    bottom: 0;
    width: min(100%, 380px);
    border-radius: var(--radio-panel) 0 0 var(--radio-panel);
    padding: 1rem 1.1rem calc(1.2rem + var(--seguro-abajo));
    overflow-y: auto;
    background: rgba(24, 17, 42, 0.95);
    animation: entrar 0.25s ease-out;
  }
  @keyframes entrar { from { transform: translateX(30px); opacity: 0; } }
  header { display: flex; justify-content: space-between; align-items: center; }
  h2 { margin: 0; font-size: 1.4rem; }
  h3 { margin: 1.2rem 0 0.5rem; font-size: 0.92rem; color: var(--pergamino-suave); }
  .cerrar { border: 0; background: none; font-size: 1.1rem; padding: 0.3rem 0.5rem; }
  .opciones { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .opcion { border: 1px solid var(--linea); background: none; border-radius: 999px; padding: 0.4rem 0.8rem; font-weight: 700; font-size: 0.88rem; }
  .opcion.activo { background: var(--pergamino); color: var(--tinta); text-shadow: none; }
  .personalizar {
    position: relative; overflow: hidden; width: 100%; margin-top: 0.6rem;
    display: flex; align-items: center; gap: 0.6rem; text-align: left;
    border: 1px solid rgba(240, 189, 85, 0.5); border-radius: 14px; padding: 0.65rem 0.85rem;
    background: linear-gradient(120deg, rgba(217, 100, 106, 0.35), rgba(122, 58, 106, 0.35), rgba(255, 176, 106, 0.3));
    background-size: 200% 200%; animation: atardecer 8s ease-in-out infinite alternate;
  }
  @keyframes atardecer { from { background-position: 0% 50%; } to { background-position: 100% 50%; } }
  .personalizar .txt { flex: 1; display: grid; }
  .personalizar small { color: var(--pergamino-suave); font-size: 0.78rem; }
  .brillo-anim {
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(100deg, transparent 30%, rgba(255, 245, 230, 0.18) 50%, transparent 70%);
    transform: translateX(-100%); animation: barrido 4.5s ease-in-out infinite;
  }
  @keyframes barrido { 60%, 100% { transform: translateX(100%); } }
  .codigo {
    display: grid;
    width: 100%;
    border: 1px dashed var(--esperanza);
    background: rgba(240, 189, 85, 0.1);
    border-radius: 14px;
    padding: 0.6rem;
    font-size: 2rem;
    letter-spacing: 0.25em;
    color: var(--esperanza);
    text-shadow: none;
  }
  .codigo small { font-family: var(--fuente); font-size: 0.75rem; letter-spacing: 0; color: var(--pergamino-suave); font-weight: 500; }
  .pjs { list-style: none; margin: 0 0 0.6rem; padding: 0; display: grid; gap: 0.3rem; }
  .pjs li { display: flex; align-items: center; gap: 0.4rem; font-weight: 700; }
  .pj-fila { flex: 1; min-width: 0; display: flex; align-items: center; gap: 0.5rem; border: 0; background: none; padding: 0.35rem 0.2rem; text-align: left; font-weight: 700; border-radius: 8px; }
  .pj-fila:hover { background: rgba(255, 245, 230, 0.08); }
  .pj-fila small { margin-left: auto; }
  .asignar { width: 7.5rem; padding: 0.3rem 0.4rem; font-size: 0.8rem; }
  .quitar { border: 0; background: none; color: var(--pergamino-suave); font-size: 0.8rem; padding: 0.2rem 0.3rem; }
  .pjs small { margin-left: auto; color: var(--pergamino-suave); font-weight: 500; }
  .punto { width: 0.7rem; height: 0.7rem; border-radius: 50%; }
  form { display: grid; gap: 0.5rem; }
  .colores { display: flex; gap: 0.45rem; }
  .colores button { width: 1.7rem; height: 1.7rem; border-radius: 50%; border: 2px solid transparent; }
  .colores button.activo { border-color: var(--pergamino); box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.4); }
  .ayuda { color: var(--pergamino-suave); font-size: 0.85rem; margin: 0.3rem 0; }
  .ayuda a { color: var(--esperanza); }
  .error { color: #ffb3bd; font-size: 0.88rem; }
  .reglas { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
  .regla {
    width: 100%; display: flex; align-items: center; gap: 0.7rem; text-align: left;
    border: 1px solid var(--linea); border-radius: 14px; padding: 0.55rem 0.7rem;
    background: rgba(255, 245, 230, 0.04); transition: background 0.2s, border-color 0.2s;
  }
  .regla:not(:disabled):hover { background: rgba(255, 245, 230, 0.09); }
  .regla.on { border-color: rgba(240, 189, 85, 0.55); background: rgba(240, 189, 85, 0.1); }
  .regla:disabled { opacity: 1; cursor: default; }
  .regla-txt { flex: 1; min-width: 0; display: grid; gap: 0.1rem; }
  .regla-txt b { font-size: 0.92rem; }
  .regla-txt small { color: var(--pergamino-suave); font-size: 0.78rem; font-weight: 500; line-height: 1.3; }
  .interruptor {
    flex: none; width: 2.5rem; height: 1.45rem; border-radius: 999px; position: relative;
    background: rgba(255, 245, 230, 0.16); border: 1px solid var(--linea); transition: background 0.2s;
  }
  .interruptor span {
    position: absolute; top: 50%; left: 0.15rem; width: 1.05rem; height: 1.05rem; border-radius: 50%;
    background: var(--pergamino); transform: translateY(-50%); transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  }
  .regla.on .interruptor { background: var(--esperanza); border-color: transparent; }
  .regla.on .interruptor span { left: calc(100% - 1.2rem); background: #2a1606; }
  .estado { flex: none; font-size: 0.8rem; font-weight: 800; padding: 0.15rem 0.55rem; border-radius: 999px; border: 1px solid var(--linea); color: var(--pergamino-suave); }
  .regla.on .estado { color: var(--esperanza); border-color: rgba(240, 189, 85, 0.55); }
  .pie { display: grid; gap: 0.5rem; margin-top: 1.4rem; }
</style>

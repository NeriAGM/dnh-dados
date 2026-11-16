<script>
  import { app } from '../lib/mesa.svelte.js'
  import {
    fondos, subir, borrar, asignar, cambiarModo, cambiar, restablecerBarras, restablecerTablero, urlDe,
  } from '../lib/fondos.svelte.js'
  import { MOMENTOS, MODOS, BARRAS, MAX_IMAGENES, TIPOS, pueblo, esPueblo, momentoDePueblo } from '../lib/fondo/ajustes.js'
  import { crearPaisaje, momentoActual, PALETAS } from '../lib/fondo/paisaje.js'
  import { LETRAS, aplicarLetra, letraGuardada } from '../lib/letra.js'
  import Icono from './Icono.svelte'

  let { momento = 'auto', onVolver, onCerrar } = $props()

  const momentoReal = $derived(momento === 'auto' ? momentoActual() : momento)
  const quieto = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const c = $derived(fondos.config)

  // Letra de toda la app (se guarda en este navegador)
  let letra = $state(letraGuardada())
  const FAMILIAS = { zen: "'Zen Maru Gothic'", mplus: "'M PLUS Rounded 1c'", sistema: 'system-ui' }
  const elegirLetra = (id) => { letra = aplicarLetra(id) }

  // Lo que tocaste en la galería: se ve de fondo (vista previa) y es lo que
  // se pone en el tablero al tocar un momento.
  let seleccion = $state(null)
  let asomado = $state(false)
  let confirmar = $state(null)
  let sobre = $state(null)       // casilla del tablero bajo lo que arrastras
  let destello = $state(null)    // casilla que acaba de recibir un fondo
  let soltandoArchivo = $state(false)
  let entrada

  const nombreMomento = (id) => MOMENTOS.find((m) => m.id === id)?.nombre ?? id
  function nombreDe(id) {
    if (!id) return ''
    if (esPueblo(id)) return `Pueblo · ${nombreMomento(momentoDePueblo(id))}`
    return fondos.imagenes.find((i) => i.id === id)?.nombre ?? 'Imagen'
  }

  function elegir(id) {
    seleccion = id
    fondos.vista = id
  }

  // Solo se aceptan fondos que existen: al soltar cualquier texto arrastrado
  // (un enlace, una palabra) se guardaba tal cual en el tablero
  const existe = (id) => MOMENTOS.some((x) => pueblo(x.id) === id) || fondos.imagenes.some((i) => i.id === id)

  function ponerEn(m, id = seleccion) {
    if (!id || !existe(id)) return
    asignar(m, id)
    destello = m
    setTimeout(() => { if (destello === m) destello = null }, 800)
  }

  async function subirVarias(lista) {
    for (const archivo of lista || []) {
      const nueva = await subir(archivo)
      if (nueva) elegir(nueva.id)
      if (fondos.error) break
    }
  }

  // Al salir del panel, el fondo regresa a lo que diga el tablero
  $effect(() => () => { fondos.vista = null })

  // Miniatura del pueblo pintada por el mismo motor del fondo.
  // Solo se anima la que está elegida (las demás quedan quietas).
  function mini(canvas, { m, activo }) {
    const p = crearPaisaje(canvas, { momento: m, reducido: quieto })
    p.pausar(!activo)
    return { update: (n) => p.pausar(!n.activo), destroy: () => p.destruir() }
  }

  const cielo = (m) => `linear-gradient(180deg, ${PALETAS[m].cielo.join(', ')})`
  const modoSel = $derived(seleccion && !esPueblo(seleccion) ? (c.modos[seleccion] ?? 'cubrir') : null)
  const leg = $derived(fondos.legibilidad)
  const valor = (k) => {
    const b = BARRAS[k]
    return `${k === 'tono' && c[k] > 0 ? '+' : ''}${c[k]}${b.unidad}`
  }
</script>

<section class="fondos vidrio" class:asomado aria-label="Personalizar">
  <header>
    <button class="boton fantasma" onclick={onVolver} aria-label="Volver a ajustes"><Icono nombre="izquierda" tam={18} />Ajustes</button>
    <h2>Personalizar</h2>
    <div class="acciones">
      <button class="icono" onclick={() => (asomado = true)} title="Ver el fondo sin el panel" aria-label="Asomarse al fondo"><Icono nombre="ojo" /></button>
      <button class="icono" onclick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" /></button>
    </div>
  </header>

  <div class="cuerpo">
    <!-- ---------------- Letra ---------------- -->
    <h3>Letra</h3>
    <p class="ayuda">Cambia la letra de toda la app. Se guarda en este navegador.</p>
    <div class="letras" role="radiogroup" aria-label="Letra de la app">
      {#each LETRAS as l (l.id)}
        <button class="letra" role="radio" aria-checked={letra === l.id} style:font-family="{FAMILIAS[l.id]}, sans-serif"
          onclick={() => elegirLetra(l.id)}>
          <span class="marca" aria-hidden="true">{#if letra === l.id}<Icono nombre="listo" tam={16} />{/if}</span>
          <span class="letra-txt"><b>{l.nombre}</b><small>{l.ayuda}</small></span>
        </button>
      {/each}
    </div>

    <!-- ---------------- Pueblo animado ---------------- -->
    <h3>Pueblo animado</h3>
    <div class="pueblos">
      {#each MOMENTOS as m (m.id)}
        {@const id = pueblo(m.id)}
        <button class="tarjeta" class:activo={seleccion === id} draggable="true"
          onclick={() => elegir(id)}
          ondragstart={(e) => { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'copy' }}
          aria-pressed={seleccion === id} aria-label="Pueblo al {m.nombre.toLowerCase()}">
          <span class="marco">
            <canvas use:mini={{ m: m.id, activo: seleccion === id }} aria-hidden="true"></canvas>
            <span class="etiqueta"><Icono nombre={m.icono} tam={16} />{m.nombre}</span>
          </span>
        </button>
      {/each}
    </div>

    <!-- ---------------- Tus imágenes ---------------- -->
    <h3>Tus imágenes <small class="num">{fondos.imagenes.length}/{MAX_IMAGENES}</small></h3>
    <div class="galeria" class:soltando={soltandoArchivo} role="list"
      ondragover={(e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); soltandoArchivo = true } }}
      ondragleave={() => (soltandoArchivo = false)}
      ondrop={(e) => { if (e.dataTransfer?.files?.length) { e.preventDefault(); soltandoArchivo = false; subirVarias(e.dataTransfer.files) } }}>
      {#if fondos.imagenes.length < MAX_IMAGENES}
        <button class="subir" onclick={() => entrada.click()} disabled={fondos.subiendo}>
          {#if fondos.subiendo}<span class="girando"><Icono nombre="reiniciar" tam={22} /></span><small>Subiendo…</small>
          {:else}<Icono nombre="subir" tam={22} /><small>Subir imagen</small>{/if}
        </button>
      {/if}
      {#each fondos.imagenes as img (img.id)}
        <div class="foto" role="listitem">
          <button class="tarjeta" class:activo={seleccion === img.id} draggable="true"
            onclick={() => elegir(img.id)}
            ondragstart={(e) => { e.dataTransfer.setData('text/plain', img.id); e.dataTransfer.effectAllowed = 'copy' }}
            aria-pressed={seleccion === img.id} aria-label="Imagen {img.nombre}">
            <span class="marco"><img src={img.url} alt="" loading="lazy" draggable="false" /></span>
          </button>
          <button class="borrar" class:seguro={confirmar === img.id} title="Borrar imagen"
            aria-label={confirmar === img.id ? `Confirmar: borrar ${img.nombre}` : `Borrar ${img.nombre}`}
            onclick={async () => { if (confirmar === img.id) { confirmar = null; await borrar(img.id) } else { confirmar = img.id; setTimeout(() => { if (confirmar === img.id) confirmar = null }, 3000) } }}>
            {#if confirmar === img.id}¿Borrar?{:else}<Icono nombre="cerrar" tam={14} />{/if}
          </button>
        </div>
      {/each}
    </div>
    <input type="file" accept={TIPOS.join(',')} multiple hidden bind:this={entrada}
      onchange={(e) => { const lista = [...(e.currentTarget.files || [])]; e.currentTarget.value = ''; subirVarias(lista) }} />
    <p class="nota"><Icono nombre="alerta" tam={16} />No subas fotos personales: cualquiera con el enlace podría verlas.</p>
    <p class="ayuda">JPG, PNG, WEBP o GIF de hasta 5 MB.{app.demo || !app.sesion ? ' En modo prueba se guardan solo en este navegador.' : ''}</p>
    {#if fondos.error}<p class="aviso-error" role="alert">{fondos.error}</p>{/if}

    <!-- ---------------- Tablero por momento ---------------- -->
    <h3>Tablero del día</h3>
    <p class="ayuda">
      {seleccion ? `Toca un momento para poner ahí «${nombreDe(seleccion)}», o arrastra un fondo hasta él.` : 'Elige un fondo arriba y luego toca un momento (o arrástralo).'}
      {momento === 'auto' ? ' Sigue la hora del reloj.' : ` Ahora está fijo en ${nombreMomento(momento).toLowerCase()}.`}
    </p>
    <div class="tablero">
      {#each MOMENTOS as m (m.id)}
        {@const id = c.tablero[m.id]}
        {@const mp = momentoDePueblo(id)}
        <button class="casilla" class:sobre={sobre === m.id} class:destello={destello === m.id} class:ahora={momentoReal === m.id}
          style:background-image={mp ? cielo(mp) : `url("${urlDe(id) ?? ''}")`}
          onclick={() => ponerEn(m.id)}
          ondragover={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; sobre = m.id }}
          ondragleave={() => { if (sobre === m.id) sobre = null }}
          ondrop={(e) => { e.preventDefault(); sobre = null; const d = e.dataTransfer.getData('text/plain'); if (d) ponerEn(m.id, d) }}
          aria-label="{m.nombre}: {nombreDe(id)}. Toca para poner aquí la selección">
          <span class="astro"><Icono nombre={m.icono} tam={20} /></span>
          {#if momentoReal === m.id}<span class="insignia">ahora</span>{/if}
          <span class="pie-casilla"><b>{m.nombre}</b><small>{nombreDe(id)}</small></span>
        </button>
      {/each}
    </div>
    <div class="fila">
      <button class="boton chico" onclick={() => { for (const m of MOMENTOS) ponerEn(m.id) }} disabled={!seleccion}>Usar en los cuatro</button>
      <button class="boton chico" onclick={restablecerTablero}>Volver al pueblo</button>
    </div>

    <!-- ---------------- Modo de ajuste ---------------- -->
    <h3>Modo de ajuste</h3>
    {#if modoSel}
      <div class="modos" role="radiogroup" aria-label="Modo de ajuste de la imagen">
        {#each MODOS as m (m.id)}
          <button class="modo" class:activo={modoSel === m.id} role="radio" aria-checked={modoSel === m.id} title={m.ayuda}
            onclick={() => cambiarModo(seleccion, m.id)}>
            <span class="dibujo {m.id}" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            {m.nombre}
          </button>
        {/each}
      </div>
      <p class="ayuda">{MODOS.find((m) => m.id === modoSel)?.ayuda}.</p>
    {:else}
      <p class="ayuda">Elige una de tus imágenes para decidir cómo se acomoda (cubrir, ajustar, estirar, centrar o mosaico). El pueblo siempre llena la pantalla.</p>
    {/if}

    <!-- ---------------- Barras ---------------- -->
    <h3>Barras</h3>
    <div class="barras">
      {#each Object.entries(BARRAS) as [k, b] (k)}
        <label class="barra b-{k}">
          <span>{b.nombre}</span>
          <input type="range" min={b.min} max={b.max} step={b.paso} value={c[k]}
            oninput={(e) => cambiar({ [k]: Number(e.currentTarget.value) })} />
          <output class="num">{valor(k)}</output>
        </label>
      {/each}
    </div>
    <div class="fila">
      <button class="boton chico" onclick={restablecerBarras}>Restablecer</button>
    </div>

    {#if leg}
      <div class="legible" data-nivel={leg.nivel}>
        <span class="medidor"><i style:width="{Math.round(leg.brillo * 100)}%"></i></span>
        <p>
          Brillo del fondo: <b class="num">{Math.round(leg.brillo * 100)} %</b>.
          {leg.nivel === 'oscuro' ? 'Reforcé el vidrio para que todo se lea.' : 'Todo se lee bien así.'}
        </p>
      </div>
    {/if}
  </div>
</section>

{#if asomado}
  <!-- Mientras te asomas, tocar en cualquier lado regresa al panel -->
  <button class="regresar" onclick={() => (asomado = false)} aria-label="Volver al panel de personalizar">
    <span class="pastilla vidrio">Toca para volver al panel</span>
  </button>
{/if}

<style>
  .fondos {
    position: fixed;
    z-index: 6;
    right: 12px; top: 12px; bottom: 12px;
    width: min(430px, calc(100vw - 24px));
    display: flex;
    flex-direction: column;
    border-radius: var(--radio-panel);
    background: var(--superficie-firme);
    box-shadow: var(--sombra-alta);
    overflow: hidden;
    animation: entrar 0.28s var(--suave);
    transition: transform 0.35s ease, opacity 0.35s ease;
  }
  .fondos.asomado { transform: translateX(105%); opacity: 0; pointer-events: none; }
  @keyframes entrar { from { transform: translateX(24px); opacity: 0; } }
  header {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.8rem 0.75rem 0.5rem 0.7rem;
    border-bottom: 1px solid var(--filete);
  }
  h2 { margin: 0; font-size: 1.5rem; flex: 1; text-align: center; }
  .acciones { display: flex; }
  .cuerpo { overflow-y: auto; padding: 0.2rem 1.1rem calc(1.4rem + var(--seguro-abajo)); overscroll-behavior: contain; }
  h3 { margin: 1.4rem 0 0.5rem; font-size: 1.1rem; display: flex; align-items: baseline; gap: 0.4rem; }
  h3 small { margin-left: auto; font-weight: 700; font-size: 0.85rem; color: var(--texto-suave); }
  .ayuda { color: var(--texto-suave); font-size: 0.85rem; margin: 0.3rem 0; }
  .nota { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; font-weight: 700; margin: 0.6rem 0 0.2rem; color: var(--critico-hondo); }
  .fila { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.6rem; }
  .chico { padding: 0.4rem 0.8rem; font-size: 0.9rem; }

  /* Letra: cada opción escrita en su propia letra */
  .letras { display: grid; gap: 0.4rem; margin-top: 0.5rem; }
  .letra {
    display: flex; align-items: center; gap: 0.7rem; width: 100%; min-height: 3.4rem; padding: 0.6rem 0.8rem; text-align: left;
    border: 1px solid var(--filete); border-radius: var(--radio-control); background: var(--hundido); color: var(--texto);
    transition: background 0.15s, border-color 0.15s;
  }
  .letra:hover { background: var(--hundido-2); }
  .letra[aria-checked='true'] { border-color: var(--texto); box-shadow: inset 0 0 0 1px var(--texto); background: rgb(255 255 255 / 0.55); }
  .marca { flex: none; display: grid; place-items: center; width: 1.4rem; height: 1.4rem; border-radius: 50%; border: 2px solid var(--filete-fuerte); }
  .letra[aria-checked='true'] .marca { background: var(--texto); border-color: var(--texto); color: var(--sobre-color); }
  .letra-txt { display: grid; min-width: 0; }
  .letra-txt b { font-size: 1.1rem; font-weight: 700; }
  .letra-txt small { font-size: 0.85rem; font-weight: 500; color: var(--texto-suave); }

  /* Tarjetas (pueblo e imágenes) */
  .pueblos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
  .tarjeta {
    position: relative; display: block; width: 100%; padding: 3px; border: 0;
    border-radius: 14px; background: var(--hundido-2); overflow: hidden;
    transition: transform 0.15s;
  }
  .tarjeta:hover { transform: translateY(-2px); }
  .tarjeta.activo { background: var(--texto); box-shadow: 0 0 0 2px var(--brillo); }
  .marco { position: relative; display: block; border-radius: 11px; overflow: hidden; aspect-ratio: 16 / 10; background: #2b2c5c; }
  .marco canvas, .marco img { width: 100%; height: 100%; display: block; object-fit: cover; }
  .etiqueta {
    position: absolute; left: 0; right: 0; bottom: 0; padding: 0.9rem 0.6rem 0.35rem;
    display: flex; align-items: center; gap: 0.35rem;
    font-size: 0.85rem; font-weight: 700; text-align: left; color: #fff;
    background: linear-gradient(transparent, rgb(12 14 36 / 0.7));
    text-shadow: 0 1px 3px rgb(12 14 36 / 0.8);
  }

  .galeria { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; border-radius: 14px; transition: background 0.2s; }
  .galeria.soltando { background: var(--esperanza-suave); outline: 2px dashed var(--esperanza-hondo); }
  .foto { position: relative; }
  .borrar {
    position: absolute; top: 6px; right: 6px; z-index: 2; border: 0; display: grid; place-items: center;
    background: rgb(12 14 36 / 0.7); color: #fff; border-radius: 999px; font-size: 0.75rem; font-weight: 700;
    min-width: 1.7rem; height: 1.7rem; padding: 0 0.4rem;
  }
  .borrar.seguro { background: var(--peligro); }
  .subir {
    display: grid; place-items: center; align-content: center; gap: 0.2rem; aspect-ratio: 16 / 10;
    width: 100%; height: 100%; min-height: 100%;
    border: 1.5px dashed var(--filete-fuerte); border-radius: 14px; background: var(--hundido);
    color: var(--texto); font-weight: 700; transition: background 0.15s;
  }
  .subir:hover { background: var(--hundido-2); }
  .subir small { font-size: 0.8rem; }
  .girando { display: inline-grid; animation: girar 1s linear infinite; }
  @keyframes girar { to { transform: rotate(360deg); } }

  /* Tablero */
  .tablero { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
  .casilla {
    position: relative; aspect-ratio: 16 / 9; border-radius: 14px; overflow: hidden;
    border: 1.5px solid var(--filete); padding: 0; text-align: left; color: #fff;
    background-size: cover, cover; background-position: center;
    transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
  }
  .casilla.ahora { border-color: var(--texto); box-shadow: 0 0 0 2px var(--brillo), 0 0 0 4px var(--texto); }
  .casilla.sobre { transform: scale(1.04); border-color: var(--exito); border-style: dashed; }
  .casilla.destello { animation: destello 0.7s ease-out; }
  @keyframes destello { 30% { transform: scale(1.07); box-shadow: 0 0 0 3px var(--exito); } }
  .astro { position: absolute; top: 0.4rem; left: 0.5rem; display: grid; filter: drop-shadow(0 1px 3px rgb(12 14 36 / 0.7)); }
  .insignia {
    position: absolute; top: 0.4rem; right: 0.45rem; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em;
    background: var(--texto); color: var(--sobre-color); border-radius: 999px; padding: 0.1rem 0.5rem;
  }
  .pie-casilla {
    position: absolute; left: 0; right: 0; bottom: 0; display: grid; padding: 1rem 0.6rem 0.4rem;
    background: linear-gradient(transparent, rgb(12 14 36 / 0.78));
    text-shadow: 0 1px 3px rgb(12 14 36 / 0.8);
  }
  .pie-casilla b { font-size: 0.9rem; }
  .pie-casilla small { font-size: 0.75rem; color: rgb(255 255 255 / 0.92); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Modos */
  .modos { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.35rem; }
  .modo {
    display: grid; justify-items: center; gap: 0.25rem; padding: 0.5rem 0.1rem; font-size: 0.75rem; font-weight: 700;
    border: 1px solid var(--filete); border-radius: 12px; background: var(--hundido);
  }
  .modo:hover { background: var(--hundido-2); }
  .modo.activo { background: var(--texto); border-color: var(--texto); color: var(--sobre-color); }
  .dibujo { position: relative; width: 2rem; height: 1.3rem; border: 1.5px solid currentColor; border-radius: 3px; overflow: hidden; }
  .dibujo i { position: absolute; background: currentColor; opacity: 0.75; }
  .dibujo.cubrir i:first-child { inset: -3px -6px; border-radius: 2px; }
  .dibujo.ajustar i:first-child { top: 0; bottom: 0; left: 25%; right: 25%; }
  .dibujo.estirar i:first-child { inset: 0; transform: scaleY(1); }
  .dibujo.centrar i:first-child { width: 40%; height: 50%; left: 30%; top: 25%; }
  .dibujo.mosaico i { width: 50%; height: 50%; }
  .dibujo.mosaico i:nth-child(2) { left: 50%; opacity: 0.45; }
  .dibujo.mosaico i:nth-child(3) { top: 50%; opacity: 0.45; }
  .dibujo.mosaico i:nth-child(4) { left: 50%; top: 50%; }
  .dibujo:not(.mosaico) i:not(:first-child) { display: none; }

  /* Barras */
  .barras { display: grid; gap: 0.3rem; }
  .barra { display: grid; grid-template-columns: 5.6rem 1fr 3.3rem; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 700; min-height: 2.5rem; }
  .barra output { text-align: right; color: var(--texto-suave); font-size: 0.85rem; }
  .barra input {
    -webkit-appearance: none; appearance: none; width: 100%; height: 8px; border-radius: 999px; margin: 0.5rem 0;
    background: var(--pista, var(--hundido-2));
  }
  .barra.b-tono { --pista: linear-gradient(90deg, #ff6b6b, #ffd93d, #6bff95, #6bd4ff, #a66bff, #ff6bd6, #ff6b6b); }
  .barra.b-vidrio { --pista: linear-gradient(90deg, rgb(255 255 255 / 0.3), rgb(247 249 253 / 0.95)); box-shadow: inset 0 0 0 1px var(--filete); }
  .barra.b-contraste { --pista: linear-gradient(90deg, #9aa0b8, #e7e9f2 50%, #000 50.5%, #fff); }
  .barra.b-oscurecer { --pista: linear-gradient(90deg, #f3f4fa, #10122a); }
  .barra.b-desenfoque { --pista: linear-gradient(90deg, #2f9fd8, rgb(47 159 216 / 0.15)); }
  .barra input::-webkit-slider-thumb {
    -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%;
    background: #fff; border: 3px solid var(--texto); box-shadow: 0 2px 6px rgb(18 20 50 / 0.4);
  }
  .barra input::-moz-range-thumb {
    width: 16px; height: 16px; border-radius: 50%;
    background: #fff; border: 3px solid var(--texto);
  }

  .legible { margin-top: 1rem; padding: 0.7rem 0.8rem; border-radius: 12px; border: 1px solid var(--filete); background: var(--hundido); }
  .legible p { margin: 0.5rem 0 0; font-size: 0.85rem; color: var(--texto-suave); }
  .medidor { display: block; height: 6px; border-radius: 999px; background: linear-gradient(90deg, #10122a, #f3f4fa); box-shadow: 0 0 0 1px var(--filete); position: relative; overflow: visible; }
  .medidor i { position: absolute; top: -3px; bottom: -3px; left: 0; box-shadow: inset -3px 0 0 var(--esperanza-hondo); transition: width 0.5s; }

  .regresar { position: fixed; inset: 0; z-index: 7; border: 0; background: none; padding: 0; display: grid; place-items: center; }
  .pastilla {
    padding: 0.6rem 1.1rem; border-radius: 999px; font-weight: 700; white-space: nowrap;
    animation: aparecer 0.3s ease-out;
  }
  @keyframes aparecer { from { transform: translateY(10px); opacity: 0; } }

  /* Celular: hoja desde abajo para que se vea el fondo arriba */
  @media (max-width: 640px) {
    .fondos {
      top: auto; left: 0; right: 0; bottom: 0; width: 100%; max-height: 72dvh;
      border-radius: var(--radio-panel) var(--radio-panel) 0 0;
      animation-name: entrar-abajo;
    }
    .fondos.asomado { transform: translateY(105%); }
    @keyframes entrar-abajo { from { transform: translateY(40px); opacity: 0; } }
    .barra { grid-template-columns: 5rem 1fr 3rem; }
  }
</style>

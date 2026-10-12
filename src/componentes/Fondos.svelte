<script>
  import { app } from '../lib/mesa.svelte.js'
  import {
    fondos, subir, borrar, asignar, cambiarModo, cambiar, restablecerBarras, restablecerTablero, urlDe,
  } from '../lib/fondos.svelte.js'
  import { MOMENTOS, MODOS, BARRAS, MAX_IMAGENES, TIPOS, pueblo, esPueblo, momentoDePueblo } from '../lib/fondo/ajustes.js'
  import { crearPaisaje, momentoActual, PALETAS } from '../lib/fondo/paisaje.js'

  let { momento = 'auto', onVolver, onCerrar } = $props()

  const momentoReal = $derived(momento === 'auto' ? momentoActual() : momento)
  const quieto = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const c = $derived(fondos.config)

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

<section class="fondos" class:asomado aria-label="Personalizar fondo">
  <header>
    <button class="icono-txt" onclick={onVolver} aria-label="Volver a ajustes">‹ Ajustes</button>
    <h2 class="titulo">Fondo</h2>
    <div class="acciones">
      <button class="icono-txt" onclick={() => (asomado = true)} title="Ver el fondo sin el panel" aria-label="Asomarse al fondo">👁</button>
      <button class="icono-txt" onclick={onCerrar} aria-label="Cerrar">✕</button>
    </div>
  </header>

  <div class="cuerpo">
    <!-- ---------------- Pueblo animado ---------------- -->
    <h3><span class="chispa">✦</span> Pueblo animado</h3>
    <div class="pueblos">
      {#each MOMENTOS as m (m.id)}
        {@const id = pueblo(m.id)}
        <button class="tarjeta" class:activo={seleccion === id} draggable="true"
          onclick={() => elegir(id)}
          ondragstart={(e) => { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'copy' }}
          aria-pressed={seleccion === id} aria-label="Pueblo al {m.nombre.toLowerCase()}">
          <span class="marco">
            <canvas use:mini={{ m: m.id, activo: seleccion === id }} aria-hidden="true"></canvas>
            <span class="etiqueta">{m.icono} {m.nombre}</span>
          </span>
        </button>
      {/each}
    </div>

    <!-- ---------------- Tus imágenes ---------------- -->
    <h3>Tus imágenes <small>{fondos.imagenes.length}/{MAX_IMAGENES}</small></h3>
    <div class="galeria" class:soltando={soltandoArchivo} role="list"
      ondragover={(e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); soltandoArchivo = true } }}
      ondragleave={() => (soltandoArchivo = false)}
      ondrop={(e) => { if (e.dataTransfer?.files?.length) { e.preventDefault(); soltandoArchivo = false; subirVarias(e.dataTransfer.files) } }}>
      {#if fondos.imagenes.length < MAX_IMAGENES}
        <button class="subir" onclick={() => entrada.click()} disabled={fondos.subiendo}>
          {#if fondos.subiendo}<span class="girando">◌</span><small>Subiendo…</small>
          {:else}<span class="mas">＋</span><small>Subir imagen</small>{/if}
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
            {confirmar === img.id ? '¿Borrar?' : '✕'}
          </button>
        </div>
      {/each}
    </div>
    <input type="file" accept={TIPOS.join(',')} multiple hidden bind:this={entrada}
      onchange={(e) => { const lista = [...(e.currentTarget.files || [])]; e.currentTarget.value = ''; subirVarias(lista) }} />
    <p class="nota">⚠ No subas fotos personales: cualquiera con el enlace podría verlas.</p>
    <p class="ayuda">JPG, PNG, WEBP o GIF de hasta 5 MB.{app.demo || !app.sesion ? ' En modo prueba se guardan solo en este navegador.' : ''}</p>
    {#if fondos.error}<p class="error" role="alert">{fondos.error}</p>{/if}

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
          <span class="astro">{m.icono}</span>
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
          <output>{valor(k)}</output>
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
          Brillo del fondo: <b>{Math.round(leg.brillo * 100)} %</b>.
          {leg.nivel === 'oscuro' ? 'Todo se lee bien así.' : leg.nivel === 'medio' ? 'Reforcé un poco el vidrio y las sombras del texto.' : 'Es muy claro: oscurecí el fondo y reforcé el vidrio para que todo se lea.'}
        </p>
      </div>
    {/if}
  </div>
</section>

{#if asomado}
  <!-- Mientras te asomas, tocar en cualquier lado regresa al panel -->
  <button class="regresar" onclick={() => (asomado = false)} aria-label="Volver al panel del fondo">
    <span class="pastilla">Toca para volver al panel</span>
  </button>
{/if}

<style>
  .fondos {
    position: fixed;
    z-index: 6;
    right: 0;
    top: 0;
    bottom: 0;
    width: min(100%, 430px);
    display: flex;
    flex-direction: column;
    border-radius: var(--radio-panel) 0 0 var(--radio-panel);
    border: 1px solid var(--linea);
    background: rgb(24, 17, 42);
    box-shadow: var(--sombra);
    animation: entrar 0.28s ease-out;
    transition: transform 0.35s ease, opacity 0.35s ease;
  }
  .fondos.asomado { transform: translateX(105%); opacity: 0; pointer-events: none; }
  @keyframes entrar { from { transform: translateX(30px); opacity: 0; } }
  header {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.8rem 0.9rem 0.5rem;
    border-bottom: 1px solid var(--linea);
  }
  h2 { margin: 0; font-size: 1.35rem; flex: 1; text-align: center; }
  .acciones { display: flex; }
  .icono-txt { border: 0; background: none; padding: 0.35rem 0.5rem; font-weight: 700; border-radius: 10px; }
  .icono-txt:hover { background: rgba(255, 245, 230, 0.1); }
  .cuerpo { overflow-y: auto; padding: 0.2rem 1rem calc(1.2rem + var(--seguro-abajo)); }
  h3 { margin: 1.1rem 0 0.5rem; font-size: 0.92rem; color: var(--pergamino-suave); display: flex; align-items: baseline; gap: 0.4rem; }
  h3 small { margin-left: auto; font-weight: 500; }
  .chispa { color: var(--esperanza); display: inline-block; animation: brillar 2.6s ease-in-out infinite; }
  @keyframes brillar { 50% { transform: rotate(180deg) scale(1.3); opacity: 0.6; } }
  .ayuda { color: var(--pergamino-suave); font-size: 0.84rem; margin: 0.3rem 0; }
  .nota { font-size: 0.82rem; margin: 0.5rem 0 0.2rem; color: #ffd9a0; }
  .error { color: #ffb3bd; font-size: 0.86rem; margin: 0.3rem 0; }
  .fila { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.5rem; }
  .chico { padding: 0.4rem 0.75rem; font-size: 0.84rem; }

  /* Tarjetas (pueblo e imágenes) con aro animado cuando están elegidas */
  .pueblos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
  .tarjeta {
    position: relative; display: block; width: 100%; padding: 3px; border: 0;
    border-radius: 14px; background: rgba(255, 245, 230, 0.08); overflow: hidden;
    transition: transform 0.15s;
  }
  .tarjeta:hover { transform: translateY(-2px); }
  .tarjeta.activo::before {
    content: ''; position: absolute; inset: -60%;
    background: conic-gradient(var(--esperanza), var(--sangre), var(--miedo), #6fb0e8, var(--exito), var(--esperanza));
    animation: girar 3.5s linear infinite;
  }
  @keyframes girar { to { transform: rotate(360deg); } }
  .marco { position: relative; display: block; border-radius: 11px; overflow: hidden; aspect-ratio: 16 / 10; background: #1b1430; }
  .marco canvas, .marco img { width: 100%; height: 100%; display: block; object-fit: cover; }
  .etiqueta {
    position: absolute; left: 0; right: 0; bottom: 0; padding: 0.9rem 0.5rem 0.3rem;
    font-size: 0.8rem; font-weight: 700; text-align: left;
    background: linear-gradient(transparent, rgba(10, 6, 22, 0.75));
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  }

  .galeria { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; border-radius: 14px; transition: background 0.2s; }
  .galeria.soltando { background: rgba(240, 189, 85, 0.15); outline: 2px dashed var(--esperanza); }
  .foto { position: relative; }
  .borrar {
    position: absolute; top: 6px; right: 6px; z-index: 2; border: 0;
    background: rgba(10, 6, 22, 0.75); border-radius: 999px; font-size: 0.72rem; font-weight: 700;
    min-width: 1.6rem; height: 1.6rem; padding: 0 0.4rem;
  }
  .borrar.seguro { background: var(--sangre); }
  .subir {
    display: grid; place-items: center; align-content: center; gap: 0.1rem; aspect-ratio: 16 / 10;
    width: 100%; height: 100%; min-height: 100%;
    border: 1.5px dashed rgba(240, 189, 85, 0.6); border-radius: 14px; background: rgba(240, 189, 85, 0.08);
    color: var(--esperanza); font-weight: 700;
  }
  .subir small { font-size: 0.72rem; }
  .mas { font-size: 1.4rem; line-height: 1; transition: transform 0.2s; }
  .subir:hover .mas { transform: rotate(90deg) scale(1.15); }
  .girando { display: inline-block; font-size: 1.3rem; animation: girar 1s linear infinite; }

  /* Tablero */
  .tablero { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
  .casilla {
    position: relative; aspect-ratio: 16 / 9; border-radius: 14px; overflow: hidden;
    border: 1.5px solid var(--linea); padding: 0; text-align: left;
    background-size: cover, cover; background-position: center;
    animation: cielo 14s ease-in-out infinite alternate;
    transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
  }
  @keyframes cielo { from { background-position: center 30%; } to { background-position: center 70%; } }
  .casilla.ahora { border-color: var(--esperanza); box-shadow: 0 0 0 1px var(--esperanza), 0 0 18px -4px var(--esperanza); }
  .casilla.sobre { transform: scale(1.04); border-color: var(--exito); border-style: dashed; }
  .casilla.destello { animation: destello 0.7s ease-out; }
  @keyframes destello { 30% { transform: scale(1.07); box-shadow: 0 0 0 3px var(--exito), 0 0 30px var(--exito); } }
  .astro { position: absolute; top: 0.35rem; left: 0.5rem; font-size: 1.1rem; animation: flotar 3.2s ease-in-out infinite; text-shadow: none; }
  @keyframes flotar { 50% { transform: translateY(-4px); } }
  .insignia {
    position: absolute; top: 0.4rem; right: 0.45rem; font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
    background: var(--esperanza); color: var(--tinta); border-radius: 999px; padding: 0.1rem 0.45rem; text-shadow: none;
    animation: latido 1.8s ease-in-out infinite;
  }
  @keyframes latido { 50% { transform: scale(1.1); } }
  .pie-casilla {
    position: absolute; left: 0; right: 0; bottom: 0; display: grid; padding: 1rem 0.55rem 0.35rem;
    background: linear-gradient(transparent, rgba(10, 6, 22, 0.82));
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  }
  .pie-casilla b { font-size: 0.86rem; }
  .pie-casilla small { font-size: 0.7rem; color: rgba(247, 238, 223, 0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Modos */
  .modos { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.35rem; }
  .modo {
    display: grid; justify-items: center; gap: 0.25rem; padding: 0.45rem 0.1rem; font-size: 0.72rem; font-weight: 700;
    border: 1px solid var(--linea); border-radius: 12px; background: rgba(255, 245, 230, 0.06);
  }
  .modo.activo { background: var(--pergamino); color: var(--tinta); text-shadow: none; }
  .dibujo { position: relative; width: 2rem; height: 1.3rem; border: 1.5px solid currentColor; border-radius: 3px; overflow: hidden; }
  .dibujo i { position: absolute; background: var(--esperanza); opacity: 0.85; }
  .dibujo.cubrir i:first-child { inset: -3px -6px; border-radius: 2px; }
  .dibujo.ajustar i:first-child { top: 0; bottom: 0; left: 25%; right: 25%; }
  .dibujo.estirar i:first-child { inset: 0; transform: scaleY(1); }
  .dibujo.centrar i:first-child { width: 40%; height: 50%; left: 30%; top: 25%; }
  .dibujo.mosaico i { width: 50%; height: 50%; }
  .dibujo.mosaico i:nth-child(2) { left: 50%; opacity: 0.55; }
  .dibujo.mosaico i:nth-child(3) { top: 50%; opacity: 0.55; }
  .dibujo.mosaico i:nth-child(4) { left: 50%; top: 50%; }
  .dibujo:not(.mosaico) i:not(:first-child) { display: none; }

  /* Barras */
  .barras { display: grid; gap: 0.55rem; }
  .barra { display: grid; grid-template-columns: 5.6rem 1fr 3.3rem; align-items: center; gap: 0.5rem; font-size: 0.86rem; font-weight: 700; }
  .barra output { text-align: right; font-variant-numeric: tabular-nums; color: var(--pergamino-suave); font-size: 0.8rem; }
  .barra input {
    -webkit-appearance: none; appearance: none; width: 100%; height: 8px; border-radius: 999px; margin: 0.5rem 0;
    background: var(--pista, rgba(255, 245, 230, 0.2));
  }
  .barra.b-tono { --pista: linear-gradient(90deg, #ff6b6b, #ffd93d, #6bff95, #6bd4ff, #a66bff, #ff6bd6, #ff6b6b); }
  .barra.b-vidrio { --pista: linear-gradient(90deg, rgba(255, 245, 230, 0.12), rgba(24, 17, 42, 0.95)); }
  .barra.b-contraste { --pista: linear-gradient(90deg, #7a7186, #f7eedf 50%, #000 50.5%, #fff); }
  .barra.b-oscurecer { --pista: linear-gradient(90deg, #f7eedf, #0a0616); }
  .barra.b-desenfoque { --pista: linear-gradient(90deg, #f0bd55, rgba(240, 189, 85, 0.15)); }
  .barra input::-webkit-slider-thumb {
    -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
    background: var(--pergamino); border: 3px solid var(--tinta); box-shadow: 0 0 0 1px var(--pergamino), 0 2px 6px rgba(0, 0, 0, 0.5);
  }
  .barra input::-moz-range-thumb {
    width: 16px; height: 16px; border-radius: 50%;
    background: var(--pergamino); border: 3px solid var(--tinta);
  }

  .legible { margin-top: 1rem; padding: 0.6rem 0.7rem; border-radius: 12px; border: 1px solid var(--linea); background: rgba(10, 6, 22, 0.35); }
  .legible p { margin: 0.35rem 0 0; font-size: 0.82rem; color: var(--pergamino-suave); }
  .medidor { display: block; height: 6px; border-radius: 999px; background: linear-gradient(90deg, #0a0616, #f7eedf); position: relative; overflow: visible; }
  .medidor i { position: absolute; top: -3px; bottom: -3px; left: 0; border-right: 3px solid var(--esperanza); transition: width 0.5s; }

  .regresar { position: fixed; inset: 0; z-index: 7; border: 0; background: none; padding: 0; display: grid; place-items: center; }
  .pastilla {
    padding: 0.55rem 1rem; border-radius: 999px; font-weight: 700; white-space: nowrap;
    background: rgba(24, 17, 42, 0.8); border: 1px solid var(--linea);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    animation: aparecer 0.3s ease-out, respirar 2.4s ease-in-out 0.3s infinite;
  }
  @keyframes aparecer { from { transform: translateY(10px); opacity: 0; } }
  @keyframes respirar { 50% { transform: scale(1.05); } }

  /* Celular: hoja desde abajo para que se vea el fondo arriba */
  @media (max-width: 640px) {
    .fondos {
      top: auto; left: 0; width: 100%; max-height: 72dvh;
      border-radius: var(--radio-panel) var(--radio-panel) 0 0;
      animation-name: entrar-abajo;
    }
    .fondos.asomado { transform: translateY(105%); }
    @keyframes entrar-abajo { from { transform: translateY(40px); opacity: 0; } }
    .galeria { grid-template-columns: repeat(3, 1fr); }
    .barra { grid-template-columns: 5rem 1fr 3rem; }
  }
</style>

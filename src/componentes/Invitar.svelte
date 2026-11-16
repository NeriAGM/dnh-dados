<script>
  // Ajustes → Invitar jugadores (solo el DJ): link, QR, código y cambiar código.
  import { app, cambiarCodigo, formatoCodigo, linkInvitacion } from '../lib/mesa.svelte.js'
  import { caminoQR } from '../lib/qr.js'
  import Icono from './Icono.svelte'

  const codigo = $derived(formatoCodigo(app.campania.codigo_invitacion))
  const link = $derived(linkInvitacion(codigo))
  const qr = $derived(caminoQR(link))

  let copiado = $state('') // 'link' | 'codigo'
  let confirmar = $state(false)
  let ocupado = $state(false)
  let aviso = $state('')
  let error = $state('')

  async function copiar(que, texto) {
    error = ''
    try { await navigator.clipboard.writeText(texto) } catch {
      // Algunos navegadores (o el de Discord) niegan el portapapeles: el método viejo
      const t = Object.assign(document.createElement('textarea'), { value: texto, readOnly: true })
      t.style.cssText = 'position:fixed;opacity:0'
      document.body.append(t)
      t.select()
      const ok = document.execCommand('copy')
      t.remove()
      if (!ok) { error = 'Tu navegador no dejó copiar. Mantén presionado el código para copiarlo.'; return }
    }
    copiado = que
    setTimeout(() => (copiado = ''), 1800)
  }

  async function cambiar() {
    error = ''; aviso = ''; ocupado = true
    try { await cambiarCodigo(); aviso = 'Listo: código nuevo. Mándales el link otra vez.' }
    catch (e) { error = e.message }
    finally { ocupado = false; confirmar = false }
  }
</script>

<section class="grupo">
  <h3>Invitar jugadores</h3>
  <p class="ayuda">Mándales el link por Discord: al abrirlo entran directo a la campaña.</p>
  <button class="boton solido" onclick={() => copiar('link', link)}>
    <Icono nombre="enlace" tam={18} />{copiado === 'link' ? 'Link copiado' : 'Copiar link de invitación'}
  </button>

  <div class="tarjeta-inv">
    <svg class="qr" viewBox="0 0 {qr.lado} {qr.lado}" role="img" aria-label="QR del link de invitación" shape-rendering="crispEdges">
      <rect width={qr.lado} height={qr.lado} fill="#fff" />
      <path d={qr.d} fill="currentColor" />
    </svg>
    <div class="lado">
      <span class="rotulo">Código</span>
      <span class="codigo num" aria-label="Código de invitación {codigo.split('').join(' ')}">{codigo}</span>
      <button class="boton" onclick={() => copiar('codigo', codigo)}><Icono nombre="copiar" tam={18} />{copiado === 'codigo' ? 'Copiado' : 'Copiar código'}</button>
    </div>
  </div>
  <p class="ayuda">Con el QR entran desde la cámara del celular. El código se escribe en «Unirme con código».</p>

  {#if confirmar}
    <div class="confirmar" role="group" aria-label="Confirmar cambio de código">
      <p>El link, el QR y el código de ahora dejan de servir. Quien ya está en la campaña se queda.</p>
      <div class="en-linea">
        <button class="boton peligro" disabled={ocupado} onclick={cambiar}>{ocupado ? 'Cambiando…' : 'Sí, cambiar código'}</button>
        <button class="boton fantasma" disabled={ocupado} onclick={() => (confirmar = false)}>No</button>
      </div>
    </div>
  {:else}
    <button class="boton cambiar" onclick={() => { aviso = ''; confirmar = true }}><Icono nombre="reiniciar" tam={18} />Cambiar código</button>
  {/if}
  {#if aviso}<p class="aviso" role="status">{aviso}</p>{/if}
  {#if error}<p class="aviso-error" role="alert">{error}</p>{/if}
</section>

<style>
  .grupo { display: grid; gap: 0.6rem; align-content: start; }
  h3 { margin: 0; font-size: 1.1rem; }
  .ayuda { color: var(--texto-suave); font-size: 0.85rem; margin: 0; }
  .solido { min-height: 2.9rem; }

  .tarjeta-inv {
    display: flex; align-items: center; gap: 0.9rem; padding: 0.7rem;
    border-radius: var(--radio-control); background: var(--hundido); border: 1px solid var(--filete);
  }
  .qr {
    flex: none; width: 8.5rem; height: 8.5rem; color: var(--texto);
    border-radius: var(--radio-chico); box-shadow: 0 0 0 1px var(--filete);
  }
  .lado { min-width: 0; display: grid; gap: 0.3rem; justify-items: start; }
  .codigo { font-size: 1.5rem; font-weight: 900; letter-spacing: 0.06em; line-height: 1.1; white-space: nowrap; user-select: all; }

  .cambiar { justify-self: start; }
  .confirmar {
    display: grid; gap: 0.5rem; padding: 0.7rem 0.8rem;
    border-radius: var(--radio-control); background: var(--peligro-suave); border: 1px solid color-mix(in srgb, var(--peligro) 30%, transparent);
  }
  .confirmar p { margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--peligro-hondo); }
  .en-linea { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .aviso { margin: 0; padding: 0.5rem 0.75rem; border-radius: var(--radio-control); background: var(--exito-suave); color: var(--exito-hondo); font-size: 0.9rem; font-weight: 700; }
</style>

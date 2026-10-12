<script>
  import { supabase } from '../lib/supabase.js'
  import { app } from '../lib/mesa.svelte.js'

  let correo = $state('')
  let enviando = $state(false)
  let aviso = $state('')
  let error = $state('')

  const regreso = () => location.origin + location.pathname

  async function conDiscord() {
    error = ''
    const { error: e } = await supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: regreso() } })
    if (e) error = 'Discord todavía no está activado en la base. Usa tu correo mientras.'
  }

  async function conCorreo(ev) {
    ev.preventDefault()
    error = ''; aviso = ''
    if (!/^\S+@\S+\.\S+$/.test(correo)) { error = 'Ese correo no se ve completo.'; return }
    enviando = true
    const { error: e } = await supabase.auth.signInWithOtp({ email: correo.trim(), options: { emailRedirectTo: regreso() } })
    enviando = false
    if (e) error = `No se pudo mandar el enlace: ${e.message}`
    else aviso = `Listo. Abre el enlace que llegó a ${correo.trim()} desde este mismo dispositivo.`
  }
</script>

<section class="entrada">
  <header>
    <h1 class="titulo">Dolor <span class="y">&</span> Hambre</h1>
    <p class="sub">La mesa de dados de la campaña</p>
  </header>

  <div class="tarjeta vidrio">
    <button class="boton discord" onclick={conDiscord}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M19.3 5.3A16.6 16.6 0 0 0 15.2 4l-.5 1a15.3 15.3 0 0 0-5.4 0L8.8 4a16.6 16.6 0 0 0-4.1 1.3C2.1 9.2 1.4 13 1.7 16.7a16.7 16.7 0 0 0 5.1 2.6l1.1-1.7a10.8 10.8 0 0 1-1.7-.8l.4-.3a11.9 11.9 0 0 0 10.8 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.7a16.6 16.6 0 0 0 5.1-2.6c.4-4.3-.7-8-2.9-11.4ZM8.7 14.4c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"/></svg>
      Entrar con Discord
    </button>

    <div class="o"><span>o con tu correo</span></div>

    <form onsubmit={conCorreo}>
      <label class="sr-only" for="correo">Correo</label>
      <input id="correo" class="campo" type="email" autocomplete="email" placeholder="tu@correo.com" bind:value={correo} />
      <button class="boton" type="submit" disabled={enviando}>{enviando ? 'Mandando…' : 'Mandarme el enlace'}</button>
    </form>

    {#if aviso}<p class="aviso" role="status">{aviso}</p>{/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}

    <button class="probar" onclick={() => (app.demo = true)}>Probar los dados sin cuenta</button>
  </div>
</section>

<style>
  .entrada {
    position: absolute;
    inset: 0;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 1.6rem;
    padding: 1.5rem 1rem calc(1.5rem + var(--seguro-abajo));
  }
  header { text-align: center; }
  h1 {
    margin: 0;
    font-size: clamp(2.6rem, 9vw, 4.6rem);
    line-height: 1;
  }
  .y { color: var(--sangre); font-size: 0.8em; }
  .sub {
    margin: 0.6rem 0 0;
    color: var(--pergamino-suave);
    text-shadow: 0 1px 10px rgba(10, 4, 24, 0.8);
  }
  .tarjeta {
    width: min(100%, 380px);
    border-radius: var(--radio-panel);
    padding: 1.3rem;
    display: grid;
    gap: 0.9rem;
  }
  .discord {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    background: #5865f2;
    border-color: transparent;
    padding: 0.8rem;
  }
  .discord:hover { background: #4752c4; }
  .o {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: var(--pergamino-suave);
    font-size: 0.85rem;
  }
  .o::before, .o::after { content: ''; flex: 1; height: 1px; background: var(--linea); }
  form { display: grid; gap: 0.6rem; }
  .aviso { margin: 0; color: var(--exito); font-size: 0.92rem; }
  .error { margin: 0; color: #ffb3bd; font-size: 0.92rem; }
  .probar {
    background: none;
    border: 0;
    color: var(--esperanza);
    font-weight: 700;
    padding: 0.4rem;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>

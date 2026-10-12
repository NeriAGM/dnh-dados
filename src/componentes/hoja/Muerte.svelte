<script>
  // Movimientos de muerte (SRD): al marcar el último PG se elige uno.
  import Dialogo from './Dialogo.svelte'
  import { resolverEvitarMuerte, resolverArriesgarlo, repartoValido } from '../../lib/ayudas.js'

  let { pj, hoja, tirarDado, onHoja, onPJ, onCerrar } = $props()

  let resultado = $state(null) // { tipo, tirada, ... }
  let trabajando = $state(false)
  let error = $state('')
  let repartoPG = $state(0)
  let repartoEstres = $state(0)

  const nivel = $derived(hoja.nivel ?? 1)
  const pendiente = $derived(hoja.reparto_pendiente ?? null)
  const marcadosPG = $derived(hoja.pg ?? 0)
  const fallaReparto = $derived(pendiente ? repartoValido({ pg: repartoPG, estres: repartoEstres }, pendiente, marcadosPG, pj.estres) : null)

  async function hacer(fn) {
    error = ''
    trabajando = true
    try { await fn() } catch (e) { error = e.message } finally { trabajando = false }
  }

  const gloria = () => hacer(async () => {
    await onHoja(['estado'], 'gloria')
    onCerrar()
  })

  const evitar = () => hacer(async () => {
    const t = await tirarDado({ tipo: 'libre', grupos: [{ lados: 12, cantidad: 1, rol: 'esperanza' }], modificador: 0, etiqueta: 'Evitar la muerte' })
    const dado = t.dados?.[0]?.valor ?? t.total
    const r = resolverEvitarMuerte(dado, nivel, pj.esperanza_max)
    if (r.cicatriz) {
      await onPJ({ esperanza_max: r.esperanzaMax, esperanza: Math.min(pj.esperanza, r.esperanzaMax) })
      await onHoja(['cicatrices'], (hoja.cicatrices ?? 0) + 1)
    }
    await onHoja(['estado'], r.finDelViaje ? 'muerto' : 'inconsciente')
    resultado = { tipo: 'evitar', dado, ...r }
  })

  const arriesgar = () => hacer(async () => {
    const t = await tirarDado({ tipo: 'reaccion', grupos: [{ lados: 12, rol: 'esperanza' }, { lados: 12, rol: 'miedo' }], modificador: 0, etiqueta: 'Arriesgarlo todo' })
    const esp = t.dados.find((d) => d.rol === 'esperanza')?.valor
    const mie = t.dados.find((d) => d.rol === 'miedo')?.valor
    const r = resolverArriesgarlo(esp, mie)
    if (r.desenlace === 'critico') {
      await onHoja(['pg'], 0)
      await onPJ({ estres: 0 })
    } else if (r.desenlace === 'miedo') {
      await onHoja(['estado'], 'muerto')
    } else {
      // Se guarda para que el reparto no se pierda si se cierra la ventana
      iniciado = true
      await onHoja(['reparto_pendiente'], r.limpiar)
      repartoPG = Math.min(r.limpiar, marcadosPG)
      repartoEstres = Math.min(r.limpiar - repartoPG, pj.estres)
    }
    resultado = { tipo: 'arriesgar', esp, mie, ...r }
  })

  const repartir = () => hacer(async () => {
    if (fallaReparto) return
    if (repartoPG) await onHoja(['pg'], Math.max(0, marcadosPG - repartoPG))
    if (repartoEstres) await onPJ({ estres: Math.max(0, pj.estres - repartoEstres) })
    await onHoja(['reparto_pendiente'], null)
    onCerrar()
  })

  let iniciado = false
  $effect(() => {
    if (pendiente && !resultado && !iniciado) {
      iniciado = true
      repartoPG = Math.min(pendiente, marcadosPG)
      repartoEstres = Math.min(pendiente - repartoPG, pj.estres)
    }
  })
</script>

<Dialogo titulo="Movimiento de muerte" subtitulo={resultado || pendiente ? '' : 'Marcaste tu último Punto de Golpe. Elige uno:'} {onCerrar}>
  {#if pendiente}
    <div class="caja esperanza">
      <strong class="titulo">Sigues en pie</strong>
      <p>Arriesgarlo todo salió con Esperanza: limpia hasta <b>{pendiente}</b> entre PG y Estrés, como quieras.</p>
    </div>
    <div class="reparto">
      <div class="contador">
        <span>PG <small>({marcadosPG} marcados)</small></span>
        <button class="boton chico" onclick={() => (repartoPG = Math.max(0, repartoPG - 1))} aria-label="Menos PG">−</button>
        <b class="titulo">{repartoPG}</b>
        <button class="boton chico" onclick={() => (repartoPG += 1)} aria-label="Más PG">+</button>
      </div>
      <div class="contador">
        <span>Estrés <small>({pj.estres} marcado)</small></span>
        <button class="boton chico" onclick={() => (repartoEstres = Math.max(0, repartoEstres - 1))} aria-label="Menos Estrés">−</button>
        <b class="titulo">{repartoEstres}</b>
        <button class="boton chico" onclick={() => (repartoEstres += 1)} aria-label="Más Estrés">+</button>
      </div>
      <p class="nota">Usas {repartoPG + repartoEstres} de {pendiente}.</p>
      {#if fallaReparto}<p class="error">{fallaReparto}</p>{/if}
    </div>
  {:else if resultado?.tipo === 'evitar'}
    <div class="caja {resultado.cicatriz ? 'miedo' : 'esperanza'}">
      <strong class="titulo">Dado de Esperanza: {resultado.dado}</strong>
      {#if resultado.finDelViaje}
        <p>Salió {resultado.dado}, igual o menor a tu nivel ({nivel}): ganas una cicatriz y tachas tu última casilla de Esperanza. El viaje de tu personaje termina aquí.</p>
      {:else if resultado.cicatriz}
        <p>Salió igual o menor a tu nivel ({nivel}): ganas una <b>cicatriz</b> y tachas para siempre una casilla de Esperanza (ahora tu máximo es {resultado.esperanzaMax}). Decide con el DJ qué significa y si se puede sanar.</p>
      {:else}
        <p>Salió mayor a tu nivel ({nivel}): no ganas cicatriz.</p>
      {/if}
      {#if !resultado.finDelViaje}<p>Quedas <b>inconsciente</b>: no puedes moverte ni actuar, ni ser objetivo de ataques. Despiertas cuando un aliado te limpia 1 PG o más, o al terminar un descanso largo. Describe con el DJ cómo empeora la situación.</p>{/if}
    </div>
  {:else if resultado?.tipo === 'arriesgar'}
    <div class="caja {resultado.desenlace === 'miedo' ? 'miedo' : 'esperanza'}">
      <strong class="titulo">Esperanza {resultado.esp} · Miedo {resultado.mie}</strong>
      {#if resultado.desenlace === 'critico'}<p>¡Crítico! Sigues en pie y limpias <b>todos</b> tus PG y tu Estrés.</p>
      {:else if resultado.desenlace === 'miedo'}<p>Ganó el Miedo: tu personaje cruza el velo.</p>{/if}
    </div>
  {:else}
    <div class="opciones">
      <button class="opcion" disabled={trabajando} onclick={gloria}>
        <strong class="titulo">Llamarada de gloria</strong>
        <small>Haces una última acción, que es un éxito crítico automático (con permiso del DJ). Después mueres.</small>
      </button>
      <button class="opcion" disabled={trabajando} onclick={evitar}>
        <strong class="titulo">Evitar la muerte</strong>
        <small>Quedas inconsciente. Tiras tu Dado de Esperanza: si sale igual o menor a tu nivel ({nivel}), ganas una cicatriz y tachas una casilla de Esperanza.</small>
      </button>
      <button class="opcion" disabled={trabajando} onclick={arriesgar}>
        <strong class="titulo">Arriesgarlo todo</strong>
        <small>Tiras los Dados de Dualidad. Esperanza mayor: limpias PG o Estrés por el valor del Dado de Esperanza. Miedo mayor: mueres. Crítico: limpias todos tus PG y tu Estrés.</small>
      </button>
    </div>
  {/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}

  {#snippet pie()}
    {#if pendiente && !(resultado && resultado.desenlace !== 'esperanza')}
      <button class="boton principal" disabled={!!fallaReparto || trabajando} onclick={repartir}>Limpiar</button>
    {:else if resultado}
      <button class="boton principal" onclick={onCerrar}>Listo</button>
    {:else}
      <button class="boton" onclick={onCerrar}>Decidir después</button>
    {/if}
  {/snippet}
</Dialogo>

<style>
  .opciones { display: grid; gap: 0.5rem; }
  .opcion { display: grid; gap: 0.2rem; text-align: left; padding: 0.7rem 0.85rem; border-radius: 14px; border: 1px solid var(--linea); background: rgba(255, 245, 230, 0.05); }
  .opcion:hover { background: rgba(255, 245, 230, 0.1); border-color: var(--pergamino-suave); }
  .opcion:disabled { opacity: 0.5; }
  .opcion strong { font-size: 1.15rem; text-shadow: none; }
  .opcion small { font-size: 0.83rem; color: var(--pergamino-suave); line-height: 1.4; }
  .caja { display: grid; gap: 0.35rem; padding: 0.7rem 0.85rem; border-radius: 14px; border: 1px solid; }
  .caja strong { font-size: 1.25rem; text-shadow: none; }
  .caja p { margin: 0; font-size: 0.88rem; line-height: 1.45; }
  .caja.esperanza { background: rgba(240, 189, 85, 0.12); border-color: rgba(240, 189, 85, 0.5); }
  .caja.miedo { background: rgba(167, 124, 232, 0.16); border-color: rgba(167, 124, 232, 0.55); }
  .reparto { display: grid; gap: 0.45rem; }
  .contador { display: grid; grid-template-columns: 1fr auto 2.5rem auto; gap: 0.5rem; align-items: center; font-weight: 700; }
  .contador small { font-weight: 500; color: var(--pergamino-suave); }
  .contador b { text-align: center; font-size: 1.5rem; text-shadow: none; }
  .chico { padding: 0.3rem 0.8rem; }
  .nota { margin: 0; font-size: 0.82rem; color: var(--pergamino-suave); }
  .error { margin: 0; color: #ffb3bd; font-size: 0.88rem; }
  .principal { background: linear-gradient(135deg, #f6cf72, #e09a35 55%, #b9641c); color: #2a1606; border: 0; }
</style>

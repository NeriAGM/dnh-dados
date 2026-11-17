// Punto único para pedir una tirada.
// En la app real la decide el servidor (función tirar() en Supabase).
// En modo demostración (sin sesión) se calcula aquí con el mismo
// generador criptográfico del navegador y las mismas reglas.

import { supabase } from './supabase.js'

function azar(n) {
  // Muestreo por rechazo para que todas las caras salgan igual de seguido
  const limite = Math.floor(0x100000000 / n) * n
  const buf = new Uint32Array(1)
  do crypto.getRandomValues(buf)
  while (buf[0] >= limite)
  return (buf[0] % n) + 1
}

export function tirarLocal({ tipo, grupos, modificador = 0, dificultad = null, etiqueta = null, danoCritico = false, ayudantes = [] }) {
  // Ayudar a un Aliado (SRD 2.0, p. 48–49): igual que tirar() en el servidor (014)
  if (ayudantes.length && tipo !== 'accion') throw new Error('Ayudar a un Aliado solo va en tiradas de acción (no en reacciones)')
  // La ayuda cancela la desventaja, una por una (p. 49): ese d6 no se tira y
  // el primer ayudante tampoco tira (gasta su Esperanza igual)
  const cancela = ayudantes.length && grupos.some((g) => g.rol === 'desventaja') ? ayudantes[0] : null
  if (cancela) { grupos = grupos.filter((g) => g.rol !== 'desventaja'); ayudantes = ayudantes.slice(1) }
  const dados = []
  let total = 0, esp = null, miedo = null, critico = false, maxExtra = 0
  let idxVentaja = null
  const partes = []
  for (const g of grupos) {
    const cantidad = g.cantidad ?? 1
    const signo = g.signo < 0 ? -1 : 1
    const rol = g.rol ?? 'normal'
    const valores = Array.from({ length: cantidad }, () => azar(g.lados))
    let keep = null
    if ((g.conservar === 'alto' || g.conservar === 'bajo') && cantidad > 1) {
      keep = 0
      valores.forEach((v, i) => {
        if ((g.conservar === 'alto' && v > valores[keep]) || (g.conservar === 'bajo' && v < valores[keep])) keep = i
      })
    }
    if (rol === 'ventaja') idxVentaja = dados.length
    valores.forEach((valor, i) => {
      const descartado = keep !== null && i !== keep
      dados.push({ lados: g.lados, valor, rol, signo, descartado })
      if (!descartado) {
        total += signo * valor
        if (rol === 'esperanza') esp = valor
        if (rol === 'miedo') miedo = valor
        if (tipo === 'dj' && g.lados === 20 && valor === 20) critico = true
      }
    })
    if (danoCritico && signo > 0) maxExtra += g.lados * (keep === null ? cantidad : 1)
    if (!(rol === 'ventaja' && ayudantes.length)) partes.push(`${signo < 0 ? '-' : '+'}${cantidad}d${g.lados}${g.conservar ? g.conservar : ''}`)
  }
  // Cada ayudante tira su d6; cuenta solo el d6 de ventaja más alto (el propio gana los empates)
  if (ayudantes.length) {
    const propio = idxVentaja !== null ? dados[idxVentaja].valor : null
    const valoresAyuda = ayudantes.map(() => azar(6))
    const max = Math.max(propio ?? 0, ...valoresAyuda)
    let keep = null
    if (propio === null || propio < max) {
      keep = valoresAyuda.indexOf(max)
      if (propio !== null) dados[idxVentaja].descartado = true
    }
    total += max - (propio ?? 0)
    ayudantes.forEach((id, i) => dados.push({ lados: 6, valor: valoresAyuda[i], rol: 'ventaja', signo: 1, descartado: keep !== i, ayudante: id }))
    partes.push(`+máx(${ayudantes.length + (propio === null ? 0 : 1)}d6)`)
  }
  let formula = partes.join(' ').replace(/^\+/, '')
  if (modificador) formula += modificador > 0 ? ` +${modificador}` : ` ${modificador}`
  total += modificador + maxExtra

  let desenlace = null
  if (tipo === 'accion' || tipo === 'reaccion') {
    if (esp === miedo) { desenlace = 'critico'; critico = true }
    else desenlace = esp > miedo ? 'esperanza' : 'miedo'
  }
  let exito = null
  if (dificultad != null) exito = (critico && tipo !== 'dano') || total >= dificultad
  else if (critico && (tipo === 'accion' || tipo === 'reaccion')) exito = true

  const efectos = {}
  if (maxExtra) efectos.dano_critico_extra = maxExtra
  if (cancela) efectos.cancela_desventaja = cancela
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tipo, etiqueta, formula, dados, modificador, total, dificultad, desenlace, exito, critico,
    oculta: false, efectos, creado: new Date().toISOString(), local: true,
  }
}

// Si el servidor no contesta en este tiempo, se avisa en vez de quedarse esperando
export const ESPERA_MAXIMA = 15000

// AbortSignal.timeout no existe en Safari 15 (iPhone 7 y anteriores se quedan
// ahí): sin esto, TODA tirada real tronaba antes de llegar al servidor.
export function senalConLimite(ms) {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms)
  const control = new AbortController()
  setTimeout(() => control.abort(new DOMException('Se acabó el tiempo', 'TimeoutError')), ms)
  return control.signal
}

export async function tirar({ campania, personaje = null, tipo, grupos, modificador = 0, dificultad = null, oculta = false, etiqueta = null, danoCritico = false, ayudantes = [] }) {
  if (!campania) return tirarLocal({ tipo, grupos, modificador, dificultad, etiqueta, danoCritico, ayudantes })
  const args = {
    p_campania: campania,
    p_personaje: personaje,
    p_tipo: tipo,
    p_grupos: grupos,
    p_modificador: modificador,
    p_dificultad: dificultad,
    p_oculta: oculta,
    p_etiqueta: etiqueta,
    p_dano_critico: danoCritico,
  }
  // Solo se manda si hay ayudantes: así las tiradas normales siguen
  // funcionando aunque la migración 009 todavía no esté en Supabase
  if (ayudantes.length) args.p_ayudantes = ayudantes
  const { data, error } = await supabase.rpc('tirar', args).abortSignal(senalConLimite(ESPERA_MAXIMA))
  if (error) {
    if (/abort|timeout/i.test(`${error.name} ${error.message} ${error.details ?? ''}`)) {
      throw new Error('El servidor tardó demasiado en contestar. Si la tirada sí llegó, aparecerá en el historial; si no, vuelve a tirar.')
    }
    throw new Error(error.message)
  }
  return data
}

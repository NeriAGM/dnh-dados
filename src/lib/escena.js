// La escena: lo que la mesa ve del encuentro activo. La base de datos la
// arma con un trigger (migración 005); este archivo hace la MISMA cuenta
// en el navegador para el modo prueba y para la vista previa del DJ.
// Si cambias la regla aquí, cámbiala también en estado_adversario().

export const NOMBRE_ESTADO = { ileso: 'Ileso', herido: 'Herido', grave: 'Grave', caido: 'Caído' }

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

// 0 marcados → ileso · menos de la mitad → herido · la mitad o más → grave · todos → caído
export function estadoDe(pg, pgMax) {
  const max = num(pgMax)
  if (max == null || max <= 0) return null
  const p = num(pg) ?? 0
  if (p <= 0) return 'ileso'
  if (p >= max) return 'caido'
  if (p * 2 >= max) return 'grave'
  return 'herido'
}

// Completa una instancia con lo que la escena necesita (sale del catálogo)
export function completarInstancia(inst, adv) {
  if (!adv) return inst
  return { ...inst, nombre_base: adv.nombre, tipo: adv.tipo ?? null, pg_max: adv.pg ?? null, oculto: !!inst.oculto }
}
export function leFalta(inst, adv) {
  return !!adv && (inst.nombre_base !== adv.nombre || inst.tipo !== (adv.tipo ?? null) || inst.pg_max !== (adv.pg ?? null) || inst.oculto == null)
}

// Si no hay nada a la vista, la mesa no ve ni el nombre del encuentro
export function escenaDe(encuentro) {
  if (!encuentro) return null
  const adversarios = (Array.isArray(encuentro.adversarios) ? encuentro.adversarios : [])
    .filter((a) => a && typeof a === 'object' && a.oculto !== true)
    .map((a) => ({
      uid: a.uid,
      nombre: String(a.nombre ?? '').trim() || String(a.nombre_base ?? '').trim() || 'Adversario',
      tipo: a.tipo ?? null,
      estado: estadoDe(a.pg, a.pg_max),
    }))
  if (!adversarios.length) return null
  return { encuentro_id: encuentro.id, nombre: encuentro.nombre, entorno: String(encuentro.entorno_nombre ?? '').trim() || null, adversarios }
}

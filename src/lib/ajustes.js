// Ajustes de campaña ("reglas de la mesa"): los decide el DJ y aplican a
// todos. Se guardan en campanias.ajustes (jsonb). Aquí viven la lista,
// los valores por defecto y cómo leerlos sin tronar si vienen raros.
// Solo hay interruptores (sí / no); si un día hace falta otro tipo, se
// agrega aquí y en limpiarAjustes.

export const AJUSTES = [
  {
    id: 'danoMasivo',
    porDefecto: false,
    nombre: 'Daño masivo',
    descripcion: 'Regla opcional del SRD: si el daño es el doble del umbral Grave o más, se marcan 4 PG.',
  },
  {
    id: 'monedas',
    porDefecto: false,
    nombre: 'Monedas',
    descripcion: 'Regla opcional del SRD: 10 monedas = 1 puñado. Agrega una casilla de monedas al oro de cada hoja.',
  },
  {
    id: 'mostrarEntorno',
    porDefecto: true,
    nombre: 'La mesa ve el entorno',
    descripcion: 'El nombre del entorno sale en la tarjeta de la escena. Si se apaga, el lugar queda en secreto.',
  },
]

export const AJUSTES_POR_DEFECTO = Object.freeze(Object.fromEntries(AJUSTES.map((a) => [a.id, a.porDefecto])))

const CONOCIDOS = new Set(AJUSTES.map((a) => a.id))

// Deja solo los ajustes que existen y con el tipo correcto (lo demás se ignora)
export function limpiarAjustes(obj) {
  const limpio = {}
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return limpio
  for (const [k, v] of Object.entries(obj)) {
    if (CONOCIDOS.has(k) && typeof v === 'boolean') limpio[k] = v
  }
  return limpio
}

// Los ajustes de una campaña con los valores por defecto ya puestos.
// Acepta la campaña ({ ajustes }) o null (sin campaña: todo por defecto).
export function ajustesDe(campania) {
  return { ...AJUSTES_POR_DEFECTO, ...limpiarAjustes(campania?.ajustes) }
}

// Convierte texto como "2d8 + 3 - 1d6" en grupos de dados para tirar().
// Acepta: NdX, dX (un dado), números sueltos, signos + y -.
// Ejemplos válidos: "d20+5", "2d8+3", "1d12 + 1d12 - 1d6 + 2"

const TERMINO = /([+-]?)\s*(\d*)\s*[dD]\s*(\d+)|([+-]?)\s*(\d+)/g

// Los mismos topes que pone el servidor en tirar(): así el error sale aquí,
// claro y en español, y el modo de prueba no se congela con cientos de dados.
export const MAX_DADOS_GRUPO = 30
export const MAX_DADOS_TIRADA = 40
export const MAX_MODIFICADOR = 999

export function leerFormula(texto) {
  const crudo = texto || ''
  // "2d6 3" no es "2d63": dos números separados por espacio sin signo es un error
  if (/\d\s+\d/.test(crudo)) return { error: 'Falta un signo entre los números (por ejemplo 2d6+3)' }
  const limpio = crudo.replace(/\s+/g, '')
  if (!limpio) return { error: 'Escribe una fórmula, por ejemplo 2d8+3' }
  const grupos = []
  let modificador = 0
  let consumido = ''
  let total = 0
  for (const m of limpio.matchAll(TERMINO)) {
    consumido += m[0]
    if (m[3]) {
      const cantidad = m[2] ? parseInt(m[2], 10) : 1
      const lados = parseInt(m[3], 10)
      if (cantidad < 1 || cantidad > MAX_DADOS_GRUPO) return { error: `No puedo tirar ${cantidad} dados de un jalón (máximo ${MAX_DADOS_GRUPO})` }
      if (lados < 2 || lados > 100) return { error: `El d${lados} no existe aquí (de d2 a d100)` }
      total += cantidad
      if (total > MAX_DADOS_TIRADA) return { error: `Son demasiados dados (máximo ${MAX_DADOS_TIRADA} por tirada)` }
      grupos.push({ lados, cantidad, rol: 'normal', signo: m[1] === '-' ? -1 : 1 })
    } else {
      const n = parseInt(m[5], 10)
      modificador += m[4] === '-' ? -n : n
    }
  }
  if (consumido.length !== limpio.length) {
    return { error: 'No entendí la fórmula. Usa algo como 2d8+3 o 1d20-1' }
  }
  if (!grupos.length) return { error: 'Falta al menos un dado, por ejemplo 1d6' }
  if (!(Math.abs(modificador) <= MAX_MODIFICADOR)) return { error: `El número que se suma va de −${MAX_MODIFICADOR} a +${MAX_MODIFICADOR}` }
  return { grupos, modificador }
}

// Dificultad escrita por la persona: número entero o nada.
// (Un <input type="number"> vacío da '' al principio y null después de
// borrarlo; con Number(null) quedaba en 0 y todo salía "Éxito contra 0".)
export function leerDificultad(valor) {
  if (valor === '' || valor == null) return null
  const n = Number(valor)
  if (!Number.isFinite(n)) return null
  return Math.max(-MAX_MODIFICADOR, Math.min(MAX_MODIFICADOR, Math.round(n)))
}

// Texto bonito de un modificador: +2, −1, (nada si es 0)
export function conSigno(n) {
  if (!n) return ''
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`
}

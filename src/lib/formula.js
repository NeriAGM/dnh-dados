// Convierte texto como "2d8 + 3 - 1d6" en grupos de dados para tirar().
// Acepta: NdX, dX (un dado), números sueltos, signos + y -.
// Ejemplos válidos: "d20+5", "2d8+3", "1d12 + 1d12 - 1d6 + 2"

const TERMINO = /([+-]?)\s*(\d*)\s*[dD]\s*(\d+)|([+-]?)\s*(\d+)/g

export function leerFormula(texto) {
  const limpio = (texto || '').replace(/\s+/g, '')
  if (!limpio) return { error: 'Escribe una fórmula, por ejemplo 2d8+3' }
  const grupos = []
  let modificador = 0
  let consumido = ''
  for (const m of limpio.matchAll(TERMINO)) {
    consumido += m[0]
    if (m[3]) {
      const cantidad = m[2] ? parseInt(m[2], 10) : 1
      const lados = parseInt(m[3], 10)
      if (cantidad < 1 || cantidad > 30) return { error: `No puedo tirar ${cantidad} dados de un jalón (máximo 30)` }
      if (lados < 2 || lados > 100) return { error: `El d${lados} no existe aquí (de d2 a d100)` }
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
  return { grupos, modificador }
}

// Texto bonito de un modificador: +2, −1, (nada si es 0)
export function conSigno(n) {
  if (!n) return ''
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`
}

// Letra de la interfaz: cada quien la elige en Personalizar y se guarda en
// este navegador. Las familias se cargan en index.html (Google Fonts); el
// navegador solo baja la que se usa.

export const LETRAS = [
  { id: 'zen', nombre: 'Zen Maru Gothic', ayuda: 'Redondeada y suave (la de siempre)' },
  { id: 'mplus', nombre: 'M PLUS Rounded', ayuda: 'Redondeada, un poco más ancha' },
  { id: 'sistema', nombre: 'La de tu aparato', ayuda: 'La letra del sistema; carga al instante' },
]

const CLAVE = 'dnh.letra'

export function letraGuardada() {
  try {
    const id = localStorage.getItem(CLAVE)
    return LETRAS.some((l) => l.id === id) ? id : 'zen'
  } catch { return 'zen' }
}

export function aplicarLetra(id) {
  const valida = LETRAS.some((l) => l.id === id) ? id : 'zen'
  if (valida === 'zen') delete document.documentElement.dataset.letra
  else document.documentElement.dataset.letra = valida
  try { localStorage.setItem(CLAVE, valida) } catch {}
  return valida
}

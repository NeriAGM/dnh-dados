// Reglas puras de los fondos personalizados (sin Svelte ni navegador),
// para poder probarlas con node: valores por defecto, límites de las
// barras, validación de archivos y legibilidad automática.

export const MOMENTOS = [
  { id: 'amanecer', nombre: 'Amanecer', icono: '🌅' },
  { id: 'dia', nombre: 'Día', icono: '☀️' },
  { id: 'atardecer', nombre: 'Atardecer', icono: '🌇' },
  { id: 'noche', nombre: 'Noche', icono: '🌙' },
]

export const MODOS = [
  { id: 'cubrir', nombre: 'Cubrir', ayuda: 'Llena la pantalla; recorta lo que sobra' },
  { id: 'ajustar', nombre: 'Ajustar', ayuda: 'Se ve completa; rellena los lados' },
  { id: 'estirar', nombre: 'Estirar', ayuda: 'Ocupa todo aunque se deforme' },
  { id: 'centrar', nombre: 'Centrar', ayuda: 'Tamaño original, al centro' },
  { id: 'mosaico', nombre: 'Mosaico', ayuda: 'Se repite como azulejo' },
]

// Barras: [mínimo, máximo, paso, por defecto, unidad]
export const BARRAS = {
  tono: { nombre: 'Tono', min: -180, max: 180, paso: 1, defecto: 0, unidad: '°' },
  vidrio: { nombre: 'Vidrio', min: 0, max: 100, paso: 1, defecto: 50, unidad: '%' },
  contraste: { nombre: 'Contraste', min: 50, max: 150, paso: 1, defecto: 100, unidad: '%' },
  oscurecer: { nombre: 'Oscurecer', min: 0, max: 80, paso: 1, defecto: 0, unidad: '%' },
  desenfoque: { nombre: 'Desenfoque', min: 0, max: 20, paso: 0.5, defecto: 0, unidad: 'px' },
}

export const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const MAX_BYTES = 5 * 1024 * 1024
export const MAX_IMAGENES = 10

export const pueblo = (m) => `pueblo:${m}`
export const esPueblo = (id) => typeof id === 'string' && id.startsWith('pueblo:')
export const momentoDePueblo = (id) => (esPueblo(id) ? id.slice(7) : null)

export function fondoInicial() {
  const barras = Object.fromEntries(Object.entries(BARRAS).map(([k, b]) => [k, b.defecto]))
  return {
    tablero: Object.fromEntries(MOMENTOS.map((m) => [m.id, pueblo(m.id)])),
    modos: {}, // { [idImagen]: 'cubrir' | ... }
    ...barras,
  }
}

const limitar = (v, a, b) => Math.min(b, Math.max(a, v))
const idValido = (id) => typeof id === 'string' && id.length > 0 && id.length <= 300

// Acepta lo que venga (perfil, localStorage) y regresa un fondo completo y sano
export function normalizar(cfg) {
  const base = fondoInicial()
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return base
  for (const m of MOMENTOS) {
    const v = cfg.tablero?.[m.id]
    if (idValido(v) && (!esPueblo(v) || MOMENTOS.some((x) => pueblo(x.id) === v))) base.tablero[m.id] = v
  }
  if (cfg.modos && typeof cfg.modos === 'object') {
    for (const [id, modo] of Object.entries(cfg.modos)) {
      if (idValido(id) && MODOS.some((x) => x.id === modo)) base.modos[id] = modo
    }
  }
  for (const [k, b] of Object.entries(BARRAS)) {
    const v = Number(cfg[k])
    if (Number.isFinite(v)) base[k] = limitar(v, b.min, b.max)
  }
  return base
}

// Quita de los modos y del tablero una imagen que ya no existe
export function olvidarImagen(cfg, id) {
  const nuevo = normalizar(cfg)
  delete nuevo.modos[id]
  for (const m of MOMENTOS) if (nuevo.tablero[m.id] === id) nuevo.tablero[m.id] = pueblo(m.id)
  return nuevo
}

// '' si se puede subir; si no, el motivo en español
export function validarArchivo(archivo, cuantas = 0) {
  if (!archivo) return 'No elegiste ningún archivo.'
  if (cuantas >= MAX_IMAGENES) return `Ya tienes ${MAX_IMAGENES} fondos; borra uno para subir otro.`
  if (!TIPOS.includes(archivo.type)) return 'Solo se aceptan imágenes JPG, PNG, WEBP o GIF.'
  if (archivo.size > MAX_BYTES) return `La imagen pesa ${(archivo.size / 1048576).toFixed(1)} MB; el máximo es 5 MB.`
  return ''
}

// Nombre de archivo sin acentos, espacios ni símbolos raros
export function nombreSeguro(nombre = 'fondo') {
  const limpio = String(nombre)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '')
  return (limpio || 'fondo').slice(-60)
}

// Cómo pintar una imagen según el modo (propiedades CSS de background)
export function estiloModo(modo) {
  switch (modo) {
    case 'ajustar': return { size: 'contain', repeat: 'no-repeat', relleno: true }
    case 'estirar': return { size: '100% 100%', repeat: 'no-repeat', relleno: false }
    case 'centrar': return { size: 'auto', repeat: 'no-repeat', relleno: true }
    case 'mosaico': return { size: 'auto', repeat: 'repeat', relleno: false }
    default: return { size: 'cover', repeat: 'no-repeat', relleno: false }
  }
}

// Brillo promedio (0 negro … 1 blanco) de los píxeles RGBA de un canvas.
// Usa la luma de Rec. 709 sobre los valores tal cual se ven en pantalla.
export function luminanciaDe(datos) {
  let suma = 0, n = 0
  for (let i = 0; i < datos.length; i += 4) {
    const a = datos[i + 3] / 255
    suma += a * (0.2126 * datos[i] + 0.7152 * datos[i + 1] + 0.0722 * datos[i + 2]) / 255
    n++
  }
  return n ? suma / n : 0
}

// Brillo que de verdad queda después del contraste y el oscurecer del jugador
export function luminanciaEfectiva(l, cfg) {
  const c = (cfg?.contraste ?? 100) / 100
  const o = (cfg?.oscurecer ?? 0) / 100
  return limitar(((l - 0.5) * c + 0.5) * (1 - o), 0, 1)
}

// Variables CSS para que el texto se lea siempre. "extra" sube de 0 (fondo
// oscuro, nada que corregir) a 1 (fondo casi blanco, corrección máxima).
export function variablesLegibilidad(l, cfg) {
  const lef = luminanciaEfectiva(l, cfg)
  const extra = limitar((lef - 0.38) / 0.5, 0, 1)
  const v = (cfg?.vidrio ?? 50) / 100
  const alfa = Math.min(0.94, 0.25 + v * 0.66 + extra * 0.3)
  const r = (x) => Math.round(x * 1000) / 1000
  return {
    nivel: extra === 0 ? 'oscuro' : extra < 0.5 ? 'medio' : 'claro',
    brillo: lef,
    vars: {
      '--vidrio-alfa': String(r(alfa)),
      '--vidrio-desenfoque': `${r(6 + v * 24)}px`,
      '--velo-auto': String(r(extra * 0.34)),
      '--sombra-texto': extra > 0
        ? `0 1px 2px rgba(10, 4, 24, ${r(0.45 + 0.4 * extra)}), 0 0 14px rgba(10, 4, 24, ${r(0.35 * extra)})`
        : '0 1px 2px rgba(10, 4, 24, 0.25)',
      '--boton-fondo': extra > 0 ? `rgba(24, 17, 42, ${r(0.22 + 0.4 * extra)})` : 'rgba(255, 245, 230, 0.1)',
    },
  }
}

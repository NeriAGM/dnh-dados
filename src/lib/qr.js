import qrcode from 'qrcode-generator'

// Un QR como camino SVG: un cuadrito de 1×1 por módulo oscuro, con 4 de
// margen alrededor (la "zona quieta" que necesitan las cámaras).
export function caminoQR(texto) {
  const qr = qrcode(0, 'M')
  qr.addData(texto)
  qr.make()
  const n = qr.getModuleCount()
  let d = ''
  for (let f = 0; f < n; f++) for (let c = 0; c < n; c++) if (qr.isDark(f, c)) d += `M${c + 4} ${f + 4}h1v1h-1z`
  return { lado: n + 8, d }
}

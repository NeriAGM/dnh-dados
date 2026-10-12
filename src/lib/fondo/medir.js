// Mide qué tan claro se ve el fondo en la pantalla (0 negro … 1 blanco)
// dibujándolo chiquito en un canvas, igual que como lo acomoda el modo.

import { luminanciaDe } from './ajustes.js'

const ANCHO = 48

function lienzoMuestra() {
  const c = document.createElement('canvas')
  c.width = ANCHO
  c.height = Math.max(1, Math.round(ANCHO * (innerHeight / Math.max(1, innerWidth))))
  return c
}

function leer(c) {
  try { return luminanciaDe(c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data) }
  catch { return 0.7 } // imagen "contaminada" (sin CORS): mejor suponer que es clara
}

export function medirLienzo(canvas) {
  const c = lienzoMuestra()
  c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height)
  return leer(c)
}

function cubrir(ctx, img, W, H, iw, ih) {
  const s = Math.max(W / iw, H / ih)
  ctx.drawImage(img, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s)
}

export function medirImagen(img, modo) {
  const c = lienzoMuestra()
  const ctx = c.getContext('2d')
  const W = c.width, H = c.height
  const iw = img.naturalWidth || 1, ih = img.naturalHeight || 1
  const escala = W / Math.max(1, innerWidth) // de píxeles de pantalla a la muestra
  // El relleno de "ajustar" y "centrar" es la misma imagen, borrosa y más oscura
  const rellenar = () => { ctx.filter = 'brightness(0.7)'; cubrir(ctx, img, W, H, iw, ih); ctx.filter = 'none' }
  if (modo === 'estirar') ctx.drawImage(img, 0, 0, W, H)
  else if (modo === 'ajustar') {
    rellenar()
    const s = Math.min(W / iw, H / ih)
    ctx.drawImage(img, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s)
  } else if (modo === 'centrar') {
    rellenar()
    ctx.drawImage(img, (W - iw * escala) / 2, (H - ih * escala) / 2, iw * escala, ih * escala)
  } else if (modo === 'mosaico') {
    const tw = Math.max(1, iw * escala), th = Math.max(1, ih * escala)
    for (let y = 0; y < H; y += th) for (let x = 0; x < W; x += tw) ctx.drawImage(img, x, y, tw, th)
  } else cubrir(ctx, img, W, H, iw, ih)
  return leer(c)
}

// Carga una imagen (con CORS para poder leer sus píxeles)
export function cargarImagen(url) {
  return new Promise((ok, mal) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => ok(img)
    img.onerror = () => mal(new Error('No cargó la imagen'))
    img.src = url
  })
}

// Fondo animado: un pueblo en un valle, pintado a mano con código.
// Cambia con la hora del día (amanecer, día, atardecer, noche).
//
// Para no gastar batería, lo que no se mueve (cielo, montañas, pueblo) se
// pinta una sola vez en "capas" guardadas; en cada cuadro solo se dibujan
// las nubes, el humo, las luciérnagas, los pétalos y el pasto.

function semilla(s) {
  // Generador pseudoaleatorio con semilla (mulberry32): mismo paisaje siempre
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const PALETAS = {
  amanecer: {
    cielo: ['#33447e', '#8c6fae', '#e99ab0', '#ffd3a5'],
    astro: { tipo: 'sol', color: '#fff0d0', halo: 'rgba(255,190,170,0.55)', y: 0.56, x: 0.72 },
    lejos: '#9a86b4', medio: '#6f6596', cerca: '#4a4a74', pasto: '#3e5a5e', pastoLuz: '#86a28f',
    techo: ['#b5566a', '#8a4a7a', '#c4785a'], muro: '#e9d4c4', ventana: 'rgba(255,214,150,0.65)',
    bruma: 'rgba(255,200,210,0.35)', luz: 'rgba(255,200,170,0.25)', nube: 'rgba(255,214,222,0.8)', nubeSombra: 'rgba(150,120,170,0.5)',
    luciernagas: 0, petalos: 18, estrellas: 0.15,
  },
  dia: {
    cielo: ['#3f8fd8', '#6db4ea', '#a8d8f5', '#e8f6ff'],
    astro: { tipo: 'sol', color: '#fffbe8', halo: 'rgba(255,250,220,0.5)', y: 0.16, x: 0.78 },
    lejos: '#94b6d6', medio: '#6f9fae', cerca: '#4f8a72', pasto: '#4d8a4e', pastoLuz: '#9fd07a',
    techo: ['#c2543f', '#3f6fa3', '#d08a3c'], muro: '#f6ead6', ventana: 'rgba(60,70,90,0.55)',
    bruma: 'rgba(230,245,255,0.35)', luz: 'rgba(255,255,230,0.12)', nube: 'rgba(255,255,255,0.95)', nubeSombra: 'rgba(160,190,220,0.55)',
    luciernagas: 0, petalos: 26, estrellas: 0,
  },
  atardecer: {
    cielo: ['#2a1d3d', '#7a3a6a', '#d9646a', '#ffb06a'],
    astro: { tipo: 'sol', color: '#ffe2a8', halo: 'rgba(255,150,90,0.6)', y: 0.6, x: 0.3 },
    lejos: '#a0607a', medio: '#6a3e66', cerca: '#3d2846', pasto: '#3a2a3e', pastoLuz: '#c7765a',
    techo: ['#7a2f3e', '#5a2f5a', '#8a4a3a'], muro: '#d9a98a', ventana: 'rgba(255,196,110,0.95)',
    bruma: 'rgba(255,150,120,0.35)', luz: 'rgba(255,170,100,0.3)', nube: 'rgba(255,170,140,0.85)', nubeSombra: 'rgba(120,60,100,0.6)',
    luciernagas: 22, petalos: 10, estrellas: 0.3,
  },
  noche: {
    cielo: ['#070b26', '#141b4a', '#283373', '#46468a'],
    astro: { tipo: 'luna', color: '#f3f1ff', halo: 'rgba(170,180,255,0.35)', y: 0.17, x: 0.24 },
    lejos: '#2b3266', medio: '#1f2452', cerca: '#161a3a', pasto: '#121733', pastoLuz: '#3d4a8a',
    techo: ['#2e2347', '#25304f', '#3a2a40'], muro: '#4a4566', ventana: 'rgba(255,190,100,1)',
    bruma: 'rgba(120,130,220,0.2)', luz: 'rgba(130,150,255,0.1)', nube: 'rgba(120,130,190,0.55)', nubeSombra: 'rgba(20,24,60,0.6)',
    luciernagas: 46, petalos: 0, estrellas: 1,
  },
}

export function momentoActual(fecha = new Date()) {
  const h = fecha.getHours() + fecha.getMinutes() / 60
  if (h >= 5.5 && h < 8) return 'amanecer'
  if (h >= 8 && h < 17.5) return 'dia'
  if (h >= 17.5 && h < 19.75) return 'atardecer'
  return 'noche'
}

function gradienteVertical(ctx, y0, y1, colores) {
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  colores.forEach((c, i) => g.addColorStop(i / (colores.length - 1), c))
  return g
}

// Silueta de montañas con ruido suave
function cordillera(ctx, w, h, base, alto, rnd, color, picos = 5, rugosidad = 0.25) {
  const pts = []
  const n = 120
  const fase = Array.from({ length: 4 }, () => rnd() * 10)
  // La frecuencia va por píxeles, no por ancho de pantalla: en un celular
  // se ve un pedazo de la cordillera en lugar de una cordillera "apachurrada".
  const ref = Math.max(w, 1100)
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * w
    const t = x / ref
    const y =
      base -
      alto * (0.55 + 0.45 * Math.sin(t * Math.PI * picos * 0.5 + fase[0])) *
        (0.75 + 0.25 * Math.sin(t * Math.PI * picos * 1.7 + fase[1])) -
      alto * rugosidad * Math.sin(t * Math.PI * picos * 4.3 + fase[2]) * 0.3 -
      alto * rugosidad * Math.sin(t * Math.PI * picos * 9.1 + fase[3]) * 0.12
    pts.push([x, y])
  }
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (const [x, y] of pts) ctx.lineTo(x, y)
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  return pts
}

function arbolito(ctx, x, y, s, color, rnd) {
  // Pino estilizado (como en los fondos de anime: triángulos suaves apilados)
  ctx.fillStyle = color
  for (let k = 0; k < 3; k++) {
    const ancho = s * (0.9 - k * 0.22)
    const yy = y - k * s * 0.55
    ctx.beginPath()
    ctx.moveTo(x - ancho, yy)
    ctx.quadraticCurveTo(x, yy - s * 0.2, x + ancho, yy)
    ctx.lineTo(x, yy - s * (0.95 + rnd() * 0.15))
    ctx.closePath()
    ctx.fill()
  }
}

function casita(ctx, x, y, s, pal, rnd, ventanas) {
  const ancho = s * (1 + rnd() * 0.6)
  const alto = s * (0.7 + rnd() * 0.4)
  const techo = pal.techo[Math.floor(rnd() * pal.techo.length)]
  ctx.fillStyle = pal.muro
  ctx.fillRect(x - ancho / 2, y - alto, ancho, alto)
  // Sombra lateral del muro
  ctx.fillStyle = 'rgba(40,20,50,0.22)'
  ctx.fillRect(x + ancho * 0.15, y - alto, ancho * 0.35, alto)
  // Techo a dos aguas
  ctx.fillStyle = techo
  ctx.beginPath()
  ctx.moveTo(x - ancho * 0.62, y - alto)
  ctx.lineTo(x, y - alto - s * (0.55 + rnd() * 0.25))
  ctx.lineTo(x + ancho * 0.62, y - alto)
  ctx.closePath()
  ctx.fill()
  // Ventanas
  const nv = 1 + Math.floor(rnd() * 2)
  for (let i = 0; i < nv; i++) {
    const vx = x - ancho * 0.3 + i * ancho * 0.4
    const vy = y - alto * 0.62
    ventanas.push({ x: vx, y: vy, w: s * 0.16, h: s * 0.2, fase: rnd() * 6.28 })
    ctx.fillStyle = pal.ventana
    ctx.fillRect(vx, vy, s * 0.16, s * 0.2)
  }
  return { chimenea: rnd() < 0.5 ? { x: x + ancho * 0.25, y: y - alto - s * 0.35 } : null }
}

// Cada nube se pinta una vez, difuminada, en su propio lienzo ("sprite")
function spriteNube(s, pal, dpr) {
  const c = document.createElement('canvas')
  c.width = Math.ceil(s * 4.4 * dpr)
  c.height = Math.ceil(s * 2.6 * dpr)
  const k = c.getContext('2d')
  k.scale(dpr, dpr)
  k.filter = `blur(${Math.max(1, s * 0.05)}px)`
  nube(k, s * 2.2, s * 1.35, s, pal)
  return c
}

function nube(ctx, x, y, s, pal) {
  const bolas = [[0, 0, 1], [-0.9, 0.18, 0.7], [0.95, 0.15, 0.75], [-0.4, -0.35, 0.72], [0.45, -0.4, 0.66], [1.7, 0.3, 0.45], [-1.6, 0.32, 0.45]]
  ctx.fillStyle = pal.nubeSombra
  for (const [dx, dy, r] of bolas) {
    ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s + s * 0.18, r * s, 0, 6.29); ctx.fill()
  }
  ctx.fillStyle = pal.nube
  for (const [dx, dy, r] of bolas) {
    ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s * 0.95, 0, 6.29); ctx.fill()
  }
}

export function crearPaisaje(canvas, { momento = momentoActual(), reducido = false } = {}) {
  const ctx = canvas.getContext('2d')
  let w = 0, h = 0, dpr = 1
  let pal = PALETAS[momento]
  let capaFondo = null
  let ventanas = [], chimeneas = [], nubes = [], luciernagas = [], petalos = [], pasto = [], estrellas = []
  let raf = 0, ultimo = 0, t = 0
  let visible = true

  function construir() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    w = canvas.clientWidth || window.innerWidth
    h = canvas.clientHeight || window.innerHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    const rnd = semilla(20260816)

    capaFondo = document.createElement('canvas')
    capaFondo.width = canvas.width
    capaFondo.height = canvas.height
    const c = capaFondo.getContext('2d')
    c.scale(dpr, dpr)

    const horizonte = h * 0.62

    // Cielo
    c.fillStyle = gradienteVertical(c, 0, horizonte, pal.cielo)
    c.fillRect(0, 0, w, h)

    // Estrellas
    estrellas = []
    const nEst = Math.round(160 * pal.estrellas)
    for (let i = 0; i < nEst; i++) {
      estrellas.push({ x: rnd() * w, y: rnd() * horizonte * 0.8, r: rnd() * 1.2 + 0.3, fase: rnd() * 6.28 })
    }

    // Sol o luna con halo
    const a = pal.astro
    const ax = w * a.x, ay = h * a.y, ar = Math.min(w, h) * (a.tipo === 'luna' ? 0.045 : 0.06)
    const halo = c.createRadialGradient(ax, ay, ar * 0.5, ax, ay, ar * 7)
    halo.addColorStop(0, a.halo)
    halo.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = halo
    c.fillRect(0, 0, w, h)
    c.fillStyle = a.color
    c.beginPath(); c.arc(ax, ay, ar, 0, 6.29); c.fill()
    if (a.tipo === 'luna') {
      c.fillStyle = 'rgba(160,165,210,0.35)'
      for (const [dx, dy, r] of [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [-0.05, 0.4, 0.12]]) {
        c.beginPath(); c.arc(ax + dx * ar, ay + dy * ar, r * ar, 0, 6.29); c.fill()
      }
    }

    // Rayos de luz (solo con sol bajo)
    if (a.tipo === 'sol' && a.y > 0.4) {
      c.save()
      c.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 7; i++) {
        const ang = -Math.PI / 2 + (i - 3) * 0.28 + (rnd() - 0.5) * 0.1
        const g = c.createLinearGradient(ax, ay, ax + Math.cos(ang) * h, ay + Math.sin(ang) * h)
        g.addColorStop(0, pal.luz)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        c.fillStyle = g
        c.beginPath()
        c.moveTo(ax, ay)
        c.lineTo(ax + Math.cos(ang - 0.05) * h * 1.2, ay + Math.sin(ang - 0.05) * h * 1.2)
        c.lineTo(ax + Math.cos(ang + 0.05) * h * 1.2, ay + Math.sin(ang + 0.05) * h * 1.2)
        c.closePath()
        c.fill()
      }
      c.restore()
    }

    // Montañas lejanas, medias y cercanas, con bruma entre capas
    cordillera(c, w, h, horizonte, h * 0.24, rnd, pal.lejos, 3, 0.4)
    c.fillStyle = gradienteVertical(c, horizonte - h * 0.25, horizonte + h * 0.05, ['rgba(0,0,0,0)', pal.bruma])
    c.fillRect(0, horizonte - h * 0.25, w, h * 0.3)
    const medio = cordillera(c, w, h, horizonte + h * 0.06, h * 0.12, rnd, pal.medio, 4, 0.3)
    // Bosque en la ladera media
    for (let i = 0; i < Math.round(w / 9); i++) {
      const p = medio[Math.floor(rnd() * medio.length)]
      arbolito(c, p[0], p[1] + h * 0.015 + rnd() * h * 0.03, h * (0.018 + rnd() * 0.012), pal.cerca, rnd)
    }
    c.fillStyle = gradienteVertical(c, horizonte, horizonte + h * 0.12, ['rgba(0,0,0,0)', pal.bruma])
    c.fillRect(0, horizonte, w, h * 0.12)

    // Colina del pueblo
    const colinaBase = horizonte + h * 0.16
    const colina = cordillera(c, w, h, colinaBase, h * 0.06, rnd, pal.cerca, 2, 0.1)

    // Pueblo: casitas sobre la colina, más grandes al frente
    ventanas = []
    chimeneas = []
    const nCasas = Math.max(7, Math.round(w / 70))
    const casas = []
    for (let i = 0; i < nCasas; i++) {
      const xi = 0.12 + (i / nCasas) * 0.76 + (rnd() - 0.5) * 0.04
      const p = colina[Math.floor(xi * (colina.length - 1))]
      casas.push({ x: p[0], y: p[1] + h * 0.012 + rnd() * h * 0.02, s: h * (0.026 + rnd() * 0.012) })
    }
    casas.sort((p, q) => p.y - q.y)
    for (const k of casas) {
      const r = casita(c, k.x, k.y, k.s, pal, rnd, ventanas)
      if (r.chimenea) chimeneas.push(r.chimenea)
      if (rnd() < 0.5) arbolito(c, k.x + k.s * (rnd() < 0.5 ? -1.3 : 1.3), k.y + k.s * 0.1, k.s * 0.9, pal.cerca, rnd)
    }

    // Prado del frente
    const prado = gradienteVertical(c, colinaBase, h, [pal.cerca, pal.pasto])
    c.fillStyle = prado
    c.beginPath()
    c.moveTo(0, h)
    c.lineTo(0, colinaBase + h * 0.04)
    c.quadraticCurveTo(w * 0.5, colinaBase - h * 0.03, w, colinaBase + h * 0.06)
    c.lineTo(w, h)
    c.closePath()
    c.fill()

    // Camino que sube al pueblo
    c.fillStyle = 'rgba(255,235,200,0.12)'
    c.beginPath()
    c.moveTo(w * 0.42, h)
    c.quadraticCurveTo(w * 0.52, colinaBase + h * 0.12, w * 0.5, colinaBase + h * 0.02)
    c.quadraticCurveTo(w * 0.56, colinaBase + h * 0.14, w * 0.64, h)
    c.closePath()
    c.fill()

    // Nubes (se mueven)
    nubes = Array.from({ length: Math.max(4, Math.round(w / 260)) }, () => {
      const s = Math.max(w, h) * (0.022 + rnd() * 0.022)
      return { x: rnd() * w * 1.3 - w * 0.15, y: h * (0.06 + rnd() * 0.3), s, v: 4 + rnd() * 6, sprite: spriteNube(s, pal, dpr) }
    })

    pasto = Array.from({ length: Math.round(w / 5) }, () => ({
      x: rnd() * w,
      y: h - rnd() * h * 0.08,
      l: h * (0.025 + rnd() * 0.04),
      fase: rnd() * 6.28,
    }))

    luciernagas = Array.from({ length: pal.luciernagas }, () => ({
      x: rnd() * w, y: h * (0.62 + rnd() * 0.35), fase: rnd() * 6.28, v: 0.3 + rnd() * 0.6,
    }))
    petalos = Array.from({ length: pal.petalos }, () => ({
      x: rnd() * w, y: rnd() * h, v: 12 + rnd() * 18, giro: rnd() * 6.28, fase: rnd() * 6.28,
    }))
  }

  function cuadro(dt) {
    t += dt
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.drawImage(capaFondo, 0, 0, w, h)

    // Estrellas que titilan
    for (const e of estrellas) {
      ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.7 + e.fase))})`
      ctx.fillRect(e.x, e.y, e.r, e.r)
    }

    // Nubes a la deriva
    for (const n of nubes) {
      n.x += n.v * dt
      if (n.x - n.s * 3 > w) n.x = -n.s * 3
      ctx.drawImage(n.sprite, n.x - n.s * 2.2, n.y - n.s * 1.35, n.s * 4.4, n.s * 2.6)
    }

    // Ventanas que parpadean como velas
    if (pal.luciernagas > 0) {
      for (const v of ventanas) {
        const a = 0.12 + 0.12 * Math.sin(t * 3 + v.fase) + 0.06 * Math.sin(t * 7.3 + v.fase * 2)
        ctx.fillStyle = `rgba(255,220,150,${a})`
        ctx.beginPath()
        ctx.arc(v.x + v.w / 2, v.y + v.h / 2, v.w * 2.2, 0, 6.29)
        ctx.fill()
      }
    }

    // Humo de chimeneas
    for (const ch of chimeneas) {
      for (let k = 0; k < 5; k++) {
        const fase = (t * 0.25 + k / 5) % 1
        const r = 2 + fase * 9
        ctx.fillStyle = `rgba(235,230,240,${0.28 * (1 - fase)})`
        ctx.beginPath()
        ctx.arc(ch.x + Math.sin(t + k) * 3 + fase * 14, ch.y - fase * 40, r, 0, 6.29)
        ctx.fill()
      }
    }

    // Pasto que se mece
    ctx.strokeStyle = pal.pastoLuz
    ctx.lineWidth = 1.2
    ctx.globalAlpha = 0.45
    ctx.beginPath()
    for (const p of pasto) {
      const sway = Math.sin(t * 1.6 + p.fase + p.x * 0.01) * p.l * 0.3
      ctx.moveTo(p.x, p.y)
      ctx.quadraticCurveTo(p.x + sway * 0.4, p.y - p.l * 0.5, p.x + sway, p.y - p.l)
    }
    ctx.stroke()
    ctx.globalAlpha = 1

    // Pétalos
    for (const p of petalos) {
      p.y += p.v * dt
      p.x += Math.sin(t + p.fase) * 12 * dt + 8 * dt
      p.giro += dt * 2
      if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w }
      if (p.x > w + 10) p.x = -10
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.giro)
      ctx.scale(1, Math.abs(Math.sin(p.giro * 1.3)) * 0.8 + 0.2)
      ctx.fillStyle = 'rgba(255,190,205,0.85)'
      ctx.beginPath()
      ctx.ellipse(0, 0, 4, 2.4, 0, 0, 6.29)
      ctx.fill()
      ctx.restore()
    }

    // Luciérnagas
    for (const l of luciernagas) {
      const x = l.x + Math.sin(t * l.v + l.fase) * 30
      const y = l.y + Math.cos(t * l.v * 0.8 + l.fase) * 18
      const a = 0.5 + 0.5 * Math.sin(t * 2.4 + l.fase * 3)
      const g = ctx.createRadialGradient(x, y, 0, x, y, 9)
      g.addColorStop(0, `rgba(255,240,150,${0.9 * a})`)
      g.addColorStop(1, 'rgba(255,220,120,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.29); ctx.fill()
    }
  }

  function bucle(ahora) {
    raf = requestAnimationFrame(bucle)
    if (!visible) return
    const dt = ultimo ? Math.min((ahora - ultimo) / 1000, 0.1) : 0
    // ~30 cuadros por segundo es suficiente para un fondo
    if (dt && dt < 1 / 32) return
    ultimo = ahora
    cuadro(dt)
  }

  const alCambiarVisibilidad = () => { visible = !document.hidden; ultimo = 0 }
  document.addEventListener('visibilitychange', alCambiarVisibilidad)
  const obs = new ResizeObserver(() => { construir(); cuadro(0) })
  obs.observe(canvas)

  construir()
  cuadro(0)
  if (!reducido) raf = requestAnimationFrame(bucle)

  return {
    cambiarMomento(m) {
      if (!PALETAS[m]) return
      momento = m
      pal = PALETAS[m]
      construir()
      cuadro(0)
    },
    get momento() { return momento },
    destruir() {
      cancelAnimationFrame(raf)
      obs.disconnect()
      document.removeEventListener('visibilitychange', alCambiarVisibilidad)
    },
  }
}

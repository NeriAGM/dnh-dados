// Mesa de dados 3D.
//
// Cómo se mantiene el azar real aunque haya física:
//   1. El SERVIDOR decide el número (función tirar() en Supabase, con un
//      generador criptográfico).
//   2. Aquí se simula la física completa de un lanzamiento (rebotes, giros)
//      sin dibujar nada, y se graba cuadro por cuadro.
//   3. Al final de la simulación se ve qué cara quedó arriba y se "reetiqueta"
//      el dado: esa cara recibe el número que dio el servidor (se intercambia
//      con la cara que lo tenía, así el dado sigue teniendo todos sus números).
//   4. Se reproduce la grabación. Lo que ves es física real; el número es el
//      del servidor. Todos los jugadores ven el mismo resultado.

import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { poliedro } from './poliedros.js'
import { ESTILOS } from './estilos.js'

const RADIO = 1.0
const DT = 1 / 60
const MAX_CUADROS = 60 * 7
const ARRIBA = new THREE.Vector3(0, 1, 0)

// ---------------------------------------------------------------------
// Texturas: una cuadrícula ("atlas") con todos los números de un estilo
// ---------------------------------------------------------------------

const CELDA = 128
const atlasCache = new Map()

function dibujarNumero(ctx, n, cx, cy, tam, tinta, angulo = 0) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angulo)
  ctx.font = `900 ${tam}px "Zen Old Mincho", Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = tinta
  ctx.shadowColor = 'rgba(0,0,0,0.25)'
  ctx.shadowBlur = tam * 0.06
  ctx.fillText(String(n), 0, tam * 0.04)
  if (n === 6 || n === 9) {
    ctx.fillRect(-tam * 0.22, tam * 0.42, tam * 0.44, tam * 0.07)
  }
  ctx.restore()
}

function atlas(lados, estiloNombre) {
  const clave = `${lados}:${estiloNombre}`
  if (atlasCache.has(clave)) return atlasCache.get(clave)
  const est = ESTILOS[estiloNombre]
  const cols = Math.ceil(Math.sqrt(lados))
  const filas = Math.ceil(lados / cols)
  const canvas = document.createElement('canvas')
  canvas.width = cols * CELDA
  canvas.height = filas * CELDA
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = est.cuerpo
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const tam = lados >= 20 ? 62 : lados >= 10 ? 74 : 84
  for (let v = 1; v <= lados; v++) {
    const c = (v - 1) % cols
    const f = Math.floor((v - 1) / cols)
    dibujarNumero(ctx, v, c * CELDA + CELDA / 2, f * CELDA + CELDA / 2, tam, est.tinta)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const res = { tex, cols, filas }
  atlasCache.set(clave, res)
  return res
}

// d4: cada cara muestra los 3 números de sus vértices, cada uno junto a su
// esquina. Por eso su textura se dibuja por dado (depende de la etiqueta).
function texturaD4(def, verticeValores, estiloNombre) {
  const est = ESTILOS[estiloNombre]
  const canvas = document.createElement('canvas')
  canvas.width = CELDA * 2
  canvas.height = CELDA * 2
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = est.cuerpo
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  def.caras.forEach((cara, i) => {
    const cx = (i % 2) * CELDA + CELDA / 2
    const cy = Math.floor(i / 2) * CELDA + CELDA / 2
    cara.idx.forEach((vi, k) => {
      // Las esquinas de la cara en la textura están a 0, 120 y 240 grados
      const ang = -Math.PI / 2 + (k * 2 * Math.PI) / 3
      const r = CELDA * 0.25
      dibujarNumero(ctx, verticeValores[vi], cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 34, est.tinta, ang + Math.PI / 2)
    })
  })
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ---------------------------------------------------------------------
// Geometría visible con coordenadas de textura según la etiqueta
// ---------------------------------------------------------------------

function vecDe(a) { return new THREE.Vector3(a[0], a[1], a[2]) }

function geometriaDado(def, etiquetas, cols, filas) {
  const pos = [], nor = [], uv = []
  def.caras.forEach((cara, i) => {
    const centro = vecDe(cara.centro)
    const n = vecDe(cara.normal)
    const pts = cara.idx.map((q) => vecDe(def.vertices[q]))

    // Hacia dónde apunta "arriba" el número en esta cara
    let arriba
    if (def.lados === 4) {
      arriba = pts[0].clone().sub(centro)
    } else if (def.lados === 10) {
      const polo = pts.reduce((m, p) => (Math.abs(p.y) > Math.abs(m.y) ? p : m))
      arriba = polo.clone().sub(centro)
    } else if (pts.length === 4) {
      arriba = pts[0].clone().add(pts[1]).multiplyScalar(0.5).sub(centro)
    } else {
      arriba = pts[0].clone().sub(centro)
    }
    arriba.normalize()
    const derecha = new THREE.Vector3().crossVectors(arriba, n).normalize()
    const radio = Math.max(...pts.map((p) => p.distanceTo(centro)))

    let celdaX, celdaY, w, h
    if (def.lados === 4) {
      celdaX = i % 2; celdaY = Math.floor(i / 2); w = 2; h = 2
    } else {
      const v = etiquetas[i]
      celdaX = (v - 1) % cols; celdaY = Math.floor((v - 1) / cols); w = cols; h = filas
    }
    const escalaCara = def.lados === 4 ? 0.5 : 0.47
    const uvDe = (p) => {
      const d = p.clone().sub(centro)
      const x = d.dot(derecha) / radio
      const y = d.dot(arriba) / radio
      // En d4 los vértices van en ángulos fijos para que coincidan con la textura
      return [(celdaX + 0.5 + x * escalaCara) / w, 1 - (celdaY + 0.5 - y * escalaCara) / h]
    }

    let uvs = pts.map(uvDe)
    if (def.lados === 4) {
      // Reacomoda los 3 vértices en 0°,120°,240° para que cada número quede en su esquina
      uvs = pts.map((_, k) => {
        const ang = -Math.PI / 2 + (k * 2 * Math.PI) / 3
        const x = Math.cos(ang) * 0.5, y = Math.sin(ang) * 0.5
        return [(celdaX + 0.5 + x * 0.98) / w, 1 - (celdaY + 0.5 + y * 0.98) / h]
      })
    }

    for (let k = 1; k < pts.length - 1; k++) {
      for (const j of [0, k, k + 1]) {
        pos.push(pts[j].x, pts[j].y, pts[j].z)
        nor.push(n.x, n.y, n.z)
        uv.push(uvs[j][0], uvs[j][1])
      }
    }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return g
}

function cuerpoFisico(def, material) {
  const forma = new CANNON.ConvexPolyhedron({
    vertices: def.vertices.map((v) => new CANNON.Vec3(v[0], v[1], v[2])),
    faces: def.caras.map((c) => c.idx.slice()),
  })
  const b = new CANNON.Body({ mass: 1, material, allowSleep: true, sleepSpeedLimit: 0.12, sleepTimeLimit: 0.35 })
  b.addShape(forma)
  b.angularDamping = 0.12
  b.linearDamping = 0.05
  return b
}

// Qué cara (o vértice, en el d4) quedó arriba
function quedoArriba(def, q) {
  const quat = new THREE.Quaternion(q.x, q.y, q.z, q.w)
  if (def.lados === 4) {
    let mejor = -1, alto = -Infinity
    def.vertices.forEach((v, i) => {
      const y = vecDe(v).applyQuaternion(quat).y
      if (y > alto) { alto = y; mejor = i }
    })
    // Qué tan "parado" quedó: la cara de abajo debe mirar hacia abajo
    const abajo = Math.min(...def.caras.map((c) => vecDe(c.normal).applyQuaternion(quat).y))
    return { indice: mejor, firmeza: -abajo }
  }
  let mejor = -1, dot = -Infinity
  def.caras.forEach((c, i) => {
    const d = vecDe(c.normal).applyQuaternion(quat).dot(ARRIBA)
    if (d > dot) { dot = d; mejor = i }
  })
  return { indice: mejor, firmeza: dot }
}

// ---------------------------------------------------------------------
// La mesa
// ---------------------------------------------------------------------

export function crearMesa(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const escena = new THREE.Scene()
  const camara = new THREE.PerspectiveCamera(32, 1, 0.1, 200)
  camara.position.set(0, 26, 11)
  camara.lookAt(0, 0, 0.6)

  const cielo = new THREE.HemisphereLight(0xfff1dd, 0x3a2a4a, 1.1)
  escena.add(cielo)
  const sol = new THREE.DirectionalLight(0xffe2b8, 2.2)
  sol.position.set(-8, 18, 6)
  sol.castShadow = true
  sol.shadow.mapSize.set(1024, 1024)
  sol.shadow.camera.left = -16; sol.shadow.camera.right = 16
  sol.shadow.camera.top = 16; sol.shadow.camera.bottom = -16
  sol.shadow.radius = 4
  escena.add(sol)

  const piso = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.32 }))
  piso.rotation.x = -Math.PI / 2
  piso.receiveShadow = true
  escena.add(piso)

  // Física
  const mundo = new CANNON.World({ gravity: new CANNON.Vec3(0, -48, 0) })
  mundo.allowSleep = true
  mundo.broadphase = new CANNON.SAPBroadphase(mundo)
  const matDado = new CANNON.Material('dado')
  const matMesa = new CANNON.Material('mesa')
  mundo.addContactMaterial(new CANNON.ContactMaterial(matDado, matMesa, { friction: 0.28, restitution: 0.42 }))
  mundo.addContactMaterial(new CANNON.ContactMaterial(matDado, matDado, { friction: 0.18, restitution: 0.5 }))

  const paredes = []
  let limites = { izq: -8, der: 8, atras: -6, frente: 6 }

  function rehacerParedes() {
    for (const p of paredes) mundo.removeBody(p)
    paredes.length = 0
    const plano = (pos, eje, ang) => {
      const b = new CANNON.Body({ mass: 0, material: matMesa })
      b.addShape(new CANNON.Plane())
      b.position.set(...pos)
      b.quaternion.setFromAxisAngle(new CANNON.Vec3(...eje), ang)
      mundo.addBody(b)
      paredes.push(b)
    }
    plano([0, 0, 0], [1, 0, 0], -Math.PI / 2)
    plano([limites.izq, 0, 0], [0, 1, 0], Math.PI / 2)
    plano([limites.der, 0, 0], [0, 1, 0], -Math.PI / 2)
    plano([0, 0, limites.atras], [0, 1, 0], 0)
    plano([0, 0, limites.frente], [0, 1, 0], Math.PI)
  }

  // Zona libre de la pantalla (en píxeles) donde pueden caer los dados:
  // la interfaz avisa cuánto ocupan la barra de arriba y el panel de abajo.
  let zona = { arriba: 80, abajo: 260, izquierda: 0, derecha: 0 }

  function puntoEnPiso(px, py) {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    const ray = new THREE.Raycaster()
    ray.setFromCamera(new THREE.Vector2((px / w) * 2 - 1, -(py / h) * 2 + 1), camara)
    const p = new THREE.Vector3()
    ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)
    return p
  }

  function calcularLimites() {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    const arriba = Math.min(zona.arriba, h * 0.45)
    const abajo = Math.min(zona.abajo, h * 0.5)
    const si = puntoEnPiso(zona.izquierda, arriba)
    const sd = puntoEnPiso(w - zona.derecha, arriba)
    const ii = puntoEnPiso(zona.izquierda, h - abajo)
    const id = puntoEnPiso(w - zona.derecha, h - abajo)
    const margen = RADIO * 0.9
    let atras = si.z + margen
    let frente = ii.z - margen
    if (frente - atras < 4) { const c = (frente + atras) / 2; atras = c - 2; frente = c + 2 }
    limites = {
      izq: Math.max(si.x, ii.x) + margen,
      der: Math.min(sd.x, id.x) - margen,
      atras,
      frente,
    }
  }

  function ajustarTamano() {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camara.aspect = w / h
    // Altura de la cámara para que el piso visible tenga un ancho cómodo:
    // en celular (vertical) ~10.5 unidades de ancho; en escritorio ~14 de alto.
    const tanV = Math.tan(THREE.MathUtils.degToRad(camara.fov / 2))
    const altura = w < h ? 5.3 / (tanV * camara.aspect) : 7.2 / tanV
    camara.position.set(0, altura, altura * 0.22)
    camara.lookAt(0, 0, 0)
    camara.updateProjectionMatrix()
    calcularLimites()
    rehacerParedes()
    dibujar()
  }

  function ajustarZona(z) {
    zona = { ...zona, ...z }
    calcularLimites()
    rehacerParedes()
  }

  let dados = [] // { malla, bordes, def, cuadros }
  let animando = null

  function dibujar() { renderer.render(escena, camara) }

  function quitarDados() {
    for (const d of dados) {
      escena.remove(d.malla)
      d.malla.geometry.dispose()
      if (d.texPropia) d.texPropia.dispose()
      d.malla.material.dispose()
    }
    dados = []
  }

  function simular(lista, desdeArriba) {
    const cuerpos = lista.map((d) => {
      const def = poliedro(d.lados, RADIO * (d.lados === 4 ? 1.15 : d.lados === 20 ? 1.05 : 1))
      const b = cuerpoFisico(def, matDado)
      mundo.addBody(b)
      return { def, b }
    })
    const n = cuerpos.length
    const signoZ = desdeArriba ? -1 : 1
    cuerpos.forEach(({ b }, i) => {
      const col = i % 5, fila = Math.floor(i / 5)
      const centroX = (limites.izq + limites.der) / 2
      const ancho = limites.der - limites.izq
      const sep = Math.min(RADIO * 2.3, (ancho - RADIO * 2) / Math.max(1, Math.min(n, 5) - 1))
      const x = centroX + (col - (Math.min(n, 5) - 1) / 2) * sep + (Math.random() - 0.5) * 0.4
      const z = desdeArriba ? limites.atras + RADIO + fila * RADIO * 2.2 : limites.frente - RADIO - fila * RADIO * 2.2
      b.position.set(x, 3 + Math.random() * 1.5 + fila * 0.6, z)
      b.quaternion.setFromEuler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28)
      b.velocity.set((Math.random() - 0.5) * 8 - (x - centroX) * 0.6, -2 - Math.random() * 3, -signoZ * (14 + Math.random() * 9))
      b.angularVelocity.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30)
      b.wakeUp()
    })

    const cuadros = cuerpos.map(() => [])
    let t = 0
    for (; t < MAX_CUADROS; t++) {
      mundo.step(DT)
      cuerpos.forEach(({ b }, i) => {
        cuadros[i].push([b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w])
      })
      if (t > 30 && cuerpos.every(({ b }) => b.sleepState === CANNON.Body.SLEEPING)) break
    }
    const finales = cuerpos.map(({ def, b }) => quedoArriba(def, b.quaternion))
    for (const { b } of cuerpos) mundo.removeBody(b)
    return { cuerpos, cuadros, finales }
  }

  /**
   * Lanza dados. lista: [{ lados, valor, estilo, descartado }]
   * Devuelve una promesa que se cumple cuando todos se detienen.
   */
  function lanzar(lista, { desdeArriba = false, instantaneo = false } = {}) {
    if (animando) { cancelAnimationFrame(animando.raf); animando.resolver(); animando = null }
    quitarDados()
    const soportados = lista.filter((d) => [4, 6, 8, 10, 12, 20].includes(d.lados))
    if (!soportados.length) return Promise.resolve()

    // Si algún dado quedó "chueco" (apoyado en una orilla), se repite la simulación
    let sim
    for (let intento = 0; intento < 6; intento++) {
      sim = simular(soportados, desdeArriba)
      if (sim.finales.every((f, i) => f.firmeza > (soportados[i].lados === 4 ? 0.95 : 0.93))) break
    }

    sim.cuerpos.forEach(({ def }, i) => {
      const d = soportados[i]
      const arriba = sim.finales[i].indice
      const estilo = ESTILOS[d.estilo] ? d.estilo : 'normal'
      const est = ESTILOS[estilo]
      let geo, tex, texPropia = null
      if (def.lados === 4) {
        const vv = def.verticeValores.slice()
        const k = vv.indexOf(d.valor)
        ;[vv[arriba], vv[k]] = [vv[k], vv[arriba]]
        tex = texPropia = texturaD4(def, vv, estilo)
        geo = geometriaDado(def, null, 2, 2)
      } else {
        const et = def.valores.slice()
        const k = et.indexOf(d.valor)
        ;[et[arriba], et[k]] = [et[k], et[arriba]]
        const at = atlas(def.lados, estilo)
        tex = at.tex
        geo = geometriaDado(def, et, at.cols, at.filas)
      }
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        metalness: est.metal,
        roughness: est.aspereza,
        emissive: new THREE.Color(est.brillo),
        emissiveIntensity: 0.35,
        flatShading: true,
        transparent: true,
      })
      const malla = new THREE.Mesh(geo, mat)
      malla.castShadow = true
      const bordes = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo, 10),
        new THREE.LineBasicMaterial({ color: est.borde, transparent: true, opacity: 0.55 })
      )
      malla.add(bordes)
      escena.add(malla)
      dados.push({ malla, def, cuadros: sim.cuadros[i], descartado: d.descartado, texPropia })
    })

    const total = Math.max(...dados.map((d) => d.cuadros.length))
    const poner = (cuadro) => {
      for (const d of dados) {
        const f = d.cuadros[Math.min(cuadro, d.cuadros.length - 1)]
        d.malla.position.set(f[0], f[1], f[2])
        d.malla.quaternion.set(f[3], f[4], f[5], f[6])
      }
    }
    const atenuarDescartados = () => {
      for (const d of dados) if (d.descartado) d.malla.material.opacity = 0.35
    }

    if (instantaneo) {
      poner(total - 1)
      atenuarDescartados()
      dibujar()
      return Promise.resolve()
    }

    return new Promise((resolver) => {
      const inicio = performance.now()
      const paso = (ahora) => {
        const cuadro = Math.floor(((ahora - inicio) / 1000) * 60)
        poner(cuadro)
        dibujar()
        if (cuadro < total - 1) {
          animando.raf = requestAnimationFrame(paso)
        } else {
          animando = null
          atenuarDescartados()
          dibujar()
          resolver()
        }
      }
      animando = { raf: requestAnimationFrame(paso), resolver }
    })
  }

  // Luz según el momento del día del fondo
  const LUCES = {
    amanecer:  { cielo: 0xffd9e0, suelo: 0x4a3150, sol: 0xffc9a8, fuerza: 2.0 },
    dia:       { cielo: 0xfff6e6, suelo: 0x4f5a4a, sol: 0xfff0d6, fuerza: 2.4 },
    atardecer: { cielo: 0xffe0bd, suelo: 0x45263f, sol: 0xffb37a, fuerza: 2.3 },
    noche:     { cielo: 0xc4cdfa, suelo: 0x1c1830, sol: 0xb8c4ff, fuerza: 1.6 },
  }
  function ajustarLuz(momento) {
    const l = LUCES[momento] || LUCES.atardecer
    cielo.color.setHex(l.cielo)
    cielo.groundColor.setHex(l.suelo)
    sol.color.setHex(l.sol)
    sol.intensity = l.fuerza
    dibujar()
  }

  function limpiar() {
    quitarDados()
    dibujar()
  }

  // Las texturas de los números necesitan la tipografía ya cargada
  document.fonts?.load('900 64px "Zen Old Mincho"').then(() => {
    for (const a of atlasCache.values()) a.tex.dispose()
    atlasCache.clear()
  }).catch(() => {})

  const obs = new ResizeObserver(ajustarTamano)
  obs.observe(canvas)
  ajustarTamano()

  return {
    lanzar,
    limpiar,
    ajustarZona,
    ajustarLuz,
    destruir() {
      obs.disconnect()
      if (animando) cancelAnimationFrame(animando.raf)
      quitarDados()
      renderer.dispose()
    },
  }
}

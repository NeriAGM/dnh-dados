// Geometría de los dados: d4, d6, d8, d10, d12 y d20.
//
// Cada dado se describe solo con sus vértices; las caras se calculan solas:
// se buscan los planos que dejan todos los vértices de un mismo lado
// (eso es la "envolvente convexa", el cascarón del sólido).
// Así no hay que escribir a mano las 20 caras del d20.

const PHI = (1 + Math.sqrt(5)) / 2

function vertices(lados) {
  switch (lados) {
    case 4:
      return [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]
    case 6: {
      const v = []
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z])
      return v
    }
    case 8:
      return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
    case 10: {
      // Trapezoedro pentagonal: dos puntas y un anillo de 10 vértices que
      // sube y baja. La altura b hace que cada "papalote" (kite) sea plano:
      // b = a·(1 − cos36°)/(1 + cos36°)
      const a = 1.0
      const c36 = Math.cos(Math.PI / 5)
      const b = (a * (1 - c36)) / (1 + c36)
      const v = [[0, a, 0], [0, -a, 0]]
      for (let k = 0; k < 10; k++) {
        const ang = (k * Math.PI) / 5
        v.push([Math.cos(ang), k % 2 === 0 ? -b : b, Math.sin(ang)])
      }
      return v
    }
    case 12: {
      const v = []
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z])
      const i = 1 / PHI
      for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {
        v.push([0, s1 * i, s2 * PHI])
        v.push([s1 * i, s2 * PHI, 0])
        v.push([s1 * PHI, 0, s2 * i])
      }
      return v
    }
    case 20: {
      const v = []
      for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {
        v.push([0, s1, s2 * PHI])
        v.push([s1, s2 * PHI, 0])
        v.push([s2 * PHI, 0, s1])
      }
      return v
    }
    default:
      throw new Error(`No sé dibujar un d${lados}`)
  }
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const largo = (a) => Math.hypot(a[0], a[1], a[2])
const norm = (a) => { const l = largo(a); return [a[0] / l, a[1] / l, a[2] / l] }
const escala = (a, s) => [a[0] * s, a[1] * s, a[2] * s]

function caras(vs) {
  const EPS = 1e-6
  const encontradas = []
  for (let i = 0; i < vs.length; i++)
    for (let j = i + 1; j < vs.length; j++)
      for (let k = j + 1; k < vs.length; k++) {
        let n = cruz(sub(vs[j], vs[i]), sub(vs[k], vs[i]))
        if (largo(n) < EPS) continue
        n = norm(n)
        let d = punto(n, vs[i])
        let pos = 0, neg = 0
        for (const v of vs) {
          const s = punto(n, v) - d
          if (s > EPS) pos++
          else if (s < -EPS) neg++
        }
        if (pos && neg) continue
        if (pos) { n = escala(n, -1); d = -d } // que la normal apunte hacia afuera
        if (encontradas.some((f) => punto(f.normal, n) > 1 - 1e-6)) continue
        const idx = vs.map((v, q) => [v, q]).filter(([v]) => Math.abs(punto(n, v) - d) < 1e-5).map(([, q]) => q)
        encontradas.push({ normal: n, idx })
      }

  // Ordenar los vértices de cada cara en sentido antihorario visto desde afuera
  for (const f of encontradas) {
    const c = escala(f.idx.reduce((acc, q) => [acc[0] + vs[q][0], acc[1] + vs[q][1], acc[2] + vs[q][2]], [0, 0, 0]), 1 / f.idx.length)
    const u = norm(sub(vs[f.idx[0]], c))
    const w = cruz(f.normal, u)
    f.idx.sort((p, q) => {
      const vp = sub(vs[p], c), vq = sub(vs[q], c)
      return Math.atan2(punto(vp, w), punto(vp, u)) - Math.atan2(punto(vq, w), punto(vq, u))
    })
    f.centro = c
  }
  return encontradas
}

// Numeración tipo dado real: caras opuestas suman lados + 1.
function numerar(lados, fs) {
  const valores = new Array(fs.length).fill(0)
  const libres = fs.map((_, i) => i)
  let siguiente = 1
  while (libres.length) {
    const i = libres.shift()
    let j = -1, mejor = 2
    for (const q of libres) {
      const p = punto(fs[i].normal, fs[q].normal)
      if (p < mejor) { mejor = p; j = q }
    }
    valores[i] = siguiente
    if (j >= 0 && mejor < -0.99) {
      valores[j] = lados + 1 - siguiente
      libres.splice(libres.indexOf(j), 1)
    }
    siguiente++
    while (valores.includes(siguiente)) siguiente++
  }
  return valores
}

const cache = new Map()

/**
 * Devuelve la descripción de un dado, normalizada a radio `radio`.
 * { lados, vertices, caras: [{ idx, normal, centro }], valores, verticeValores? }
 * En el d4 el resultado es el VÉRTICE que queda arriba, así que los números
 * viven en los vértices (verticeValores) y no en las caras.
 */
export function poliedro(lados, radio = 1) {
  const clave = `${lados}:${radio}`
  if (cache.has(clave)) return cache.get(clave)
  const crudos = vertices(lados)
  const r = Math.max(...crudos.map(largo))
  const vs = crudos.map((v) => escala(v, radio / r))
  const fs = caras(vs)
  if (fs.length !== (lados === 4 ? 4 : lados)) {
    throw new Error(`El d${lados} salió con ${fs.length} caras`)
  }
  const def = { lados, vertices: vs, caras: fs }
  if (lados === 4) def.verticeValores = [1, 2, 3, 4]
  else def.valores = numerar(lados, fs)
  cache.set(clave, def)
  return def
}

export const DADOS_SOPORTADOS = [4, 6, 8, 10, 12, 20]

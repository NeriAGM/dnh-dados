import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { cuadroEn, indiceCuadro, crearFisica, geometriaDado, etiquetar, limitesSeguros, anguloD4 } from './mesa.js'
import { poliedro } from './poliedros.js'

test('dados: el cuadro nunca es negativo aunque el navegador dé una hora anterior al inicio', () => {
  // El error real: requestAnimationFrame entregó un tiempo 3 ms antes del inicio
  assert.equal(cuadroEn(1000 - 3, 1000), 0)
  assert.equal(cuadroEn(1000, 1000), 0)
  assert.equal(cuadroEn(1000 + 1000, 1000), 60, 'un segundo = 60 cuadros')
})

test('dados: el índice de la grabación siempre cae dentro de ella', () => {
  assert.equal(indiceCuadro(-1, 100), 0)
  assert.equal(indiceCuadro(250, 100), 99)
  assert.equal(indiceCuadro(NaN, 100), 0)
  assert.equal(indiceCuadro(42, 100), 42)
})

// ---------------------------------------------------------------------
// Qué número se VE arriba, calculado solo con la geometría que se dibuja
// (posiciones + coordenadas de textura) y el último cuadro de la grabación.
// No usa quedoArriba: así se comprueba de forma independiente.
// ---------------------------------------------------------------------

function triangulos(geo) {
  const p = geo.getAttribute('position'), uv = geo.getAttribute('uv')
  const lista = []
  for (let i = 0; i < p.count; i += 3) {
    lista.push({
      v: [0, 1, 2].map((k) => new THREE.Vector3(p.getX(i + k), p.getY(i + k), p.getZ(i + k))),
      uv: [0, 1, 2].map((k) => [uv.getX(i + k), uv.getY(i + k)]),
    })
  }
  return lista
}

function numeroVisibleArriba(def, etiquetas, cuadro) {
  const q = new THREE.Quaternion(cuadro[3], cuadro[4], cuadro[5], cuadro[6])
  if (def.lados === 4) {
    // El d4 se lee en el vértice de arriba: el número dibujado en la esquina
    // de la textura que corresponde a ese vértice
    const tris = triangulos(geometriaDado(def, null, 2, 2))
    let alto = -Infinity, arriba = null
    for (const t of tris) for (const v of t.v) {
      const y = v.clone().applyQuaternion(q).y
      if (y > alto) { alto = y; arriba = v }
    }
    const vistos = new Set()
    def.caras.forEach((cara, i) => {
      const t = tris[i] // una cara del d4 = un triángulo
      const k = t.v.findIndex((v) => v.distanceTo(arriba) < 1e-6)
      if (k < 0) return
      // Ángulo de esa esquina en la celda de la textura (lienzo con y hacia abajo)
      const cx = (i % 2) + 0.5, cy = Math.floor(i / 2) + 0.5
      const [u, vv] = t.uv[k]
      const ang = Math.atan2((1 - vv) * 2 - cy, u * 2 - cx)
      // El número que la textura dibuja más cerca de esa esquina
      let mejor = 0, dist = Infinity
      for (let j = 0; j < 3; j++) {
        const d = Math.abs(Math.atan2(Math.sin(ang - anguloD4(j)), Math.cos(ang - anguloD4(j))))
        if (d < dist) { dist = d; mejor = j }
      }
      vistos.add(etiquetas[cara.idx[mejor]])
    })
    assert.equal(vistos.size, 1, 'las tres caras deben mostrar el mismo número en la punta de arriba')
    return [...vistos][0]
  }
  const cols = Math.ceil(Math.sqrt(def.lados)), filas = Math.ceil(def.lados / cols)
  const tris = triangulos(geometriaDado(def, etiquetas, cols, filas))
  let mejor = null, dot = -Infinity
  for (const t of tris) {
    const [a, b, c] = t.v.map((v) => v.clone().applyQuaternion(q))
    const n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize()
    if (n.y > dot) { dot = n.y; mejor = t }
  }
  const u = (mejor.uv[0][0] + mejor.uv[1][0] + mejor.uv[2][0]) / 3
  const v = (mejor.uv[0][1] + mejor.uv[1][1] + mejor.uv[2][1]) / 3
  return Math.floor((1 - v) * filas) * cols + Math.floor(u * cols) + 1
}

function azarEntero(n) { return 1 + Math.floor(Math.random() * n) }

test('dados: en cada tipo de dado, el número de arriba es el que dio el servidor', () => {
  const fisica = crearFisica()
  fisica.ponerLimites({ izq: -5, der: 5, atras: -4, frente: 4 })
  for (const lados of [4, 6, 8, 10, 12, 20]) {
    for (let i = 0; i < 40; i++) {
      // Un dado solo, dos iguales y uno con otros (choques entre dados)
      const lista = i % 3 === 0 ? [{ lados, valor: azarEntero(lados) }]
        : i % 3 === 1 ? [{ lados, valor: azarEntero(lados) }, { lados, valor: azarEntero(lados) }]
        : [{ lados, valor: azarEntero(lados) }, { lados: 12, valor: azarEntero(12) }, { lados: 6, valor: azarEntero(6) }]
      // También cada valor extremo: 1 y el máximo
      if (i === 1) lista[0].valor = 1
      if (i === 2) lista[0].valor = lados
      const res = fisica.lanzamiento(lista, i % 2 === 0)
      res.forEach((r, j) => {
        const visto = numeroVisibleArriba(r.def, r.etiquetas, r.cuadros.at(-1))
        assert.equal(visto, lista[j].valor, `d${lista[j].lados}: se ve ${visto} y el servidor dijo ${lista[j].valor}`)
        // El dado sigue teniendo todos sus números, sin repetir
        assert.deepEqual([...r.etiquetas].sort((a, b) => a - b), Array.from({ length: r.def.lados === 4 ? 4 : r.def.lados }, (_, k) => k + 1))
      })
    }
  }
})

test('dados: los números no se ven en espejo (la textura gira igual que la cara)', () => {
  for (const lados of [4, 6, 8, 10, 12, 20]) {
    const def = poliedro(lados)
    const cols = Math.ceil(Math.sqrt(lados)), filas = Math.ceil(lados / cols)
    const geo = lados === 4 ? geometriaDado(def, null, 2, 2) : geometriaDado(def, def.valores, cols, filas)
    for (const t of triangulos(geo)) {
      const [a, b, c] = t.v
      const n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a))
      const haciaFuera = n.dot(a) > 0 // el triángulo está en sentido antihorario visto desde afuera
      const [p, q, r] = t.uv
      const areaUV = (q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1])
      assert.ok(haciaFuera, `d${lados}: triángulo volteado`)
      assert.ok(areaUV > 0, `d${lados}: la textura queda en espejo`)
    }
  }
})

test('dados: etiquetar nunca rompe el dado con datos raros', () => {
  const d6 = poliedro(6)
  const original = console.error
  console.error = () => {}
  try {
    assert.deepEqual([...etiquetar(d6, -1, 3)].sort(), [1, 2, 3, 4, 5, 6])
    assert.deepEqual([...etiquetar(d6, 2, 9)].sort(), [1, 2, 3, 4, 5, 6])
  } finally { console.error = original }
  const et = etiquetar(d6, 4, 6)
  assert.equal(et[4], 6)
})

test('dados: con la zona libre muy angosta o cruzada, las paredes no quedan al revés', () => {
  const l = limitesSeguros({ izq: 3, der: 1, atras: -2, frente: 5 })
  assert.ok(l.der - l.izq >= 4)
  assert.equal((l.izq + l.der) / 2, 2)
  const m = limitesSeguros({ izq: NaN, der: NaN, atras: 0, frente: 1 })
  assert.ok(Number.isFinite(m.izq) && m.der - m.izq >= 4 && m.frente - m.atras >= 4)

  // Antes, con izq > der los dados salían disparados fuera de la mesa
  const fisica = crearFisica()
  fisica.ponerLimites({ izq: 2, der: 0.5, atras: -3, frente: 3 })
  const lista = Array.from({ length: 6 }, () => ({ lados: 6, valor: azarEntero(6) }))
  for (const r of fisica.lanzamiento(lista, false)) {
    const [x, y, z] = r.cuadros.at(-1)
    const lim = fisica.limites
    assert.ok([x, y, z].every(Number.isFinite))
    assert.ok(x > lim.izq - 0.5 && x < lim.der + 0.5, `x=${x} fuera de ${lim.izq}…${lim.der}`)
    assert.ok(y < 3, 'quedó en el piso')
  }
})

test('dados: 40 dados (el máximo del servidor) caen dentro de la mesa y muestran su valor', () => {
  const fisica = crearFisica()
  // Una mesa chica como la de un celular
  fisica.ponerLimites({ izq: -3.5, der: 3.5, atras: -2.5, frente: 2.5 })
  const lista = Array.from({ length: 40 }, (_, i) => {
    const lados = [4, 6, 8, 10, 12, 20][i % 6]
    return { lados, valor: azarEntero(lados) }
  })
  const res = fisica.lanzamiento(lista, false)
  const lim = fisica.limites
  res.forEach((r, j) => {
    const [x, , z] = r.cuadros.at(-1)
    assert.ok(x > lim.izq - 0.5 && x < lim.der + 0.5 && z > lim.atras - 0.5 && z < lim.frente + 0.5, `dado ${j} fuera de la mesa`)
    assert.equal(numeroVisibleArriba(r.def, r.etiquetas, r.cuadros.at(-1)), lista[j].valor)
  })
})

test('dados: la animación termina cuando los dados se ven quietos (antes el d12 duraba siempre 7 s)', () => {
  const fisica = crearFisica()
  fisica.ponerLimites({ izq: -7, der: 7, atras: -4.5, frente: 4.5 })
  let cuadros = 0
  for (let i = 0; i < 12; i++) {
    const res = fisica.lanzamiento([{ lados: 12, valor: 1 }, { lados: 12, valor: 2 }], false)
    cuadros += Math.max(...res.map((r) => r.cuadros.length))
  }
  const promedio = cuadros / 12
  assert.ok(promedio < 60 * 5, `la Dualidad dura en promedio ${(promedio / 60).toFixed(1)} s`)
})

test('dados: muchos dados no congelan la página repitiendo simulaciones', () => {
  const fisica = crearFisica()
  fisica.ponerLimites({ izq: -3.5, der: 3.5, atras: -2.5, frente: 2.5 })
  const lista = Array.from({ length: 20 }, (_, i) => ({ lados: [6, 12, 20, 8][i % 4], valor: 1 }))
  const inicio = performance.now()
  fisica.lanzamiento(lista, false)
  const ms = performance.now() - inicio
  // Antes: ~8 s (8 simulaciones completas). Margen amplio para máquinas lentas.
  assert.ok(ms < 4000, `20 dados tardaron ${ms.toFixed(0)} ms en simularse`)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearCola } from './cola.js'

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

// Servidor de mentira: cada guardado tarda "ms" y se aplica al llegar
function servidor(ms = 20) {
  const filas = { e1: { adversarios: [] } }
  const llamadas = []
  let enVuelo = 0, maximo = 0
  async function guardar(id, cambios) {
    llamadas.push(structuredClone(cambios))
    enVuelo++; maximo = Math.max(maximo, enVuelo)
    await dormir(ms)
    enVuelo--
    if (cambios.falla) throw new Error('sin red')
    filas[id] = { ...filas[id], ...cambios }
  }
  return { filas, llamadas, guardar, get maximo() { return maximo } }
}

test('dos clics rápidos: no se pierde el daño de en medio y la pantalla no regresa', async () => {
  const s = servidor()
  let vista = {}
  const cola = crearCola(s.guardar, { gracia: 30, alCambiar: (v) => { vista = v } })
  // Lo que ve el DJ = fila del servidor + copia local
  const lista = () => (vista.e1?.adversarios ?? s.filas.e1.adversarios)

  // Clic 1: daño a A. Clic 2 (antes de que conteste el servidor): daño a B, partiendo de lo que se ve
  const p1 = cola.poner('e1', { adversarios: [{ uid: 'A', pg: 1 }, { uid: 'B', pg: 0 }] })
  const conA = lista()
  assert.equal(conA[0].pg, 1)
  const p2 = cola.poner('e1', { adversarios: conA.map((x) => (x.uid === 'B' ? { ...x, pg: 2 } : x)) })
  await p1
  // Aunque el primer guardado ya respondió, se sigue viendo el daño de B
  assert.deepEqual(lista().map((x) => x.pg), [1, 2])
  await p2
  assert.deepEqual(s.filas.e1.adversarios.map((x) => x.pg), [1, 2])
  assert.equal(s.maximo, 1, 'nunca hay dos guardados a la vez')
  // Pasada la gracia, la pantalla vuelve a la fila del servidor (que ya es la buena)
  await dormir(60)
  assert.deepEqual(vista, {})
  assert.deepEqual(lista().map((x) => x.pg), [1, 2])
})

test('muchos clics mientras va un guardado se juntan en uno solo con lo más nuevo', async () => {
  const s = servidor(30)
  const cola = crearCola(s.guardar, { gracia: 5 })
  const promesas = [1, 2, 3, 4, 5].map((n) => cola.poner('c1', { valor: 10 - n }))
  await Promise.all(promesas)
  assert.deepEqual(s.llamadas, [{ valor: 9 }, { valor: 5 }])
})

test('si falla, se tira la copia local y la promesa avisa el error', async () => {
  const s = servidor(5)
  let vista = {}
  const cola = crearCola(s.guardar, { gracia: 5, alCambiar: (v) => { vista = v } })
  await assert.rejects(cola.poner('e1', { falla: true }), /sin red/)
  assert.deepEqual(vista, {})
  // Y lo que sigue se guarda normal
  await cola.poner('e1', { nombre: 'Puente' })
  assert.equal(s.filas.e1.nombre, 'Puente')
})

test('esperar() aguarda a que se mande todo; olvidar() suelta la fila borrada', async () => {
  const s = servidor(10)
  let vista = {}
  const cola = crearCola(s.guardar, { gracia: 1000, alCambiar: (v) => { vista = v } })
  cola.poner('e1', { pjs: 3 })
  await cola.esperar()
  assert.equal(s.filas.e1.pjs, 3)
  assert.ok(vista.e1)
  cola.olvidar('e1')
  assert.deepEqual(vista, {})
  assert.equal(cola.local('e1'), null)
})

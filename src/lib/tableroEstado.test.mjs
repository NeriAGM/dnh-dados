// Pruebas del estado del tablero (tablero.svelte.js) con un Supabase de mentira.
// Como en mesa.test.mjs: el archivo usa runas, se compila aquí con Svelte y se
// le cambian las importaciones por piezas falsas (cliente, app y lore).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { compileModule } from 'svelte/compiler'

const aqui = dirname(fileURLToPath(import.meta.url))
const tmp = join(aqui, '../../node_modules/.cache/pruebas-tablero')
mkdirSync(tmp, { recursive: true })
writeFileSync(join(tmp, 'supabase-falso.mjs'), 'export const supabase = new Proxy({}, { get: (_, k) => globalThis.__tableroSupabase[k] })\n')
writeFileSync(join(tmp, 'app-falsa.mjs'), 'export const app = new Proxy({}, { get: (_, k) => globalThis.__tableroApp[k], set: (_, k, v) => { globalThis.__tableroApp[k] = v; return true } })\n')
writeFileSync(join(tmp, 'lore-falso.mjs'), 'export const reducir = async (a) => a\n')
const url = (f) => `'${pathToFileURL(join(aqui, f)).href}'`
const fuente = compileModule(readFileSync(join(aqui, 'tablero.svelte.js'), 'utf8'), { filename: 'tablero.svelte.js', generate: 'client' }).js.code
  .replace("'./supabase.js'", "'./supabase-falso.mjs'")
  .replace("'./mesa.svelte.js'", "'./app-falsa.mjs'")
  .replace("'./lore.svelte.js'", "'./lore-falso.mjs'")
  .replace("'./filas.js'", url('filas.js'))
  .replace("'./fondo/ajustes.js'", url('fondo/ajustes.js'))
  .replace("'./tablero.js'", url('tablero.js'))
writeFileSync(join(tmp, 'tablero.mjs'), fuente)

let vez = 0
const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms))
function diferida() {
  let resolver
  const promesa = new Promise((r) => (resolver = r))
  return { promesa, resolver }
}

// Cliente falso: anota cada consulta y responde lo que diga responder(op)
function clienteFalso(responder) {
  const ops = []
  const canales = []
  const from = (tabla) => {
    const op = { tabla, accion: 'select', filtros: {} }
    const q = {
      select() { return q }, order() { return q }, single() { return q },
      insert(v) { op.accion = 'insert'; op.valores = v; return q },
      update(v) { op.accion = 'update'; op.valores = v; return q },
      delete() { op.accion = 'delete'; return q },
      eq(k, v) { op.filtros[k] = v; return q },
      then(ok, mal) { ops.push(op); return Promise.resolve(responder(op)).then(ok, mal) },
    }
    return q
  }
  return {
    ops, canales, from,
    rpc(rpc, args) { const op = { rpc, args }; ops.push(op); return Promise.resolve(responder(op)) },
    channel(nombre) {
      const c = { nombre, handlers: [], enviados: [] }
      c.on = (tipo, filtro, fn) => { c.handlers.push({ tipo, filtro, fn }); return c }
      c.subscribe = () => c
      c.send = (m) => { c.enviados.push(m); return Promise.resolve('ok') }
      c.emitir = (tabla, evento, payload) => {
        for (const h of c.handlers) {
          if (h.tipo !== 'postgres_changes' || h.filtro.table !== tabla) continue
          if (h.filtro.event !== '*' && h.filtro.event !== evento) continue
          if (evento === 'DELETE' && h.filtro.filter) continue
          h.fn({ eventType: evento, ...payload })
        }
      }
      c.difundir = (evento, payload) => { for (const h of c.handlers) if (h.tipo === 'broadcast' && h.filtro.event === evento) h.fn({ payload }) }
      canales.push(c)
      return c
    },
    removeChannel() {},
  }
}

async function preparar(app, responder = () => ({ data: [], error: null })) {
  globalThis.__tableroApp = { demo: false, campania: null, rol: null, personajes: [], personajeActivo: null, sesion: null, ...app }
  globalThis.__tableroSupabase = clienteFalso(responder)
  const m = await import(`${pathToFileURL(join(tmp, 'tablero.mjs')).href}?v=${++vez}`)
  return { m, cliente: globalThis.__tableroSupabase, app: globalThis.__tableroApp }
}

const T1 = { id: 't1', campania_id: 'c1', nombre: 'Valle', imagen: null, texto: '', niebla: null, tam_ficha: 0.05, actualizado: '2026-11-15T10:00:00+00:00' }
const T2 = { ...T1, id: 't2', nombre: 'Cueva' }

test('sin campaña no le pide nada a Supabase', async () => {
  const { m, cliente } = await preparar({})
  m.sincronizarTablero()
  await esperar(5)
  assert.deepEqual(cliente.ops, [])
  assert.equal(cliente.canales.length, 0)
})

test('el jugador vuelve a leer el tablero cuando el DJ muestra otro', async () => {
  let visibles = [T1]
  const { m, app } = await preparar({ campania: { id: 'c1', tablero_id: 't1' }, rol: 'jugador' }, (op) =>
    ({ data: op.tabla === 'tableros' ? visibles : [], error: null }))
  m.sincronizarTablero()
  await esperar(5)
  assert.equal(m.tableroVisible()?.nombre, 'Valle')
  visibles = [T2]
  app.campania = { id: 'c1', tablero_id: 't2' }
  m.sincronizarTablero()
  // Mientras llega la lectura, no se queda mostrando el tablero anterior
  assert.equal(m.tableroVisible(), null)
  await esperar(5)
  assert.equal(m.tableroVisible()?.nombre, 'Cueva')
})

test('moverFicha: un eco viejo del tiempo real no regresa la ficha', async () => {
  const ficha = { id: 'f1', tablero_id: 't1', campania_id: 'c1', personaje_id: null, nombre: 'Lobo', color: '#a77ce8', x: 0.1, y: 0.1, actualizado: '2026-11-15T10:00:00+00:00' }
  const rpc = diferida()
  const { m, cliente } = await preparar({ campania: { id: 'c1', tablero_id: 't1' }, rol: 'dj' }, (op) => {
    if (op.rpc === 'mover_ficha') return rpc.promesa
    return { data: op.tabla === 'tableros' ? [T1] : op.tabla === 'fichas' ? [ficha] : [], error: null }
  })
  m.sincronizarTablero()
  await esperar(5)
  m.moverFicha('f1', 0.5, 0.6)
  assert.equal(m.tablero.fichas[0].x, 0.5)
  const canal = cliente.canales[0]
  // Llega tarde el eco de un cambio anterior: mientras hay escritura en camino se ignora
  canal.emitir('fichas', 'UPDATE', { new: { ...ficha, x: 0.1, y: 0.1 } })
  assert.equal(m.tablero.fichas[0].x, 0.5)
  rpc.resolver({ data: { ...ficha, x: 0.5, y: 0.6, actualizado: '2026-11-15T10:00:05+00:00' }, error: null })
  await esperar(5)
  // Y después de la respuesta, un eco más viejo tampoco la regresa
  canal.emitir('fichas', 'UPDATE', { new: { ...ficha, x: 0.1, actualizado: '2026-11-15T10:00:01+00:00' } })
  assert.deepEqual([m.tablero.fichas[0].x, m.tablero.fichas[0].y], [0.5, 0.6])
  assert.deepEqual(cliente.ops.find((o) => o.rpc)?.args, { p_ficha: 'f1', p_x: 0.5, p_y: 0.6 })
})

test('una señal ajena con color o posición raros se limpia antes de dibujarse', async () => {
  const { m, cliente } = await preparar({ campania: { id: 'c1', tablero_id: 't1' }, rol: 'jugador' }, (op) =>
    ({ data: op.tabla === 'tableros' ? [T1] : [], error: null }))
  m.sincronizarTablero()
  await esperar(5)
  const canal = cliente.canales[0]
  canal.difundir('senal', { tablero_id: 't1', x: 5, y: -1, color: 'red;background:url(x)' })
  canal.difundir('senal', { tablero_id: 'otro', x: 0.5, y: 0.5, color: '#ffffff' })
  assert.equal(m.tablero.senales.length, 1)
  const s = m.tablero.senales[0]
  assert.deepEqual([s.x, s.y, s.color], [1, 0, '#a77ce8'])
})

test('un borrado de ficha llega aunque el canal filtrado no lo reciba', async () => {
  const ficha = { id: 'f9', tablero_id: 't1', campania_id: 'c1', nombre: 'X', color: '#a77ce8', x: 0.5, y: 0.5 }
  const { m, cliente } = await preparar({ campania: { id: 'c1', tablero_id: 't1' }, rol: 'jugador' }, (op) =>
    ({ data: op.tabla === 'tableros' ? [T1] : op.tabla === 'fichas' ? [ficha] : [], error: null }))
  m.sincronizarTablero()
  await esperar(5)
  assert.equal(m.tablero.fichas.length, 1)
  cliente.canales[0].emitir('fichas', 'DELETE', { old: { id: 'f9' } })
  assert.equal(m.tablero.fichas.length, 0)
})

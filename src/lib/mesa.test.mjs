// Pruebas del estado global (mesa.svelte.js) con un Supabase de mentira.
// El archivo usa runas de Svelte: se compila aquí mismo con el compilador de
// Svelte y se importa con el cliente falso en lugar de supabase.js.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { compileModule } from 'svelte/compiler'

const aqui = dirname(fileURLToPath(import.meta.url))
// Dentro del proyecto para que "svelte/internal/client" se resuelva desde node_modules
const tmp = join(aqui, '../../node_modules/.cache/pruebas-mesa')
mkdirSync(tmp, { recursive: true })
writeFileSync(join(tmp, 'supabase-falso.mjs'),
  'export const supabase = new Proxy({}, { get: (_, k) => globalThis.__supabaseFalso[k] })\n')
const fuente = compileModule(readFileSync(join(aqui, 'mesa.svelte.js'), 'utf8'), { filename: 'mesa.svelte.js', generate: 'client' }).js.code
  .replace("'./supabase.js'", "'./supabase-falso.mjs'")
  .replace("'./filas.js'", `'${pathToFileURL(join(aqui, 'filas.js')).href}'`)
  .replace("'./ajustes.js'", `'${pathToFileURL(join(aqui, 'ajustes.js')).href}'`)
writeFileSync(join(tmp, 'mesa.mjs'), fuente)

let vez = 0
// Una copia nueva del módulo (estado limpio) por prueba
async function cargarMesa() {
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }
  return import(`${pathToFileURL(join(tmp, 'mesa.mjs')).href}?v=${++vez}`)
}

const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms))

// Promesa que la prueba resuelve cuando quiera (para ordenar respuestas)
function diferida() {
  let resolver
  const promesa = new Promise((r) => (resolver = r))
  return { promesa, resolver }
}

// Cliente falso: cada consulta llama a responder(op) y regresa lo que diga.
// op = { tabla, accion, filtros, valores } o { rpc, args }
function clienteFalso(responder) {
  const canales = []
  const consulta = (tabla) => {
    const op = { tabla, accion: 'select', filtros: {}, valores: null }
    const q = {
      select() { return q },
      insert(v) { op.accion = 'insert'; op.valores = v; return q },
      update(v) { op.accion = 'update'; op.valores = v; return q },
      delete() { op.accion = 'delete'; return q },
      eq(k, v) { op.filtros[k] = v; return q },
      order() { return q },
      limit() { return q },
      single() { op.uno = true; return q },
      maybeSingle() { op.uno = true; return q },
      then(ok, mal) { return Promise.resolve(responder(op)).then(ok, mal) },
    }
    return q
  }
  const cliente = {
    canales,
    from: consulta,
    rpc: (nombre, args) => {
      const p = Promise.resolve().then(() => responder({ rpc: nombre, args }))
      return { then: (ok, mal) => p.then(ok, mal) }
    },
    channel(nombre) {
      const c = { nombre, handlers: [], quitado: false, alSuscribir: null }
      c.on = (_tipo, filtro, fn) => { c.handlers.push({ filtro, fn }); return c }
      c.subscribe = (cb) => { c.alSuscribir = cb; return c }
      // Simula un evento del tiempo real (con o sin filtro, como lo mande Supabase)
      c.emitir = (tabla, evento, payload) => {
        for (const h of c.handlers) {
          if (h.filtro.table !== tabla) continue
          if (h.filtro.event !== '*' && h.filtro.event !== evento) continue
          // Supabase no puede filtrar los borrados: un canal con filtro no los recibe
          if (evento === 'DELETE' && h.filtro.filter) continue
          h.fn({ eventType: evento, ...payload })
        }
      }
      canales.push(c)
      return c
    },
    removeChannel(c) { c.quitado = true },
    auth: {
      sesion: { user: { id: 'u-dj' } },
      oyentes: [],
      async getSession() { return { data: { session: cliente.auth.sesion } } },
      onAuthStateChange(fn) { cliente.auth.oyentes.push(fn); return { data: { subscription: { unsubscribe() {} } } } },
      async signOut() { cliente.auth.sesion = null; for (const fn of cliente.auth.oyentes) fn('SIGNED_OUT', null); return { error: null } },
    },
  }
  return cliente
}

// Respuestas por defecto de una campaña con un personaje y un encuentro
const CAMP = { id: 'c1', nombre: 'Dolor & Hambre', miedo: 2, ajustes: {} }
function datosBase(extra = {}) {
  const d = {
    campanias: { ...CAMP },
    miembros: [{ usuario_id: 'u-dj', rol: 'dj', perfiles: { nombre: 'Neri' } }],
    personajes: [{ id: 'p1', nombre: 'Mira', usuario_id: 'u-ana', esperanza: 2, estres: 0, hoja: { pg: 0, armas: [] }, actualizado: '2026-10-12T10:00:00.000000+00:00' }],
    lanzamientos: [],
    contenido_casero: [],
    encuentros: [{ id: 'e1', nombre: 'Emboscada', activo: true, adversarios: [], actualizado: '2026-10-12T10:00:00+00:00' }],
    cuentas_regresivas: [],
    escenas: null,
    ...extra,
  }
  return (op) => {
    if (op.accion !== 'select') return null
    if (op.tabla === 'campanias') return { data: d.campanias, error: null }
    if (op.tabla === 'miembros' && op.filtros.usuario_id) return { data: [{ rol: 'dj', campanias: { ...CAMP } }], error: null }
    if (op.tabla === 'perfiles') return { data: { id: 'u-dj', nombre: 'Neri' }, error: null }
    if (op.tabla in d) {
      const v = d[op.tabla]
      if (op.uno && Array.isArray(v)) return { data: v.find((x) => x.id === op.filtros.id) ?? null, error: null }
      return { data: structuredClone(v), error: null }
    }
    return { data: null, error: null }
  }
}

async function mesaAbierta(responder) {
  const cliente = clienteFalso(responder)
  globalThis.__supabaseFalso = cliente
  const m = await cargarMesa()
  m.app.campanias = [{ ...CAMP, rol: 'dj' }]
  m.app.sesion = { user: { id: 'u-dj' } }
  await m.abrirCampania('c1')
  return { m, cliente }
}

test('abrir dos campañas seguidas: la respuesta tardía de la primera no pisa a la segunda', async () => {
  const lenta = diferida()
  const base = datosBase()
  const cliente = clienteFalso(async (op) => {
    if (op.tabla === 'personajes' && op.filtros.campania_id === 'c1') {
      await lenta.promesa
      return { data: [{ id: 'p-viejo', nombre: 'De la campaña 1', usuario_id: 'u-dj' }], error: null }
    }
    if (op.tabla === 'campanias') return { data: { id: op.filtros.id, nombre: op.filtros.id }, error: null }
    return base(op)
  })
  globalThis.__supabaseFalso = cliente
  const m = await cargarMesa()
  m.app.sesion = { user: { id: 'u-dj' } }
  m.app.campanias = [{ id: 'c1', nombre: 'Uno', rol: 'dj' }, { id: 'c2', nombre: 'Dos', rol: 'dj' }]
  const primera = m.abrirCampania('c1')
  await m.abrirCampania('c2')
  lenta.resolver()
  await primera
  assert.equal(m.app.campania.id, 'c2')
  assert.ok(!m.app.personajes.some((p) => p.id === 'p-viejo'), 'se colaron personajes de la campaña 1')
  // Solo queda vivo el canal de la campaña 2
  assert.deepEqual(cliente.canales.filter((c) => !c.quitado).map((c) => c.nombre), ['mesa-c2'])
})

test('si falla la carga de la campaña, se avisa en vez de mostrar la mesa vacía', async () => {
  const base = datosBase()
  const cliente = clienteFalso((op) => (op.tabla === 'personajes' ? { data: null, error: { message: 'sin red' } } : base(op)))
  globalThis.__supabaseFalso = cliente
  const m = await cargarMesa()
  m.app.sesion = { user: { id: 'u-dj' } }
  m.app.campanias = [{ ...CAMP, rol: 'dj' }]
  await assert.rejects(m.abrirCampania('c1'), /sin red/)
  assert.equal(m.app.campania, null)
})

test('cerrar sesión borra todo lo de la campaña y suelta el canal', async () => {
  const { m, cliente } = await mesaAbierta(datosBase())
  assert.equal(m.app.personajes.length, 1)
  await m.salir()
  assert.equal(m.app.campania, null)
  assert.deepEqual([m.app.personajes, m.app.encuentros, m.app.lanzamientos, m.app.miembros, m.app.cuentas], [[], [], [], [], []])
  assert.equal(m.app.personajeActivo, null)
  assert.ok(cliente.canales.every((c) => c.quitado))
})

test('una tirada que termina después de cambiar de campaña no se mete en la nueva', async () => {
  const { m } = await mesaAbierta(datosBase())
  m.registrarPropia({ id: 99, campania_id: 'otra', efectos: { miedo: 7 } })
  assert.equal(m.app.lanzamientos.length, 0)
  assert.equal(m.app.campania.miedo, 2)
  m.cambiarCampania()
  m.registrarPropia({ id: 100, campania_id: 'c1', efectos: { miedo: 7 } })
  assert.equal(m.app.campania, null, 'una tirada tardía revivía una campaña fantasma')
})

test('dos toques rápidos en la hoja: la respuesta vieja no borra el segundo y el tercero cuenta', async () => {
  const respuestas = []
  const base = datosBase()
  let servidor = { id: 'p1', nombre: 'Mira', usuario_id: 'u-ana', esperanza: 2, hoja: { pg: 0 } }
  const { m } = await mesaAbierta(async (op) => {
    if (op.rpc === 'ajustar_hoja') {
      const d = diferida()
      respuestas.push(d)
      await d.promesa
      servidor = { ...servidor, hoja: { ...servidor.hoja, pg: op.args.p_valor } }
      return { data: structuredClone(servidor), error: null }
    }
    return base(op)
  })
  const pg = () => m.app.personajes[0].hoja.pg
  const a = m.ajustarHoja('p1', ['pg'], pg() + 1)
  const b = m.ajustarHoja('p1', ['pg'], pg() + 1)
  assert.equal(pg(), 2)
  await esperar()
  respuestas[0].resolver()
  await a
  assert.equal(pg(), 2, 'la respuesta del primer toque regresó la hoja a 1')
  const c = m.ajustarHoja('p1', ['pg'], pg() + 1)
  await esperar(); respuestas[1].resolver(); await b
  await esperar(); respuestas[2].resolver(); await c
  assert.equal(pg(), 3)
  assert.equal(servidor.hoja.pg, 3)
})

test('si una escritura de la hoja falla, solo se regresa esa parte', async () => {
  const base = datosBase()
  const { m } = await mesaAbierta(async (op) => {
    if (op.rpc === 'ajustar_hoja') {
      // El primero tarda en fallar: la respuesta del segundo ya habría llegado
      if (op.args.p_ruta[0] === 'pg') { await esperar(10); return { data: null, error: { message: 'no' } } }
      return { data: { id: 'p1', hoja: { pg: 0, estres: 1 } }, error: null }
    }
    if (op.tabla === 'personajes' && op.uno) return { data: { id: 'p1', nombre: 'Mira', usuario_id: 'u-ana', hoja: { pg: 0, estres: 1 } }, error: null }
    return base(op)
  })
  const a = m.ajustarHoja('p1', ['pg'], 1)
  const b = m.ajustarHoja('p1', ['estres'], 1)
  await assert.rejects(a, /no/)
  await b
  assert.equal(m.app.personajes[0].hoja.pg, 0)
  assert.equal(m.app.personajes[0].hoja.estres, 1, 'el error del primero se llevó el segundo cambio')
})

test('deshacer un elemento agregado a una lista no deja un hueco', async () => {
  const base = datosBase()
  const { m } = await mesaAbierta((op) => (op.rpc === 'ajustar_hoja' ? { data: null, error: { message: 'no' } } : base(op)))
  await assert.rejects(m.ajustarHoja('p1', ['armas', 0], { nombre: 'Arco' }), /no/)
  assert.deepEqual(m.app.personajes[0].hoja.armas, [])
})

test('Estrés y Esperanza: dos toques rápidos suman dos (antes el segundo salía del valor viejo)', async () => {
  const base = datosBase()
  let estres = 0
  const { m } = await mesaAbierta(async (op) => {
    if (op.tabla === 'personajes' && op.accion === 'update') {
      await esperar(5)
      estres = op.valores.estres
      return { data: { id: 'p1', nombre: 'Mira', usuario_id: 'u-ana', estres }, error: null }
    }
    return base(op)
  })
  const pj = () => m.app.personajes[0]
  const a = m.ajustarPersonaje('p1', { estres: pj().estres + 1 })
  const b = m.ajustarPersonaje('p1', { estres: pj().estres + 1 })
  await Promise.all([a, b])
  assert.equal(estres, 2)
  assert.equal(pj().estres, 2)
  assert.deepEqual(pj().hoja, { pg: 0, armas: [] }, 'la hoja no debe perderse')
})

test('Miedo: tocar dos veces el mismo punto lo prende y lo apaga (no suma doble)', async () => {
  const base = datosBase()
  let miedo = 2
  const { m } = await mesaAbierta(async (op) => {
    if (op.rpc === 'ajustar_miedo') { await esperar(5); miedo = Math.max(0, Math.min(12, miedo + op.args.p_delta)); return { data: miedo, error: null } }
    return base(op)
  })
  // Como lo calcula Mesa.svelte: (miedo === n ? n - 1 : n) - miedo
  const tocar = (n) => { const actual = m.app.campania.miedo; return m.ajustarMiedo((actual === n ? n - 1 : n) - actual) }
  await Promise.all([tocar(5), tocar(5)])
  assert.equal(miedo, 4)
  assert.equal(m.app.campania.miedo, 4)
})

test('tiempo real: mientras hay escrituras en camino, el eco viejo no pisa lo nuevo', async () => {
  const base = datosBase()
  const d = diferida()
  const { m, cliente } = await mesaAbierta(async (op) => {
    if (op.rpc === 'ajustar_hoja') { await d.promesa; return { data: { id: 'p1', hoja: { pg: 2 }, actualizado: '2026-10-12T10:00:02+00:00' }, error: null } }
    return base(op)
  })
  const canal = cliente.canales.at(-1)
  const a = m.ajustarHoja('p1', ['pg'], 2)
  canal.emitir('personajes', 'UPDATE', { new: { id: 'p1', hoja: { pg: 1 }, actualizado: '2026-10-12T10:00:01+00:00' } })
  assert.equal(m.app.personajes[0].hoja.pg, 2)
  d.resolver(); await a
  // Eco tardío de una escritura anterior: es más viejo que lo que ya se tiene
  canal.emitir('personajes', 'UPDATE', { new: { id: 'p1', hoja: { pg: 1 }, actualizado: '2026-10-12T10:00:01+00:00' } })
  assert.equal(m.app.personajes[0].hoja.pg, 2)
})

test('tiempo real: si el DJ borra tu personaje, deja de ser el activo y se elige otro tuyo', async () => {
  const base = datosBase({
    personajes: [
      { id: 'p1', nombre: 'Mira', usuario_id: 'u-dj', hoja: {} },
      { id: 'p2', nombre: 'Soren', usuario_id: 'u-dj', hoja: {} },
    ],
  })
  const { m, cliente } = await mesaAbierta(base)
  assert.equal(m.app.personajeActivo, 'p1')
  // Supabase no filtra los borrados: llega solo la llave, sin campania_id
  cliente.canales.at(-1).emitir('personajes', 'DELETE', { old: { id: 'p1' } })
  assert.deepEqual(m.app.personajes.map((p) => p.id), ['p2'])
  assert.equal(m.app.personajeActivo, 'p2')
})

test('tiempo real: un borrado sin campaña quita cuentas, encuentros y casero por id', async () => {
  const base = datosBase({
    cuentas_regresivas: [{ id: 'k1', nombre: 'Ritual', valor: 3, visible: true }],
    contenido_casero: [{ id: 'h1', nombre: 'Artificiero' }],
  })
  const { m, cliente } = await mesaAbierta(base)
  const canal = cliente.canales.at(-1)
  canal.emitir('cuentas_regresivas', 'DELETE', { old: { id: 'k1' } })
  canal.emitir('encuentros', 'DELETE', { old: { id: 'e1' } })
  canal.emitir('contenido_casero', 'DELETE', { old: { id: 'h1' } })
  assert.deepEqual([m.app.cuentas, m.app.encuentros, m.app.casero], [[], [], []])
})

test('tiempo real: al reconectarse se vuelve a leer la campaña (lo de mientras no llegó)', async () => {
  const base = datosBase()
  let miedoServidor = 2
  const { m, cliente } = await mesaAbierta((op) =>
    op.tabla === 'campanias' ? { data: { ...CAMP, miedo: miedoServidor }, error: null } : base(op))
  const canal = cliente.canales.at(-1)
  canal.alSuscribir('SUBSCRIBED')
  miedoServidor = 9
  await esperar(5)
  assert.equal(m.app.campania.miedo, 2, 'la primera unión no debe recargar')
  // Se cayó la conexión y volvió: Supabase avisa SUBSCRIBED otra vez
  canal.alSuscribir('SUBSCRIBED')
  await esperar(5)
  assert.equal(m.app.campania.miedo, 9)
})

test('tiempo real: un evento del canal anterior no se mete en la campaña nueva', async () => {
  const base = datosBase()
  const { m, cliente } = await mesaAbierta(base)
  const viejo = cliente.canales.at(-1)
  m.cambiarCampania()
  viejo.emitir('lanzamientos', 'INSERT', { new: { id: 5, campania_id: 'c1' } })
  assert.equal(m.app.lanzamientos.length, 0)
})

test('modo prueba: al salir y volver a entrar empieza limpio', async () => {
  globalThis.__supabaseFalso = clienteFalso(() => ({ data: null, error: null }))
  const m = await cargarMesa()
  m.entrarDemo()
  await m.crearEncuentro('Prueba')
  await m.guardarAjustes({ monedas: true })
  m.salirDemo()
  m.entrarDemo()
  assert.deepEqual(m.app.encuentros, [])
  assert.equal(m.ajustesMesa().monedas, false)
})

test('código de invitación: minúsculas, espacios y guiones se limpian', async () => {
  globalThis.__supabaseFalso = clienteFalso(() => ({ data: null, error: null }))
  const m = await cargarMesa()
  assert.equal(m.limpiarCodigo(' 2da-8ea '), '2DA8EA')
})

test('iniciar: si algo truena, no se queda en "Preparando la mesa…"', async () => {
  const cliente = clienteFalso(() => { throw new Error('sin red') })
  cliente.auth.getSession = async () => { throw new Error('almacenamiento bloqueado') }
  globalThis.__supabaseFalso = cliente
  const m = await cargarMesa()
  await m.iniciar()
  assert.equal(m.app.cargando, false)
  assert.match(m.app.error, /almacenamiento bloqueado/)
})

test('cerrar sesión en otra pestaña: una carga tardía del usuario anterior no regresa sus datos', async () => {
  const lenta = diferida()
  const base = datosBase()
  const cliente = clienteFalso(async (op) => {
    if (op.tabla === 'miembros' && op.filtros.usuario_id) { await lenta.promesa }
    return base(op)
  })
  globalThis.__supabaseFalso = cliente
  const m = await cargarMesa()
  const inicio = m.iniciar()
  await esperar()
  // Se cierra la sesión mientras todavía cargaban sus campañas
  for (const fn of cliente.auth.oyentes) fn('SIGNED_OUT', null)
  lenta.resolver()
  await inicio
  await esperar()
  assert.deepEqual(m.app.campanias, [])
  assert.equal(m.app.campania, null)
})

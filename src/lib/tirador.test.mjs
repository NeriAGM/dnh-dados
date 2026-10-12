import { test } from 'node:test'
import assert from 'node:assert/strict'

// tirador.js importa el cliente de Supabase, que necesita variables de Vite:
// aquí solo se prueban las partes puras, copiando el módulo sin esa línea.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const fuente = readFileSync(new URL('./tirador.js', import.meta.url), 'utf8')
  .replace(/^import \{ supabase \}.*$/m, 'const supabase = null')
const dir = mkdtempSync(join(tmpdir(), 'tirador-'))
writeFileSync(join(dir, 'tirador.mjs'), fuente)
const { tirarLocal, senalConLimite } = await import(join(dir, 'tirador.mjs'))

test('tirador: el corte de tiempo funciona aunque no exista AbortSignal.timeout (Safari 15)', async () => {
  const original = AbortSignal.timeout
  AbortSignal.timeout = undefined
  try {
    const s = senalConLimite(20)
    assert.equal(s.aborted, false)
    await new Promise((r) => setTimeout(r, 40))
    assert.equal(s.aborted, true)
    assert.match(String(s.reason?.name), /Timeout/)
  } finally { AbortSignal.timeout = original }
})

test('tirador (prueba): Dualidad, ventaja de d6 y 2d20 con el más alto igual que el servidor', () => {
  for (let i = 0; i < 300; i++) {
    const t = tirarLocal({ tipo: 'accion', grupos: [{ lados: 12, rol: 'esperanza' }, { lados: 12, rol: 'miedo' }, { lados: 6, rol: 'desventaja', signo: -1 }], modificador: 1 })
    const [e, m, d] = t.dados
    assert.equal(t.total, e.valor + m.valor - d.valor + 1)
    assert.equal(t.desenlace, e.valor === m.valor ? 'critico' : e.valor > m.valor ? 'esperanza' : 'miedo')
    if (t.desenlace === 'critico') assert.equal(t.exito, true)

    const dj = tirarLocal({ tipo: 'dj', grupos: [{ lados: 20, cantidad: 2, conservar: 'alto' }], modificador: 0 })
    const [a, b] = dj.dados
    assert.equal(dj.dados.filter((x) => x.descartado).length, 1, 'uno de los dos d20 se descarta')
    assert.equal(dj.total, Math.max(a.valor, b.valor))
    assert.equal(dj.critico, Math.max(a.valor, b.valor) === 20)

    const baja = tirarLocal({ tipo: 'dj', grupos: [{ lados: 20, cantidad: 2, conservar: 'bajo' }], modificador: 0 })
    assert.equal(baja.total, Math.min(baja.dados[0].valor, baja.dados[1].valor))
    assert.equal(baja.critico, Math.min(baja.dados[0].valor, baja.dados[1].valor) === 20, 'el 20 descartado no es crítico')
  }
})

test('tirador (prueba): daño crítico suma el máximo de los dados', () => {
  const t = tirarLocal({ tipo: 'dano', grupos: [{ lados: 8, cantidad: 2 }], modificador: 3, danoCritico: true })
  assert.equal(t.efectos.dano_critico_extra, 16)
  assert.equal(t.total, t.dados[0].valor + t.dados[1].valor + 3 + 16)
})

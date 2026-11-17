import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RASGOS } from './srd.js'

// Contenido nuevo del SRD 2.0 (Hope & Fear): datos/es_2_0 (español) contra datos/fuente_2_0 (inglés del PDF).
const leer = (ruta) => JSON.parse(readFileSync(new URL(`../../datos/${ruta}.json`, import.meta.url), 'utf8'))

// Conteos leídos del PDF oficial (SRD 2.0, 25/08/2026), p. 42–45 y 56–182
const NUEVOS = { adversarios: 135, entornos: 28, armas: 132, armaduras: 35, objetos: 60, consumibles: 60, transformaciones: 6 }
const numeros = (t) => (String(t ?? '').match(/\d+/g) ?? []).sort().join(',')

for (const [archivo, cuantos] of Object.entries(NUEVOS)) {
  const es = leer(`es_2_0/${archivo}`)
  const en = leer(`fuente_2_0/${archivo}`)

  test(`${archivo}: ${cuantos} entradas, mismo orden en español e inglés`, () => {
    assert.equal(es.length, cuantos)
    assert.deepEqual(es.map((x) => x.id), en.map((x) => x.id))
  })

  test(`${archivo}: cita de página, nombre en inglés y números iguales al inglés`, () => {
    en.forEach((a, i) => {
      const b = es[i]
      assert.match(b.fuente, /^SRD 2\.0 p\. \d+$/, b.id)
      assert.equal(b.fuente, a.fuente, b.id)
      assert.equal(b.verificado, true, b.id)
      assert.equal(b.nombre_en, a.nombre, b.id)
      for (const k of ['nivel', 'tipo', 'horda_por_pg', 'pg', 'estres', 'umbrales', 'tirada', 'puntuacion', 'rasgo', 'alcance', 'dano', 'manos']) {
        if (k in a) assert.deepEqual(b[k], a[k], `${b.id}.${k}`)
      }
      if (typeof a.dificultad === 'number') assert.equal(b.dificultad, a.dificultad, b.id)
      if (a.ataque) {
        const { nombre, ...resto } = a.ataque
        const { nombre: n2, ...resto2 } = b.ataque
        assert.deepEqual(resto2, resto, `${b.id}.ataque`)
      }
      assert.equal(b.rasgos?.length, a.rasgos?.length, `${b.id}.rasgos`)
      a.rasgos?.forEach((r, j) => {
        assert.equal(b.rasgos[j].clase, r.clase, `${b.id}.rasgos[${j}].clase`)
        assert.equal(numeros(b.rasgos[j].texto), numeros(r.texto), `${b.id}.rasgos[${j}] números`)
      })
      if ('texto' in a) assert.equal(numeros(b.texto), numeros(a.texto), `${b.id}.texto números`)
    })
  })

  test(`${archivo}: ningún id choca con los del SRD 1.0`, () => {
    // Transformaciones no existen en el 1.0: ahí un archivo ausente es lo esperado; en los demás debe leerse
    const viejos = archivo === 'transformaciones' ? [] : leer(`es/${archivo}`).map((x) => x.id)
    if (archivo !== 'transformaciones') assert.ok(viejos.length > 0, `datos/es/${archivo}.json vacío`)
    const repetidos = es.filter((x) => viejos.includes(x.id)).map((x) => x.id)
    assert.deepEqual(repetidos, [])
  })
}

test('armas nuevas: rasgo válido (la silla arcana usa el de Lanzamiento, SRD 2.0 p. 71)', () => {
  const validos = new Set([...RASGOS.map((r) => r.id), 'lanzamiento'])
  for (const a of leer('es_2_0/armas')) assert.ok(validos.has(a.rasgo), a.id)
  assert.deepEqual(leer('es_2_0/armas').filter((a) => a.rasgo === 'lanzamiento').map((a) => a.nivel), [1, 2, 3, 4])
})

test('casos especiales del SRD 2.0', () => {
  const adv = Object.fromEntries(leer('es_2_0/adversarios').map((x) => [x.id, x]))
  assert.equal(adv['temporal-enforcer'].ataque.dano.directo, true) // «40 direct phy», p. 155
  assert.equal(adv['spellbound-armor'].estres, null) // «Stress: None», p. 110
  assert.equal(adv['darkweave-swarmlings'].horda_por_pg > 0, true)
  const ent = Object.fromEntries(leer('es_2_0/entornos').map((x) => [x.id, x]))
  assert.equal(ent.duel.dificultad, 'Especial (ver «Fuerza relativa»)') // p. 168
})

test('Acechafauces: el estado «Beguiled» es «Engatusado», no «Embelesado» ni «Cautivado» (SRD 2.0 p. 122)', () => {
  const g = leer('es_2_0/adversarios').find((x) => x.id === 'gobstalker')
  const rayos = g.rasgos.find((r) => r.nombre === 'Rayos de tentáculo').texto
  assert.match(rayos, /Engatusado/)
  assert.doesNotMatch(rayos, /Embeles|Cautiv/)
  // El Kelpie usa el mismo verbo («beguile a PC», p. 103) y su estado sigue «Hechizado»
  const kelpie = leer('es_2_0/adversarios').find((x) => x.id === 'kelpie').rasgos.find((r) => r.nombre === 'Hechizar').texto
  assert.match(kelpie, /engatuse/)
  assert.match(kelpie, /Hechizado/)
  assert.doesNotMatch(kelpie, /embeles/i)
})

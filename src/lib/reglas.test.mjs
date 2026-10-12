import { test } from 'node:test'
import assert from 'node:assert/strict'
import { umbrales, pgPorDano, bonoAtaque, textoDano, avisos, rangoDeNivel, evasion } from './reglas.js'

const cat = {
  porId: {
    clases: { ranger: { id: 'ranger', nombre: 'Explorador', evasion: 12, dominios: ['bone', 'sage'] } },
    cartas: {
      a: { id: 'a', nombre: 'Carta A', dominio: 'bone', nivel: 1 },
      b: { id: 'b', nombre: 'Carta B', dominio: 'arcana', nivel: 1 },
      c: { id: 'c', nombre: 'Carta C', dominio: 'sage', nivel: 4 },
    },
  },
}

test('umbrales: armadura + nivel, o los manuales de la mesa', () => {
  assert.deepEqual(umbrales({ nivel: 2, armadura: { umbrales: { mayor: 5, grave: 11 } } }), { mayor: 7, grave: 13 })
  assert.deepEqual(umbrales({ nivel: 2, umbrales_manuales: { mayor: 6, grave: 12 } }), { mayor: 6, grave: 12, manual: true })
})

test('cuántos PG marca un golpe', () => {
  const u = { mayor: 7, grave: 13 }
  assert.equal(pgPorDano(0, u), 0)
  assert.equal(pgPorDano(6, u), 1)
  assert.equal(pgPorDano(7, u), 2)
  assert.equal(pgPorDano(13, u), 3)
  assert.equal(pgPorDano(26, u), 3)
  assert.equal(pgPorDano(26, u, { masivo: true }), 4)
})

test('bono de ataque y daño de arma', () => {
  assert.equal(bonoAtaque({ rasgos: [{ nombre: 'Fiable', texto: '+1 a las tiradas de ataque' }] }), 1)
  assert.equal(bonoAtaque({ rasgos: [{ nombre: 'Aparatosa', texto: '−1 a la Agilidad' }] }), 0)
  assert.equal(textoDano({ dano: { dados: 1, lados: 8, mod: 3 } }, 2), '2d8+3')
})

test('rango por nivel y Evasión', () => {
  assert.deepEqual([1, 2, 4, 5, 7, 8, 10].map(rangoDeNivel), [1, 2, 2, 3, 3, 4, 4])
  assert.equal(evasion({ evasion_base: 13, evasion_extra: 4 }), 17)
})

test('avisos: arreglo de rasgos, Evasión, cartas', () => {
  const hoja = {
    nivel: 1, clase: 'ranger', evasion_base: 13,
    rasgos: { agilidad: 2, fuerza: 1, sutileza: 1, instinto: -1, presencia: -1, conocimiento: 0 },
    cartas: { mano: ['a', 'b', 'c'], boveda: [] },
  }
  const t = avisos(hoja, cat).map((a) => a.texto).join('\n')
  assert.match(t, /arreglo inicial/)
  assert.match(t, /Evasión base del Explorador es 12/)
  assert.match(t, /«Carta B» es de un dominio/)
  assert.match(t, /«Carta C» es de nivel 4/)
  assert.doesNotMatch(t, /«Carta A»/)
})

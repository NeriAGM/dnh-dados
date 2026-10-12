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

import { puntosDeBatalla } from './reglas.js'

test('puntos de batalla: ejemplo del SRD con 4 PJ', () => {
  const adv = { oso: { tipo: 'bruto' }, jefe: { tipo: 'lider' }, sold: { tipo: 'estandar' }, cura: { tipo: 'apoyo' }, rata: { tipo: 'esbirro' } }
  const enc = [
    { ref: 'oso' }, { ref: 'jefe' }, { ref: 'sold' }, { ref: 'sold' }, { ref: 'cura' },
    ...Array(8).fill({ ref: 'rata' }),
  ]
  const r = puntosDeBatalla(enc, adv, 4)
  assert.equal(r.base, 14)
  assert.equal(r.gastado, 14, '4 + 3 + 2 + 2 + 1 + 2 grupos de 4 esbirros')
  assert.equal(r.restante, 0)
})

test('puntos de batalla: ajustes automáticos y manuales', () => {
  const adv = { a: { tipo: 'solo' }, b: { tipo: 'estandar' } }
  assert.equal(puntosDeBatalla([{ ref: 'a' }, { ref: 'a' }], adv, 3).presupuesto, 11 - 2)
  assert.equal(puntosDeBatalla([{ ref: 'b' }], adv, 3).presupuesto, 11 + 1)
  assert.equal(puntosDeBatalla([{ ref: 'b' }], adv, 3, ['dificil']).presupuesto, 11 + 1 + 2)
  assert.equal(puntosDeBatalla([{ ref: 'b' }, ...Array(5).fill({ ref: 'x' })], { ...adv, x: { tipo: 'esbirro' } }, 3).gastado, 2 + 2)
})

// ---------------------------------------------------------------------
// Hojas sucias (importadas de Notion): números como texto, nulos, repetidos
// ---------------------------------------------------------------------
import { num, normalizarHoja, ajustarOro, grupoDano } from './reglas.js'

test('num lee números escritos como texto (y el menos tipográfico)', () => {
  assert.equal(num('2'), 2)
  assert.equal(num('+2'), 2)
  assert.equal(num('−1'), -1)
  assert.equal(num(' 3 '), 3)
  assert.equal(num(''), undefined)
  assert.equal(num('abc'), undefined)
  assert.equal(num(null), undefined)
  assert.equal(num(NaN), undefined)
})

test('umbrales y Evasión con números como texto no se concatenan', () => {
  // Antes: "5" + 2 = "52" y "13" + "1" = "131"
  assert.deepEqual(umbrales({ nivel: '2', armadura: { umbrales: { mayor: '5', grave: '11' } } }), { mayor: 7, grave: 13 })
  assert.equal(evasion({ evasion_base: '12', evasion_extra: '1' }), 13)
  assert.deepEqual(umbrales({ nivel: 2, armadura: { umbrales: { mayor: 5 } } }), { mayor: 2, grave: 4, sinArmadura: true })
})

test('umbrales manuales a medias: lo que falta sale de armadura + nivel', () => {
  const h = { nivel: 2, armadura: { umbrales: { mayor: 5, grave: 11 } } }
  assert.deepEqual(umbrales({ ...h, umbrales_manuales: { mayor: 6, grave: null } }), { mayor: 6, grave: 13, manual: true })
  assert.deepEqual(umbrales({ ...h, umbrales_manuales: { grave: '12' } }), { mayor: 7, grave: 12, manual: true })
  // Antes un manual con solo "grave" se ignoraba por completo
  assert.deepEqual(umbrales({ ...h, umbrales_manuales: { mayor: null, grave: null } }), { mayor: 7, grave: 13 })
})

test('normalizarHoja: números, cartas repetidas y campos caseros', () => {
  const h = normalizarHoja({
    nivel: '2', pg: '2', pg_max: '6', competencia: 'dos', campo_raro: { x: 1 },
    rasgos: { agilidad: '+2', instinto: '−1', conocimiento: '' },
    experiencias: [{ nombre: 'A', valor: '2' }, null],
    armadura: { puntuacion: '3', umbrales: { mayor: '5', grave: '11' } },
    armas: [{ nombre: 'Arco', dano: { dados: '1', lados: '6', mod: '3' } }, null],
    cartas: { mano: ['a', 'a', null, 'b'], boveda: ['b', 'c', 'c'] },
    oro: { punados: '9' },
    companero: { estres_max: '3', experiencias: [{ nombre: 'X', valor: '2' }] },
  })
  assert.equal(h.nivel, 2)
  assert.equal(h.pg, 2)
  assert.equal('competencia' in h, false) // ilegible: que valga el de por defecto
  assert.deepEqual(h.campo_raro, { x: 1 })
  assert.deepEqual(h.rasgos, { agilidad: 2, instinto: -1, conocimiento: 0 })
  assert.deepEqual(h.experiencias, [{ nombre: 'A', valor: 2 }, { valor: 0 }])
  assert.equal(h.armadura.puntuacion, 3)
  assert.deepEqual(h.armadura.umbrales, { mayor: 5, grave: 11 })
  assert.deepEqual(h.armas[0].dano, { dados: 1, lados: 6, mod: 3 })
  assert.deepEqual(h.armas[1], {})
  // Una carta repetida tronaba la pestaña Cartas (each con llave duplicada)
  assert.deepEqual(h.cartas, { mano: ['a', 'b'], boveda: ['c'] })
  assert.equal(h.oro.punados, 9)
  assert.equal(h.companero.estres_max, 3)
  assert.equal(h.companero.experiencias[0].valor, 2)
  assert.deepEqual(normalizarHoja(null), {})
  assert.equal(textoDano(h.armas[0], 2), '2d6+3')
  assert.deepEqual(grupoDano({ dano: { dados: '1', lados: '8', mod: '2' } }, '2'), { lados: 8, cantidad: 2, mod: 2 })
})

test('oro: al llenar una categoría pasa a la siguiente', () => {
  assert.deepEqual(ajustarOro({ punados: 9, bolsas: 1, cofres: 0 }, 'punados', 12), { punados: 2, bolsas: 2, cofres: 0 })
  assert.deepEqual(ajustarOro({ punados: 0, bolsas: 9 }, 'punados', 10), { punados: 0, bolsas: 0, cofres: 1 })
  assert.deepEqual(ajustarOro({ monedas: 5, punados: 1 }, 'monedas', 23), { monedas: 3, punados: 3 })
  assert.deepEqual(ajustarOro(null, 'bolsas', -2), { bolsas: 0 })
  assert.deepEqual(ajustarOro({ punados: '4' }, 'cofres', 1), { punados: 4, cofres: 1 })
})

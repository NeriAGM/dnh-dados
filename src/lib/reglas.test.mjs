import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { umbrales, pgPorDano, bonoAtaque, textoDano, avisos, rangoDeNivel, evasion, cartasParaAgregar } from './reglas.js'

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

test('avisos: armas activas y guardadas (SRD p. 55)', () => {
  const arma = (tipo, activa) => ({ nombre: `${tipo} ${activa}`, tipo, ...(activa === undefined ? {} : { activa }) })
  const textos = (armas) => avisos({ armas }, cat).filter((a) => a.campo === 'armas').map((a) => a.texto)
  // Una primaria y una secundaria activas, dos guardadas: todo en regla
  assert.deepEqual(textos([arma('primaria', true), arma('secundaria'), arma('primaria', false), arma('secundaria', false)]), [])
  // Hojas viejas sin «activa» cuentan como activas
  assert.match(textos([arma('primaria'), arma('primaria')]).join(), /2 armas primarias activas/)
  assert.match(textos([arma('secundaria', true), arma('secundaria')]).join(), /2 armas secundarias activas/)
  assert.match(textos([arma('primaria', false), arma('primaria', false), arma('secundaria', false)]).join(), /3 armas guardadas/)
  // Sin tipo cuenta como primaria (así la muestra la hoja)
  assert.equal(textos([{ nombre: 'X' }, arma('primaria')]).length, 1)
})

test('avisos: arma a dos manos con secundaria activa (carga máxima 2 manos)', () => {
  const mandoble = { nombre: 'Mandoble', tipo: 'primaria', manos: 2 }
  const daga = { nombre: 'Daga', tipo: 'secundaria', manos: 1 }
  const textos = (hoja) => avisos(hoja, cat).filter((a) => a.campo === 'armas').map((a) => a.texto)
  assert.match(textos({ armas: [mandoble, daga] }).join(), /«Mandoble» es a dos manos/)
  // Importadas: «manos» como texto
  assert.equal(textos({ armas: [{ ...mandoble, manos: '2' }, daga] }).length, 1)
  // Guardada cualquiera de las dos: en regla
  assert.deepEqual(textos({ armas: [{ ...mandoble, activa: false }, daga] }), [])
  assert.deepEqual(textos({ armas: [mandoble, { ...daga, activa: false }] }), [])
  // El Guerrero ignora la carga (Entrenamiento de combate)
  assert.deepEqual(textos({ clase: 'warrior', armas: [mandoble, daga] }), [])
  assert.deepEqual(textos({ multiclase: { clase: 'warrior' }, armas: [mandoble, daga] }), [])
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

test('agregar carta: no ofrece las que ya están en la mano o la bóveda', () => {
  const cartas = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
  const hoja = { cartas: { mano: ['a'], boveda: ['c'] } }
  assert.deepEqual(cartasParaAgregar(cartas, hoja).map((c) => c.id), ['b', 'd'])
  assert.equal(cartasParaAgregar(cartas, {}).length, 4, 'sin cartas todavía')
  assert.deepEqual(cartasParaAgregar(undefined, hoja), [])
})

test('bono de ataque: solo cuenta lo incondicional del arma (SRD 2.0 p. 64 y 68)', () => {
  const leer = (r) => JSON.parse(readFileSync(new URL(`../../datos/${r}.json`, import.meta.url), 'utf8'))
  const armas = [...leer('es/armas'), ...leer('es_2_0/armas')]
  // Bastón infinito: «-1 … por cada paso que aumentes el alcance» no es un -1 fijo
  assert.equal(bonoAtaque(armas.find((a) => a.id === 'infinite-staff')), 0)
  // Todas las «Fiable» siguen dando +1
  const fiables = armas.filter((a) => a.rasgos.some((r) => r.nombre === 'Fiable'))
  assert.equal(fiables.length, 13)
  for (const a of fiables) assert.equal(bonoAtaque(a), 1, a.id)
  // Martillo de hojalatero: no se da a sí mismo; da +1 a la primaria activa solo si él está activo
  const martillo = armas.find((a) => a.id === 'tinkers-hammer')
  const espada = { id: 'espada', tipo: 'primaria', rasgos: [] }
  assert.equal(bonoAtaque(martillo, [espada, martillo]), 0)
  assert.equal(bonoAtaque(espada, [espada, martillo]), 1)
  assert.equal(bonoAtaque(espada, [espada, { ...martillo, activa: false }]), 0)
  assert.equal(bonoAtaque({ ...espada, activa: false }, [{ ...espada, activa: false }, martillo]), 0)
})

test('bono de ataque en armas caseras o importadas: solo la forma fija cuenta', () => {
  const con = (texto, tipo = 'primaria') => ({ tipo, rasgos: [{ nombre: 'X', texto }] })
  const cuentan = [
    ['+1 a las tiradas de ataque', 1], ['+1 a las tiradas de ataque.', 1], ['Fiable: +1 a las tiradas de ataque', 1],
    ['+1 a las tiradas de ataque y de daño', 1], ['−1 a las tiradas de ataque', -1], ['–1 a las tiradas de ataque', -1],
    ['**+1** a las tiradas de ataque', 1],
  ]
  for (const [t, n] of cuentan) assert.equal(bonoAtaque(con(t)), n, t)
  const no = [
    '+1 a las tiradas de ataque y de daño contra criaturas Vulnerables',
    '+1 a las tiradas de ataque con esta arma cuando estés oculto',
    '+1 a las tiradas de ataque (contra criaturas Vulnerables)',
    '+1 a las tiradas de ataque — si estás oculto',
    '+2 a las tiradas de ataque de Agilidad mientras vueles',
    '+1 a las tiradas de ataque **por cada** aliado',
    'Por cada aliado a alcance Cercano, +1 a las tiradas de ataque',
    'Cada vez que marques un Estrés, +1 a las tiradas de ataque',
    'Una vez por escena, +2 a las tiradas de ataque',
    'Los adversarios a alcance Muy cercano tienen -1 a las tiradas de ataque',
    'Tus aliados obtienen +1 a las tiradas de ataque',
    'No obtienes +1 a las tiradas de ataque',
    '+1 a las tiradas de ataque. Si fallas un ataque, marca un Estrés.',
  ]
  for (const t of no) assert.equal(bonoAtaque(con(t)), 0, t)
  // Bono a la primaria: solo la forma exacta, y solo a la primaria activa
  const espada = { id: 'espada', tipo: 'primaria', rasgos: [] }
  for (const t of ['+2 a las tiradas de ataque hechas con tu arma primaria contra criaturas Vulnerables',
    '-1 a las tiradas de ataque hechas con tu arma primaria por cada paso', '+1 a las tiradas de ataque con tu arma primaria']) {
    const sec = con(t, 'secundaria')
    assert.equal(bonoAtaque(espada, [espada, sec]), 0, t)
    assert.equal(bonoAtaque(sec, [espada, sec]), 0, t)
  }
  // texto que no es cadena: 0, sin tronar
  for (const texto of [3, [1, 2], null, undefined, { a: 1 }]) {
    assert.equal(bonoAtaque({ tipo: 'primaria', rasgos: [{ nombre: 'X', texto }] }), 0)
    assert.equal(bonoAtaque(espada, [espada, { tipo: 'secundaria', rasgos: [{ texto }] }]), 0)
  }
  assert.equal(bonoAtaque({ rasgos: [null] }), 0)
})

test('bono de ataque: «Fiable:» es la única etiqueta y las estructuras raras no truenan', () => {
  const con = (texto, tipo = 'primaria') => ({ tipo, rasgos: [{ nombre: 'X', texto }] })
  assert.equal(bonoAtaque(con('Fiable: +1 a las tiradas de ataque')), 1)
  assert.equal(bonoAtaque(con('FIABLE: +1 a las tiradas de ataque')), 1)
  for (const t of ['Si estás oculto: +1 a las tiradas de ataque', 'Mientras vueles: +1 a las tiradas de ataque',
    'Una vez por escena: +2 a las tiradas de ataque', '+ 1 a las tiradas de ataque', '+100 a las tiradas de ataque']) assert.equal(bonoAtaque(con(t)), 0, t)
  const espada = { id: 'espada', tipo: 'primaria', rasgos: [] }
  assert.equal(bonoAtaque(espada, [espada, con('Fiable: +1 a las tiradas de ataque hechas con tu arma primaria', 'secundaria')]), 1)
  for (const t of ['Si estás oculto: +1 a las tiradas de ataque hechas con tu arma primaria',
    'Una vez por escena: +2 a las tiradas de ataque hechas con tu arma primaria']) assert.equal(bonoAtaque(espada, [espada, con(t, 'secundaria')]), 0, t)
  // rasgos y armas que no son arreglos: 0, sin tronar
  assert.equal(bonoAtaque({ tipo: 'primaria', rasgos: { 0: { texto: '+1 a las tiradas de ataque' } } }), 0)
  assert.equal(bonoAtaque(espada, null), 0)
  assert.equal(bonoAtaque(espada, { 0: con('+1 a las tiradas de ataque hechas con tu arma primaria', 'secundaria') }), 0)
})

test('datos 2.0: «N de Miedo», nunca «N Miedo» ni «N Miedos»', () => {
  for (const f of ['adversarios', 'entornos']) {
    const texto = readFileSync(new URL(`../../datos/es_2_0/${f}.json`, import.meta.url), 'utf8')
    assert.deepEqual(texto.match(/\b\d*d?\d+\*{0,2} Miedos?\b/g) ?? [], [], f)
  }
})

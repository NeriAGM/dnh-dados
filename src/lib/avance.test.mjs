import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  logrosDeNivel, opcionesDisponibles, validarSubida, aplicarSubida, seccionPara, contarSecciones, clavesCambiadas,
} from './avance.js'
import { umbrales } from './reglas.js'

const base = (extra = {}) => ({
  nivel: 1,
  rasgos: { agilidad: 2, fuerza: 1, sutileza: 1, instinto: 0, presencia: 0, conocimiento: -1 },
  rasgos_mejorados: [],
  experiencias: [{ nombre: 'Rastreadora', valor: 2 }, { nombre: 'Hija del bosque', valor: 2 }],
  competencia: 1, pg_max: 6, evasion_extra: 0,
  armadura: { puntuacion: 3, umbrales: { mayor: 6, grave: 13 } },
  cartas: { mano: ['a', 'b'], boveda: [] },
  avances: [],
  ...extra,
})
const dispo = (h, nivel, id) => opcionesDisponibles(h, nivel).find((o) => o.id === id)

test('logros de rango en niveles 2, 5 y 8', () => {
  assert.deepEqual(logrosDeNivel(2), { experiencia: true, competencia: true, limpiarRasgos: false })
  assert.deepEqual(logrosDeNivel(5), { experiencia: true, competencia: true, limpiarRasgos: true })
  assert.deepEqual(logrosDeNivel(8).limpiarRasgos, true)
  assert.deepEqual(logrosDeNivel(3), { experiencia: false, competencia: false, limpiarRasgos: false })
})

test('en el Rango 2 no hay subclase, Competencia ni multiclase', () => {
  const h = base()
  assert.equal(dispo(h, 2, 'rasgos').libres, 3)
  assert.equal(dispo(h, 2, 'pg').libres, 2)
  assert.equal(dispo(h, 2, 'subclase').disponible, false)
  assert.equal(dispo(h, 4, 'competencia').disponible, false)
  assert.equal(dispo(h, 4, 'multiclase').disponible, false)
  assert.equal(dispo(h, 5, 'multiclase').disponible, true)
})

test('las casillas de rangos menores siguen disponibles', () => {
  const h = base({ nivel: 4, avances: [{ nivel: 2, tipo: 'pg', rango: 2 }] })
  assert.equal(dispo(h, 5, 'pg').libres, 3) // 1 libre del Rango 2 + 2 del Rango 3
  assert.equal(seccionPara(h.avances, 'pg', 5), 2)
  const lleno = base({ avances: [{ tipo: 'evasion', rango: 2 }] })
  assert.equal(dispo(lleno, 3, 'evasion').disponible, false)
  assert.equal(dispo(lleno, 5, 'evasion').libres, 1)
})

test('subclase tacha la multiclase de su sección; multiclase tacha todo lo demás', () => {
  const sub = contarSecciones([{ tipo: 'subclase', rango: 3 }])
  assert.ok(sub.tachadas.has('multiclase:3'))
  const h = base({ nivel: 5, avances: [{ tipo: 'subclase', rango: 3 }], subclase_etapa: 'especializacion' })
  assert.equal(dispo(h, 6, 'multiclase').disponible, false)
  assert.equal(dispo(h, 8, 'multiclase').disponible, true)

  const multi = base({ nivel: 5, avances: [{ tipo: 'multiclase', rango: 3 }] })
  assert.equal(dispo(multi, 8, 'multiclase').disponible, false)
  assert.match(dispo(multi, 8, 'multiclase').razon, /una vez/)
  assert.equal(dispo(multi, 6, 'subclase').disponible, false) // la del Rango 3 quedó tachada
  assert.equal(dispo(multi, 8, 'subclase').libres, 1)
  assert.equal(dispo(base({ subclase_etapa: 'maestria' }), 8, 'subclase').disponible, false)
})

test('validar: dos mejoras; Competencia y Multiclase cuestan las dos', () => {
  const h = base({ nivel: 4 })
  assert.deepEqual(validarSubida(h, { mejoras: [{ tipo: 'competencia' }], experiencia: 'Herbolaria' }), [])
  assert.match(validarSubida(h, { mejoras: [{ tipo: 'competencia' }, { tipo: 'pg' }], experiencia: 'X' })[0], /Elige 2/)
  assert.match(validarSubida(h, { mejoras: [{ tipo: 'pg' }], experiencia: 'X' })[0], /Elige 2/)
  assert.deepEqual(validarSubida(base({ nivel: 2 }), { mejoras: [{ tipo: 'pg' }, { tipo: 'pg' }] }), [])
  assert.match(validarSubida(base({ nivel: 2, avances: [{ tipo: 'pg', rango: 2 }] }), { mejoras: [{ tipo: 'pg' }, { tipo: 'pg' }] }).join(), /casillas libres/)
  assert.match(validarSubida(base({ nivel: 10 }), { mejoras: [] })[0], /máximo/)
})

test('validar: la Experiencia nueva de los logros necesita nombre', () => {
  assert.match(validarSubida(base(), { mejoras: [{ tipo: 'pg' }, { tipo: 'estres' }] }).join(), /Experiencia nueva/)
  assert.deepEqual(validarSubida(base(), { mejoras: [{ tipo: 'pg' }, { tipo: 'estres' }], experiencia: 'Cazadora' }), [])
})

test('validar: rasgos sin marcar y distintos; al nivel 5 se borran las marcas', () => {
  const h = base({ nivel: 2, rasgos_mejorados: ['agilidad'] })
  const ok = { mejoras: [{ tipo: 'rasgos', detalle: { rasgos: ['fuerza', 'sutileza'] } }, { tipo: 'pg' }] }
  assert.deepEqual(validarSubida(h, ok), [])
  assert.match(validarSubida(h, { mejoras: [{ tipo: 'rasgos', detalle: { rasgos: ['agilidad', 'fuerza'] } }, { tipo: 'pg' }] }).join(), /no estén marcados/)
  assert.match(validarSubida(h, { mejoras: [{ tipo: 'rasgos', detalle: { rasgos: ['fuerza', 'fuerza'] } }, { tipo: 'pg' }] }).join(), /distintos/)
  const dos = { mejoras: [{ tipo: 'rasgos', detalle: { rasgos: ['fuerza', 'sutileza'] } }, { tipo: 'rasgos', detalle: { rasgos: ['fuerza', 'instinto'] } }] }
  assert.match(validarSubida(h, dos).join(), /no estén marcados/)
  const h4 = base({ nivel: 4, rasgos_mejorados: ['agilidad', 'fuerza'] })
  assert.deepEqual(validarSubida(h4, { experiencia: 'X', mejoras: [{ tipo: 'rasgos', detalle: { rasgos: ['agilidad', 'fuerza'] } }, { tipo: 'pg' }] }), [])
})

test('validar: Experiencias, carta adicional y multiclase', () => {
  const h = base({ nivel: 2 })
  assert.deepEqual(validarSubida(h, { mejoras: [{ tipo: 'experiencias', detalle: { indices: [0, 1] } }, { tipo: 'pg' }] }), [])
  assert.match(validarSubida(h, { mejoras: [{ tipo: 'experiencias', detalle: { indices: [0, 0] } }, { tipo: 'pg' }] }).join(), /distintas/)
  assert.match(validarSubida(h, { mejoras: [{ tipo: 'carta', detalle: {} }, { tipo: 'pg' }] }).join(), /elige la carta/)
  assert.match(validarSubida(h, { carta: 'x', mejoras: [{ tipo: 'carta', detalle: { carta: 'x' } }, { tipo: 'pg' }] }).join(), /misma/)
  assert.match(validarSubida(h, { carta: 'z', mejoras: [{ tipo: 'pg' }, { tipo: 'pg' }] }, { z: { nivel: 4 } }).join(), /nivel 4/)
  const h5 = base({ nivel: 4, clase: 'ranger' })
  assert.match(validarSubida(h5, { experiencia: 'X', mejoras: [{ tipo: 'multiclase', detalle: {} }] }).join(), /clase y uno/)
  assert.match(validarSubida(h5, { experiencia: 'X', mejoras: [{ tipo: 'multiclase', detalle: { clase: 'ranger', dominio: 'bone' } }] }).join(), /distinta/)
  assert.deepEqual(validarSubida(h5, { experiencia: 'X', mejoras: [{ tipo: 'multiclase', detalle: { clase: 'wizard', dominio: 'codex' } }] }), [])
})

test('aplicar: nivel 2 con logros, mejoras, carta y umbrales', () => {
  const h = base()
  const antes = umbrales(h)
  const r = aplicarSubida(h, { estres_max: 6 }, {
    experiencia: 'Cazadora',
    carta: 'c',
    mejoras: [{ tipo: 'rasgos', detalle: { rasgos: ['instinto', 'presencia'] } }, { tipo: 'estres' }],
  })
  assert.equal(r.hoja.nivel, 2)
  assert.equal(r.hoja.competencia, 2)
  assert.deepEqual(r.hoja.experiencias.at(-1), { nombre: 'Cazadora', valor: 2 })
  assert.equal(r.hoja.rasgos.instinto, 1)
  assert.deepEqual(r.hoja.rasgos_mejorados, ['instinto', 'presencia'])
  assert.equal(r.pj.estres_max, 7)
  assert.deepEqual(r.hoja.cartas.mano, ['a', 'b', 'c'])
  assert.deepEqual(r.hoja.avances.map((a) => [a.nivel, a.tipo, a.rango]), [[2, 'rasgos', 2], [2, 'estres', 2]])
  const despues = umbrales(r.hoja)
  assert.equal(despues.mayor, antes.mayor + 1)
  assert.equal(despues.grave, antes.grave + 1)
  assert.equal(h.nivel, 1) // no muta la hoja original
})

test('aplicar: nivel 5 borra marcas, sube umbrales manuales y respeta topes', () => {
  const h = base({ nivel: 4, competencia: 2, rasgos_mejorados: ['agilidad'], pg_max: 12, umbrales_manuales: { mayor: 9, grave: 16 }, cartas: { mano: ['1', '2', '3', '4', '5'], boveda: [] } })
  const r = aplicarSubida(h, { estres_max: 6 }, { experiencia: 'Nueva', carta: 'n', mejoras: [{ tipo: 'pg' }, { tipo: 'subclase' }] })
  assert.deepEqual(r.hoja.rasgos_mejorados, [])
  assert.equal(r.hoja.competencia, 3)
  assert.equal(r.hoja.pg_max, 12)
  assert.deepEqual(r.hoja.umbrales_manuales, { mayor: 10, grave: 17 })
  assert.equal(r.hoja.subclase_etapa, 'especializacion')
  assert.deepEqual(r.hoja.cartas.boveda, ['n'])
  assert.equal(r.hoja.avances[0].rango, 2)
  assert.equal(r.hoja.avances[1].rango, 3)
})

test('aplicar: multiclase agrega el dominio y Competencia por mejora', () => {
  const h = base({ nivel: 6, dominios: ['bone', 'sage'], competencia: 3 })
  const m = aplicarSubida(h, { estres_max: 6 }, { mejoras: [{ tipo: 'multiclase', detalle: { clase: 'wizard', dominio: 'codex' } }] })
  assert.deepEqual(m.hoja.dominios, ['bone', 'sage', 'codex'])
  assert.deepEqual(m.hoja.multiclase, { clase: 'wizard', dominio: 'codex', subclase: null })
  const c = aplicarSubida(h, { estres_max: 6 }, { mejoras: [{ tipo: 'competencia' }] })
  assert.equal(c.hoja.competencia, 4)
  assert.deepEqual(clavesCambiadas(h, c.hoja).sort(), ['avances', 'competencia', 'nivel'])
})

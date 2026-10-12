import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolverDano, armaduraLibre, formulaDescanso, validarDescanso, aplicarDescanso, efectosDeDescanso,
  avisoDescansosSeguidos, avisoMiedoDescanso, necesitaMovimientoDeMuerte, resolverEvitarMuerte,
  resolverArriesgarlo, repartoValido,
} from './ayudas.js'

const u = { mayor: 7, grave: 14 }
const hoja = { pg: 0, pg_max: 6, armadura: { puntuacion: 3 }, armadura_marcada: 0 }

test('daño: severidad según umbrales', () => {
  assert.equal(resolverDano(0, hoja, u).pg, 0)
  assert.equal(resolverDano(6, hoja, u).pg, 1)
  assert.equal(resolverDano(7, hoja, u).severidad, 'Mayor')
  assert.equal(resolverDano(14, hoja, u).pg, 3)
  assert.equal(resolverDano(28, hoja, u).pg, 3)
  const m = resolverDano(28, hoja, u, { masivo: true })
  assert.equal(m.pg, 4)
  assert.equal(m.severidad, 'Masivo')
})

test('daño: una casilla de Armadura baja un escalón', () => {
  const r = resolverDano(14, hoja, u, { usarArmadura: true })
  assert.equal(r.pgSinArmadura, 3)
  assert.equal(r.pg, 2)
  assert.equal(r.severidadFinal, 'Mayor')
  assert.equal(r.armaduraDespues, 1)
  assert.equal(resolverDano(3, hoja, u, { usarArmadura: true }).pg, 0) // Menor → nada
  assert.equal(resolverDano(28, hoja, u, { masivo: true, usarArmadura: true }).pg, 3) // Masivo → Grave
})

test('daño: sin casillas libres, daño directo o sin daño no se puede marcar Armadura', () => {
  const llena = { ...hoja, armadura_marcada: 3 }
  assert.equal(armaduraLibre(llena), 0)
  const r = resolverDano(14, llena, u, { usarArmadura: true })
  assert.equal(r.puedeArmadura, false)
  assert.equal(r.pg, 3)
  assert.equal(r.armaduraDespues, 3)
  assert.equal(resolverDano(14, hoja, u, { directo: true, usarArmadura: true }).pg, 3)
  assert.equal(resolverDano(0, hoja, u, { usarArmadura: true }).puedeArmadura, false)
  assert.equal(resolverDano(14, { pg: 0, pg_max: 6, armadura: null }, u, { usarArmadura: true }).pg, 3)
})

test('daño: resistencia (mitad hacia arriba) antes que reducciones y Armadura', () => {
  assert.equal(resolverDano(15, hoja, u, { resistencia: true }).final, 8)
  assert.equal(resolverDano(15, hoja, u, { resistencia: true }).pg, 2)
  assert.equal(resolverDano(15, hoja, u, { resistencia: true, reduccion: 2 }).final, 6)
  assert.equal(resolverDano(15, hoja, u, { resistencia: true, reduccion: 2 }).pg, 1)
  assert.equal(resolverDano(3, hoja, u, { reduccion: 5 }).pg, 0)
})

test('daño: marcar el último PG pide movimiento de muerte', () => {
  const casi = { ...hoja, pg: 4 }
  const r = resolverDano(14, casi, u)
  assert.equal(r.pgDespues, 6)
  assert.equal(r.cae, true)
  assert.equal(resolverDano(14, casi, u, { usarArmadura: true }).cae, true)
  assert.equal(resolverDano(3, casi, u).cae, false)
  assert.equal(necesitaMovimientoDeMuerte({ pg: 6, pg_max: 6 }), true)
  assert.equal(necesitaMovimientoDeMuerte({ pg: 6, pg_max: 6, estado: 'inconsciente' }), false)
  assert.equal(necesitaMovimientoDeMuerte({ pg: 5, pg_max: 6 }), false)
})

test('descanso: 1d4 + Rango', () => {
  assert.deepEqual(formulaDescanso(1), { lados: 4, cantidad: 1, mod: 1 })
  assert.equal(formulaDescanso(4).mod, 2)
  assert.equal(formulaDescanso(7).mod, 3)
  assert.equal(formulaDescanso(10).mod, 4)
})

test('descanso: dos movimientos, se puede repetir uno', () => {
  assert.equal(validarDescanso('corto', [{ id: 'heridas' }, { id: 'heridas' }]), null)
  assert.match(validarDescanso('corto', [{ id: 'heridas' }]), /Elige 2/)
  assert.match(validarDescanso('corto', [{ id: 'proyecto' }, { id: 'heridas' }]), /no existe/)
  assert.equal(validarDescanso('largo', [{ id: 'proyecto' }, { id: 'estres' }]), null)
})

const estado = { pg: 5, pg_max: 6, estres: 4, estres_max: 6, armadura: 2, armadura_max: 3, esperanza: 5, esperanza_max: 6 }

test('descanso corto: limpia lo tirado sin bajar de 0', () => {
  const r = aplicarDescanso('corto', estado, [{ id: 'heridas', valor: 3 }, { id: 'heridas', valor: 4 }])
  assert.equal(r.pg, 0)
  assert.deepEqual(r.detalle.map((d) => d.cantidad), [3, 2])
  const s = aplicarDescanso('corto', estado, [{ id: 'estres', valor: 2 }, { id: 'armadura', valor: 5 }])
  assert.equal(s.estres, 2)
  assert.equal(s.armadura, 0)
})

test('descanso: Prepararse da 1 de Esperanza, 2 en grupo, con tope', () => {
  assert.equal(aplicarDescanso('corto', { ...estado, esperanza: 2 }, [{ id: 'prepararse' }, { id: 'prepararse', enGrupo: true }]).esperanza, 5)
  assert.equal(aplicarDescanso('largo', estado, [{ id: 'prepararse', enGrupo: true }, { id: 'proyecto' }]).esperanza, 6)
  assert.equal(aplicarDescanso('corto', { ...estado, esperanza_max: 4, esperanza: 4 }, [{ id: 'prepararse' }, { id: 'heridas', valor: 1 }]).esperanza, 4)
})

test('descanso largo: limpia todo', () => {
  const r = aplicarDescanso('largo', estado, [{ id: 'heridas' }, { id: 'armadura' }])
  assert.equal(r.pg, 0)
  assert.equal(r.armadura, 0)
  assert.equal(r.estres, 4)
})

test('descanso: contador de cortos seguidos, despertar y avisos', () => {
  assert.deepEqual(efectosDeDescanso('corto', { descansos_cortos: 1 }), { descansos_cortos: 2 })
  assert.deepEqual(efectosDeDescanso('largo', { descansos_cortos: 3, estado: 'inconsciente' }), { descansos_cortos: 0, estado: null })
  assert.deepEqual(efectosDeDescanso('largo', { estado: 'muerto' }), { descansos_cortos: 0 })
  assert.equal(avisoDescansosSeguidos({ descansos_cortos: 2 }), null)
  assert.match(avisoDescansosSeguidos({ descansos_cortos: 3 }), /debe ser largo/)
  assert.match(avisoMiedoDescanso('corto'), /1d4 de Miedo/)
  assert.match(avisoMiedoDescanso('largo'), /1d4 \+ número de PJ/)
})

test('Evitar la muerte: cicatriz si el Dado de Esperanza ≤ nivel', () => {
  assert.deepEqual(resolverEvitarMuerte(3, 3, 6), { cicatriz: true, esperanzaMax: 5, finDelViaje: false })
  assert.deepEqual(resolverEvitarMuerte(4, 3, 6), { cicatriz: false, esperanzaMax: 6, finDelViaje: false })
  assert.equal(resolverEvitarMuerte(1, 1, 1).finDelViaje, true)
})

test('Arriesgarlo todo: Esperanza, Miedo y crítico', () => {
  assert.deepEqual(resolverArriesgarlo(9, 4), { desenlace: 'esperanza', limpiar: 9 })
  assert.deepEqual(resolverArriesgarlo(4, 9), { desenlace: 'miedo', limpiar: 0 })
  assert.equal(resolverArriesgarlo(7, 7).desenlace, 'critico')
  assert.equal(repartoValido({ pg: 3, estres: 2 }, 5, 6, 3), null)
  assert.match(repartoValido({ pg: 4, estres: 2 }, 5, 6, 3), /5 en total/)
  assert.match(repartoValido({ pg: 1, estres: 4 }, 9, 6, 3), /3 de Estrés/)
})

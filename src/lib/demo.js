// Personaje de ejemplo para el modo prueba (no se guarda en ningún lado).
import { hojaNueva } from './reglas.js'

export function hojaDemo(cat) {
  const clase = cat.clases.find((c) => c.id === 'ranger')
  const arma = (id) => {
    const a = cat.armas.find((x) => x.id === id)
    return a && { id: a.id, nombre: a.nombre, tipo: a.tipo, rasgo: a.rasgo, alcance: a.alcance, dano: a.dano, manos: a.manos, rasgos: a.rasgos, activa: true }
  }
  const armadura = cat.armaduras.find((x) => x.id === 'leather-armor')
  const cartas = cat.cartas.filter((c) => ['bone', 'sage'].includes(c.dominio) && c.nivel === 1).slice(0, 2).map((c) => c.id)
  return hojaNueva(clase, {
    subclase: 'beastbound',
    ancestria: 'katari',
    comunidad: 'wildborne',
    pronombres: 'Ella',
    rasgos: { agilidad: 2, fuerza: 0, sutileza: 1, instinto: 1, presencia: -1, conocimiento: 0 },
    armas: [arma('shortbow')].filter(Boolean),
    armadura: armadura && { id: armadura.id, nombre: armadura.nombre, puntuacion: armadura.puntuacion, umbrales: armadura.umbrales, rasgos: armadura.rasgos },
    experiencias: [{ nombre: 'Rastreadora', valor: 2 }, { nombre: 'Hija del bosque', valor: 2 }],
    cartas: { mano: cartas, boveda: [] },
    inventario: [{ nombre: 'Antorcha', cantidad: 1, nota: '' }, { nombre: 'Cuerda', cantidad: 1, nota: '15 m' }],
    companero: { nombre: 'Ceniza', especie: 'Lobo', evasion: 10, estres_max: 3, estres: 0, dano_lados: 6, alcance: 'cuerpo', experiencias: [{ nombre: 'Olfato fino', valor: 2 }], rasgos: [], notas: '' },
  })
}

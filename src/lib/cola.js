// Cola de escrituras: cada tarea empieza cuando terminó la anterior.
// Sirve para los controles que se tocan rápido (Estrés, Esperanza, Miedo):
// así cada cambio se calcula y se guarda en orden, sin pisarse.

export function crearCola() {
  let ultima = Promise.resolve()
  let pendientes = 0
  return {
    agregar(tarea) {
      pendientes++
      const p = ultima.then(tarea)
      ultima = p.catch(() => {})
      return p.finally(() => { pendientes-- })
    },
    get vacia() { return pendientes === 0 },
  }
}

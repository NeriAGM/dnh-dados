// En un UPDATE, el tiempo real de Supabase NO manda las columnas grandes que no
// cambiaron (por ejemplo la hoja de un personaje cuando solo cambió su Esperanza
// por una tirada). Si se reemplazara la fila entera, la hoja quedaría vacía en
// pantalla. Por eso se mezcla con lo que ya se tenía.
export function fusionarFila(vieja, nueva) {
  return vieja ? { ...vieja, ...nueva } : nueva
}

// ¿La fila que llega es más vieja que la que ya se tiene? Pasa cuando el tiempo
// real entrega tarde el eco de una escritura anterior: aplicarla regresaría la
// pantalla a un valor que ya cambió. Solo se decide con "actualizado"; si
// alguna de las dos no lo trae (o no se entiende), se toma como nueva.
export function esMasVieja(nueva, vieja) {
  const a = Date.parse(nueva?.actualizado)
  const b = Date.parse(vieja?.actualizado)
  return Number.isFinite(a) && Number.isFinite(b) && a < b
}

// Escrituras a una misma fila, una detrás de otra.
// Si dos toques rápidos mandan dos cambios a la vez, la respuesta del primero
// (que no trae el segundo) llegaba después y borraba el segundo de la pantalla;
// el tercer toque se calculaba sobre ese valor viejo y se perdía un cambio.
// Con la cola: cada clave ("personaje:<id>", "miedo:<campaña>"…) manda sus
// escrituras en orden y solo la última respuesta se pinta (ya trae todas).
export function crearColas() {
  const colas = new Map() // clave -> { cola: Promise, pendientes: número }
  return {
    // Corre fn cuando terminen las escrituras anteriores de la misma clave
    poner(clave, fn) {
      const c = colas.get(clave) ?? { cola: Promise.resolve(), pendientes: 0 }
      c.pendientes++
      colas.set(clave, c)
      const p = c.cola.then(() => fn())
      const fin = () => {
        c.pendientes--
        if (c.pendientes === 0 && colas.get(clave) === c) colas.delete(clave)
      }
      c.cola = p.then(fin, fin)
      return p
    },
    // Hay escrituras en camino: el tiempo real de esa fila se ignora mientras
    ocupada: (clave) => colas.has(clave),
    // Desde dentro de fn: ¿es la última escritura en cola de esa clave?
    ultima: (clave) => (colas.get(clave)?.pendientes ?? 0) <= 1,
    vaciar: () => colas.clear(),
  }
}

// Lee un valor dentro de un objeto siguiendo una ruta (['armas', '0', 'nombre'])
export function leerRuta(obj, ruta) {
  let o = obj
  for (const k of ruta) {
    if (o == null || typeof o !== 'object') return undefined
    o = o[k]
  }
  return o
}

// Copia obj con valor puesto en la ruta (crea lo que falte). Con valor
// undefined quita la llave: así se deshace un cambio que agregó algo nuevo
// (si era el último elemento de una lista, la lista se acorta).
export function ponerEnRuta(obj, ruta, valor) {
  const copia = obj == null ? {} : JSON.parse(JSON.stringify(obj))
  let o = copia
  for (let i = 0; i < ruta.length - 1; i++) {
    const k = ruta[i]
    if (o[k] == null || typeof o[k] !== 'object') {
      if (valor === undefined) return copia
      o[k] = /^\d+$/.test(String(ruta[i + 1])) ? [] : {}
    }
    o = o[k]
  }
  const ultima = ruta.at(-1)
  if (valor !== undefined) o[ultima] = valor
  else if (Array.isArray(o)) { if (Number(ultima) === o.length - 1) o.pop() }
  else delete o[ultima]
  return copia
}

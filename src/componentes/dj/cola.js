// Cola de guardado del panel del DJ (encuentros y cuentas regresivas).
//
// El problema: en combate el DJ marca daño rápido, más rápido que la red.
// Cada clic manda la lista COMPLETA de adversarios. La respuesta del primer
// guardado (o su eco por el tiempo real) llegaba después del segundo clic y
// regresaba la pantalla a la lista vieja; el siguiente clic partía de esa
// lista vieja y se borraba el daño de en medio. Lo mismo con «−1» en una
// cuenta regresiva.
//
// La solución: los cambios se juntan por fila, se manda UN guardado a la vez
// (siempre con lo más nuevo) y, mientras falte confirmar algo (y un ratito
// después, para los ecos atrasados del tiempo real), la pantalla usa la
// copia local. Si un guardado falla, se tira la copia local de esa fila y
// manda lo que diga el servidor.

export function crearCola(guardar, { gracia = 1500, alCambiar = () => {} } = {}) {
  const filas = new Map() // id -> { cambios, sinMandar, esperando, timer }
  let corriendo = null

  const avisar = () => alCambiar(Object.fromEntries([...filas].map(([id, f]) => [id, f.cambios])))

  function soltar(id, f) {
    if (filas.get(id) !== f) return
    clearTimeout(f.timer)
    filas.delete(id)
    avisar()
  }

  async function correr() {
    for (;;) {
      const par = [...filas].find(([, f]) => f.sinMandar)
      if (!par) return
      const [id, f] = par
      const cambios = f.sinMandar
      const esperando = f.esperando
      f.sinMandar = null
      f.esperando = []
      try {
        await guardar(id, cambios)
      } catch (e) {
        // Lo que venía detrás de un guardado fallido también se descarta
        const tambien = filas.get(id) === f ? f.esperando : []
        soltar(id, f)
        for (const x of [...esperando, ...tambien]) x.mal(e)
        continue
      }
      for (const x of esperando) x.ok()
      if (filas.get(id) === f && !f.sinMandar) {
        clearTimeout(f.timer)
        f.timer = setTimeout(() => { if (!f.sinMandar) soltar(id, f) }, gracia)
      }
    }
  }

  return {
    // Guarda estos cambios de la fila "id". Regresa una promesa que se
    // cumple cuando el servidor los confirma (o falla con su error).
    poner(id, cambios) {
      let f = filas.get(id)
      if (!f) { f = { cambios: {}, sinMandar: null, esperando: [], timer: 0 }; filas.set(id, f) }
      clearTimeout(f.timer)
      f.cambios = { ...f.cambios, ...cambios }
      f.sinMandar = { ...(f.sinMandar ?? {}), ...cambios }
      const promesa = new Promise((ok, mal) => f.esperando.push({ ok, mal }))
      avisar()
      if (!corriendo) corriendo = correr().finally(() => { corriendo = null })
      return promesa
    },
    // Lo que la pantalla debe ver encima de la fila del servidor
    local(id) { return filas.get(id)?.cambios ?? null },
    // Espera a que no quede nada por mandar
    esperar() { return corriendo ?? Promise.resolve() },
    // La fila ya no existe (se borró): se olvida su copia local
    olvidar(id) {
      const f = filas.get(id)
      if (!f) return
      for (const x of f.esperando) x.ok()
      f.esperando = []
      f.sinMandar = null
      soltar(id, f)
    },
  }
}

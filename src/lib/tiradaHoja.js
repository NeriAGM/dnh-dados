// Tiradas que la hoja necesita leer (descansos y movimientos de muerte).
// Pasan por el mismo tirar() que todo lo demás: en la app real las decide el
// servidor; en modo demostración, el generador local.
// Si la mesa le pasa a la hoja un "onTirarResultado" (que anime los dados y
// devuelva la tirada), se usa ese; si no, se tira aquí y se anota en el historial.

import { tirar } from './tirador.js'
import { app, registrarPropia } from './mesa.svelte.js'

export async function tirarDesdeHoja(pj, params) {
  const campania = app.demo ? null : (pj?.campania_id ?? app.campania?.id ?? null)
  const t = await tirar({ ...params, campania, personaje: app.demo ? null : pj?.id ?? null })
  if (!app.demo) registrarPropia(t)
  return t
}

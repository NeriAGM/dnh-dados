// En un UPDATE, el tiempo real de Supabase NO manda las columnas grandes que no
// cambiaron (por ejemplo la hoja de un personaje cuando solo cambió su Esperanza
// por una tirada). Si se reemplazara la fila entera, la hoja quedaría vacía en
// pantalla. Por eso se mezcla con lo que ya se tenía.
export function fusionarFila(vieja, nueva) {
  return vieja ? { ...vieja, ...nueva } : nueva
}

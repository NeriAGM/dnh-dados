// Frases que explican una tirada, iguales en el resultado grande y en el historial.

export function resumenDesenlace(t) {
  if (t.tipo === 'accion' || t.tipo === 'reaccion') {
    if (t.desenlace === 'critico') return { clase: 'critico', texto: '¡Crítico!' }
    if (t.desenlace === 'esperanza') return { clase: 'esperanza', texto: 'con Esperanza' }
    if (t.desenlace === 'miedo') return { clase: 'miedo', texto: 'con Miedo' }
  }
  if (t.tipo === 'dj' && t.critico) return { clase: 'critico-dj', texto: '¡20 natural!' }
  if (t.tipo === 'dano' && t.efectos?.dano_critico_extra) return { clase: 'critico-dj', texto: 'Daño crítico' }
  return { clase: 'neutro', texto: '' }
}

export function consecuencias(t, nombrePJ) {
  const lista = []
  if (t.exito === true && t.dificultad != null) lista.push(`Éxito contra ${t.dificultad}`)
  if (t.exito === false && t.dificultad != null) lista.push(`Fallo contra ${t.dificultad}`)
  if (t.tipo === 'accion') {
    if (t.desenlace === 'critico') lista.push('Éxito automático', `+1 Esperanza${nombrePJ ? ` para ${nombrePJ}` : ''}`, 'Limpia 1 Estrés')
    else if (t.desenlace === 'esperanza') lista.push(`+1 Esperanza${nombrePJ ? ` para ${nombrePJ}` : ''}`)
    else if (t.desenlace === 'miedo') lista.push('El DJ gana 1 Miedo')
  }
  if (t.tipo === 'reaccion' && t.desenlace === 'critico') lista.push('Ignora los efectos')
  if (t.tipo === 'dj' && t.critico) lista.push('Acierta y hace daño crítico')
  if (t.efectos?.dano_critico_extra) lista.push(`+${t.efectos.dano_critico_extra} por crítico`)
  return lista
}

export function nombreDado(d) {
  if (d.rol === 'esperanza') return 'Esperanza'
  if (d.rol === 'miedo') return 'Miedo'
  if (d.rol === 'ventaja') return 'Ventaja'
  if (d.rol === 'desventaja') return 'Desventaja'
  return `d${d.lados}`
}

export function hora(iso) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })
}

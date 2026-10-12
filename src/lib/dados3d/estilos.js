// Cómo se ve cada tipo de dado.
// cuerpo: color del dado · tinta: color del número · brillo: emisión suave
export const ESTILOS = {
  esperanza:  { cuerpo: '#e9b44c', tinta: '#3a2408', borde: '#fff1c7', brillo: '#7a4e00', metal: 0.35, aspereza: 0.32 },
  miedo:      { cuerpo: '#5b2f91', tinta: '#efe2ff', borde: '#b48cf0', brillo: '#26074d', metal: 0.25, aspereza: 0.38 },
  ventaja:    { cuerpo: '#2f8f7a', tinta: '#f2fff9', borde: '#9be6d2', brillo: '#063328', metal: 0.15, aspereza: 0.45 },
  desventaja: { cuerpo: '#a8323e', tinta: '#fff0f0', borde: '#f2a3ab', brillo: '#3d050b', metal: 0.15, aspereza: 0.45 },
  normal:     { cuerpo: '#efe4cf', tinta: '#2a1d3d', borde: '#ffffff', brillo: '#000000', metal: 0.05, aspereza: 0.5 },
  dj:         { cuerpo: '#1d1a24', tinta: '#e0475a', borde: '#5c5468', brillo: '#000000', metal: 0.6, aspereza: 0.28 },
}

export function estiloDe(rol, tipo) {
  if (rol === 'esperanza' || rol === 'miedo' || rol === 'ventaja' || rol === 'desventaja') return rol
  if (tipo === 'dj') return 'dj'
  return 'normal'
}

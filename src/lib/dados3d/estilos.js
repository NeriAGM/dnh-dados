// Cómo se ve cada tipo de dado.
// cuerpo: color del dado · tinta: color del número · brillo: emisión suave
export const ESTILOS = {
  esperanza:  { cuerpo: '#45b2ec', tinta: '#f4fbff', borde: '#d2eefd', brillo: '#0a4a73', metal: 0.2, aspereza: 0.34 },
  miedo:      { cuerpo: '#de6b93', tinta: '#fff4f8', borde: '#fbc6d8', brillo: '#5c1030', metal: 0.15, aspereza: 0.4 },
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

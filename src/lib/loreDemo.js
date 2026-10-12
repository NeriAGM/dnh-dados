// Páginas de ejemplo del lore para el modo prueba (no se guardan).
// Inventadas a propósito: el lore real de la campaña nunca sale aquí.

const ahora = () => new Date().toISOString()

export function paginasDemo() {
  const base = { campania_id: 'demo', origen: null, creado: ahora(), actualizado: ahora() }
  return [
    {
      ...base, id: 'demo-descenso', padre_id: null, orden: 10, visible: true, icono: '🕳️',
      titulo: 'El Descenso',
      contenido: `Nadie que baja vuelve **igual**. El pozo se abre en el centro de la ciudad como una herida que nunca cerró, y sus bordes están llenos de cuerdas, poleas y altares pequeños.

> «Lo que el pozo toma, el pozo lo guarda. Lo que el pozo da, lo cobra después.»
> — dicho de los cordeleros

## Las reglas del borde

- Nadie baja solo.
- Se deja una *ofrenda* antes de cada capa.
- Si escuchas tu nombre desde abajo, **no contestes**.

![Mapa de las primeras capas](lore:demo-mapa.svg)

---

Más abajo está [la primera capa](lore:pagina/00000000-0000-4000-8000-000000000001).`,
    },
    {
      ...base, id: '00000000-0000-4000-8000-000000000001', padre_id: 'demo-descenso', orden: 10, visible: true, icono: '🌿',
      titulo: 'Primera capa: el Bosque de Raíces',
      contenido: `Raíces más gruesas que una casa cuelgan del techo de la caverna. Brillan con un verde pálido cuando algo vivo pasa cerca.

### Lo que se sabe

1. La luz de las raíces dura lo que dura un latido.
2. Los *rumiadores* duermen colgados de ellas.
3. El agua de aquí sabe a hierro.

| Peligro | Señal |
|---|---|
| Rumiador | Silencio repentino |
| Esporas | Olor dulce |`,
    },
    {
      ...base, id: 'demo-secretos', padre_id: null, orden: 20, visible: false, icono: '🗝️',
      titulo: 'Secretos del DJ',
      contenido: `Esta página está **oculta para la mesa**: solo el DJ la ve hasta que la revele.

- [x] Presentar a los cordeleros
- [ ] Revelar quién llama desde abajo`,
    },
  ]
}

// Imagen de ejemplo (un mapa dibujado) como URL de objeto
export function imagenesDemo() {
  if (typeof Blob === 'undefined' || typeof URL?.createObjectURL !== 'function') return []
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 300">
  <defs>
    <radialGradient id="f" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#2c2140"/><stop offset="1" stop-color="#0d0a18"/></radialGradient>
    <radialGradient id="l" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#9ff0c8" stop-opacity=".55"/><stop offset="1" stop-color="#9ff0c8" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="640" height="300" fill="url(#f)"/>
  <g fill="none" stroke="#d9b56b" stroke-width="1.5" opacity=".85">
    <ellipse cx="320" cy="60" rx="230" ry="26"/>
    <ellipse cx="320" cy="120" rx="180" ry="22" stroke-dasharray="6 5"/>
    <ellipse cx="320" cy="180" rx="130" ry="18" stroke-dasharray="3 6"/>
    <ellipse cx="320" cy="235" rx="80" ry="13" stroke-dasharray="2 7"/>
    <path d="M90 60 L140 120 L190 180 L240 235 M550 60 L500 120 L450 180 L400 235"/>
  </g>
  <circle cx="250" cy="125" r="34" fill="url(#l)"/><circle cx="380" cy="180" r="24" fill="url(#l)"/>
  <g fill="#f7eedf" font-family="Georgia, serif" font-size="15" text-anchor="middle">
    <text x="320" y="40">El Borde</text><text x="320" y="104">Bosque de Raíces</text>
    <text x="320" y="166" opacity=".75">???</text><text x="320" y="226" opacity=".5">???</text>
  </g>
</svg>`
  return [['demo-mapa.svg', URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))]]
}

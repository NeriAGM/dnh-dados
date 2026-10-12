# Dolor & Hambre · Mesa de dados

Mesa de dados en vivo para la campaña de Daggerheart *Dolor & Hambre*: dados 3D con física, paisaje animado según la hora y tiradas compartidas en tiempo real con toda la mesa.

Vive en **https://neriagm.github.io/dnh-dados/**. El tirador anterior sigue en `/legado/`.

## Cómo funciona el azar

El número de cada dado lo decide el **servidor** (la función `tirar()` en Supabase) con un generador criptográfico. El navegador simula la física del lanzamiento y, al final, reetiqueta las caras del dado para que la que quedó arriba muestre ese número. Resultado: física real, azar real y el mismo resultado para todos.

Nadie puede escribir tiradas directo en la base: la tabla `lanzamientos` no acepta inserciones, solo la función `tirar()`.

## Reglas que aplica (SRD de Daggerheart)

- **Acción:** d12 de Esperanza + d12 de Miedo + modificador. Con Esperanza → +1 Esperanza al personaje. Con Miedo → +1 Miedo al DJ. Dados iguales → crítico: éxito automático, +1 Esperanza y se limpia 1 Estrés.
- **Reacción:** igual, pero no genera Esperanza ni Miedo.
- **Ventaja / desventaja:** suma o resta un d6.
- **DJ:** d20 + modificador; con ventaja tira 2d20 y se queda con el más alto. Un 20 natural es crítico.
- **Daño crítico:** suma el máximo posible de los dados.
- Topes: Esperanza 6, Miedo 12.

La referencia completa de reglas está en [`docs/reglas/`](docs/reglas/).

## Estructura

```
src/
  App.svelte              capas: paisaje, dados 3D e interfaz
  componentes/            pantallas y paneles (Mesa, Lanzador, Historial…)
  lib/dados3d/            geometría, física y dibujo de los dados
  lib/fondo/paisaje.js    el paisaje animado
  lib/mesa.svelte.js      estado compartido y tiempo real
  lib/tirador.js          pedir una tirada (servidor o modo prueba)
supabase/
  migraciones/            SQL para crear tablas, seguridad y funciones
  pruebas/                pruebas de la base en un Postgres en memoria
docs/reglas/              reglas de Daggerheart en español
public/legado/            el tirador anterior
```

## Trabajar en tu computadora

```bash
npm install
npm run dev       # abre la app en http://localhost:5173/dnh-dados/
npm run probar    # corre las pruebas de reglas y seguridad
npm run build     # genera la versión final en dist/
```

Cada vez que se sube algo a `main`, GitHub Actions corre las pruebas, construye la app y la publica.

## Licencia de Daggerheart

This product includes materials from the Daggerheart System Reference Document 1.0, © Critical Role, LLC. under the terms of the Darrington Press Community Gaming (DPCGL) License. More information can be found at https://www.daggerheart.com. There are no previous modifications by others.

Uso privado de la mesa; no es un producto oficial de Darrington Press.

// Pruebas del markdown del lore: lo que se ve y, sobre todo, que no se
// cuele HTML ni enlaces peligrosos.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mdLore, urlSegura, imagenesDe, md } from './md.js'

test('títulos, párrafos, negritas, cursivas y tachado', () => {
  assert.equal(mdLore('# Capa uno'), '<h2>Capa uno</h2>')
  assert.equal(mdLore('### Sub'), '<h4>Sub</h4>')
  assert.equal(mdLore('Hola **mundo** y *abismo* y _cursiva_ y ~~no~~'),
    '<p>Hola <strong>mundo</strong> y <em>abismo</em> y <em>cursiva</em> y <del>no</del></p>')
  assert.equal(mdLore('una\ndos\n\ntres'), '<p>una<br>dos</p><p>tres</p>')
  assert.equal(mdLore('nombre_de_archivo y 2*3*4'), '<p>nombre_de_archivo y 2*3*4</p>')
})

test('listas, casillas, citas, separador y código', () => {
  assert.equal(mdLore('- a\n- b'), '<ul><li>a</li><li>b</li></ul>')
  assert.equal(mdLore('1. a\n2. b'), '<ol><li>a</li><li>b</li></ol>')
  assert.equal(mdLore('- [x] hecho\n- [ ] falta'), '<ul><li class="casilla hecha">hecho</li><li class="casilla">falta</li></ul>')
  assert.equal(mdLore('> dice el **eco**\n> y sigue'), '<blockquote><p>dice el <strong>eco</strong><br>y sigue</p></blockquote>')
  assert.equal(mdLore('---'), '<hr>')
  assert.equal(mdLore('```\n<b>**x**</b>\n```'), '<pre><code>&lt;b&gt;**x**&lt;/b&gt;</code></pre>')
  assert.equal(mdLore('usa `**esto**`'), '<p>usa <code>**esto**</code></p>')
})

test('imágenes y enlaces permitidos', () => {
  assert.equal(mdLore('![Mapa](lore:1-mapa.webp)'), '<p><img data-lore="1-mapa.webp" alt="Mapa" loading="lazy"></p>')
  assert.match(mdLore('![x](https://ej.com/a.png)'), /<img src="https:\/\/ej.com\/a.png" alt="x"/)
  assert.match(mdLore('[web](https://ej.com)'), /<a href="https:\/\/ej.com" target="_blank" rel="noopener noreferrer nofollow">web<\/a>/)
  const id = '0f0e0d0c-1111-2222-3333-444455556666'
  assert.equal(mdLore(`[Abismo](lore:pagina/${id})`), `<p><a href="#" data-pagina="${id}">Abismo</a></p>`)
  assert.deepEqual(imagenesDe('![a](lore:a.png) y ![b](lore:b.webp) y ![c](https://x/c.png)'), ['a.png', 'b.webp'])
})

test('no se cuela HTML', () => {
  const h = mdLore('<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n# <b>t</b>')
  assert.ok(!/<script|<img src=x|<b>/.test(h), h)
  assert.match(h, /&lt;script&gt;/)
  const t = mdLore('| <i>a</i> | b |\n|---|---|\n| 1 | 2 |')
  assert.ok(!t.includes('<i>'))
  assert.match(t, /<th>&lt;i&gt;a&lt;\/i&gt;<\/th>/)
})

test('no se cuelan enlaces peligrosos', () => {
  for (const url of ['javascript:alert(1)', 'JavaScript:alert(1)', 'java\tscript:alert(1)',
    'data:text/html,hola', 'vbscript:x', 'lore:../../otra/x.png', 'lore:pagina/no-uuid', 'lore:.oculto']) {
    const h = mdLore(`[clic](${url}) ![img](${url})`)
    assert.ok(!/href="(?!#")|src=|data-lore|data-pagina/i.test(h), `${JSON.stringify(url)} → ${h}`)
  }
  // Las comillas se escapan: no pueden cerrar el atributo
  const h = mdLore('[x](https://ej.com/"onmouseover="alert(1))')
  assert.ok(!h.includes('"onmouseover'), h)
  // Las entidades llegan escapadas: el navegador no las convierte en "javascript:"
  assert.equal(urlSegura('jav&amp;#x61;script:alert(1)')?.tipo, 'relativa')
})

test('el markdown del SRD no cambió', () => {
  assert.equal(md('# Título'), '<p><strong>Título</strong></p>')
  assert.equal(md('- a'), '<ul><li>a</li></ul>')
})

test('una tabla que solo trae la línea de guiones no truena', () => {
  // Antes: md('|---|') tronaba (encabezado undefined) y tumbaba el panel
  assert.equal(md('|---|---|'), '')
  assert.equal(md('texto\n| :-- |\nmás'), '<p>texto</p><p>más</p>')
  assert.equal(md('| a | b |\n|---|---|\n| 1 | 2 |'), '<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>')
})

test('muchas citas anidadas no agotan la pila', () => {
  const h = mdLore('>'.repeat(20000) + ' hondo')
  assert.match(h, /hondo/)
  assert.equal(mdLore('> > dentro'), '<blockquote><blockquote><p>dentro</p></blockquote></blockquote>')
})

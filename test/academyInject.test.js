// The lesson pages get frame hooks injected by scripts/sync-course.mjs.
//
// Kills: the head hook landing after the lesson's style/script; a second
// sync duplicating the blocks (files growing on every dev start); an asset
// that closes the host <script> early; external URLs in injected code.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { injectLesson, stripInjected, INJECT_START } from '../scripts/academyInject.mjs'

const dir = new URL('../scripts/academy-inject/', import.meta.url)
const asset = (n) => readFileSync(new URL(n, dir), 'utf8')
const assets = { headJs: asset('head.js'), frameCss: asset('frame.css'), frameJs: asset('frame.js') }
const FIXTURE = '<title>x</title>\n<style>a{}</style>\n<main class="wrap"></main>\n<script>var L=1</script>'
const inject = (h, a = assets) => injectLesson(h, a)
const count = (s, sub) => s.split(sub).length - 1

test('head block precedes the first style and script, tail block follows the lesson script', () => {
  const out = inject(FIXTURE)
  assert.equal(count(out, INJECT_START), 2)
  assert.ok(out.indexOf(INJECT_START) < out.indexOf('<style>a{}'))
  assert.ok(out.indexOf(INJECT_START) < out.indexOf('var L=1'))
  assert.ok(out.lastIndexOf(INJECT_START) > out.indexOf('var L=1'))
})

test('injecting twice equals once; stripping restores the source', () => {
  assert.equal(inject(inject(FIXTURE)), inject(FIXTURE))
  assert.equal(stripInjected(inject(FIXTURE)), FIXTURE)
})

test('a page with </head> and </body> gets the blocks inside them', () => {
  const page = '<html><head><title>x</title></head><body><p>hi</p></body></html>'
  const out = inject(page)
  assert.ok(out.indexOf(INJECT_START) < out.indexOf('</head>'))
  assert.ok(out.lastIndexOf(INJECT_START) < out.indexOf('</body>'))
  assert.equal(stripInjected(out), page)
})

test('an asset that would close the host script is rejected', () => {
  assert.throws(() => inject(FIXTURE, { ...assets, frameJs: 'var s="</script>"' }))
  assert.throws(() => inject(FIXTURE, { ...assets, headJs: '<!-- x -->' }))
})

test('real assets load nothing external', () => {
  for (const text of Object.values(assets)) {
    assert.ok(!/https?:\/\//.test(text))
    assert.ok(!/\bimport\s/.test(text))
  }
})

test('class mode rewires only this window\'s storage and talks to its own origin', () => {
  assert.ok(assets.headJs.includes('Storage.prototype'))
  assert.ok(assets.headJs.includes('ds-cls-'))
  assert.ok(assets.frameJs.includes('location.origin'))
})

const scriptsDir = new URL('../scripts/', import.meta.url)
const fxCss = readFileSync(new URL('academy-fx.css', scriptsDir), 'utf8')
const fxJs = readFileSync(new URL('academy-fx.js', scriptsDir), 'utf8')

test('motion layer respects reduced motion and loads nothing external', () => {
  assert.ok(fxCss.includes('prefers-reduced-motion'))
  assert.ok(fxJs.includes('prefers-reduced-motion'))
  for (const text of [fxCss, fxJs]) {
    assert.ok(!/https?:\/\//.test(text))
    assert.ok(!/\bimport\s/.test(text))
    assert.ok(!/<\/script/i.test(text))
  }
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(fxCss))
})

test('synced lesson pages carry the motion layer exactly once', () => {
  const html = readFileSync(new URL('../public/course/lesson-01.html', import.meta.url), 'utf8')
  assert.equal(count(html, 'Motion layer for the lesson pages'), 1)
  assert.equal(count(html, 'Academy motion layer'), 1)
})

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
  assert.ok(assets.frameJs.includes('Escape'))
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

// ---- brand v1: recolor, self-hosted fonts, brand layer ----
import { readdirSync, existsSync } from 'node:fs'
import { recolor, stripExternalFonts } from '../scripts/academyInject.mjs'

const root = new URL('../', import.meta.url)
const scripts = new URL('scripts/', root)
const brandCss = readFileSync(new URL('academy-brand.css', scripts), 'utf8')
const recolorMap = JSON.parse(readFileSync(new URL('academy-recolor.json', scripts), 'utf8'))
const brandAssets = { ...assets, brandCss, recolorMap }

// Kills: a recolor/strip step that is not idempotent (files drift on every sync).
test('brand injection twice equals once', () => {
  const page = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">\n<style>a{color:#0E6B43}</style>\n<script>var L=1</script>'
  assert.equal(inject(inject(page, brandAssets), brandAssets), inject(page, brandAssets))
})

// Kills: the Google Fonts link surviving in a lesson.
test('Google Fonts links are removed', () => {
  const out = stripExternalFonts('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?x">\n<p>x</p>')
  assert.equal(out, '<p>x</p>')
})

// Kills: recolor rewriting the lesson's JS (logic must stay untouched).
test('recolor changes style but never script', () => {
  const out = recolor('<style>a{color:#0E6B43}</style><script>var c="#0E6B43"</script><svg fill="#0e6b43"/>', recolorMap)
  assert.ok(out.includes('<style>a{color:#1B2338}</style>'))
  assert.ok(out.includes('<script>var c="#0E6B43"</script>'))
  assert.ok(out.includes('fill="#1B2338"'))
})

// Kills: a value that is also a key (a second pass would chain the swap).
test('recolor map keys and values do not overlap', () => {
  const keys = new Set(Object.keys(recolorMap).map((k) => k.toLowerCase()))
  assert.deepEqual(Object.values(recolorMap).filter((v) => keys.has(v.toLowerCase())), [])
})

test('brand css is safe to inline and its fonts exist', () => {
  assert.ok(!/https?:/.test(brandCss))
  assert.ok(!brandCss.includes('<!--'))
  assert.ok(!/<\/script/i.test(brandCss))
  for (const m of brandCss.matchAll(/url\('\/fonts\/([^']+)'\)/g)) {
    assert.ok(existsSync(new URL(`public/fonts/${m[1]}`, root)), m[1])
  }
})

// Kills: a generated lesson that still pulls Google Fonts or carries the brand layer twice.
test('every generated lesson is branded exactly once', () => {
  const dirUrl = new URL('public/course/', root)
  const files = readdirSync(dirUrl).filter((n) => /^lesson-\d+\.html$/.test(n))
  assert.ok(files.length > 0)
  for (const n of files) {
    const html = readFileSync(new URL(n, dirUrl), 'utf8')
    assert.ok(!html.includes('fonts.googleapis'), n)
    assert.equal(count(html, '@font-face{font-family:"Space Grotesk Variable"'), 2, n)
  }
})

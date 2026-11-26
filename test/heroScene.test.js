// The hero scene of the 12 course lessons is one shared component
// (public/course/shared/hero-scene.js). Each lesson only carries the svg with
// its data-signs and one script tag. Every test names the mutation it kills.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const lessonPath = (n) => join(root, 'public', 'course', `lesson-${String(n).padStart(2, '0')}.html`)
const read = (p) => readFileSync(p, 'utf8')
const LESSONS = Array.from({ length: 12 }, (_, i) => i + 1)

const SIGNS = {
  1: [['ROL', '7'], ['FAKT', '✓'], ['TAXMIN', '?']],
  2: [['OG‘IRLIK', '80K'], ['TRAILER', "53'"], ['TARE', '36K']],
  3: [['HAYDASH', '11'], ['OYNA', '14'], ['HAFTA', '70']],
  4: [['SERVIS', '25K'], ['YILLIK', '12'], ['MPG', '6.5']],
  5: [['$ / MIL', '2.4'], ['RATIO', '3:1'], ['MARJA', '15%']],
  6: [['E’LON', '3m'], ['$ / MIL', '2.7'], ['BROKER', 'MC ✓']],
  7: [['XARAJAT', '1.6'], ['FOYDA', '0.5'], ['BREAK', 'B/E']],
  8: [['OCHISH', '115%'], ['MAQSAD', '$1.9K'], ['FLOOR', '$1.8K']],
  9: [['RATE', 'CON'], ['ETA', '9:40'], ['POD', '✓']],
  10: [['HEAD', '$$$'], ['BACK', '$'], ['NEXT', '✓']],
  11: [['CALL', '!'], ['ETA', '2h'], ['FIX', '✓']],
  12: [['LOAD', '$'], ['CALL', '!'], ['DONE', '✓']],
}

const SCRIPT_TAG = '<script defer src="/course/shared/hero-scene.js"></script>'
const SVG_RE = /<svg class="scene"[^>]*>[\s\S]*?<\/svg>/g
const unescapeAttr = (s) => s.replace(/&#39;/g, "'").replace(/&amp;/g, '&')

// svg + the script tag that follows it, with data-signs blanked
function sceneBlock(html) {
  const m = /<svg class="scene"[^>]*>[\s\S]*?<\/svg>\s*<script defer src="\/course\/shared\/hero-scene\.js"><\/script>/.exec(html)
  return m && m[0].replace(/data-signs='[^']*'/, "data-signs=''")
}

test('every lesson has one scene svg whose data-signs equal the expected texts', () => {
  // kills: a mistyped sign text, a lesson that lost or doubled its scene
  for (const n of LESSONS) {
    const html = read(lessonPath(n))
    const svgs = html.match(SVG_RE) || []
    assert.equal(svgs.length, 1, `lesson ${n}: svg.scene count`)
    const attr = /data-signs='([^']*)'/.exec(svgs[0])
    assert.ok(attr, `lesson ${n}: data-signs`)
    assert.deepEqual(JSON.parse(unescapeAttr(attr[1])), SIGNS[n], `lesson ${n}: signs`)
  }
})

test('every lesson loads the shared script exactly once', () => {
  // kills: a scene without its script, or a second copy of it
  for (const n of LESSONS) {
    const html = read(lessonPath(n))
    assert.equal(html.split(SCRIPT_TAG).length - 1, 1, `lesson ${n}: script tag`)
    assert.equal((html.match(/hero-scene\.js/g) || []).length, 1, `lesson ${n}: hero-scene.js mentions`)
  }
})

test('the scene block is byte-identical across lessons except data-signs', () => {
  // kills: a hand-edited scene in one lesson that drifts from the others
  const first = sceneBlock(read(lessonPath(1)))
  assert.ok(first, 'lesson 1 scene block')
  for (const n of LESSONS) {
    assert.equal(sceneBlock(read(lessonPath(n))), first, `lesson ${n}: scene block`)
  }
})

test('no trace of the old hero scene code is left in the lessons', () => {
  // kills: the old per-lesson scene CSS/JS coming back from a sync or merge
  // (lesson 2 has its own unrelated svg.rig diagram, so only the scene's <g class="rig"> counts)
  const OLD = /sceneAnims|ds-spoke|ds-scene-off|ds-paused|@keyframes lane|@keyframes bob\{|<path class="lane"|<g class="rig">/
  for (const n of LESSONS) {
    const m = OLD.exec(read(lessonPath(n)))
    assert.equal(m, null, `lesson ${n}: ${m && m[0]}`)
  }
})

test('the academy-fx sync source no longer animates the hero', () => {
  // kills: the old "3. Hero" block being re-injected by the sync
  const fx = read(join(root, 'scripts', 'academy-fx.js'))
  assert.ok(!fx.includes('sceneAnims'))
  const css = read(join(root, 'scripts', 'academy-fx.css'))
  assert.ok(!/ds-spoke|ds-spin|ds-scene-off|ds-paused/.test(css))
})


// ---------------------------------------------------------------------------
// Geometry. The layout math is pure (HS_PURE in hero-scene.js), so it runs here
// with a deterministic width estimator instead of a browser.
// NOTE: this is an estimate (Arial Bold advance widths). The real glyph checks
// (text inside its face, no overlap, static frame inside the view) run in a real
// browser in output/playwright/scene-all-check.cjs; that script also fails when
// any text had to fall back to textLength squeezing (distorted glyphs).

const JS_PATH = join(root, 'public', 'course', 'shared', 'hero-scene.js')
function loadPure() {
  const sandbox = { module: { exports: {} } }   // no `document`: only the pure part runs
  vm.runInNewContext(read(JS_PATH), sandbox)
  return sandbox.module.exports
}
const HS = loadPure()
const K = HS.K

// Arial Bold advance widths per 1000 em
const AW = {
  A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 556, K: 722, L: 611, M: 833,
  N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  a: 556, b: 611, c: 556, d: 611, e: 556, f: 333, g: 611, h: 611, i: 278, j: 278, k: 556, l: 278, m: 889,
  n: 611, o: 611, p: 611, q: 611, r: 389, s: 556, t: 333, u: 611, v: 556, w: 778, x: 556, y: 556, z: 500,
  0: 556, 1: 556, 2: 556, 3: 556, 4: 556, 5: 556, 6: 556, 7: 556, 8: 556, 9: 556,
  $: 556, '%': 889, '/': 278, ':': 333, '.': 278, "'": 238, '!': 333, '?': 611, ' ': 278, '✓': 800,
  '‘': 278, '’': 278, '-': 333,
}
const LABEL_SPACING = 1   // letter-spacing="1" on labels, added after every char like Chrome does
function estimate(text, fs, isLabel) {
  let w = 0
  for (const ch of text) w += (AW[ch] ?? 600) * fs / 1000 + (isLabel ? LABEL_SPACING : 0)
  return w
}
function signsFor(n) {
  return SIGNS[n].map(([label, value]) => {
    const r = HS.sizeSign((kind, fs) => (kind === 'label' ? estimate(label, fs, true) : estimate(value, fs, false)))
    return { label, value, ...r }
  })
}

test('the file is plain script: exports only where `module` exists, no browser global', () => {
  // kills: a top-level global leaking into every lesson page, or the pure part not being reachable from node
  const src = read(JS_PATH)
  assert.ok(/if \(typeof module === 'object' && module\.exports\) module\.exports = HS_PURE;\s*\}\)\(\);\s*$/.test(src))
  assert.ok(!/^var |^function |window\.HS/m.test(src), 'nothing at top level')
  assert.equal(typeof HS.staticFrame, 'function')
})

test('every label and value, plus padding, fits its face (all 12 lessons)', () => {
  // kills: "115%" / "80K" spilling out of the face, a face wider than the 96 limit, a font that stopped shrinking
  for (const n of LESSONS) {
    signsFor(n).forEach((s, i) => {
      for (const [name, st] of [['normal', s.n], ['compact', s.c]]) {
        const lw = estimate(s.label, st.lfs, true), vw = estimate(s.value, st.vfs, false)
        const tag = `lesson ${n} sign ${i + 1} (${s.label}/${s.value}) ${name}`
        assert.ok(lw + K.PAD <= st.w + 1e-9, `${tag}: label ${lw.toFixed(1)}+${K.PAD} > face ${st.w}`)
        assert.ok(vw + K.PAD <= st.w + 1e-9, `${tag}: value ${vw.toFixed(1)}+${K.PAD} > face ${st.w}`)
        assert.ok(st.w >= K.MINW && st.w <= K.MAXW, `${tag}: face ${st.w} outside ${K.MINW}..${K.MAXW}`)
        assert.ok(st.vfs >= K.VMIN && st.lfs >= K.LMIN, `${tag}: font below the minimum`)
      }
      assert.ok(s.c.w <= s.n.w, `lesson ${n} sign ${i + 1}: compact face wider than normal`)
    })
  }
})

test('long values shrink instead of overflowing', () => {
  // kills: dropping the shrink loop (a 6 em wide value at 30px is wider than any face)
  const wide = HS.sizeSign((kind, fs) => (kind === 'label' ? 20 : fs * 6))
  assert.equal(wide.n.vfs, K.VMIN)
  assert.equal(wide.n.w, K.MAXW)
  const short = HS.sizeSign((kind, fs) => (kind === 'label' ? 20 : fs * 0.5))
  assert.equal(short.n.vfs, K.V0)
  assert.equal(short.n.w, K.MINW)
})

const rect = (x, w) => [x - w / 2, x + w / 2]
const hit = (a, b) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]) > 0.5

test('faces never overlap each other or the billboard while moving (many offsets, both board scales)', () => {
  // kills: gaps that are too small, a board scale that is not part of the spacing, a wrong loop length
  for (const n of LESSONS) {
    const sg = signsFor(n), ws = sg.map((s) => s.n.w), cy = HS.cycle(ws)
    for (const sc of [1, K.NARROW_SCALE]) {
      for (let o = 0; o < cy.cyc; o += 7) {
        const p = HS.positions(cy, o)
        const items = []
        for (const shift of [-cy.cyc, 0, cy.cyc]) {   // the next / previous lap is also on the road
          p.xs.forEach((x, i) => items.push({ n: 'sign ' + (i + 1), r: rect(x + shift, ws[i]) }))
          items.push({ n: 'board', r: rect(p.bx + shift, K.BW * sc) })
        }
        for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
          assert.ok(!hit(items[a].r, items[b].r), `lesson ${n} offset ${o} scale ${sc}: ${items[a].n} overlaps ${items[b].n}`)
        }
      }
    }
  }
})

function staticFor(n, narrow) {
  const sg = signsFor(n)
  return { sg, f: HS.staticFrame(sg.map((s) => s.n.w), sg.map((s) => s.c.w), narrow) }
}

test('static frame: every sign and the board fully inside the view, wide and narrow, never drop-first', () => {
  // kills: a sign or the billboard cropped out of the still frame, falling back to dropping the first sign
  for (const n of LESSONS) {
    for (const narrow of [false, true]) {
      const { sg, f } = staticFor(n, narrow)
      const tag = `lesson ${n} ${narrow ? 'narrow' : 'wide'} (${f.kind}, board ${f.board})`
      assert.notEqual(f.kind, 'drop-first', tag)
      assert.ok(['fit', 'tight', 'tight-board', 'compact'].includes(f.kind), tag)
      const x0 = narrow ? 60 : 0, x1 = narrow ? 680 : 880
      const boxes = sg.map((s, i) => {
        assert.notEqual(f.xs[i], null, `${tag}: sign ${i + 1} missing`)
        return { n: 'sign ' + (i + 1), r: rect(f.xs[i], f.ws[i]) }
      })
      boxes.push({ n: 'board', r: rect(f.bx, K.BW * f.board) })
      boxes.forEach((b) => assert.ok(b.r[0] >= x0 && b.r[1] <= x1, `${tag}: ${b.n} ${b.r.map((v) => v.toFixed(1))} outside ${x0}..${x1}`))
      for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
        assert.ok(!hit(boxes[a].r, boxes[b].r), `${tag}: ${boxes[a].n} overlaps ${boxes[b].n}`)
      }
      assert.ok(f.board >= K.SCALE_MIN, `${tag}: board shrunk below ${K.SCALE_MIN}`)
    }
  }
})

test('static frame order: fit, tight, tight-board (scale down to 0.85), compact, drop-first', () => {
  // kills: skipping a step of the order, a board that shrinks below 0.85, drop-first used before it is needed
  const roomy = HS.staticFrame([60, 60, 60], [48, 48, 48], false)
  assert.equal(roomy.kind, 'fit')
  assert.equal(roomy.board, 1)
  // widest real case (lesson 8 sizes): 94 + 92 + 92 on the phone view
  const l8 = HS.staticFrame([94, 92, 92], [60, 60, 60], true)
  assert.equal(l8.kind, 'tight-board')
  assert.ok(l8.board >= 0.85 && l8.board < 1.25, 'board ' + l8.board)
  assert.ok(278 + 32 + 24 + 300 * 0.85 <= 604, 'the 0.85 case fits the 604 room')
  // a very wide trio: only the compact first sign saves it
  const comp = HS.staticFrame([110, 110, 110], [48, 110, 110], true)
  assert.equal(comp.kind, 'compact')
  assert.equal(comp.board, 0.85)
  assert.equal(comp.ws[0], 48)
  // impossible: drop-first is the last resort and the first sign is not drawn
  const drop = HS.staticFrame([300, 300, 300], [300, 300, 300], true)
  assert.equal(drop.kind, 'drop-first')
  assert.equal(drop.xs[0], null)
  assert.ok(drop.xs[1] !== null && drop.xs[2] !== null)
})

test('tone: ticks are good, ! and ? are warnings, an explicit tone wins', () => {
  // kills: a wrong default tone for the sign colours
  assert.equal(HS.tone('✓', undefined), 'good')
  assert.equal(HS.tone('MC ✓', undefined), 'good')
  assert.equal(HS.tone('!', undefined), 'warn')
  assert.equal(HS.tone('?', undefined), 'warn')
  assert.equal(HS.tone('80K', undefined), 'neutral')
  assert.equal(HS.tone('80K', 'good'), 'good')
  assert.equal(HS.tone('✓', 'bogus'), 'good')
})

// Scroll-reveal layer on the 12 course lessons (course/add_reveal.py).
//
// Kills: a lesson missing or doubling a reveal block; drifted timing values;
// demo leftovers (badge, ?force, debug globals) shipping to users; the
// reduced-motion guard disappearing; the academy-fx slide-in running on top
// of the reveal layer.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const lessons = Array.from({ length: 12 }, (_, i) => {
  const name = `lesson-${String(i + 1).padStart(2, '0')}.html`
  return [name, readFileSync(new URL(`../public/course/${name}`, import.meta.url), 'utf8')]
})
const count = (s, sub) => s.split(sub).length - 1

function blocks(html) {
  const head = /<!-- reveal:start -->[\s\S]*?<!-- reveal:head-end -->/.exec(html)
  const tail = /<!-- reveal:tail -->[\s\S]*?<!-- \/reveal -->/.exec(html)
  return { head: head?.[0], tail: tail?.[0] }
}

for (const [name, html] of lessons) {
  test(`${name}: exactly one head block and one tail block, head after lang marker, tail last`, () => {
    assert.equal(count(html, '<!-- reveal:start -->'), 1)
    assert.equal(count(html, '<!-- reveal:head-end -->'), 1)
    assert.equal(count(html, '<!-- reveal:tail -->'), 1)
    assert.equal(count(html, '<!-- /reveal -->'), 1)
    const lang = html.indexOf('setAttribute("lang","uz")')
    assert.ok(lang >= 0 && lang < html.indexOf('<!-- reveal:start -->'))
    assert.ok(html.indexOf('<!-- reveal:start -->') < html.indexOf('<!-- academy:inject -->'))
    assert.ok(html.trimEnd().endsWith('<!-- /reveal -->'))
  })

  test(`${name}: exact timing values, no demo leftovers`, () => {
    const { head, tail } = blocks(html)
    assert.ok(head && tail)
    assert.ok(head.includes('translateY(16px)'))
    assert.ok(head.includes('opacity .42s cubic-bezier(.25,1,.5,1)'))
    assert.ok(head.includes('transform .52s cubic-bezier(.25,1,.5,1)'))
    assert.ok(head.includes('html.rv-on .rv.lcard{transition:') && head.includes('border-color .2s'), 'lcard keeps its border-color transition')
    assert.ok(tail.includes('STEP=55') && tail.includes('MAXSTEP=4'))
    assert.ok(tail.includes("threshold:0.06,rootMargin:'0px 0px -5% 0px'"))
    assert.ok(tail.includes("'.sec > *, .finish, .mentor'"))
    for (const text of [head, tail]) {
      assert.ok(!/force|badge|__rv|Animatsiya/i.test(text), 'demo leftover')
      assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(text), 'hardcoded colour')
    }
  })

  test(`${name}: reduced motion and missing IntersectionObserver never enable the mode`, () => {
    const { head, tail } = blocks(html)
    assert.ok(head.includes("matchMedia('(prefers-reduced-motion: reduce)').matches"))
    assert.ok(head.includes("'IntersectionObserver' in window && !reduced"))
    assert.ok(head.includes('@media print'))
    assert.ok(tail.includes('try{') && tail.includes('function bail()'))
    assert.ok(tail.includes("classList.remove('rv-on')"))
  })

  test(`${name}: academy-fx slide-in yields to the reveal layer`, () => {
    assert.ok(html.includes("if (!present && !root.classList.contains('rv-on')) {"))
  })
}

test('academy-fx source matches the patched lessons', () => {
  const fx = readFileSync(new URL('../scripts/academy-fx.js', import.meta.url), 'utf8')
  assert.ok(fx.includes("if (!present && !root.classList.contains('rv-on')) {"))
})

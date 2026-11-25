// The name and logo live in src/brand.js; screens read it instead of
// repeating the literal, so a rename is a one-file change.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BRAND } from '../src/brand.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const BANNED = /\b(simulation|scenario|score|training|test)\b/i

function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.jsx') ? [p] : []
  })
}

// Kills: an empty constant (a blank logo/title).
test('brand constants are filled', () => {
  for (const k of ['name', 'shortName', 'slogan', 'tagline', 'description', 'logoAlt', 'favicon', 'favicon32', 'appleTouchIcon', 'ogImage', 'siteUrl', 'logoWhite', 'logoWhite2x', 'logoDark', 'logoDark2x', 'mark', 'wordmarkDark', 'wordmarkDark2x']) {
    assert.ok(typeof BRAND[k] === 'string' && BRAND[k].trim(), k)
  }
})

// Kills: a forbidden word in a user-facing brand string.
test('brand strings avoid the forbidden words', () => {
  for (const v of Object.values(BRAND)) assert.ok(!BANNED.test(v), v)
})

// Kills: the name or monogram typed into a component instead of read from BRAND.
test('no screen types the brand name or monogram', () => {
  const found = files(join(root, 'src')).filter((f) => />(GrossMasters|GM)</.test(readFileSync(f, 'utf8')))
  assert.deepEqual(found, [])
})

// Kills: the page title and favicon going back to literals.
test('index.html takes title, favicon and share card from the brand', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8')
  assert.ok(html.includes('%BRAND_NAME%'))
  assert.ok(html.includes('%BRAND_FAVICON%'))
  assert.ok(html.includes('%BRAND_OG_IMAGE%'))
})

// Kills: a brand path pointing at a file that was never shipped.
test('every brand image exists in public/', () => {
  for (const k of ['favicon', 'favicon32', 'appleTouchIcon', 'ogImage', 'logoWhite', 'logoWhite2x', 'logoDark', 'logoDark2x', 'mark', 'wordmarkDark', 'wordmarkDark2x']) {
    assert.ok(existsSync(join(root, 'public', BRAND[k])), BRAND[k])
  }
})

// Kills: the manifest drifting from the brand name or losing its icons.
test('web manifest carries the brand name and maskable icons', () => {
  const m = JSON.parse(readFileSync(join(root, 'public', 'manifest.webmanifest'), 'utf8'))
  assert.equal(m.name, BRAND.name)
  assert.equal(m.short_name, BRAND.name)
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'))
  for (const i of m.icons) assert.ok(existsSync(join(root, 'public', i.src)), i.src)
})

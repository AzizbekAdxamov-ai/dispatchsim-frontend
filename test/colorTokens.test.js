// Colours come from the theme (src/theme/tokens.css), never from a
// literal in a component. 2026-10-08 audit: white text on the dark
// theme's lime accent (1.24:1 -- the Dispatch, Hire and Assign buttons
// could not be read), and an error box whose undefined --text-1 fell back
// to #2a2a2a on a dark panel. Both were literals the theme never saw.
//
// Each test names the mutation it kills.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? files(p) : /\.(css|jsx?)$/.test(name) ? [p] : []
  })
}

// The theme defines colours; the sign-in pages sit on a photograph with a
// palette of their own, before any theme is chosen (Login.css says so).
const ALLOWED = new Set(['theme/tokens.css', 'index.css', 'pages/Login.css', 'pages/Pending.css'])
const LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/
const COMMENT = /^\s*(\/\/|\*|\/\*)/

// Kills: a hex, rgb() or hsl() colour written in a component.
test('no colour literal outside the theme', () => {
  const found = []
  for (const f of files(src)) {
    const rel = relative(src, f).split('\\').join('/')
    if (ALLOWED.has(rel)) continue
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (!COMMENT.test(line) && LITERAL.test(line) && !/#root\b/.test(line)) found.push(`${rel}:${i + 1}: ${line.trim()}`)
    })
  }
  assert.deepEqual(found, [])
})

// Kills: var(--name) for a name no stylesheet defines -- the browser then
// uses the fallback literal, or nothing at all.
test('every custom property used is defined somewhere', () => {
  const all = files(src).map((f) => readFileSync(f, 'utf8')).join('\n')
  const used = new Set([...all.matchAll(/var\(--([a-z0-9-]+)/g)].map((m) => m[1]))
  const defined = new Set([...all.matchAll(/(?:^|[\s{;'"])--([a-z0-9-]+)\s*['"]?\s*:/gm)].map((m) => m[1]))
  // --mono carries a font fallback of its own.
  const missing = [...used].filter((n) => !defined.has(n) && n !== 'mono')
  assert.deepEqual(missing, [])
})

// Kills: one text colour for the accent in both themes. Lime (dark) needs
// dark text, blue (light) needs white.
test('text on the accent follows the theme', () => {
  const tokens = readFileSync(join(src, 'theme', 'tokens.css'), 'utf8')
  const block = (sel) => tokens.slice(tokens.indexOf(sel), tokens.indexOf('}', tokens.indexOf(sel)))
  assert.match(block(':root[data-theme="dark"]'), /--accent: #D9F35C;[\s\S]*--on-accent: #1B1F0C;/)
  assert.match(block(':root[data-theme="light"]'), /--accent: #3B7DD8;[\s\S]*--on-accent: #FFFFFF;/)
})

// WCAG 2.x contrast check for the theme tokens (src/theme/tokens.css).
//   npm run check:contrast
// Exits 1 when a pair fails and is not listed (with a reason) in EXCEPTIONS.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const TOKENS = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'theme', 'tokens.css')

// A pair that cannot reach its threshold, and why. Kept empty unless a
// brand colour truly cannot be brightened/darkened.
export const EXCEPTIONS = [
  { theme: 'light', fg: 'steel', bg: 'panel-3', reason: 'brand Steel Gray is fixed; 2.97:1 on the darkest light surface, used only as icon/border there' },
]

function block(css, selector) {
  const i = css.indexOf(selector + ' {')
  if (i < 0) return ''
  return css.slice(i + selector.length + 2, css.indexOf('}', i))
}

function declarations(body) {
  const out = {}
  for (const m of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

// { dark: {name: value}, light: {name: value} }; the plain :root block
// (lime, steel, login tokens) applies to both themes.
export function parseTokens(css) {
  const base = declarations(block(css, ':root'))
  return {
    dark: { ...base, ...declarations(block(css, ':root[data-theme="dark"]')) },
    light: { ...base, ...declarations(block(css, ':root[data-theme="light"]')) },
  }
}

function resolve(tokens, value, depth = 0) {
  const m = /^var\(--([a-z0-9-]+)\)$/.exec(value)
  if (!m) return value
  if (depth > 8 || !(m[1] in tokens)) throw new Error(`unresolved var(--${m[1]})`)
  return resolve(tokens, tokens[m[1]], depth + 1)
}

// -> {r, g, b, a} with 0-255 channels.
export function parseColor(value) {
  const v = value.trim()
  let m = /^#([0-9a-f]{3})$/i.exec(v)
  if (m) {
    const [r, g, b] = [...m[1]].map((c) => parseInt(c + c, 16))
    return { r, g, b, a: 1 }
  }
  m = /^#([0-9a-f]{6})$/i.exec(v)
  if (m) {
    const n = parseInt(m[1], 16)
    return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 }
  }
  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(v)
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] }
  throw new Error(`cannot parse colour: ${value}`)
}

const asColor = (c) => (typeof c === 'string' ? parseColor(c) : c)

// Alpha is mixed in sRGB (what a browser does) over an opaque background.
export function composite(fg, bg) {
  const f = asColor(fg)
  const b = asColor(bg)
  const mix = (x, y) => f.a * x + (1 - f.a) * y
  return { r: mix(f.r, b.r), g: mix(f.g, b.g), b: mix(f.b, b.b), a: 1 }
}

export function luminance(c) {
  const { r, g, b } = asColor(c)
  const lin = (x) => {
    const s = x / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contrast(fg, bg) {
  const a = luminance(fg)
  const b = luminance(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

const SURFACES = ['bg', 'panel', 'panel-2', 'panel-3']

// {fg, bg, need, themes?, label?} -- a bg named like a tint (*-bg, *-dim)
// is translucent and is laid over --panel first.
export const PAIRS = [
  ...['text', 'text-2', 'text-3'].flatMap((fg) => SURFACES.map((bg) => ({ fg, bg, need: 4.5 }))),
  { fg: 'on-accent', bg: 'accent', need: 4.5 },
  { fg: 'on-lime', bg: 'lime', need: 4.5 },
  { fg: 'on-blue', bg: 'blue', need: 4.5 },
  { fg: 'on-green', bg: 'green', need: 4.5 },
  { fg: 'accent', bg: 'bg', need: 3, themes: ['dark'] },
  { fg: 'accent', bg: 'panel', need: 3, themes: ['dark'] },
  { fg: 'accent', bg: 'bg', need: 4.5, themes: ['light'] },
  { fg: 'accent', bg: 'panel', need: 4.5, themes: ['light'] },
  ...['green', 'amber', 'red', 'blue'].flatMap((fg) => ['bg', 'panel'].map((bg) => ({ fg, bg, need: 3 }))),
  { fg: 'green-strong', bg: 'green-bg', need: 4.5 },
  { fg: 'amber-strong', bg: 'amber-bg', need: 4.5 },
  { fg: 'red-strong', bg: 'red-bg', need: 4.5 },
  { fg: 'blue-strong', bg: 'blue-dim', need: 4.5 },
  { fg: 'text', bg: 'accent-dim', need: 4.5 },
  ...SURFACES.map((bg) => ({ fg: 'steel', bg, need: 3 })),
]

// The sign-in pages: ink over the photograph. Worst case is a white pixel
// under the middle scrim stop, then the glass card over that.
function loginPairs(tokens) {
  if (!('login-ink' in tokens)) return []
  return ['login-ink', 'login-ink-2', 'login-ink-3', 'login-error', 'lime'].map((fg) => ({ fg, bg: 'login-glass', need: 4.5, login: true }))
}

function value(tokens, name, under) {
  const c = parseColor(resolve(tokens, `var(--${name})`))
  return c.a < 1 ? composite(c, under) : c
}

export function evaluate(css) {
  const all = parseTokens(css)
  const rows = []
  for (const theme of ['dark', 'light']) {
    const t = all[theme]
    const pairs = [...PAIRS, ...loginPairs(t)]
    for (const p of pairs) {
      if (p.themes && !p.themes.includes(theme)) continue
      if (!(p.fg in t) || !(p.bg in t)) continue
      let under
      let bgColor
      let note = ''
      if (p.login) {
        // white pixel -> scrim-mid -> glass
        const white = { r: 255, g: 255, b: 255, a: 1 }
        const mid = composite(parseColor(resolve(t, 'var(--login-scrim-mid)')), white)
        bgColor = composite(parseColor(resolve(t, `var(--${p.bg})`)), mid)
        under = mid
        note = ' (over white photo)'
      } else {
        under = value(t, 'panel', value(t, 'bg', { r: 0, g: 0, b: 0, a: 1 }))
        bgColor = value(t, p.bg, under)
        if (/-(bg|dim)$/.test(p.bg)) note = ' (over panel)'
      }
      const fgColor = value(t, p.fg, bgColor)
      const ratio = contrast(fgColor, bgColor)
      const ex = EXCEPTIONS.find((e) => e.theme === theme && e.fg === p.fg && e.bg === p.bg)
      const status = ratio >= p.need ? 'PASS' : ex ? 'WAIVED' : 'FAIL'
      rows.push({ theme, fg: p.fg, bg: p.bg + note, ratio, need: p.need, status, reason: ex?.reason })
    }
  }
  return rows
}

function main() {
  const rows = evaluate(readFileSync(TOKENS, 'utf8'))
  const w = Math.max(...rows.map((r) => r.bg.length)) + 2
  console.log(['theme'.padEnd(6), 'fg'.padEnd(14), 'bg'.padEnd(w), 'ratio', 'need', 'result'].join(' | '))
  for (const r of rows) {
    console.log([
      r.theme.padEnd(6),
      r.fg.padEnd(14),
      r.bg.padEnd(w),
      r.ratio.toFixed(2).padStart(5),
      r.need.toFixed(1).padStart(4),
      r.status + (r.reason ? ` -- ${r.reason}` : ''),
    ].join(' | '))
  }
  const ok = rows.filter((r) => r.status !== 'FAIL').length
  console.log(`\n${ok}/${rows.length} passed (${rows.filter((r) => r.status === 'WAIVED').length} waived)`)
  if (rows.some((r) => r.status === 'FAIL')) process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()

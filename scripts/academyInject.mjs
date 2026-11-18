// Pure helpers (no fs) that add the Academy frame hooks to a lesson page.
// A lesson file is a fragment: no <html>/<head>/<body>. So the "head" block
// goes in front of the first <style (it must run before the lesson paints and
// before the lesson script) and the "tail" block goes at the very end, after
// the lesson script. Output is deterministic and injecting twice changes
// nothing, so `npm run sync:course` can run on every dev/build.

export const INJECT_START = '<!-- academy:inject -->'
export const INJECT_END = '<!-- /academy:inject -->'

const BLOCK = new RegExp(String.raw`${INJECT_START}[\s\S]*?${INJECT_END}(?:\r?\n)?`, 'g')

export function stripInjected(html) {
  return html.replace(BLOCK, '')
}

function check(name, text) {
  if (/<\/script/i.test(text) || text.includes('<!--')) {
    throw new Error(`academy inject: asset "${name}" contains "</script" or "<!--"`)
  }
}

// Asset line endings follow the lesson file, so a CRLF checkout stays uniform.
function eolOf(html) {
  return html.includes('\r\n') ? '\r\n' : '\n'
}

function withEol(text, eol) {
  return text.replace(/\r?\n/g, eol)
}

export function injectLesson(html, { headJs, frameCss, frameJs, fxCss = '', fxJs = '' }) {
  const assets = { headJs, frameCss, frameJs, fxCss, fxJs }
  for (const [name, text] of Object.entries(assets)) check(name, text)

  const clean = stripInjected(html)
  const eol = eolOf(clean)
  const head = `${INJECT_START}<script>${withEol(headJs, eol)}</script>${INJECT_END}${eol}`

  const styleParts = [frameCss, fxCss].filter(Boolean).map((c) => withEol(c, eol)).join(eol)
  const scripts = [frameJs, fxJs].filter(Boolean).map((j) => `<script>${withEol(j, eol)}</script>`).join('')
  const tail = `${INJECT_START}<style>${styleParts}</style>${scripts}${INJECT_END}`

  let out = clean
  const headAt = out.search(/<\/head>/i)
  const styleAt = out.search(/<style[\s>]/i)
  if (headAt >= 0) out = out.slice(0, headAt) + head + out.slice(headAt)
  else if (styleAt >= 0) out = out.slice(0, styleAt) + head + out.slice(styleAt)
  else out = head + out

  const bodyAt = out.search(/<\/body>/i)
  if (bodyAt >= 0) out = out.slice(0, bodyAt) + tail + eol + out.slice(bodyAt)
  else out += tail
  return out
}

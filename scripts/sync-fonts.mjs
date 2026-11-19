// Copies the lesson fonts out of node_modules into public/fonts/ so the
// Academy lesson pages (plain HTML in a frame, outside the Vite bundle) can
// load them from our own origin: /fonts/<file>.woff2. public/fonts/ is
// committed on purpose -- if a package is missing the committed copy is kept
// and this only warns, so a deploy without node_modules still builds.

import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const target = join(root, 'public', 'fonts')

export const FONT_FILES = [
  ['@fontsource-variable/space-grotesk', 'space-grotesk-latin-wght-normal.woff2'],
  ['@fontsource-variable/space-grotesk', 'space-grotesk-latin-ext-wght-normal.woff2'],
  ['@fontsource-variable/inter', 'inter-latin-wght-normal.woff2'],
  ['@fontsource-variable/inter', 'inter-latin-ext-wght-normal.woff2'],
  ['@fontsource/jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff2'],
  ['@fontsource/jetbrains-mono', 'jetbrains-mono-latin-ext-500-normal.woff2'],
]

mkdirSync(target, { recursive: true })
let copied = 0
for (const [pkg, file] of FONT_FILES) {
  const from = join(root, 'node_modules', pkg, 'files', file)
  if (!existsSync(from)) {
    console.warn(`sync-fonts: ${pkg} not installed, keeping the committed ${file}`)
    continue
  }
  copyFileSync(from, join(target, file))
  copied++
}
console.log(`sync-fonts: ${copied} font files -> public/fonts`)

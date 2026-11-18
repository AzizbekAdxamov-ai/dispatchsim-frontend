// Copies the course lesson pages (../course/week-W/lesson-NN/interactive.html)
// into public/course/lesson-NN.html so the app can serve them in a frame, and
// adds the Academy frame hooks (scripts/academy-inject/*, see academyInject.mjs).
// public/course/ is committed on purpose: a deploy has no ../course folder.
// A missing source is a warning, never a failure -- a deploy checkout
// without the course folder must still build with the committed copies.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { injectLesson } from './academyInject.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, '..', 'course')
const target = join(root, 'public', 'course')
const assetDir = join(root, 'scripts', 'academy-inject')
const EXPECTED = 12

if (!existsSync(source)) {
  console.warn('sync-course: ../course not found, keeping the committed copies in public/course')
  process.exit(0)
}

const read = (dir, name) => readFileSync(join(dir, name), 'utf8')
const assets = {
  headJs: read(assetDir, 'head.js'),
  frameCss: read(assetDir, 'frame.css'),
  frameJs: read(assetDir, 'frame.js'),
}

mkdirSync(target, { recursive: true })
let copied = 0
for (const week of readdirSync(source).filter((n) => /^week-\d+$/.test(n)).sort()) {
  for (const lesson of readdirSync(join(source, week)).filter((n) => /^lesson-\d+$/.test(n)).sort()) {
    const file = join(source, week, lesson, 'interactive.html')
    if (!existsSync(file)) continue
    const no = lesson.replace('lesson-', '').padStart(2, '0')
    writeFileSync(join(target, `lesson-${no}.html`), injectLesson(readFileSync(file, 'utf8'), assets))
    copied++
  }
}

if (copied < EXPECTED) console.warn(`sync-course: only ${copied} of ${EXPECTED} lessons found`)
console.log(`sync-course: ${copied} lesson files -> public/course`)

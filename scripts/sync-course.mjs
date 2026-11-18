// Copies the course lesson pages (../course/week-W/lesson-NN/interactive.html)
// into public/course/lesson-NN.html so the app can serve them in a frame.
// public/course/ is committed on purpose: a deploy has no ../course folder.
// A missing source is a warning, never a failure -- a deploy checkout
// without the course folder must still build with the committed copies.

import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, '..', 'course')
const target = join(root, 'public', 'course')
const EXPECTED = 12

if (!existsSync(source)) {
  console.warn('sync-course: ../course not found, keeping the committed copies in public/course')
  process.exit(0)
}

mkdirSync(target, { recursive: true })
let copied = 0
for (const week of readdirSync(source).filter((n) => /^week-\d+$/.test(n)).sort()) {
  for (const lesson of readdirSync(join(source, week)).filter((n) => /^lesson-\d+$/.test(n)).sort()) {
    const file = join(source, week, lesson, 'interactive.html')
    if (!existsSync(file)) continue
    const no = lesson.replace('lesson-', '').padStart(2, '0')
    cpSync(file, join(target, `lesson-${no}.html`))
    copied++
  }
}

if (copied < EXPECTED) console.warn(`sync-course: only ${copied} of ${EXPECTED} lessons found`)
console.log(`sync-course: ${copied} lesson files -> public/course`)

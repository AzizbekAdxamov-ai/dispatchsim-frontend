// The lesson files keep their own progress in localStorage under
// "ds-l<N>-<key>", every value JSON-encoded. This module is the only place
// the app reads or writes those keys, so the lesson files and the server
// copy cannot drift apart in format. Pure functions: storage is a parameter.

export const QUIZ_KEYS = ['qz', 'sim', 'exa', 'exb']

function key(no, k) {
  return `ds-l${no}-${k}`
}

function read(storage, no, k, fallback) {
  try {
    const raw = storage.getItem(key(no, k))
    return raw === null || raw === undefined ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(storage, no, k, value) {
  try {
    storage.setItem(key(no, k), JSON.stringify(value))
  } catch {
    // Private window or full storage: the lesson still works, it just is not remembered.
  }
}

function asResult(v) {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null
}

function defaultStorage() {
  return globalThis.localStorage
}

const OWNER_KEY = 'ds-academy-owner'
// "ds-l" + 1..12 + "-": the trailing dash keeps ds-l1- from matching ds-l10-.
const LESSON_KEY = /^ds-l(?:[1-9]|1[0-2])-/

// Lesson progress lives in shared localStorage keys, so on a shared computer
// the next student would inherit (and upload) the previous one's progress.
// Wipes every lesson key (and optionally the owner mark) from this browser.
export function clearLessonKeys(storage = defaultStorage(), { includeOwner = false } = {}) {
  try {
    const keys = []
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (k && (LESSON_KEY.test(k) || (includeOwner && k === OWNER_KEY))) keys.push(k)
    }
    for (const k of keys) storage.removeItem(k)
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

// Call before reading or writing any lesson key. A different owner than the
// one recorded means these keys belong to someone else: drop them.
export function ensureStorageOwner(userId, storage = defaultStorage()) {
  if (userId === null || userId === undefined || userId === '') return
  try {
    const owner = storage.getItem(OWNER_KEY)
    if (owner === String(userId)) return
    clearLessonKeys(storage)
    storage.setItem(OWNER_KEY, String(userId))
  } catch {
    // Storage unavailable: the lesson cannot remember anything anyway.
  }
}

export function readLessonState(no, storage = defaultStorage()) {
  const doneRaw = read(storage, no, 'done', {})
  const exitsDone = {}
  if (doneRaw && typeof doneRaw === 'object') {
    for (const [k, v] of Object.entries(doneRaw)) if (v === true) exitsDone[k] = true
  }
  const quiz = {}
  for (const k of QUIZ_KEYS) {
    const v = asResult(read(storage, no, k, null))
    if (v !== null) quiz[k] = v
  }
  const mode = read(storage, no, 'mode', 'self') === 'teach' ? 'teach' : 'self'
  return { exitsDone, quiz, mode }
}

// Mode is stored JSON-encoded like every other key; the lesson file parses it.
export function writeMode(no, mode, storage = defaultStorage()) {
  write(storage, no, 'mode', mode === 'teach' ? 'teach' : 'self')
}

// Server row -> local storage, before the lesson opens. Checkpoints are the
// union (a checkpoint passed anywhere stays passed); a result is taken from
// the server only when this browser has none; mode only when unset here.
export function hydrateFromServer(no, row, storage = defaultStorage()) {
  const local = readLessonState(no, storage)
  const serverDone = row?.exitsDone && typeof row.exitsDone === 'object' ? row.exitsDone : {}
  const merged = { ...local.exitsDone }
  for (const [k, v] of Object.entries(serverDone)) if (v === true) merged[k] = true
  if (Object.keys(merged).length > 0) write(storage, no, 'done', merged)

  for (const k of QUIZ_KEYS) {
    if (local.quiz[k] === undefined) {
      const v = asResult(row?.quiz?.[k])
      if (v !== null) write(storage, no, k, v)
    }
  }

  const hasLocalMode = read(storage, no, 'mode', null) !== null
  if (!hasLocalMode && (row?.mode === 'teach' || row?.mode === 'self')) writeMode(no, row.mode, storage)

  return readLessonState(no, storage)
}

// Stable text for "did anything change since the last save".
export function stateKey(state) {
  const done = Object.keys(state.exitsDone).sort()
  const quiz = Object.keys(state.quiz).sort().map((k) => `${k}=${state.quiz[k]}`)
  return JSON.stringify([done, quiz, state.mode])
}

export function toProgressBody(state) {
  return { exitsDone: state.exitsDone, quiz: state.quiz, mode: state.mode }
}

export function hasAnything(state) {
  return Object.keys(state.exitsDone).length > 0 || Object.keys(state.quiz).length > 0 || state.mode !== 'self'
}

// Class mode (a mentor presenting) keeps its own copy of the lesson state under
// "ds-cls-*" so it never mixes with the mentor's own progress. Each class
// starts clean: the lesson's answers from the last class must not show.
export function clearClassKeys(storage = defaultStorage()) {
  try {
    const keys = []
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (k && k.startsWith('ds-cls-')) keys.push(k)
    }
    for (const k of keys) storage.removeItem(k)
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

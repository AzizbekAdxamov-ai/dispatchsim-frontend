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

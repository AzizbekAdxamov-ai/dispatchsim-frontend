// Pure helpers for the mentor's class screen (/academy/class/:no).

export const FS_MIN = 16
export const FS_MAX = 32
export const FS_STEP = 2
export const FS_DEFAULT = 22
export const FS_KEY = 'ds-academy-class-fs'

export function clampFs(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return FS_DEFAULT
  return Math.min(FS_MAX, Math.max(FS_MIN, Math.round(n)))
}

export function readFs(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(FS_KEY)
    return raw === null || raw === undefined ? FS_DEFAULT : clampFs(raw)
  } catch {
    return FS_DEFAULT
  }
}

export function writeFs(v, storage = globalThis.localStorage) {
  try {
    storage.setItem(FS_KEY, String(clampFs(v)))
  } catch {
    // Not remembered; the class still works.
  }
}

// 125 -> "02:05"; past zero -> "+00:05".
export function formatClock(sec) {
  const total = Math.round(sec)
  const abs = Math.abs(total)
  const mm = String(Math.floor(abs / 60)).padStart(2, '0')
  const ss = String(abs % 60).padStart(2, '0')
  return `${total < 0 ? '+' : ''}${mm}:${ss}`
}

export function stepLabel(index, total) {
  if (index === 0) return 'Kirish'
  if (index === total - 1) return 'Yakun'
  return String(index)
}

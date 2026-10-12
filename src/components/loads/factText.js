// A stored Trip plan fact, as a person reads it.
//
// The facts are text written when the run was planned (stop_plan_facts).
// Until 2026-10-08 they carried two things a student should never have
// been shown: times as ISO strings in UTC ("2026-10-06T13:04:48.916Z"),
// and a server command ("(npm run routes:warm fills it)"). The backend now
// writes neither; this reads the facts already stored, so a load planned
// before the fix reads the same as one planned after.

import { formatDateTime } from '../../utils/format.js'

const ISO = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g
const COMMAND = /\s*\(npm run [^)]*\)/g

export function factText(detail) {
  return String(detail ?? '')
    .replace(COMMAND, '')
    .replace(ISO, (iso) => `${formatDateTime(iso)} CT`)
}

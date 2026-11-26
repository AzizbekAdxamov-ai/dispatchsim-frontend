// Whether a signed-in user may open a path, by the same rules App.jsx guards
// with. Used to leave a link out (rather than draw one that bounces) when a
// page in one workspace points into another. Pure so it can be tested.
const SECTION_GUARDS = [
  ['/fleet', (u) => u?.roles?.includes('fleet-manager')],
  ['/finance', (u) => u?.roles?.includes('finance')],
  ['/hr', (u) => u?.roles?.includes('hr')],
  ['/admin', (u) => u?.isAdmin === true],
  ['/academy', () => true],
]

export function canOpenPath(user, path) {
  if (!path || path.startsWith('http')) return Boolean(path)
  const pathname = path.split(/[?#]/)[0]
  for (const [prefix, allowed] of SECTION_GUARDS) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return Boolean(allowed(user))
  }
  // Everything else lives in the dispatch shell.
  return Boolean(user?.roles?.includes('dispatcher'))
}

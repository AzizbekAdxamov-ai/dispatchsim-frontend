// Where a route sends the visitor: 'wait' (auth still loading), a path to
// redirect to, or null to let them in. Pure so it can be tested.
export function routeRedirect({ status, user, requireAdmin, requireMentor, allow }) {
  if (status === 'loading') return 'wait'
  if (status === 'anonymous') return '/login'
  if (requireAdmin && !user?.isAdmin) return '/'
  // Mentor pages: a student who types the URL lands back on their own lessons.
  if (requireMentor && !(user?.isMentor || user?.isAdmin)) return '/academy'
  if (allow && !allow.some((r) => user?.roles?.includes(r))) return '/'
  return null
}

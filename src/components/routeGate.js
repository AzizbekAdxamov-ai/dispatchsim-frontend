import { roleHomePath, settingsPathFor, sortRoles } from '../data/roleRoutes.js'
import { hasAcademyAccess } from '../data/academyAccess.js'

// The role a user is really working in: the active one if it is still granted,
// else the first granted role. Null when they have none.
export function effectiveRole(user) {
  const roles = user?.roles ?? []
  if (roles.length === 0) return null
  return roles.includes(user?.activeRole) ? user.activeRole : sortRoles(roles)[0]
}

// Where a signed-in user belongs. Pure, and never '/' for someone who may not
// open the dispatcher workspace, so a denied redirect can never loop.
export function homeFor(user) {
  const roles = user?.roles ?? []
  if (roles.length === 0) {
    if (user?.isAdmin) return '/admin'
    return hasAcademyAccess(user) ? '/academy' : '/pending'
  }
  const path = roleHomePath(effectiveRole(user))
  if (path === '/' && !roles.includes('dispatcher')) return '/pending'
  return path
}

// Where a user with a temporary password must go to replace it.
export function passwordChangePath(user) {
  const roles = user?.roles ?? []
  if (roles.length === 0) {
    if (user?.isAdmin) return '/admin/settings'
    if (hasAcademyAccess(user)) return '/academy/settings'
    return '/pending'
  }
  const path = settingsPathFor(effectiveRole(user))
  // '/settings' is the dispatcher's page; anyone else is sent home instead.
  if (path === '/settings' && !roles.includes('dispatcher')) return homeFor(user)
  return path
}

// Where a route sends the visitor: 'wait' (auth still loading), a path to
// redirect to, or null to let them in. Pure so it can be tested.
export function routeRedirect({ status, user, requireAdmin, requireMentor, allow }) {
  if (status === 'loading') return 'wait'
  if (status === 'anonymous') return '/login'
  if (requireAdmin && !user?.isAdmin) return homeFor(user)
  // Mentor pages: a student who types the URL lands back on their own lessons.
  if (requireMentor && !(user?.isMentor || user?.isAdmin)) return '/academy'
  if (allow && !allow.some((r) => user?.roles?.includes(r))) return homeFor(user)
  return null
}

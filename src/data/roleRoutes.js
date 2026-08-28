// Single source of truth for user roles and where each role lands after sign-in.
// Keys only — no UI copy lives here. AccessModal imports ROLES from this
// file so the workspace picker can never drift out of sync with real role keys.

export const ROLES = [
  { key: 'dispatcher', label: 'Dispatcher' },
  { key: 'hr', label: 'HR' },
  { key: 'finance', label: 'Finance' },
  { key: 'fleet-manager', label: 'Fleet manager' },
]

export const ROLE_LABEL = {
  dispatcher: 'Dispatcher',
  hr: 'HR',
  finance: 'Finance',
  'fleet-manager': 'Fleet manager',
}

// Roles that own a dedicated section. Anything not listed falls back to the
// dispatcher dashboard at '/'.
export const ROLE_HOME = {
  'fleet-manager': '/fleet',
  finance: '/finance',
}

export function roleHomePath(roleKey) {
  if (!roleKey) return '/pending'
  return ROLE_HOME[roleKey] ?? '/'
}

export function roleLabel(key) {
  return ROLE_LABEL[key] ?? 'No workspace'
}

// Fixed display order for a student's workspaces — independent of how the
// server returns `roles` (array_agg order is alphabetical, not this order).
export const ROLE_ORDER = ['dispatcher', 'hr', 'finance', 'fleet-manager']

export function sortRoles(roles = []) {
  return ROLE_ORDER.filter((k) => roles.includes(k))
}

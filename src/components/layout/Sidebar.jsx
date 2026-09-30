import { useCallback, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  SquaresFour,
  Package,
  Truck,
  SteeringWheel,
  ChatDots,
  ChatCircleText,
  Warning,
  FileText,
  Star,
  Gear,
  ShieldCheck,
  CurrencyDollar,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import { useAuth } from '../../context/AuthContext'
import { roleLabel } from '../../data/roleRoutes'
import { locate } from './navSections'
import './Sidebar.css'

const DEFAULT_NAV_ITEMS = [
  { to: '/', icon: SquaresFour, label: 'Dashboard', end: true },
  { to: '/loads', icon: Package, label: 'Loads' },
  { to: '/load-board', icon: MagnifyingGlass, label: 'Load board' },
  { to: '/tracking', icon: Truck, label: 'Tracking' },
  { to: '/drivers', icon: SteeringWheel, label: 'Drivers' },
  { to: '/driver-chat', icon: ChatDots, label: 'Driver chat' },
  { to: '/broker-chat', icon: ChatCircleText, label: 'Broker chat' },
  { to: '/broker-check', icon: ShieldCheck, label: 'Broker check' },
  { to: '/cash', icon: CurrencyDollar, label: 'Cash' },
  { to: '/alerts', icon: Warning, label: 'Alerts' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/dispatch-status', icon: Star, label: 'Dispatch status' },
  { to: '/settings', icon: Gear, label: 'Settings' },
]

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Collapsed or open, remembered per browser. Storage can be missing or
// throw (private window, blocked site data) -- then the sidebar simply
// opens every time; nothing depends on it.
const COLLAPSE_KEY = 'ds.sidebar.collapsed'

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function writeCollapsed(value) {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0')
  } catch {
    // Not remembered this time; the toggle itself still worked.
  }
}

function isEditable(target) {
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

function NavEntry({ to, end, icon: Icon, label, badge, active, collapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={'nav-item' + (active ? ' active' : '')}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      data-tip={collapsed ? label : undefined}
    >
      {active && (
        <motion.div
          layoutId="nav-active-bg"
          className="nav-item-bg"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}
      <span className="nav-icon" aria-hidden="true">
        <Icon size={20} weight={active ? 'fill' : 'regular'} />
      </span>
      <span className="nav-label">{label}</span>
      {badge != null && <span className="nav-badge">{badge}</span>}
    </NavLink>
  )
}

// Two shapes of navigation:
//   sections -- the dispatch workspace (navSections.js): one entry per
//               section, linking to its first page; the section's other
//               pages are tabs (SectionTabs). `settings` sits at the bottom.
//   items    -- a flat list (Fleet, Finance, HR, Admin), unchanged.
// Either way the logo collapses the sidebar to an icon rail and back,
// and so does Ctrl/Cmd+B.
export default function Sidebar({ items = DEFAULT_NAV_ITEMS, sections, settings, brandSub = 'Dispatch operations' }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      writeCollapsed(!prev)
      return !prev
    })
  }, [])

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'b' && !isEditable(e.target)) {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  const adminEntry = { to: '/admin', icon: ShieldCheck, label: 'Administration', end: true }

  let entries
  if (sections) {
    const { section: activeSection } = locate(sections, pathname)
    entries = sections.map((section) => ({
      key: section.id,
      to: section.tabs[0].to,
      end: section.tabs[0].end,
      icon: section.icon,
      label: section.label,
      active: section === activeSection,
    }))
  } else {
    const hasAdminLink = items.some((i) => i.to === '/admin')
    const flat = user?.isAdmin && !hasAdminLink ? [...items, adminEntry] : items
    entries = flat.map((item) => ({
      key: item.to,
      ...item,
      active: item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + '/'),
    }))
  }

  const bottom = []
  if (sections && settings) {
    bottom.push({ key: 'settings', icon: Gear, ...settings, active: pathname === settings.to })
  }
  if (sections && user?.isAdmin) {
    bottom.push({ key: 'admin', ...adminEntry, active: pathname.startsWith('/admin') })
  }

  return (
    <div className={'sidebar' + (collapsed ? ' collapsed' : '')}>
      <div className="brand">
        <button
          type="button"
          className="brand-toggle"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          data-tip={collapsed ? 'Expand sidebar (Ctrl+B)' : undefined}
          title={collapsed ? undefined : 'Collapse sidebar (Ctrl+B)'}
        >
          <span className="brand-mark">DS</span>
        </button>
        <div className="brand-text">
          <div className="brand-name">DispatchSim</div>
          <div className="brand-sub">{brandSub}</div>
        </div>
      </div>

      <nav className="nav" aria-label="Sections">
        {entries.map(({ key, ...entry }) => (
          <NavEntry key={key} {...entry} collapsed={collapsed} />
        ))}
      </nav>

      {bottom.length > 0 && (
        <nav className="nav nav-bottom" aria-label="Settings">
          {bottom.map(({ key, ...entry }) => (
            <NavEntry key={key} {...entry} collapsed={collapsed} />
          ))}
        </nav>
      )}

      <div className="sidebar-footer" data-tip={collapsed ? (user?.name ?? '') : undefined}>
        <div className="avatar">{initials(user?.name ?? '')}</div>
        <div className="sidebar-footer-text">
          <div className="user-name">{user?.name ?? '—'}</div>
          <div className="user-role">{roleLabel(user?.activeRole)}</div>
        </div>
      </div>
    </div>
  )
}

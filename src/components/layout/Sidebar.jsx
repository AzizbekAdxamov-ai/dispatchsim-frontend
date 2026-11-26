import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion, useIsPresent, useReducedMotion } from 'framer-motion'
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
  X,
} from '@phosphor-icons/react'
import { useAuth } from '../../context/AuthContext'
import { roleLabel, settingsPathFor } from '../../data/roleRoutes'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useSidebar } from './SidebarContext'
import { locate, railLabel } from './navSections'
import './Sidebar.css'
import BrandLogo from '../BrandLogo.jsx'

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

// Words the sidebar speaks that are not nav labels. Props, so a screen can
// reword them; these are the defaults.
export const SIDEBAR_COPY = {
  menu: 'Menu',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  expand: 'Expand sidebar',
  collapse: 'Collapse sidebar',
  settings: 'Settings',
}

const DRAWER_EASE = [0.22, 1, 0.36, 1]

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

// No saved choice: open. Narrow screens no longer fall back to collapsed
// here -- below 1100px the layout picks the rail or the drawer by itself
// (breakpoints.js) and never reads or writes this key.
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

function NavEntry({ to, end, icon: Icon, label, shortLabel, badge, active, collapsed, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={'nav-item' + (active ? ' active' : '')}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      onClick={onNavigate}
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
      <span className="nav-label">{collapsed ? railLabel({ label, shortLabel }) : label}</span>
      {badge != null && <span className="nav-badge">{badge}</span>}
    </NavLink>
  )
}

// The inside of the sidebar -- brand, sections, bottom group, profile --
// for both shapes it takes:
//   'rail' -- 60px icons with a short label under each
//   'full' -- logo and full labels (wide mode, and the drawer)
// `brand` is the logo's button ({ label, title, expanded, onClick }), or
// null for a plain logo (the drawer has its own close button).
function SidebarPanel({ variant, entries, bottom, brandSub, brand, onClose, onNavigate, copy, user, settingsTo }) {
  const collapsed = variant === 'rail'
  const role = roleLabel(user?.activeRole)
  const logo = collapsed
    ? <BrandLogo variant="mark" className="brand-rail-mark" />
    : <BrandLogo className="brand-full-logo" />

  return (
    <>
      <div className="brand">
        {brand ? (
          <button
            type="button"
            className="brand-toggle"
            onClick={brand.onClick}
            aria-expanded={brand.expanded}
            aria-label={brand.label}
            title={brand.title}
          >
            {logo}
          </button>
        ) : (
          <span className="brand-toggle brand-static">{logo}</span>
        )}
        <div className="brand-text">
          <div className="brand-sub">{brandSub}</div>
        </div>
        {onClose && (
          <button type="button" className="sidebar-close" onClick={onClose} aria-label={copy.closeMenu}>
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <nav className="nav" aria-label="Sections">
        {entries.map(({ key, ...entry }) => (
          <NavEntry key={key} {...entry} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      {bottom.length > 0 && (
        <nav className="nav nav-bottom" aria-label="Settings">
          {bottom.map(({ key, ...entry }) => (
            <NavEntry key={key} {...entry} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </nav>
      )}

      {/* The profile block opens Settings: `settingsTo` when the shell names its
          own page (Admin, Academy), else the page of the role you are in. */}
      <Link
        to={settingsTo ?? settingsPathFor(user?.activeRole)}
        className="sidebar-footer"
        onClick={onNavigate}
        aria-label={`${user?.name ?? '—'}, ${role}. ${copy.settings}`}
        title={collapsed ? user?.name : undefined}
      >
        <div className="avatar" aria-hidden="true">{initials(user?.name ?? '')}</div>
        <div className="sidebar-footer-text">
          <div className="user-name">{user?.name ?? '—'}</div>
          <div className="user-role">{role}</div>
        </div>
      </Link>
    </>
  )
}

// The menu as a dialog: slides in from the left over a scrim, traps focus,
// closes on Esc / scrim / a link. Mounted by AnimatePresence, so it also
// owns its exit; `isPresent` ends the focus trap the moment closing starts.
function SidebarDrawer({ id, panelProps, onClose, copy, reduced }) {
  const ref = useRef(null)
  const isPresent = useIsPresent()
  useFocusTrap(ref, isPresent, onClose)

  return (
    <motion.aside
      ref={ref}
      id={id}
      className="sidebar sidebar-drawer"
      role="dialog"
      aria-modal="true"
      aria-label={copy.menu}
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ duration: reduced ? 0 : 0.22, ease: DRAWER_EASE }}
    >
      {/* Own layout group: the drawer's active-row highlight must not
          animate to or from the rail's one underneath. */}
      <LayoutGroup id="drawer">
        <SidebarPanel {...panelProps} variant="full" brand={null} onClose={onClose} onNavigate={onClose} />
      </LayoutGroup>
    </motion.aside>
  )
}

// Two shapes of navigation:
//   sections -- the dispatch workspace (navSections.js): one entry per
//               section, linking to its first page; the section's other
//               pages are tabs (SectionTabs). `settings` sits at the bottom.
//   items    -- a flat list (Fleet, Finance, HR, Admin), unchanged.
// Three shapes of sidebar (breakpoints.js):
//   wide   (>= 1100)  in the page; the logo collapses it to an icon rail
//                     and back, and so does Ctrl/Cmd+B (remembered).
//   rail   (768-1099) always the 60px rail, whatever was remembered (and
//                     nothing is written); the logo and Ctrl/Cmd+B open
//                     the menu as a drawer.
//   drawer (< 768)    not in the page; the top bar's hamburger opens it.
// `extraBottom`: more entries for the bottom group (the dispatch shell adds Academy).
export default function Sidebar({ items = DEFAULT_NAV_ITEMS, sections, settings, brandSub = '', extraBottom = [], copy = SIDEBAR_COPY, settingsTo }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const { mode, drawerOpen, openDrawer, closeDrawer } = useSidebar()
  const reduced = useReducedMotion()
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
        if (mode === 'wide') toggle()
        else if (drawerOpen) closeDrawer()
        else openDrawer()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, drawerOpen, toggle, openDrawer, closeDrawer])

  const adminEntry = { to: '/admin', icon: ShieldCheck, label: 'Administration', shortLabel: 'Admin', end: true }

  let entries
  if (sections) {
    const { section: activeSection } = locate(sections, pathname)
    entries = sections.map((section) => ({
      key: section.id,
      to: section.tabs[0].to,
      end: section.tabs[0].end,
      icon: section.icon,
      label: section.label,
      shortLabel: section.shortLabel,
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
  for (const extra of extraBottom) {
    bottom.push({ key: extra.to, ...extra, active: pathname.startsWith(extra.to) })
  }

  const panelProps = { entries, bottom, brandSub, user, copy, settingsTo }

  // Wide: the logo collapses. Rail: it opens the drawer instead.
  const wide = mode === 'wide'
  const railShape = wide ? collapsed : true
  const brand = wide
    ? {
        onClick: toggle,
        expanded: !collapsed,
        label: collapsed ? copy.expand : copy.collapse,
        title: `${collapsed ? copy.expand : copy.collapse} (Ctrl+B)`,
      }
    : {
        onClick: openDrawer,
        expanded: drawerOpen,
        label: copy.expand,
        title: `${copy.expand} (Ctrl+B)`,
      }

  return (
    <>
      {mode !== 'drawer' && (
        <aside id="app-sidebar" className={'sidebar' + (railShape ? ' collapsed' : '')}>
          <SidebarPanel {...panelProps} variant={railShape ? 'rail' : 'full'} brand={brand} />
        </aside>
      )}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="scrim"
            className="sidebar-scrim"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
            onClick={closeDrawer}
          />
        )}
        {drawerOpen && (
          <SidebarDrawer
            key="drawer"
            id={mode === 'drawer' ? 'app-sidebar' : 'app-sidebar-drawer'}
            panelProps={panelProps}
            onClose={closeDrawer}
            copy={copy}
            reduced={reduced}
          />
        )}
      </AnimatePresence>
    </>
  )
}

import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  SquaresFour,
  Package,
  Truck,
  SteeringWheel,
  ChatCircleText,
  Warning,
  FileText,
  Star,
  Gear,
  ShieldCheck,
} from '@phosphor-icons/react'
import { useAuth } from '../../context/AuthContext'
import { roleLabel } from '../../data/roleRoutes'
import './Sidebar.css'

const DEFAULT_NAV_ITEMS = [
  { to: '/', icon: SquaresFour, label: 'Dashboard', end: true },
  { to: '/loads', icon: Package, label: 'Loads', badge: 12 },
  { to: '/tracking', icon: Truck, label: 'Tracking' },
  { to: '/drivers', icon: SteeringWheel, label: 'Drivers' },
  { to: '/broker-chat', icon: ChatCircleText, label: 'Broker chat' },
  { to: '/alerts', icon: Warning, label: 'Alerts', badge: 3 },
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

export default function Sidebar({ items = DEFAULT_NAV_ITEMS, brandSub = 'Dispatch operations' }) {
  const { user } = useAuth()

  const hasAdminLink = items.some((i) => i.to === '/admin')
  const navItems = user?.isAdmin && !hasAdminLink
    ? [...items, { to: '/admin', icon: ShieldCheck, label: 'Administration', end: true }]
    : items

  return (
    <div className="sidebar">
      <div className="brand">
        <div className="brand-mark">DS</div>
        <div>
          <div className="brand-name">DispatchSim</div>
          <div className="brand-sub">{brandSub}</div>
        </div>
      </div>

      <nav className="nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="nav-active-bg"
                    className="nav-item-bg"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="nav-icon" aria-hidden="true">
                  <item.icon size={16} weight={isActive ? 'fill' : 'regular'} />
                </span>
                <span className="nav-label">{item.label}</span>
                {item.badge != null && <span className="nav-badge">{item.badge}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="avatar">{initials(user?.name ?? '')}</div>
        <div>
          <div className="user-name">{user?.name ?? '—'}</div>
          <div className="user-role">{roleLabel(user?.activeRole)}</div>
        </div>
      </div>
    </div>
  )
}

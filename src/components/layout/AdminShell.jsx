import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { UsersThree, Ticket, GraduationCap, Gear } from '@phosphor-icons/react'
import Sidebar from './Sidebar'
import { SidebarProvider } from './SidebarContext'
import Topbar from './Topbar'
import LiveDataNotice from './LiveDataNotice'
import { useLiveDataHealth } from '../../hooks/useLiveDataHealth'

const ADMIN_NAV_ITEMS = [
  { to: '/admin', icon: UsersThree, label: 'Users', end: true },
  { to: '/admin/invites', icon: Ticket, label: 'Invite codes', shortLabel: 'Invites' },
  { to: '/academy', icon: GraduationCap, label: 'Academy' },
  { to: '/admin/settings', icon: Gear, label: 'Settings' },
]

const TITLES = {
  '/admin': 'Users',
  '/admin/invites': 'Invite codes',
  '/admin/settings': 'Settings',
}

export default function AdminShell() {
  const location = useLocation()
  // Every shell says it, not just dispatch: a poll that stops landing
  // on the HR or finance side leaves just as stale a screen.
  const liveDataFailing = useLiveDataHealth().failingCount > 0
  const title = TITLES[location.pathname] ?? 'Administration'

  return (
    <SidebarProvider>
      <div className="app" style={{ position: 'relative', display: 'flex', minHeight: '100vh' }}>
        <Sidebar items={ADMIN_NAV_ITEMS} brandSub="Administration" settingsTo="/admin/settings" />
        <div className={'main' + (liveDataFailing ? ' has-live-notice' : '')} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Topbar title={title} variant="minimal" />
          <LiveDataNotice />
          <div className="content">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

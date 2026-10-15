import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { UsersThree, Ticket } from '@phosphor-icons/react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import LiveDataNotice from './LiveDataNotice'
import { useLiveDataHealth } from '../../hooks/useLiveDataHealth'

const ADMIN_NAV_ITEMS = [
  { to: '/admin', icon: UsersThree, label: 'Users', end: true },
  { to: '/admin/invites', icon: Ticket, label: 'Invite codes', shortLabel: 'Invites' },
]

const TITLES = {
  '/admin': 'Users',
  '/admin/invites': 'Invite codes',
}

export default function AdminShell() {
  const location = useLocation()
  // Every shell says it, not just dispatch: a poll that stops landing
  // on the HR or finance side leaves just as stale a screen.
  const liveDataFailing = useLiveDataHealth().failingCount > 0
  const title = TITLES[location.pathname] ?? 'Administration'

  return (
    <div className="app" style={{ position: 'relative', display: 'flex', minHeight: '100vh' }}>
      <Sidebar items={ADMIN_NAV_ITEMS} brandSub="Administration" />
      <div className={'main' + (liveDataFailing ? ' has-live-notice' : '')} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar title={title} onPhoneClick={() => {}} />
        <LiveDataNotice />
        <div className="content" style={{ padding: '20px 24px 60px', overflowY: 'auto' }}>
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
  )
}

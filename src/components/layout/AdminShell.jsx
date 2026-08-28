import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { UsersThree, Ticket } from '@phosphor-icons/react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const ADMIN_NAV_ITEMS = [
  { to: '/admin', icon: UsersThree, label: 'Users', end: true },
  { to: '/admin/invites', icon: Ticket, label: 'Invite codes' },
]

const TITLES = {
  '/admin': 'Users',
  '/admin/invites': 'Invite codes',
}

export default function AdminShell() {
  const location = useLocation()
  const title = TITLES[location.pathname] ?? 'Administration'

  return (
    <div className="app" style={{ position: 'relative', display: 'flex', minHeight: '100vh' }}>
      <Sidebar items={ADMIN_NAV_ITEMS} brandSub="Administration" />
      <div className="main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar title={title} onPhoneClick={() => {}} />
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

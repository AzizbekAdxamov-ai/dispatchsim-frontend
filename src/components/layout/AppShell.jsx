import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const TITLES = {
  '/': 'Dashboard',
  '/loads': 'Loads',
  '/tracking': 'Tracking',
  '/drivers': 'Drivers',
  '/broker-chat': 'Broker chat',
  '/alerts': 'Alerts',
  '/documents': 'Documents',
  '/dispatch-status': 'Dispatch status',
  '/settings': 'Settings',
  '/load-board': 'Load board',
  '/broker-check': 'Broker check',
  '/cash': 'Cash',
}

export default function AppShell() {
  const location = useLocation()

  const title =
    TITLES[location.pathname] ??
    (    location.pathname.startsWith('/loads/')
      ? 'Load details'
      : location.pathname === '/load-board'
      ? 'Load board'
      : location.pathname.startsWith('/drivers/')
      ? 'Driver details'
      : 'Dashboard')

  return (
    <div className="app" style={{ position: 'relative', display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div className="main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar title={title} />
        <div className="content" style={{ padding: '20px 24px 20px', overflowY: 'auto' }}>
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

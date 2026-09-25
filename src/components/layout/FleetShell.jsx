import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Truck, Wrench, Warning, FileText, Gear, Storefront, ClipboardText } from '@phosphor-icons/react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import LiveDataNotice from './LiveDataNotice'
import { useLiveDataHealth } from '../../hooks/useLiveDataHealth'

const FLEET_NAV_ITEMS = [
  { to: '/fleet', icon: Truck, label: 'Fleet overview', end: true },
  { to: '/fleet/market', icon: Storefront, label: 'Truck market' },
  { to: '/fleet/maintenance', icon: Wrench, label: 'Maintenance' },
  { to: '/fleet/dvir', icon: ClipboardText, label: 'DVIR' },
  { to: '/fleet/alerts', icon: Warning, label: 'Alerts' },
  { to: '/fleet/documents', icon: FileText, label: 'Documents' },
  { to: '/fleet/settings', icon: Gear, label: 'Settings' },
]

const TITLES = {
  '/fleet': 'Fleet overview',
  '/fleet/market': 'Truck market',
  '/fleet/maintenance': 'Maintenance',
  '/fleet/dvir': 'DVIR',
  '/fleet/alerts': 'Alerts',
  '/fleet/documents': 'Documents',
  '/fleet/settings': 'Settings',
}

export default function FleetShell() {
  const location = useLocation()
  // Every shell says it, not just dispatch: a poll that stops landing
  // on the HR or finance side leaves just as stale a screen.
  const liveDataFailing = useLiveDataHealth().failingCount > 0
  const title = TITLES[location.pathname] ?? (location.pathname.startsWith('/fleet/trucks/') ? 'Truck statistics' : 'Fleet')

  return (
    <div className="app" style={{ position: 'relative', display: 'flex', minHeight: '100vh' }}>
      <Sidebar items={FLEET_NAV_ITEMS} brandSub="Fleet" />
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

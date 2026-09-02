import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { UserPlus, SteeringWheel } from '@phosphor-icons/react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { listApplicants } from '../../api/hr'
import { useResource } from '../../hooks/useResource'

const TITLES = {
  '/hr': 'Applicant market',
  '/hr/drivers': 'Hired drivers',
}

export default function HrShell() {
  const location = useLocation()
  const title = TITLES[location.pathname] ?? (location.pathname.startsWith('/hr/applicants/') ? 'Applicant detail' : 'HR')

  // Only the nav badge needs the applicant count — every /hr/* page
  // fetches its own data independently, so a slow/failed overview call
  // never blocks the rest of the shell from rendering.
  const { data: overview } = useResource(
    (signal) => listApplicants({ limit: 1 }, signal),
    [],
    { pollMs: 30000 },
  )
  const openCount = overview?.meta?.total

  const HR_NAV_ITEMS = [
    { to: '/hr', icon: UserPlus, label: 'Applicant market', end: true, badge: openCount },
    { to: '/hr/drivers', icon: SteeringWheel, label: 'Hired drivers' },
  ]

  return (
    <div className="app" style={{ position: 'relative', display: 'flex', minHeight: '100vh' }}>
      <Sidebar items={HR_NAV_ITEMS} brandSub="HR" />
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

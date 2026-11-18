import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { GraduationCap, UsersThree, SquaresFour } from '@phosphor-icons/react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import LiveDataNotice from './LiveDataNotice'
import { useAuth } from '../../context/AuthContext'
import { useLiveDataHealth } from '../../hooks/useLiveDataHealth'

// One line per entry: test/railLabels.test.js reads this file as text.
const STUDENT_NAV = [
  { to: '/academy', icon: GraduationCap, label: 'Darslar', end: true },
]
const MENTOR_NAV = [
  { to: '/academy/mentor', icon: UsersThree, label: 'Mentor' },
]
const WORKSPACE_NAV = [
  { to: '/', icon: SquaresFour, label: 'Ish joyi', end: true },
]

function titleFor(pathname) {
  if (pathname.startsWith('/academy/lesson/')) return 'Dars'
  if (pathname.startsWith('/academy/mentor/students/')) return 'O‘quvchi'
  if (pathname.startsWith('/academy/mentor')) return 'Mentor'
  return 'Darslar'
}

export default function AcademyShell() {
  const location = useLocation()
  const { user } = useAuth()
  const liveDataFailing = useLiveDataHealth().failingCount > 0
  const isMentor = user?.isMentor || user?.isAdmin
  const items = [...STUDENT_NAV, ...(isMentor ? MENTOR_NAV : []), ...WORKSPACE_NAV]

  return (
    <div className="app" style={{ position: 'relative', display: 'flex', minHeight: '100vh' }}>
      <Sidebar items={items} brandSub="Academy" />
      <div className={'main' + (liveDataFailing ? ' has-live-notice' : '')} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar title={titleFor(location.pathname)} onPhoneClick={() => {}} />
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

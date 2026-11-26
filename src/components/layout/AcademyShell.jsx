import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { GraduationCap, UsersThree, SquaresFour } from '@phosphor-icons/react'
import Sidebar from './Sidebar'
import { SidebarProvider } from './SidebarContext'
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
  // A lesson fills the whole window: no sidebar, topbar or page padding.
  // No transformed wrapper either, so the lesson's fixed drawer stays anchored.
  const focus = location.pathname.startsWith('/academy/lesson/')

  if (focus) {
    return (
      <div className="ac-focus-shell">
        <Outlet />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="app" style={{ position: 'relative', display: 'flex', minHeight: '100vh' }}>
        <Sidebar items={items} brandSub="Academy" />
        <div className={'main' + (liveDataFailing ? ' has-live-notice' : '')} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Topbar title={titleFor(location.pathname)} variant="minimal" />
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

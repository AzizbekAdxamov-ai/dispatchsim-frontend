import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import SectionTabs from './SectionTabs'
import { DISPATCH_SECTIONS, DISPATCH_SETTINGS, titleFor, hasSectionTabs } from './navSections'

export default function AppShell() {
  const location = useLocation()

  const title = location.pathname === DISPATCH_SETTINGS.to
    ? DISPATCH_SETTINGS.label
    : titleFor(DISPATCH_SECTIONS, location.pathname, 'Dashboard')

  return (
    <div className="app" style={{ position: 'relative', display: 'flex', minHeight: '100vh' }}>
      <Sidebar sections={DISPATCH_SECTIONS} settings={DISPATCH_SETTINGS} />
      <div className={'main' + (hasSectionTabs(DISPATCH_SECTIONS, location.pathname) ? ' has-section-tabs' : '')} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar title={title} />
        <SectionTabs sections={DISPATCH_SECTIONS} />
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

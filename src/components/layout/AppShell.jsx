import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import SectionTabs from './SectionTabs'
import LiveDataNotice from './LiveDataNotice'
import { useLiveDataHealth } from '../../hooks/useLiveDataHealth'
import { DISPATCH_SECTIONS, DISPATCH_SETTINGS, titleFor, hasSectionTabs } from './navSections'

export default function AppShell() {
  const location = useLocation()
  // The notice is chrome: while it is on screen every full-height page
  // below it has 29px less to live in (tokens.css's --chrome-notice).
  // Read from the same store the notice itself reads, so the class and
  // the strip can never disagree about whether it is there.
  const liveDataFailing = useLiveDataHealth().failingCount > 0

  const title = location.pathname === DISPATCH_SETTINGS.to
    ? DISPATCH_SETTINGS.label
    : titleFor(DISPATCH_SECTIONS, location.pathname, 'Dashboard')

  return (
    <div className="app" style={{ position: 'relative', display: 'flex', minHeight: '100vh' }}>
      <Sidebar sections={DISPATCH_SECTIONS} settings={DISPATCH_SETTINGS} />
      <div className={'main'
        + (hasSectionTabs(DISPATCH_SECTIONS, location.pathname) ? ' has-section-tabs' : '')
        + (liveDataFailing ? ' has-live-notice' : '')} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar title={title} />
        <SectionTabs sections={DISPATCH_SECTIONS} />
        {/* Above the page, below the chrome: when the polls stop landing
            every screen underneath is showing old data, so the notice
            belongs to the shell rather than to any one of them. */}
        <LiveDataNotice />
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

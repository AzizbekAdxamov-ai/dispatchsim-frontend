import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import CallWidget from '../widgets/CallWidget'
import CallChat from '../widgets/CallChat'

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
}

const INCOMING_CALL = {
  initials: 'CL',
  name: 'Coyote Logistics',
  sub: 'Broker — load #4472',
  opening: "Hey, this is Coyote Logistics calling about load #4472. Are you still good for the Atlanta pickup tomorrow morning?",
}

export default function AppShell() {
  const location = useLocation()
  const [callState, setCallState] = useState('ringing')

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
        <Topbar
          title={title}
          onPhoneClick={() => setCallState((s) => (s === 'ringing' ? 'ringing' : 'ringing'))}
        />
        <div className="content" style={{ padding: '20px 24px 100px', overflowY: 'auto' }}>
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

      <AnimatePresence>
        {callState === 'ringing' && (
          <CallWidget
            key="call-widget"
            call={INCOMING_CALL}
            onAccept={() => setCallState('active')}
            onDecline={() => setCallState('ended')}
          />
        )}
        {callState === 'active' && (
          <CallChat key="call-chat" call={INCOMING_CALL} onEnd={() => setCallState('ended')} />
        )}
      </AnimatePresence>
    </div>
  )
}

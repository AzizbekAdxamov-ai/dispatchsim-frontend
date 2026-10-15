import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Receipt, Invoice, UsersThree, CurrencyDollar, Gear, Bank } from '@phosphor-icons/react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import LiveDataNotice from './LiveDataNotice'
import { useLiveDataHealth } from '../../hooks/useLiveDataHealth'
import { getOverview } from '../../api/finance'
import { useResource } from '../../hooks/useResource'

const TITLES = {
  '/finance': 'Financial overview',
  '/finance/invoices': 'Invoices',
  '/finance/settlements': 'Driver settlements',
  '/finance/expenses': 'Expenses',
  '/finance/cashflow': 'Cash flow',
  '/finance/settings': 'Settings',
}

export default function FinanceShell() {
  const location = useLocation()
  // Every shell says it, not just dispatch: a poll that stops landing
  // on the HR or finance side leaves just as stale a screen.
  const liveDataFailing = useLiveDataHealth().failingCount > 0
  const title = TITLES[location.pathname] ?? (location.pathname.startsWith('/finance/invoices/') ? 'Invoice details' : 'Finance')

  // Only the nav badge needs the overview here — every /finance/* page
  // fetches its own data independently, so a slow/failed overview call
  // never blocks the rest of the shell from rendering.
  const { data: overview } = useResource((signal) => getOverview(signal), [])
  const pastDueCount = overview?.pastDueCount

  const FINANCE_NAV_ITEMS = [
    { to: '/finance', icon: Receipt, label: 'Financial overview', shortLabel: 'Overview', end: true },
    { to: '/finance/invoices', icon: Invoice, label: 'Invoices', badge: pastDueCount },
    { to: '/finance/settlements', icon: UsersThree, label: 'Driver settlements', shortLabel: 'Payouts' },
    { to: '/finance/expenses', icon: CurrencyDollar, label: 'Expenses' },
    { to: '/finance/cashflow', icon: Bank, label: 'Cash flow', shortLabel: 'Cash' },
    { to: '/finance/settings', icon: Gear, label: 'Settings' },
  ]

  return (
    <div className="app" style={{ position: 'relative', display: 'flex', minHeight: '100vh' }}>
      <Sidebar items={FINANCE_NAV_ITEMS} brandSub="Accounting" />
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

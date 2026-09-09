import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Receipt, Invoice, UsersThree, CurrencyDollar, Gear, Bank } from '@phosphor-icons/react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
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
  const title = TITLES[location.pathname] ?? (location.pathname.startsWith('/finance/invoices/') ? 'Invoice details' : 'Finance')

  // Only the nav badge needs the overview here — every /finance/* page
  // fetches its own data independently, so a slow/failed overview call
  // never blocks the rest of the shell from rendering.
  const { data: overview } = useResource((signal) => getOverview(signal), [])
  const pastDueCount = overview?.pastDueCount

  const FINANCE_NAV_ITEMS = [
    { to: '/finance', icon: Receipt, label: 'Financial overview', end: true },
    { to: '/finance/invoices', icon: Invoice, label: 'Invoices', badge: pastDueCount },
    { to: '/finance/settlements', icon: UsersThree, label: 'Driver settlements' },
    { to: '/finance/expenses', icon: CurrencyDollar, label: 'Expenses' },
    { to: '/finance/cashflow', icon: Bank, label: 'Cash flow' },
    { to: '/finance/settings', icon: Gear, label: 'Settings' },
  ]

  return (
    <div className="app" style={{ position: 'relative', display: 'flex', minHeight: '100vh' }}>
      <Sidebar items={FINANCE_NAV_ITEMS} brandSub="Accounting" />
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

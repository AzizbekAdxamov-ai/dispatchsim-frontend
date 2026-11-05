import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../src/theme/ThemeProvider.jsx'
import { AuthProvider } from '../../src/context/AuthContext.jsx'
import Sidebar from '../../src/components/layout/Sidebar.jsx'
import SectionTabs from '../../src/components/layout/SectionTabs.jsx'
import Drivers from '../../src/pages/Drivers.jsx'
import { DISPATCH_SECTIONS, DISPATCH_SETTINGS } from '../../src/components/layout/navSections.js'
import '../../src/index.css'

localStorage.setItem('ds.sidebar.collapsed', '1')
localStorage.setItem('dispatchsim.theme', 'light')
window.fetch = async (url) => {
  if (String(url).endsWith('/drivers')) {
    return new Response(JSON.stringify({ drivers: [{
      id: 'qa-driver', name: 'Grace Lindqvist', dutyStatus: 'off',
      homeBaseCity: 'Seattle', homeBaseState: 'WA', hosRemainingMin: 660,
      safetyRating: 100,
    }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

createRoot(document.getElementById('root')).render(
  <ThemeProvider><AuthProvider><MemoryRouter initialEntries={['/drivers']}>
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar sections={DISPATCH_SECTIONS} settings={DISPATCH_SETTINGS} />
      <main style={{ flex: 1, minWidth: 0 }}>
        <div style={{ height: 64, padding: '20px 24px', background: 'var(--panel)', borderBottom: '1px solid var(--border-soft)' }}>All Drivers</div>
        <SectionTabs sections={DISPATCH_SECTIONS} />
        <div style={{ padding: '20px 24px' }}><Drivers resultNouns={{ singular: 'driver', plural: 'drivers' }} /></div>
      </main>
    </div>
  </MemoryRouter></AuthProvider></ThemeProvider>,
)

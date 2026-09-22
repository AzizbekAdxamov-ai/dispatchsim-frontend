import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { locate } from './navSections'
import './SectionTabs.css'

// The pages of the section you are in, as tabs under the top bar. A
// section with a single page shows no tab row -- one tab is a label, not
// a choice.
export default function SectionTabs({ sections }) {
  const { pathname } = useLocation()
  const { section, tab: activeTab } = locate(sections, pathname)
  if (!section || section.tabs.length < 2) return null

  return (
    <nav className="section-tabs" aria-label={`${section.label} pages`}>
      {section.tabs.map((tab) => {
        const isActive = tab === activeTab
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={'section-tab' + (isActive ? ' active' : '')}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="section-tab-label">{tab.label}</span>
            {isActive && (
              <motion.span
                layoutId="section-tab-underline"
                className="section-tab-underline"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

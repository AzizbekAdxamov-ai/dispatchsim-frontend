// The dispatch workspace's navigation, in one place.
//
// Left sidebar = sections. Tabs across the top = the pages inside the
// section you are in. This is the same split the fleet platforms real
// dispatchers use (a module list on the left, a module's own pages as
// tabs), so the muscle memory carries over -- see the vault plan
// 01-Projects/Reja-2026-09-21-dispatch-navigatsiya.md.
//
// Sidebar, SectionTabs and AppShell's page title all read THIS list; a
// page added here shows up in all three at once, and none of them keeps
// its own copy that can drift.
//
// `match` lists extra path prefixes that belong to a tab without being
// its own URL -- a load's detail page lives under Loads.
//
// URLs are unchanged from the flat sidebar this replaces.

import {
  House, Package, MapTrifold, ChatCircleText, FileText, ClipboardText,
} from '@phosphor-icons/react'

// Section and tab names follow the fleet-platform dashboards dispatchers
// already use (stage 2 of the plan; term map with sources in the vault:
// 01-Projects/Dispatch-atamalar-xaritasi.md). Where that platform has no
// equivalent -- Loads, Load Board, Broker Check, Cash are this company's
// own TMS side -- the name is the one the freight industry uses for it.
export const DISPATCH_SECTIONS = [
  {
    id: 'home',
    label: 'Home',
    icon: House,
    tabs: [
      { to: '/', label: 'Dashboard', end: true },
      { to: '/alerts', label: 'Alerts' },
      { to: '/cash', label: 'Cash' },
    ],
  },
  {
    // "Fleet" is where the live map and the driver list live -- the
    // map is the section's Overview, the way it is on the platform.
    id: 'fleet',
    label: 'Fleet',
    icon: MapTrifold,
    tabs: [
      { to: '/tracking', label: 'Overview', title: 'Fleet Overview' },
      { to: '/drivers', label: 'Drivers', match: ['/drivers/'], detailTitle: 'Driver Details' },
    ],
  },
  {
    // Hours of service, the way the platform groups it: Compliance sits
    // between Fleet and Dispatch in its menu.
    id: 'compliance',
    label: 'Compliance',
    icon: ClipboardText,
    tabs: [
      { to: '/compliance/hos', label: 'Driver HOS', match: ['/compliance/hos/'], detailTitle: 'Driver Event Log' },
      { to: '/compliance/violations', label: 'HOS Violations' },
    ],
  },
  {
    id: 'dispatch',
    label: 'Dispatch',
    icon: Package,
    tabs: [
      { to: '/loads', label: 'Loads', match: ['/loads/'], detailTitle: 'Load Details' },
      { to: '/load-board', label: 'Load Board' },
      { to: '/routes', label: 'Routes', title: 'Route Planner' },
      { to: '/dispatch-status', label: 'Dispatch Status' },
      { to: '/broker-check', label: 'Broker Check' },
    ],
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: ChatCircleText,
    tabs: [
      { to: '/driver-chat', label: 'Drivers', title: 'Driver Messages' },
      { to: '/broker-chat', label: 'Brokers', title: 'Broker Messages' },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    tabs: [
      { to: '/documents', label: 'Documents' },
    ],
  },
]

// Settings sits at the bottom of the sidebar, apart from the work.
export const DISPATCH_SETTINGS = { to: '/settings', label: 'Settings' }

function tabMatches(tab, pathname) {
  if (tab.end) return pathname === tab.to
  if (pathname === tab.to || pathname.startsWith(tab.to + '/')) return true
  return (tab.match ?? []).some((prefix) => pathname.startsWith(prefix))
}

// The section and tab a path belongs to, or nulls when it belongs to none
// (Settings, Administration).
export function locate(sections, pathname) {
  for (const section of sections) {
    for (const tab of section.tabs) {
      if (tabMatches(tab, pathname)) return { section, tab }
    }
  }
  return { section: null, tab: null }
}

// The page title: the tab's title (or label) on the tab's own URL, its
// detailTitle on a page it only matches (a load's detail page). A tab
// label that only makes sense next to its section ("Overview" under
// Fleet) carries a `title` that stands on its own in the top bar.
export function titleFor(sections, pathname, fallback) {
  const { tab } = locate(sections, pathname)
  if (!tab) return fallback
  if (pathname === tab.to || !tab.detailTitle) return tab.title ?? tab.label
  return tab.detailTitle
}

// Whether the tab row shows for this path -- AppShell needs the same
// answer to size full-height pages (SectionTabs.css).
export function hasSectionTabs(sections, pathname) {
  const { section } = locate(sections, pathname)
  return Boolean(section && section.tabs.length >= 2)
}

// Pages outside every section: the top bar's Map button lands on /map, and
// a full-screen map is its own place -- no tab row, no section highlight in
// the sidebar. titleFor() cannot see it (it walks the sections), so the
// shell looks here first for a standalone title.
export const STANDALONE_TITLES = { '/map': 'Fleet map' }

// The top bar's quick links, in the order the day is worked.
//
// A dispatcher starts from their loads, then goes looking for the next
// one, and keeps an eye on the map while both happen (Azizbek,
// 2026-09-30). The order lives in a plain .js file rather than inside
// Topbar.jsx for one reason: node:test cannot import JSX, and a rule
// nobody can test is a rule that is quietly reordered the first time
// someone touches the component. Icons are attached in Topbar.jsx by
// `to`, so this list stays data.
export const QUICK_LINKS = Object.freeze([
  { to: '/loads', label: 'Loads' },
  { to: '/load-board', label: 'Load Board' },
  { to: '/map', label: 'Map' },
])

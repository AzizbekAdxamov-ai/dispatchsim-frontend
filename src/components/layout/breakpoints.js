// The widths the shell changes shape at. Plain JS (no JSX) so node:test can
// pin them -- see test/viewportMode.test.js -- and so the CSS breakpoints
// in Sidebar.css / Topbar.css have one place to be checked against.
//
//   wide   >= 1100   sidebar as the user left it (236px open, 60px collapsed)
//   rail   768-1099  sidebar forced to the 60px rail; the menu opens as a drawer
//   drawer < 768     no sidebar in the page; a hamburger opens the drawer
//
// oneColumn is where two-column pages stack (their own CSS carries 1023px).
export const BP = { wide: 1100, drawer: 768, oneColumn: 1024 }

export const WIDE_QUERY = `(min-width: ${BP.wide}px)`
export const DRAWER_QUERY = `(max-width: ${BP.drawer - 0.02}px)`

export function viewportMode(width) {
  if (width >= BP.wide) return 'wide'
  if (width >= BP.drawer) return 'rail'
  return 'drawer'
}

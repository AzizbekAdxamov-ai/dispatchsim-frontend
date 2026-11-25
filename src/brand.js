// The product's name and logo in one place, so a rename touches this file
// only. index.html reads it too (vite.config.js fills the %BRAND_*% tokens).
// Logo files live in public/brand/ (built by output/brand/build_assets.py).
// The white logo is for dark surfaces, the dark one for light surfaces; the
// lime mark reads on both, so the collapsed rail uses it directly.
export const BRAND = {
  name: 'GrossMasters',
  shortName: 'GM',
  slogan: 'Master the Market.',
  tagline: 'Master the Market.',
  description: 'GrossMasters: US freight dispatch, load boards and broker negotiation, learned hands-on.',
  logoAlt: 'GrossMasters',
  favicon: '/brand/favicon.ico',
  favicon32: '/brand/favicon-32.png',
  appleTouchIcon: '/brand/apple-touch-icon.png',
  ogImage: '/brand/og-image.png',
  themeColor: '#0B1020',
  logoWhite: '/brand/logo-white.png',
  logoWhite2x: '/brand/logo-white@2x.png',
  logoDark: '/brand/logo-dark.png',
  logoDark2x: '/brand/logo-dark@2x.png',
  mark: '/brand/mark.png',
}

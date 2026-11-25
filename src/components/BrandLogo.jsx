import { BRAND } from '../brand.js'
import './BrandLogo.css'

// The product logo, read from src/brand.js.
//   variant 'full' -- wordmark. tone 'auto' follows the theme (white wordmark
//                     on dark, dark wordmark on light); 'dark' / 'light' pin it
//                     to the surface it sits on (e.g. the sign-in photo card).
//   variant 'mark' -- the GM mark alone. On the light theme it sits on a navy
//                     tile, because lime on a pale surface is unreadable.
// (The 'auto' light version is the tile + wordmark lockup.)
// Both theme images are in the DOM and CSS picks one, so a theme switch never
// waits on a network request or reflows the layout.
export default function BrandLogo({ variant = 'full', tone = 'auto', className = '' }) {
  const pinned = tone !== 'auto' ? 'brand-logo--pinned' : ''
  const cls = (extra) => ['brand-logo', extra, pinned, className].filter(Boolean).join(' ')

  if (variant === 'mark') {
    return (
      <span className={cls('brand-logo--mark')}>
        <img src={BRAND.mark} alt={BRAND.logoAlt} width="512" height="220" draggable="false" />
      </span>
    )
  }

  const onDark = (
    <img
      key="on-dark"
      className={cls('brand-logo--on-dark')}
      src={BRAND.logoWhite}
      srcSet={`${BRAND.logoWhite} 1x, ${BRAND.logoWhite2x} 2x`}
      alt={BRAND.logoAlt}
      width="900"
      height="102"
      draggable="false"
    />
  )
  // Pinned to a light surface: the full dark logo as-is.
  const onLightFull = (
    <img
      key="on-light"
      className={cls('brand-logo--on-light')}
      src={BRAND.logoDark}
      srcSet={`${BRAND.logoDark} 1x, ${BRAND.logoDark2x} 2x`}
      alt={BRAND.logoAlt}
      width="900"
      height="103"
      draggable="false"
    />
  )
  // Light theme: lime on a pale surface is ~1.3:1, so the GM mark goes on a
  // navy tile and the dark wordmark sits beside it. One accessible name: the
  // tile image is decorative.
  const lockup = (
    <span key="lockup" className={cls('brand-logo--lockup')}>
      <span className="brand-lockup-tile" aria-hidden="true">
        <img src={BRAND.mark} alt="" width="512" height="220" draggable="false" />
      </span>
      <img
        className="brand-lockup-word"
        src={BRAND.wordmarkDark}
        srcSet={`${BRAND.wordmarkDark} 1x, ${BRAND.wordmarkDark2x} 2x`}
        alt={BRAND.logoAlt}
        width="124"
        height="20"
        draggable="false"
      />
    </span>
  )
  if (tone === 'dark') return onDark
  if (tone === 'light') return onLightFull
  return <>{onDark}{lockup}</>
}

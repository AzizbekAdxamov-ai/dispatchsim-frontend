import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigationType } from 'react-router-dom'
import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react'
import {
  HARD_CAP_MS, FULL_MS, REDUCED_MIN_MS, REDUCED_FADE_MS, OUT_MS,
  SEEN_KEY, MUTE_KEY, pickMode, readFlag, shouldDropIntro, shouldPlayIntro, writeFlag,
} from './academyIntroLogic'
import { academyReadySince, subscribeAcademyReady } from './academyIntroSignal'
import { ACADEMY_INTRO_COPY } from '../../data/academyIntroCopy'
import './AcademyIntro.css'

// Shown on entering the Academy from elsewhere. Ported from the approved
// film-opening demo: same frame maths, same sound.

const LOGO_PATH = 'M41,352 L42,371 L51,389 L64,400 L82,407 L366,408 L390,406 L403,401 L417,390 L577,203 L577,211 L538,388 L539,397 L546,406 L561,409 L571,405 L694,271 L777,184 L707,406 L777,407 L788,404 L802,392 L807,380 L901,71 L901,56 L892,44 L884,41 L821,41 L806,46 L739,111 L648,205 L647,200 L668,89 L671,60 L668,52 L658,43 L652,41 L636,43 L612,64 L513,170 L504,177 L314,179 L301,187 L263,257 L417,258 L361,321 L348,326 L169,326 L158,319 L157,309 L236,150 L253,132 L275,124 L493,124 L505,118 L566,40 L259,40 L224,48 L201,60 L187,71 L164,99 L46,335Z'

const BRAND_TAG = 'US LOGISTICS ACADEMY'

const MASTER_GAIN = 0.6
// Pages of this same navigation commit (and signal) before this effect runs;
// a signal from an earlier visit is much older than this.
const READY_GRACE_MS = 250
const AUDIO_TAIL_MS = 5000 // last tone starts at 2.8 s and rings 1.6 s, plus reverb

// ---- gesture tracking (fallback where navigator.userActivation is missing).
// Intentional module-level singleton: two capture listeners for the page's
// whole life, one timestamp; the overlay itself mounts and unmounts.
let lastGesture = -Infinity
if (typeof window !== 'undefined') {
  const mark = () => { lastGesture = performance.now() }
  window.addEventListener('pointerdown', mark, true)
  window.addEventListener('keydown', mark, true)
}

function gestureAllowed() {
  const ua = typeof navigator !== 'undefined' ? navigator.userActivation : undefined
  if (ua) return !!ua.isActive
  return performance.now() - lastGesture < 1000
}

function store(name) {
  try { return window[name] } catch { return null }
}

// ---- audio: one context at a time, never left open
const audio = { ac: null, m: null, timer: 0 }

function closeAudioNow() {
  window.clearTimeout(audio.timer)
  audio.timer = 0
  const ac = audio.ac
  audio.ac = null
  audio.m = null
  if (ac && ac.state !== 'closed') {
    try { ac.close().catch(() => {}) } catch { /* already closed */ }
  }
}

function closeAudioAfter(ms) {
  window.clearTimeout(audio.timer)
  audio.timer = window.setTimeout(closeAudioNow, Math.max(0, ms))
}

function startAudio() {
  closeAudioNow()
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return false
    const AC = new Ctx()
    audio.ac = AC
    if (AC.state === 'suspended') AC.resume()
    audio.m = playSound(AC)
    return true
  } catch {
    closeAudioNow()
    return false
  }
}

// Straight port of the demo's sound(); every node routes through the master gain m.
function playSound(AC) {
  const t = AC.currentTime
  const sr = AC.sampleRate
  const comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6
  const m = AC.createGain(); m.gain.value = MASTER_GAIN; comp.connect(m); m.connect(AC.destination)
  // room acoustics (reverb): an impulse made of noise
  const len = sr * 2.8
  const ib = AC.createBuffer(2, len, sr)
  for (let c = 0; c < 2; c++) { const d = ib.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) }
  const rv = AC.createConvolver(); rv.buffer = ib
  const rg = AC.createGain(); rg.gain.value = 0.55; rv.connect(rg); rg.connect(comp)
  function out(node, wet) { node.connect(comp); if (wet) { const w = AC.createGain(); w.gain.value = wet; node.connect(w); w.connect(rv) } }
  function noise(dur) { const b = AC.createBuffer(1, sr * dur, sr), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = AC.createBufferSource(); s.buffer = b; return s }
  function tone(type, f0, f1, t0, dur, pk, wet, a) {
    const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur)
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(pk, t0 + (a || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g); out(g, wet); o.start(t0); o.stop(t0 + dur + 0.05)
  }
  // 1) low drone (whole scene)
  const dr = AC.createOscillator(), dg = AC.createGain(), dl = AC.createBiquadFilter(); dr.type = 'sawtooth'; dr.frequency.value = 41; dl.type = 'lowpass'; dl.frequency.setValueAtTime(90, t); dl.frequency.linearRampToValueAtTime(260, t + 1.4)
  dg.gain.setValueAtTime(0, t); dg.gain.linearRampToValueAtTime(0.16, t + 1.2); dg.gain.linearRampToValueAtTime(0, t + 3.4); dr.connect(dl); dl.connect(dg); out(dg, 0.3); dr.start(t); dr.stop(t + 3.5)
  // 2) riser: noise + two detuned saws, 0.2 to 1.38 s
  const ns = noise(1.4), hp = AC.createBiquadFilter(), ng = AC.createGain(); hp.type = 'bandpass'; hp.Q.value = 0.8; hp.frequency.setValueAtTime(300, t + 0.2); hp.frequency.exponentialRampToValueAtTime(7000, t + 1.38)
  ng.gain.setValueAtTime(0, t + 0.2); ng.gain.linearRampToValueAtTime(0.22, t + 1.35); ng.gain.linearRampToValueAtTime(0, t + 1.42); ns.connect(hp); hp.connect(ng); out(ng, 0.25); ns.start(t + 0.2);
  [0, 7].forEach((dt) => {
    const o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter(); o.type = 'sawtooth'; o.detune.value = dt; o.frequency.setValueAtTime(110, t + 0.25); o.frequency.exponentialRampToValueAtTime(880, t + 1.38)
    f.type = 'lowpass'; f.frequency.setValueAtTime(400, t + 0.25); f.frequency.exponentialRampToValueAtTime(5000, t + 1.38); g.gain.setValueAtTime(0, t + 0.25); g.gain.linearRampToValueAtTime(0.045, t + 1.3); g.gain.linearRampToValueAtTime(0, t + 1.4); o.connect(f); f.connect(g); out(g, 0.3); o.start(t + 0.25); o.stop(t + 1.45)
  })
  // 3) scan ticks while the outline draws: faster and higher
  for (let k = 0, tt = 0.3; tt < 1.36; k++) { tone('square', 1200 + k * 90, null, t + tt, 0.04, 0.025, 0.2, 0.002); tt += Math.max(0.035, 0.11 - k * 0.006) }
  // 4) IMPACT 1.38 s: boom + metal hit + noise burst + reverse fall
  tone('sine', 95, 28, t + 1.38, 1.3, 0.9, 0.35, 0.005)
  tone('sine', 190, 50, t + 1.38, 0.6, 0.35, 0.2, 0.003);
  [523, 1318, 2093, 3136].forEach((f, i) => { tone('sine', f, null, t + 1.38, 1.8 - i * 0.25, 0.07 / (1 + i * 0.5), 0.7, 0.003) })
  const nb = noise(0.7), nf = AC.createBiquadFilter(), nbg = AC.createGain(); nf.type = 'lowpass'; nf.frequency.setValueAtTime(5000, t + 1.38); nf.frequency.exponentialRampToValueAtTime(300, t + 2); nbg.gain.setValueAtTime(0.35, t + 1.38); nbg.gain.exponentialRampToValueAtTime(0.0001, t + 2.05); nb.connect(nf); nf.connect(nbg); out(nbg, 0.6); nb.start(t + 1.38)
  // 5) truck pass: engine + Doppler + wind noise, left to right
  const T = t + 1.5, du = 1.5, eg = AC.createGain(); eg.gain.setValueAtTime(0, T); eg.gain.linearRampToValueAtTime(0.2, T + du * 0.5); eg.gain.linearRampToValueAtTime(0, T + du)
  const pn = AC.createStereoPanner ? AC.createStereoPanner() : null; if (pn) { pn.pan.setValueAtTime(-0.85, T); pn.pan.linearRampToValueAtTime(0.85, T + du); pn.connect(comp) }
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; eg.connect(lp); lp.connect(pn || comp);
  [1, 2, 3].forEach((k) => { const e = AC.createOscillator(), q = AC.createGain(); e.type = k === 1 ? 'triangle' : 'sawtooth'; e.frequency.setValueAtTime(52 * k * 1.09, T); e.frequency.linearRampToValueAtTime(52 * k * 0.91, T + du); q.gain.value = [0.8, 0.3, 0.15][k - 1]; e.connect(q); q.connect(eg); e.start(T); e.stop(T + du + 0.05) })
  const wn = noise(du), wb = AC.createBiquadFilter(), wg = AC.createGain(); wb.type = 'bandpass'; wb.frequency.setValueAtTime(500, T); wb.frequency.linearRampToValueAtTime(900, T + du * 0.5); wb.frequency.linearRampToValueAtTime(350, T + du); wg.gain.setValueAtTime(0, T); wg.gain.linearRampToValueAtTime(0.12, T + du * 0.5); wg.gain.linearRampToValueAtTime(0, T + du); wn.connect(wb); wb.connect(wg); if (pn) wg.connect(pn); else wg.connect(comp); wn.start(T)
  // distant signal (with reverb, the "film" mood)
  ;[311, 392].forEach((f) => { const o = AC.createOscillator(), g = AC.createGain(), l = AC.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f; l.type = 'lowpass'; l.frequency.value = 1100; g.gain.setValueAtTime(0, t + 1.95); g.gain.linearRampToValueAtTime(0.05, t + 1.99); g.gain.setValueAtTime(0.05, t + 2.35); g.gain.linearRampToValueAtTime(0, t + 2.55); o.connect(l); l.connect(g); out(g, 0.9); o.start(t + 1.95); o.stop(t + 2.6) })
  // 6) finish: bright "ding" + three voiced stars, long reverb tail
  ;[[1568, 2.6], [2093, 2.7], [2637, 2.8]].forEach((p) => { tone('sine', p[0], null, t + p[1], 1.6, 0.06, 0.9, 0.005); tone('triangle', p[0] * 2, null, t + p[1], 0.5, 0.015, 0.9, 0.005) })
  tone('sine', 98, null, t + 2.6, 2, 0.12, 0.5, 0.02)
  return m
}

// ---- frame maths (unchanged)
function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x }
function eo(x) { return 1 - Math.pow(1 - x, 3) }
function eio(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2 }

export default function AcademyIntro({ copy = ACADEMY_INTRO_COPY }) {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  const prevRef = useRef(null)
  const [session, setSession] = useState(null)
  const [seenPath, setSeenPath] = useState(pathname)

  // Left the academy while the overlay shows: drop it in the same render.
  if (pathname !== seenPath) {
    setSeenPath(pathname)
    if (shouldDropIntro(pathname)) setSession(null)
  }

  useEffect(() => {
    const prevPath = prevRef.current
    prevRef.current = pathname
    if (shouldDropIntro(pathname)) {
      closeAudioNow() // the overlay itself is dropped during render
      return
    }
    if (!shouldPlayIntro({ prevPath, nextPath: pathname, navigationType: navType })) return
    const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const mode = pickMode({ seen: readFlag(store('sessionStorage'), SEEN_KEY), reducedMotion })
    if (mode !== 'reduced') writeFlag(store('sessionStorage'), SEEN_KEY, true)
    const sound = mode === 'full' && !readFlag(store('localStorage'), MUTE_KEY) && gestureAllowed()
    setSession((s) => ({ id: (s?.id ?? 0) + 1, mode, sound, since: performance.now() - READY_GRACE_MS }))
  }, [pathname, navType])

  // Never leave an AudioContext open when the app goes away.
  useEffect(() => closeAudioNow, [])

  if (!session) return null
  return createPortal(
    <Overlay
      key={session.id}
      mode={session.mode}
      sound={session.sound}
      since={session.since}
      copy={copy}
      onDone={() => setSession(null)}
    />,
    document.body,
  )
}

function Overlay({ mode, sound, since, copy, onDone }) {
  const rootRef = useRef(null)
  const camRef = useRef(null)
  const dotsRef = useRef(null)
  const flareRef = useRef(null)
  const stageRef = useRef(null)
  const outRef = useRef(null)
  const fillRef = useRef(null)
  const sparkRef = useRef(null)
  const shineRef = useRef(null)
  const shockRef = useRef(null)
  const tagRef = useRef(null)
  const lineRef = useRef(null)
  const truckRef = useRef(null)
  const grainRef = useRef(null)
  const topRef = useRef(null)
  const bottomRef = useRef(null)
  const skipRef = useRef(null)
  const onDoneRef = useRef(onDone)
  const [muted, setMuted] = useState(() => readFlag(store('localStorage'), MUTE_KEY))

  useEffect(() => { onDoneRef.current = onDone })

  useEffect(() => {
    const root = rootRef.current
    const cv = dotsRef.current
    const cx = cv.getContext('2d')
    const outP = outRef.current
    const fillP = fillRef.current
    const spark = sparkRef.current
    const shine = shineRef.current
    const shock = shockRef.current
    const tag = tagRef.current
    const tk = truckRef.current
    const line = lineRef.current
    const stage = stageRef.current
    const cam = camRef.current
    const flare = flareRef.current
    const grain = grainRef.current
    const bt = topRef.current
    const bb = bottomRef.current
    const rm = mode === 'reduced'
    const short = mode === 'short'
    let animStart = null // the clock starts on the first painted frame
    let audioStart = 0

    let closed = false
    let normalClose = false
    let raf = 0
    let capTimer = 0
    let minTimer = 0
    let outTimer = 0
    let minDone = false
    let CXM = 0
    let CYM = 0
    let TR = null
    let unsub = () => {}

    root.classList.remove('gm-intro-out', 'gm-intro-wait')
    root.style.transitionDuration = ''

    function teardown() {
      cancelAnimationFrame(raf)
      window.clearTimeout(capTimer)
      window.clearTimeout(minTimer)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('visibilitychange', onVis)
      unsub()
      unsub = () => {}
    }

    // fast: skipped by the viewer, so fade quickly and silence the sound.
    function close(fast) {
      if (closed) return
      closed = true
      teardown()
      root.classList.remove('gm-intro-wait')
      if (fast) {
        root.style.transitionDuration = '.2s'
        closeAudioNow()
      } else {
        normalClose = true
        if (audioStart) closeAudioAfter(AUDIO_TAIL_MS - (performance.now() - audioStart))
      }
      root.classList.add('gm-intro-out')
      const ms = fast ? 200 : rm ? REDUCED_FADE_MS : OUT_MS
      outTimer = window.setTimeout(() => onDoneRef.current(), ms + 30)
    }

    function tryClose() {
      if (closed || !minDone) return
      if (academyReadySince(since)) close(false)
    }

    function onKey(e) {
      if (e.key !== 'Escape' || closed) return
      e.stopPropagation() // do not also close a modal under the overlay
      close(true)
    }
    function onVis() {
      if (document.visibilityState !== 'hidden' || closed) return
      closed = true
      teardown()
      window.clearTimeout(outTimer)
      closeAudioNow()
      onDoneRef.current()
    }
    skipRef.current = () => close(true)

    document.addEventListener('keydown', onKey, true)
    document.addEventListener('visibilitychange', onVis)
    unsub = subscribeAcademyReady(tryClose)
    capTimer = window.setTimeout(() => close(false), HARD_CAP_MS)

    if (rm) {
      minTimer = window.setTimeout(() => { minDone = true; tryClose() }, REDUCED_MIN_MS)
      tryClose()
    } else {
      // grain: 128x128 grayscale noise
      const gc = document.createElement('canvas'); gc.width = gc.height = 128
      const g = gc.getContext('2d'), gd = g.createImageData(128, 128)
      for (let i = 0; i < gd.data.length; i += 4) { const v = Math.random() * 255; gd.data[i] = gd.data[i + 1] = gd.data[i + 2] = v; gd.data[i + 3] = 255 }
      g.putImageData(gd, 0, 0)
      grain.style.backgroundImage = 'url(' + gc.toDataURL() + ')'

      const dotColor = getComputedStyle(document.documentElement).getPropertyValue('--intro-dot').trim()
      const total = outP.getTotalLength()
      const sr = stage.getBoundingClientRect()
      CXM = sr.left + sr.width / 2
      CYM = sr.top + sr.height / 2
      TR = tag.getBoundingClientRect()

      if (sound && startAudio()) audioStart = performance.now()

      const frame = (now) => {
        if (animStart == null) animStart = now
        let t = now - animStart
        if (short) t = t * 2.2 + 600 // short: 2.2x faster, starts past the drawing
        const W = cv.width = window.innerWidth
        const H = cv.height = window.innerHeight
        cx.clearRect(0, 0, W, H)
        // 1) outline draws
        const p = eio(cl((t - 250) / 1250)); outP.style.strokeDashoffset = 1 - p
        if (p > 0 && p < 1) { const pt = outP.getPointAtLength(p * total); spark.setAttribute('cx', pt.x); spark.setAttribute('cy', pt.y); spark.style.opacity = 1 } else spark.style.opacity = 0
        // 2) fill + "ignition"
        const fl = eo(cl((t - 1350) / 450)); fillP.style.opacity = fl; outP.style.opacity = 1 - 0.7 * fl
        const pul = cl((t - 1350) / 600); stage.style.transform = 'translate(-50%,-50%) scale(' + (1 + 0.045 * Math.sin(Math.PI * pul)) + ')'
        // 3) shock ring
        const sk = cl((t - 1380) / 900); shock.style.opacity = sk > 0 && sk < 1 ? 0.8 * (1 - sk) : 0; shock.style.transform = 'scale(' + (1 + sk * Math.max(W, H) / 50) + ')'
        // 4) dots wave
        const R = (t - 1380) * 1.15, step = 34
        if (R > 0) {
          for (let y = step / 2; y < H; y += step) {
            for (let x = step / 2; x < W; x += step) {
              const d = Math.hypot(x - CXM, y - CYM), k = 1 - Math.min(1, Math.abs(d - R) / 190)
              if (k <= 0) continue
              cx.fillStyle = dotColor
              cx.globalAlpha = k * 0.5 * (1 - cl((t - 2600) / 600))
              cx.beginPath(); cx.arc(x, y, 1.1 + k * 1.8, 0, 6.3); cx.fill()
            }
          }
          cx.globalAlpha = 1
        }
        // 5) shine
        const sh = cl((t - 1800) / 800); shine.style.opacity = sh > 0 && sh < 1 ? 1 : 0; shine.setAttribute('x', -200 + sh * 1300)
        // 6) road line + truck; the tag opens where the truck has passed
        line.style.opacity = 0.9 * cl((t - 1300) / 400) * (1 - cl((t - 3000) / 400))
        const tp = eio(cl((t - 1500) / 1400)), vw = W, tw = tk.offsetWidth, x0 = -tw - 40, x1 = vw + 40, tx = x0 + (x1 - x0) * tp
        tk.style.opacity = (t > 1450 && t < 2950) ? 1 : 0
        tk.style.transform = 'translateX(' + tx + 'px)'
        const front = tx + tw * 0.97, pr = cl((front - TR.left) / TR.width)
        tag.style.clipPath = 'inset(0 ' + (100 - pr * 100) + '% 0 0)'; tag.style.opacity = 1 - cl((t - 3100) / 300)
        cam.style.transform = 'scale(' + (1 + 0.07 * eio(cl(t / 3300))) + ')'
        const bh = H * 0.085 * eo(cl(t / 700)); bt.style.height = bb.style.height = bh + 'px'
        const fl2 = cl((t - 1360) / 850); flare.style.opacity = fl2 > 0 && fl2 < 1 ? (fl2 < 0.12 ? fl2 / 0.12 : (1 - fl2)) : 0; flare.style.transform = 'scaleX(' + (0.05 + 0.95 * eo(cl(fl2 * 1.6))) + ')'
        // chromatic flash: a CSS class reads the offset from a custom property
        const ca = cl((t - 1380) / 380)
        if (ca > 0 && ca < 1) { fillP.style.setProperty('--intro-ca', (6 * (1 - ca)) + 'px'); fillP.classList.add('gm-intro-ca') } else fillP.classList.remove('gm-intro-ca')
        grain.style.transform = 'translate(' + (Math.random() * 60 | 0) + 'px,' + (Math.random() * 60 | 0) + 'px)'
        if (t < FULL_MS) raf = requestAnimationFrame(frame)
        else {
          minDone = true
          // Ended but the page is not ready: stay on the lit logo and show the bar.
          if (!academyReadySince(since)) root.classList.add('gm-intro-wait')
          tryClose()
        }
      }
      raf = requestAnimationFrame(frame)
    }

    return () => {
      closed = true
      teardown()
      window.clearTimeout(outTimer)
      skipRef.current = null
      // A normal finish lets the sound ring out; anything else stops it now.
      if (!normalClose) closeAudioNow()
    }
  }, [mode, sound, since])

  function toggleMute(e) {
    e.stopPropagation()
    const next = !muted
    setMuted(next)
    writeFlag(store('localStorage'), MUTE_KEY, next)
    const { ac, m } = audio
    if (ac && m) {
      try { m.gain.setValueAtTime(next ? 0 : MASTER_GAIN, ac.currentTime) } catch { /* context closed */ }
    }
  }

  return (
    <div
      ref={rootRef}
      className={'gm-intro gm-intro-on' + (mode === 'reduced' ? ' gm-intro-rm' : '')}
      onPointerDown={() => skipRef.current?.()}
    >
      <div className="gm-intro-vis" aria-hidden="true">
        <div className="gm-intro-cam" ref={camRef}>
          <canvas className="gm-intro-dots" ref={dotsRef} />
          <div className="gm-intro-flare" ref={flareRef} />
          <div className="gm-intro-stage" ref={stageRef}>
            <svg viewBox="0 0 942 449">
              <defs>
                <clipPath id="gm-intro-cp"><path d={LOGO_PATH} /></clipPath>
                <linearGradient id="gm-intro-sh" x1="0" x2="1">
                  <stop offset="0" style={{ stopColor: 'var(--intro-shine)', stopOpacity: 0 }} />
                  <stop offset=".5" style={{ stopColor: 'var(--intro-shine)', stopOpacity: 0.85 }} />
                  <stop offset="1" style={{ stopColor: 'var(--intro-shine)', stopOpacity: 0 }} />
                </linearGradient>
              </defs>
              <path className="gm-intro-fill" ref={fillRef} d={LOGO_PATH} />
              <g clipPath="url(#gm-intro-cp)"><rect ref={shineRef} x="-200" y="-40" width="160" height="540" fill="url(#gm-intro-sh)" transform="skewX(-20)" opacity="0" /></g>
              <path className="gm-intro-outline" ref={outRef} d={LOGO_PATH} pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
              <circle className="gm-intro-spark" ref={sparkRef} r="7" cx="-50" cy="-50" />
            </svg>
            <div className="gm-intro-shock" ref={shockRef} />
          </div>
          <div className="gm-intro-tag" ref={tagRef}>{BRAND_TAG}</div>
          <div className="gm-intro-line" ref={lineRef} />
          <div className="gm-intro-truck" ref={truckRef}>
            <svg viewBox="0 0 300 76">
              <defs>
                <linearGradient id="gm-intro-bm" x1="0" x2="1">
                  <stop offset="0" style={{ stopColor: 'var(--intro-truck-beam)', stopOpacity: 0.8 }} />
                  <stop offset="1" style={{ stopColor: 'var(--intro-truck-beam)', stopOpacity: 0 }} />
                </linearGradient>
              </defs>
              <polygon points="292,50 520,28 520,70 292,56" fill="url(#gm-intro-bm)" />
              <rect x="4" y="8" width="190" height="48" rx="4" style={{ fill: 'var(--intro-truck-body)', stroke: 'var(--intro-lime)' }} strokeWidth="1.6" />
              <path d="M200 56 V22 Q200 16 207 16 H238 Q245 16 249 23 L258 36 H288 Q294 36 294 42 V56 Z" style={{ fill: 'var(--intro-truck-cab)', stroke: 'var(--intro-lime)' }} strokeWidth="1.6" />
              <path d="M240 21 L254 36 H232 V21 Z" style={{ fill: 'var(--intro-truck-glass)' }} opacity=".7" />
              <g style={{ fill: 'var(--intro-truck-wheel)', stroke: 'var(--intro-truck-rim)' }} strokeWidth="1.5">
                <circle className="gm-intro-wheel" cx="40" cy="62" r="9" />
                <circle className="gm-intro-wheel" cx="62" cy="62" r="9" />
                <circle className="gm-intro-wheel" cx="218" cy="62" r="9" />
                <circle className="gm-intro-wheel" cx="240" cy="62" r="9" />
                <circle className="gm-intro-wheel" cx="278" cy="62" r="9" />
              </g>
              <circle cx="293" cy="48" r="3.5" style={{ fill: 'var(--intro-truck-beam)' }} />
            </svg>
          </div>
        </div>
        <div className="gm-intro-vig" />
        <div className="gm-intro-grain" ref={grainRef} />
        <div className="gm-intro-box gm-intro-box-top" ref={topRef} />
        <div className="gm-intro-box gm-intro-box-bottom" ref={bottomRef} />
        <div className="gm-intro-bar"><i /></div>
      </div>
      <div className="gm-intro-sr" role="status" aria-live="polite">{copy.status}</div>
      {mode === 'full' && (
        <button
          type="button"
          className="gm-intro-mute"
          aria-label={muted ? copy.muteOff : copy.muteOn}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={toggleMute}
        >
          {muted ? <SpeakerSlash size={18} weight="bold" /> : <SpeakerHigh size={18} weight="bold" />}
        </button>
      )}
    </div>
  )
}

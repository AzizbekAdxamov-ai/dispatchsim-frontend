// Motion layer for the lesson pages. Runs after the lesson script, never
// changes what the lesson shows or stores: it only animates what the lesson
// already did (a class added, a number rewritten). Skipped entirely when the
// visitor prefers reduced motion.
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (!document.body || !Element.prototype.animate) return

  var root = document.documentElement
  var present = root.classList.contains('ds-present')
  var K = present ? 1.25 : 1
  var E = 'cubic-bezier(.2,.7,.2,1)'

  function qa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)) }
  function play(el, frames, opts) {
    try { return el.animate(frames, opts) } catch { return null }
  }
  function added(el, oldClass, name) {
    return el.classList.contains(name) && (' ' + (oldClass || '') + ' ').indexOf(' ' + name + ' ') < 0
  }
  // Fires once when an element comes into view. The bottom margin makes very
  // tall sections count as seen as soon as their top edge is on screen.
  function onceVisible(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(); return }
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (x) { return x.isIntersecting })) { io.disconnect(); cb() }
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' })
    io.observe(el)
  }

  // 1. Sections slide in as they are reached (not in class mode: one part at a time;
  //    not when the scroll-reveal layer rv-on is active: it animates the same elements).
  if (!present && !root.classList.contains('rv-on')) {
    qa('section.sec').forEach(function (sec) {
      if (sec.getBoundingClientRect().top <= window.innerHeight) return
      sec.classList.add('ds-pre')
      onceVisible(sec, function () {
        sec.classList.remove('ds-pre')
        Array.prototype.forEach.call(sec.children, function (c, i) {
          var isSign = c.classList.contains('sign')
          play(c, [
            { opacity: 0, translate: isSign ? '-12px 0' : '0 8px' },
            { opacity: 1, translate: '0 0' },
          ], { duration: 420, delay: i * 60, easing: E, fill: 'backwards' })
        })
        var ic = sec.querySelector('.sign .ic')
        if (ic) play(ic, [{ scale: 1, opacity: 0.6 }, { scale: 1.12, opacity: 1, offset: 0.5 }, { scale: 1, opacity: 1 }], { duration: 500, easing: E })
      })
    })
  }

  // 4. Numbers count up when first seen and glide when the lesson rewrites them.
  var NUM = /^([^\d]*?)([\d,]+(?:\.\d+)?)([^\d]*)$/
  function parse(text) {
    var m = NUM.exec(text)
    if (!m) return null
    var num = m[2]
    var dot = num.indexOf('.')
    return {
      pre: m[1], suf: m[3],
      value: parseFloat(num.replace(/,/g, '')),
      decimals: dot < 0 ? 0 : num.length - dot - 1,
      commas: num.indexOf(',') >= 0,
    }
  }
  function format(p, v) {
    var s = v.toFixed(p.decimals)
    if (p.commas) {
      var parts = s.split('.')
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      s = parts.join('.')
    }
    return p.pre + s + p.suf
  }
  function tween(entry, el, from, to, ms, finalText) {
    cancelAnimationFrame(entry.raf)
    var t0 = performance.now()
    function frame(t) {
      var k = Math.min(1, (t - t0) / ms)
      var eased = 1 - Math.pow(1 - k, 3)
      var text = k >= 1 ? finalText : format(to, from.value + (to.value - from.value) * eased)
      entry.written = text
      el.textContent = text
      if (k < 1) entry.raf = requestAnimationFrame(frame)
    }
    entry.raf = requestAnimationFrame(frame)
  }
  qa('.bignums').forEach(function (box) {
    var entries = []
    function sync(initial) {
      qa('.big b', box).forEach(function (el, i) {
        var text = el.textContent
        var prev = entries[i]
        // Our own frame writing into the element: nothing to react to.
        if (prev && prev.el === el && text === prev.written) return
        var to = parse(text)
        var ok = !!to && el.children.length === 0
        if (!prev || prev.el !== el) {
          // First sight of this element (the lesson may rebuild the whole box).
          if (prev) cancelAnimationFrame(prev.raf)
          var fresh = { el: el, last: text, written: text, raf: 0, parsed: ok ? to : null }
          entries[i] = fresh
          if (initial && ok && to.value > 0) {
            onceVisible(el, function () {
              if (entries[i] !== fresh || fresh.written !== text) return
              tween(fresh, el, { value: 0 }, to, 600, text)
            })
          } else if (prev && prev.parsed && ok && prev.parsed.pre === to.pre && prev.parsed.suf === to.suf && prev.last !== text) {
            tween(fresh, el, prev.parsed, to, 200, text)
          }
          return
        }
        if (text !== prev.last) {
          var from = prev.parsed
          prev.last = text
          prev.parsed = ok ? to : null
          prev.written = text
          if (from && ok && from.pre === to.pre && from.suf === to.suf) tween(prev, el, from, to, 200, text)
        }
      })
    }
    sync(true)
    new MutationObserver(function () { sync(false) })
      .observe(box, { subtree: true, childList: true, characterData: true })
  })

  // 8. Timelines draw their line, then their steps appear one by one.
  qa('.tl').forEach(function (tl) {
    var lis = Array.prototype.filter.call(tl.children, function (c) { return c.tagName === 'LI' })
    lis.forEach(function (li, i) { li.style.setProperty('--i', i) })
    tl.classList.add('ds-tlpre')
    onceVisible(tl, function () {
      tl.classList.remove('ds-tlpre')
      tl.classList.add('ds-tlin')
      lis.forEach(function (li, i) {
        play(li, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: i * 110, easing: E, fill: 'backwards' })
      })
    })
  })

  // 9. Finish: a short burst of confetti, then it removes itself.
  function confetti(box) {
    var colors = ['var(--lane)', 'var(--accent)', 'var(--good)', 'var(--caution)', 'var(--sign-ink)']
    var wrap = document.createElement('div')
    wrap.className = 'ds-confetti'
    wrap.setAttribute('aria-hidden', 'true')
    var bits = []
    for (var i = 0; i < 24; i++) {
      var b = document.createElement('i')
      b.style.left = '50%'
      b.style.top = '30%'
      b.style.background = colors[i % colors.length]
      wrap.appendChild(b)
      bits.push(b)
    }
    box.appendChild(wrap)
    var left = bits.length
    var finish = function () { if (--left === 0 && wrap.parentNode) wrap.parentNode.removeChild(wrap) }
    bits.forEach(function (b) {
      var ang = Math.random() * Math.PI * 2
      var dist = 90 + Math.random() * 170
      var a = play(b, [
        { translate: '0 0', rotate: '0deg', opacity: 1 },
        { translate: (Math.cos(ang) * dist) + 'px ' + (Math.sin(ang) * dist + 80) + 'px', rotate: (Math.random() * 720 - 360) + 'deg', opacity: 0 },
      ], { duration: 1200, easing: 'cubic-bezier(.1,.7,.3,1)' })
      if (a) a.onfinish = finish; else finish()
    })
  }

  // 2, 5, 6, 9. Reactions to what the lesson just did (a class was added).
  new MutationObserver(function (records) {
    records.forEach(function (r) {
      var el = r.target
      if (!el.classList) return
      var old = r.oldValue
      if (el.matches('section.sec') && added(el, old, 'done')) {
        var stamp = el.querySelector('.sign .stamp')
        if (stamp) play(stamp, [
          { transform: 'rotate(-12deg) scale(1.6)', opacity: 0 },
          { transform: 'rotate(-5deg) scale(.94)', opacity: 1, offset: 0.75 },
          { transform: 'rotate(-6deg) scale(1)', opacity: 1 },
        ], { duration: 480, easing: E })
        var sign = el.querySelector('.sign')
        if (sign) play(sign, [{ translate: '0 0' }, { translate: '0 -3px' }, { translate: '0 0' }], { duration: 120 })
      } else if (el.matches('.route a') && added(el, old, 'done')) {
        var n = el.querySelector('.n')
        if (n) play(n, [{ scale: 1 }, { scale: 1.35 }, { scale: 1 }], { duration: 360, easing: E })
      } else if (el.matches('.opt') && added(el, old, 'right')) {
        var ring = document.createElement('span')
        ring.className = 'ds-ring'
        ring.setAttribute('aria-hidden', 'true')
        el.appendChild(ring)
        var ra = play(ring, [{ opacity: 0.9, scale: 1 }, { opacity: 0, scale: 1.08 }], { duration: 520, easing: E })
        var drop = function () { if (ring.parentNode) ring.parentNode.removeChild(ring) }
        if (ra) ra.onfinish = drop; else drop()
      } else if (el.matches('.opt') && added(el, old, 'wrong')) {
        var s = 4 * K
        play(el, [
          { translate: '0 0' }, { translate: -s + 'px 0' }, { translate: s + 'px 0' },
          { translate: -s + 'px 0' }, { translate: s + 'px 0' }, { translate: '0 0' },
        ], { duration: 320 })
      } else if (el.matches('.fb') && added(el, old, 'show')) {
        play(el, [{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { duration: 240, easing: E })
      } else if (el.matches('#finish') && added(el, old, 'won')) {
        confetti(el)
      }
    })
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true })
})()

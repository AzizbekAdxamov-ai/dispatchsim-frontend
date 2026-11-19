// Runs after the lesson script. Only active inside the Academy frame.
(function () {
  var root = document.documentElement
  if (!root.classList.contains('ds-embed')) return
  document.body.classList.add('embed')

  var present = root.classList.contains('ds-present')
  var items

  function send(msg) {
    try { window.parent.postMessage(msg, location.origin) } catch { /* parent gone */ }
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || e.source !== window.parent) return
    var d = e.data
    if (!d) return
    if (d.type === 'ds-theme' && (d.theme === 'dark' || d.theme === 'light')) {
      root.setAttribute('data-theme', d.theme)
    } else if (present && d.type === 'ds-goto') {
      show(Number(d.index))
    } else if (present && d.type === 'ds-fs') {
      var px = Math.max(14, Math.min(36, Number(d.px)))
      if (px) root.style.setProperty('--ds-fs', px + 'px')
    }
  })

  // Esc inside the frame must still close the app's drawer (focus is in the frame).
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
    send({ type: 'ds-key', key: 'Escape' })
  })

  if (!present) return

  var main = document.querySelector('main.wrap') || document.body
  function clean(t) {
    return t.replace(/\bTest\b/g, 'Savollar').replace(/simulyatsiya/gi, 'amaliyot').replace(/\s+/g, ' ').trim()
  }
  function minutesOf(sec) {
    var t = sec.querySelector('.sign .time')
    var m = t && /(\d+)\s*daqiqa/.exec(t.textContent)
    return m ? Number(m[1]) : null
  }

  var groups = []
  var hero = document.querySelector('section.hero')
  if (hero) groups.push({ id: 'hero', title: 'Kirish', minutes: 5, els: [hero] })
  Array.prototype.forEach.call(document.querySelectorAll('section.sec[data-sec]'), function (sec) {
    var h = sec.querySelector('.sign h2')
    var id = sec.getAttribute('data-sec')
    groups.push({ id: id, title: clean(h ? h.textContent : id), minutes: minutesOf(sec), els: [sec] })
  })
  var tailEls = [document.getElementById('finish'), document.querySelector('section.mentor'), document.querySelector('footer.foot')]
    .filter(Boolean)
  if (tailEls.length) groups.push({ id: 'finish', title: 'Yakun', minutes: 5, els: tailEls })
  if (!groups.length) return

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function show(i) {
    if (!(i >= 0)) i = 0
    i = Math.min(i, groups.length - 1)
    var keep = groups[i].els
    Array.prototype.forEach.call(main.children, function (c) {
      c.classList.toggle('ds-off', keep.indexOf(c) < 0)
    })
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (!reduce && main.animate) main.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' })
    send({ type: 'ds-section', index: i })
  }

  items = groups.map(function (g, i) {
    return { index: i, id: g.id, title: g.title, minutes: g.minutes, notes: null }
  })
  show(0)
  send({ type: 'ds-sections', items: items })

  // The frame owns the keyboard once clicked: hand the keys to the app.
  var KEYS = ['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'f', 'F']
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
    var t = e.target
    var tag = t && t.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return
    if (KEYS.indexOf(e.key) < 0) return
    e.preventDefault()
    send({ type: 'ds-key', key: e.key })
  })

  var lastMove = 0
  document.addEventListener('pointermove', function () {
    var now = Date.now()
    if (now - lastMove < 500) return
    lastMove = now
    send({ type: 'ds-activity' })
  })
})()

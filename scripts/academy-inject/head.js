// Runs first, before the lesson's own styles and script. In a fragment page
// document.body does not exist yet, so every flag goes on <html>.
(function () {
  var root = document.documentElement
  var embed = false
  try { embed = window.parent !== window } catch { embed = true }
  if (embed) root.classList.add('ds-embed')
  try {
    var t = window.parent.document.documentElement.getAttribute('data-theme')
    if (t === 'dark' || t === 'light') root.setAttribute('data-theme', t)
  } catch { /* cross-origin parent: wait for the ds-theme message */ }

  // Class mode (?present=1): the lesson runs in teach mode on its own storage
  // keys (ds-cls-*), so a mentor's class never touches a student's progress
  // and is never uploaded. Only this window's localStorage is rewired.
  if (embed && /[?&]present=1(&|$)/.test(location.search)) {
    root.classList.add('ds-present')
    var P = Storage.prototype
    var g = P.getItem
    var s = P.setItem
    var r = P.removeItem
    var LS
    try { LS = window.localStorage } catch { LS = null }
    var m = function (k) {
      k = String(k)
      return /^ds-l\d+-/.test(k) ? 'ds-cls-' + k.slice(3) : k
    }
    P.getItem = function (k) {
      if (this === LS && /^ds-l\d+-mode$/.test(String(k))) return '"teach"'
      return g.call(this, this === LS ? m(k) : k)
    }
    P.setItem = function (k, v) { return s.call(this, this === LS ? m(k) : k, v) }
    P.removeItem = function (k) { return r.call(this, this === LS ? m(k) : k) }
  }
})()

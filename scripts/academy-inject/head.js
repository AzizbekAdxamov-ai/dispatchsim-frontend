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
})()

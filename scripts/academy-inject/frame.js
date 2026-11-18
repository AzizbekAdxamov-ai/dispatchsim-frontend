// Runs after the lesson script. Only active inside the Academy frame.
(function () {
  if (!document.documentElement.classList.contains('ds-embed')) return
  document.body.classList.add('embed')
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || e.source !== window.parent) return
    var d = e.data
    if (d && d.type === 'ds-theme' && (d.theme === 'dark' || d.theme === 'light')) {
      document.documentElement.setAttribute('data-theme', d.theme)
    }
  })
})()

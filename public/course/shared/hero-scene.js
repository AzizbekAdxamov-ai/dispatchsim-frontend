/* Hero scene: night road, exit signs and the GrossMasters billboard.
   One shared component for every lesson. It finds `svg.scene[data-signs]`,
   builds the whole scene on top of the static fallback markup, and brings the
   fallback back if anything fails. Nothing is exposed globally.
   The layout math lives in HS_PURE (no DOM) so node tests can check the geometry;
   it is exported only where `module` exists (never in the browser). */
(function () {
  var HS_PURE = (function () {
    var K = {
      W: 880, GAP: 52, BGAP: 100, BW: 300, EMPTY: 636,       // dynamic rhythm
      SGAP: 16, SBGAP: 24, MARGIN: 8,                          // tight static gaps
      MINW: 48, MAXW: 96, PAD: 16, LMIN: 7, VMIN: 20, L0: 9, V0: 30,
      NARROW_X0: 60, NARROW_X1: 680, NARROW_SCALE: 1.25, SCALE_MIN: 0.85
    };
    var TONES = {
      good: { lit: '#DCFBE7', ink: '#14683A', glow: '#4ADE80' },
      warn: { lit: '#FFF0B8', ink: '#8A5A00', glow: '#F2B705' },
      neutral: { lit: '#FFFBE6', ink: '#111111', glow: '#F6E7A6' }
    };
    function mod(v, m) { return ((v % m) + m) % m; }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function tone(value, tn) {
      if (TONES[tn]) return tn;
      return value.indexOf('\u2713') >= 0 ? 'good' : (/[!?]/.test(value) ? 'warn' : 'neutral');
    }
    function widthOf(lw, vw) { return Math.ceil(clamp(Math.max(lw, vw) + K.PAD, K.MINW, K.MAXW) * 10 - 1e-9) / 10; }   // round up: never narrower than the text
    // measure(kind, fontSize) -> text width ('label' | 'value'); shrinks value 30 -> 20 and label 9 -> 7
    // until text + padding fits the widest face (96). `c` is the compact variant (smallest sizes).
    function sizeSign(measure) {
      function m(l, v) { return { lw: measure('label', l), vw: measure('value', v) }; }
      var lfs = K.L0, vfs = K.V0, r = m(lfs, vfs);
      while (r.lw + K.PAD > K.MAXW && lfs > K.LMIN) { lfs -= 1; r = m(lfs, vfs); }
      while (r.vw + K.PAD > K.MAXW && vfs > K.VMIN) { vfs -= 2; r = m(lfs, vfs); }
      var cr = m(K.LMIN, K.VMIN);
      return {
        n: { lfs: lfs, vfs: vfs, w: widthOf(r.lw, r.vw), sqL: false, sqV: false },
        c: { lfs: K.LMIN, vfs: K.VMIN, w: widthOf(cr.lw, cr.vw), sqL: false, sqV: false }
      };
    }
    // moving layout: centers of the signs and the board, and the loop length
    function cycle(ws) {
      var l = 0, lastRight = 0, centers = [];
      ws.forEach(function (w, i) { centers[i] = l + w / 2; lastRight = l + w; l += w + K.GAP; });
      var bbCenter = lastRight + K.BGAP + K.BW / 2;
      return { centers: centers, bbCenter: bbCenter, cyc: Math.round(bbCenter + K.BW / 2 + ws[0] / 2 + K.EMPTY) };
    }
    function positions(cy, o) {
      return {
        xs: cy.centers.map(function (c) { return mod(c + 900 - o, cy.cyc) - 160; }),
        bx: mod(cy.bbCenter + 900 - o, cy.cyc) - 160
      };
    }
    // places signs from `from` and the board by edge gaps, starting at 0
    function arrange(from, gap, bgap, ws, sc) {
      var l = 0, xs = [], lastRight = 0;
      for (var i = from; i < ws.length; i++) { xs[i] = l + ws[i] / 2; lastRight = l + ws[i]; l += ws[i] + gap; }
      var half = K.BW / 2 * sc;                          // gap is measured to the board's visible (scaled) edge
      var bx = lastRight + bgap + half;
      return { xs: xs, bx: bx, left: xs[from] - ws[from] / 2, right: bx + half };
    }
    // reduced motion: one still frame with every sign and the board inside the view.
    // order: fit -> tight gaps -> tight + smaller board (down to 0.85) -> compact first sign -> drop first (last resort)
    function staticFrame(ws, cws, narrow) {
      var vx0 = narrow ? K.NARROW_X0 : 0, vx1 = narrow ? K.NARROW_X1 : K.W, room = vx1 - vx0 - 2 * K.MARGIN;
      var base = narrow ? K.NARROW_SCALE : 1, n = ws.length, scales = [];
      for (var sc = base - 0.05; sc >= K.SCALE_MIN - 1e-9; sc -= 0.05) scales.push(Math.round(sc * 100) / 100);
      if (!scales.length || scales[scales.length - 1] > K.SCALE_MIN) scales.push(K.SCALE_MIN);
      var kind = 'fit', board = base, w2 = ws, from = 0;
      var a = arrange(0, K.GAP, K.BGAP, w2, board);
      function over() { return a.right - a.left > room; }
      if (over()) { kind = 'tight'; a = arrange(0, K.SGAP, K.SBGAP, w2, board); }
      for (var i = 0; over() && i < scales.length; i++) {
        kind = 'tight-board'; board = scales[i]; a = arrange(0, K.SGAP, K.SBGAP, w2, board);
      }
      if (over()) {
        kind = 'compact'; board = K.SCALE_MIN; w2 = ws.slice(); w2[0] = Math.min(w2[0], cws[0]);
        a = arrange(0, K.SGAP, K.SBGAP, w2, board);
      }
      if (over()) {
        kind = 'drop-first'; w2 = ws; from = Math.min(1, n - 1);
        for (var j = -1; j < scales.length; j++) {
          board = j < 0 ? base : scales[j]; a = arrange(from, K.SGAP, K.SBGAP, w2, board);
          if (!over()) break;
        }
      }
      var shift = kind === 'drop-first' ? (vx1 - K.MARGIN - a.right) : (vx0 + K.MARGIN + (room - (a.right - a.left)) / 2 - a.left);
      var xs = [];
      for (var k = 0; k < n; k++) xs[k] = (a.xs[k] === undefined) ? null : a.xs[k] + shift;
      return { kind: kind, board: board, xs: xs, bx: a.bx + shift, ws: w2, vx0: vx0, vx1: vx1 };
    }
    return { K: K, TONES: TONES, mod: mod, tone: tone, widthOf: widthOf, sizeSign: sizeSign, cycle: cycle, positions: positions, staticFrame: staticFrame };
  })();

  function run() {
    var root = null, svg = null, fbs = [], raf = 0, dead = false, halted = false;
    function ignore(e) { return e; }        // expected failures (hidden element has no text length)
    function fail(e) {                       // real failures leave a trace for the check script / devtools
      try { if (svg) svg.setAttribute('data-hs-error', String((e && e.message) || e)); } catch (_x) { ignore(_x); }
      try { if (window.console && console.error) console.error('hero-scene:', e); } catch (_y) { ignore(_y); }
    }
    try {
      svg = document.querySelector('svg.scene[data-signs]');
      if (!svg) return;
      var raw = JSON.parse(svg.getAttribute('data-signs'));
      if (!raw || !raw.length) return;
      // hide (not delete) the static fallback: it comes back if the setup fails, and goes for good after it worked
      fbs = Array.prototype.slice.call(svg.querySelectorAll('[data-hs-fallback]'));
      fbs.forEach(function (f) { f.style.display = 'none'; });

      var HS = HS_PURE, K = HS.K, NS = 'http://www.w3.org/2000/svg', W = K.W, BW = K.BW;
      var TONES = HS.TONES, LMIN = K.LMIN, VMIN = K.VMIN;

    // ---- styles (once) ----
    if (!document.getElementById('hs-style')) {
      var st0 = document.createElement('style');
      st0.id = 'hs-style';
      st0.textContent =
        '.scene .hs-wheel{animation:hs-spin .55s linear infinite;transform-box:fill-box;transform-origin:center}' +
        '@keyframes hs-spin{to{transform:rotate(360deg)}}' +
        '.scene .hs-rig{animation:hs-bob 1.3s ease-in-out infinite}' +
        '@keyframes hs-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.6px)}}' +
        '.scene .hs-beam{animation:hs-flick 3.4s ease-in-out infinite}' +
        '@keyframes hs-flick{0%,100%{opacity:1}45%{opacity:.86}50%{opacity:.95}55%{opacity:.82}}' +
        '.scene .hs-twinkle{animation:hs-tw 3s ease-in-out infinite}' +
        '@keyframes hs-tw{0%,100%{opacity:.9}50%{opacity:.25}}' +
        '.scene .hs-puff{opacity:0;animation:hs-puff 3.2s ease-out infinite;transform-box:fill-box;transform-origin:center}' +
        '@keyframes hs-puff{0%{opacity:0;transform:translate(0,0) scale(.5)}15%{opacity:.5}100%{opacity:0;transform:translate(-46px,-22px) scale(2.6)}}' +
        '.scene .hs-shoot{opacity:0;animation:hs-shoot 11s linear infinite}' +
        '@keyframes hs-shoot{0%,90%{opacity:0;transform:translate(0,0)}91%{opacity:1}100%{opacity:0;transform:translate(-120px,60px)}}' +
        '.scene.hs-paused *{animation-play-state:paused}' +
        '@media (prefers-reduced-motion:reduce){.scene .hs-wheel,.scene .hs-rig,.scene .hs-beam,.scene .hs-puff,.scene .hs-shoot,.scene .hs-twinkle{animation:none}}';
      document.head.appendChild(st0);
    }

    function el(tag, attrs, parent) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e);
      return e;
    }
    function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
    function hex(c) { return [1, 3, 5].map(function (i) { return parseInt(c.substr(i, 2), 16); }); }
    function mix(a, b, t) {
      var A = hex(a), B = hex(b);
      return 'rgb(' + A.map(function (v, i) { return Math.round(v + (B[i] - v) * t); }).join(',') + ')';
    }
    function hash(n) { var x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
    function mod(v, m) { return ((v % m) + m) % m; }

    // everything is built inside one group, so a failure can remove it and keep the fallback
    root = el('g', { 'data-hs-root': '' }, svg);

    var defs = el('defs', {}, root);
    var gb = el('linearGradient', { id: 'hs-beam', x1: 0, x2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#FFF1B8', 'stop-opacity': '.62' }, gb);
    el('stop', { offset: '.55', 'stop-color': '#F6E7A6', 'stop-opacity': '.22' }, gb);
    el('stop', { offset: 1, 'stop-color': '#F6E7A6', 'stop-opacity': '0' }, gb);
    var gp = el('radialGradient', { id: 'hs-pool' }, defs);
    el('stop', { offset: 0, 'stop-color': '#FFF1B8', 'stop-opacity': '.34' }, gp);
    el('stop', { offset: 1, 'stop-color': '#FFF1B8', 'stop-opacity': '0' }, gp);
    var gh = el('radialGradient', { id: 'hs-halo' }, defs);
    el('stop', { offset: 0, 'stop-color': '#F6E7A6', 'stop-opacity': '.30' }, gh);
    el('stop', { offset: 1, 'stop-color': '#F6E7A6', 'stop-opacity': '0' }, gh);
    var gr = el('linearGradient', { id: 'hs-roadG', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#121A2E' }, gr);
    el('stop', { offset: 1, 'stop-color': '#070B16' }, gr);
    var flt = el('filter', { id: 'hs-glow', x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs);
    el('feGaussianBlur', { stdDeviation: 5 }, flt);
    var clip = el('clipPath', { id: 'hs-clipS' }, defs);
    el('rect', { width: W, height: 200 }, clip);

    var scene = el('g', { 'clip-path': 'url(#hs-clipS)' }, root);

    // stars
    var stars = el('g', { fill: '#fff' }, scene), r = rng(7);
    for (var i = 0; i < 16; i++) {
      var c = el('circle', { cx: Math.round(r() * 860 + 10), cy: Math.round(r() * 70 + 8), r: (r() * 1 + .8).toFixed(1), 'class': 'hs-twinkle' }, stars);
      c.style.animationDelay = (r() * 3).toFixed(1) + 's';
      c.setAttribute('opacity', (.5 + r() * .5).toFixed(2));
    }
    el('path', { 'class': 'hs-shoot', d: 'M690 24l-26 -2', stroke: '#fff', 'stroke-width': 1.6, 'stroke-linecap': 'round', fill: 'none' }, scene);
    el('circle', { cx: 778, cy: 48, r: 46, fill: 'url(#hs-halo)' }, scene);
    el('circle', { cx: 778, cy: 48, r: 20, fill: '#F6E7A6', opacity: .95 }, scene);
    el('circle', { cx: 786, cy: 42, r: 18, fill: '#151C2F', opacity: .55 }, scene);

    // seamless hills (integer number of cycles over 880)
    var L1 = el('g', {}, scene), L2 = el('g', {}, scene), L3 = el('g', {}, scene);
    function hills(g, base, amp, cyc, fill, seed) {
      var rr = rng(seed), ph = [rr() * 6, rr() * 6], pts = [];
      for (var x = 0; x <= W * 2; x += 20) {
        var y = base - amp * (Math.sin(x / W * Math.PI * 2 * cyc + ph[0]) * .6 + Math.sin(x / W * Math.PI * 2 * (cyc * 2 + 1) + ph[1]) * .4);
        pts.push(x + ' ' + y.toFixed(1));
      }
      el('path', { d: 'M' + pts.join('L') + 'V200H0z', fill: fill }, g);
    }
    hills(L1, 128, 16, 1, 'rgba(0,0,0,.20)', 11);
    hills(L2, 146, 10, 2, 'rgba(0,0,0,.30)', 23);
    (function () {   // pine line (near, darkest) with an exact 880 period
      var rr = rng(5), xs = [];
      for (var x = 10; x < W - 20; x += 26 + rr() * 30) xs.push([x, 22 + rr() * 18]);
      [0, W].forEach(function (o) {
        xs.forEach(function (t) {
          var x = t[0] + o, h = t[1], w = h * .34;
          el('path', { d: 'M' + x + ' 152l' + w + ' -' + h + ' ' + w + ' ' + h + 'z', fill: 'rgba(0,0,0,.42)' }, L3);
        });
      });
    })();

    // road
    el('rect', { y: 148, width: W, height: 52, fill: 'url(#hs-roadG)' }, scene);
    el('rect', { y: 148, width: W, height: 3, fill: 'rgba(255,255,255,.18)' }, scene);
    el('rect', { y: 186, width: W, height: 1.5, fill: 'rgba(255,255,255,.07)' }, scene);
    var D = el('g', {}, scene);   // lane dashes (period 56)
    for (var dx = 0; dx < W + 112; dx += 56) el('rect', { x: dx, y: 177, width: 30, height: 3, rx: 1, fill: '#B7FF3C' }, D);
    el('ellipse', { cx: 330, cy: 160, rx: 150, ry: 11, fill: 'url(#hs-pool)' }, scene);

    // poles with wire (period 440)
    var P = el('g', {}, scene);
    for (var t = 0; t < 3; t++) {
      var o = t * 440;
      el('path', { d: 'M' + o + ' 112Q' + (o + 110) + ' 134 ' + (o + 220) + ' 112Q' + (o + 330) + ' 134 ' + (o + 440) + ' 112', stroke: 'rgba(255,255,255,.14)', 'stroke-width': 1, fill: 'none' }, P);
      [0, 220].forEach(function (d) {
        var px = o + d;
        el('rect', { x: px - 1.5, y: 108, width: 3, height: 44, fill: '#0A0F1E' }, P);
        el('rect', { x: px - 9, y: 112, width: 18, height: 2.4, fill: '#0A0F1E' }, P);
      });
    }

    // ---- exit signs (width follows the text) ----
    var S = el('g', {}, scene);
    var signs = raw.map(function (a) {
      var value = String(a[1]), tone = TONES[HS.tone(value, a[2])];
      var s = { label: String(a[0]), value: value, lit: tone.lit, ink: tone.ink, n: null, c: null, compact: false };
      var g = el('g', { 'data-hs-sign': '' }, S);
      s.glowEl = el('rect', { x: -24, y: 68, width: 48, height: 60, rx: 6, fill: tone.glow, opacity: 0, filter: 'url(#hs-glow)' }, g);
      s.post = el('rect', { x: -1.5, y: 126, width: 3, height: 26, fill: '#A7B0C2' }, g);
      s.face = el('rect', { 'data-hs-face': '', x: -24, y: 68, width: 48, height: 60, rx: 6, fill: '#C7CEDD', stroke: '#111', 'stroke-width': 3 }, g);
      s.t1 = el('text', { 'data-hs-text': '', x: 0, y: 83, 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 800, fill: '#111', 'font-family': 'Overpass,Arial,sans-serif', 'letter-spacing': 1 }, g);
      s.t1.textContent = s.label;
      s.big = el('text', { 'data-hs-text': '', x: 0, y: 114, 'text-anchor': 'middle', 'font-size': 30, 'font-weight': 800, fill: '#111', 'font-family': 'Overpass,Arial,sans-serif' }, g);
      s.big.textContent = value;
      s.g = g;
      return s;
    });

    // ---- GrossMasters billboard (LED bulbs + neon-style logo) ----
    var forceLit = false;
    var bb = el('g', { 'data-hs-bb': '' }, S);
    var bbGlowRect = el('rect', { x: -150, y: 36, width: BW, height: 74, rx: 10, fill: '#B7FF3C', opacity: 0, filter: 'url(#hs-glow)' }, bb);
    el('rect', { x: -90, y: 108, width: 3, height: 44, fill: '#A7B0C2' }, bb);
    el('rect', { x: 87, y: 108, width: 3, height: 44, fill: '#A7B0C2' }, bb);
    var bbFace = el('rect', { 'data-hs-face': '', x: -150, y: 36, width: BW, height: 74, rx: 10, fill: '#0B1020', stroke: '#1E2742', 'stroke-width': 3 }, bb);
    var bbRim = el('rect', { x: -143, y: 43, width: 286, height: 60, rx: 6, fill: 'none', stroke: '#B7FF3C', 'stroke-width': 1, opacity: 0 }, bb);
    var LOGO = '/brand/logo-white.png';
    var bbGlowImg = el('image', { href: LOGO, x: -136, y: 52, width: 272, height: 40, preserveAspectRatio: 'xMidYMid meet', opacity: 0, filter: 'url(#hs-glow)' }, bb);
    var bbImg = el('image', { href: LOGO, x: -136, y: 52, width: 272, height: 40, preserveAspectRatio: 'xMidYMid meet', opacity: .28 }, bb);
    var bulbs = [];
    (function () {
      var pts = [], stepL = 13, w = BW, h = 74, x0 = -150, y0 = 36, x, y;
      for (x = x0 + 8; x < x0 + w - 4; x += stepL) pts.push([x, y0]);
      for (y = y0 + 8; y < y0 + h - 4; y += stepL) pts.push([x0 + w, y]);
      for (x = x0 + w - 8; x > x0 + 4; x -= stepL) pts.push([x, y0 + h]);
      for (y = y0 + h - 8; y > y0 + 4; y -= stepL) pts.push([x0, y]);
      pts.forEach(function (p) { bulbs.push(el('circle', { cx: p[0], cy: p[1], r: 2.1, fill: '#2A344D' }, bb)); });
    })();

    // ---- truck with beam, wheels and exhaust ----
    var beam = el('g', { 'class': 'hs-beam' }, scene);
    el('path', { d: 'M200 143L440 118V168L200 148z', fill: 'url(#hs-beam)' }, beam);
    var rig = el('g', { 'class': 'hs-rig' }, scene);
    var tr = el('g', { transform: 'translate(76,110) scale(1.1)' }, rig);
    el('rect', { x: 2, y: 4, width: 78, height: 30, rx: 2, fill: '#EEF1F7', stroke: '#A7B0C2' }, tr);
    el('path', { d: 'M16 6v26M30 6v26M44 6v26M58 6v26M72 6v26', stroke: '#D3D9E6', 'stroke-width': .8 }, tr);
    var plate = el('text', { x: 41, y: 24, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono,monospace', 'font-size': 9, fill: '#1B2338' }, tr);
    plate.textContent = 'DS-1001';
    el('rect', { x: 0, y: 26, width: 3, height: 4, rx: 1, fill: '#FF5A4E' }, tr);
    el('path', { d: 'M82 12h18l12 11v11H82z', fill: '#1B2338' }, tr);
    el('path', { d: 'M100 15h-12v8h21z', fill: '#BFD2F2' }, tr);
    el('path', { d: 'M100 15h-6l-3 8h6z', fill: '#FFF6D0', opacity: .55 }, tr);
    el('rect', { x: 80, y: 30, width: 34, height: 5, fill: '#151C2F' }, tr);
    el('rect', { x: 83, y: 2, width: 3, height: 12, rx: 1, fill: '#2A344D' }, tr);
    el('circle', { cx: 111, cy: 29, r: 2.6, fill: '#FFF3B0' }, tr);
    [18, 34, 92, 106].forEach(function (cx) {
      var wg = el('g', { 'class': 'hs-wheel' }, tr);
      el('circle', { cx: cx, cy: 38, r: 6, fill: '#111' }, wg);
      el('circle', { cx: cx, cy: 38, r: 2.4, fill: '#A7B0C2' }, wg);
      el('path', { d: 'M' + (cx - 4.6) + ' 38h9.2M' + cx + ' 33.4v9.2', stroke: '#6B7690', 'stroke-width': 1 }, wg);
    });
    [0, 1.05, 2.1].forEach(function (dl) {
      var pf = el('circle', { 'class': 'hs-puff', cx: 168, cy: 110, r: 4, fill: '#9AA6C2' }, rig);
      if (dl) pf.style.animationDelay = dl + 's';
    });

    // ---- layout: sign widths follow the text; positions are left-edge based ----
    var cy = null, measured = true, stat = null;
    var off = 0, last = 0, visible = true, tab = !document.hidden, reduced = false, narrow = false;

    function mlen(t, fs) {
      var n = 0;
      try { n = t.getComputedTextLength(); } catch (_e) { ignore(_e); n = 0; }
      if (!(n > 0)) { try { n = t.getBBox().width; } catch (_e2) { ignore(_e2); n = 0; } }
      if (!(n > 0)) { measured = false; n = t.textContent.length * fs * .62; }
      return n;
    }
    function bw(t) { try { return t.getBBox().width; } catch (_e) { ignore(_e); return 0; } }
    function setFace(s, w) {
      var x = -w / 2;
      s.face.setAttribute('x', x); s.face.setAttribute('width', w);
      s.glowEl.setAttribute('x', x); s.glowEl.setAttribute('width', w);
    }
    // draws a sign in one of its two states (s.n normal, s.c compact): font sizes, face width, squeeze
    function applyState(s, st) {
      s.t1.setAttribute('font-size', st.lfs); s.big.setAttribute('font-size', st.vfs);
      s.t1.removeAttribute('textLength'); s.big.removeAttribute('textLength');
      s.t1.removeAttribute('lengthAdjust'); s.big.removeAttribute('lengthAdjust');
      setFace(s, st.w);
      if (st.sqL) { s.t1.setAttribute('textLength', st.w - 4); s.t1.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
      if (st.sqV) { s.big.setAttribute('textLength', st.w - 4); s.big.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    }
    function fit(s) {
      var r = HS.sizeSign(function (kind, fs) {
        var t = kind === 'label' ? s.t1 : s.big;
        t.setAttribute('font-size', fs); t.removeAttribute('textLength'); t.removeAttribute('lengthAdjust');
        return mlen(t, fs);
      });
      s.n = r.n; s.c = r.c;
    }
    // after layout: every text must sit inside its face (getBBox, svg units); otherwise shrink one more step.
    // Runs for the normal and for the compact state. Last resort: squeeze the glyphs (the check script counts it).
    function verifyOne(s, st) {
      for (var round = 0; round < 8; round++) {
        applyState(s, st);
        var room = st.w - 2, lo = !st.sqL && bw(s.t1) > room, vo = !st.sqV && bw(s.big) > room;
        if (!lo && !vo) return;
        if (vo && st.vfs > VMIN) st.vfs -= 2;
        else if (lo && st.lfs > LMIN) st.lfs -= 1;
        else if (vo) st.sqV = true;
        else st.sqL = true;
      }
      applyState(s, st);
    }
    // static frame: the first sign may be drawn compact (smallest text, narrowest face)
    function setCompact(s, on) {
      if (s.compact === on) return;
      s.compact = on;
      applyState(s, on ? s.c : s.n);
    }
    function baseScale() { return narrow ? K.NARROW_SCALE : 1; }
    function staticLayout() {
      stat = HS.staticFrame(signs.map(function (s) { return s.n.w; }), signs.map(function (s) { return s.c.w; }), narrow);
      svg.setAttribute('data-hs-static', stat.kind);
      svg.setAttribute('data-hs-board', String(stat.board));
    }
    function layout() {
      measured = true;
      signs.forEach(fit);
      signs.forEach(function (s) { verifyOne(s, s.c); verifyOne(s, s.n); s.compact = false; });
      cy = HS.cycle(signs.map(function (s) { return s.n.w; }));
      svg.setAttribute('data-hs-widths', signs.map(function (s) { return s.n.w; }).join(','));
      svg.setAttribute('data-hs-fonts', signs.map(function (s) { return s.n.vfs; }).join(','));
      staticLayout();
    }

    // ---- painting ----
    function paint(xs, bx, o2, scale) {
      signs.forEach(function (d, i) {
        var x = xs[i];
        if (x === null || x === undefined) { d.g.setAttribute('transform', 'translate(-2000,0)'); return; }
        var p = forceLit ? 1 : Math.max(0, Math.min(1, (430 - x) / 90)) * (1 - Math.max(0, Math.min(1, (130 - x) / 70)));
        d.g.setAttribute('transform', 'translate(' + x.toFixed(1) + ',0)');
        d.face.setAttribute('fill', mix('#C7CEDD', d.lit, p));
        d.big.setAttribute('fill', mix('#111111', d.ink, p));
        d.glowEl.setAttribute('opacity', (p * .55).toFixed(2));
      });
      // scale around the billboard's own centre (0,73) so it stays on the same road line
      bb.setAttribute('transform', 'translate(' + bx.toFixed(1) + ',73) scale(' + scale + ') translate(0,-73)');
      if (bx < -170 || bx > 1050) return;
      var u = forceLit ? 1 : Math.max(0, Math.min(1, (640 - bx) / 130));
      var k = u;
      if (u > 0 && u < 1) k = u * (hash(Math.floor(o2 / 5)) > .42 ? 1 : .3);              // neon warm-up flicker
      else if (u === 1 && !forceLit) k = hash(Math.floor(o2 / 40)) > .97 ? .82 : 1;       // rare steady-state buzz
      bbImg.setAttribute('opacity', (.28 + .72 * k).toFixed(2));
      bbGlowImg.setAttribute('opacity', (k * .85).toFixed(2));
      bbGlowRect.setAttribute('opacity', (k * .30).toFixed(2));
      bbRim.setAttribute('opacity', (k * .9).toFixed(2));
      bbFace.setAttribute('stroke', mix('#1E2742', '#B7FF3C', k));
      var ph = Math.floor(o2 / 7);
      bulbs.forEach(function (c, i) {
        var on = forceLit ? true : (k > .5 && ((i + ph) % 3 !== 0));
        c.setAttribute('fill', on ? '#FFF1B8' : (k > .2 ? '#4A5576' : '#2A344D'));
        c.setAttribute('opacity', on ? 1 : .8);
      });
    }
    function frame(o2) {
      L1.setAttribute('transform', 'translate(' + (-mod(o2 * .09, W)) + ',0)');
      L2.setAttribute('transform', 'translate(' + (-mod(o2 * .25, W)) + ',0)');
      L3.setAttribute('transform', 'translate(' + (-mod(o2 * .6, W)) + ',0)');
      P.setAttribute('transform', 'translate(' + (-mod(o2, 440)) + ',0)');
      D.setAttribute('transform', 'translate(' + (-mod(o2, 56)) + ',0)');
      if (reduced) {
        signs.forEach(function (s, i) { setCompact(s, i === 0 && stat.kind === 'compact'); });
        paint(stat.xs, stat.bx, o2, stat.board); return;
      }
      signs.forEach(function (s) { setCompact(s, false); });
      var p = HS.positions(cy, o2);
      paint(p.xs, p.bx, o2, baseScale());
    }

    // ---- loop: runs only while the hero is on screen, the tab is visible and motion is allowed ----
    var SPEED = 90;
    function cur() { return reduced ? (narrow ? 760 : 510) : off; }   // backdrop position (still frame when reduced)
    // a frame error must not repeat 60 times a second: stop the loop and leave the current frame on screen
    function halt() {
      halted = true;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      try { svg.classList.add('hs-paused'); } catch (_e) { ignore(_e); }
    }
    function sync() {
      if (dead || halted) return;
      var on = visible && tab && !reduced;
      svg.classList.toggle('hs-paused', !on);
      if (on) { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    function tick(ts) {
      raf = 0;
      if (dead || halted || !(visible && tab) || reduced) return;
      try {
        var dt = last ? Math.min(.05, (ts - last) / 1000) : 0; last = ts;
        off += SPEED * dt; frame(off); raf = requestAnimationFrame(tick);
      } catch (_e) { fail(_e); halt(); }
    }

    var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    function setReduced(v) {
      if (dead || halted) return;
      reduced = v; forceLit = v; if (!v) off = 0;
      try { frame(cur()); } catch (_e) { fail(_e); halt(); return; }
      sync();
    }
    if (mq) {
      var onMq = function (e) { setReduced(e.matches); };
      if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
    }
    // phones: crop the scene so the truck, signs and logo read at 390px wide
    var nq = window.matchMedia && window.matchMedia('(max-width: 560px)');
    function applyNarrow(v) {
      narrow = v;
      svg.setAttribute('viewBox', v ? '60 0 620 200' : '0 0 880 200');
    }
    if (nq) {
      var onNq = function (e) {
        if (dead || halted) return;
        try { applyNarrow(e.matches); staticLayout(); frame(cur()); } catch (_e) { fail(_e); halt(); }
      };
      if (nq.addEventListener) nq.addEventListener('change', onNq); else if (nq.addListener) nq.addListener(onNq);
      applyNarrow(nq.matches);
    }

    reduced = !!(mq && mq.matches); forceLit = reduced;
    layout();
    frame(cur());

    // fonts change the text widths: measure again once they are loaded
    function relayout() {
      if (dead || halted) return;
      try { layout(); frame(cur()); } catch (_e) { fail(_e); halt(); }
    }
    // web fonts load lazily: measure again when they are ready, when more arrive, and once the page is loaded
    if (document.fonts) {
      if (document.fonts.ready) document.fonts.ready.then(relayout);
      if (document.fonts.load) {
        try { document.fonts.load('800 30px Overpass', '0').then(relayout, function () { }); } catch (_e) { ignore(_e); }
      }
      if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', relayout);
    }
    window.addEventListener('load', relayout);

    var seen = false;
    var hero = svg.closest ? svg.closest('.hero') : null;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        if (dead) return;
        visible = es[es.length - 1].isIntersecting;
        if (visible && (!seen || !measured)) relayout();   // measure again on the first view (it may have been hidden or 0-wide)
        if (visible) seen = true;
        sync();
      }, { threshold: .05 }).observe(hero || svg);
    }
    document.addEventListener('visibilitychange', function () { tab = !document.hidden; sync(); });
    sync();
    // everything worked: now the static fallback can go
    fbs.forEach(function (f) { if (f.parentNode) f.parentNode.removeChild(f); });
    fbs = [];
    } catch (_e) {
      // setup failed: stop, drop the half-built scene, bring back the static fallback and the full view
      dead = true; fail(_e);
      try {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        if (root && root.parentNode) root.parentNode.removeChild(root);
        if (svg) svg.setAttribute('viewBox', '0 0 880 200');
        fbs.forEach(function (f) { f.style.display = ''; });
      } catch (_e2) { ignore(_e2); }
    }
  }

  if (typeof document !== 'undefined') run();
  if (typeof module === 'object' && module.exports) module.exports = HS_PURE;
})();

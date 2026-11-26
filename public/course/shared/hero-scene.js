/* Hero scene: night road, exit signs and the GrossMasters billboard.
   One shared component for every lesson. It finds `svg.scene[data-signs]`,
   builds the whole scene on top of the static fallback markup, and leaves the
   fallback visible if anything fails. Nothing is exposed globally. */
(function () {
  var root = null;
  try {
    var svg = document.querySelector('svg.scene[data-signs]');
    if (!svg) return;
    var raw = JSON.parse(svg.getAttribute('data-signs'));
    if (!raw || !raw.length) return;

    var NS = 'http://www.w3.org/2000/svg', W = 880;
    var GAP = 52, BGAP = 100, BW = 300, EMPTY = 636;      // dynamic rhythm
    var SGAP = 16, SBGAP = 24, MARGIN = 8;                 // tight static gaps
    var MINW = 48, MAXW = 96, PAD = 16;
    var TONES = {
      good: { lit: '#DCFBE7', ink: '#14683A', glow: '#4ADE80' },
      warn: { lit: '#FFF0B8', ink: '#8A5A00', glow: '#F2B705' },
      neutral: { lit: '#FFFBE6', ink: '#111111', glow: '#F6E7A6' }
    };

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
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

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
      var value = String(a[1]), tn = a[2];
      if (!TONES[tn]) tn = value.indexOf('✓') >= 0 ? 'good' : (/[!?]/.test(value) ? 'warn' : 'neutral');
      var tone = TONES[tn];
      var s = { label: String(a[0]), value: value, lit: tone.lit, ink: tone.ink, w: MINW, lfs: 9, vfs: 30 };
      var g = el('g', {}, S);
      s.glowEl = el('rect', { x: -24, y: 68, width: 48, height: 60, rx: 6, fill: tone.glow, opacity: 0, filter: 'url(#hs-glow)' }, g);
      s.post = el('rect', { x: -1.5, y: 126, width: 3, height: 26, fill: '#A7B0C2' }, g);
      s.face = el('rect', { x: -24, y: 68, width: 48, height: 60, rx: 6, fill: '#C7CEDD', stroke: '#111', 'stroke-width': 3 }, g);
      s.t1 = el('text', { x: 0, y: 83, 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 800, fill: '#111', 'font-family': 'Overpass,Arial,sans-serif', 'letter-spacing': 1 }, g);
      s.t1.textContent = s.label;
      s.big = el('text', { x: 0, y: 114, 'text-anchor': 'middle', 'font-size': 30, 'font-weight': 800, fill: '#111', 'font-family': 'Overpass,Arial,sans-serif' }, g);
      s.big.textContent = value;
      s.g = g;
      return s;
    });

    // ---- GrossMasters billboard (LED bulbs + neon-style logo) ----
    var forceLit = false, bbScale = 1;
    var bb = el('g', {}, S);
    var bbGlowRect = el('rect', { x: -150, y: 36, width: BW, height: 74, rx: 10, fill: '#B7FF3C', opacity: 0, filter: 'url(#hs-glow)' }, bb);
    el('rect', { x: -90, y: 108, width: 3, height: 44, fill: '#A7B0C2' }, bb);
    el('rect', { x: 87, y: 108, width: 3, height: 44, fill: '#A7B0C2' }, bb);
    var bbFace = el('rect', { x: -150, y: 36, width: BW, height: 74, rx: 10, fill: '#0B1020', stroke: '#1E2742', 'stroke-width': 3 }, bb);
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
    var centers = [], bbCenter = 0, CYC = 1300;
    var measured = true, stat = { xs: [], bx: 0, kind: 'fit' };
    var off = 0, last = 0, raf = 0, visible = true, tab = !document.hidden, reduced = false, narrow = false;

    function mlen(t, fs) {
      var n = 0;
      try { n = t.getComputedTextLength(); } catch (e) { n = 0; }
      if (!(n > 0)) { try { n = t.getBBox().width; } catch (e2) { n = 0; } }
      if (!(n > 0)) { measured = false; n = t.textContent.length * fs * .62; }
      return n;
    }
    function fit(s) {
      var lfs = 9, vfs = 30, lw, vw;
      s.t1.setAttribute('font-size', lfs);
      s.big.setAttribute('font-size', vfs);
      lw = mlen(s.t1, lfs);
      while (lw + PAD > MAXW && lfs > 7) { lfs -= 1; s.t1.setAttribute('font-size', lfs); lw = mlen(s.t1, lfs); }
      vw = mlen(s.big, vfs);
      while (vw + PAD > MAXW && vfs > 20) { vfs -= 2; s.big.setAttribute('font-size', vfs); vw = mlen(s.big, vfs); }
      s.lfs = lfs; s.vfs = vfs;
      s.w = Math.round(clamp(Math.max(lw, vw) + PAD, MINW, MAXW) * 10) / 10;
      var x = -s.w / 2;
      s.face.setAttribute('x', x); s.face.setAttribute('width', s.w);
      s.glowEl.setAttribute('x', x); s.glowEl.setAttribute('width', s.w);
    }

    // places signs from `from` and the board by edge gaps, starting at 0; returns the layout
    function arrange(from, gap, bgap) {
      var l = 0, xs = [], n = signs.length, i, lastRight = 0;
      for (i = from; i < n; i++) { xs[i] = l + signs[i].w / 2; lastRight = l + signs[i].w; l += signs[i].w + gap; }
      var half = BW / 2 * bbScale;                       // gap is measured to the board's visible (scaled) edge
      var bx = lastRight + bgap + half;
      return { xs: xs, bx: bx, left: xs[from] - signs[from].w / 2, right: bx + half };
    }
    // reduced motion: compute a still frame with every sign and the board inside the view
    function staticLayout() {
      var vx0 = narrow ? 60 : 0, vx1 = narrow ? 680 : 880, room = vx1 - vx0 - 2 * MARGIN;
      var kind = 'fit', a = arrange(0, GAP, BGAP);
      if (a.right - a.left > room) {
        kind = 'tight'; a = arrange(0, SGAP, SBGAP);
        if (a.right - a.left > room) { kind = 'drop-first'; a = arrange(Math.min(1, signs.length - 1), SGAP, SBGAP); }
      }
      var shift = kind === 'drop-first' ? (vx1 - MARGIN - a.right) : (vx0 + MARGIN + (room - (a.right - a.left)) / 2 - a.left);
      var xs = [];
      for (var k = 0; k < signs.length; k++) xs[k] = (a.xs[k] === undefined) ? null : a.xs[k] + shift;
      stat = { xs: xs, bx: a.bx + shift, kind: kind };
      svg.setAttribute('data-hs-static', kind);
    }
    function layout() {
      measured = true;
      signs.forEach(fit);
      var l = 0, lastRight = 0;
      signs.forEach(function (s, i) { centers[i] = l + s.w / 2; lastRight = l + s.w; l += s.w + GAP; });
      bbCenter = lastRight + BGAP + BW / 2;
      CYC = Math.round(bbCenter + BW / 2 + signs[0].w / 2 + EMPTY);
      svg.setAttribute('data-hs-widths', signs.map(function (s) { return s.w; }).join(','));
      svg.setAttribute('data-hs-fonts', signs.map(function (s) { return s.vfs; }).join(','));
      staticLayout();
    }

    // ---- painting ----
    function paint(xs, bx, o2) {
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
      bb.setAttribute('transform', 'translate(' + bx.toFixed(1) + ',73) scale(' + bbScale + ') translate(0,-73)');
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
      if (reduced) { paint(stat.xs, stat.bx, o2); return; }
      paint(centers.map(function (c) { return mod(c + 900 - o2, CYC) - 160; }), mod(bbCenter + 900 - o2, CYC) - 160, o2);
    }

    // ---- loop: runs only while the hero is on screen, the tab is visible and motion is allowed ----
    var SPEED = 90;
    function cur() { return reduced ? (narrow ? 760 : 510) : off; }   // backdrop position (still frame when reduced)
    function sync() {
      var on = visible && tab && !reduced;
      svg.classList.toggle('hs-paused', !on);
      if (on) { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    function tick(ts) {
      raf = 0; if (!(visible && tab) || reduced) return;
      var dt = last ? Math.min(.05, (ts - last) / 1000) : 0; last = ts;
      off += SPEED * dt; frame(off); raf = requestAnimationFrame(tick);
    }

    var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    function setReduced(v) { reduced = v; forceLit = v; if (!v) off = 0; frame(cur()); sync(); }
    if (mq) {
      var onMq = function (e) { setReduced(e.matches); };
      if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
    }
    // phones: crop the scene so the truck, signs and logo read at 390px wide
    var nq = window.matchMedia && window.matchMedia('(max-width: 560px)');
    function applyNarrow(v) {
      narrow = v; bbScale = v ? 1.25 : 1;
      svg.setAttribute('viewBox', v ? '60 0 620 200' : '0 0 880 200');
    }
    if (nq) {
      var onNq = function (e) { applyNarrow(e.matches); staticLayout(); frame(cur()); };
      if (nq.addEventListener) nq.addEventListener('change', onNq); else if (nq.addListener) nq.addListener(onNq);
      applyNarrow(nq.matches);
    }

    reduced = !!(mq && mq.matches); forceLit = reduced;
    layout();
    frame(cur());
    // the scene is ready: drop the static fallback
    var fb = svg.querySelectorAll('[data-hs-fallback]');
    for (var f = 0; f < fb.length; f++) fb[f].parentNode.removeChild(fb[f]);

    // fonts change the text widths: measure again once they are loaded
    function relayout() { try { layout(); frame(cur()); } catch (e) { } }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

    var hero = svg.closest ? svg.closest('.hero') : null;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[es.length - 1].isIntersecting;
        if (visible && !measured) relayout();   // first layout ran while hidden: widths were estimated
        sync();
      }, { threshold: .05 }).observe(hero || svg);
    }
    document.addEventListener('visibilitychange', function () { tab = !document.hidden; sync(); });
    sync();
  } catch (e) {
    try { if (root && root.parentNode) root.parentNode.removeChild(root); } catch (e2) { }
  }
})();

// Homepage hero backdrop: an optimizer descending a 3D objective landscape.
// Plain 2D canvas with a hand-rolled projection (no WebGL, no deps).
// Colours come from --land-* CSS custom properties (styles.css), so the
// surface follows the site theme. Pauses when offscreen; renders one static
// frame under prefers-reduced-motion.
//
// The same f() drives the site-wide contour motif: if you change it, update
// tools/make_contours.R and regenerate assets/landscape-contours.svg.
(function () {
  var canvas = document.getElementById('opt-landscape');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  // ── Objective: broad global basin, a shallow local trap, one ridge ──
  function g(x, y, cx, cy, s) {
    var dx = x - cx, dy = y - cy;
    return Math.exp(-(dx * dx + dy * dy) / s);
  }
  function f(x, y) {
    return 0.62
      - 0.52 * g(x, y, 0.32, -0.22, 0.30)
      - 0.20 * g(x, y, -0.48, 0.42, 0.05)
      + 0.22 * g(x, y, -0.20, -0.45, 0.06)
      + 0.16 * (1 - Math.exp(-(x * x + y * y) / 2))   // bowl that flattens far out
      + 0.025 * Math.sin(4 * x + 1) * Math.cos(3 * y);
  }
  function grad(x, y) {
    var h = 1e-4;
    return [(f(x + h, y) - f(x - h, y)) / (2 * h), (f(x, y + h) - f(x, y - h)) / (2 * h)];
  }

  // ── Mesh ──
  // A disc of radius R (not a square) that fades out towards its rim, so the
  // rotating surface has no visible outline. The interesting part is |x|,|y| < 1.
  var R = 2, FADE_IN = 1.25, N = 60, ZS = 0.75;
  var vx = [], vy = [], vz = [];
  var zmin = Infinity, zmax = -Infinity;
  for (var j = 0; j <= N; j++) {
    for (var i = 0; i <= N; i++) {
      var x = -R + 2 * R * i / N, y = -R + 2 * R * j / N, z = f(x, y);
      vx.push(x); vy.push(y); vz.push(z);
      if (Math.hypot(x, y) <= R) {
        if (z < zmin) zmin = z;
        if (z > zmax) zmax = z;
      }
    }
  }
  var quads = [];
  for (j = 0; j < N; j++) {
    for (i = 0; i < N; i++) {
      var a = j * (N + 1) + i;
      var rc = Math.hypot(-R + 2 * R * (i + 0.5) / N, -R + 2 * R * (j + 0.5) / N);
      if (rc > R) continue;
      var t = Math.max(0, Math.min(1, (R - rc) / (R - FADE_IN)));
      quads.push({ v: [a, a + 1, a + N + 2, a + N + 1], d: 0, fill: '', iso: [], edge: t * t * (3 - 2 * t) });
    }
  }

  // ── Altitude lines: marching squares per quad, precomputed once ──
  // Each crossing is stored as (vertex a, vertex b, t) so drawing only needs a
  // lerp between already-projected vertices.
  var LEVELS = 14;
  for (var q0 = 0; q0 < quads.length; q0++) {
    var qv0 = quads[q0].v;
    for (var l = 1; l < LEVELS; l++) {
      var lev = zmin + (zmax - zmin) * l / LEVELS, hits = [];
      for (var e = 0; e < 4; e++) {
        var ea = qv0[e], eb = qv0[(e + 1) % 4], za = vz[ea] - lev, zb = vz[eb] - lev;
        if ((za < 0) !== (zb < 0)) hits.push(ea, eb, za / (za - zb));
      }
      if (hits.length >= 6) quads[q0].iso.push(hits.slice(0, 6));
      if (hits.length === 12) quads[q0].iso.push(hits.slice(6, 12));
    }
  }

  // ── Theme (read from CSS custom properties) ──
  var theme = {};
  var probe = document.createElement('canvas').getContext('2d');
  function rgb(css) {
    // Let the canvas normalise any CSS colour to #rrggbb / rgba(...).
    probe.fillStyle = '#000'; probe.fillStyle = css;
    var s = probe.fillStyle;
    if (s[0] === '#') return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
    var m = s.match(/[\d.]+/g);
    return [+m[0], +m[1], +m[2]];
  }
  function lerpStops(stops, t) {
    t = Math.max(0, Math.min(1, t)) * (stops.length - 1);
    var k = Math.min(stops.length - 2, Math.floor(t)), u = t - k, p = stops[k], q = stops[k + 1];
    return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
  }
  function applyTheme() {
    var cs = getComputedStyle(canvas);
    function v(name) { return cs.getPropertyValue(name).trim(); }
    theme = {
      stops: [rgb(v('--land-low')), rgb(v('--land-mid')), rgb(v('--land-upper')), rgb(v('--land-high'))],
      line: v('--land-grid'), iso: v('--land-isoline'), trail: v('--land-trail'), ring: v('--land-ring'),
      alpha: isNaN(parseFloat(v('--land-alpha'))) ? 1 : parseFloat(v('--land-alpha'))
    };
    // Light is fixed in world space, so per-quad shading can be precomputed.
    var L = [-0.45, -0.55, 0.70], ll = Math.hypot(L[0], L[1], L[2]);
    for (var q = 0; q < quads.length; q++) {
      var qv = quads[q].v;
      var zc = (vz[qv[0]] + vz[qv[1]] + vz[qv[2]] + vz[qv[3]]) / 4;
      var dzx = ((vz[qv[1]] + vz[qv[2]]) - (vz[qv[0]] + vz[qv[3]])) / 2 * ZS / (2 / N);
      var dzy = ((vz[qv[2]] + vz[qv[3]]) - (vz[qv[0]] + vz[qv[1]])) / 2 * ZS / (2 / N);
      var nl = Math.hypot(dzx, dzy, 1);
      var lam = (-dzx * L[0] - dzy * L[1] + L[2]) / (nl * ll);
      var shade = 0.62 + 0.45 * Math.max(0, lam);
      var c = lerpStops(theme.stops, (zc - zmin) / (zmax - zmin));
      quads[q].fill = 'rgba(' + Math.min(255, c[0] * shade | 0) + ',' +
        Math.min(255, c[1] * shade | 0) + ',' + Math.min(255, c[2] * shade | 0) + ',' + theme.alpha + ')';
    }
  }

  // ── Camera / layout ──
  var W = 0, H = 0, S = 1, CX = 0, CY = 0, wide = true;
  var yaw = 0.7, ELEV = 0.62, ce = Math.cos(ELEV), se = Math.sin(ELEV);
  var cy_, sy_;
  var px = new Float32Array(vx.length), py = new Float32Array(vx.length), pd = new Float32Array(vx.length);
  function project(x, y, z, out) {
    var xr = x * cy_ - y * sy_;
    var yr = x * sy_ + y * cy_;
    var zz = (z - zmin) * ZS - 0.3;
    var depth = yr * ce - zz * se;
    var k = 3.2 / (3.2 + depth);
    out[0] = CX + S * xr * k;
    out[1] = CY - S * (zz * ce + yr * se) * k;
    out[2] = depth;
    return out;
  }
  function resize() {
    var r = canvas.getBoundingClientRect();
    if (!r.width) return;
    var dpr = Math.min(1.5, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    wide = W >= 992;
    if (wide) {
      // Surface sits right of the text column and spills off the right edge.
      S = Math.min(W * 0.22, H * 0.60);
      CX = W * 0.76; CY = H * 0.50;
    } else {
      // Stacked layout: low behind the text, faded at the top.
      S = Math.min(W * 0.42, H * 0.36);
      CX = W * 0.5; CY = H * 0.78;
    }
  }

  // ── Optimizer (heavy-ball gradient descent) ──
  // High momentum + small step makes the ball overshoot and swing across the
  // valley; a small, decaying random kick adds early wandering (SAEM-like).
  var MOM = 0.96, LR = 0.004, NOISE = 0.004, NOISE_DECAY = 250;
  var GLOBAL_OK = 0.25;   // global min f ≈ 0.128, local trap f ≈ 0.427
  var pos, vel, trail, iter, hold, fade, rand;
  // Seeded PRNG (mulberry32) so a run can be pre-simulated and then replayed.
  function prng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function converged(gnorm) {
    return iter > 30 && gnorm < 2e-3 && Math.hypot(vel[0], vel[1]) < 5e-4;
  }
  function reset(start, seed) {
    pos = start.slice(); vel = [0, 0]; trail = [pos.slice()];
    iter = 0; hold = 0; fade = 1; rand = prng(seed);
  }
  function restart() {
    // Only show runs that reach the global basin: dry-run each candidate start
    // off-screen and reject any that settle in the local trap.
    for (var attempt = 0; attempt < 25; attempt++) {
      var ang = Math.random() * Math.PI * 2, r = 0.78 + Math.random() * 0.12;
      var start = [r * Math.cos(ang), r * Math.sin(ang)];
      var seed = (Math.random() * 4294967296) >>> 0;
      reset(start, seed);
      var gn;
      do { gn = step(true); } while (!converged(gn) && iter <= 1500);
      if (f(pos[0], pos[1]) < GLOBAL_OK) break;
    }
    reset(start, seed);
  }
  function step(dry) {
    var gr = grad(pos[0], pos[1]);
    var nz = NOISE * Math.exp(-iter / NOISE_DECAY);
    vel[0] = MOM * vel[0] - LR * gr[0] + nz * (rand() - 0.5);
    vel[1] = MOM * vel[1] - LR * gr[1] + nz * (rand() - 0.5);
    pos[0] += vel[0]; pos[1] += vel[1];
    var pr = Math.hypot(pos[0], pos[1]);
    if (pr > 1.2) { pos[0] *= 1.2 / pr; pos[1] *= 1.2 / pr; }
    iter++;
    if (!dry && iter % 3 === 0) trail.push(pos.slice());
    return Math.hypot(gr[0], gr[1]);
  }

  // ── Render ──
  var tmp = [0, 0, 0], bp = [0, 0, 0];
  function fadeEdges() {
    // Multiply canvas alpha by soft gradients so the surface melts into the page.
    function mask(x0, y0, x1, y1, stops) {
      var gr = ctx.createLinearGradient(x0, y0, x1, y1);
      for (var k = 0; k < stops.length; k += 2) gr.addColorStop(stops[k], 'rgba(0,0,0,' + stops[k + 1] + ')');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'destination-in';
    if (wide) {
      // Clear over the text column, soft at the right edge of the hero.
      mask(0, 0, W, 0, [0.54, 0, 0.70, 1, 0.93, 1, 1, 0]);
      mask(0, 0, 0, H, [0.80, 1, 1, 0]);
    } else {
      mask(0, 0, W, 0, [0, 0, 0.15, 1, 0.85, 1, 1, 0]);
      mask(0, 0, 0, H, [0.48, 0, 0.70, 1, 0.88, 1, 1, 0]);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function draw() {
    var dpr = canvas.width / W;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    cy_ = Math.cos(yaw); sy_ = Math.sin(yaw);
    for (var n = 0; n < vx.length; n++) {
      project(vx[n], vy[n], vz[n], tmp);
      px[n] = tmp[0]; py[n] = tmp[1]; pd[n] = tmp[2];
    }

    // Painter's algorithm: quads, trail segments and the ball share one depth sort.
    var items = [];
    for (var q = 0; q < quads.length; q++) {
      var qv = quads[q].v;
      quads[q].d = (pd[qv[0]] + pd[qv[1]] + pd[qv[2]] + pd[qv[3]]) / 4;
      items.push(quads[q]);
    }
    var lift = 0.012;
    for (n = 1; n < trail.length; n++) {
      var p0 = project(trail[n - 1][0], trail[n - 1][1], f(trail[n - 1][0], trail[n - 1][1]) + lift, [0, 0, 0]);
      var p1 = project(trail[n][0], trail[n][1], f(trail[n][0], trail[n][1]) + lift, [0, 0, 0]);
      items.push({ seg: [p0, p1], d: Math.min(p0[2], p1[2]) - 0.02 });
    }
    project(pos[0], pos[1], f(pos[0], pos[1]) + 0.03, bp);
    items.push({ ball: true, d: bp[2] - 0.04 });
    items.sort(function (a, b) { return b.d - a.d; });

    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (n = 0; n < items.length; n++) {
      var it = items[n];
      if (it.v) {
        if (it.edge <= 0) continue;
        qv = it.v;
        ctx.globalAlpha = it.edge;
        ctx.beginPath();
        ctx.moveTo(px[qv[0]], py[qv[0]]); ctx.lineTo(px[qv[1]], py[qv[1]]);
        ctx.lineTo(px[qv[2]], py[qv[2]]); ctx.lineTo(px[qv[3]], py[qv[3]]);
        ctx.closePath();
        if (theme.alpha > 0) { ctx.fillStyle = it.fill; ctx.fill(); }
        ctx.lineWidth = 0.6; ctx.strokeStyle = theme.line; ctx.stroke();
        if (it.iso.length) {
          ctx.beginPath();
          for (var k = 0; k < it.iso.length; k++) {
            var h = it.iso[k];
            ctx.moveTo(px[h[0]] + (px[h[1]] - px[h[0]]) * h[2], py[h[0]] + (py[h[1]] - py[h[0]]) * h[2]);
            ctx.lineTo(px[h[3]] + (px[h[4]] - px[h[3]]) * h[5], py[h[3]] + (py[h[4]] - py[h[3]]) * h[5]);
          }
          ctx.lineWidth = 1; ctx.strokeStyle = theme.iso; ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (it.seg) {
        ctx.globalAlpha = fade;
        ctx.strokeStyle = theme.trail; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(it.seg[0][0], it.seg[0][1]); ctx.lineTo(it.seg[1][0], it.seg[1][1]); ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = fade;
        ctx.beginPath(); ctx.arc(bp[0], bp[1], 6, 0, Math.PI * 2);
        ctx.fillStyle = theme.trail; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = theme.ring; ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    fadeEdges();
  }

  // ── Loop ──
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var visible = true, raf = 0, gnorm = 1;

  function frame() {
    raf = 0;
    yaw += 0.0015;
    if (hold > 0) {
      hold++;
      if (hold > 70) fade = Math.max(0, fade - 0.04);
      if (fade === 0) restart();
    } else {
      gnorm = step();
      if (converged(gnorm) || iter > 1500) hold = 1;
    }
    draw();
    schedule();
  }
  function schedule() {
    if (!raf && visible && !reduce) raf = requestAnimationFrame(frame);
  }

  applyTheme();
  resize();
  restart();
  if (reduce) {
    // Static frame: run one descent to convergence and show the full path.
    do { gnorm = step(); }
    while (!converged(gnorm) && iter <= 1500);
    iter -= iter % 3;
  }
  draw();
  schedule();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      schedule();
    }).observe(canvas);
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(function () { resize(); draw(); }).observe(canvas);
  }
  new MutationObserver(function () { applyTheme(); draw(); })
    .observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();

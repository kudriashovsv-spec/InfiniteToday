// ============================================================================
// Audio DNA — живой космический энергетический организм поверх сцены песни.
//
// Прототип: Поиск / Psychedelic Electronic.
// Слой прозрачный, живёт ПОД интерфейсом (z-index:1, pointer-events:none).
// Композиционный центр — центр сцены; safe-zone ограничивает размер и даёт
// небольшое вертикальное смещение, но не уводит объект в угол.
//
// Все художественные коэффициенты — в одном месте: CONFIG.
// ============================================================================
(function () {
  "use strict";

  var REGISTRY = {
    "assets/music/All music/Поиск Psychedelic Electronic.mp3": "poisk-psychedelic-electronic"
  };

  var TAU = Math.PI * 2;

  // ------------------------------------------------------ художественные настройки
  var CONFIG = {
    coreScale: 0.30,       // радиус ядра как доля baseR
    corePulse: 0.08,       // глубина пульсации ядра от bass (мягко)
    coreBrightness: 0.68,  // общая яркость ядра
    orbitCount: 3,         // базовое число орбит (ограничивается tier)
    orbitOpacity: 0.5,     // прозрачность орбит
    cometCount: 1.4,       // множитель числа комет относительно tier
    cometSize: 1.3,        // базовый размер комет
    cometSpeed: 1.0,       // базовая скорость комет
    cometTail: 1.25,       // длина хвоста
    filamentCount: 0.5,    // множитель числа филаментов относительно tier
    filamentOpacity: 0.5,  // прозрачность филаментов
    filamentSpeed: 1.0,    // скорость течения филаментов
    bloomStrength: 0.8,    // сила локального bloom
    beatResponse: 0.7      // амплитуда отклика на удар (без строба)
  };

  var TIERS = [
    { name: "low",    dust: 16, comets: 8,  filaments: 8,  orbitMax: 2, bloom: false, trailTau: 0.07, sampleN: 44, dpr: 1.25 },
    { name: "medium", dust: 28, comets: 12, filaments: 12, orbitMax: 3, bloom: true,  trailTau: 0.10, sampleN: 60, dpr: 1.6 },
    { name: "high",   dust: 42, comets: 20, filaments: 16, orbitMax: 4, bloom: true,  trailTau: 0.13, sampleN: 76, dpr: 2.0 }
  ];
  var MAX_DUST = TIERS[2].dust;
  var MAX_COMETS = 36;
  var MAX_FILAMENTS = TIERS[2].filaments;
  var MAX_RINGS = 6;
  var REACH = 1.28; // максимальный вылет структуры (в единицах baseR)

  var PALETTE = {
    core: [170, 130, 245],
    shell: [110, 155, 255],
    accent: [220, 140, 235],
    warm: [255, 150, 95],
    spark: [240, 243, 255]
  };

  // ------------------------------------------------------------------ utils
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rgba(c, a) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ")";
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function distToRect(px, py, r) {
    var dx = Math.max(r.l - px, 0, px - r.r);
    var dy = Math.max(r.t - py, 0, py - r.b);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function makeEngine(canvas, audio) {
    var ctx = canvas.getContext("2d", { alpha: true });
    var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var isMobile = (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) ||
      Math.min(window.innerWidth, window.innerHeight) < 520;

    // --- Web Audio (лениво, один раз) ---
    var actx = null, analyser = null, source = null, freq = null, time = null, spec = null, prevSpec = null;
    var degraded = false;

    // --- огибающие ---
    var env = { sub: 0, bass: 0, lowMid: 0, mid: 0, high: 0, treble: 0, energy: 0, wave: 0 };
    var beat = 0; // плавный импульс удара (compression → expansion → relax)

    // --- onset ---
    var fluxMean = 0.012, fluxDev = 0.012, lastOnset = -1, onsetCount = 0, kickCount = 0;

    // --- время/фазы (разные временные масштабы) ---
    var t = 0, corePhase = 0, orbitPhase = 0, filPhase = 0, cometPhase = 0, lastNow = 0;

    // --- layout ---
    var cssW = 1, cssH = 1, dpr = 2;
    var layout = { cx: 300, cy: 200, baseR: 120, reach: 150, ok: true };
    var layoutDirty = true, frameCount = 0;

    // --- bloom ---
    var glow = document.createElement("canvas");
    var gctx = glow.getContext("2d");
    var GLOW_DIV = 4;

    // --- adaptive quality ---
    var maxTier = reduced ? 0 : (isMobile ? 1 : 2);
    var tier = reduced ? 0 : (isMobile ? 0 : 2);
    var ftSamples = [], ftIdx = 0, lastTierChange = 0, lastFpsCheck = 0, fps = 60;

    // --- пулы (фиксированные, без мусора в кадре) ---
    var rnd = mulberry32(0x51ED270B);
    var dust = new Array(MAX_DUST);
    var comets = new Array(MAX_COMETS);
    var filaments = new Array(MAX_FILAMENTS);
    var rings = new Array(MAX_RINGS);
    var k;

    for (k = 0; k < MAX_DUST; k++) {
      var da = rnd() * TAU, dr = 0.30 + Math.pow(rnd(), 0.9) * 1.0;
      dust[k] = {
        a: da, r: dr, z: rnd() * 2 - 1,
        va: (0.10 + 0.22 / dr) * (0.6 + 0.8 * rnd()),
        vr: (rnd() - 0.5) * 0.05,
        size: 0.5 + rnd() * 0.9, ph: rnd() * TAU, tw: 0.4 + rnd() * 1.1
      };
    }
    for (k = 0; k < MAX_COMETS; k++) {
      var ca = rnd() * TAU, cr = 0.45 + Math.pow(rnd(), 0.8) * 0.75;
      comets[k] = {
        a: ca, r: cr, z: rnd() * 2 - 1,
        va: (0.30 + 0.55 / cr) * (0.75 + 0.5 * rnd()),
        vr: (rnd() - 0.5) * 0.09,
        size: 1.3 + rnd() * 2.0, ph: rnd() * TAU, sp: 0.7 + rnd() * 0.8
      };
    }
    for (k = 0; k < MAX_FILAMENTS; k++) {
      filaments[k] = {
        scale: 0.55 + rnd() * 0.62, tilt: rnd() * Math.PI, phase: rnd() * TAU,
        m: 2 + Math.floor(rnd() * 4), amp: 0.05 + rnd() * 0.09,
        depth: rnd(), speed: 0.6 + rnd() * 0.9, flat: 0.35 + rnd() * 0.5
      };
    }
    for (k = 0; k < MAX_RINGS; k++) rings[k] = { alive: false, r: 0, sp: 0, life: 0, max: 1, w: 1, warm: 0 };

    function activeDust() { return TIERS[tier].dust; }
    function activeComets() { return reduced ? 0 : Math.min(MAX_COMETS, Math.round(TIERS[tier].comets * CONFIG.cometCount)); }
    function activeFilaments() { return reduced ? Math.min(6, TIERS[tier].filaments) : Math.round(TIERS[tier].filaments * CONFIG.filamentCount); }
    function activeOrbits() { return Math.min(CONFIG.orbitCount, TIERS[tier].orbitMax); }

    // ---------------------------------------------------------------- layout
    function buildLayout() {
      var rect = canvas.getBoundingClientRect();
      cssW = Math.max(1, rect.width); cssH = Math.max(1, rect.height);
      if (cssW < 2 || cssH < 2) { layout.ok = false; return; }
      var screen = canvas.closest(".screen");
      var ox = rect.left, oy = rect.top;

      // центр сцены — главный композиционный anchor
      var scene = screen && screen.querySelector(".scene");
      var baseCx = cssW / 2, baseCy = cssH / 2;
      if (scene) {
        var sr = scene.getBoundingClientRect();
        if (sr.width > 2 && sr.height > 2) { baseCx = sr.left + sr.width / 2 - ox; baseCy = sr.top + sr.height / 2 - oy; }
      }

      var m = clamp(Math.min(cssW, cssH) * 0.03, 8, 36);
      function rectOf(sel) {
        var el = screen && screen.querySelector(sel); if (!el) return null;
        var st = getComputedStyle(el);
        if (st.display === "none" || st.visibility === "hidden") return null;
        var r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return null;
        return { l: r.left - ox, t: r.top - oy, r: r.right - ox, b: r.bottom - oy };
      }
      var title = rectOf(".song-title");
      var others = [rectOf(".song-panel"), rectOf(".back"), rectOf(".lyrics-panel.is-open")].filter(Boolean);
      var allow = Math.min(cssW, cssH) * 0.10; // лёгкий заход за плеер допустим (DNA позади)

      // перебираем небольшое вертикальное смещение вокруг центра сцены и
      // выбираем положение, дающее максимальный свободный радиус
      var offsets = reduced ? [0, 0.05] : [0, 0.05, -0.05, 0.10, -0.10, 0.16];
      var best = null;
      for (var oi = 0; oi < offsets.length; oi++) {
        var cy = clamp(baseCy + offsets[oi] * cssH, m, cssH - m);
        var cx = clamp(baseCx, m, cssW - m);
        var vp = Math.min(cx - m, cssW - cx - m, cy - m, cssH - cy - m);
        var ob = Infinity;
        if (title) ob = Math.min(ob, distToRect(cx, cy, title) - m * 0.25); // заголовок — святое
        for (var j = 0; j < others.length; j++) ob = Math.min(ob, distToRect(cx, cy, others[j]) - m * 0.25 + allow);
        var reach = Math.min(vp * 0.98, ob);
        var score = reach * (1 - 0.30 * Math.abs(offsets[oi])); // центр сцены в приоритете
        if (!best || score > best.score) best = { cx: cx, cy: cy, reach: reach, score: score };
      }

      var floorReach = Math.min(cssW, cssH) * 0.28; // не даём стать микроскопической
      layout.reach = Math.max(best.reach, Math.min(floorReach, Math.min(cssW, cssH) * 0.5));
      layout.baseR = clamp(layout.reach / REACH, 0, Math.min(cssW, cssH) * 0.5);
      layout.cx = best.cx; layout.cy = best.cy;
      layout.ok = layout.baseR >= 26;

      dpr = Math.min(window.devicePixelRatio || 1, reduced ? 1 : TIERS[tier].dpr);
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      glow.width = Math.max(1, Math.round(cssW / GLOW_DIV));
      glow.height = Math.max(1, Math.round(cssH / GLOW_DIV));
      layoutDirty = false;
    }

    // --------------------------------------------------------------- WebAudio
    function ensureGraph() {
      var proto = location.protocol;
      if (proto !== "http:" && proto !== "https:") { degraded = true; return; }
      if (source || degraded) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { degraded = true; return; }
      var c = null;
      try { c = new AC(); source = c.createMediaElementSource(audio); }
      catch (e) { if (c) { try { c.close(); } catch (e2) {} } actx = null; source = null; analyser = null; degraded = true; return; }
      try {
        analyser = c.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.80;
        source.connect(analyser); analyser.connect(c.destination);
        actx = c;
        freq = new Uint8Array(analyser.frequencyBinCount);
        time = new Uint8Array(analyser.fftSize);
        spec = new Float32Array(analyser.frequencyBinCount);
        prevSpec = new Float32Array(analyser.frequencyBinCount);
        if (actx.state === "suspended") actx.resume();
      } catch (e) {
        try { source.disconnect(); } catch (e2) {}
        try { source.connect(c.destination); } catch (e2) {}
        actx = null; analyser = null; degraded = true;
      }
    }

    function toward(cur, target, atkTau, relTau, dt) {
      var tau = target > cur ? atkTau : relTau;
      return cur + (target - cur) * (1 - Math.exp(-dt / tau));
    }
    function bandAvg(f0, f1) {
      if (!analyser) return 0;
      var nyq = actx.sampleRate / 2, n = freq.length;
      var b0 = Math.max(0, Math.floor((f0 / nyq) * n)), b1 = Math.min(n - 1, Math.ceil((f1 / nyq) * n));
      var s = 0, c = 0;
      for (var i = b0; i <= b1; i++) { s += freq[i]; c++; }
      return c ? s / (c * 255) : 0;
    }

    function readAudio(dt, now) {
      if (!analyser || audio.paused || audio.ended) {
        for (var key in env) env[key] = toward(env[key], 0, 0.25, 0.6, dt);
        beat = toward(beat, 0, 0.9, 0.5, dt);
        return;
      }
      analyser.getByteFrequencyData(freq);
      analyser.getByteTimeDomainData(time);
      var sub = bandAvg(20, 60), bass = bandAvg(60, 140), lowMid = bandAvg(140, 400);
      var mid = bandAvg(400, 2000), high = bandAvg(2000, 8000), treble = bandAvg(8000, 16000);
      var energy = sub * 0.10 + bass * 0.28 + lowMid * 0.22 + mid * 0.22 + high * 0.13 + treble * 0.05;

      var n = freq.length, s = 0, i;
      for (i = 0; i < n; i++) { spec[i] = freq[i] / 255; s += spec[i]; }
      var wave = 0;
      for (i = 0; i < time.length; i += 4) wave += Math.abs(time[i] - 128);
      wave = wave / (time.length / 4) / 128;

      var flux = 0, lowFlux = 0, lowEnd = Math.max(1, Math.floor(n * 0.06));
      for (i = 0; i < n; i++) { var d = spec[i] - prevSpec[i]; if (d > 0) { flux += d; if (i < lowEnd) lowFlux += d; } }
      flux /= n; lowFlux /= lowEnd;

      env.sub = toward(env.sub, sub, 0.03, 0.20, dt);
      env.bass = toward(env.bass, bass, 0.04, 0.20, dt);
      env.lowMid = toward(env.lowMid, lowMid, 0.06, 0.24, dt);
      env.mid = toward(env.mid, mid, 0.07, 0.28, dt);
      env.high = toward(env.high, high, 0.07, 0.32, dt);
      env.treble = toward(env.treble, treble, 0.08, 0.36, dt);
      env.energy = toward(env.energy, clamp(energy, 0, 1), 0.08, 0.32, dt);
      env.wave = toward(env.wave, clamp(wave, 0, 1), 0.12, 0.36, dt);

      // кометный хвост и скорость живут на bass/high
      // адаптивный порог onset (спокойнее, чем раньше)
      fluxMean += (flux - fluxMean) * 0.05;
      fluxDev += (Math.abs(flux - fluxMean) - fluxDev) * 0.05;
      var thr = fluxMean + Math.max(0.006, 1.9 * fluxDev);
      if (!reduced && flux > thr && now - lastOnset > 0.18) {
        var strong = lowFlux > Math.max(0.006, 1.4 * fluxMean);
        beat = Math.min(1, beat + (strong ? 0.85 : 0.5) * CONFIG.beatResponse);
        spawnRing(strong);
        lastOnset = now;
        onsetCount++;
        if (strong) kickCount++;
      }
      prevSpec.set(spec);
    }

    function spawnRing(strong) {
      for (var i = 0; i < MAX_RINGS; i++) {
        if (!rings[i].alive) {
          rings[i].alive = true; rings[i].r = 0.42; rings[i].sp = strong ? 0.85 : 0.55;
          rings[i].life = 0; rings[i].max = strong ? 1.7 : 1.3; rings[i].w = strong ? 1.6 : 1.0;
          rings[i].warm = strong ? 0.6 : 0.2;
          return;
        }
      }
    }

    // ---------------------------------------------------------------- update
    function update(dt, now) {
      readAudio(dt, now);
      var active = !audio.paused && analyser !== null;
      var speed = reduced ? 0.25 : (active ? 1 : 0.4);

      beat = toward(beat, 0, 0.9, 0.5, dt);

      corePhase += dt * (0.25 + env.mid * 0.5) * speed;   // медленное дыхание
      orbitPhase += dt * (0.10 + env.mid * 0.25) * speed;  // медленное движение орбит
      filPhase += dt * (0.35 + env.mid * 0.8) * speed;     // живое течение филаментов
      cometPhase += dt * (0.6 + env.bass * 1.2) * speed;   // быстрое движение комет
      t += dt * speed;

      var dn = activeDust(), i;
      for (i = 0; i < dn; i++) {
        var p = dust[i];
        p.a += p.va * dt * (0.5 + env.high * 1.2) * speed;
        p.r += p.vr * dt * speed + Math.sin(t * 0.6 + p.ph) * 0.015 * dt;
        if (p.r > 1.35) p.r = 0.35; if (p.r < 0.28) p.r = 0.28;
        p.z = Math.sin(t * 0.3 + p.ph + p.a * 0.2);
      }
      var cn = activeComets();
      for (i = 0; i < cn; i++) {
        var c = comets[i];
        c.a += c.va * dt * CONFIG.cometSpeed * (0.7 + env.bass * 0.9 + beat * 0.3) * speed;
        c.r += c.vr * dt * speed + Math.sin(t * 0.4 + c.ph) * 0.02 * dt + beat * 0.02 * dt;
        if (c.r > 1.30) c.r = 0.45 + (c.r - 1.30);
        if (c.r < 0.40) c.r = 0.40;
        c.z = Math.sin(t * 0.25 + c.ph + c.a * 0.3);
      }
      for (i = 0; i < MAX_RINGS; i++) {
        var r = rings[i];
        if (!r.alive) continue;
        r.life += dt; r.r += r.sp * dt;
        if (r.life >= r.max || r.r > REACH) r.alive = false;
      }
    }

    // ------------------------------------------------------------------ draw
    function drawOrbits(cx, cy, baseR) {
      var n = activeOrbits();
      for (var i = 0; i < n; i++) {
        var depth = 1 - i * 0.16;
        var incl = 0.30 + i * 0.34 + Math.sin(orbitPhase * 0.6 + i * 1.7) * 0.05;
        var rot = orbitPhase * (0.30 + i * 0.19) + i * 1.7;
        var offX = Math.sin(i * 2.1 + 0.6) * baseR * 0.10; // лёгкий сдвиг — не концентрично
        var offY = Math.cos(i * 1.7) * baseR * 0.08;
        var rx = baseR * (0.62 + i * 0.16) * (1 + env.bass * 0.07 + beat * 0.02);
        var ry = rx * (0.30 + 0.15 * i) * (1 + env.mid * 0.12);
        var alpha = CONFIG.orbitOpacity * (0.13 - i * 0.02) * depth * (0.7 + env.energy * 0.6);
        ctx.save();
        ctx.translate(cx + offX, cy + offY);
        ctx.rotate(incl * 0.45 + Math.sin(rot * 0.4) * 0.03);
        ctx.strokeStyle = rgba(mix(PALETTE.shell, PALETTE.core, i / n), alpha);
        ctx.lineWidth = 0.7 + env.mid * 0.4;
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI); ctx.stroke();
        ctx.strokeStyle = rgba(PALETTE.shell, alpha * 0.32);
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, Math.PI, TAU); ctx.stroke();
        var na = rot, nx = Math.cos(na) * rx, ny = Math.sin(na) * ry;
        ctx.fillStyle = rgba(PALETTE.spark, 0.14 + env.energy * 0.16);
        ctx.beginPath(); ctx.arc(nx, ny, 0.8 + env.high * 1.0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }

    function drawFilaments(cx, cy, baseR) {
      var n = activeFilaments();
      for (var i = 0; i < n; i++) {
        var f = filaments[i];
        var scale = f.scale * (1 - env.bass * 0.05 * f.depth) + beat * 0.01;
        var rr = baseR * scale;
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(f.tilt + Math.sin(filPhase * 0.3 * f.speed + i) * 0.05);
        ctx.beginPath();
        var steps = 32, span = TAU * 0.6; // открытая дуга, а не замкнутое кольцо
        for (var j = 0; j <= steps; j++) {
          var th = (j / steps) * span - span * 0.5;
          var r = rr * (1 + f.amp * Math.sin(f.m * th + f.phase + filPhase * f.speed)
            + env.mid * 0.05 * Math.sin(2 * th - filPhase * 0.7 + i));
          var x = Math.cos(th) * r, y = Math.sin(th) * r * f.flat;
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        var a = CONFIG.filamentOpacity * (0.06 + 0.11 * f.depth) * (0.6 + env.mid * 0.6) * (0.7 + beat * 0.5);
        ctx.strokeStyle = rgba(mix(PALETTE.shell, PALETTE.core, f.depth), Math.min(0.22, a));
        ctx.lineWidth = 0.6 + f.depth * 0.5 + env.mid * 0.4;
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawCore(cx, cy, baseR) {
      var coreR = baseR * CONFIG.coreScale * (1 + env.bass * CONFIG.corePulse + Math.sin(corePhase) * 0.012 + beat * 0.04);
      var d1 = env.mid * 0.10, d2 = env.bass * 0.06, d3 = env.wave * 0.035;
      ctx.save();
      ctx.translate(cx, cy);

      // внешняя мягкая оболочка
      var halo = ctx.createRadialGradient(0, 0, coreR * 0.2, 0, 0, coreR * 2.4);
      halo.addColorStop(0, rgba(PALETTE.core, (0.11 + env.energy * 0.07) * CONFIG.coreBrightness));
      halo.addColorStop(0.5, rgba(PALETTE.shell, 0.05 + env.bass * 0.04));
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(0, 0, coreR * 2.4, 0, TAU); ctx.fill();

      // деформируемая внутренняя оболочка (2 слоя)
      for (var layer = 0; layer < 2; layer++) {
        var lr = coreR * (1 - layer * 0.28);
        var N = TIERS[tier].sampleN;
        ctx.beginPath();
        for (var j = 0; j <= N; j++) {
          var th = (j / N) * TAU;
          var rr = lr * (1 + d1 * Math.sin(2 * th + corePhase + layer)
            + d2 * Math.sin(3 * th - corePhase * 0.7)
            + d3 * Math.sin(5 * th + corePhase * 1.2 + layer));
          var x = Math.cos(th) * rr, y = Math.sin(th) * rr * 0.97;
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        var g = ctx.createRadialGradient(0, 0, lr * 0.1, 0, 0, lr * 1.5);
        g.addColorStop(0, rgba(mix(PALETTE.core, PALETTE.spark, env.high * 0.25), (0.13 - layer * 0.05) * CONFIG.coreBrightness + env.energy * 0.05));
        g.addColorStop(0.6, rgba(PALETTE.shell, 0.05 - layer * 0.015));
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = rgba(mix(PALETTE.core, PALETTE.spark, env.high * 0.3), 0.08 + env.mid * 0.12 - layer * 0.03);
        ctx.lineWidth = 0.8 + env.mid * 0.5 - layer * 0.2;
        ctx.stroke();
      }

      // плотное ядро (тонированное, без пересвета в белый)
      var ng = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * 0.75);
      ng.addColorStop(0, rgba(mix(PALETTE.core, PALETTE.spark, 0.22), (0.15 + env.bass * 0.12 + beat * 0.07) * CONFIG.coreBrightness));
      ng.addColorStop(0.5, rgba(PALETTE.core, 0.10 + env.energy * 0.08));
      ng.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ng;
      ctx.beginPath(); ctx.arc(0, 0, coreR * 0.75, 0, TAU); ctx.fill();
      ctx.restore();
    }

    function drawDust(cx, cy, baseR) {
      var n = activeDust();
      for (var i = 0; i < n; i++) {
        var p = dust[i];
        var rr = baseR * p.r * (1 + env.bass * 0.05);
        var x = cx + Math.cos(p.a) * rr, y = cy + Math.sin(p.a) * rr * 0.9 + p.z * baseR * 0.08;
        var depth = (p.z + 1) * 0.5;
        var tw = 0.5 + 0.5 * Math.sin(t * (0.5 + p.tw) + p.ph);
        var size = p.size * (0.5 + 0.8 * depth) * (1 + env.high * 0.5);
        var alpha = (0.08 + 0.22 * depth) * (0.55 + 0.45 * tw) * (0.6 + env.energy * 0.6);
        ctx.fillStyle = rgba(mix(PALETTE.shell, PALETTE.spark, 0.4 + tw * 0.5), alpha);
        ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill();
      }
    }

    function drawComets(cx, cy, baseR) {
      var n = activeComets();
      for (var i = 0; i < n; i++) {
        var c = comets[i];
        var rr = baseR * c.r * (1 + env.bass * 0.05);
        var ang = c.a;
        var x = cx + Math.cos(ang) * rr;
        var y = cy + Math.sin(ang) * rr * 0.9 + c.z * baseR * 0.10;
        var depth = (c.z + 1) * 0.5;
        var size = c.size * CONFIG.cometSize * (0.6 + 0.8 * depth);
        // касательное и перпендикулярное направления (для конусного хвоста)
        var tx = -Math.sin(ang), ty = Math.cos(ang) * 0.9;
        var px = -ty, py = tx;
        var tailLen = size * (5.0 + env.high * 8 + beat * 4) * CONFIG.cometTail * c.sp;
        var warm = (env.energy > 0.72 && c.size > 2.8) ? 0.35 : 0.0;
        var w0 = size * 0.85;

        var g = ctx.createLinearGradient(x, y, x - tx * tailLen, y - ty * tailLen);
        g.addColorStop(0, rgba(mix(PALETTE.spark, PALETTE.warm, warm), 0.26 * (0.6 + depth * 0.5)));
        g.addColorStop(0.5, rgba(mix(PALETTE.shell, PALETTE.warm, warm * 0.5), 0.10));
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x + px * w0, y + py * w0);
        ctx.lineTo(x - px * w0, y - py * w0);
        ctx.lineTo(x - tx * tailLen, y - ty * tailLen);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = rgba(mix(PALETTE.spark, PALETTE.accent, 0.3 + depth * 0.3), 0.40 + 0.4 * depth);
        ctx.beginPath(); ctx.arc(x, y, size * 0.8, 0, TAU); ctx.fill();
      }
    }

    function drawRings(cx, cy, baseR) {
      for (var i = 0; i < MAX_RINGS; i++) {
        var r = rings[i];
        if (!r.alive) continue;
        var ln = r.life / r.max;
        ctx.strokeStyle = rgba(mix(PALETTE.shell, PALETTE.warm, r.warm), (1 - ln) * 0.22 * (0.6 + env.energy * 0.5));
        ctx.lineWidth = r.w * (1 - ln * 0.6);
        ctx.beginPath(); ctx.ellipse(cx, cy, baseR * r.r, baseR * r.r * 0.92, 0, 0, TAU); ctx.stroke();
      }
    }

    function drawGlow(cx, cy, baseR) {
      gctx.setTransform(1, 0, 0, 1, 0, 0);
      gctx.clearRect(0, 0, glow.width, glow.height);
      gctx.save();
      gctx.scale(1 / GLOW_DIV, 1 / GLOW_DIV);
      var coreR = baseR * CONFIG.coreScale * (1 + env.bass * CONFIG.corePulse + beat * 0.04);
      var g = gctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.6);
      g.addColorStop(0, rgba(PALETTE.core, (0.30 + env.bass * 0.18) * CONFIG.coreBrightness));
      g.addColorStop(0.5, rgba(PALETTE.shell, 0.12));
      g.addColorStop(1, "rgba(0,0,0,0)");
      gctx.fillStyle = g; gctx.beginPath(); gctx.arc(cx, cy, coreR * 2.6, 0, TAU); gctx.fill();
      // крупные кометы в bloom
      var n = activeComets();
      for (var i = 0; i < n; i++) {
        var c = comets[i];
        if (c.size < 2.4) continue;
        var rr = baseR * c.r;
        var x = cx + Math.cos(c.a) * rr, y = cy + Math.sin(c.a) * rr * 0.9;
        gctx.fillStyle = rgba(PALETTE.spark, 0.28);
        gctx.beginPath(); gctx.arc(x, y, c.size * 2.2, 0, TAU); gctx.fill();
      }
      gctx.restore();
    }

    function draw(cx, cy, baseR) {
      var fade = 1 - Math.exp(-lastDt / TIERS[tier].trailTau);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0," + fade.toFixed(3) + ")";
      ctx.fillRect(0, 0, cssW, cssH);

      ctx.globalCompositeOperation = "lighter";
      drawFilaments(cx, cy, baseR);
      drawOrbits(cx, cy, baseR);
      drawDust(cx, cy, baseR);
      // ядро — обычным композитом, чтобы не накапливать свечение до белого
      ctx.globalCompositeOperation = "source-over";
      drawCore(cx, cy, baseR);
      ctx.globalCompositeOperation = "lighter";
      drawComets(cx, cy, baseR);
      drawRings(cx, cy, baseR);

      if (TIERS[tier].bloom && !reduced) {
        drawGlow(cx, cy, baseR);
        ctx.globalAlpha = clamp((0.06 + env.energy * 0.09) * CONFIG.bloomStrength, 0.03, 0.16);
        ctx.drawImage(glow, 0, 0, cssW, cssH);
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = "source-over";
    }

    // ------------------------------------------------------------------ loop
    var lastDt = 0.016, rafId = null;
    function loop(now) {
      rafId = requestAnimationFrame(loop);
      var screen = canvas.closest(".screen");
      if (!screen || !screen.classList.contains("is-active") || document.hidden) { lastNow = now; return; }
      var dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
      lastNow = now; lastDt = dt || 0.016;
      if (dt <= 0) return;
      if (layoutDirty || (frameCount++ % 30 === 0)) buildLayout();
      if (!layout.ok) return;
      update(dt, now / 1000);
      draw(layout.cx, layout.cy, layout.baseR);

      ftSamples[ftIdx] = dt; ftIdx = (ftIdx + 1) % 45;
      if (now - lastFpsCheck > 1000) {
        lastFpsCheck = now;
        var s = 0, c = 0;
        for (var i = 0; i < ftSamples.length; i++) if (ftSamples[i]) { s += ftSamples[i]; c++; }
        if (c > 10) {
          fps = c / s;
          if (fps < 40 && tier > 0 && now - lastTierChange > 2000) { tier--; lastTierChange = now; layoutDirty = true; }
          else if (fps > 57 && tier < maxTier && now - lastTierChange > 4000) { tier++; lastTierChange = now; layoutDirty = true; }
        }
      }
    }

    // -------------------------------------------------------------- observers
    var ro = null;
    function markDirty() { layoutDirty = true; }
    function observe(el) { if (ro && el) { try { ro.observe(el); } catch (e) {} } }
    if (typeof ResizeObserver !== "undefined") ro = new ResizeObserver(markDirty);
    window.addEventListener("resize", markDirty);
    window.addEventListener("orientationchange", markDirty);
    document.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest(".lyrics-toggle")) markDirty();
    });

    return {
      start: function () {
        buildLayout();
        var screen = canvas.closest(".screen");
        observe(screen);
        if (screen) observe(screen.querySelector(".song-panel"));
        observe(canvas);
        if (!rafId) { lastNow = 0; rafId = requestAnimationFrame(loop); }
      },
      ensureGraph: ensureGraph,
      _markDirty: markDirty,
      snapshot: function () {
        return {
          id: REGISTRY[canvas.__dnaSrc || ""] || null,
          analyser: !!analyser, degraded: degraded, protocol: location.protocol,
          contextState: actx ? actx.state : null,
          active: !audio.paused && !audio.ended,
          tier: TIERS[tier].name, fps: Math.round(fps),
          dust: activeDust(), comets: activeComets(), filaments: activeFilaments(), orbits: activeOrbits(),
          onsets: onsetCount, kicks: kickCount,
          layout: { cx: Math.round(layout.cx), cy: Math.round(layout.cy), r: Math.round(layout.baseR), reach: Math.round(layout.reach), ok: layout.ok, w: Math.round(cssW), h: Math.round(cssH) },
          env: { sub: +env.sub.toFixed(3), bass: +env.bass.toFixed(3), mid: +env.mid.toFixed(3), high: +env.high.toFixed(3), energy: +env.energy.toFixed(3), beat: +beat.toFixed(3) }
        };
      }
    };
  }

  function attach(root, api) {
    if (!root || !api || !api.audio || !root.dataset) return null;
    if (!REGISTRY[root.dataset.src || ""]) return null;
    if (root.__audioDna) return root.__audioDna;
    var screen = root.closest(".screen") || root;
    var canvas = document.createElement("canvas");
    canvas.className = "audio-dna";
    canvas.setAttribute("aria-hidden", "true");
    canvas.__dnaSrc = root.dataset.src;
    screen.appendChild(canvas);
    var engine = makeEngine(canvas, api.audio);
    engine.start();
    api.audio.addEventListener("play", function () { engine.ensureGraph(); });
    root.__audioDna = engine;
    return engine;
  }

  window.AudioDNA = { attach: attach, registry: REGISTRY, config: CONFIG };
})();

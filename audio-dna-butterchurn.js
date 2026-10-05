// ============================================================================
// Audio DNA — Butterchurn для канонических версий в мирах песен (Lvl3).
//
// Визуализатор — часть МИРА ПЕСНИ, а не библиотеки:
//   • Lvl1 (библиотека) — Butterchurn не подключается вообще, даже после play;
//   • Lvl2 (карта миров) — не подключается;
//   • Lvl3 (мир версии) — Butterchurn включается на `<audio>` этой версии.
// Поэтому биндинг создаётся только для плееров внутри `.screen--song`, и
// canvas никогда не переезжает на Lvl1/Lvl2.
//
// Архитектура (singleton):
//   • один AudioContext на всю страницу;
//   • один Butterchurn-визуализатор и один <canvas class="audio-dna">;
//   • по одному MediaElementSource на каждый реально открытый <audio>
//     (иначе createMediaElementSource для того же элемента бросает ошибку);
//   • старая версия не «копится»: canvas и AudioContext переиспользуются.
//
// Реестр версий: vendor/butterchurn/version-registry.js (генерируется
// build-version-registry.mjs из music_catalog.json). Дубликаты MP3 относятся к
// той же version_id; excluded_files (обрезанный файл) в реестр не попадают.
//
// Пресеты: общая золотая десятка (vendor/butterchurn/preset-library.json).
// Никаких отдельных наборов для песен. При открытии версии берётся следующий
// пресет из общей shuffle-bag очереди; загружается только он один.
//
// Ленивость: runtime (~188 KB), preset-library.json и пресет-файл грузятся
// только при первом реальном открытии мира песни (Lvl3). На старте сайта и в
// библиотеке не грузится ничего из этого.
//
// Жизненный цикл: при уходе с Lvl3 visual-слой полностью убирается — canvas
// отсоединяется от DOM, цикл рендера останавливается, анализ и controls
// освобождаются. AudioContext, сам canvas-элемент и MediaElementSource
// (слышимый маршрут) переиспользуются при следующем входе в мир.
//
// Маршрутизация звука: MediaElementSource → destination (звук слышен)
//                     + connectAudio(source) (анализ для пресета).
//
// При ошибке загрузки runtime — откат на стабильный v3 (window.AudioDNA).
// ============================================================================
(function () {
  "use strict";

  var RUNTIME_SRC = "vendor/butterchurn/butterchurn.min.js";
  var LIBRARY_SRC = "vendor/butterchurn/preset-library.json";
  var PRESET_VAR = "__BC_LIBRARY_PRESETS";

  // path -> version_id. Генерируется build-version-registry.mjs.
  // Fallback — исторический одиночный трек, если реестр не подключён.
  var REGISTRY = window.AudioDNAVersions || {
    "assets/music/All music/Поиск Psychedelic Electronic.mp3": "poisk-psychedelic-electronic"
  };

  // ----------------------------------------------------------- shuffle-bag ---
  // Общая очередь на все версии: перетасовать 10 → пройти по одному → снова.
  // На границе двух колод первый пресет не равен последнему проигранному.
  var bag = { order: [], size: 0, last: -1 };

  function randomInt(max) {
    if (window.crypto && window.crypto.getRandomValues) {
      var limit = Math.floor(4294967296 / max) * max;
      var u, v;
      do { u = new Uint32Array(1); window.crypto.getRandomValues(u); v = u[0]; } while (v >= limit);
      return v % max;
    }
    return Math.floor(Math.random() * max);
  }

  function shuffled(n) {
    var a = [], i, j, t;
    for (i = 0; i < n; i++) a.push(i);
    for (i = n - 1; i > 0; i--) {
      j = randomInt(i + 1);
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function drawIndex(n) {
    if (n <= 0) return -1;
    if (bag.size !== n || !bag.order.length) {
      var last = bag.last;
      do { bag.order = shuffled(n); } while (n > 1 && bag.order[0] === last);
      bag.size = n;
    }
    var i = bag.order.shift();
    bag.last = i;
    return i;
  }

  // ------------------------------------------------------------ utils ---
  function nowMs() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  function resolveMod(mod) {
    if (!mod) return null;
    if (mod.default && typeof mod.default.createVisualizer === "function") return mod.default;
    return mod;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("не загрузился " + src)); };
      document.head.appendChild(s);
    });
  }

  // Абсолютный src элемента → путь относительно корня сайта, как в реестре.
  function pathOf(audio) {
    var raw = (audio && (audio.currentSrc || audio.src)) || "";
    if (!raw) return "";
    try {
      var u = new URL(raw, location.href);
      return decodeURIComponent(u.pathname).replace(/^\//, "");
    } catch (e) {
      return "";
    }
  }

  function versionOf(audio) {
    var p = pathOf(audio);
    return p ? (REGISTRY[p] || null) : null;
  }

  // ------------------------------------------------------- загрузка runtime ---
  var loading = null;
  var library = null;

  function loadLibrary() {
    if (typeof fetch !== "function") return Promise.reject(new Error("нет fetch"));
    return fetch(LIBRARY_SRC, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("библиотека пресетов " + r.status); return r.json(); })
      .then(function (data) {
        var arr = data && data.presets ? data.presets : data;
        if (!arr || !arr.length) throw new Error("пустая библиотека пресетов");
        return arr.map(function (o) {
          return { id: o.id, name: o.name, short: o.short || o.name, src: o.src };
        });
      });
  }

  function ensureRuntime() {
    if (!loading) {
      if (!perf.t_attach) perf.t_attach = nowMs();
      loading = loadScript(RUNTIME_SRC)
        .then(function () { return loadLibrary(); })
        .then(function (lib) {
          var BC = resolveMod(window.butterchurn);
          if (!BC || typeof BC.createVisualizer !== "function") throw new Error("Butterchurn API недоступен");
          library = lib;
          perf.t_scripts = nowMs();
          return BC;
        });
    }
    return loading;
  }

  function presetFor(id) {
    var store = window[PRESET_VAR];
    return (store && store[id]) || null;
  }

  function ensurePreset(entry) {
    var have = presetFor(entry.id);
    if (have) return Promise.resolve(have);
    return loadScript(entry.src).then(function () {
      var p = presetFor(entry.id);
      if (!p || !p.preset) throw new Error("пресет не загрузился: " + entry.id);
      return p;
    });
  }

  // --------------------------------------------------------- состояние ---
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var ctx = null, viz = null, canvas = null, controls = null, labelEl = null;
  var analyser = null, silentGain = null;
  var sources = new Map();     // <audio> -> MediaElementSourceNode (живёт весь сеанс)
  var vizSources = new Set();  // что подключено к ТЕКУЩЕМУ viz (анализ)
  var bindings = new Map();    // root   -> binding
  var active = null;           // текущий binding
  var activateToken = 0;
  var rafId = null, lastNow = 0, fps = 0, ftS = [], ftI = 0, lastFps = 0;
  var loadedPresets = {}, presetIndex = -1, lastSwitchMs = null;
  var gestureSeen = false;
  var perf = { t_attach: 0, t_scripts: 0, t_ready: 0, t_first_frame: 0, ready: false, error: null, preset: null, presetId: null, renders: 0 };

  function dpr() { return Math.min(window.devicePixelRatio || 1, reduced ? 1 : 2); }

  function resume() {
    if (!ctx) return;
    if (ctx.state === "suspended") {
      var p = ctx.resume();
      if (p && typeof p.catch === "function") p.catch(function () {});
    }
  }

  function onGesture() { gestureSeen = true; resume(); }
  document.addEventListener("pointerdown", onGesture, true);
  document.addEventListener("touchstart", onGesture, true);
  document.addEventListener("keydown", onGesture, true);

  // ------------------------------------------------------- UI: controls ---
  function ensureControls(screen) {
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "dna-controls";
      controls.setAttribute("role", "group");
      controls.setAttribute("aria-label", "Пресет Audio DNA");

      var prev = document.createElement("button");
      prev.type = "button";
      prev.className = "dna-controls__step";
      prev.setAttribute("aria-label", "Предыдущий пресет");
      prev.textContent = "\u2039";
      prev.addEventListener("click", function () { step(-1); });

      labelEl = document.createElement("span");
      labelEl.className = "dna-controls__label";
      labelEl.textContent = "загрузка…";

      var next = document.createElement("button");
      next.type = "button";
      next.className = "dna-controls__step";
      next.setAttribute("aria-label", "Следующий пресет");
      next.textContent = "\u203a";
      next.addEventListener("click", function () { step(1); });

      controls.appendChild(prev);
      controls.appendChild(labelEl);
      controls.appendChild(next);
      renderLabel();
    }
    if (controls.parentNode !== screen) screen.appendChild(controls);
  }

  function renderLabel() {
    if (!labelEl) return;
    if (presetIndex < 0 || !library) { labelEl.textContent = "загрузка…"; return; }
    labelEl.textContent = (presetIndex + 1) + " / " + library.length + " · " + library[presetIndex].short;
  }

  // ------------------------------------------------------- graph / mount ---
  function ensureAnalyser() {
    if (analyser || !ctx) return;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    silentGain = ctx.createGain();
    silentGain.gain.value = 0;
    analyser.connect(silentGain);
    silentGain.connect(ctx.destination);
  }

  // MediaElementSource создаётся один раз на элемент и живёт весь сеанс:
  // он держит слышимый маршрут source → destination. Анализ (viz/analyser)
  // подключается/отключается отдельно, при входе/выходе из мира.
  function ensureSource(audio) {
    var src = sources.get(audio);
    if (src) return src;
    src = ctx.createMediaElementSource(audio);
    src.connect(ctx.destination);
    sources.set(audio, src);
    return src;
  }

  function connectSourceToSession(node) {
    if (!node || !viz) return;
    if (!vizSources.has(node)) {
      viz.connectAudio(node);
      vizSources.add(node);
    }
    try { node.connect(analyser); } catch (e) {}
  }

  function mount(binding, BC, screen) {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error("нет AudioContext");
      ctx = new AC();
    }
    // Canvas и визуализатор создаются один раз за сеанс (один WebGL-контекст),
    // но живут в DOM ТОЛЬКО пока открыт мир песни: при выходе canvas
    // отсоединяется от документа (см. teardown).
    // Место — ТЕКУЩИЙ экран мира (его передаёт activate), а не экран биндинга:
    // если в новом мире всё ещё звучит версия из другого мира,canvas должен
    // быть виден в том мире, куда пользователь только что вошёл.
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "audio-dna";
      canvas.setAttribute("aria-hidden", "true");
    }
    if (!screen) screen = binding.screen;
    if (canvas.parentNode !== screen) screen.appendChild(canvas);
    ensureControls(screen);
    if (!viz) {
      var rect = canvas.getBoundingClientRect();
      var d = dpr();
      canvas.width = Math.max(2, Math.round(Math.max(2, rect.width) * d));
      canvas.height = Math.max(2, Math.round(Math.max(2, rect.height) * d));
      viz = BC.createVisualizer(ctx, canvas, { width: canvas.width, height: canvas.height, pixelRatio: 1 });
    } else {
      sizeCanvas();
    }
    ensureAnalyser();
    connectSourceToSession(ensureSource(binding.audio));
    perf.t_ready = nowMs();
    perf.ready = true;
    resume();
    if (!rafId) { lastNow = 0; rafId = requestAnimationFrame(loop); }
  }

  // Полный выход из мира песни: canvas физически покидает DOM, цикл
  // останавливается, анализ и controls освобождаются. AudioContext и сами
  // MediaElementSource остаются (они нужны для звука и переиспользуются).
  function teardown() {
    activateToken++; // отменяем незавершённые активации/монтирования
    wantDraw = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (viz) {
      vizSources.forEach(function (n) { try { viz.disconnectAudio(n); } catch (e) {} });
    }
    vizSources.clear();
    sources.forEach(function (n) { if (analyser) { try { n.disconnect(analyser); } catch (e) {} } });
    if (analyser) { try { analyser.disconnect(); } catch (e) {} }
    if (controls) { try { controls.remove(); } catch (e) {} }
    if (canvas && canvas.parentNode) { try { canvas.remove(); } catch (e) {} }
    analyser = null;
    silentGain = null;
    controls = null;
    labelEl = null;
    active = null;
    lastNow = 0;
    perf.ready = false;
  }

  // ------------------------------------------------------------ пресеты ---
  function selectPreset(i, blend) {
    var entry = library && library[i];
    if (!entry || !viz) return Promise.reject(new Error("пресет недоступен: " + i));
    if (labelEl) labelEl.textContent = "загрузка…";
    var t0 = nowMs();
    return ensurePreset(entry).then(function (p) {
      viz.loadPreset(p.preset, blend == null ? 2.7 : blend);
      presetIndex = i;
      loadedPresets[entry.id] = true;
      lastSwitchMs = Math.round(nowMs() - t0);
      perf.preset = p.name;
      perf.presetId = entry.id;
      renderLabel();
      return { id: entry.id, name: p.name, switchMs: lastSwitchMs };
    }).catch(function (e) {
      if (labelEl) labelEl.textContent = "пресет недоступен";
      throw e;
    });
  }

  function drawPreset() {
    if (!library || !viz) return;
    selectPreset(drawIndex(library.length), 2.7);
  }

  function step(delta) {
    if (!library || !library.length) return null;
    var base = presetIndex < 0 ? 0 : presetIndex;
    return selectPreset(((base + delta) % library.length + library.length) % library.length);
  }

  // ------------------------------------------------------------ активация ---
  // Одна активная версия: canvas и AudioContext переиспользуются.
  var wantDraw = false;

  function activate(binding, drawNew) {
    if (!binding) return;
    if (active === binding) {
      resume();
      if (drawNew) { if (viz) drawPreset(); else wantDraw = true; }
      return;
    }
    var token = ++activateToken;
    active = binding;
    if (drawNew) wantDraw = true;
    ensureRuntime().then(function (BC) {
      if (token !== activateToken) return; // активацию перебили
      // Пока грузился runtime, могли уйти с Lvl3 — тогда ничего не монтируем.
      var cur = document.querySelector(".screen.is-active");
      if (!cur || !cur.classList.contains("screen--song")) {
        active = null;
        wantDraw = false;
        return;
      }
      mount(binding, BC, cur);
      binding.lastVersion = versionOf(binding.audio) || binding.versionId;
      if (wantDraw) { wantDraw = false; drawPreset(); }
    }).catch(function (e) {
      fail(e, binding);
    });
  }

  function moveCanvasTo(screen) {
    if (!viz || !canvas || !screen) return;
    if (canvas.parentNode !== screen) screen.appendChild(canvas);
    ensureControls(screen);
  }

  function fail(e, binding) {
    perf.error = String(e && e.message);
    if (window.console && console.warn) console.warn("[butterchurn] откат на v3:", perf.error);
    viz = null;
    canvas = null;
    teardown();
    if (binding && window.AudioDNA) window.AudioDNA.attach(binding.root, binding.api);
  }

  function onPlay(binding) {
    // Audio DNA — часть мира песни: в библиотеке (Lvl1) и на карте (Lvl2)
    // визуализатор не запускается вообще.
    if (!binding.screen.classList.contains("screen--song")) return;
    var v = versionOf(binding.audio) || binding.versionId;
    var drawNew = (active !== binding) || (v !== binding.lastVersion);
    binding.lastVersion = v;
    activate(binding, drawNew);
  }

  // Активным может быть только экран мира песни (Lvl3). Lvl1 (библиотека) и
  // Lvl2 (карта) не показывают визуализатор никогда: при уходе с Lvl3
  // визуальный слой полностью убирается из DOM (teardown).
  function firstBindingIn(screen) {
    var found = null;
    bindings.forEach(function (b) { if (!found && b.screen === screen) found = b; });
    return found;
  }

  function syncScreen() {
    var screen = document.querySelector(".screen.is-active");
    if (!screen || !screen.classList.contains("screen--song")) {
      teardown();
      return;
    }
    var playing = null;
    bindings.forEach(function (b) { if (!b.audio.paused) playing = b; });
    var target = playing || firstBindingIn(screen);
    if (!target) return;
    if (active !== target) {
      activate(target, !playing);
    } else {
      resume();
      moveCanvasTo(screen);
    }
  }

  function watchScreens() {
    if (typeof MutationObserver !== "function") return;
    var obs = new MutationObserver(function () { syncScreen(); });
    document.querySelectorAll(".screen").forEach(function (s) {
      obs.observe(s, { attributes: true, attributeFilter: ["class"] });
    });
    syncScreen();
  }

  // ------------------------------------------------------------ render loop ---
  function sizeCanvas() {
    if (!viz || !canvas || !canvas.parentNode) return;
    var rect = canvas.getBoundingClientRect();
    var d = dpr();
    canvas.width = Math.max(2, Math.round(Math.max(2, rect.width) * d));
    canvas.height = Math.max(2, Math.round(Math.max(2, rect.height) * d));
    try { viz.setRendererSize(canvas.width, canvas.height, { pixelRatio: 1 }); } catch (e) {}
  }

  function loop(now) {
    if (!canvas || !viz || !canvas.parentNode) { rafId = null; return; }
    rafId = requestAnimationFrame(loop);
    var screen = canvas.closest(".screen");
    if (!screen || !screen.classList.contains("is-active") || document.hidden) { lastNow = now; return; }
    var dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
    lastNow = now;
    try { viz.render(); perf.renders = (perf.renders || 0) + 1; } catch (e) { perf.render_error = String(e && e.message); }
    if (!perf.t_first_frame) perf.t_first_frame = nowMs();
    ftS[ftI] = dt; ftI = (ftI + 1) % 60;
    if (now - lastFps > 1000) {
      lastFps = now;
      var s = 0, c = 0;
      for (var i = 0; i < ftS.length; i++) if (ftS[i]) { s += ftS[i]; c++; }
      if (c > 10) fps = c / s;
    }
  }

  // Ручное переключение: 1–9 / 0 — прямой выбор, ← / → — шаг ±1.
  // N/P не используются. Поля ввода и seek-бар не перехватываются.
  window.addEventListener("keydown", function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!canvas || !viz) return;
    var screen = canvas.closest(".screen");
    if (!screen || !screen.classList.contains("is-active")) return;
    var t = e.target;
    if (t && t.closest) {
      if (t.closest("input, textarea, select") || t.isContentEditable) return;
      if (t.closest(".player__bar")) return;
    }
    var k = e.key;
    if (k >= "1" && k <= "9") { e.preventDefault(); selectPreset(parseInt(k, 10) - 1); return; }
    if (k === "0") { e.preventDefault(); selectPreset(Math.min(9, (library ? library.length : 1) - 1)); return; }
    if (k === "ArrowRight") { e.preventDefault(); step(1); return; }
    if (k === "ArrowLeft") { e.preventDefault(); step(-1); return; }
  }, false);

  window.addEventListener("resize", sizeCanvas);

  // -------------------------------------------------------------- engine ---
  var engine = {
    impl: "butterchurn",
    get active() { return active; },
    list: function () { return library || []; },
    select: function (i, blend) { return selectPreset(i, blend); },
    step: step,
    next: function () { return step(1); },
    prev: function () { return step(-1); },
    resume: resume,
    ensureGraph: resume,
    level: function () {
      if (!analyser) return null;
      var buf = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buf);
      var sum = 0;
      for (var i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      return Math.sqrt(sum / buf.length);
    },
    snapshot: function () {
      var cur = active;
      var audio = cur ? cur.audio : null;
      return {
        impl: "butterchurn", ready: perf.ready, error: perf.error || null,
        mounted: !!(viz && canvas && canvas.parentNode),
        preset: perf.preset, presetId: perf.presetId,
        presetShort: (presetIndex >= 0 && library) ? library[presetIndex].short : null,
        index: presetIndex, total: library ? library.length : 0,
        loaded: Object.keys(loadedPresets), switchMs: lastSwitchMs,
        fps: Math.round(fps),
        contextState: ctx ? ctx.state : null,
        audio: audio ? { paused: audio.paused, muted: audio.muted, volume: audio.volume, currentTime: +audio.currentTime.toFixed(2) } : null,
        canvas: (canvas && canvas.parentNode) ? [canvas.width, canvas.height] : null,
        canvases: document.querySelectorAll("canvas.audio-dna").length,
        audioContexts: ctx ? 1 : 0,
        mediaSources: sources.size,
        players: bindings.size,
        activeSrc: audio ? pathOf(audio) : null,
        activeVersion: audio ? (versionOf(audio) || (cur && cur.versionId) || null) : null,
        activeScreen: canvas && canvas.parentNode ? (canvas.parentNode.id || canvas.parentNode.className) : null,
        bindingScreen: cur ? (cur.screen.id || cur.screen.className) : null,
        renders: perf.renders || 0,
        perf: perf,
        scriptLoadMs: perf.t_scripts ? Math.round(perf.t_scripts - perf.t_attach) : null,
        firstFrameMs: perf.t_first_frame ? Math.round(perf.t_first_frame - perf.t_attach) : null
      };
    }
  };

  // -------------------------------------------------------------- attach ---
  function attach(root, api) {
    if (!root || !api || !api.audio || !root.dataset) return null;
    var screen = root.closest(".screen") || root;
    // Визуализатор живёт только в мире песни (Lvl3). Библиотека (Lvl1) и
    // карта миров (Lvl2) не подключаются вообще — ни биндинга, ни canvas.
    if (!screen.classList.contains("screen--song")) return null;
    if (!REGISTRY[root.dataset.src || ""]) return null;
    if (root.__audioDnaBC) return root.__audioDnaBC;

    var binding = {
      root: root, screen: screen, api: api, audio: api.audio,
      versionId: REGISTRY[root.dataset.src],
      lastVersion: null
    };
    bindings.set(root, binding);
    api.audio.addEventListener("play", function () { onPlay(binding); });
    api.audio.addEventListener("ended", function () {
      // Пресет остаётся активным: ничего не меняем.
    });

    var state = {
      impl: "butterchurn",
      binding: binding,
      get engine() { return engine; },
      get error() { return perf.error; }
    };
    root.__audioDnaBC = state;

    syncScreen();
    return state;
  }

  window.__BC = engine;
  window.AudioDNAButterchurn = {
    attach: attach,
    registry: REGISTRY,
    runtimeSrc: RUNTIME_SRC,
    librarySrc: LIBRARY_SRC,
    engine: engine,
    // Диагностика shuffle-bag (на показ не влияет).
    debug: {
      librarySize: function () { return library ? library.length : 0; },
      draw: function () { return drawIndex(library ? library.length : 0); },
      bag: function () { return { size: bag.size, left: bag.order.slice(), last: bag.last }; },
      bindings: function () { return bindings.size; }
    }
  };

  watchScreens();
})();

// Infinite Today — Music Laboratory
// Шаг 3. Навигация по уровням:
//   Lvl1 → Lvl2 — нажатие на чёрную дыру;
//   Lvl2 → Lvl3 — созвездие «Поиск» или «Мечтай»;
//   Lvl2 → Lvl1 и Lvl3 → Lvl2 — кнопка «← Назад».
// Ни музыки, ни backend, ни других функций.

(function () {
  "use strict";

  const screens = {
    enter: document.getElementById("screen-enter"),
    space: document.getElementById("screen-space"),
    posik: document.getElementById("screen-song"),
    dream: document.getElementById("screen-dream"),
    suns: document.getElementById("screen-suns"),
    hope: document.getElementById("screen-hope"),
    time: document.getElementById("screen-time"),
    brothers: document.getElementById("screen-brothers"),
    turn: document.getElementById("screen-turn"),
    gallery: document.getElementById("screen-gallery"),
  };

  const hole = document.getElementById("hole");
  const constellationPosik = document.getElementById("constellation");
  const constellationDream = document.getElementById("constellation-dream");
  const constellationSuns = document.getElementById("constellation-suns");
  const constellationHope = document.getElementById("constellation-hope");
  const constellationTime = document.getElementById("constellation-time");
  const constellationBrothers = document.getElementById("constellation-brothers");
  const constellationTurn = document.getElementById("constellation-turn");

  if (
    !screens.enter ||
    !screens.space ||
    !screens.posik ||
    !screens.dream ||
    !screens.suns ||
    !screens.hope ||
    !screens.time ||
    !screens.brothers ||
    !screens.turn ||
    !screens.gallery ||
    !hole ||
    !constellationPosik ||
    !constellationDream ||
    !constellationSuns ||
    !constellationHope ||
    !constellationTime ||
    !constellationBrothers ||
    !constellationTurn
  ) {
    return;
  }

  // Длительность кроссфейда .screen из styles.css (--fade: 1300ms) плюс запас,
  // чтобы клик во время перехода не переключил экран раньше времени.
  const TRANSITION_MS = 1350;

  let active = screens.enter;
  let busy = false;

  // --- История браузера: уровни = визуальная навигация ---------------------
  // L1 (enter) → L2 (space) → L3 (posik/dream/suns/hope/time) и отдельный
  // экран gallery из L1. Каждый переход по сайту добавляет запись, поэтому
  // Back/Forward браузера повторяют ту же последовательность. Кнопка «← Назад»
  // самого сайта по-прежнему ведёт на предыдущий уровень (она делает обычный
  // переход, а не history.back).
  // Смена версии песни внутри одного L3 — не переход уровня, history не трогается.
  const HISTORY_KEY = "infiniteTodayLevel";
  // Второй ключ — только для галереи: какое изображение открыто в lightbox.
  // Он живёт внутри того же уровня #gallery, поэтому Back сначала закрывает
  // lightbox, а следующий Back уже уводит из галереи на L1.
  const IMAGE_KEY = "infiniteTodayImage";
  const LEVEL_KEYS = ["enter", "space", "posik", "dream", "suns", "hope", "time", "brothers", "turn", "gallery"];
  // Уровни соответствуют и просторам, и фрагменту URL (#space, #posik, ...).
  const LEVEL_SLUGS = { enter: "enter", space: "space", posik: "posik", dream: "dream", suns: "suns", hope: "hope", time: "time", brothers: "brothers", turn: "turn", gallery: "gallery" };

  function levelKeyOf(screen) {
    for (const key of LEVEL_KEYS) if (screens[key] === screen) return key;
    return null;
  }

  // Ключ уровня из адреса: #posik → "posik"; пусто или мусор → "enter".
  // Нужен для прямого открытия и обновления страницы на L2/L3.
  // Подпуть (#gallery/posik-03) разрешён только галерее.
  function levelKeyFromHash() {
    let raw = (location.hash || "").replace(/^#\/?/, "");
    try { raw = decodeURIComponent(raw); } catch (e) { /* ignore */ }
    if (!raw) return "enter";
    const parts = raw.split("/");
    const key = parts[0].toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(LEVEL_SLUGS, key) || !screens[key]) return null;
    if (parts.length > 1 && key !== "gallery") return null;
    return key;
  }

  // id изображения из #gallery/<id> — для прямого захода и для popstate без state.
  function imageIdFromHash() {
    let raw = (location.hash || "").replace(/^#\/?/, "");
    try { raw = decodeURIComponent(raw); } catch (e) { /* ignore */ }
    const parts = raw.split("/");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "gallery") return null;
    const id = parts[1].trim().toLowerCase();
    return id || null;
  }

  function levelState(key) { return { [HISTORY_KEY]: key }; }
  function levelHash(key) { return "#" + (LEVEL_SLUGS[key] || "enter"); }
  function imageState(id) { return { [HISTORY_KEY]: "gallery", [IMAGE_KEY]: id }; }
  function imageHash(id) { return "#" + LEVEL_SLUGS.gallery + "/" + id; }

  // Визуальное применение экрана: плееры открываемого уровня, ленивый фон,
  // кроссфейд штатными классами. Вызывается и из go(), и при восстановлении
  // уровня после прямого открытия страницы.
  function applyScreen(target) {
    // Создаём Audio для плееров открываемого экрана (без сетевой загрузки).
    initPlayersIn(target);
    // Фон грузится в начале кроссфейда, а не заранее.
    activateSceneBackground(target);
    // Галерея грузит свой manifest тоже только при первом входе.
    activateGallery(target);
    // Любой другой экран = галерея закрыта в любом виде.
    if (target !== screens.gallery) lightboxClose("keep");

    for (const screen of Object.values(screens)) {
      const isTarget = screen === target;
      screen.classList.toggle("is-active", isTarget);
      screen.setAttribute("aria-hidden", String(!isTarget));
    }

    active = target;
  }

  // Очередь переходов: несколько Back/кликов подряд во время кроссфейда не
  // теряются и не рассинхронизируют экран с историей.
  let queued = null;

  function drainQueue() {
    if (busy || !queued) return;
    const target = queued;
    queued = null;
    busy = true;
    applyScreen(target);
    window.setTimeout(() => {
      busy = false;
      drainQueue();
    }, TRANSITION_MS);
  }

  // opts.mode:
  //   "push"    — обычный переход по сайту (создаёт запись истории);
  //   "none"    — реакция на Back/Forward (история уже изменена браузером);
  //   "replace" — восстановление уровня при загрузке страницы.
  function go(target, opts) {
    if (!target) return;
    const mode = (opts && opts.mode) || "push";
    if (target === active || (queued && queued === target)) return;
    const key = levelKeyOf(target);
    if (mode === "push") history.pushState(levelState(key), "", levelHash(key));
    else if (mode === "replace") history.replaceState(levelState(key), "", levelHash(key));
    queued = target;
    drainQueue();
  }

  window.addEventListener("popstate", (event) => {
    const stored = event.state && event.state[HISTORY_KEY];
    const key = stored || levelKeyFromHash() || "enter";
    const target = screens[key];
    if (!target) return;
    // Запись без нашего state (ручная правка адреса, старый вход, мусорный hash) —
    // нормализуем на месте, чтобы адрес соответствовал фактическому уровню.
    if (!stored) {
      const openId = key === "gallery" ? imageIdFromHash() : null;
      if (openId) history.replaceState(imageState(openId), "", imageHash(openId));
      else history.replaceState(levelState(key), "", levelHash(key));
    }
    go(target, { mode: "none" });
    // Состояние lightbox разбираем после уровня: при одном и том же #gallery
    // go() выходит раньше, чем успел бы что-то изменить.
    if (key !== "gallery") {
      lightboxClose("keep");
      return;
    }
    const imageId = (event.state && event.state[IMAGE_KEY]) || imageIdFromHash();
    if (imageId) lightboxOpenById(imageId);
    else lightboxClose("keep");
  });

  // Ленивая загрузка фонов: изображение ставится только при активации экрана.
  // Скрытые миры больше не тянут свои фоны заранее; Lvl1 остаётся с обычным
  // inline background-image и грузится сразу, потому что виден на старте.
  function activateSceneBackground(screen) {
    if (!screen) return;
    const img = screen.querySelector(".scene__img");
    if (!img || img.dataset.bgLoaded === "1") return;
    // Lvl2: одиночный фон. Lvl3: desktop/mobile через CSS-переменные,
    // которые уже используются в styles.css — механизм не меняется.
    if (img.dataset.bg) {
      img.style.backgroundImage = `url("${img.dataset.bg}")`;
    }
    if (img.dataset.bgDesktop) {
      img.style.setProperty("--scene-desktop", `url("${img.dataset.bgDesktop}")`);
    }
    if (img.dataset.bgMobile) {
      img.style.setProperty("--scene-mobile", `url("${img.dataset.bgMobile}")`);
    }
    img.dataset.bgLoaded = "1";
  }

  hole.addEventListener("click", () => go(screens.space));

  // На мобильном подпись «Вход» стоит отдельно от чёрной дыры, поэтому
  // она сама работает как точка входа (на десктопе это ничего не меняет).
  const enterHint = document.querySelector(".enter__hint");
  if (enterHint) {
    enterHint.addEventListener("click", () => go(screens.space));
  }
  constellationPosik.addEventListener("click", () => go(screens.posik));
  constellationDream.addEventListener("click", () => go(screens.dream));
  constellationSuns.addEventListener("click", () => go(screens.suns));
  constellationHope.addEventListener("click", () => go(screens.hope));
  constellationTime.addEventListener("click", () => go(screens.time));
  constellationBrothers.addEventListener("click", () => go(screens.brothers));
  constellationTurn.addEventListener("click", () => go(screens.turn));

  // Ссылка «Галерея» на Lvl1 — внутренний переход по тому же механизму уровней,
  // без перезагрузки и без изменения адреса вне модели #enter/#space/#gallery.
  const galleryLink = document.querySelector("[data-gallery-link]");
  if (galleryLink) {
    galleryLink.addEventListener("click", (event) => {
      event.preventDefault();
      go(screens.gallery);
    });
  }

  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = screens[button.dataset.back];
      if (target) go(target);
    });
  });

  // Мобильный Lvl2: карточки миров ведут в соответствующий Lvl3
  // (data-world = ключ экрана: posik / dream / suns / hope / time / brothers / turn).
  document.querySelectorAll("[data-world]").forEach((card) => {
    card.addEventListener("click", () => {
      const target = screens[card.dataset.world];
      if (target) go(target);
    });
  });

  // --- Проигрыватели версий песни и сворачиваемый текст ---
  // Каждый элемент [data-player] получает свой аудиопоток, шкалу, время и
  // независимую громкость. Одновременно звучит только одна версия: запуск
  // одной автоматически останавливает остальные.
  const players = [];

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const total = Math.floor(seconds);
    return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0");
  }

  // Закрывает выпадающие регуляторы громкости у всех проигрывателей.
  function closeAllVolumePopovers() {
    document.querySelectorAll(".player.is-volume-open").forEach((player) => {
      player.classList.remove("is-volume-open");
      const button = player.querySelector(".player__volume-button");
      const popover = player.querySelector(".player__volume-popover");
      if (button) button.setAttribute("aria-expanded", "false");
      if (popover) popover.setAttribute("aria-hidden", "true");
    });
  }

  // Клик вне открытого регулятора закрывает его.
  document.addEventListener("click", (event) => {
    document.querySelectorAll(".player.is-volume-open").forEach((player) => {
      if (player.contains(event.target)) return;
      player.classList.remove("is-volume-open");
      const button = player.querySelector(".player__volume-button");
      const popover = player.querySelector(".player__volume-popover");
      if (button) button.setAttribute("aria-expanded", "false");
      if (popover) popover.setAttribute("aria-hidden", "true");
    });
  });

  function setupPlayer(root) {
    const src = root.dataset.src;
    if (!src) return;

    const toggle = root.querySelector(".player__toggle");
    const bar = root.querySelector(".player__bar");
    const fill = root.querySelector(".player__fill");
    const time = root.querySelector(".player__time");
    const volumeButton = root.querySelector(".player__volume-button");
    const volumePopover = root.querySelector(".player__volume-popover");
    const muteButton = root.querySelector(".player__mute");
    const volumeRange = root.querySelector(".player__volume-range");
    if (!toggle || !bar || !fill || !time || !volumeButton || !volumePopover || !muteButton || !volumeRange) {
      return null;
    }

    const audio = new Audio();
    audio.preload = "none";
    // src назначается лениво — только при первом реальном воспроизведении.
    // Скролл картинок/скрытые Lvl3-плееры не тянут аудио заранее.
    let pendingSrc = src;
    let srcAssigned = false;
    function ensureSrc() {
      if (!srcAssigned) {
        audio.src = pendingSrc;
        srcAssigned = true;
      }
    }

    function renderProgress() {
      const duration = audio.duration;
      const ratio = Number.isFinite(duration) && duration > 0 ? audio.currentTime / duration : 0;
      fill.style.width = (ratio * 100).toFixed(2) + "%";
      bar.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
      time.textContent = formatTime(audio.currentTime) + " / " + formatTime(duration);
    }

    function setPlaying(isPlaying) {
      root.classList.toggle("is-playing", isPlaying);
      toggle.setAttribute("aria-label", isPlaying ? "Пауза" : "Воспроизвести");
      toggle.setAttribute("aria-pressed", String(isPlaying));
    }

    let lastVolume = audio.volume;

    function renderVolume() {
      const muted = audio.muted || audio.volume === 0;
      root.classList.toggle("is-muted", muted);
      muteButton.setAttribute("aria-pressed", String(muted));
      muteButton.setAttribute("aria-label", muted ? "Включить звук" : "Выключить звук");
      volumeRange.value = muted ? "0" : String(audio.volume);
    }

    function setVolumeOpen(open) {
      root.classList.toggle("is-volume-open", open);
      volumeButton.setAttribute("aria-expanded", String(open));
      volumePopover.setAttribute("aria-hidden", String(!open));
    }

    // Загрузка трека в этот же плеер (используется библиотекой на Lvl1).
    // Сам src назначается лениво — при первом воспроизведении (autoplay=true).
    function load(nextSrc, autoplay) {
      if (pendingSrc !== nextSrc) {
        pendingSrc = nextSrc;
        srcAssigned = false;
      }
      if (autoplay) {
        ensureSrc();
        audio.currentTime = 0;
        const request = audio.play();
        if (request && typeof request.catch === "function") request.catch(() => {});
      }
      renderProgress();
    }

    toggle.addEventListener("click", () => {
      if (audio.paused) {
        ensureSrc();
        const request = audio.play();
        if (request && typeof request.catch === "function") request.catch(() => {});
      } else {
        audio.pause();
      }
    });

    audio.addEventListener("play", () => {
      // Останавливаем другие версии, чтобы звучала только одна.
      for (const other of players) {
        if (other.audio !== audio) other.audio.pause();
      }
      setPlaying(true);
    });
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("ended", () => setPlaying(false));
    audio.addEventListener("timeupdate", renderProgress);
    audio.addEventListener("loadedmetadata", renderProgress);
    audio.addEventListener("volumechange", renderVolume);

    // --- Перемотка: клик, перетаскивание и клавиатура ---
    // Все пути используют один безопасный seek. Цель ограничивается
    // доступным seekable-диапазоном: если сервер/ресурс не поддерживает
    // byte-range (seekable = [0,0]), мы НЕ трогаем currentTime, чтобы
    // браузер не откатил воспроизведение к началу.
    function seekToTime(target) {
      const duration = audio.duration;
      if (!Number.isFinite(duration) || duration <= 0) return false;
      let pos = Math.min(Math.max(target, 0), duration);
      try {
        if (audio.seekable && audio.seekable.length) {
          const start = audio.seekable.start(0);
          const end = audio.seekable.end(0);
          if (end - start <= 0) return false; // ресурс не seekable
          pos = Math.min(Math.max(pos, start), end);
        }
      } catch (e) { /* ignore */ }
      audio.currentTime = pos;
      renderProgress();
      return true;
    }

    function ratioFromClientX(clientX) {
      const rect = bar.getBoundingClientRect();
      return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    }

    function seekToRatio(ratio) {
      seekToTime(ratio * audio.duration);
    }

    let scrubbing = false;
    bar.addEventListener("pointerdown", (event) => {
      scrubbing = true;
      try {
        if (bar.setPointerCapture) bar.setPointerCapture(event.pointerId);
      } catch (e) { /* ignore */ }
      seekToRatio(ratioFromClientX(event.clientX));
      event.preventDefault();
      bar.focus();
    });
    bar.addEventListener("pointermove", (event) => {
      if (!scrubbing) return;
      seekToRatio(ratioFromClientX(event.clientX));
      event.preventDefault();
    });
    function endScrub(event) {
      if (!scrubbing) return;
      scrubbing = false;
      try {
        if (bar.releasePointerCapture) bar.releasePointerCapture(event.pointerId);
      } catch (e) { /* ignore */ }
    }
    bar.addEventListener("pointerup", endScrub);
    bar.addEventListener("pointercancel", endScrub);

    // Резервный путь для окружений/AT без pointer-событий.
    bar.addEventListener("click", (event) => {
      if (event.detail === 0) return;
      seekToRatio(ratioFromClientX(event.clientX));
    });

    bar.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        seekToTime(audio.currentTime + 5);
      } else if (event.key === "ArrowLeft") {
        seekToTime(audio.currentTime - 5);
      } else {
        return;
      }
      event.preventDefault();
    });

    volumeButton.addEventListener("click", () => {
      const willOpen = !root.classList.contains("is-volume-open");
      closeAllVolumePopovers();
      if (willOpen) setVolumeOpen(true);
    });

    muteButton.addEventListener("click", () => {
      if (audio.muted || audio.volume === 0) {
        audio.muted = false;
        audio.volume = lastVolume > 0 ? lastVolume : 1;
      } else {
        lastVolume = audio.volume;
        audio.muted = true;
      }
      renderVolume();
    });

    volumeRange.addEventListener("input", () => {
      const value = Number(volumeRange.value);
      audio.muted = false;
      audio.volume = value;
      if (value > 0) lastVolume = value;
      renderVolume();
    });

    renderVolume();
    renderProgress();
    players.push({ audio });
    return { audio, load };
  }

  const playerApis = new Map();

  // --- Выбор визуализатора Audio DNA ---
  // По умолчанию: Butterchurn (общая золотая библиотека из 10 пресетов) для
  // зарегистрированных треков, v3 — для остальных. Переключатели:
  //   ?dna=v3          — принудительно стабильный v3;
  //   ?dna=butterchurn — принудительно Butterchurn.
  // Butterchurn сам лениво грузит runtime и откатывается на v3 при ошибке.
  const vizMode = (new URLSearchParams(location.search).get("dna") || "auto").toLowerCase();

  function attachVisualizer(root, api) {
    const bc = window.AudioDNAButterchurn;
    const isButterchurnTrack = !!(bc && root.dataset.src && bc.registry[root.dataset.src]);
    if (vizMode !== "v3" && isButterchurnTrack) {
      const engine = bc.attach(root, api);
      if (engine) return engine;
    }
    // Стабильный fallback — v3.
    if (window.AudioDNA) return window.AudioDNA.attach(root, api);
    return null;
  }

  // Ленивая инициализация плееров: Audio создаётся только для нужного экрана.
  function initPlayersIn(scope) {
    if (!scope) return;
    scope.querySelectorAll("[data-player]").forEach((root) => {
      if (playerApis.has(root)) return;
      const api = setupPlayer(root);
      if (api) {
        playerApis.set(root, api);
        // Audio DNA подключается только к зарегистрированным версиям.
        attachVisualizer(root, api);
      }
    });
  }

  // На Lvl1 сразу нужен только плеер библиотеки входа.
  // Плееры Lvl3 создаются лениво — при открытии соответствующего мира (см. go()).
  initPlayersIn(document.getElementById("screen-enter"));

  document.querySelectorAll(".lyrics-toggle").forEach((button) => {
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    if (!panel) return;
    button.addEventListener("click", () => {
      const open = panel.classList.toggle("is-open");
      button.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", String(open));
      panel.setAttribute("aria-hidden", String(!open));
    });
  });

  // --- Общая библиотека треков на Lvl1 ---
  // Список статичен (40 песен), порядок задан в разметке по алфавиту.
  const libraryList = document.getElementById("library-list");
  const libraryPlayer = document.getElementById("library-player");
  const libraryTitle = document.getElementById("library-current-title");
  const libraryGenre = document.getElementById("library-current-genre");

  if (libraryList && libraryPlayer && libraryTitle && libraryGenre && playerApis.has(libraryPlayer)) {
    const libraryApi = playerApis.get(libraryPlayer);
    const libraryTracks = Array.from(libraryList.querySelectorAll(".lib-track"));

    const selectLibraryTrack = (index, autoplay) => {
      const track = libraryTracks[index];
      if (!track) return;
      libraryTracks.forEach((item, i) => item.classList.toggle("is-current", i === index));
      libraryTitle.textContent = track.dataset.title;
      libraryGenre.textContent = track.dataset.genre;
      libraryApi.load(track.dataset.src, autoplay);
    };

    libraryTracks.forEach((track, index) => {
      track.addEventListener("click", () => selectLibraryTrack(index, true));
    });

    // Текущий индекс определяется по выделенному треку — так автопереход
    // работает и после ручного выбора любого трека.
    const currentLibraryIndex = () =>
      libraryTracks.findIndex((item) => item.classList.contains("is-current"));

    // Ручное переключение треков кнопками ← / → относится только к этому
    // плееру Lvl1. Границы списка замыкаются по кругу: с первого «назад»
    // уходит на последний, с последнего «вперёд» — на первый. Естественное
    // окончание трека (ended) этим не затрагивается и по-прежнему
    // останавливается на 40-м.
    const stepLibraryTrack = (delta) => {
      const count = libraryTracks.length;
      if (!count) return;
      const current = currentLibraryIndex();
      const base = current === -1 ? 0 : current;
      selectLibraryTrack((base + delta + count) % count, true);
    };

    const libraryPrev = libraryPlayer.querySelector(".player__prev");
    const libraryNext = libraryPlayer.querySelector(".player__next");
    if (libraryPrev) libraryPrev.addEventListener("click", () => stepLibraryTrack(-1));
    if (libraryNext) libraryNext.addEventListener("click", () => stepLibraryTrack(1));

    // Автопереход по окончании трека (только естественное событие ended).
    // Следующий трек берётся по существующему порядку списка.
    // На последнем (40-м) треке ничего не запускаем: play/pause уже
    // приведён в остановленное состояние обработчиком ended в setupPlayer.
    libraryApi.audio.addEventListener("ended", () => {
      const nextIndex = currentLibraryIndex() + 1;
      if (nextIndex < libraryTracks.length) {
        selectLibraryTrack(nextIndex, true);
      }
    });

    selectLibraryTrack(0, false);
  }

  // --- Галерея: отдельный экран внутри приложения --------------------------
  // Manifest и изображения грузятся лениво: до первого входа в галерею
  // не запрашивается ничего. Раскладка — CSS Grid, высота карточки считается
  // из w/h манифеста (waterfall без внешних библиотек).
  // Изображения берутся только из assets/gallery/** (из архива оригиналов — никогда).
  // Lightbox — следующий этап: сейчас клик только отдаёт данные изображения.
  const GALLERY_MANIFEST = "assets/gallery/gallery.json";
  const GALLERY_BASE = "assets/gallery/";
  // Должно совпадать с шириной колонок .gallery__grid в styles.css.
  const GALLERY_SIZES = "(max-width: 640px) 180px, (max-width: 820px) 210px, 300px";

  const galleryFilters = document.getElementById("gallery-filters");
  const galleryGrid = document.getElementById("gallery-grid");
  const galleryStatus = document.getElementById("gallery-status");

  const galleryCards = [];
  let galleryCategories = new Map();
  let galleryFilter = "all";
  let galleryRequested = false;
  let galleryFrame = 0;
  let pendingGalleryImage = null;  // #gallery/<id> до загрузки манифеста

  function gallerySetStatus(text) {
    if (!galleryStatus) return;
    galleryStatus.textContent = text || "";
    galleryStatus.hidden = !text;
  }

  // Высота карточки = span по фактической ширине колонки и пропорции манифеста.
  // Ширину колонки и шаг строк берём из CSS, а не из констант, чтобы breakpoints
  // не расползались между styles.css и app.js. Промежуток между рядами — margin
  // карточки (row-gap: 0), поэтому высота карточки совпадает с пропорцией ±2px.
  function galleryLayout() {
    if (!galleryGrid || !galleryCards.length) return;
    const style = getComputedStyle(galleryGrid);
    const column = parseFloat(style.gridTemplateColumns.split(" ")[0]);
    const rowUnit = parseFloat(style.gridAutoRows) || 2;
    const gap = parseFloat(style.columnGap) || 0;
    if (!Number.isFinite(column) || column <= 0) return;
    for (const { card, image } of galleryCards) {
      const height = column * (image.h / image.w);
      const span = Math.max(1, Math.ceil((height + gap) / rowUnit));
      card.style.setProperty("--span", String(span));
    }
  }

  function galleryScheduleLayout() {
    if (galleryFrame) return;
    galleryFrame = window.requestAnimationFrame(() => {
      galleryFrame = 0;
      galleryLayout();
    });
  }

  // Карточка отдаёт браузеру готовый srcset из production-вариантов:
  // sm — для карточек, md — для крупных карточек и экранов 2x. lg в карточках
  // не используется: он понадобится lightbox (следующий этап).
  function galleryMakeCard(image) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "gcard";
    card.dataset.galleryId = image.id;
    card.setAttribute("aria-label", "Открыть изображение: " + image.title);

    const small = image.files.sm;
    const medium = image.files.md || small;
    const sources = [GALLERY_BASE + small.path + " " + small.w + "w"];
    if (medium.path !== small.path) sources.push(GALLERY_BASE + medium.path + " " + medium.w + "w");

    const img = document.createElement("img");
    img.className = "gcard__img";
    img.src = GALLERY_BASE + small.path;
    img.srcset = sources.join(", ");
    img.sizes = GALLERY_SIZES;
    // Размеры из манифеста — браузер знает пропорцию до загрузки файла.
    img.width = small.w;
    img.height = small.h;
    img.alt = image.title;
    img.loading = "lazy";
    img.decoding = "async";
    card.append(img);
    return card;
  }

  function galleryApplyFilter(category) {
    galleryFilter = category;
    if (galleryFilters) {
      for (const chip of galleryFilters.querySelectorAll(".chip")) {
        chip.setAttribute("aria-pressed", String(chip.dataset.category === category));
      }
    }
    for (const { card, image } of galleryCards) {
      card.hidden = category !== "all" && image.category !== category;
    }
  }

  function galleryMakeChip(category, title, count) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.category = category;
    chip.setAttribute("aria-pressed", String(category === galleryFilter));
    chip.append(title);
    const counter = document.createElement("span");
    counter.className = "chip__count";
    counter.textContent = String(count);
    chip.append(counter);
    chip.addEventListener("click", () => galleryApplyFilter(category));
    return chip;
  }

  function galleryRender(data) {
    if (!galleryGrid || !galleryFilters || !data || !Array.isArray(data.images)) return;
    galleryCategories = new Map();
    for (const category of data.categories || []) galleryCategories.set(category.slug, category.title);
    galleryFilters.append(galleryMakeChip("all", "Все", data.images.length));
    for (const category of data.categories || []) {
      galleryFilters.append(galleryMakeChip(category.slug, category.title, category.count));
    }
    for (const image of data.images) {
      const card = galleryMakeCard(image);
      galleryCards.push({ card, image });
      galleryGrid.append(card);
    }
    galleryApplyFilter(galleryFilter);
    galleryLayout();
    gallerySetStatus("");
    // Прямой заход на #gallery/<id>: данные уже есть — открываем изображение.
    if (pendingGalleryImage) {
      const id = pendingGalleryImage;
      pendingGalleryImage = null;
      lightboxOpenById(id);
      // Неизвестный id (опечатка в ссылке) — просто галерея, без ложного адреса.
      if (!lightboxVisible) history.replaceState(levelState("gallery"), "", levelHash("gallery"));
    }
  }

  function galleryLoad() {
    if (galleryRequested) return;
    galleryRequested = true;
    gallerySetStatus("Загрузка…");
    fetch(GALLERY_MANIFEST, { cache: "no-cache" })
      .then((response) => {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(galleryRender)
      .catch((error) => {
        galleryRequested = false;
        gallerySetStatus("Не удалось загрузить галерею.");
        console.warn("gallery: manifest не загружен —", error && error.message);
      });
  }

  // Ленивое подключение экрана: вызывается из applyScreen только для gallery.
  function activateGallery(target) {
    if (target === screens.gallery) galleryLoad();
  }

  // --- Lightbox: просмотр поверх галереи ----------------------------------
  // Оверлей живёт внутри того же экрана и того же уровня истории (#gallery).
  // Открытие изображения добавляет ОДНУ запись (imageState), а листание ←/→
  // внутри открытого lightbox меняет её через replaceState — история не пухнет.
  // lg грузится только для открытого изображения: сначала показывается md
  // (обычно уже в кэше карточки), потом подменяется на lg; соседи — только ±1.
  const lightboxElement = document.getElementById("gallery-lightbox");
  const lightboxBackdrop = document.getElementById("lightbox-backdrop");
  const lightboxFrame = document.getElementById("lightbox-frame");
  const lightboxImage = document.getElementById("lightbox-img");
  const lightboxCounter = document.getElementById("lightbox-counter");
  const lightboxCategory = document.getElementById("lightbox-category");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");
  const lightboxCloseButton = document.getElementById("lightbox-close");

  let lightboxList = [];          // изображения текущего фильтра, порядок gallery.json
  let lightboxIndex = -1;         // индекс открытого изображения
  let lightboxVisible = false;    // оверлей показан
  let lightboxPushed = false;     // запись истории создали мы сами
  let lightboxReturnFocus = null; // куда вернуть фокус после закрытия
  let lightboxImageToken = 0;     // защита от гонок при быстром листании
  let lightboxHideToken = 0;
  const lightboxPreloaded = new Set();

  // Набор для листания — ровно то, что видно в галерее с текущим фильтром.
  function galleryVisibleImages() {
    return galleryCards.filter((entry) => !entry.card.hidden).map((entry) => entry.image);
  }

  function lightboxSetCaption(image) {
    if (!lightboxElement) return;
    const total = lightboxList.length;
    const position = lightboxIndex + 1;
    lightboxCounter.textContent = position + " / " + total;
    const category = galleryCategories.get(image.category);
    lightboxCategory.textContent = category || "";
    lightboxCategory.hidden = !category;
    // Подпись без имени файла: alt — только позиция в наборе.
    lightboxImage.alt = "Изображение " + position + " из " + total;
  }

  // Сначала md (он уже загружен карточкой), затем lg — подмена после декодирования.
  function lightboxSetImage(image) {
    if (!lightboxElement) return;
    const medium = image.files.md || image.files.sm;
    const large = image.files.lg || medium;
    const token = ++lightboxImageToken;
    lightboxImage.width = medium.w;
    lightboxImage.height = medium.h;
    lightboxImage.src = GALLERY_BASE + medium.path;
    if (large.path === medium.path) {
      lightboxPreloadNeighbours();
      return;
    }
    const probe = new Image();
    probe.decoding = "async";
    const swap = () => {
      if (token !== lightboxImageToken) return;
      lightboxImage.width = large.w;
      lightboxImage.height = large.h;
      lightboxImage.src = GALLERY_BASE + large.path;
      lightboxPreloadNeighbours();
    };
    probe.onload = () => {
      if (typeof probe.decode === "function") probe.decode().then(swap, swap);
      else swap();
    };
    probe.onerror = () => { if (token === lightboxImageToken) lightboxPreloadNeighbours(); };
    probe.src = GALLERY_BASE + large.path;
  }

  // Предзагрузка соседей — только ±1 и только по простою, без массовой загрузки lg.
  function lightboxPreloadNeighbours() {
    if (lightboxList.length < 2) return;
    const run = () => {
      for (const step of [1, -1]) {
        const count = lightboxList.length;
        const image = lightboxList[(lightboxIndex + step + count) % count];
        const large = image && image.files.lg;
        if (!large || lightboxPreloaded.has(large.path)) continue;
        lightboxPreloaded.add(large.path);
        const probe = new Image();
        probe.decoding = "async";
        probe.src = GALLERY_BASE + large.path;
      }
    };
    if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 1500 });
    else window.setTimeout(run, 300);
  }

  // mode: "push" — открытие по клику; "replace" — листание; "none" — Back/Forward и прямой заход.
  function lightboxShow(index, mode) {
    if (!lightboxElement || !lightboxList.length) return;
    const count = lightboxList.length;
    lightboxIndex = ((index % count) + count) % count;
    const image = lightboxList[lightboxIndex];
    lightboxSetImage(image);
    lightboxSetCaption(image);
    if (mode === "push") {
      history.pushState(imageState(image.id), "", imageHash(image.id));
      lightboxPushed = true;
    } else if (mode === "replace") {
      history.replaceState(imageState(image.id), "", imageHash(image.id));
      lightboxPushed = true;
    }
    if (!lightboxVisible) {
      lightboxVisible = true;
      lightboxHideToken++;
      lightboxElement.hidden = false;
      window.requestAnimationFrame(() => lightboxElement.classList.add("is-open"));
      if (lightboxCloseButton) lightboxCloseButton.focus({ preventScroll: true });
    }
    if (lightboxPrev) lightboxPrev.disabled = count < 2;
    if (lightboxNext) lightboxNext.disabled = count < 2;
  }
  // Открытие по id — используется popstate и прямым заходом на #gallery/<id>.
  function lightboxOpenById(id) {
    if (!id || !galleryCards.length) return;
    const list = galleryVisibleImages();
    const index = list.findIndex((image) => image.id === id);
    if (index < 0) return;
    lightboxList = list;
    if (lightboxVisible && lightboxList[lightboxIndex] && lightboxList[lightboxIndex].id === id) return;
    lightboxShow(index, "none");
  }

  function lightboxStep(delta) {
    if (!lightboxVisible || lightboxList.length < 2) return;
    lightboxShow(lightboxIndex + delta, "replace");
  }

  // mode: "back" — закрыть через историю (запись фото уходит из стека);
  //       "keep" — закрыть, не трогая историю (popstate, смена экрана).
  function lightboxClose(mode) {
    if (!lightboxElement || !lightboxVisible) {
      lightboxPushed = false;
      return;
    }
    if (mode === "back" && lightboxPushed) {
      // Закрытие завершится в popstate — история вернётся на #gallery.
      history.back();
      return;
    }
    // Записи фото в стеке нет (прямой заход): адрес приводим к #gallery сами.
    if (mode === "back") history.replaceState(levelState("gallery"), "", levelHash("gallery"));
    lightboxPushed = false;
    lightboxVisible = false;
    lightboxImageToken++;
    lightboxElement.classList.remove("is-open");
    const card = lightboxReturnFocus;
    lightboxReturnFocus = null;
    if (card && card.isConnected) card.focus({ preventScroll: true });
    const token = ++lightboxHideToken;
    window.setTimeout(() => {
      if (token !== lightboxHideToken) return;
      lightboxElement.hidden = true;
      lightboxImage.removeAttribute("src");
    }, 240);
  }

  if (lightboxElement) {
    if (lightboxBackdrop) lightboxBackdrop.addEventListener("click", () => lightboxClose("back"));
    if (lightboxCloseButton) lightboxCloseButton.addEventListener("click", () => lightboxClose("back"));
    if (lightboxPrev) lightboxPrev.addEventListener("click", () => lightboxStep(-1));
    if (lightboxNext) lightboxNext.addEventListener("click", () => lightboxStep(1));

    // Клавиатура: Esc закрывает, ←/→ листают. Работает только при открытом оверлее.
    document.addEventListener("keydown", (event) => {
      if (!lightboxVisible) return;
      if (event.key === "Escape") {
        event.preventDefault();
        lightboxClose("back");
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        lightboxStep(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        lightboxStep(1);
        return;
      }
      if (event.key !== "Tab") return;
      // Простой фокус-трап: модальное окно из трёх кнопок.
      const controls = [lightboxPrev, lightboxNext, lightboxCloseButton].filter((el) => el && !el.disabled);
      if (!controls.length) {
        event.preventDefault();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!lightboxElement.contains(document.activeElement)) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    });

    // Свайп влево/вправо по кадру (touch-action: none — браузер жест не забирает).
    let swipe = null;
    if (lightboxFrame) {
      lightboxFrame.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
      });
      lightboxFrame.addEventListener("pointerup", (event) => {
        if (!swipe || event.pointerId !== swipe.id) { swipe = null; return; }
        const dx = event.clientX - swipe.x;
        const dy = event.clientY - swipe.y;
        swipe = null;
        if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy)) return;
        lightboxStep(dx < 0 ? 1 : -1);
      });
      lightboxFrame.addEventListener("pointercancel", () => { swipe = null; });
    }
  }

  if (galleryGrid) {
    // Клик по карточке открывает lightbox поверх галереи (без новых страниц).
    galleryGrid.addEventListener("click", (event) => {
      const card = event.target.closest(".gcard");
      if (!card) return;
      const list = galleryVisibleImages();
      const index = list.findIndex((image) => image.id === card.dataset.galleryId);
      if (index < 0) return;
      lightboxList = list;
      lightboxReturnFocus = card;
      lightboxShow(index, "push");
    });
    // Пересчёт span при смене ширины колонок (границы auto-fill).
    if ("ResizeObserver" in window) {
      new ResizeObserver(galleryScheduleLayout).observe(galleryGrid);
    } else {
      window.addEventListener("resize", galleryScheduleLayout);
    }
  }

  // --- Восстановление уровня при загрузке/обновлении страницы ---------------
  // Прямое открытие …/#posik сразу показывает мир песни — без кроссфейда и без
  // ожидания TRANSITION_MS. После этого история синхронизируется с фактическим
  // уровнем, чтобы Back/Forward работали от правильной точки.
  const startKey = levelKeyFromHash() || "enter";
  const startScreen = screens[startKey] || screens.enter;
  // Прямой заход на #gallery/<id>: адрес сохраняем как есть, изображение
  // откроется после загрузки манифеста (см. galleryRender).
  const startImage = startKey === "gallery" ? imageIdFromHash() : null;
  if (startImage) {
    pendingGalleryImage = startImage;
    history.replaceState(imageState(startImage), "", imageHash(startImage));
  }
  if (startScreen !== active) applyScreen(startScreen);
  if (!startImage) history.replaceState(levelState(levelKeyOf(active)), "", levelHash(levelKeyOf(active)));
})();

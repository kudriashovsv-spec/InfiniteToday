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
  };

  const hole = document.getElementById("hole");
  const constellationPosik = document.getElementById("constellation");
  const constellationDream = document.getElementById("constellation-dream");
  const constellationSuns = document.getElementById("constellation-suns");
  const constellationHope = document.getElementById("constellation-hope");
  const constellationTime = document.getElementById("constellation-time");

  if (
    !screens.enter ||
    !screens.space ||
    !screens.posik ||
    !screens.dream ||
    !screens.suns ||
    !screens.hope ||
    !screens.time ||
    !hole ||
    !constellationPosik ||
    !constellationDream ||
    !constellationSuns ||
    !constellationHope ||
    !constellationTime
  ) {
    return;
  }

  // Длительность кроссфейда .screen из styles.css (--fade: 1300ms) плюс запас,
  // чтобы клик во время перехода не переключил экран раньше времени.
  const TRANSITION_MS = 1350;

  let active = screens.enter;
  let busy = false;

  function go(target) {
    if (busy || target === active) return;
    busy = true;

    for (const screen of Object.values(screens)) {
      const isTarget = screen === target;
      screen.classList.toggle("is-active", isTarget);
      screen.setAttribute("aria-hidden", String(!isTarget));
    }

    active = target;
    window.setTimeout(() => {
      busy = false;
    }, TRANSITION_MS);
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

  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = screens[button.dataset.back];
      if (target) go(target);
    });
  });

  // Мобильный Lvl2: карточки миров ведут в соответствующий Lvl3
  // (data-world = ключ экрана: posik / dream / suns / hope / time).
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
    audio.preload = "metadata";
    audio.src = src;

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
    let loadedSrc = src;
    function load(nextSrc, autoplay) {
      if (loadedSrc !== nextSrc) {
        loadedSrc = nextSrc;
        audio.src = nextSrc;
      }
      if (autoplay) {
        audio.currentTime = 0;
        const request = audio.play();
        if (request && typeof request.catch === "function") request.catch(() => {});
      }
      renderProgress();
    }

    toggle.addEventListener("click", () => {
      if (audio.paused) {
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

    bar.addEventListener("click", (event) => {
      const duration = audio.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * duration;
      renderProgress();
    });

    bar.addEventListener("keydown", (event) => {
      const duration = audio.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      if (event.key === "ArrowRight") {
        audio.currentTime = Math.min(duration, audio.currentTime + 5);
      } else if (event.key === "ArrowLeft") {
        audio.currentTime = Math.max(0, audio.currentTime - 5);
      } else {
        return;
      }
      renderProgress();
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
  document.querySelectorAll("[data-player]").forEach((root) => {
    const api = setupPlayer(root);
    if (api) playerApis.set(root, api);
  });

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
})();

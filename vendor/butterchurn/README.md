# vendor/butterchurn — production runtime для золотой библиотеки (10 пресетов)

Это production-часть сайта (в отличие от `dev/experiments/butterchurn-poc/`).

## Файлы

| Файл | Размер | Назначение |
|---|---|---|
| `butterchurn.min.js` | ≈ 188 KB | Butterchurn runtime (WebGL, MilkDrop-совместимый) |
| `version-registry.js` | ≈ 4.6 KB | реестр канонических версий: путь MP3 → `version_id` (49 путей / 40 версий) |
| `preset-library.json` | ≈ 2 KB | manifest золотой десятки: id, короткое имя, точное имя, `src` |
| `presets/<id>.js` | 1.3–10 KB каждый | по одному пресету на файл; грузится только при выборе |

Все 10 пресетов — общая библиотека для ВСЕХ канонических версий: нет привязки
«песня → свой пресет». Порядок ключей 1–9 / 0 совпадает с порядком в
`preset-library.json`:

```
1 3layers        Geiss - 3 layers (Tunnel Mix)
2 planet1        Geiss - Planet 1
3 starornament   Zylot - Star Ornament
4 mandala        Phat+fiShbRaiN+Eo.S_Mandala_Chasers_remix
5 fractaldrop    Rovastar + Loadus + Geiss - Tone-mapped FractalDrop 7c
6 infinity       martin - infinity (2010 update)
7 ludicrous      martin - ludicrous speed
8 angel          martin - angel flight
9 skylight       Eo.S. + Zylot - skylight (Stained Glass Majesty mix)
10 hyperkaleido  Rovastar + Geiss - Hyperkaleidoscope Glow 2 motion blur (Jelly)
```

Полные наборы из 245 пресетов (`butterchurnPresets`, `butterchurnPresetsExtra`,
`butterchurnExtraImages`) здесь намеренно НЕ лежат — они остаются research-материалом
в `dev/experiments/butterchurn-poc/vendor/` и в браузер не попадают.

## Сессия (один визуализатор на всё)

`audio-dna-butterchurn.js` держит одну сессию на страницу, и она живёт только в
мирах песен (Lvl3):

* один `AudioContext`;
* один `Butterchurn`-визуализатор и один `<canvas class="audio-dna">`;
* по одному `MediaElementSource` на каждый реально открытый `<audio>`
  (Web Audio разрешает его только один раз на элемент);
* canvas и подпись со стрелками живут только в `.screen--song` — на Lvl1
  (библиотека) и Lvl2 (карта) визуализатор не подключается вообще;
* старая версия не копит контексты/канвасы — всё переиспользуется.

Жизненный цикл при уходе с Lvl3 (Back, любой переход):

1. `cancelAnimationFrame` — цикл рендера останавливается;
2. canvas отсоединяется от DOM (`remove()`), controls тоже — визуально на
   Lvl1/Lvl2 остаётся ровно 0 canvas и 0 видимого DNA;
3. источники звука отключаются от визуализатора и диагностического анализа;
4. анализатор освобождается;

при следующем входе в мир тот же canvas-элемент и тот же визуализатор
возвращаются в DOM нужного `.screen--song` (один WebGL-контекст на всю
сессию), источник подключается к анализу снова. `AudioContext` и
`MediaElementSource` не пересоздаются — они держат слышимый маршрут.

## Уровни

| Экран | Butterchurn |
|---|---|
| Lvl1 — библиотека | **нет**: ни canvas в DOM, ни AudioContext, ни рендера — даже после play |
| Lvl2 — карта миров | **нет** |
| Lvl3 — мир версии песни | **да**: 1 видимый canvas на `<audio>` этой версии, пресет из золотой десятки |

`attach()` создаёт биндинг только для плееров внутри `.screen--song`. Play
трека в библиотеке просто играет музыку — визуализатора там нет.

## Какие версии подключены

`version-registry.js` генерируется из `music_catalog.json`
(`dev/build/build-version-registry.mjs`):

* 40 канонических версий (`versions[].audio_file`);
* их полные дубликаты (`duplicate_paths`) относятся к ТОЙ ЖЕ `version_id` —
  часть Lvl3-плееров ссылается именно на корневые копии;
* `excluded_files` (обрезанный `assets/music/Дети Солнц Indietronica.mp3`)
  в реестр НЕ попадают;
* отдельных версий для дубликатов не создаётся.

Итого 49 путей → 40 версий.

## Ленивая загрузка

При старте сайта не грузятся ни `butterchurn.min.js`, ни `preset-library.json`,
ни пресеты, ни аудио. `version-registry.js` — единственное, что нужно
синхронно (крошечный список путей, он подключён в `index.html`).

Runtime и manifest подгружаются при ПЕРВОМ открытии мира песни (Lvl3),
пресет — только выбранный, остальные 9 не грузятся. В библиотеке (Lvl1) не
грузится ничего из этого: там визуализатора нет. Аудио и фон — только нужной
версии/мира.

## Случайный выбор и ручное переключение

При открытии версии берётся следующий пресет из общей shuffle-bag очереди
(перетасовка 10 → проход по одному → новая перетасовка). Вручную:
клавиши `1–9` / `0` и `←` / `→` на десктопе, кнопки `‹` / `›` на мобильном.
Пресет остаётся активным до ручного переключения или выхода из версии.

## Как перегенерировать

Генераторы лежат в отслеживаемом `dev/build/` (не в gitignore):

```
node dev/build/build-preset-library.mjs     # preset-library.json + presets/<id>.js
node dev/build/build-version-registry.mjs   # version-registry.js из music_catalog.json
```

Проверка production (без скриншотов):

```
node dev/measure-audio-dna-levels.mjs      # правила уровней: Lvl1/Lvl2 без визуализатора, Lvl3 с ним
node dev/measure-audio-dna-versions.mjs    # все 40 версий: звук есть, визуализатора в библиотеке нет + миры
```

## Источник и лицензия

Butterchurn и наборы пресетов распространяются под MIT (проект `jberg/butterchurn`).
Файлы минифицированы как есть, без модификаций.

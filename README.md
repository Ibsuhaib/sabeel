# Sabeel — سَبِيل

**Quran · Hadith · Prayer · Dua. Free forever, no ads, no account, works offline.**

A *sabeel* is the free public water station put up for travellers and paid for as sadaqah.
Useful, given away, expecting nothing back. That is what this app is meant to be.

---

## Download

**[Download sabeel.apk for Android](https://github.com/Ibsuhaib/sabeel/releases/download/latest/sabeel.apk)** — or see [all releases](https://github.com/Ibsuhaib/sabeel/releases).

That link always points at the newest build; every push to `main` replaces it.
(It addresses the tag named `latest` directly. The `releases/latest/download/`
form looks equivalent and is not: GitHub resolves "latest release" by skipping
pre-releases, and this one is marked as such, so that URL 404s.)
Open the file on your phone and Android will ask, the first time, whether to
allow installing from your browser or file manager — it says that because the
app does not come from the Play Store, not because anything is wrong with it.
It is debug-signed for the same reason, so Android will also call the developer
unknown until the project has a release keystore.

Everything is inside the app: the Quran with the muṣḥaf page layout, all 36,104
hadith, the duas, prayer calculation, the adhan and the fonts. Only recitation
streams, and whatever you play is kept on the device.

There is nothing to install for the web version — open it in a browser and use
*Add to Home Screen*.

Sabeel collects nothing: no account, no analytics, no tracking, no server.
See [PRIVACY.md](PRIVACY.md).

---

## Founding principles

These are not marketing copy. They are constraints on what may be merged.

1. **No ads, ever.** No tracking, no analytics SDKs, no data sold.
2. **No account required** for anything.
3. **Works fully offline** after the first load.
4. **Open source**, MIT licensed.
5. **Every text shows its source.** Every hadith shows its grading and the grader's name.
6. **The Arabic text of the Quran is never generated, altered, or passed through any AI model.**

A pull request that breaks any of the six will not be merged, however good the feature is.

---

## What is in it today

| Area | Shipped |
|---|---|
| **Quran** | Full Uthmani (Hafs) text · Saheeh International + The Clear Quran · transliteration · **two reading modes: scrolling, or the 604-page Madani muṣḥaf** · bookmarks, private notes, last-read resume · surah, juz and page navigation · sajdah markers · 3 Arabic faces, adjustable size and line height |
| **Recitation** | **42 reciters, including 8 imams of Masjid al-Haram and 4 of Masjid an-Nabawi** · persistent player that keeps going while you browse · pause, previous/next ayah, seek · **A→B ayah-range looping** · repeat 2×–∞ · speed 0.5×–2× · switch reciter mid-playback without losing your place |
| **Hadith** | 36,104 narrations across 10 collections — the Kutub as-Sittah plus Muwatta Malik, 40 Nawawi, 40 Qudsi, 40 Shah Waliullah · Arabic + English · **grading with the grader named on every narration that has one** · full provenance · **look up any narration by reference (“bukhari 1302”)** · per-collection offline download |
| **Notifications** | Adhan, chime or silent — your choice, per prayer · **a separate Fajr adhan**, because the Fajr call carries the tathwīb · the notification holds on screen until you have seen it · optional “prayer is in N minutes” reminder · vibration · load your own recording for either slot (stays on your device) · a test button and per-manufacturer guidance, because OEM battery managers are what actually break prayer alerts |
| **Android app** | Capacitor project committed; prayers scheduled through Android's alarm manager so they fire in Doze, sound the adhan, and stay in the shade until dealt with · one notification channel per sound, with Fajr on its own · `npm run android:apk` once a JDK and the Android SDK are installed |
| **Khatm planner** | Finish the Quran by a date — Ramadan (real Umm al-Qura dates), a preset, or any number of days · today's target adapts to what is left rather than nagging you with a fixed number · progress ring on Home |
| **Offline** | Anything you play is kept automatically · download a surah or the whole Quran per reciter, with real sizes shown first · storage figures and per-reciter deletion · asks Android to keep downloads permanently |
| **Prayer** | On-device calculation (adhan-js), 13 methods, Hanafi/Shafi'i Asr, 3 high-latitude rules, per-prayer offsets · **"Why these times"** sheet showing every parameter used · next-prayer countdown · sunnah windows (duha, last third) · prayer tracker with heatmap, streaks and qada count · monthly printable timetable · qibla compass |
| **Dua** | 97 supplications across 5 categories, each with Arabic, transliteration, English **and its source** · morning/evening adhkar with per-dua counters · 99 Names of Allah · tasbih with haptics |
| **Tools** | Unified search across Quran + hadith + dua in one box · Hijri calendar with fasts and events · zakat calculator with both nisab bases · full data export/import |
| **Comfort** | Light, dark, sepia and OLED-black themes · dyslexia-friendly translation font · full offline PWA · installable on Android and iOS |

### Not built yet — and the app says so

Tafsir · word-by-word morphology · the Root Atlas and Coverage Engine · tajweed colouring ·
hifz spaced repetition · masjid iqamah times · languages beyond English · adhan notifications.
These are planned. Nothing in the app pretends they exist.

Two honest limits worth stating plainly:

- **Muṣḥaf page mode** shows the real 604-page Madani pagination — the right ayahs on the right
  page — but line breaks follow the text flow at your chosen font size, not the printed muṣḥaf's
  exact line endings. Matching those requires the page-specific KFGQPC (QCF) fonts, one per page,
  which are not yet bundled.
- **No Masjid al-Aqsa reciter.** Neither EveryAyah nor mp3quran carries a complete Quran recorded
  by an imam of al-Aqsa. Rather than label someone else as an Aqsa reciter, the app leaves that
  empty and says so on the reciter screen.
- **Notifications when the app is fully closed** depend on the browser. Where the Notification
  Triggers API exists, prayer times are handed to the operating system and fire without Sabeel
  running. Where it does not, notifications are reliable while Sabeel is open or backgrounded, and
  anything missed is shown when you next open it. A closed PWA cannot play a three-minute adhan —
  that would need a push server, which would mean a backend and your prayer times leaving your
  phone. The app states which behaviour you are getting rather than implying the stronger one.

---

## Install it on Android

Grab the APK from the [Releases page](../../releases), or from the
[Android APK workflow](../../actions/workflows/android.yml) — open the most recent run and
download `sabeel-apk` under Artifacts. Open the `.apk` on your phone and allow installing from
your browser when asked, since this is not distributed through the Play Store.

That build is **fully offline**. The Quran, all 36,104 hadith, the duas, prayer calculation, the
Arabic fonts and the adhan are all inside the app — roughly 81 MB of data baked in. Only
recitation streams, and anything you play is kept on the device afterwards.

To build it yourself you need a JDK and the Android SDK:

```bash
npm run android:apk      # builds dist, syncs Capacitor, runs gradle
```

## Running it

```bash
npm install
npm run data:all      # fetches every dataset, builds indexes, verifies integrity (~5 min)
npm run dev
```

`npm run data:all` is required on a fresh clone — the hadith corpus (73 MB) is not in git.
Everything else is committed, so if you only want to work on the Quran or prayer side you can
skip straight to `npm run dev`.

### The data pipeline

```
scripts/
  fetch-quran.mjs        → 114 surah files + meta.json          (4.1 MB, committed)
  fetch-hadith.mjs       → 10 collections chunked per book      (73 MB, gitignored)
  fetch-dua.mjs          → 5 dua categories + the 99 Names      (105 KB, committed)
  build-search-index.mjs → unified lowercase search indexes
  fetch-fonts.mjs        → self-hosted Arabic woff2 + fonts.css
  make-icons.mjs         → app icons, generated with zero deps
  verify-integrity.mjs   → the gate, see below
```

Run them locally, commit what is committable, ship it. Every runtime query is a local lookup.

### Integrity gate

`npm run data:verify` fails the build if:

- any surah's ayah count differs from the **canonical Hafs numbering**, hardcoded in the script
  independently of whatever the upstream API returns;
- the total is not exactly 6,236 ayahs across 114 surahs;
- any ayah has empty Arabic text;
- the SHA-256 of any surah's Arabic text differs from `scripts/checksums.json`;
- a Sunan collection drops below 95% grading coverage.

One wrong letter in the muṣḥaf is a serious matter. This is the mechanism that catches it.

---

## Architecture — why "free forever" is actually possible

**Offline-first PWA. No backend. No database. No server bill.**

- All Quran, hadith and dua data ships as static JSON and is cached by the service worker.
- Recitation streams from EveryAyah and is cached on play — we never host a gigabyte of mp3.
- Prayer times are computed on-device. No API call; it works on a plane.
- Everything the user creates lives in IndexedDB on their phone. Sync, if it is ever added, is
  a JSON file the user exports and carries themselves.

Total running cost: **a domain**. Hosting is a free static tier. The only other money is the
one-time Google Play registration and the Apple Developer Program if it ships to iOS.

**Bundle:** 248 KB JS (80 KB gzipped), 887 KB precached including three Arabic typefaces.

---

## Handling hadith responsibly

This is where an app like this can do real damage if it is careless.

- **Never display a hadith without its grading and the grader's name.** Gradings differ between
  scholars — al-Albani, Shu'ayb al-Arna'ut and Zubayr Ali Zai do not always agree, so where the
  source carries several, all of them are shown.
- **Bukhari and Muslim are handled differently** from the Sunan collections. They carry a
  collection-level note; the Sunan carry per-hadith gradings, because they contain authentic,
  good and weak narrations together.
- **No AI-generated tafsir, fatwa or explanation. No "Ask an Imam" feature.** Not one line.
- **Where the madhahib differ**, both positions are shown and labelled. Never one as *the* answer.
- **A qualified scholar has not yet reviewed this content.** Until one has, that is stated
  plainly rather than glossed over.

---

## Contributing

Translators, reviewers and anyone who can spot an error in a text are more valuable here than
feature work. If you find a mistake in any ayah, translation, grading or prayer time, open an
issue — corrections are published in a public log.

See [DATA_LICENCES.md](DATA_LICENCES.md) before adding any new text source. The licence of a
*translation* is almost never the same as the licence of the Arabic it translates, and that is
the most likely legal problem this project will hit.

---

## Licence

Code: [MIT](LICENSE).
Data: **not MIT** — each source keeps its own terms. See [DATA_LICENCES.md](DATA_LICENCES.md).

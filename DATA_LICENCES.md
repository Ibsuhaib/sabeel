# Data licences

The **code** in this repository is MIT. The **data** is not, and cannot be — the Quran text,
the translations, the hadith translations and the fonts each arrive with their own terms.
Conflating them is the single most likely way this project gets pulled from an app store.

This file records, for every dataset shipped or fetched, where it came from and what is known
about its terms. **Read this before adding a new source.**

---

## Status key

| | Meaning |
|---|---|
| ✅ | Terms are clear and permit redistribution in this form |
| ⚠️ | Redistributed in practice and widely so, but the rights position has not been confirmed in writing with the rights holder |
| ❌ | Must not be shipped |

---

## Quran — Arabic text

| Item | Source | Status | Notes |
|---|---|---|---|
| Uthmani (Hafs) text | `fawazahmed0/quran-api`, edition `ara-quranuthmanihaf`, served via jsDelivr | ⚠️ | The repository carries a public-domain dedication. The underlying text derives from Tanzil, whose terms require **unmodified** redistribution with attribution. We redistribute it byte-for-byte and verify that with checksums, which satisfies the substantive Tanzil condition. **Action: confirm the provenance chain with Tanzil in writing before a store release.** |

The Arabic text is never altered, re-encoded, normalised or passed through any model.
`scripts/verify-integrity.mjs` pins a SHA-256 of every surah's Arabic and fails the build on drift.

## Quran — translations

| Item | Translator | Status | Notes |
|---|---|---|---|
| Saheeh International | Umm Muhammad (Emily Assami, Mary Kennedy, Amatullah Bantley) | ⚠️ | Copyright Abul-Qasim Publishing House / Al-Muntada al-Islami. Distributed freely and very widely in Islamic software, but this is **permission by convention, not by licence.** Action: seek written permission, or be prepared to swap it. |
| The Clear Quran | Dr. Mustafa Khattab | ⚠️ | Copyright the translator; free non-commercial distribution is permitted in practice. Action: confirm in writing. |
| Transliteration | `ara-quran-la1` | ✅ | Mechanical Latin transliteration, no meaningful authorship claim. |

**Safe fallback if either translation must be dropped:** Pickthall (`eng-mohammedmarmadu`) and
Yusuf Ali (`eng-yusufaliorig`) are both out of copyright in most jurisdictions. They are dated
English, but they are unambiguously free. The pipeline can swap an edition by changing one line
in `scripts/fetch-quran.mjs`.

## Hadith

| Item | Source | Status | Notes |
|---|---|---|---|
| Arabic text, all 10 collections | `fawazahmed0/hadith-api` | ✅ | The Arabic of these collections is centuries out of copyright. |
| English translations, all 10 collections | same | ⚠️ | **This is the highest-risk item in the repository.** Some English renderings circulating in open datasets trace back to Darussalam editions, which are firmly in copyright. The upstream repository carries a public-domain dedication, but a dedication cannot grant rights the dedicator does not hold. Action: audit a sample against known Darussalam text before any store release, and be ready to substitute. |
| Gradings | same | ✅ | A grading is a short factual attribution ("Sahih — al-Albani"), not a creative work. |

Collections shipped: Sahih al-Bukhari, Sahih Muslim, Sunan Abi Dawud, Jami' at-Tirmidhi,
Sunan an-Nasa'i, Sunan Ibn Majah, Muwatta Malik, 40 Hadith Nawawi, 40 Hadith Qudsi,
40 Hadith Shah Waliullah ad-Dehlawi.

## Dua and adhkar

| Item | Source | Status | Notes |
|---|---|---|---|
| Arabic, transliteration, English, source attribution | `fitrahive/dua-dhikr` | ✅ | Open dataset. The Arabic is public domain; the English renderings are short functional translations of well-known supplications and carry their source reference with them. |
| 99 Names of Allah | Aladhan API `asmaAlHusna` | ✅ | Free public API, no key. Names are Quranic; the one-line English meanings are functional. |

## Prayer times

| Item | Source | Status | Notes |
|---|---|---|---|
| `adhan` (adhan-js) | Batoul Apps | ✅ | **MIT.** Runs entirely on device; no network call is ever made for a prayer time. |
| Hijri calendar | `Intl` `islamic-umalqura` | ✅ | Platform built-in. No library, no data file, nothing to licence. |

## Audio

| Item | Source | Status | Notes |
|---|---|---|---|
| Per-ayah recitation, 39 reciters | EveryAyah.com | ⚠️ | Streamed directly from EveryAyah; **we do not host, rehost or bundle any audio.** Files are cached on the user's own device by the service worker after they play them, the same as any browser cache. Action: if the app ever bundles audio for offline packs, that needs explicit permission first. |
| Full-surah recitation, 3 reciters | mp3quran.net | ⚠️ | Same arrangement: streamed from their servers, never rehosted. Used only for imams whose complete muṣḥaf is not published ayah by ayah anywhere — currently Bandar Balilah and Abdullah Khayyat of Masjid al-Haram. Action: confirm they are content with the traffic before any large launch. |

## Adhan (notification sound)

| Item | Source | Status | Notes |
|---|---|---|---|
| Adhan by Aaqib Azeez | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3) | ✅ | **CC BY-SA 4.0**, uploaded as own work. Downloaded at build time and self-hosted so the adhan still sounds with no signal. Attribution is shown in the app on the notification settings screen, as the licence requires. |

**A warning for anyone adding another adhan.** Adhan audio is the easiest place in this project
to ship something you have no right to. While looking for a recording, `cdn.aladhan.com/audio/adhans/a3.mp3`
— served as an adhan — turned out to carry an ID3 tag identifying it as *"Call To Prayers"* from
**Karl Jenkins' "The Armed Man: A Mass For Peace" (2001)**, a copyrighted classical work, and the
other files in that folder carry no identifying tags at all. A second candidate on Commons,
"Call to prayer by Sabah Fakhry", is marked public domain but credited to YouTube, which is not a
claim that can be relied on for a famous singer's recording. Neither is shipped.

Rule for this directory: **a recording ships only if its licence is stated somewhere checkable and
its author is identified.** Users who want a particular muadhdhin can load their own file, which
never leaves their device.

### The Fajr adhan is a different recording

The Fajr call adds the tathwīb — *aṣ-ṣalātu khayrun min an-nawm*, "prayer is better than sleep" —
after the two *ḥayya ʿala-l-falāḥ*. A standard recording used for Fajr is simply the wrong adhan.
The app therefore has two independent adhan slots and an Android notification channel for each.

No Fajr-specific recording with a checkable licence has been found yet, so the Fajr slot currently
offers the same built-in recording and, more usefully, its own "load your own file" option. If you
find a freely-licensed Fajr adhan, open an issue — it is a one-line addition to
`scripts/fetch-adhan.mjs` (`type: 'fajr'`).

### Searched and rejected

| Source | Why not |
|---|---|
| `cdn.aladhan.com/audio/adhans/` | `a3.mp3` is tagged as Karl Jenkins' "The Armed Man" (2001), copyrighted; the rest carry no identifying tags at all |
| `islamcan.com/audio/adhan/` | Twelve files, no muadhdhin named in any of them, no licence stated |
| "Call to prayer by Sabah Fakhry" (Commons) | Marked public domain but credited to YouTube — not a claim to rely on for a named singer's recording |
| Hassan II Mosque adhan (Commons) | Genuinely CC BY-SA 4.0, but a 30 MB WAV; needs transcoding before it can ship |

## Fonts

| Item | Source | Status | Notes |
|---|---|---|---|
| Amiri Quran | Khaled Hosny | ✅ | SIL Open Font License 1.1 — redistribution and embedding permitted. |
| Scheherazade New | SIL International | ✅ | SIL Open Font License 1.1. |
| Noto Naskh Arabic | Google | ✅ | SIL Open Font License 1.1. |

Downloaded at build time by `scripts/fetch-fonts.mjs` and self-hosted, so the running app makes
no request to Google Fonts and leaks no user IP addresses to a third party.

---

## A note on Masjid al-Aqsa

Neither archive carries a complete Quran recorded by an imam of Masjid al-Aqsa. The app states
this on the reciter screen and deliberately leaves that category empty rather than labelling
another reciter as an Aqsa imam — a small inaccuracy of that kind is exactly the sort of thing
that erodes trust. If an authentic complete recording exists and can be used, open an issue.

## Before a store release

- [ ] Confirm the Tanzil provenance chain for the Uthmani text in writing.
- [ ] Get written permission for Saheeh International, or swap to Pickthall.
- [ ] Get written permission for The Clear Quran, or drop it.
- [ ] Audit the hadith English against Darussalam editions; substitute anything that matches.
- [ ] Confirm EveryAyah is happy with streaming at the volume this app would generate.
- [ ] Have a qualified scholar review the hadith module and the fiqh content, and name them in
      the app.

Items marked ⚠️ are shipped in good faith on the same basis as dozens of existing Islamic apps.
That is an explanation, not a legal opinion. If a rights holder objects to any text here, it
will be removed immediately — open an issue and it will be handled.

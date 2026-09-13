import { Screen, Header, Card, Section } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

const PRINCIPLES = [
  'No ads, ever. No tracking, no analytics, no data sold.',
  'No account required for anything.',
  'Works fully offline after the first load.',
  'Open source, MIT licensed.',
  'Every text shows its source. Every hadith shows its grading.',
  'The Arabic text of the Quran is never generated, altered, or passed through any AI model.'
]

const SOURCES = [
  { what: 'Quran, Uthmani (Hafs)', who: 'Tanzil-derived text via the open Quran API', note: 'Verified: 114 surahs, 6,236 ayahs, checksummed at build time' },
  { what: 'Saheeh International', who: 'Umm Muhammad (Emily Assami, Mary Kennedy, Amatullah Bantley)', note: 'English translation' },
  { what: 'The Clear Quran', who: 'Dr. Mustafa Khattab', note: 'English translation' },
  { what: 'Hadith collections', who: 'Open hadith API — Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa’i, Ibn Majah, Malik, Nawawi, Qudsi, Dehlawi', note: '36,512 narrations with gradings' },
  { what: 'Dua and adhkar', who: 'fitrahive/dua-dhikr', note: 'Arabic, transliteration, English, with source attribution' },
  { what: '99 Names', who: 'Aladhan asma al-husna', note: 'Arabic, transliteration, English meaning' },
  { what: 'Prayer times', who: 'adhan-js by Batoul Apps', note: 'MIT — computed on device, no network' },
  { what: 'Recitation, per ayah', who: 'EveryAyah.com', note: '39 reciters — ayah repeat and range looping work with these' },
  { what: 'Recitation, full surah', who: 'mp3quran.net', note: 'Imams whose muṣḥaf is only published surah by surah' },
  { what: 'Adhan for notifications', who: 'Aaqib Azeez, via Wikimedia Commons', note: 'CC BY-SA 4.0 — or use your own file, which never leaves your device' },
  { what: 'Arabic fonts', who: 'Amiri Quran, Scheherazade New, Noto Naskh Arabic', note: 'SIL Open Font License' }
]

export default function About() {
  return (
    <Screen>
      <Header title="About Sabeel" back />

      <div className="px-4 pt-6 text-center">
        <div className="ar text-brand" style={{ textAlign: 'center', fontSize: 40 }}>سَبِيل</div>
        <p className="text-sm text-muted mt-3 leading-relaxed px-4">
          A <em>sabeel</em> is the free water station put up for travellers and paid for as
          sadaqah. Useful, given away, expecting nothing back. That is what this app is meant
          to be.
        </p>
      </div>

      <Section title="Founding principles">
        <Card className="mx-4 divide-y divide-line">
          {PRINCIPLES.map((p, i) => (
            <div key={i} className="flex gap-3 px-4 py-3">
              <span className="text-brand shrink-0 mt-0.5"><Icon name="check" size={15} /></span>
              <p className="text-[13px] leading-relaxed">{p}</p>
            </div>
          ))}
        </Card>
      </Section>

      <Section title="How hadith are handled">
        <Card className="mx-4 p-4 space-y-3 text-[13px] leading-relaxed text-muted">
          <p>
            <strong className="text-ink">Every narration shows its grading and the scholar who gave it.</strong>{' '}
            Gradings differ between scholars — al-Albani, Shu'ayb al-Arna'ut, Zubayr Ali Zai and
            others do not always agree. Where our sources carry several, you see them all.
          </p>
          <p>
            <strong className="text-ink">Bukhari and Muslim are treated differently.</strong>{' '}
            Both are accepted in their entirety by the scholars of hadith, so they carry a
            collection-level note rather than a per-hadith grade. The Sunan collections contain
            authentic, good and weak narrations together, and every one shows its own grading.
          </p>
          <p>
            <strong className="text-ink">There is no AI in the religious content.</strong>{' '}
            No generated tafsir, no generated explanation, no "ask an imam" feature. The fastest
            way to give someone a wrong ruling on a real-life matter is to let a model answer it.
          </p>
          <p>
            <strong className="text-ink">Where schools differ, both are shown.</strong>{' '}
            The Asr madhab setting is a choice you make, not one the app makes for you.
          </p>
        </Card>
      </Section>

      <Section title="Where the texts come from">
        <Card className="mx-4 divide-y divide-line">
          {SOURCES.map(s => (
            <div key={s.what} className="px-4 py-3">
              <p className="text-[13px] font-medium">{s.what}</p>
              <p className="text-[11px] text-muted mt-0.5">{s.who}</p>
              <p className="text-[11px] text-muted/70 mt-0.5">{s.note}</p>
            </div>
          ))}
        </Card>
        <p className="text-[11px] text-muted px-6 mt-2 leading-relaxed">
          Licences for every source are listed in DATA_LICENCES.md in the repository. Translations
          are used under the terms their publishers allow; if a rights holder objects to any text
          here, it will be removed.
        </p>
      </Section>

      <Section title="Found an error?">
        <Card className="mx-4 p-4">
          <p className="text-[13px] text-muted leading-relaxed">
            One wrong letter in the muṣḥaf is a serious matter. The Arabic text is checksummed at
            build time against a pinned reference and the ayah count of every surah is verified
            against the canonical Hafs numbering.
          </p>
          <p className="text-[13px] text-muted leading-relaxed mt-3">
            If you find a mistake in any text, translation, grading or prayer time, please open an
            issue on the repository. Corrections are published in a public log.
          </p>
          <a
            href="https://github.com/Ibsuhaib/sabeel/issues/new"
            target="_blank" rel="noopener noreferrer"
            className="tap inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl bg-surf border border-line text-sm"
          >
            <Icon name="flag" size={15} />Report an error
          </a>
        </Card>
      </Section>

      <Section title="Not yet built">
        <Card className="mx-4 p-4">
          <p className="text-[13px] text-muted leading-relaxed">
            Sabeel is honest about what it does not have yet: tafsir, word-by-word morphology,
            the Root Atlas and coverage tracking, tajweed colouring, hifz spaced repetition,
            masjid iqamah times, and languages beyond English. These are planned, not shipped.
            Nothing in the app pretends otherwise.
          </p>
          <p className="text-[13px] text-muted leading-relaxed mt-3">
            <strong className="text-ink">Muṣḥaf page mode</strong> uses the real 604-page Madani
            pagination — the right ayahs on the right page — but line breaks follow the text flow
            at your chosen size rather than the printed muṣḥaf's exact line endings. Matching those
            needs the page-specific KFGQPC fonts, which are not yet bundled.
          </p>
          <p className="text-[13px] text-muted leading-relaxed mt-3">
            <strong className="text-ink">There is no Masjid al-Aqsa reciter.</strong> No complete
            Quran recorded by an imam of al-Aqsa exists in the open recitation archives. Rather than
            label someone else as an Aqsa reciter, that space is left empty.
          </p>
          <p className="text-[13px] text-muted leading-relaxed mt-3">
            <strong className="text-ink">Notifications with the app fully closed</strong> depend on
            the browser. Where it supports scheduled notifications, prayer times are handed to the
            operating system and arrive without Sabeel running. Where it does not, they are reliable
            while Sabeel is open or in the background, and anything missed is shown when you next
            open it. Guaranteeing more would need a push server — a backend, and your prayer times
            leaving your phone.
          </p>
        </Card>
      </Section>

      <p className="text-[11px] text-muted/60 text-center px-10 mt-8 mb-4 leading-relaxed">
        Built as sadaqah jariyah. If it benefits you, make dua for whoever wrote it and for
        everyone whose work it is built on.
      </p>
    </Screen>
  )
}

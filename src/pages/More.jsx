import { Screen, Header, Card, Section, Row } from '../components/ui.jsx'
import { useSettings } from '../lib/settings.jsx'
import { hijri } from '../lib/hijri.js'

export default function More() {
  const { settings } = useSettings()
  const h = hijri(new Date(), settings.hijriOffset)

  return (
    <Screen>
      <Header title="More" subtitle={h.formatted} large />

      <Section title="Worship">
        <Card className="mx-4 divide-y divide-line overflow-hidden">
          <Row icon="compass" title="Qibla" subtitle="Direction of the Kaaba from where you are" to="/qibla" />
          <Row icon="chart" title="Prayer tracker" subtitle="Monthly heatmap, streaks and qada count" to="/tracker" />
          <Row icon="calendar" title="Monthly timetable" subtitle="Printable prayer times for the month" to="/prayer/timetable" />
          <Row icon="counter" title="Tasbih" subtitle="Counter with haptics and targets" to="/dua/tasbih" />
        </Card>
      </Section>

      <Section title="Tools">
        <Card className="mx-4 divide-y divide-line overflow-hidden">
          <Row icon="calendar" title="Hijri calendar" subtitle="Islamic dates, fasts and events" to="/calendar" />
          <Row icon="calc" title="Zakat calculator" subtitle="Nisab, assets and what is due" to="/zakat" />
          <Row icon="search" title="Unified search" subtitle="Quran, hadith and dua in one box" to="/search" />
          <Row icon="book" title="Muṣḥaf page view" subtitle="Read the 604-page Madani layout" to="/mushaf/1" />
          <Row icon="hadith" title="Hadith by reference" subtitle="Look up a narration by its number" to="/hadith/lookup" />
          <Row icon="star" title="99 Names of Allah" subtitle="Asma ul-Husna with meanings" to="/dua/names" />
        </Card>
      </Section>

      <Section title="Yours">
        <Card className="mx-4 divide-y divide-line overflow-hidden">
          <Row icon="bookmark" title="Saved" subtitle="Bookmarked ayahs, hadith and notes" to="/bookmarks" />
          <Row icon="settings" title="Settings" subtitle="Location, madhab, method, theme, data" to="/settings" />
        </Card>
      </Section>

      <Section title="About">
        <Card className="mx-4 divide-y divide-line overflow-hidden">
          <Row icon="info" title="About Sabeel" subtitle="Principles, sources, licences, corrections" to="/about" />
        </Card>
      </Section>

      <p className="text-[11px] text-muted/70 text-center px-10 mt-8 leading-relaxed">
        Sabeel is free forever. No ads, no tracking, no account, no data collected.
        Built as sadaqah jariyah.
      </p>
    </Screen>
  )
}

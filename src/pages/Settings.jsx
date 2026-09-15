import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../lib/settings.jsx'
import { METHODS, HIGH_LAT_RULES, POLAR_RULES, PRAYERS } from '../lib/prayer.js'
import { loadReciters, findReciter } from '../lib/reciters.js'
import { ReciterList } from '../components/Player.jsx'
import { store } from '../lib/store.js'
import { hijri } from '../lib/hijri.js'
import { Screen, Header, Card, Section, Toggle, Choice, Button, Sheet, Stepper } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { ICON_STYLES } from '../lib/iconStyles.js'
import { locate as getFix, describeAccuracy } from '../lib/locate.js'

export default function Settings() {
  const { settings, set, setAdjustment, reset } = useSettings()
  const [sheet, setSheet] = useState(null)
  const [msg, setMsg] = useState(null)
  const fileRef = useRef(null)
  const nav = useNavigate()
  const [catalogue, setCatalogue] = useState(null)

  useEffect(() => { loadReciters().then(setCatalogue) }, [])

  async function exportData() {
    const payload = await store.exportAll()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sabeel-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg('Backup downloaded. Keep it somewhere safe — it is the only copy.')
  }

  async function importData(file) {
    try {
      const payload = JSON.parse(await file.text())
      await store.importAll(payload)
      setMsg('Backup restored. Reopen the app to see everything.')
    } catch (e) {
      setMsg(`Could not read that file: ${e.message}`)
    }
  }

  function useMyLocation() {
    setMsg('Locating…')
    getFix()
      .then(loc => set({ location: loc }))
      .catch(e => setMsg(e.message))
      .then(() => setMsg(m => (m === 'Locating…' ? null : m)))
  }

  const method = METHODS.find(m => m.id === settings.method)
  const h = hijri(new Date(), settings.hijriOffset)

  return (
    <Screen>
      <Header title="Settings" back />

      {msg && (
        <div className="px-4 pt-3">
          <Card className="px-4 py-3 flex gap-2 border-brand/30">
            <Icon name="info" size={15} className="text-brand shrink-0 mt-0.5" />
            <p className="text-xs text-muted flex-1">{msg}</p>
            <button onClick={() => setMsg(null)} className="tap text-muted"><Icon name="close" size={14} /></button>
          </Card>
        </div>
      )}

      <Section title="Location">
        <Card className="mx-4 divide-y divide-line">
          <div className="px-4 py-3">
            <p className="text-sm">{settings.location?.label || 'Not set'}</p>
            {settings.location && (
              <>
                <p className="text-[11px] text-muted mt-0.5 tabular-nums">
                  {settings.location.lat.toFixed(4)}, {settings.location.lng.toFixed(4)}
                </p>
                <p className="text-[11px] text-muted/80 mt-0.5">{describeAccuracy(settings.location)}</p>
              </>
            )}
          </div>
          <button onClick={useMyLocation} className="tap w-full px-4 py-3 text-left text-sm text-brand">
            <Icon name="location" size={15} className="inline mr-2 -mt-0.5" />Use my current location
          </button>
        </Card>
        <p className="text-[11px] text-muted px-6 mt-2">
          Your coordinates stay on this device. There is no server to send them to.
        </p>
      </Section>

      <Section title="Prayer calculation">
        <Card className="mx-4 divide-y divide-line">
          <button onClick={() => setSheet('method')} className="tap w-full flex items-center gap-3 px-4 py-3 text-left">
            <span className="flex-1 min-w-0">
              <span className="block text-sm">Calculation method</span>
              <span className="block text-[11px] text-muted mt-0.5 truncate">{method?.label} · {method?.note}</span>
            </span>
            <Icon name="forward" size={16} className="text-muted" />
          </button>
          <button onClick={() => setSheet('highlat')} className="tap w-full flex items-center gap-3 px-4 py-3 text-left">
            <span className="flex-1 min-w-0">
              <span className="block text-sm">High latitude rule</span>
              <span className="block text-[11px] text-muted mt-0.5 truncate">
                {HIGH_LAT_RULES.find(r => r.id === settings.highLatitudeRule)?.label}
              </span>
            </span>
            <Icon name="forward" size={16} className="text-muted" />
          </button>
          <button onClick={() => setSheet('polar')} className="tap w-full flex items-center gap-3 px-4 py-3 text-left">
            <span className="flex-1 min-w-0">
              <span className="block text-sm">Inside the polar circle</span>
              <span className="block text-[11px] text-muted mt-0.5 truncate">
                {POLAR_RULES.find(r => r.id === settings.polarCircleResolution)?.label}
              </span>
            </span>
            <Icon name="forward" size={16} className="text-muted" />
          </button>
        </Card>

        <div className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">Asr — madhab</div>
        <Choice
          columns={1} value={settings.madhab} onChange={v => set({ madhab: v })}
          options={[
            { id: 'shafi', label: 'Shafi’i, Maliki, Hanbali', note: 'Asr at 1× shadow length' },
            { id: 'hanafi', label: 'Hanafi', note: 'Asr at 2× shadow length' }
          ]}
        />

        <div className="px-4 pt-5 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">Manual offsets</div>
        <Card className="mx-4 divide-y divide-line">
          {PRAYERS.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex-1 text-sm">{p.label}</span>
              <Stepper value={settings.adjustments[p.id] || 0} onChange={v => setAdjustment(p.id, v)} suffix="m" />
            </div>
          ))}
        </Card>
        <p className="text-[11px] text-muted px-6 mt-2">
          Use these only to match a masjid you actually pray at. A calculation is not wrong
          because it disagrees with an app you used before.
        </p>
      </Section>

      <Section title="Notifications">
        <Card className="mx-4 divide-y divide-line">
          <button onClick={() => nav('/notifications')} className="tap w-full flex items-center gap-3 px-4 py-3 text-left">
            <span className="flex-1 min-w-0">
              <span className="block text-sm">Prayer notifications</span>
              <span className="block text-[11px] text-muted mt-0.5 truncate">
                {settings.notifications?.enabled
                  ? `On · ${settings.notifications.sound === 'silent' ? 'silent' : settings.notifications.sound === 'beep' ? 'chime' : 'adhan'}`
                  : 'Off'}
              </span>
            </span>
            <Icon name="forward" size={16} className="text-muted" />
          </button>
        </Card>
      </Section>

      <Section title="Appearance">
        <div className="pb-2">
          <Choice
            columns={4} value={settings.theme} onChange={v => set({ theme: v })}
            options={[
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
              { id: 'sepia', label: 'Sepia' },
              { id: 'black', label: 'OLED' }
            ]}
          />
        </div>
        {/* Shown rather than described: four words naming four weights tell you
            nothing, whereas the same five icons drawn four ways tell you at once. */}
        <div className="px-4 pb-3">
          <p className="text-[11px] text-muted mb-2">Icons</p>
          <div className="grid grid-cols-4 gap-2">
            {ICON_STYLES.map(o => {
              const active = (settings.iconStyle || 'duotone') === o.id
              return (
                <button
                  key={o.id}
                  onClick={() => set({ iconStyle: o.id })}
                  aria-pressed={active}
                  className={`tap rounded-2xl border px-2 py-2.5 transition-colors ${
                    active ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-surf text-muted'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1">
                    {['quran', 'prayer', 'dua'].map(n => (
                      <Icon key={n} name={n} size={17} style={o.id} />
                    ))}
                  </span>
                  <span className="block text-[10px] mt-1.5">{o.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <Card className="mx-4 divide-y divide-line">
          <Toggle checked={settings.showTranslation} onChange={v => set({ showTranslation: v })} label="Show translation" />
          <Toggle checked={settings.showTransliteration} onChange={v => set({ showTransliteration: v })} label="Show transliteration" />
          <Toggle checked={settings.dyslexicFont} onChange={v => set({ dyslexicFont: v })} label="Dyslexia-friendly font" hint="Applies to translations, never to the Arabic" />
        </Card>
      </Section>

      <Section title="Recitation">
        <button onClick={() => setSheet('reciter')} className="tap w-full">
          <Card className="mx-4 px-4 py-3 flex items-center gap-3 text-left">
            <span className="flex-1 min-w-0">
              <span className="block text-sm">Reciter</span>
              <span className="block text-[11px] text-muted mt-0.5 truncate">
                {catalogue ? findReciter(catalogue, settings.reciter).name : 'Loading…'}
              </span>
            </span>
            <Icon name="forward" size={16} className="text-muted" />
          </Card>
        </button>
      </Section>

      <Section title="Hijri date">
        <Card className="mx-4 px-4 py-3 flex items-center gap-3">
          <span className="flex-1 min-w-0">
            <span className="block text-sm">Adjustment</span>
            <span className="block text-[11px] text-muted mt-0.5">{h.formatted}</span>
          </span>
          <Stepper value={settings.hijriOffset} onChange={v => set({ hijriOffset: v })} min={-3} max={3} suffix="d" />
        </Card>
        <p className="text-[11px] text-muted px-6 mt-2">
          Moonsighting differs by country. Shift the date to match your local announcement.
        </p>
      </Section>

      <Section title="Your data">
        <Card className="mx-4 divide-y divide-line">
          <button onClick={exportData} className="tap w-full px-4 py-3 text-left text-sm">
            <Icon name="download" size={15} className="inline mr-2 -mt-0.5 text-muted" />Export everything to a file
          </button>
          <button onClick={() => fileRef.current?.click()} className="tap w-full px-4 py-3 text-left text-sm">
            <Icon name="share" size={15} className="inline mr-2 -mt-0.5 text-muted" />Restore from a backup
          </button>
          <input
            ref={fileRef} type="file" accept="application/json" className="hidden"
            onChange={e => e.target.files?.[0] && importData(e.target.files[0])}
          />
        </Card>
        <p className="text-[11px] text-muted px-6 mt-2">
          Bookmarks, notes, prayer log and settings in one JSON file. Your data leaves with you.
        </p>
      </Section>

      <Section title="Reset">
        <div className="px-4">
          <Button
            variant="danger" size="lg"
            onClick={() => { if (confirm('Reset all settings to their defaults? Your bookmarks and notes are kept.')) reset() }}
          >
            Reset settings to defaults
          </Button>
        </div>
      </Section>

      <SheetPicker
        open={sheet === 'method'} onClose={() => setSheet(null)} title="Calculation method"
        options={METHODS} value={settings.method} onChange={v => { set({ method: v }); setSheet(null) }}
      />
      <SheetPicker
        open={sheet === 'highlat'} onClose={() => setSheet(null)} title="High latitude rule"
        options={HIGH_LAT_RULES} value={settings.highLatitudeRule} onChange={v => { set({ highLatitudeRule: v }); setSheet(null) }}
      />
      <SheetPicker
        open={sheet === 'polar'} onClose={() => setSheet(null)} title="Inside the polar circle"
        options={POLAR_RULES} value={settings.polarCircleResolution}
        onChange={v => { set({ polarCircleResolution: v }); setSheet(null) }}
      />
      <Sheet open={sheet === 'reciter'} onClose={() => setSheet(null)} title="Reciter">
        <ReciterList
          catalogue={catalogue} currentId={settings.reciter}
          onSelect={v => { set({ reciter: v }); setSheet(null) }}
        />
      </Sheet>
    </Screen>
  )
}

function SheetPicker({ open, onClose, title, options, value, onChange }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <ul className="divide-y divide-line">
        {options.map(o => (
          <li key={o.id}>
            <button
              onClick={() => onChange(o.id)}
              className={`tap w-full flex items-start gap-3 px-4 py-3 text-left ${value === o.id ? 'text-brand' : ''}`}
            >
              <span className="flex-1 min-w-0">
                <span className="block text-sm">{o.label}</span>
                {o.note && <span className="block text-[11px] text-muted mt-0.5">{o.note}</span>}
              </span>
              {value === o.id && <Icon name="check" size={16} className="shrink-0 mt-0.5" />}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

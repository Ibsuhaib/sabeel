import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSettings } from '../lib/settings.jsx'
import { store } from '../lib/store.js'
import { quranMeta } from '../lib/data.js'
import { useData } from '../lib/useData.js'
import {
  PRESETS, TOTAL_PAGES, createPlan, ramadanPlan, progress,
  markPage, completeToday, describePace, daysBetween
} from '../lib/khatm.js'
import { Screen, Header, Card, Section, Button, Loading, Choice } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

export default function Khatm() {
  const { settings } = useSettings()
  const nav = useNavigate()
  const [plan, setPlan] = useState(undefined)   // undefined = loading, null = none
  const { data: meta } = useData(quranMeta, [], { label: 'the muṣḥaf index' })
  const [lastRead, setLastRead] = useState(null)

  useEffect(() => { store.khatm().then(p => setPlan(p || null)) }, [])
  useEffect(() => { store.lastRead().then(setLastRead) }, [])

  const save = useCallback(async p => { await store.setKhatm(p); setPlan(p) }, [])

  if (plan === undefined) return <Loading label="Loading your plan" />
  if (!plan) return <NewPlan onCreate={save} settings={settings} />

  const p = progress(plan)
  const surahFor = page => meta?.pages.find(x => x.p === page)
  const todaySurah = surahFor(p.today.from)
  const todayName = todaySurah ? meta.surahs.find(s => s.n === todaySurah.from.s)?.en : null

  // If they have read meaningfully past the plan in the muṣḥaf, offer to catch
  // the plan up. A page or two is not worth a prompt on the day you start.
  const readAhead = lastRead?.page && lastRead.page >= plan.page + 3 ? lastRead.page : null

  return (
    <Screen>
      <Header
        title="Khatm plan"
        subtitle={plan.label}
        back
        actions={
          <button
            onClick={async () => { if (confirm('Delete this plan? Your reading position is not affected.')) { await store.setKhatm(null); setPlan(null) } }}
            className="tap p-2 text-muted" aria-label="Delete plan"
          ><Icon name="close" size={18} /></button>
        }
      />

      {p.finished ? (
        <div className="px-4 pt-6">
          <Card className="p-6 text-center border-brand/40">
            <div className="ar text-brand" style={{ textAlign: 'center', fontSize: 30 }}>الحَمدُ لله</div>
            <p className="font-medium mt-3">You completed the Quran</p>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              {p.totalPages} pages over {daysBetween(p.startDate, new Date()) + 1} days. May Allah accept it.
            </p>
            <Button className="mt-5" onClick={async () => { await store.setKhatm(null); setPlan(null) }}>
              Start a new plan
            </Button>
          </Card>
        </div>
      ) : (
        <>
          <div className="px-4 pt-4">
            <Card className="p-5">
              <Ring percent={p.percent} status={p.status} />

              <div className="text-center mt-4">
                <p className="text-xs text-muted uppercase tracking-wider">Today</p>
                <p className="text-2xl font-semibold mt-1 tabular-nums">
                  {p.today.pages === 0 ? 'Done' : `${p.today.pages} page${p.today.pages === 1 ? '' : 's'}`}
                </p>
                {p.today.pages > 0 && (
                  <p className="text-sm text-muted mt-1 tabular-nums">
                    Pages {p.today.from}–{p.today.to}
                    {todayName && <span className="block text-[11px] mt-0.5">starting at {todayName}</span>}
                  </p>
                )}
              </div>

              {p.today.pages > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-5">
                  <Button onClick={() => nav(`/mushaf/${p.today.from}`)}>
                    <Icon name="book" size={15} />Read now
                  </Button>
                  <Button variant="soft" onClick={() => save(completeToday(plan))}>
                    <Icon name="check" size={15} />Mark done
                  </Button>
                </div>
              )}
            </Card>
          </div>

          <div className="px-4 mt-3">
            <Card className={`px-4 py-3 flex items-start gap-2.5 ${
              p.status === 'behind' ? 'border-amber-500/40' : p.status === 'ahead' ? 'border-brand/40' : ''
            }`}>
              <Icon
                name={p.status === 'behind' ? 'warn' : 'check'} size={15}
                className={`shrink-0 mt-0.5 ${p.status === 'behind' ? 'text-amber-500' : 'text-brand'}`}
              />
              <p className="text-xs text-muted leading-relaxed flex-1">
                {p.status === 'ahead' && `You are ${p.drift} page${p.drift === 1 ? '' : 's'} ahead of the plan. Today's target has shrunk to match.`}
                {p.status === 'ontrack' && 'You are on track.'}
                {p.status === 'behind' && (
                  p.overdue
                    ? `The end date has passed with ${p.remaining} pages left. Extend the plan below, or keep going at your own pace.`
                    : `You are ${Math.abs(p.drift)} pages behind. Today's target has grown to ${p.perDay} pages so you still finish on time — no need to make up the whole gap at once.`
                )}
              </p>
            </Card>
          </div>

          {readAhead && (
            <div className="px-4 mt-3">
              <Card className="px-4 py-3 flex items-center gap-3 border-brand/30">
                <Icon name="info" size={15} className="text-brand shrink-0" />
                <p className="text-xs text-muted flex-1 leading-relaxed">
                  You have read as far as page {readAhead} in the muṣḥaf.
                </p>
                <Button size="sm" onClick={() => save(markPage(plan, readAhead))}>Catch up</Button>
              </Card>
            </div>
          )}

          <Section title="Plan">
            <div className="grid grid-cols-2 gap-2 px-4">
              <Stat label="Read" value={`${p.donePages}`} unit={`of ${p.totalPages} pages`} />
              <Stat label="Remaining" value={`${p.remaining}`} unit="pages" />
              <Stat label="Days left" value={`${p.daysLeft}`} unit={`of ${p.totalDays}`} />
              <Stat label="Juz done" value={`${p.juzDone}`} unit="of 30" />
            </div>
            <p className="text-[11px] text-muted px-6 mt-3 leading-relaxed tabular-nums">
              {p.startDate.toLocaleDateString([], { day: 'numeric', month: 'short' })}
              {' → '}
              {p.endDate.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · currently '}{p.perDay} page{p.perDay === 1 ? '' : 's'} a day
            </p>
          </Section>

          <Section title="Adjust">
            <div className="px-4 space-y-2">
              <SetPage plan={plan} onSave={save} />
              <Button
                variant="soft" size="lg"
                onClick={() => {
                  const extra = Number(prompt('Extend the plan by how many days?', '7'))
                  if (!extra || extra < 1) return
                  const end = new Date(new Date(plan.endDate).getTime() + extra * 86400000)
                  save({ ...plan, endDate: end.toISOString(), label: `${plan.label} (+${extra}d)` })
                }}
              >
                <Icon name="calendar" size={15} />Extend the end date
              </Button>
            </div>
          </Section>
        </>
      )}

      <p className="text-[11px] text-muted/70 text-center px-8 mt-8 leading-relaxed">
        Today's target is worked out from what is left, not fixed on day one — fall behind and it
        grows a little, read ahead and it shrinks. Nothing here is shared or uploaded.
      </p>
    </Screen>
  )
}

function Ring({ percent, status }) {
  const r = 52
  const c = 2 * Math.PI * r
  const tone = status === 'behind' ? 'rgb(var(--c-gold))' : 'rgb(var(--c-brand))'
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 120 120" className="-rotate-90 w-full h-full">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(var(--c-line))" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)}
          style={{ transition: 'stroke-dashoffset .4s' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-2xl font-semibold tabular-nums">{Math.round(percent)}%</div>
          <div className="text-[10px] text-muted uppercase tracking-wide">complete</div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, unit }) {
  return (
    <Card className="p-4">
      <div className="text-2xl font-semibold tabular-nums text-brand">{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
      <div className="text-[10px] text-muted/60">{unit}</div>
    </Card>
  )
}

function SetPage({ plan, onSave }) {
  const [value, setValue] = useState(String(plan.page))
  useEffect(() => { setValue(String(plan.page)) }, [plan.page])
  return (
    <Card className="p-4">
      <label className="block text-[11px] text-muted mb-1.5">
        I have read up to page (1–{TOTAL_PAGES})
      </label>
      <div className="flex gap-2">
        <input
          type="number" min={0} max={TOTAL_PAGES} value={value}
          onChange={e => setValue(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-bg border border-line text-sm tabular-nums outline-none focus:border-brand"
        />
        <Button onClick={() => onSave(markPage(plan, Number(value) || 0))}>Save</Button>
      </div>
      <p className="text-[11px] text-muted/70 mt-2">Only moves forward — re-reading will not undo your progress.</p>
    </Card>
  )
}

function NewPlan({ onCreate, settings }) {
  const [preset, setPreset] = useState('ramadan')
  const [customDays, setCustomDays] = useState('40')
  const [startPage, setStartPage] = useState('1')
  const ramadan = ramadanPlan(settings.hijriOffset)

  const days = preset === 'custom'
    ? Math.max(1, Number(customDays) || 1)
    : preset === 'ramadan'
      ? (ramadan ? daysBetween(new Date(ramadan.startDate), new Date(ramadan.endDate)) + 1 : 30)
      : Number(preset)

  function create() {
    const from = Math.max(1, Math.min(TOTAL_PAGES, Number(startPage) || 1))
    if (preset === 'ramadan' && ramadan) {
      onCreate({ ...ramadan, startPage: from, page: from - 1 })
      return
    }
    onCreate(createPlan({ days, startPage: from, label: PRESETS.find(p => p.id === preset)?.label || `${days} days` }))
  }

  return (
    <Screen>
      <Header title="Khatm plan" subtitle="Finish the Quran by a date" back />

      <div className="px-4 pt-4">
        <Card className="p-5">
          <Icon name="book" size={24} className="text-brand" />
          <p className="font-medium mt-3">Read the whole Quran, on a schedule</p>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Pick how long you want to take. Sabeel works out what to read each day and adjusts it
            as you go — miss a day and tomorrow asks for a little more, never the whole gap at once.
          </p>
        </Card>
      </div>

      <Section title="How long">
        <Choice
          columns={2} value={preset} onChange={setPreset}
          options={[
            ...(ramadan ? [{
              id: 'ramadan',
              label: PRESETS[0].label,
              note: `${new Date(ramadan.startDate).toLocaleDateString([], { day: 'numeric', month: 'short' })} – ${new Date(ramadan.endDate).toLocaleDateString([], { day: 'numeric', month: 'short' })}`
            }] : []),
            ...PRESETS.slice(1).map(p => ({ id: p.id, label: p.label, note: p.note })),
            { id: 'custom', label: 'Custom', note: 'Choose the number of days' }
          ]}
        />

        {preset === 'custom' && (
          <div className="px-4 mt-3">
            <Card className="p-4">
              <label className="block text-[11px] text-muted mb-1.5">Number of days</label>
              <input
                type="number" min={1} max={1000} value={customDays}
                onChange={e => setCustomDays(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-bg border border-line text-sm tabular-nums outline-none focus:border-brand"
              />
            </Card>
          </div>
        )}
      </Section>

      <Section title="Start from">
        <Card className="mx-4 p-4">
          <label className="block text-[11px] text-muted mb-1.5">Page (1–{TOTAL_PAGES})</label>
          <input
            type="number" min={1} max={TOTAL_PAGES} value={startPage}
            onChange={e => setStartPage(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-bg border border-line text-sm tabular-nums outline-none focus:border-brand"
          />
          <p className="text-[11px] text-muted/70 mt-2">
            Leave at 1 to start from al-Fatihah, or continue from where you already are.
          </p>
        </Card>
      </Section>

      <div className="px-4 mt-6">
        <Card className="p-4 mb-3">
          <p className="text-sm tabular-nums">
            <strong>{days}</strong> day{days === 1 ? '' : 's'} · {describePace(days)}
          </p>
          {preset === 'ramadan' && ramadan && (
            <p className="text-[11px] text-muted mt-1">
              Ramadan {ramadan.ramadan.year} — {ramadan.ramadan.days} days by the Umm al-Qura calendar.
              Adjust the Hijri offset in Settings if your country announces differently.
            </p>
          )}
        </Card>
        <Button size="lg" onClick={create}>
          <Icon name="check" size={16} />Start this plan
        </Button>
      </div>

      <p className="text-[11px] text-muted/70 text-center px-8 mt-6 leading-relaxed">
        Reading a page a day finishes the Quran in under two years. Reading twenty finishes it in a
        month. Either is better than a plan you abandon in week two.
      </p>
    </Screen>
  )
}

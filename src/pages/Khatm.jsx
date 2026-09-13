import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../lib/settings.jsx'
import { store } from '../lib/store.js'
import { quranMeta } from '../lib/data.js'
import { useData } from '../lib/useData.js'
import {
  PRESETS, TOTAL_PAGES, createPlan, ramadanPlan, progress, schedule, stats,
  markPage, completeToday, describePace, daysBetween, setPaused, setAutoSync,
  extendBy, relaxTo
} from '../lib/khatm.js'
import { Screen, Header, Card, Section, Button, Loading, Choice, Toggle, Sheet } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

export default function Khatm() {
  const { settings } = useSettings()
  const nav = useNavigate()
  const [plan, setPlan] = useState(undefined)   // undefined = loading, null = none
  const { data: meta } = useData(quranMeta, [], { label: 'the muṣḥaf index' })
  const [sheet, setSheet] = useState(null)

  const reload = useCallback(() => store.khatm().then(p => setPlan(p || null)), [])
  useEffect(() => { reload() }, [reload])

  const save = useCallback(async p => { await store.setKhatm(p); setPlan(p) }, [])

  if (plan === undefined) return <Loading label="Loading your plan" />
  if (!plan) return <NewPlan onCreate={save} settings={settings} />

  const p = progress(plan)
  const st = stats(plan)
  const rows = schedule(plan)
  const surahOn = page => {
    const pg = meta?.pages.find(x => x.p === page)
    return pg ? meta.surahs.find(s => s.n === pg.from.s)?.en : null
  }

  return (
    <Screen>
      <Header
        title="Khatm plan"
        subtitle={plan.label}
        back
        actions={
          <button onClick={() => setSheet('manage')} className="tap p-2 text-muted" aria-label="Plan settings">
            <Icon name="settings" size={18} />
          </button>
        }
      />

      {p.finished ? (
        <Finished plan={plan} p={p} st={st} onReset={async () => { await store.setKhatm(null); setPlan(null) }} />
      ) : (
        <>
          <div className="px-4 pt-4">
            <Card className="p-5">
              <Ring percent={p.percent} status={p.status} />

              <div className="text-center mt-4">
                <p className="text-xs text-muted uppercase tracking-wider">
                  {p.paused ? 'Paused' : p.notStarted ? 'Starts soon' : 'Today'}
                </p>
                <p className="text-2xl font-semibold mt-1 tabular-nums">
                  {p.today.pages === 0 ? 'Done for today' : `${p.today.pages} page${p.today.pages === 1 ? '' : 's'}`}
                </p>
                {p.today.pages > 0 && (
                  <p className="text-sm text-muted mt-1 tabular-nums">
                    Pages {p.today.from}–{p.today.to}
                    {surahOn(p.today.from) && <span className="block text-[11px] mt-0.5">from {surahOn(p.today.from)}</span>}
                  </p>
                )}
                {p.readToday > 0 && (
                  <p className="text-[11px] text-brand mt-2 tabular-nums">
                    <Icon name="check" size={11} className="inline mr-1 -mt-0.5" />
                    {p.readToday} page{p.readToday === 1 ? '' : 's'} read today
                  </p>
                )}
              </div>

              {p.today.pages > 0 && !p.paused && (
                <div className="grid grid-cols-2 gap-2 mt-5">
                  <Button onClick={() => nav(`/mushaf/${p.today.from}`)}>
                    <Icon name="book" size={15} />Read now
                  </Button>
                  <Button variant="soft" onClick={() => save(completeToday(plan))}>
                    <Icon name="check" size={15} />Mark done
                  </Button>
                </div>
              )}
              {p.paused && (
                <Button className="mt-5" onClick={() => save(setPaused(plan, false))}>
                  <Icon name="play" size={15} />Resume the plan
                </Button>
              )}
            </Card>
          </div>

          <StatusNote p={p} plan={plan} onRelax={() => setSheet('relax')} />

          <Section title="Your record">
            <div className="grid grid-cols-4 gap-2 px-4">
              <Mini label="Streak" value={st.streak} unit={st.streak === 1 ? 'day' : 'days'} tone="brand" />
              <Mini label="Read" value={st.daysRead} unit="days" />
              <Mini label="Missed" value={st.daysMissed} unit="days" tone={st.daysMissed > 0 ? 'gold' : undefined} />
              <Mini label="Kept" value={st.consistency == null ? '—' : `${st.consistency}%`} unit="of days" />
            </div>
            {st.bestDay && (
              <p className="text-[11px] text-muted px-6 mt-3 tabular-nums">
                Best day: {st.bestDay.pages} pages on {st.bestDay.date.toLocaleDateString([], { day: 'numeric', month: 'short' })}
                {st.averagePerActiveDay > 0 && ` · averaging ${st.averagePerActiveDay} pages on the days you read`}
              </p>
            )}
          </Section>

          <Section title="Day by day" action={
            <span className="text-[10px] text-muted tabular-nums">
              Day {Math.min(p.totalDays, p.daysCompleted + 1)} of {p.totalDays}
            </span>
          }>
            <ScheduleList rows={rows} surahOn={surahOn} onOpen={page => nav(`/mushaf/${page}`)} />
          </Section>

          <Section title="Plan">
            <div className="grid grid-cols-2 gap-2 px-4">
              <Stat label="Read" value={p.donePages} unit={`of ${p.totalPages} pages`} />
              <Stat label="Remaining" value={p.remaining} unit="pages" />
              <Stat label="Days left" value={p.daysLeft} unit={`of ${p.totalDays}`} />
              <Stat label="Juz done" value={p.juzDone} unit="of 30" />
            </div>
            <p className="text-[11px] text-muted px-6 mt-3 leading-relaxed tabular-nums">
              {p.startDate.toLocaleDateString([], { day: 'numeric', month: 'short' })} →{' '}
              {p.endDate.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · currently '}{p.perDay} page{p.perDay === 1 ? '' : 's'} a day
            </p>
          </Section>
        </>
      )}

      <ManageSheet
        open={sheet === 'manage'} onClose={() => setSheet(null)}
        plan={plan} onSave={save}
        onDelete={async () => { await store.setKhatm(null); setPlan(null); setSheet(null) }}
        onRelax={() => setSheet('relax')}
      />
      <RelaxSheet
        open={sheet === 'relax'} onClose={() => setSheet(null)}
        plan={plan} onSave={p2 => { save(p2); setSheet(null) }}
      />

      <p className="text-[11px] text-muted/70 text-center px-8 mt-8 leading-relaxed">
        Today's target comes from what is left, not a number fixed on day one. Fall behind and it
        grows a little; read ahead and it shrinks. Nothing here is shared or uploaded.
      </p>
    </Screen>
  )
}

/* ------------------------------- pieces ---------------------------------- */

function StatusNote({ p, plan, onRelax }) {
  const tone = p.status === 'behind' || p.status === 'overdue' ? 'amber' : 'brand'
  const text = {
    ahead: `You are ${p.drift} page${p.drift === 1 ? '' : 's'} ahead. Today's target has shrunk to match.`,
    ontrack: 'You are on track.',
    behind: `You are ${Math.abs(p.drift)} pages behind. Today's target has grown to ${p.perDay} — you still finish on time without making up the whole gap at once.`,
    overdue: `The end date has passed with ${p.remaining} pages left.`,
    paused: 'The plan is paused. Nothing is counted as missed while it is.',
    done: ''
  }[p.status]

  if (!text) return null
  return (
    <div className="px-4 mt-3">
      <Card className={`px-4 py-3 flex items-start gap-2.5 ${tone === 'amber' ? 'border-amber-500/40' : 'border-brand/30'}`}>
        <Icon
          name={tone === 'amber' ? 'warn' : 'check'} size={15}
          className={`shrink-0 mt-0.5 ${tone === 'amber' ? 'text-amber-500' : 'text-brand'}`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted leading-relaxed">{text}</p>
          {(p.status === 'behind' || p.status === 'overdue') && (
            <button onClick={onRelax} className="tap text-[11px] text-brand mt-1.5 font-medium">
              Give the plan more time →
            </button>
          )}
        </div>
      </Card>
    </div>
  )
}

function ScheduleList({ rows, surahOn, onOpen }) {
  const todayIndex = Math.max(0, rows.findIndex(r => r.state === 'today'))
  const [expanded, setExpanded] = useState(false)
  // Around today by default; the whole plan can be hundreds of rows.
  const visible = expanded ? rows : rows.slice(Math.max(0, todayIndex - 3), todayIndex + 7)

  const tone = {
    done: 'border-brand/40 text-brand',
    today: 'border-gold/60 text-gold',
    missed: 'border-amber-500/30 text-amber-500/80',
    future: 'border-line text-muted',
    none: 'border-line text-muted'
  }

  return (
    <>
      <div className="px-4 space-y-1.5">
        {visible.map(r => (
          <button
            key={r.key}
            onClick={() => r.pages > 0 && onOpen(r.from)}
            className={`tap w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-surf text-left ${tone[r.state]}`}
          >
            <span className="w-9 shrink-0 text-center">
              <span className="block text-[10px] uppercase opacity-70">
                {r.date.toLocaleDateString([], { weekday: 'short' })}
              </span>
              <span className="block text-sm tabular-nums font-medium">{r.date.getDate()}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm tabular-nums text-ink">
                {r.pages > 0 ? `Pages ${r.from}–${r.to}` : 'Nothing read'}
              </span>
              <span className="block text-[11px] text-muted truncate">
                {r.pages > 0 ? `${r.pages} page${r.pages === 1 ? '' : 's'}` : '—'}
                {r.pages > 0 && surahOn(r.from) ? ` · ${surahOn(r.from)}` : ''}
              </span>
            </span>
            <span className="shrink-0 text-[10px] uppercase tracking-wide">
              {r.state === 'done' ? <Icon name="check" size={15} />
                : r.state === 'today' ? 'today'
                : r.state === 'missed' ? <Icon name="close" size={13} />
                : ''}
            </span>
          </button>
        ))}
      </div>
      {rows.length > visible.length || expanded ? (
        <button onClick={() => setExpanded(!expanded)} className="tap w-full text-xs text-muted py-3">
          {expanded ? 'Show fewer days' : `Show all ${rows.length} days`}
        </button>
      ) : null}
    </>
  )
}

function Finished({ plan, p, st, onReset }) {
  return (
    <div className="px-4 pt-6">
      <Card className="p-6 text-center border-brand/40">
        <div className="ar text-brand" style={{ textAlign: 'center', fontSize: 30 }}>الحَمدُ لله</div>
        <p className="font-medium mt-3">You completed the Quran</p>
        <p className="text-sm text-muted mt-2 leading-relaxed tabular-nums">
          {p.totalPages} pages over {daysBetween(p.startDate, new Date()) + 1} days
          {st.daysRead > 0 && `, reading on ${st.daysRead} of them`}. May Allah accept it.
        </p>
        <Button className="mt-5" onClick={onReset}>Start a new plan</Button>
      </Card>
    </div>
  )
}

function Ring({ percent, status }) {
  const r = 52
  const c = 2 * Math.PI * r
  const tone = status === 'behind' || status === 'overdue' ? 'rgb(var(--c-gold))' : 'rgb(var(--c-brand))'
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

function Mini({ label, value, unit, tone }) {
  const colour = tone === 'brand' ? 'text-brand' : tone === 'gold' ? 'text-gold' : 'text-ink'
  return (
    <Card className="p-3 text-center">
      <div className={`text-lg font-semibold tabular-nums ${colour}`}>{value}</div>
      <div className="text-[10px] text-muted mt-0.5">{label}</div>
      <div className="text-[9px] text-muted/60">{unit}</div>
    </Card>
  )
}

function ManageSheet({ open, onClose, plan, onSave, onDelete, onRelax }) {
  const [value, setValue] = useState(String(plan.page))
  useEffect(() => { setValue(String(plan.page)) }, [plan.page, open])

  return (
    <Sheet open={open} onClose={onClose} title="Plan settings">
      <div className="py-2">
        <Card className="mx-4 divide-y divide-line">
          <Toggle
            checked={plan.autoSync !== false}
            onChange={v => onSave(setAutoSync(plan, v))}
            label="Track what I actually read"
            hint="Advances the plan as you move through the muṣḥaf, without tapping anything"
          />
          <Toggle
            checked={!!plan.paused}
            onChange={v => onSave(setPaused(plan, v))}
            label="Pause the plan"
            hint="Nothing counts as missed while paused"
          />
        </Card>

        <div className="px-4 pt-5 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">Correct your progress</div>
        <Card className="mx-4 p-4">
          <label className="block text-[11px] text-muted mb-1.5">I have read up to page (0–{TOTAL_PAGES})</label>
          <div className="flex gap-2">
            <input
              type="number" min={0} max={TOTAL_PAGES} value={value}
              onChange={e => setValue(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-bg border border-line text-sm tabular-nums outline-none focus:border-brand"
            />
            <Button onClick={() => onSave(markPage(plan, Number(value) || 0))}>Save</Button>
          </div>
          <p className="text-[11px] text-muted/70 mt-2">Only moves forward — re-reading cannot undo your progress.</p>
        </Card>

        <div className="px-4 pt-5 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">Timing</div>
        <div className="px-4 space-y-2">
          <Button variant="soft" size="lg" onClick={() => { onClose(); onRelax() }}>
            <Icon name="calendar" size={15} />Set a comfortable daily pace
          </Button>
          <div className="grid grid-cols-3 gap-2">
            {[3, 7, 30].map(d => (
              <Button key={d} variant="soft" size="sm" onClick={() => onSave(extendBy(plan, d))}>
                +{d} day{d === 1 ? '' : 's'}
              </Button>
            ))}
          </div>
        </div>

        <div className="px-4 pt-6 pb-4">
          <Button
            variant="danger" size="lg"
            onClick={() => { if (confirm('Delete this plan? Your reading position is not affected.')) onDelete() }}
          >
            Delete this plan
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

function RelaxSheet({ open, onClose, plan, onSave }) {
  const options = [2, 3, 5, 10, 20]
  return (
    <Sheet open={open} onClose={onClose} title="A pace you can keep">
      <div className="p-4">
        <p className="text-xs text-muted leading-relaxed mb-4">
          Falling behind is not a reason to abandon a khatm. Pick a number of pages you can
          genuinely manage each day and the end date moves to match.
        </p>
        <div className="space-y-2">
          {options.map(n => {
            const days = Math.ceil(Math.max(0, TOTAL_PAGES - plan.page) / n)
            const end = new Date(Date.now() + (days - 1) * 86400000)
            return (
              <button
                key={n}
                onClick={() => onSave(relaxTo(plan, n))}
                className="tap w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-bg border border-line text-left"
              >
                <span className="text-lg font-semibold text-brand tabular-nums w-10">{n}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">pages a day</span>
                  <span className="block text-[11px] text-muted tabular-nums">
                    {days} day{days === 1 ? '' : 's'} · finishes {end.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </span>
                <Icon name="forward" size={16} className="text-muted" />
              </button>
            )
          })}
        </div>
      </div>
    </Sheet>
  )
}

/* -------------------------------- new plan ------------------------------- */

function NewPlan({ onCreate, settings }) {
  const [preset, setPreset] = useState('30')
  const [customDays, setCustomDays] = useState('40')
  const [startPage, setStartPage] = useState('1')
  const ramadan = useMemo(() => ramadanPlan(settings.hijriOffset), [settings.hijriOffset])

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
    onCreate(createPlan({
      days, startPage: from,
      label: PRESETS.find(x => x.id === preset)?.label || `${days} days`
    }))
  }

  return (
    <Screen>
      <Header title="Khatm plan" subtitle="Finish the Quran by a date" back />

      <div className="px-4 pt-4">
        <Card className="p-5">
          <Icon name="book" size={24} className="text-brand" />
          <p className="font-medium mt-3">Read the whole Quran, on a schedule</p>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Pick how long you want to take. Sabeel works out what to read each day, tracks it as
            you read, and adjusts — miss a day and tomorrow asks for a little more, never the
            whole gap at once.
          </p>
        </Card>
      </div>

      <Section title="How long">
        <Choice
          columns={2} value={preset} onChange={setPreset}
          options={[
            ...(ramadan ? [{
              id: 'ramadan',
              label: 'This Ramadan',
              note: `${new Date(ramadan.startDate).toLocaleDateString([], { day: 'numeric', month: 'short' })} – ${new Date(ramadan.endDate).toLocaleDateString([], { day: 'numeric', month: 'short' })}`
            }] : []),
            ...PRESETS.slice(1).map(x => ({ id: x.id, label: x.label, note: x.note })),
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
          {preset === 'ramadan' && ramadan?.ramadan && (
            <p className="text-[11px] text-muted mt-1">
              Ramadan {ramadan.ramadan.year} — {ramadan.ramadan.days} days by the Umm al-Qura
              calendar. Adjust the Hijri offset in Settings if your country announces differently.
            </p>
          )}
        </Card>
        <Button size="lg" onClick={create}>
          <Icon name="check" size={16} />Start this plan
        </Button>
      </div>

      <p className="text-[11px] text-muted/70 text-center px-8 mt-6 leading-relaxed">
        A page a day finishes the Quran in under two years. Twenty finishes it in a month. Either
        is better than a plan abandoned in week two.
      </p>
    </Screen>
  )
}

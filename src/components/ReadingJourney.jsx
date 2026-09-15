import { useEffect, useState } from 'react'
import { useSettings } from '../lib/settings.jsx'
import {
  readLog, secondsOn, streak, bestStreak, thisWeek, nextMilestone, totals,
  fmtDuration, DEFAULT_GOAL_MIN
} from '../lib/reading.js'
import { Sheet, Card, Button, Choice } from './ui.jsx'
import Icon from './Icon.jsx'

const GOALS = [1, 5, 10, 15, 30, 60]
const CHART_PX = 96

export default function ReadingJourney({ open, onClose }) {
  const { settings, set } = useSettings()
  const [log, setLog] = useState(null)
  const [editingGoal, setEditingGoal] = useState(false)

  useEffect(() => { if (open) readLog().then(setLog) }, [open])

  const goal = settings.readingGoalMinutes ?? DEFAULT_GOAL_MIN
  if (!open) return null

  const today = log ? secondsOn(log) : 0
  const done = today >= goal * 60
  const current = log ? streak(log, goal) : 0
  const best = log ? bestStreak(log, goal) : 0
  const week = log ? thisWeek(log) : []
  const next = nextMilestone(current)
  const all = log ? totals(log) : { days: 0, seconds: 0 }
  const peak = Math.max(1, ...week.map(d => d.seconds))

  return (
    <Sheet open={open} onClose={onClose} title="My Quran reading">
      <div className="p-4 space-y-3">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">Read today</p>
              <p className="text-3xl font-semibold tabular-nums mt-0.5">
                {fmtDuration(today)}
                <span className="text-base text-muted font-normal"> / {goal}m</span>
              </p>
              <p className="text-xs text-muted mt-3">Current streak</p>
              <p className="text-2xl font-semibold tabular-nums text-brand">
                {current} day{current === 1 ? '' : 's'}
              </p>
            </div>
            <div className={`w-20 h-20 rounded-full grid place-items-center shrink-0 ${done ? 'bg-brand/15 text-brand' : 'bg-bg text-muted/40'}`}>
              <Icon name={done ? 'check' : 'bolt'} size={34} strokeWidth={done ? 2.4 : 1.6} />
            </div>
          </div>

          {!done && (
            <p className="text-[11px] text-muted mt-3 leading-relaxed">
              {fmtDuration(Math.max(0, goal * 60 - today))} more today keeps the streak.
            </p>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium">This week</p>
            <span className="text-[11px] text-muted tabular-nums">{fmtDuration(week.reduce((a, d) => a + d.seconds, 0))}</span>
          </div>
          <div className="flex items-end justify-between gap-1.5">
            {week.map(d => {
              // Pixels, not percentages: a percentage height inside a flex
              // column has no definite parent to resolve against, so the bars
              // silently collapsed to nothing.
              const h = d.seconds ? Math.max(10, Math.round((d.seconds / peak) * CHART_PX)) : 4
              return (
                <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <div className="w-full flex items-end" style={{ height: CHART_PX }}>
                    <div
                      className={`w-full rounded-full transition-all ${
                        d.seconds >= goal * 60 ? 'bg-brand'
                          : d.seconds > 0 ? 'bg-brand/40'
                          : 'bg-line'
                      }`}
                      style={{ height: `${h}px` }}
                      title={`${d.date.toDateString()} — ${fmtDuration(d.seconds)}`}
                    />
                  </div>
                  <span className={`text-[10px] ${d.isToday ? 'text-brand font-semibold' : 'text-muted'}`}>
                    {d.date.toLocaleDateString([], { weekday: 'narrow' })}
                  </span>
                  <span className="text-[9px] text-muted/70 tabular-nums truncate w-full text-center">
                    {d.seconds ? fmtDuration(d.seconds) : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        {next && (
          <Card className="p-4">
            <div className="flex items-baseline justify-between text-sm tabular-nums mb-2">
              <span className="font-semibold text-brand">{current}d</span>
              <span className="text-muted">{next}d</span>
            </div>
            <div className="h-1.5 bg-line rounded-full overflow-hidden">
              <div className="h-full bg-brand transition-all" style={{ width: `${Math.min(100, (current / next) * 100)}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-muted mt-2">
              <span>Current streak</span>
              <span>Next milestone</span>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Mini label="Best streak" value={best} unit={best === 1 ? 'day' : 'days'} />
          <Mini label="Days read" value={all.days} unit="total" />
          <Mini label="All time" value={fmtDuration(all.seconds)} unit="reading" />
        </div>

        <Card className="p-4">
          <button
            onClick={() => setEditingGoal(v => !v)}
            className="tap w-full flex items-center gap-3 text-left min-h-[40px]"
          >
            <Icon name="counter" size={16} className="text-muted shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm">Daily goal</span>
              <span className="block text-[11px] text-muted">{goal} minutes a day</span>
            </span>
            <Icon name={editingGoal ? 'close' : 'forward'} size={16} className="text-muted" />
          </button>
          {editingGoal && (
            <div className="mt-3 -mx-4">
              <Choice
                columns={3} value={goal}
                onChange={v => { set({ readingGoalMinutes: v }); setEditingGoal(false) }}
                options={GOALS.map(m => ({ id: m, label: `${m} min` }))}
              />
            </div>
          )}
        </Card>

        <p className="text-[11px] text-muted/70 text-center leading-relaxed px-2">
          Time is counted only while a reading screen is open and the app is in front of you, in
          short ticks. A streak you could earn by leaving the phone on the table would not be
          worth having.
        </p>
      </div>
    </Sheet>
  )
}

function Mini({ label, value, unit }) {
  return (
    <Card className="p-3 text-center">
      <div className="text-lg font-semibold tabular-nums text-brand truncate">{value}</div>
      <div className="text-[10px] text-muted mt-0.5">{label}</div>
      <div className="text-[9px] text-muted/60">{unit}</div>
    </Card>
  )
}

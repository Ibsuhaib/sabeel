import { useCallback, useEffect, useState } from 'react'
import { Card } from './ui.jsx'
import Icon from './Icon.jsx'
import { effectivePermission } from '../lib/notifications.js'
import { exactAlarmsAllowed, openExactAlarmSetting } from '../lib/native.js'
import {
  deviceStatus, openBatterySettings, openNotificationSettings, openAutostartSettings
} from '../lib/reliability.js'

// Whether this phone will actually deliver a prayer notification.
//
// A prayer app is only as good as its worst device, and the schedule is the easy
// half. What decides whether someone is called to Fajr is a set of switches
// outside the app — notifications, exact alarms, battery optimisation, and on
// several brands a manufacturer's own autostart list that is not part of Android
// at all. Every one of them discards the alarm in silence, and an app may set
// none of them for itself.
//
// So each is read honestly and shown with the one screen that fixes it. Not a
// page of advice about battery managers, which is what this was: a checklist
// that knows which of them are actually wrong on the phone in your hand.
export default function AlarmReliability() {
  const [rows, setRows] = useState(null)

  const check = useCallback(async () => {
    const [perm, exact, device] = await Promise.all([
      effectivePermission().catch(() => 'unknown'),
      exactAlarmsAllowed().catch(() => 'unknown'),
      deviceStatus().catch(() => null)
    ])

    // Off the APK there is nothing here to check; the web has no such switches.
    if (!device) { setRows([]); return }

    const out = [
      {
        key: 'notifications',
        label: 'Notifications allowed',
        ok: perm === 'granted',
        unknown: perm === 'unknown',
        detail: 'Without this nothing is shown at all.',
        fix: openNotificationSettings,
        action: 'Allow notifications'
      },
      {
        key: 'exact',
        label: 'Exact alarms allowed',
        ok: exact === 'granted',
        unknown: exact === 'unknown',
        detail: 'Without it Android may hold a prayer until the screen next wakes.',
        fix: openExactAlarmSetting,
        action: 'Allow alarms & reminders'
      },
      {
        key: 'battery',
        label: 'Battery restrictions lifted',
        ok: device.batteryUnrestricted === true,
        detail: 'Restricted, Android is free to defer alarms while the phone sleeps.',
        fix: openBatterySettings,
        action: 'Open battery settings'
      }
    ]

    // Only the brands that actually ship one. Everyone else is not missing a step.
    if (device.autostartScreen) {
      out.push({
        key: 'autostart',
        label: `${titleCase(device.manufacturer)} autostart`,
        ok: null,                       // no way to read it; only to offer the screen
        detail: 'This brand keeps its own list of apps allowed to run in the background. Sabeel must be on it.',
        fix: openAutostartSettings,
        action: 'Open autostart list'
      })
    }

    setRows(out)
  }, [])

  useEffect(() => { check() }, [check])

  // Coming back from any of those screens is the moment to look again.
  useEffect(() => {
    const onBack = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onBack)
    return () => document.removeEventListener('visibilitychange', onBack)
  }, [check])

  if (!rows || !rows.length) return null

  const problems = rows.filter(r => r.ok === false).length
  const unknown = rows.filter(r => r.ok === null).length

  return (
    <Card className={`mx-4 mt-3 p-4 ${problems ? 'border-amber-500/40' : 'border-brand/30'}`}>
      <p className="text-xs font-semibold flex items-center gap-1.5">
        <Icon name={problems ? 'warn' : 'check'} size={14} className={problems ? 'text-amber-500' : 'text-brand'} />
        {problems
          ? `${problems} thing${problems === 1 ? '' : 's'} on this phone can stop the adhan`
          : unknown
            ? 'Set up, with one thing worth checking'
            : 'This phone is set up to deliver the adhan'}
      </p>

      <div className="mt-3 space-y-2.5">
        {rows.map(r => (
          <div key={r.key}>
            <div className="flex items-start gap-2">
              <Icon
                name={r.ok === true ? 'check' : r.ok === false ? 'close' : 'info'}
                size={13}
                className={`shrink-0 mt-0.5 ${r.ok === true ? 'text-brand' : r.ok === false ? 'text-amber-500' : 'text-muted'}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] leading-snug">{r.label}</p>
                {r.ok !== true && (
                  <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{r.detail}</p>
                )}
              </div>
            </div>
            {r.ok !== true && (
              <button
                onClick={() => r.fix()}
                className="tap ml-[21px] mt-1.5 px-3 py-1.5 rounded-lg border border-brand/40 bg-brand/10 text-brand text-[11px]"
              >
                {r.action}
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted/70 mt-3 leading-relaxed">
        Sabeel cannot change any of these for you — Android only lets you do it.
        Each button opens the exact screen.
      </p>
    </Card>
  )
}

const titleCase = s =>
  String(s || '').toLowerCase().replace(/^\w/, c => c.toUpperCase())

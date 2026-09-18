import { useState } from 'react'
import { diagnose } from '../lib/notifications.js'
import { openExactAlarmSetting } from '../lib/native.js'
import { Card, Button } from './ui.jsx'
import Icon from './Icon.jsx'

// What Android actually thinks, for when the app and the phone disagree.
//
// "Notifications are on and nothing arrives" is the commonest complaint about
// every prayer app, and from the outside a dozen causes look identical: the
// permission, a channel that failed to create, an exact-alarm setting the
// manufacturer withheld, a battery saver, no location so nothing to schedule.
// Guessing between them from a description has already cost this app two wrong
// fixes.
//
// So it can be asked instead. Everything here is read back from the system, not
// from what the app believes it did — the case worth diagnosing is exactly the
// one where those two disagree.
export default function NotifyDiagnostics({ settings }) {
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function run() {
    setBusy(true)
    try { setInfo(await diagnose(settings || {})) }
    catch (e) { setInfo({ error: e?.message || String(e) }) }
    finally { setBusy(false) }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(info, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* no clipboard; the text is on screen to read anyway */ }
  }

  const exactDenied = info && info.exactAlarms && info.exactAlarms !== 'granted' && info.exactAlarms !== 'unknown'

  return (
    <Card className="mx-4 mt-3 p-4">
      <p className="text-xs font-semibold">Not arriving?</p>
      <p className="text-[11px] text-muted mt-1 leading-relaxed">
        This asks Android what it actually has scheduled, rather than what Sabeel
        thinks it asked for. Nothing here leaves the phone.
      </p>

      <Button variant="soft" size="lg" className="mt-3" onClick={run} disabled={busy}>
        <Icon name="info" size={15} />{busy ? 'Checking…' : 'Check what Android has'}
      </Button>

      {info && (
        <>
          <dl className="mt-3 text-[11px] leading-relaxed">
            {Object.entries(info).map(([k, v]) => (
              <div key={k} className="flex gap-2 py-0.5 border-b border-line/40 last:border-0">
                <dt className="text-muted shrink-0 w-[46%]">{label(k)}</dt>
                <dd className="flex-1 min-w-0 break-words tabular-nums">{show(v)}</dd>
              </div>
            ))}
          </dl>

          {exactDenied && (
            <>
              <p className="text-[11px] text-amber-500 mt-3 leading-relaxed">
                Android is not letting Sabeel set exact alarms, so a prayer can arrive
                late or be held until the screen comes on.
              </p>
              <Button variant="soft" size="lg" className="mt-2" onClick={openExactAlarmSetting}>
                <Icon name="bell" size={15} />Allow alarms &amp; reminders
              </Button>
            </>
          )}

          <button onClick={copy} className="tap mt-3 text-[11px] text-brand">
            {copied ? 'Copied' : 'Copy this, to send to whoever is helping'}
          </button>
        </>
      )}
    </Card>
  )
}

const LABELS = {
  native: 'Running as the app',
  plugin: 'Notification plugin loaded',
  permission: 'Android permission',
  channels: 'Sound channels',
  pending: 'Alarms Android is holding',
  next: 'Next few',
  exactAlarms: 'Exact alarms allowed',
  enabledInApp: 'Switched on in Sabeel',
  hasLocation: 'Location set',
  wouldSchedule: 'Prayers it wants to arm',
  soonest: 'Soonest'
}
const label = k => LABELS[k] || k

function show(v) {
  if (v === true) return 'yes'
  if (v === false) return 'no'
  if (v === null || v === undefined) return '—'
  if (Array.isArray(v)) {
    if (!v.length) return 'none'
    // Channels come back as objects; everything else is already readable.
    return v.map(x => (typeof x === 'object' ? x.id : String(x))).join(', ')
  }
  return String(v)
}

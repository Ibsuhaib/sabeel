import { useEffect, useState } from 'react'
import { useSettings } from '../lib/settings.jsx'
import { PRAYERS, FARD } from '../lib/prayer.js'
import { fmtTime } from '../lib/format.js'
import { useData } from '../lib/useData.js'
import { adhanCatalogue } from '../lib/data.js'
import {
  supported, available, permission, effectivePermission, requestPermission, hasTriggers,
  schedule, sendTest, upcoming, describeReliability, describeReliabilityAsync
} from '../lib/notifications.js'
import { prime, playBeep, playAdhan, stopSound, vibrate } from '../lib/sounds.js'
import AdhanPicker from '../components/AdhanPicker.jsx'
import { Screen, Header, Card, Section, Toggle, Choice, Button, Empty } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import PrayerSound, { MODES } from '../components/PrayerSound.jsx'
import { useIsNative } from '../lib/useNative.js'

const SOUNDS = [
  { id: 'adhan', label: 'Adhan', note: 'The full call to prayer' },
  { id: 'beep', label: 'Chime', note: 'A short two-note tone' },
  { id: 'silent', label: 'Silent', note: 'On screen only' }
]

const REMINDERS = [0, 5, 10, 15, 20, 30]

// What the "set them all" control should show: a mode when every fard prayer
// agrees on one, and nothing when they differ — so a mixed set is never
// misrepresented as uniform.
function allSame(n) {
  const modes = FARD.map(p => n.perPrayer?.[p.id] || 'adhan')
  return modes.every(m => m === modes[0]) ? modes[0] : null
}

// Whether the adhan pickers are worth showing at all.
const usesAdhan = n => FARD.some(p => (n.perPrayer?.[p.id] || 'adhan') === 'adhan')

export default function Notifications() {
  const { settings, set } = useSettings()
  const n = settings.notifications || {}

  const [perm, setPerm] = useState(permission())
  // null while we are still asking; the screen renders normally in the meantime
  // rather than flashing an error it may be about to retract.
  const [canNotify, setCanNotify] = useState(null)
  const [status, setStatus] = useState(null)
  const native = useIsNative()
  const [msg, setMsg] = useState(null)

  const { data: adhans } = useData(adhanCatalogue, [], { label: 'the adhan list' })

  useEffect(() => () => stopSound(), [])

  useEffect(() => {
    let alive = true
    available().then(ok => { if (alive) setCanNotify(ok) }).catch(() => { if (alive) setCanNotify(supported()) })
    return () => { alive = false }
  }, [])

  // On Android the permission is the plugin's, not the browser's.
  useEffect(() => {
    let alive = true
    effectivePermission().then(p => { if (alive && p) setPerm(p) }).catch(() => {})
    return () => { alive = false }
  }, [])

  // Keep what is armed in step with the settings on this screen.
  useEffect(() => {
    if (perm !== 'granted' || !n.enabled) { setStatus(null); return }
    schedule(settings).then(setStatus)
  }, [settings, perm, n.enabled])

  const patch = p => set({ notifications: { ...n, ...p } })

  // Reported from a phone: tapping this did nothing at all — no permission
  // dialog, no error, the same screen. It could do that in three ways. priming
  // the audio was awaited outside any catch, and constructing an AudioContext
  // throws on some WebViews; requestPermission can answer 'unsupported', which
  // matched neither branch below; and anything either of them threw took the
  // whole handler down. A button that can quietly do nothing is worse than one
  // that fails, because there is nothing to report and nothing to try next.
  async function enable() {
    // Best-effort, and never the reason the rest does not run: this only lifts
    // the autoplay restriction so the adhan can sound later.
    try { await prime() } catch { /* the permission matters more than the sound */ }

    let result
    try {
      result = await requestPermission()
    } catch (e) {
      setMsg({ tone: 'warn', text: `Could not ask for notification permission: ${e?.message || 'unknown error'}.` })
      return
    }

    setPerm(result)

    if (result === 'granted') {
      patch({ enabled: true })
      setMsg({ tone: 'ok', text: 'Notifications are on. Send a test below to be sure they actually arrive on this phone.' })
      return
    }

    if (result === 'denied') {
      // Where to go differs entirely: an address-bar padlock does not exist on a
      // phone, and Android's own settings are not where a browser keeps this.
      setMsg({ tone: 'warn', text: native
        ? 'Android is blocking notifications for Sabeel. Turn them on in Settings → Apps → Sabeel → Notifications, then come back.'
        : 'Your browser is blocking notifications for this site. Allow them in the site settings — the padlock icon in the address bar — then come back.' })
      return
    }

    // Anything else — 'unsupported', 'prompt', or a value a future plugin
    // version invents. Say so rather than leaving the screen unchanged.
    setMsg({
      tone: 'warn',
      text: native
        ? `Android did not answer the permission request (${result || 'no answer'}). Allow notifications in Settings → Apps → Sabeel → Notifications, then come back — the settings below can be set either way.`
        : `This browser did not answer the permission request (${result || 'no answer'}).`
    })
  }

  async function preview() {
    await prime()
    // Preview what is actually set. When the prayers disagree there is no single
    // sound to demonstrate, so the adhan stands in rather than a stale global.
    const mode = allSame(n) || 'adhan'
    if (mode === 'off') { setMsg({ tone: 'ok', text: 'Every prayer is set to Off, so nothing would sound.' }); return }
    if (mode === 'silent') { vibrate(); setMsg({ tone: 'ok', text: 'Silent mode — the phone vibrated if vibration is on and supported.' }); return }
    if (mode === 'beep') { playBeep(); return }
    const file = adhans?.adhans?.[0]?.file
    const el = await playAdhan({ adhanFile: file, useCustom: n.useCustomAdhan, volume: n.volume ?? 1 })
    if (!el) setMsg({ tone: 'warn', text: 'Sound needs a tap before it can start. Tap anywhere, then try again.' })
  }

  async function test() {
    const r = await sendTest(settings)
    setMsg(r.ok
      ? { tone: 'ok', text: r.delayed
          ? 'Sent — it should appear in a moment. If nothing arrives, your phone is suppressing it: see the note below.'
          : 'Sent. If nothing appeared, your phone is suppressing it — see the note below.' }
      : { tone: 'warn', text: r.reason })
    if (r.ok) preview()
  }


  const [reliability, setReliability] = useState(describeReliability())
  useEffect(() => { describeReliabilityAsync().then(setReliability) }, [])
  const next = settings.location ? upcoming(settings).slice(0, 4) : []

  // `supported()` asks only whether the web Notification API exists, which it
  // does not inside the Android WebView — so gating on it told people running
  // the installed app that their browser could not do notifications, while the
  // app was perfectly able to schedule them natively.
  if (canNotify === false) {
    return (
      <Screen>
        <Header title="Prayer notifications" back />
        <Empty
          icon="warn"
          title="Notifications are not available here"
          body="This browser has no notification support. Installing Sabeel to your home screen, or using the Android app, will give it one."
        />
      </Screen>
    )
  }

  if (!settings.location) {
    return (
      <Screen>
        <Header title="Prayer notifications" back />
        <Empty
          icon="location" title="Set a location first"
          body="Notifications are scheduled from your prayer times, which are calculated from your coordinates."
          action={<Button to="/settings">Set location</Button>}
        />
      </Screen>
    )
  }

  return (
    <Screen>
      <Header title="Prayer notifications" subtitle={settings.location.label} back />

      {msg && (
        <div className="px-4 pt-3">
          <Card className={`px-4 py-3 flex gap-2 ${msg.tone === 'warn' ? 'border-amber-500/40' : 'border-brand/30'}`}>
            <Icon name={msg.tone === 'warn' ? 'warn' : 'info'} size={15} className={`shrink-0 mt-0.5 ${msg.tone === 'warn' ? 'text-amber-500' : 'text-brand'}`} />
            <p className="text-xs text-muted flex-1 leading-relaxed">{msg.text}</p>
            <button onClick={() => setMsg(null)} className="tap text-muted"><Icon name="close" size={14} /></button>
          </Card>
        </div>
      )}

      {perm !== 'granted' && (
        <div className="px-4 pt-4">
          <Card className="p-5">
            <Icon name="prayer" size={24} className="text-brand" />
            <p className="font-medium mt-3">Be called to every prayer</p>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              Sabeel will show a notification at each prayer time and hold it on screen until you
              have seen it. You choose whether it sounds the adhan, a short chime, or nothing at all.
            </p>
            <Button size="lg" className="mt-4" onClick={enable}>
              <Icon name="check" size={16} />Turn on notifications
            </Button>
            <p className="text-[11px] text-muted/70 mt-3 leading-relaxed">
              Nothing is sent anywhere. There is no push server and no account — the schedule is
              worked out on this device from times it already calculates.
            </p>
          </Card>
        </div>
      )}

      {/* Everything below used to sit in the other half of a ternary, so until
          notifications were allowed there was no way to even look at the adhan
          choice — and if the permission request failed, no way ever. The settings
          are yours to set whenever; they simply do not fire until Android has
          been asked. */}
      <>
          <div className="px-4 pt-4">
            <Card className="divide-y divide-line">
              <Toggle
                checked={!!n.enabled}
                onChange={v => { patch({ enabled: v }); if (v) prime() }}
                label="Prayer notifications"
                // Says what is actually armed. On Android that is a week of
                // alarms held by the OS; in a browser it is the day the page
                // can cover on its own.
                hint={!n.enabled ? 'Off'
                  : status?.days ? `On — ${status.osArmed ?? status.armed} prayers armed for the next ${status.days} days`
                  : 'On — armed for the next 24 hours'}
              />
            </Card>
          </div>

          {n.enabled && (
            <>
              <Section title="Sound">
                <p className="px-4 -mt-1 mb-2 text-[11px] text-muted leading-relaxed">
                  Each prayer has its own setting, changed from the prayer list or below.
                  This sets every prayer at once.
                </p>
                <Choice
                  columns={3} value={allSame(n) || ''}
                  onChange={v => {
                    patch({
                      sound: v,
                      perPrayer: Object.fromEntries(FARD.map(p => [p.id, v]))
                    })
                    if (v !== 'adhan') stopSound()
                  }}
                  options={SOUNDS}
                />
                <div className="px-4 mt-3 flex gap-2">
                  <Button variant="soft" size="sm" onClick={preview}>
                    <Icon name="play" size={14} />Preview
                  </Button>
                  <Button variant="ghost" size="sm" onClick={stopSound}>Stop</Button>
                </div>

                {usesAdhan(n) && (
                  <div className="mt-4 space-y-3">
                    <AdhanPicker
                      slot="default"
                      title="Adhan"
                      note="Used for Dhuhr, Asr, Maghrib and Isha."
                      adhans={adhans?.adhans}
                      selectedId={n.adhanId}
                      useCustom={!!n.useCustomAdhan}
                      onSelect={id => patch({ adhanId: id })}
                      onUseCustom={v => patch({ useCustomAdhan: v })}
                      onMessage={setMsg}
                    />

                    <AdhanPicker
                      slot="fajr"
                      title="Fajr adhan"
                      note="The Fajr call is different — it adds the tathwīb, “aṣ-ṣalātu khayrun min an-nawm” (prayer is better than sleep), after the two ḥayya ʿala-l-falāḥ."
                      adhans={adhans?.adhans}
                      selectedId={n.fajrAdhanId}
                      useCustom={!!n.useCustomFajrAdhan}
                      onSelect={id => patch({ fajrAdhanId: id })}
                      onUseCustom={v => patch({ useCustomFajrAdhan: v })}
                      onMessage={setMsg}
                    />

                    <Card className="mx-4 p-4">
                      <p className="text-[11px] text-muted leading-relaxed">
                        <Icon name="info" size={12} className="inline mr-1 -mt-0.5" />
                        <strong className="text-ink">Why is the built-in list short?</strong>{' '}
                        An adhan recording is a performance, and the famous ones — the muadhdhins
                        of the Haramain, the Egyptian masters — are copyrighted. Sabeel only ships
                        recordings whose licence is stated somewhere checkable, and there are very
                        few of those. While searching, a file served as an adhan by a well-known
                        API turned out to be a track from a copyrighted classical work.
                      </p>
                      <p className="text-[11px] text-muted leading-relaxed mt-2">
                        If you have a recording of a muadhdhin you love, load it with the button
                        above. It stays on your phone, and nothing is uploaded.
                      </p>
                    </Card>
                  </div>
                )}

                <div className="px-4 mt-3">
                  <Card className="divide-y divide-line">
                    <Toggle
                      checked={!!n.vibrate} onChange={v => { patch({ vibrate: v }); if (v) vibrate() }}
                      label="Vibrate" hint="Works alongside any sound setting, including silent"
                    />
                  </Card>
                </div>
              </Section>

              <Section title="Each prayer">
                <Card className="mx-4 divide-y divide-line">
                  {PRAYERS.map(p => p.isPrayer ? (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="flex-1 text-sm">{p.label}</span>
                      <span className="text-[11px] text-muted">
                        {MODES.find(m => m.id === (n.perPrayer?.[p.id] || 'adhan'))?.label}
                      </span>
                      <PrayerSound prayer={p.id} label={p.label} />
                    </div>
                  ) : (
                    <Toggle
                      key={p.id} checked={!!n.notifySunrise}
                      onChange={v => patch({ notifySunrise: v })}
                      label={p.label}
                      hint="Not a prayer — the end of Fajr"
                    />
                  ))}
                </Card>
              </Section>

              <Section title="Remind me before">
                <Choice
                  columns={3} value={n.reminderMinutes ?? 0}
                  onChange={v => patch({ reminderMinutes: v })}
                  options={REMINDERS.map(m => ({ id: m, label: m === 0 ? 'Off' : `${m} min` }))}
                />
              </Section>

              <Section title="Check it works">
                <div className="px-4">
                  <Button size="lg" onClick={test}>
                    <Icon name="flag" size={16} />Send a test notification
                  </Button>
                </div>
                <Card className={`mx-4 mt-3 p-4 ${reliability.level === 'good' || reliability.level === 'best' ? 'border-brand/30' : 'border-amber-500/30'}`}>
                  <div className="flex items-start gap-2">
                    <Icon
                      name={reliability.level === 'good' || reliability.level === 'best' ? 'check' : 'warn'} size={15}
                      className={`shrink-0 mt-0.5 ${reliability.level === 'good' || reliability.level === 'best' ? 'text-brand' : 'text-amber-500'}`}
                    />
                    <div className="flex-1">
                      <p className="text-xs text-muted leading-relaxed">{reliability.text}</p>
                      {status && (
                        <p className="text-[11px] text-muted/70 mt-2 tabular-nums">
                          {status.armed} notification{status.armed === 1 ? '' : 's'} scheduled for the next 24 hours
                          {status.osArmed > 0 && ` · ${status.osArmed} handed to the system`}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="mx-4 mt-3 p-4">
                  <p className="text-xs font-semibold mb-2">If notifications stop arriving</p>
                  <ul className="text-[11px] text-muted leading-relaxed space-y-1.5 list-disc pl-4">
                    {/* Advice to install it is noise to someone reading this inside
                        the installed app — which is where this screen is most
                        likely to be read when something has gone wrong. */}
                    {reliability.level !== 'best' && (
                      <li><strong className="text-ink">Install Sabeel to your home screen.</strong> An installed app is treated far more kindly than a browser tab.</li>
                    )}
                    <li><strong className="text-ink">Xiaomi, Oppo, Vivo, Realme:</strong> Settings → Apps → Sabeel → Battery saver → <em>No restrictions</em>, and turn on Autostart.</li>
                    <li><strong className="text-ink">Samsung:</strong> Settings → Battery → Background usage limits → remove Sabeel from “Sleeping apps”.</li>
                    {reliability.level !== 'best' && (
                      <li><strong className="text-ink">iPhone:</strong> add Sabeel to the Home Screen from Safari's share menu, then allow notifications when asked.</li>
                    )}
                    <li>Check the phone is not in Do Not Disturb or a Focus mode at prayer times.</li>
                  </ul>
                  <p className="text-[11px] text-muted/70 mt-3 leading-relaxed">
                    This is the most common complaint about every prayer app, and it is almost
                    always the phone's battery manager rather than the app.
                  </p>
                </Card>
              </Section>

              {next.length > 0 && (
                <Section title="Next up">
                  <Card className="mx-4 divide-y divide-line">
                    {next.map(item => (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                        <Icon
                          name={item.kind === 'reminder' ? 'counter' : 'prayer'}
                          size={15} className={item.kind === 'reminder' ? 'text-muted' : 'text-brand'}
                        />
                        <span className="flex-1 text-sm">
                          {item.label}
                          {item.kind === 'reminder' && <span className="text-[11px] text-muted ml-2">{item.minutes} min before</span>}
                        </span>
                        <span className="text-sm text-muted tabular-nums">{fmtTime(item.at)}</span>
                      </div>
                    ))}
                  </Card>
                </Section>
              )}
            </>
          )}
      </>

      {/* The second sentence is the part that differs: inside the APK it is
          Android's alarm manager holding the schedule, not the browser, and
          saying otherwise made the app look like it was running in a tab. */}
      <p className="text-[11px] text-muted/70 text-center px-8 mt-8 leading-relaxed">
        No push server, no account, no data leaving your phone. Sabeel works your prayer times out
        on this device and {reliability.level === 'best'
          ? 'hands them to Android to call you, even with no signal.'
          : 'asks the browser to remind you.'}
      </p>
    </Screen>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useSettings } from '../lib/settings.jsx'
import { PRAYERS, FARD } from '../lib/prayer.js'
import { fmtTime } from '../lib/format.js'
import { useData } from '../lib/useData.js'
import { adhanCatalogue } from '../lib/data.js'
import {
  supported, permission, requestPermission, hasTriggers,
  schedule, sendTest, upcoming, describeReliability
} from '../lib/notifications.js'
import { prime, playBeep, playAdhan, stopSound, vibrate, setCustomAdhan, customAdhan } from '../lib/sounds.js'
import { Screen, Header, Card, Section, Toggle, Choice, Button, Empty } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

const SOUNDS = [
  { id: 'adhan', label: 'Adhan', note: 'The full call to prayer' },
  { id: 'beep', label: 'Chime', note: 'A short two-note tone' },
  { id: 'silent', label: 'Silent', note: 'On screen only' }
]

const REMINDERS = [0, 5, 10, 15, 20, 30]

export default function Notifications() {
  const { settings, set } = useSettings()
  const n = settings.notifications || {}

  const [perm, setPerm] = useState(permission())
  const [status, setStatus] = useState(null)
  const [msg, setMsg] = useState(null)
  const [custom, setCustom] = useState(null)
  const fileRef = useRef(null)

  const { data: adhans } = useData(adhanCatalogue, [], { label: 'the adhan list' })

  useEffect(() => { customAdhan().then(setCustom) }, [])
  useEffect(() => () => stopSound(), [])

  // Keep what is armed in step with the settings on this screen.
  useEffect(() => {
    if (perm !== 'granted' || !n.enabled) { setStatus(null); return }
    schedule(settings).then(setStatus)
  }, [settings, perm, n.enabled])

  const patch = p => set({ notifications: { ...n, ...p } })

  async function enable() {
    await prime()                       // unlock audio from this very tap
    const result = await requestPermission()
    setPerm(result)
    if (result === 'granted') {
      patch({ enabled: true })
      setMsg({ tone: 'ok', text: 'Notifications are on. Send a test below to be sure they actually arrive on this phone.' })
    } else if (result === 'denied') {
      setMsg({ tone: 'warn', text: 'Your browser is blocking notifications for this site. Allow them in the site settings — the padlock icon in the address bar — then come back.' })
    }
  }

  async function preview() {
    await prime()
    if (n.sound === 'silent') { vibrate(); setMsg({ tone: 'ok', text: 'Silent mode — the phone vibrated if vibration is on and supported.' }); return }
    if (n.sound === 'beep') { playBeep(); return }
    const file = adhans?.adhans?.[0]?.file
    const el = await playAdhan({ adhanFile: file, useCustom: n.useCustomAdhan, volume: n.volume ?? 1 })
    if (!el) setMsg({ tone: 'warn', text: 'The browser blocked audio. Tap anywhere on the page first, then try again.' })
  }

  async function test() {
    const r = await sendTest(settings)
    setMsg(r.ok
      ? { tone: 'ok', text: `Sent via the ${r.via}. If nothing appeared, your phone is suppressing it — see the note below.` }
      : { tone: 'warn', text: r.reason })
    if (r.ok) preview()
  }

  async function pickFile(file) {
    if (!file) return
    if (!file.type.startsWith('audio/')) { setMsg({ tone: 'warn', text: 'That is not an audio file.' }); return }
    if (file.size > 12 * 1024 * 1024) { setMsg({ tone: 'warn', text: 'Please choose a file under 12 MB.' }); return }
    const rec = await setCustomAdhan(file)
    setCustom(rec)
    patch({ useCustomAdhan: true, sound: 'adhan' })
    setMsg({ tone: 'ok', text: `Using “${rec.name}”. It stays on this device — nothing is uploaded.` })
  }

  const reliability = describeReliability()
  const next = settings.location ? upcoming(settings).slice(0, 4) : []

  if (!supported()) {
    return (
      <Screen>
        <Header title="Prayer notifications" back />
        <Empty icon="warn" title="This browser cannot show notifications" body="Try installing Sabeel to your home screen, or use a different browser." />
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

      {perm !== 'granted' ? (
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
      ) : (
        <>
          <div className="px-4 pt-4">
            <Card className="divide-y divide-line">
              <Toggle
                checked={!!n.enabled}
                onChange={v => { patch({ enabled: v }); if (v) prime() }}
                label="Prayer notifications"
                hint={n.enabled ? 'On — armed for the next 24 hours' : 'Off'}
              />
            </Card>
          </div>

          {n.enabled && (
            <>
              <Section title="Sound">
                <Choice
                  columns={3} value={n.sound || 'adhan'}
                  onChange={v => { patch({ sound: v }); if (v !== 'adhan') stopSound() }}
                  options={SOUNDS}
                />
                <div className="px-4 mt-3 flex gap-2">
                  <Button variant="soft" size="sm" onClick={preview}>
                    <Icon name="play" size={14} />Preview
                  </Button>
                  <Button variant="ghost" size="sm" onClick={stopSound}>Stop</Button>
                </div>

                {n.sound === 'adhan' && (
                  <div className="px-4 mt-4">
                    <Card className="p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <Icon name="info" size={14} className="text-muted shrink-0 mt-0.5" />
                        <p className="text-[11px] text-muted leading-relaxed">
                          {adhans?.adhans?.[0]
                            ? <>
                                Built-in recording by <strong className="text-ink">{adhans.adhans[0].muadhdhin}</strong>,
                                {' '}via Wikimedia Commons, {adhans.adhans[0].licence}.
                              </>
                            : 'Loading the built-in recording…'}
                        </p>
                      </div>

                      <Toggle
                        checked={!!n.useCustomAdhan && !!custom}
                        onChange={v => {
                          if (v && !custom) { fileRef.current?.click(); return }
                          patch({ useCustomAdhan: v })
                        }}
                        label="Use my own adhan"
                        hint={custom ? custom.name : 'Choose an audio file from this device'}
                      />

                      <input
                        ref={fileRef} type="file" accept="audio/*" className="hidden"
                        onChange={e => pickFile(e.target.files?.[0])}
                      />

                      <div className="flex gap-2 mt-3">
                        <Button variant="soft" size="sm" onClick={() => fileRef.current?.click()}>
                          <Icon name="download" size={13} />{custom ? 'Replace file' : 'Choose a file'}
                        </Button>
                        {custom && (
                          <Button
                            variant="ghost" size="sm"
                            onClick={async () => { await setCustomAdhan(null); setCustom(null); patch({ useCustomAdhan: false }) }}
                          >Remove</Button>
                        )}
                      </div>
                      <p className="text-[11px] text-muted/70 mt-3 leading-relaxed">
                        Your file never leaves this phone. It is stored in the browser's own
                        storage and included in your data export.
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

              <Section title="Which prayers">
                <Card className="mx-4 divide-y divide-line">
                  {PRAYERS.map(p => {
                    const on = p.isPrayer
                      ? (n.perPrayer?.[p.id] !== false)
                      : !!n.notifySunrise
                    return (
                      <Toggle
                        key={p.id} checked={on}
                        onChange={v => p.isPrayer
                          ? patch({ perPrayer: { ...(n.perPrayer || {}), [p.id]: v } })
                          : patch({ notifySunrise: v })}
                        label={p.label}
                        hint={p.isPrayer ? undefined : 'Not a prayer — the end of Fajr'}
                      />
                    )
                  })}
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
                <Card className={`mx-4 mt-3 p-4 ${reliability.level === 'good' ? 'border-brand/30' : 'border-amber-500/30'}`}>
                  <div className="flex items-start gap-2">
                    <Icon
                      name={reliability.level === 'good' ? 'check' : 'warn'} size={15}
                      className={`shrink-0 mt-0.5 ${reliability.level === 'good' ? 'text-brand' : 'text-amber-500'}`}
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
                    <li><strong className="text-ink">Install Sabeel to your home screen.</strong> An installed app is treated far more kindly than a browser tab.</li>
                    <li><strong className="text-ink">Xiaomi, Oppo, Vivo, Realme:</strong> Settings → Apps → Sabeel (or your browser) → Battery saver → <em>No restrictions</em>, and turn on Autostart.</li>
                    <li><strong className="text-ink">Samsung:</strong> Settings → Battery → Background usage limits → remove Sabeel from “Sleeping apps”.</li>
                    <li><strong className="text-ink">iPhone:</strong> add Sabeel to the Home Screen from Safari's share menu, then allow notifications when asked.</li>
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
      )}

      <p className="text-[11px] text-muted/70 text-center px-8 mt-8 leading-relaxed">
        No push server, no account, no data leaving your phone. Sabeel works your prayer times out
        on this device and asks the browser to remind you.
      </p>
    </Screen>
  )
}

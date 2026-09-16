# Publishing Sabeel to Google Play

Everything here is in order. Do not skip step 2 — it is the only one that cannot
be undone.

---

## 1. A developer account

**play.google.com/console** · **$25 once**, not per year.

Register as an **organisation** if you ever want someone else to help run it;
personal accounts cannot be transferred to an organisation later. A personal
account is fine otherwise, but note that a personal account created after
November 2023 must show **12 testers for 14 continuous days** before it can
publish publicly. Plan for that: it is the step people are caught by, and it
cannot be rushed.

---

## 2. Create the upload key — and never lose it

```bash
keytool -genkeypair -v \
  -keystore sabeel-upload.jks \
  -alias sabeel \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=Sabeel, O=Sabeel, C=IN"
```

It asks for two passwords. Use the same one for both unless you have a reason
not to.

**This file is the single irreplaceable thing in the whole project.**

- Back it up somewhere that is not this computer. Two places.
- Store the passwords in a password manager, not in a note beside the file.
- Never commit it. `.gitignore` already covers `*.jks`, `*.keystore` and
  `keystore.properties`, and `npm test` fails if that stops being true.

**Turn on Play App Signing** when you first upload — it is offered, and the
default. Google then holds the real signing key and yours becomes an *upload*
key, which can be reset if you lose it. Decline it and a lost key means you can
never update this app again: no appeal, no recovery. You publish a new listing
and start from zero reviews and installs.

Then, locally, create `keystore.properties` in the repo root:

```properties
storeFile=/absolute/path/to/sabeel-upload.jks
storePassword=...
keyAlias=sabeel
keyPassword=...
```

For CI, add four repository secrets instead — Settings → Secrets → Actions:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 sabeel-upload.jks` |
| `ANDROID_STORE_PASSWORD` | the store password |
| `ANDROID_KEY_ALIAS` | `sabeel` |
| `ANDROID_KEY_PASSWORD` | the key password |

---

## 3. Build the bundle

Play wants an **`.aab`**, not an APK. It has not accepted APKs for new apps
since 2021 — it slices the bundle per device, which is worth a lot here given
the app carries the whole Quran and 36,104 hadith.

Run the **Play Store bundle** workflow in the Actions tab and give it a version
name (`1.0.0`). It builds, tests, signs, and attaches the `.aab`.

Locally, if you prefer:

```bash
npm run data:all && npm run build && npx cap sync android && node scripts/android-setup.mjs
cd android && ./gradlew bundleRelease
```

`versionCode` comes from the commit count and rises on its own. `versionName` is
whatever is in `VERSION`, or whatever you pass the workflow.

---

## 4. The store listing

Copy is in [STORE-LISTING.md](STORE-LISTING.md), written and within the limits.

Graphics you must supply:

| Asset | Size | Notes |
| --- | --- | --- |
| App icon | 512×512 PNG | `public/icon-512.png` is exactly this |
| Feature graphic | 1024×500 PNG | Required. Shown at the top of the listing |
| Phone screenshots | 2–8, min 1080px wide | Portrait |
| Tablet screenshots | optional | Improves ranking on tablets |

Take screenshots from the app itself. In order: the muṣḥaf page, prayer times,
the dua index, hadith search, the qibla. Put a one-line caption on each — a bare
screenshot converts far worse than one that says what it is showing.

---

## 5. The forms Play makes you fill in

**Privacy policy URL.** Required, and it must be a live public URL. Once the
repo is public:

```
https://github.com/Ibsuhaib/sabeel/blob/main/PRIVACY.md
```

**Data safety.** This is the easy one, and it is worth being precise because it
appears on your listing and is a genuine advantage here:

- Does your app collect or share any user data? → **No**
- Is all data encrypted in transit? → not applicable, nothing is transmitted
- Can users request data deletion? → not applicable, nothing is stored off-device

Location is used but never *collected* in Play's sense — it never leaves the
device. Answer "no data collected" and say so in the description.

**Content rating.** Answer the questionnaire honestly; Sabeel comes out at
**Everyone / PEGI 3**. There is no violence, no purchases, no user content and
no communication.

**Target audience.** 13+ is the simplest answer. Declaring an audience under 13
pulls in Families Policy requirements you do not need.

**Ads.** Declare **no ads**. This is checked.

**App access.** "All functionality is available without special access" — there
is no login.

---

## 6. Release safely

Use the tracks in order. Each takes as long as it takes.

1. **Internal testing** — up to 100 testers, available in minutes. Install from
   Play on a real phone and check the things that only break in a signed,
   shrunk, store-delivered build: notifications firing, the adhan sounding, the
   muṣḥaf rendering, audio downloading.
2. **Closed testing** — this is where a personal account serves its 12-testers,
   14-days requirement.
3. **Production**, at a **staged rollout of 20%**. Watch the crash rate for two
   days, then go to 100%. A staged rollout can be halted; a full one cannot.

First review usually takes a few days. Later updates are faster.

---

## Before you press publish

- [ ] Upload key backed up in two places, Play App Signing on
- [ ] `npm test` green, including `check:release`
- [ ] Installed the signed build from Play internal testing on a real phone
- [ ] Prayer notification fired at the right minute with the phone locked
- [ ] Aeroplane mode: Quran, hadith, dua, prayer times, qibla all still work
- [ ] Privacy policy URL loads publicly
- [ ] Data safety says no data collected
- [ ] Screenshots captioned

---

## What breaks after launch, and why

**Notifications stop for some users.** Almost always the phone's battery
manager, not the app — Xiaomi, Oppo, Vivo and Samsung are the usual names. The
in-app notification screen already explains this per manufacturer. Expect it in
reviews; answer with that.

**"It says unknown developer".** Only for sideloaded APKs. Anything from Play is
signed by Play.

**Someone reports a wrong hadith or du'a.** Take it seriously and answer fast.
`npm run check:sources` verifies all 200 citations against the shipped data, so
you can check a claim in seconds. Being visibly careful about this is worth more
than any feature.

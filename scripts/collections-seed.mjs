// Ways into the duas that are not "which book is it in".
//
// The dua sections are arranged the way the sources are — morning adhkar, duas
// in the Quran, the Sunan. That is the right arrangement for someone who already
// knows what they are looking for, and no use at all to someone who is anxious at
// two in the morning and does not know that what they want is filed under
// "situational". These are the other index: by the hour, by the feeling, by the
// thing that has happened.
//
// Nothing here is content. Every entry is a *reference* to a du'a that already
// exists, so there is exactly one copy of each text and one source under it, and
// the build fails if a reference points at something that is not there.
//
// The grouping is editorial — an arrangement for finding things, not a claim that
// tradition files them this way. Where a collection names a feeling, the narration
// itself has to be about that: "when angry" is here because the hadith is about a
// man who was angry, not because the words sound calming.

export const GROUPS = [
  { id: 'times', label: 'Through the day' },
  { id: 'turning', label: 'Turning back' },
  { id: 'feeling', label: 'However you are feeling' },
  { id: 'need', label: 'When you need something' },
  { id: 'everyday', label: 'Everyday' },
  { id: 'sections', label: 'The sections themselves' }
]

export const COLLECTIONS = [
  /* ------------------------------ through the day ----------------------- */
  {
    slug: 'tahajjud', title: 'Tahajjud', blurb: 'Rising in the last part of the night',
    group: 'times', scene: 'night-window',
    items: ['tahajjud/1', 'tahajjud/2', 'tahajjud/3', 'situational/14', 'daily-dua/2']
  },
  {
    slug: 'before-sleep', title: 'Before Sleep', blurb: 'Said lying down for the night',
    group: 'times', scene: 'night-house',
    items: ['daily-dua/1', 'situational/13', 'protection/1', 'protection/3', 'protection/4', 'protection/5']
  },
  {
    slug: 'on-waking', title: 'On Waking', blurb: 'The first words of the day',
    group: 'times', scene: 'dawn',
    items: ['daily-dua/2', 'situational/14', 'morning-dhikr/5', 'morning-dhikr/6']
  },
  {
    // The section entire, rather than a hand-picked subset of it. Picking meant
    // choosing between two tellings of the tahlil that both belong here, and
    // whichever lost was then in no collection at all and unreachable.
    slug: 'after-salah', title: 'After Salah', blurb: 'Said after each obligatory prayer',
    group: 'times', scene: 'mat', all: 'dhikr-after-salah'
  },

  /* ------------------------------- turning back ------------------------- */
  {
    slug: 'istighfar', title: 'Istighfar', blurb: 'Asking to be forgiven',
    group: 'turning', scene: 'lantern',
    items: ['aurad/5', 'aurad/6', 'morning-dhikr/7', 'morning-dhikr/19', 'daily-dua/27', 'dhikr-after-salah/1']
  },
  {
    slug: 'tawba', title: 'Tawba', blurb: 'Turning back after a wrong',
    group: 'turning', scene: 'open-hands',
    items: ['tawba/1', 'tawba/2', 'tawba/3', 'aurad/5', 'daily-dua/38']
  },

  /* --------------------------- however you feel ------------------------- */
  {
    slug: 'anxious', title: 'Anxious or Grieving', blurb: 'Worry, sadness, a heavy chest',
    group: 'feeling', scene: 'storm',
    items: ['situational/10', 'situational/1', 'daily-dua/31', 'selected-dua/7', 'quran-dua/11', 'daily-dua/29']
  },
  {
    slug: 'angry', title: 'Angry', blurb: 'When your temper rises',
    group: 'feeling', scene: 'ember',
    items: ['situational/12', 'daily-dua/36', 'morning-dhikr/10']
  },
  {
    slug: 'afraid', title: 'Afraid', blurb: 'Fear of people, of the dark, of what may come',
    group: 'feeling', scene: 'shield',
    items: ['situational/19', 'situational/20', 'quran-dua/6', 'protection/6', 'protection/7', 'protection/8']
  },
  {
    slug: 'grateful', title: 'Grateful', blurb: 'When something good has happened',
    group: 'feeling', scene: 'sunburst',
    items: ['situational/17', 'situational/18', 'selected-dua/8', 'situational/22']
  },
  {
    slug: 'hardship', title: 'In Hardship', blurb: 'When it is simply hard',
    group: 'feeling', scene: 'mountain',
    items: ['situational/16', 'quran-dua/10', 'daily-dua/29', 'situational/1', 'daily-dua/28']
  },

  /* ---------------------------- when you need --------------------------- */
  {
    slug: 'success', title: 'Success & Provision', blurb: 'Work, rizq, an exam, a hard task',
    group: 'need', scene: 'path',
    items: ['morning-dhikr/17', 'quran-dua/8', 'daily-dua/28', 'quran-dua/1', 'selected-dua/1']
  },
  {
    slug: 'guidance', title: 'A Decision', blurb: 'Istikharah, and asking to be shown',
    group: 'need', scene: 'compass',
    items: ['situational/11', 'morning-dhikr/13', 'quran-dua/4', 'tahajjud/2']
  },
  {
    slug: 'health', title: 'Health & Illness', blurb: 'For yourself, and for the sick',
    group: 'need', scene: 'leaf',
    items: ['situational/8', 'situational/7', 'morning-dhikr/8', 'situational/22', 'selected-dua/6']
  },
  {
    slug: 'debt', title: 'Debt & Money', blurb: 'When what is owed weighs on you',
    group: 'need', scene: 'scales',
    items: ['situational/9', 'daily-dua/30', 'daily-dua/31', 'selected-dua/7']
  },
  {
    slug: 'family', title: 'Family & Children', blurb: 'Spouse, children, parents',
    group: 'need', scene: 'house-heart',
    items: ['quran-dua/13', 'quran-dua/5', 'situational/15', 'situational/21', 'daily-dua/38', 'quran-dua/12']
  },
  {
    slug: 'steadfast', title: 'A Firm Heart', blurb: 'To be kept on the religion',
    group: 'need', scene: 'anchor',
    items: ['situational/24', 'quran-dua/2', 'quran-dua/4', 'selected-dua/2', 'selected-dua/3', 'selected-dua/4']
  },
  {
    slug: 'protection', title: 'Protection', blurb: 'From harm, from the evil eye, from shaytan',
    group: 'need', scene: 'shield-star',
    items: ['protection/1', 'protection/2', 'protection/3', 'protection/4', 'protection/5', 'protection/6', 'protection/7', 'situational/21']
  },

  /* ------------------------------- everyday ----------------------------- */
  {
    slug: 'home', title: 'At Home', blurb: 'Coming in, going out',
    group: 'everyday', scene: 'door',
    items: ['daily-dua/13', 'daily-dua/14', 'daily-dua/15', 'daily-dua/16', 'situational/3']
  },
  {
    slug: 'travel', title: 'Travel', blurb: 'Setting off, and the road',
    group: 'everyday', scene: 'road',
    items: ['daily-dua/17', 'situational/2', 'daily-dua/22', 'daily-dua/18', 'daily-dua/19']
  },
  {
    slug: 'eating', title: 'Eating', blurb: 'Before, after, and a forgotten bismillah',
    group: 'everyday', scene: 'bowl',
    items: ['daily-dua/5', 'daily-dua/6', 'daily-dua/7', 'daily-dua/12']
  },
  {
    slug: 'masjid', title: 'The Masjid', blurb: 'Going in, coming out, the adhan',
    group: 'everyday', scene: 'dome',
    items: ['daily-dua/8', 'daily-dua/9', 'situational/4', 'situational/5', 'daily-dua/37', 'daily-dua/11']
  },
  {
    slug: 'weather', title: 'Rain & Wind', blurb: 'When the weather turns',
    group: 'everyday', scene: 'rain',
    items: ['daily-dua/23', 'daily-dua/24', 'daily-dua/25', 'daily-dua/26', 'situational/6']
  },
  {
    slug: 'out-and-about', title: 'Out & About', blurb: 'The market, clothes, a sneeze',
    group: 'everyday', scene: 'lamp',
    items: ['situational/23', 'daily-dua/20', 'daily-dua/21', 'daily-dua/32', 'daily-dua/33', 'daily-dua/34']
  },

  /* ---------------------------- the sections ---------------------------- */
  // The app's own arrangement, in the same form as everything else. These used
  // to be a separate grid of plain tiles below the cards, which meant Tahajjud
  // appeared twice in two different styles — once as a card and once as a tile —
  // and looked like two features rather than one.
  //
  // `all` takes the section entire and in its own order, so adding a du'a to a
  // section puts it here too without anyone remembering to.
  { slug: 'morning-adhkar', title: 'Morning Adhkar', blurb: 'After Fajr until sunrise', group: 'sections', scene: 'sunrise-hills', all: 'morning-dhikr' },
  { slug: 'evening-adhkar', title: 'Evening Adhkar', blurb: 'After Asr until Maghrib', group: 'sections', scene: 'dusk-hills', all: 'evening-dhikr' },
  { slug: 'daily', title: 'Daily Duas', blurb: 'Waking, eating, leaving home, sleep', group: 'sections', scene: 'day-arc', all: 'daily-dua' },
  { slug: 'selected', title: 'Selected Duas', blurb: 'From the Quran and Sunnah', group: 'sections', scene: 'star-field', all: 'selected-dua' },
  { slug: 'salawat', title: 'Salawat', blurb: 'Blessings upon the Prophet ﷺ', group: 'sections', scene: 'crescent-star', all: 'salawat' },
  { slug: 'aurad', title: 'Aurad', blurb: 'Counted litanies kept up daily', group: 'sections', scene: 'beads', all: 'aurad' },
  { slug: 'from-the-quran', title: 'Duas in the Quran', blurb: 'The supplications of the Prophets', group: 'sections', scene: 'book-open', all: 'quran-dua' },
  { slug: 'hajj-umrah', title: 'Hajj & Umrah', blurb: 'Talbiyah, tawaf, Safa and Marwah', group: 'sections', scene: 'kaaba', all: 'hajj-umrah' },
  { slug: 'every-situation', title: 'Every Situation', blurb: 'Travel, rain, illness, distress, debt', group: 'sections', scene: 'signpost', all: 'situational' }
]

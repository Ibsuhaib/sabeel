// The content seed for the extra dua sections.
//
// Nothing here contains Arabic scripture. Each entry names *where* its words
// live — a phrase to find in the hadith corpus, or an ayah range in the muṣḥaf —
// and the builder lifts the actual vowelled text out of the data the app already
// ships. That way the Arabic on screen is Bukhari's, Muslim's or the muṣḥaf's,
// and a reference can be printed under every single one.
//
//   find / to   probe phrases. `find` locates the narration, `to` marks where the
//               lifted span should end. Diacritics optional — matching is done on
//               consonant skeletons.
//   quran       [surah, firstAyah, lastAyah] — text and translation come from the
//               muṣḥaf files, so the reference is exact by construction.
//   count       how many times it is said, when the narration specifies a number.
//   benefits    what the narration itself states about it. Never an inference.
//
// An entry whose probe cannot be found is reported by the build and ships with no
// source line rather than a guessed one.

export const CATEGORIES = [
  {
    slug: 'salawat',
    title: 'Salawat',
    blurb: 'Sending blessings upon the Prophet ﷺ',
    icon: 'heart',
    items: [
      {
        title: 'Salat al-Ibrahimiyyah',
        find: 'اللهم صل على محمد وعلى آل محمد', to: 'إنك حميد مجيد',
        tr: 'Allahumma salli ʿala Muhammadin wa ʿala ali Muhammad, kama sallayta ʿala Ibrahima wa ʿala ali Ibrahim, innaka Hamidun Majid.',
        en: 'O Allah, send blessings upon Muhammad and upon the family of Muhammad, as You sent blessings upon Ibrahim and upon the family of Ibrahim. Indeed You are Praiseworthy, Glorious.',
        benefits: 'The salawat the Companions were taught when they asked how to send blessings upon him ﷺ. Recited in the final sitting of every prayer.'
      },
      {
        title: 'The blessing joined to it',
        find: 'اللهم بارك على محمد', to: 'إنك حميد مجيد',
        tr: 'Allahumma barik ʿala Muhammadin wa ʿala ali Muhammad, kama barakta ʿala Ibrahima wa ʿala ali Ibrahim, innaka Hamidun Majid.',
        en: 'O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim. Indeed You are Praiseworthy, Glorious.'
      },
      {
        title: 'Salawat on his household',
        find: 'اللهم صل على محمد وعلى أزواجه', to: 'إنك حميد مجيد',
        tr: 'Allahumma salli ʿala Muhammadin wa ʿala azwajihi wa dhurriyyatih, kama sallayta ʿala ali Ibrahim; wa barik ʿala Muhammadin wa ʿala azwajihi wa dhurriyyatih, kama barakta ʿala ali Ibrahim, innaka Hamidun Majid.',
        en: 'O Allah, send blessings upon Muhammad and upon his wives and his offspring, as You sent blessings upon the family of Ibrahim; and bless Muhammad and his wives and his offspring, as You blessed the family of Ibrahim. Indeed You are Praiseworthy, Glorious.'
      },
      {
        title: 'After the adhan',
        find: 'اللهم رب هذه الدعوة التامة', to: 'الذي وعدته',
        tr: 'Allahumma Rabba hadhihi-d-daʿwatit-tammah, was-salatil-qa’imah, ati Muhammadanil-wasilata wal-fadilah, wabʿathhu maqaman mahmudanilladhi waʿadtah.',
        en: 'O Allah, Lord of this perfect call and the prayer about to be established, grant Muhammad the means and the excellence, and raise him to the praised station You have promised him.',
        benefits: 'Said on hearing the adhan. The narration attaches intercession on the Day of Rising to whoever says it.'
      },
      {
        title: 'Ten in return for one',
        find: 'من صلى علي', to: 'عشرا',
        tr: 'Man salla ʿalayya salatan sallallahu ʿalayhi biha ʿashra.',
        en: 'Whoever sends blessings upon me once, Allah sends blessings upon him ten times over.',
        note: 'This is the Prophet’s ﷺ own statement about salawat, not a formula to recite.'
      }
    ]
  },

  {
    slug: 'aurad',
    title: 'Aurad',
    blurb: 'Counted litanies kept up daily',
    icon: 'counter',
    items: [
      {
        title: 'Tasbih after every prayer',
        find: 'سبحان الله', to: 'والله أكبر', context: ['ثلاثا وثلاثين'],
        tr: 'Subhan Allah (33×), al-hamdu lillah (33×), Allahu akbar (33×).',
        en: 'Glory be to Allah. All praise is for Allah. Allah is the greatest.',
        count: 33
      },
      {
        title: 'Completing the hundred',
        find: 'لا إله إلا الله وحده لا شريك له له الملك وله الحمد وهو على كل شيء قدير',
        tr: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa ʿala kulli shay’in qadir.',
        en: 'There is no god but Allah alone, with no partner. His is the dominion and His is the praise, and He is capable of all things.',
        count: 100
      },
      {
        title: 'Subhan Allahi wa bihamdih',
        find: 'سبحان الله وبحمده', context: ['زبد البحر'],
        tr: 'Subhan Allahi wa bihamdih.',
        en: 'Glory be to Allah, and praise be to Him.',
        count: 100,
        benefits: 'Said a hundred times in a day, the narration states his sins are removed though they be like the foam of the sea.'
      },
      {
        title: 'The two light words',
        find: 'سبحان الله وبحمده سبحان الله العظيم',
        tr: 'Subhan Allahi wa bihamdih, Subhan Allahil-ʿAzim.',
        en: 'Glory be to Allah and praise be to Him; glory be to Allah the Magnificent.',
        benefits: 'Light on the tongue, heavy on the scales, beloved to the Most Merciful.',
        count: 100
      },
      {
        title: 'Sayyid al-Istighfar',
        find: 'اللهم أنت ربي لا إله إلا أنت', to: 'لا يغفر الذنوب إلا أنت',
        tr: 'Allahumma anta Rabbi la ilaha illa ant, khalaqtani wa ana ʿabduk, wa ana ʿala ʿahdika wa waʿdika mastataʿt, aʿudhu bika min sharri ma sanaʿt, abu’u laka biniʿmatika ʿalayya wa abu’u laka bidhanbi, faghfir li fa innahu la yaghfirudh-dhunuba illa ant.',
        en: 'O Allah, You are my Lord; there is no god but You. You created me and I am Your servant. I keep Your covenant and Your promise as much as I can. I seek refuge in You from the evil I have done. I acknowledge Your favour upon me and I acknowledge my sin, so forgive me — for none forgives sins but You.',
        benefits: 'Called the most excellent manner of seeking forgiveness. Said morning and evening.'
      },
      {
        title: 'Seeking forgiveness',
        find: 'أستغفر الله وأتوب إليه',
        tr: 'Astaghfirullaha wa atubu ilayh.',
        en: 'I seek Allah’s forgiveness and turn to Him in repentance.',
        count: 100
      },
      {
        title: 'The treasure of Paradise',
        find: 'لا حول ولا قوة إلا بالله', context: ['كنز من كنوز الجنة'],
        tr: 'La hawla wa la quwwata illa billah.',
        en: 'There is no might nor power except with Allah.',
        benefits: 'Described in the narration as a treasure from the treasures of Paradise.'
      }
    ]
  },

  {
    slug: 'quran-dua',
    title: 'Duas in the Quran',
    blurb: 'The supplications of the Prophets',
    icon: 'quran',
    items: [
      { title: 'The comprehensive dua', quran: [2, 201], clip: 'ربنا آتنا' },
      { title: 'Ayat of steadfastness', quran: [2, 250], clip: 'ربنا أفرغ علينا' },
      { title: 'What we can bear', quran: [2, 286], clip: 'ربنا لا تؤاخذنا' },
      { title: 'That hearts not swerve', quran: [3, 8] },
      { title: 'Zakariyya: for offspring', quran: [3, 38], clip: 'رب هب لي' },
      { title: 'Sufficient is Allah', quran: [3, 173], clip: 'حسبنا الله ونعم الوكيل' },
      { title: 'Adam: we have wronged ourselves', quran: [7, 23], clip: 'ربنا ظلمنا' },
      { title: 'Musa: expand my breast', quran: [20, 25, 28], clip: 'رب اشرح' },
      { title: 'Increase me in knowledge', quran: [20, 114], clip: 'رب زدني علما' },
      { title: 'Ayyub: adversity has touched me', quran: [21, 83], clip: 'أني مسني الضر' },
      { title: 'Yunus: in the darknesses', quran: [21, 87], clip: 'لا إله إلا أنت سبحانك' },
      { title: 'Zakariyya: leave me not alone', quran: [21, 89], clip: 'رب لا تذرني' },
      { title: 'Coolness of the eyes', quran: [25, 74], clip: 'ربنا هب لنا' },
      { title: 'Musa: in need of good', quran: [28, 24], clip: 'رب إني لما أنزلت' },
      { title: 'Ibrahim: keeper of prayer', quran: [14, 40, 41] }
    ]
  },

  {
    slug: 'protection',
    title: 'Ruqyah & Refuge',
    blurb: 'Quran and words of seeking protection',
    icon: 'shield',
    items: [
      { title: 'Ayat al-Kursi', quran: [2, 255], benefits: 'Recited after every obligatory prayer, and on lying down.' },
      { title: 'The closing of al-Baqarah', quran: [2, 285, 286], benefits: 'The narration states that whoever recites these two at night, they suffice him.' },
      { title: 'Surah al-Ikhlas', quran: [112, 1, 4] },
      { title: 'Surah al-Falaq', quran: [113, 1, 5] },
      { title: 'Surah an-Nas', quran: [114, 1, 6] },
      {
        title: 'The perfect words',
        find: 'أعوذ بكلمات الله التامات من شر ما خلق',
        tr: 'Aʿudhu bikalimatillahit-tammati min sharri ma khalaq.',
        en: 'I seek refuge in the perfect words of Allah from the evil of what He has created.',
        count: 3
      },
      {
        title: 'Nothing harms with His name',
        find: 'بسم الله الذي لا يضر مع اسمه شيء',
        tr: 'Bismillahilladhi la yadurru maʿa-smihi shay’un fil-ardi wa la fis-sama’, wa huwas-Samiʿul-ʿAlim.',
        en: 'In the name of Allah, with whose name nothing on earth or in heaven can cause harm, and He is the All-Hearing, the All-Knowing.',
        count: 3
      },
      {
        title: 'Upon Him I rely',
        find: 'حسبي الله لا إله إلا هو عليه توكلت', to: 'وهو رب العرش العظيم',
        tr: 'Hasbiyallahu la ilaha illa huwa, ʿalayhi tawakkaltu wa huwa Rabbul-ʿArshil-ʿAzim.',
        en: 'Allah is sufficient for me. There is no god but Him. Upon Him I rely, and He is the Lord of the Mighty Throne.',
        count: 7
      }
    ]
  },

  {
    slug: 'hajj-umrah',
    title: 'Hajj & Umrah',
    blurb: 'From ihram to the farewell tawaf',
    icon: 'kaaba',
    items: [
      {
        title: 'The Talbiyah',
        find: 'لبيك اللهم لبيك', to: 'لا شريك لك',
        tr: 'Labbayka-llahumma labbayk, labbayka la sharika laka labbayk, innal-hamda wan-niʿmata laka wal-mulk, la sharika lak.',
        en: 'Here I am, O Allah, here I am. Here I am, You have no partner, here I am. Truly all praise, favour and dominion are Yours. You have no partner.',
        benefits: 'Said from entering ihram until the stoning of Jamrat al-ʿAqabah.'
      },
      { title: 'During tawaf, between the two corners', quran: [2, 201], clip: 'ربنا آتنا' },
      {
        title: 'On climbing as-Safa',
        find: 'إن الصفا والمروة من شعائر الله',
        tr: 'Innas-Safa wal-Marwata min shaʿa’irillah.',
        en: 'Indeed as-Safa and al-Marwah are among the symbols of Allah.',
        benefits: 'Recited on approaching as-Safa to begin the saʿy.'
      },
      {
        title: 'Standing at as-Safa and al-Marwah',
        find: 'لا إله إلا الله وحده لا شريك له', to: 'وهزم الأحزاب وحده',
        context: ['أنجز وعده ونصر عبده'],
        tr: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa ʿala kulli shay’in qadir. La ilaha illallahu wahdah, anjaza waʿdah, wa nasara ʿabdah, wa hazamal-ahzaba wahdah.',
        en: 'There is no god but Allah alone, with no partner. His is the dominion and His is the praise, and He is capable of all things. There is no god but Allah alone: He fulfilled His promise, aided His servant, and defeated the confederates alone.',
        count: 3
      },
      {
        title: 'The day of ʿArafah',
        find: 'خير الدعاء دعاء يوم عرفة',
        tr: 'Khayrud-duʿa’i duʿa’u yawmi ʿArafah.',
        en: 'The best supplication is the supplication of the Day of ʿArafah.',
        note: 'The best of what was said by him ﷺ and the prophets before him is the words of tawhid above.'
      }
    ]
  },

  {
    slug: 'situational',
    title: 'Every Situation',
    blurb: 'Travel, rain, illness, distress, debt',
    icon: 'compass',
    items: [
      {
        title: 'In distress',
        find: 'لا إله إلا الله العظيم الحليم', to: 'رب العرش الكريم',
        tr: 'La ilaha illallahul-ʿAzimul-Halim, la ilaha illallahu Rabbul-ʿArshil-ʿAzim, la ilaha illallahu Rabbus-samawati wa Rabbul-ardi wa Rabbul-ʿArshil-Karim.',
        en: 'There is no god but Allah, the Magnificent, the Forbearing. There is no god but Allah, Lord of the Mighty Throne. There is no god but Allah, Lord of the heavens and Lord of the earth and Lord of the Noble Throne.'
      },
      {
        title: 'Setting out on a journey',
        find: 'سبحان الذي سخر لنا هذا', to: 'لمنقلبون',
        tr: 'Subhanalladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila Rabbina lamunqalibun.',
        en: 'Glory to Him who has subjected this to us, and we could never have accomplished it. And indeed to our Lord we will return.'
      },
      {
        title: 'Leaving the house',
        find: 'بسم الله توكلت على الله', to: 'إلا بالله',
        tr: 'Bismillah, tawakkaltu ʿalallah, wa la hawla wa la quwwata illa billah.',
        en: 'In the name of Allah, I rely upon Allah, and there is no might nor power except with Allah.'
      },
      {
        title: 'Entering the masjid',
        find: 'اللهم افتح لي أبواب رحمتك',
        tr: 'Allahumma-ftah li abwaba rahmatik.',
        en: 'O Allah, open for me the doors of Your mercy.'
      },
      {
        title: 'Leaving the masjid',
        find: 'اللهم إني أسألك من فضلك',
        tr: 'Allahumma inni as’aluka min fadlik.',
        en: 'O Allah, I ask You of Your bounty.'
      },
      {
        title: 'When rain falls',
        find: 'صيبا نافعا',
        tr: 'Sayyiban nafiʿa.',
        en: 'A beneficial downpour.',
        note: 'Bukhari’s wording is these two words alone; the longer “Allahumma sayyiban nafiʿa” is from other routes.'
      },
      {
        title: 'Visiting the sick',
        find: 'لا بأس طهور إن شاء الله',
        tr: 'La ba’sa, tahurun in sha’ Allah.',
        en: 'No harm, it is a purification, if Allah wills.'
      },
      {
        title: 'Asking for a cure',
        find: 'أذهب البأس رب الناس', to: 'لا يغادر سقما',
        tr: 'Adhhibil-ba’sa Rabban-nas, ishfi antash-Shafi, la shifa’a illa shifa’uk, shifa’an la yughadiru saqama.',
        en: 'Remove the harm, Lord of mankind. Heal — You are the Healer. There is no healing but Your healing, a healing that leaves behind no illness.'
      },
      {
        title: 'Under the weight of debt',
        find: 'اللهم اكفني بحلالك عن حرامك',
        tr: 'Allahumma-kfini bihalalika ʿan haramik, wa aghnini bifadlika ʿamman siwak.',
        en: 'O Allah, suffice me with what You have made lawful against what You have forbidden, and enrich me by Your bounty so I need none besides You.'
      },
      {
        title: 'Anxiety and grief',
        find: 'اللهم إني أعوذ بك من الهم والحزن', to: 'وغلبة الرجال',
        tr: 'Allahumma inni aʿudhu bika minal-hammi wal-hazan, wal-ʿajzi wal-kasal, wal-bukhli wal-jubn, wa dalaʿid-dayni wa ghalabatir-rijal.',
        en: 'O Allah, I seek refuge in You from anxiety and grief, from incapacity and laziness, from miserliness and cowardice, from the burden of debt and from being overpowered by men.'
      },
      {
        title: 'Seeking guidance — Istikharah',
        find: 'اللهم إني أستخيرك بعلمك', to: 'علام الغيوب',
        tr: 'Allahumma inni astakhiruka biʿilmik, wa astaqdiruka biqudratik, wa as’aluka min fadlikal-ʿazim, fa innaka taqdiru wa la aqdir, wa taʿlamu wa la aʿlam, wa anta ʿallamul-ghuyub.',
        en: 'O Allah, I seek Your guidance by Your knowledge, and Your power by Your might, and I ask You of Your immense bounty. For You are able and I am not, You know and I do not, and You are the Knower of all that is hidden.',
        benefits: 'Prayed as two rakʿahs outside the obligatory prayers, then this said.'
      },
      {
        title: 'When angry',
        find: 'أعوذ بالله من الشيطان الرجيم',
        tr: 'Aʿudhu billahi minash-shaytanir-rajim.',
        en: 'I seek refuge in Allah from the accursed Shaytan.'
      },
      {
        title: 'Lying down to sleep',
        find: 'باسمك اللهم أموت وأحيا',
        tr: 'Bismika-llahumma amutu wa ahya.',
        en: 'In Your name, O Allah, I die and I live.'
      },
      {
        title: 'On waking',
        find: 'الحمد لله الذي أحيانا بعد ما أماتنا',
        tr: 'Al-hamdu lillahilladhi ahyana baʿda ma amatana wa ilayhin-nushur.',
        en: 'All praise is for Allah who gave us life after He caused us to die, and to Him is the resurrection.'
      },
      {
        title: 'For someone who marries',
        find: 'بارك الله لك وبارك عليك',
        tr: 'Barakallahu lak, wa baraka ʿalayk, wa jamaʿa baynakuma fi khayr.',
        en: 'May Allah bless you, and send blessings upon you, and join you both in goodness.'
      },
      {
        title: 'In hardship and toil',
        find: 'اللهم لا عيش إلا عيش الآخرة',
        tr: 'Allahumma la ʿaysha illa ʿayshal-akhirah.',
        en: 'O Allah, there is no life but the life of the Hereafter.',
        note: 'Said by him ﷺ while digging the trench.'
      },
      {
        title: 'When something good happens',
        find: 'الحمد لله الذي بنعمته تتم الصالحات',
        tr: 'Al-hamdu lillahilladhi bi-niʿmatihi tatimmus-salihat.',
        en: 'All praise is for Allah, by whose favour good things are completed.'
      },
      {
        title: 'To be helped to give thanks',
        find: 'اللهم أعني على ذكرك وشكرك', to: 'وحسن عبادتك',
        tr: 'Allahumma aʿinni ʿala dhikrika wa shukrika wa husni ʿibadatik.',
        en: 'O Allah, help me to remember You, to thank You, and to worship You well.',
        note: 'He ﷺ took Muʿadh by the hand, told him he loved him, and taught him never to leave this after any prayer.'
      },
      {
        title: 'Facing people you are afraid of',
        find: 'اللهم إنا نجعلك في نحورهم', to: 'شرورهم',
        tr: 'Allahumma inna najʿaluka fi nuhurihim wa naʿudhu bika min shururihim.',
        en: 'O Allah, we place You before them, and we seek refuge in You from their evil.'
      },
      {
        title: 'Frightened in the night',
        find: 'من غضبه وشر عباده', to: 'أن يحضرون',
        tr: '…min ghadabihi wa sharri ʿibadihi wa min hamazatish-shayatini wa an yahdurun.',
        en: '…from His anger, from the evil of His servants, from the promptings of the devils, and from their presence.'
      },
      {
        title: 'Over a child, for protection',
        find: 'أعيذكما بكلمات الله التامة', to: 'لامة',
        tr: 'Uʿidhukuma bi-kalimatillahit-tammati min kulli shaytanin wa hammatin wa min kulli ʿaynin lammah.',
        en: 'I place you both in the protection of the perfect words of Allah, from every devil and every creeping thing, and from every envious eye.',
        note: 'He ﷺ used to say it over al-Hasan and al-Husayn.'
      },
      {
        title: 'Seeing someone afflicted',
        find: 'الحمد لله الذي عافاني مما ابتلاك به', to: 'تفضيلا',
        tr: 'Al-hamdu lillahilladhi ʿafani mimmabtalaka bihi wa faddalani ʿala kathirin mimman khalaqa tafdila.',
        en: 'All praise is for Allah who kept me safe from what He tested you with, and favoured me over much of what He created.',
        note: 'Said quietly, so the one who is afflicted does not hear it.'
      },
      {
        title: 'Entering a market',
        find: 'لا إله إلا الله وحده لا شريك له', to: 'وهو على كل شيء قدير',
        context: ['يحيي ويميت', 'السوق'],
        tr: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, yuhyi wa yumit, wa huwa hayyun la yamut, biyadihil-khayr, wa huwa ʿala kulli shay’in qadir.',
        en: 'There is no god but Allah alone, with no partner. His is the dominion and His the praise. He gives life and causes death, and He is living and does not die. In His hand is all good, and He is capable of all things.'
      },
      {
        title: 'For a heart that keeps to the truth',
        find: 'يا مقلب القلوب ثبت قلبي على دينك',
        tr: 'Ya muqallibal-qulub, thabbit qalbi ʿala dinik.',
        en: 'O Turner of hearts, make my heart firm upon Your religion.',
        note: 'He ﷺ swore by it often, and when asked why, said that hearts are between two of the fingers of the Most Merciful.'
      }
    ]
  },

  {
    slug: 'tahajjud',
    title: 'Tahajjud',
    blurb: 'Rising for the night prayer',
    icon: 'moon',
    items: [
      {
        title: 'On waking for the night prayer',
        find: 'اللهم لك الحمد أنت نور السموات والأرض', to: 'أنت الحق',
        tr: 'Allahumma lakal-hamd, anta nurus-samawati wal-ardi wa man fihinn…',
        en: 'O Allah, to You belongs all praise. You are the light of the heavens and the earth and all within them. To You belongs all praise, You are the sustainer of the heavens and the earth and all within them… You are the Truth.',
        note: 'What he ﷺ said when he rose in the night to pray.'
      },
      {
        title: 'Opening the night prayer',
        find: 'اللهم رب جبرائيل وميكائيل', to: 'تهدي من تشاء',
        tr: 'Allahumma Rabba Jibra’ila wa Mika’ila wa Israfil, fatiras-samawati wal-ard, ʿalimal-ghaybi wash-shahadah, anta tahkumu bayna ʿibadika fima kanu fihi yakhtalifun. Ihdini limakhtulifa fihi minal-haqqi bi-idhnik, innaka tahdi man tasha’…',
        en: 'O Allah, Lord of Jibril, Mika’il and Israfil, Originator of the heavens and the earth, Knower of the unseen and the seen: You judge between Your servants in what they differ over. Guide me by Your leave to the truth in what is differed over. Indeed You guide whom You will…',
        note: 'What he ﷺ opened the night prayer with.'
      },
      {
        title: 'Light in the heart',
        find: 'اللهم اجعل في قلبي نورا',
        tr: 'Allahummajʿal fi qalbi nura.',
        en: 'O Allah, place light in my heart.',
        note: 'The opening of a longer supplication he ﷺ made on rising in the night.'
      }
    ]
  },

  {
    slug: 'tawba',
    title: 'Repentance',
    blurb: 'Turning back, and asking to be forgiven',
    icon: 'heart',
    items: [
      {
        title: 'Asking to be turned back',
        find: 'رب اغفر لي وتب علي', to: 'التواب الرحيم',
        count: 100,
        tr: 'Rabbighfir li wa tub ʿalayya, innaka antat-Tawwabur-Rahim.',
        en: 'My Lord, forgive me and turn to me in mercy. Indeed You are the Ever-Returning, the Merciful.',
        benefits: 'Ibn ʿUmar said they would count him ﷺ saying this a hundred times in one sitting.'
      },
      {
        title: 'The words of Adam ﷺ',
        quran: [7, 23], clip: 'ربنا ظلمنا أنفسنا',
        tr: 'Rabbana zalamna anfusana wa in lam taghfir lana wa tarhamna lanakunanna minal-khasirin.',
        en: 'Our Lord, we have wronged ourselves, and if You do not forgive us and have mercy upon us, we will surely be among the losers.'
      },
      {
        title: 'The call from the darknesses',
        quran: [21, 87], clip: 'لا إله إلا أنت',
        tr: 'La ilaha illa anta subhanaka inni kuntu minaz-zalimin.',
        en: 'There is no god but You. Glory be to You. Indeed I was among the wrongdoers.',
        note: 'The words of Yunus ﷺ from inside the whale.'
      }
    ]
  }
]

import type { PublicLandingLocale } from "./publicLandingLocale";

export const PUBLIC_LANGUAGE_OPTIONS = [
  { value: "ru", label: "Русский" },
  { value: "kk", label: "Қазақша" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
] as const;

type Pair = readonly [title: string, body: string];

/** Words the reading demo lets visitors tap. Keys must appear in DEMO_SENTENCE (landing-demos.tsx). */
export type DemoWord = "summer" | "decided" | "change" | "job" | "move" | "city";

export type LandingCopy = {
  metaTitle: string; metaDescription: string;
  language: string; currency: string; home: string; signIn: string; register: string;
  navPrograms: string; navLesson: string; navPlatform: string; navPrices: string; navFaq: string;
  eyebrow: string; heroA: string; heroB: string; hero: string;
  ctaTrial: string; ctaWhatsapp: string; whatsapp: string; heroFacts: readonly string[];
  illustration: string; mockHello: string; mockNext: string; mockWhen: string; mockTopic: string; mockJoin: string; mockDue: string; mockStudy: string; mockStreak: string; mockWords: string; mockHomework: string; mockHomeworkDone: string;
  programsEyebrow: string; programsTitle: string; programsText: string;
  programs: readonly { title: string; tag: string; forWhom: string; items: readonly string[] }[];
  programsNote: string;
  flowEyebrow: string; flowTitle: string; flow: readonly (readonly [label: string, title: string, body: string])[];
  platformEyebrow: string; platformTitle: string; platformText: string;
  readingTitle: string; readingText: string; readingHint: string; readingSave: string; readingSaved: string; readingCount: (n: number) => string;
  words: Record<DemoWord, string>;
  cardsTitle: string; cardsText: string; cardsFlip: string; cardsRatings: readonly [string, string, string, string]; cardsDone: string; cardsAgain: string;
  cards: readonly Pair[];
  quizTitle: string; quizText: string; quizRight: string; quizWrong: string; quizExplain: string; quizRetry: string;
  notesTitle: string; notesText: string; notesLesson: string; notesSummary: string; notesVocab: string; notesHomework: string; notesChecked: string;
  tiles: readonly Pair[];
  pricesEyebrow: string; pricesTitle: string; pricesText: string; loading: string; empty: string;
  faqEyebrow: string; faqTitle: string; faq: readonly Pair[];
  finalTitle: string; finalText: string; start: string;
  legal: string; privacy: string; terms: string; back: string; email: string;
};

const ru: LandingCopy = {
  metaTitle: "Индивидуальные уроки английского онлайн",
  metaDescription: "Уроки английского один на один: курс по English File, грамматика и разговорная практика. Между уроками — платформа с карточками, чтением и домашними заданиями.",
  language: "Язык страницы", currency: "Валюта цен", home: "Главная Omnica English", signIn: "Войти", register: "Записаться",
  navPrograms: "Программы", navLesson: "Как проходит урок", navPlatform: "Платформа", navPrices: "Цены", navFaq: "Вопросы",
  eyebrow: "Онлайн-школа английского",
  heroA: "Индивидуальные уроки", heroB: "английского",
  hero: "Грамматика, курс по учебнику English File и разговорная практика — один на один с преподавателем. А между уроками всё, что вы прошли, ждёт вас в личном кабинете: слова, конспекты и домашние задания.",
  ctaTrial: "Записаться на пробный урок", ctaWhatsapp: "Написать в WhatsApp", whatsapp: "Написать нам в WhatsApp",
  heroFacts: ["Один на один", "60 минут в Google Meet", "Любой уровень, от нуля"],
  illustration: "Так выглядит личный кабинет ученика — иллюстрация",
  mockHello: "Привет, Анна!", mockNext: "Следующий урок", mockWhen: "Вторник, 19:00", mockTopic: "English File · Present perfect", mockJoin: "Войти в урок", mockDue: "Карточек на сегодня", mockStudy: "Повторить", mockStreak: "дней подряд", mockWords: "слов в словаре", mockHomework: "Домашнее задание", mockHomeworkDone: "Проверено: 9 из 10",
  programsEyebrow: "Чему мы учим", programsTitle: "Программа под вашу цель",
  programsText: "На пробном уроке преподаватель определяет уровень и подбирает программу. Их можно совмещать: например, идти по учебнику и отдельно тренировать разговор.",
  programs: [
    { title: "Общий английский", tag: "По учебнику English File", forWhom: "Для тех, кто хочет системно пройти уровень за уровнем — с нуля или продолжить.", items: ["Грамматика и лексика по урокам учебника", "Чтение и аудирование", "Домашние задания после каждого урока"] },
    { title: "Разговорная практика", tag: "Говорим на уроке почти всё время", forWhom: "Для тех, кто понимает английский, но теряется, когда нужно говорить.", items: ["Темы под вашу жизнь: работа, переезд, путешествия", "Преподаватель поправляет ошибки по ходу", "Новые слова и фразы — сразу в ваш словарь"] },
    { title: "Грамматика", tag: "Закрываем пробелы", forWhom: "Для тех, кто путается во временах и хочет наконец разобраться.", items: ["Объясняем на вашем родном языке, когда нужно", "Много практики с проверкой", "Упражнения разных типов в кабинете"] },
  ],
  programsNote: "Все уроки — индивидуальные. Групп у нас нет.",
  flowEyebrow: "Как проходит урок", flowTitle: "До, во время и после урока",
  flow: [
    ["До урока", "Напоминание и ссылка", "Вы бронируете время в календаре в своём часовом поясе. Перед уроком приходит напоминание, ссылка на Google Meet лежит в кабинете."],
    ["На уроке", "Час с преподавателем", "Учебник, объяснение грамматики и разговор — в зависимости от вашей программы. Урок записывается в конспект, поэтому ничего не теряется."],
    ["После урока", "Конспект, слова и домашка", "В течение суток преподаватель проверяет конспект урока и новые слова. Они появляются в кабинете вместе с домашним заданием."],
  ],
  platformEyebrow: "Платформа", platformTitle: "Между уроками вы не остаётесь одни",
  platformText: "Наша платформа помнит каждое слово и каждую ошибку с урока. Попробуйте сами — это работает прямо здесь.",
  readingTitle: "Читайте и сохраняйте слова", readingText: "Тексты по уровню. Незнакомое слово — нажали, увидели перевод, сохранили.",
  readingHint: "Нажмите на подчёркнутое слово", readingSave: "Сохранить в словарь", readingSaved: "В словаре", readingCount: (n) => `Слов сохранено: ${n}`,
  words: { summer: "лето", decided: "решил(а)", change: "сменить", job: "работа", move: "переехать", city: "город" },
  cardsTitle: "Повторяйте карточками", cardsText: "Слова с ваших уроков сами превращаются в карточки. Платформа покажет слово как раз тогда, когда вы начнёте его забывать.",
  cardsFlip: "Нажмите, чтобы перевернуть", cardsRatings: ["Снова", "Трудно", "Хорошо", "Легко"], cardsDone: "На сегодня всё! Следующий повтор — завтра.", cardsAgain: "Ещё раз",
  cards: [["to get used to", "привыкать к чему-то"], ["to look forward to", "ждать с нетерпением"], ["to run out of", "заканчиваться (о запасах)"]],
  quizTitle: "Делайте домашние задания", quizText: "Десять типов упражнений. Часть проверяется сразу, остальное проверяет преподаватель с комментариями.",
  quizRight: "Верно!", quizWrong: "Не совсем.", quizExplain: "Present perfect: действие началось в прошлом и продолжается сейчас — «since 2020».", quizRetry: "Попробовать ещё",
  notesTitle: "Получайте конспект урока", notesText: "После каждого урока — короткий конспект, новые слова и задание. Всё проверено преподавателем.",
  notesLesson: "Урок 12 · Present perfect", notesSummary: "Говорили о переезде и работе. Разобрали разницу между past simple и present perfect, потренировали вопросы «How long…?».", notesVocab: "Новые слова", notesHomework: "Домашнее задание: 10 вопросов", notesChecked: "Проверено преподавателем",
  tiles: [
    ["Календарь", "Бронируйте и переносите уроки сами, в своём часовом поясе."],
    ["Напоминания", "В Telegram приходят напоминания об уроках и ссылка на занятие."],
    ["Прогресс", "Серия дней, выученные слова и достижения — видно, что вы двигаетесь."],
    ["Ваш язык", "Перевод слов — на русский, казахский или арабский."],
  ],
  pricesEyebrow: "Цены", pricesTitle: "Пакеты уроков", pricesText: "Платите за уроки, а не за подписку. Валюту можно сменить вверху страницы.",
  loading: "Загружаем цены…", empty: "Цены пока не отображаются. Напишите нам в WhatsApp — подскажем.",
  faqEyebrow: "Вопросы", faqTitle: "Частые вопросы",
  faq: [
    ["Какой нужен уровень?", "Любой. Можно начать с нуля. Уровень определим на пробном уроке и подберём программу."],
    ["Вы занимаетесь по учебнику?", "Да, для общего курса — по English File. Для разговорной практики и грамматики преподаватель подбирает материалы под вашу цель."],
    ["Как проходит пробный урок?", "Это обычный урок на час: знакомство, определение уровня и обсуждение цели. Если формат не подойдёт, продолжать не обязательно."],
    ["Как оплатить?", "Зарегистрируйтесь и выберите пакет. Мы напишем вам в WhatsApp и договоримся об удобном способе оплаты."],
    ["Что если я не смогу прийти?", "Перенесите урок в кабинете, если до начала больше 6 часов. Отменить с возвратом урока на баланс можно тоже за 6 часов — до двух раз за 30 дней."],
    ["Сколько действует пакет?", "Срок указан на каждом пакете и считается с первого урока. Если уезжаете или болеете, пакет можно поставить на паузу."],
    ["Что нужно для урока?", "Компьютер или телефон с интернетом и наушники. Уроки проходят в Google Meet."],
  ],
  finalTitle: "Начните с пробного урока", finalText: "Познакомитесь с преподавателем, узнаете свой уровень и увидите платформу изнутри. Остались вопросы — напишите нам в WhatsApp.", start: "Записаться на пробный урок",
  legal: "Юридическая информация", privacy: "Конфиденциальность", terms: "Условия обучения", back: "Наверх", email: "Почта",
};

const ar: LandingCopy = {
  metaTitle: "دروس إنجليزية فردية عبر الإنترنت",
  metaDescription: "دروس إنجليزية فردية: منهج English File والقواعد والمحادثة. وبين الدروس منصة للبطاقات والقراءة والواجبات.",
  language: "لغة الصفحة", currency: "عملة الأسعار", home: "الصفحة الرئيسية لـ Omnica English", signIn: "تسجيل الدخول", register: "سجّل الآن",
  navPrograms: "البرامج", navLesson: "كيف يتم الدرس", navPlatform: "المنصة", navPrices: "الأسعار", navFaq: "الأسئلة",
  eyebrow: "مدرسة إنجليزية عبر الإنترنت",
  heroA: "دروس إنجليزية", heroB: "فردية",
  hero: "القواعد، ومنهج English File، والمحادثة — مع معلم واحد لك وحدك. وبين الدروس تجد كل ما تعلمته في حسابك: الكلمات والملخصات والواجبات.",
  ctaTrial: "احجز درسًا تجريبيًا", ctaWhatsapp: "راسلنا عبر واتساب", whatsapp: "راسلنا عبر واتساب",
  heroFacts: ["درس فردي", "60 دقيقة عبر Google Meet", "لأي مستوى، حتى من الصفر"],
  illustration: "هكذا يبدو حساب الطالب — رسم توضيحي",
  mockHello: "مرحبًا يا سارة!", mockNext: "الدرس القادم", mockWhen: "الثلاثاء، 19:00", mockTopic: "English File · Present perfect", mockJoin: "ادخل الدرس", mockDue: "بطاقات اليوم", mockStudy: "راجع", mockStreak: "يومًا متتاليًا", mockWords: "كلمة في قاموسك", mockHomework: "الواجب", mockHomeworkDone: "تم التصحيح: 9 من 10",
  programsEyebrow: "ماذا نُعلّم", programsTitle: "برنامج يناسب هدفك",
  programsText: "في الدرس التجريبي يحدد المعلم مستواك ويختار البرنامج المناسب. ويمكن الجمع بين البرامج: مثلًا، الدراسة بالكتاب مع تدريب منفصل على المحادثة.",
  programs: [
    { title: "الإنجليزية العامة", tag: "بكتاب English File", forWhom: "لمن يريد التقدم بشكل منظم مستوى بعد مستوى، من الصفر أو من حيث توقف.", items: ["القواعد والمفردات حسب دروس الكتاب", "القراءة والاستماع", "واجب بعد كل درس"] },
    { title: "المحادثة", tag: "نتحدث معظم وقت الدرس", forWhom: "لمن يفهم الإنجليزية لكنه يتوقف عندما يحتاج إلى الكلام.", items: ["مواضيع من حياتك: العمل والسفر والانتقال", "يصحح المعلم أخطاءك أثناء الحديث", "الكلمات والعبارات الجديدة تُضاف مباشرة إلى قاموسك"] },
    { title: "القواعد", tag: "نسد الثغرات", forWhom: "لمن يخلط بين الأزمنة ويريد أن يفهمها أخيرًا.", items: ["نشرح بلغتك الأم عند الحاجة", "تدريب كثير مع التصحيح", "تمارين متنوعة في حسابك"] },
  ],
  programsNote: "كل الدروس فردية. لا توجد لدينا مجموعات.",
  flowEyebrow: "كيف يتم الدرس", flowTitle: "قبل الدرس وأثناءه وبعده",
  flow: [
    ["قبل الدرس", "تذكير ورابط", "تحجز الوقت من التقويم حسب منطقتك الزمنية. يصلك تذكير قبل الدرس، ورابط Google Meet موجود في حسابك."],
    ["أثناء الدرس", "ساعة مع المعلم", "الكتاب وشرح القواعد والمحادثة — حسب برنامجك. يُحفظ الدرس في ملخص، فلا يضيع شيء."],
    ["بعد الدرس", "ملخص وكلمات وواجب", "خلال يوم واحد يراجع المعلم ملخص الدرس والكلمات الجديدة، فتظهر في حسابك مع الواجب."],
  ],
  platformEyebrow: "المنصة", platformTitle: "بين الدروس لست وحدك",
  platformText: "منصتنا تتذكر كل كلمة وكل خطأ من الدرس. جرّبها بنفسك — إنها تعمل هنا مباشرة.",
  readingTitle: "اقرأ واحفظ الكلمات", readingText: "نصوص حسب مستواك. كلمة جديدة؟ اضغط عليها، وانظر إلى الترجمة، واحفظها.",
  readingHint: "اضغط على كلمة مسطّرة", readingSave: "احفظ في القاموس", readingSaved: "في القاموس", readingCount: (n) => `كلمات محفوظة: ${n}`,
  words: { summer: "الصيف", decided: "قرّر", change: "يغيّر", job: "وظيفة", move: "ينتقل", city: "مدينة" },
  cardsTitle: "راجع بالبطاقات", cardsText: "تتحول كلمات دروسك تلقائيًا إلى بطاقات. وتعرض المنصة الكلمة في الوقت الذي تبدأ فيه بنسيانها.",
  cardsFlip: "اضغط لقلب البطاقة", cardsRatings: ["مجددًا", "صعب", "جيد", "سهل"], cardsDone: "انتهيت لليوم! المراجعة القادمة غدًا.", cardsAgain: "مرة أخرى",
  cards: [["to get used to", "يعتاد على"], ["to look forward to", "يتطلع إلى"], ["to run out of", "ينفد منه"]],
  quizTitle: "حلّ الواجبات", quizText: "عشرة أنواع من التمارين. بعضها يُصحَّح فورًا، والباقي يصححه المعلم مع ملاحظاته.",
  quizRight: "صحيح!", quizWrong: "ليس تمامًا.", quizExplain: "Present perfect: حدث بدأ في الماضي وما زال مستمرًا الآن — «since 2020».", quizRetry: "حاول مرة أخرى",
  notesTitle: "احصل على ملخص الدرس", notesText: "بعد كل درس: ملخص قصير وكلمات جديدة وواجب. وكل ذلك يراجعه المعلم.",
  notesLesson: "الدرس 12 · Present perfect", notesSummary: "تحدثنا عن الانتقال والعمل. شرحنا الفرق بين past simple و present perfect، وتدربنا على أسئلة «How long…?».", notesVocab: "كلمات جديدة", notesHomework: "الواجب: 10 أسئلة", notesChecked: "راجعه المعلم",
  tiles: [
    ["التقويم", "احجز دروسك وانقلها بنفسك حسب منطقتك الزمنية."],
    ["التذكيرات", "تصلك تذكيرات الدروس ورابط الدرس عبر Telegram."],
    ["التقدم", "أيام متتالية وكلمات محفوظة وإنجازات — ترى أنك تتقدم."],
    ["لغتك", "ترجمة الكلمات إلى العربية أو الروسية أو الكازاخية."],
  ],
  pricesEyebrow: "الأسعار", pricesTitle: "باقات الدروس", pricesText: "تدفع مقابل الدروس، لا مقابل اشتراك. يمكنك تغيير العملة من أعلى الصفحة.",
  loading: "جارٍ تحميل الأسعار…", empty: "الأسعار غير ظاهرة الآن. راسلنا عبر واتساب وسنساعدك.",
  faqEyebrow: "الأسئلة", faqTitle: "أسئلة شائعة",
  faq: [
    ["ما المستوى المطلوب؟", "أي مستوى، حتى من الصفر. سنحدد مستواك في الدرس التجريبي ونختار البرنامج."],
    ["هل تدرسون بكتاب؟", "نعم، في المنهج العام نستخدم English File. وفي المحادثة والقواعد يختار المعلم المواد حسب هدفك."],
    ["كيف يتم الدرس التجريبي؟", "إنه درس عادي مدته ساعة: تعارف وتحديد المستوى ومناقشة الهدف. وإن لم يناسبك الأسلوب فلا التزام عليك."],
    ["كيف أدفع؟", "سجّل واختر باقة. سنراسلك عبر واتساب ونتفق على طريقة دفع مناسبة."],
    ["ماذا لو لم أستطع الحضور؟", "انقل الدرس من حسابك إذا بقي على بدايته أكثر من 6 ساعات. ويمكن إلغاؤه مع إعادته إلى رصيدك قبل 6 ساعات أيضًا — حتى مرتين خلال 30 يومًا."],
    ["ما مدة صلاحية الباقة؟", "الصلاحية مكتوبة على كل باقة وتُحسب من أول درس. إذا سافرت أو مرضت يمكنك إيقاف الباقة مؤقتًا."],
    ["ماذا أحتاج للدرس؟", "حاسوب أو هاتف متصل بالإنترنت وسماعات. تتم الدروس عبر Google Meet."],
  ],
  finalTitle: "ابدأ بدرس تجريبي", finalText: "تتعرف على المعلم، وتعرف مستواك، وترى المنصة من الداخل. لديك أسئلة؟ راسلنا عبر واتساب.", start: "احجز درسًا تجريبيًا",
  legal: "معلومات قانونية", privacy: "الخصوصية", terms: "شروط التعلم", back: "العودة للأعلى", email: "البريد",
};

const kk: LandingCopy = {
  metaTitle: "Жеке онлайн ағылшын сабақтары",
  metaDescription: "Ағылшын тілінен жеке сабақтар: English File бойынша курс, грамматика және сөйлеу практикасы. Сабақ арасында — карточкалар, оқу және үй тапсырмалары бар платформа.",
  language: "Бет тілі", currency: "Баға валютасы", home: "Omnica English басты беті", signIn: "Кіру", register: "Жазылу",
  navPrograms: "Бағдарламалар", navLesson: "Сабақ қалай өтеді", navPlatform: "Платформа", navPrices: "Бағалар", navFaq: "Сұрақтар",
  eyebrow: "Ағылшын тілінің онлайн мектебі",
  heroA: "Ағылшын тілінен", heroB: "жеке сабақтар",
  hero: "Грамматика, English File оқулығы бойынша курс және сөйлеу практикасы — оқытушымен бетпе-бет. Ал сабақ арасында өткеннің бәрі жеке кабинетіңізде: сөздер, конспектілер және үй тапсырмалары.",
  ctaTrial: "Сынақ сабағына жазылу", ctaWhatsapp: "WhatsApp-қа жазу", whatsapp: "Бізге WhatsApp арқылы жазу",
  heroFacts: ["Жеке сабақ", "Google Meet-те 60 минут", "Кез келген деңгей, нөлден бастап"],
  illustration: "Оқушының жеке кабинеті осылай көрінеді — иллюстрация",
  mockHello: "Сәлем, Айгерім!", mockNext: "Келесі сабақ", mockWhen: "Сейсенбі, 19:00", mockTopic: "English File · Present perfect", mockJoin: "Сабаққа кіру", mockDue: "Бүгінгі карточкалар", mockStudy: "Қайталау", mockStreak: "күн қатарынан", mockWords: "сөз сөздікте", mockHomework: "Үй тапсырмасы", mockHomeworkDone: "Тексерілді: 10-нан 9",
  programsEyebrow: "Нені үйретеміз", programsTitle: "Мақсатыңызға сай бағдарлама",
  programsText: "Сынақ сабағында оқытушы деңгейіңізді анықтап, бағдарлама таңдайды. Оларды біріктіруге болады: мысалы, оқулықпен жүріп, сөйлеуді бөлек жаттықтыру.",
  programs: [
    { title: "Жалпы ағылшын тілі", tag: "English File оқулығы бойынша", forWhom: "Деңгейден деңгейге жүйелі түрде өткісі келетіндерге — нөлден немесе жалғастырып.", items: ["Оқулық сабақтары бойынша грамматика мен лексика", "Оқу және тыңдау", "Әр сабақтан кейін үй тапсырмасы"] },
    { title: "Сөйлеу практикасы", tag: "Сабақтың көбінде сөйлейміз", forWhom: "Ағылшын тілін түсінетін, бірақ сөйлеу керек кезде қиналатындарға.", items: ["Өміріңізге қатысты тақырыптар: жұмыс, көшу, саяхат", "Оқытушы қателерді бірден түзетеді", "Жаңа сөздер мен тіркестер бірден сөздігіңізге түседі"] },
    { title: "Грамматика", tag: "Олқылықтарды жабамыз", forWhom: "Шақтарды шатастыратын және ақыры түсінгісі келетіндерге.", items: ["Қажет болса, ана тіліңізде түсіндіреміз", "Тексерісі бар көп жаттығу", "Кабинетте әртүрлі жаттығулар"] },
  ],
  programsNote: "Барлық сабақ — жеке. Бізде топтар жоқ.",
  flowEyebrow: "Сабақ қалай өтеді", flowTitle: "Сабаққа дейін, сабақта және кейін",
  flow: [
    ["Сабаққа дейін", "Еске салғыш пен сілтеме", "Уақытты күнтізбеден өз уақыт белдеуіңізде брондайсыз. Сабақ алдында еске салғыш келеді, Google Meet сілтемесі кабинетте тұрады."],
    ["Сабақта", "Оқытушымен бір сағат", "Оқулық, грамматиканы түсіндіру және әңгіме — бағдарламаңызға қарай. Сабақ конспектіге жазылады, ештеңе жоғалмайды."],
    ["Сабақтан кейін", "Конспект, сөздер, үй тапсырмасы", "Бір тәулік ішінде оқытушы сабақ конспектісі мен жаңа сөздерді тексереді. Олар кабинетте үй тапсырмасымен бірге пайда болады."],
  ],
  platformEyebrow: "Платформа", platformTitle: "Сабақ арасында жалғыз емессіз",
  platformText: "Платформамыз сабақтағы әр сөзді, әр қатені есте сақтайды. Өзіңіз байқап көріңіз — ол дәл осы жерде жұмыс істейді.",
  readingTitle: "Оқып, сөздерді сақтаңыз", readingText: "Деңгейге сай мәтіндер. Таныс емес сөз — басасыз, аудармасын көресіз, сақтайсыз.",
  readingHint: "Асты сызылған сөзді басыңыз", readingSave: "Сөздікке сақтау", readingSaved: "Сөздікте", readingCount: (n) => `Сақталған сөздер: ${n}`,
  words: { summer: "жаз", decided: "шешті", change: "ауыстыру", job: "жұмыс", move: "көшу", city: "қала" },
  cardsTitle: "Карточкалармен қайталаңыз", cardsText: "Сабақтағы сөздер өздігінен карточкаға айналады. Платформа сөзді сіз оны ұмыта бастаған кезде көрсетеді.",
  cardsFlip: "Аудару үшін басыңыз", cardsRatings: ["Қайта", "Қиын", "Жақсы", "Оңай"], cardsDone: "Бүгінге болды! Келесі қайталау — ертең.", cardsAgain: "Тағы бір рет",
  cards: [["to get used to", "бір нәрсеге үйрену"], ["to look forward to", "асыға күту"], ["to run out of", "таусылу (қор туралы)"]],
  quizTitle: "Үй тапсырмаларын орындаңыз", quizText: "Он түрлі жаттығу. Кейбірі бірден тексеріледі, қалғанын оқытушы түсініктемемен тексереді.",
  quizRight: "Дұрыс!", quizWrong: "Дәл емес.", quizExplain: "Present perfect: әрекет өткенде басталып, қазір де жалғасып жатыр — «since 2020».", quizRetry: "Қайта көру",
  notesTitle: "Сабақ конспектісін алыңыз", notesText: "Әр сабақтан кейін — қысқа конспект, жаңа сөздер және тапсырма. Бәрін оқытушы тексерген.",
  notesLesson: "12-сабақ · Present perfect", notesSummary: "Көшу және жұмыс туралы сөйлестік. Past simple мен present perfect айырмашылығын талдап, «How long…?» сұрақтарын жаттықтырдық.", notesVocab: "Жаңа сөздер", notesHomework: "Үй тапсырмасы: 10 сұрақ", notesChecked: "Оқытушы тексерген",
  tiles: [
    ["Күнтізбе", "Сабақтарды өз уақыт белдеуіңізде өзіңіз брондап, ауыстырасыз."],
    ["Еске салғыштар", "Telegram-ға сабақ туралы еске салғыш пен сілтеме келеді."],
    ["Прогресс", "Қатарынан күндер, жатталған сөздер және жетістіктер — алға жылжығаныңыз көрінеді."],
    ["Өз тіліңіз", "Сөздердің аудармасы — қазақ, орыс немесе араб тілінде."],
  ],
  pricesEyebrow: "Бағалар", pricesTitle: "Сабақ пакеттері", pricesText: "Жазылым үшін емес, сабақ үшін төлейсіз. Валютаны беттің жоғарғы жағында ауыстыруға болады.",
  loading: "Бағалар жүктелуде…", empty: "Бағалар әзірге көрсетілмейді. WhatsApp-қа жазыңыз, көмектесеміз.",
  faqEyebrow: "Сұрақтар", faqTitle: "Жиі қойылатын сұрақтар",
  faq: [
    ["Қандай деңгей керек?", "Кез келген, нөлден бастауға болады. Деңгейді сынақ сабағында анықтап, бағдарлама таңдаймыз."],
    ["Оқулық бойынша оқисыздар ма?", "Иә, жалпы курста — English File бойынша. Сөйлеу мен грамматикада оқытушы материалды мақсатыңызға қарай таңдайды."],
    ["Сынақ сабағы қалай өтеді?", "Бұл кәдімгі бір сағаттық сабақ: танысу, деңгейді анықтау және мақсатты талқылау. Формат ұнамаса, жалғастыру міндетті емес."],
    ["Қалай төлеймін?", "Тіркеліп, пакетті таңдаңыз. Біз WhatsApp-та жазып, ыңғайлы төлем тәсілін келісеміз."],
    ["Келе алмасам ше?", "Басталуына 6 сағаттан көп уақыт болса, сабақты кабинетте ауыстырыңыз. Сабақты балансқа қайтарып болдырмау да 6 сағат бұрын мүмкін — 30 күнде екі ретке дейін."],
    ["Пакет қанша уақыт жарамды?", "Мерзімі әр пакетте көрсетілген және бірінші сабақтан есептеледі. Сапарға шықсаңыз не ауырып қалсаңыз, пакетті тоқтатып қоюға болады."],
    ["Сабаққа не керек?", "Интернеті бар компьютер немесе телефон және құлаққап. Сабақтар Google Meet-те өтеді."],
  ],
  finalTitle: "Сынақ сабағынан бастаңыз", finalText: "Оқытушымен танысасыз, деңгейіңізді білесіз және платформаны іштей көресіз. Сұрақ болса, WhatsApp-қа жазыңыз.", start: "Сынақ сабағына жазылу",
  legal: "Құқықтық ақпарат", privacy: "Құпиялылық", terms: "Оқу шарттары", back: "Жоғарыға", email: "Пошта",
};

const en: LandingCopy = {
  metaTitle: "One-to-one English lessons online",
  metaDescription: "One-to-one English lessons: an English File course, grammar and speaking practice. Between lessons, a platform with flashcards, reading and homework.",
  language: "Page language", currency: "Price currency", home: "Omnica English home", signIn: "Sign in", register: "Sign up",
  navPrograms: "Programs", navLesson: "The lesson", navPlatform: "Platform", navPrices: "Prices", navFaq: "Questions",
  eyebrow: "Online English school",
  heroA: "One-to-one", heroB: "English lessons",
  hero: "Grammar, an English File course and speaking practice — with a teacher who works with you alone. Between lessons, everything you covered is waiting in your account: words, lesson notes and homework.",
  ctaTrial: "Book a trial lesson", ctaWhatsapp: "Message on WhatsApp", whatsapp: "Message us on WhatsApp",
  heroFacts: ["One-to-one", "60 minutes on Google Meet", "Any level, from zero"],
  illustration: "What a student's account looks like — illustration",
  mockHello: "Hi, Anna!", mockNext: "Next lesson", mockWhen: "Tuesday, 7:00 pm", mockTopic: "English File · Present perfect", mockJoin: "Join lesson", mockDue: "Cards due today", mockStudy: "Review", mockStreak: "day streak", mockWords: "words saved", mockHomework: "Homework", mockHomeworkDone: "Checked: 9 of 10",
  programsEyebrow: "What we teach", programsTitle: "A program for your goal",
  programsText: "In the trial lesson your teacher checks your level and picks a program. You can combine them — for example, follow the book and practise speaking separately.",
  programs: [
    { title: "General English", tag: "With English File", forWhom: "For learners who want to work through the levels properly — from zero or from where they stopped.", items: ["Grammar and vocabulary unit by unit", "Reading and listening", "Homework after every lesson"] },
    { title: "Speaking practice", tag: "You talk most of the lesson", forWhom: "For learners who understand English but freeze when they have to speak.", items: ["Topics from your life: work, moving, travel", "Your teacher corrects you as you go", "New words and phrases go straight into your word list"] },
    { title: "Grammar", tag: "Fill the gaps", forWhom: "For learners who mix up the tenses and want to finally get them.", items: ["Explained in your own language when needed", "Lots of checked practice", "Different exercise types in your account"] },
  ],
  programsNote: "Every lesson is one-to-one. We don't run groups.",
  flowEyebrow: "The lesson", flowTitle: "Before, during and after",
  flow: [
    ["Before", "Reminder and link", "Book a time in the calendar in your own time zone. You get a reminder before the lesson, and the Google Meet link is in your account."],
    ["During", "An hour with your teacher", "The book, grammar explanations and conversation — depending on your program. The lesson is captured in notes, so nothing gets lost."],
    ["After", "Notes, words and homework", "Within a day your teacher checks the lesson notes and new words. They appear in your account together with your homework."],
  ],
  platformEyebrow: "Platform", platformTitle: "You're not on your own between lessons",
  platformText: "Our platform remembers every word and every mistake from your lessons. Try it yourself — it works right here.",
  readingTitle: "Read and save words", readingText: "Texts at your level. Unknown word? Tap it, see the translation, save it.",
  readingHint: "Tap an underlined word", readingSave: "Save to my words", readingSaved: "Saved", readingCount: (n) => `Words saved: ${n}`,
  words: { summer: "the warm season", decided: "made a choice", change: "to make different", job: "work you are paid for", move: "to go to live somewhere else", city: "a large town" },
  cardsTitle: "Review with flashcards", cardsText: "Words from your lessons become flashcards automatically. The platform shows a word just when you're about to forget it.",
  cardsFlip: "Tap to flip", cardsRatings: ["Again", "Hard", "Good", "Easy"], cardsDone: "Done for today! Next review tomorrow.", cardsAgain: "Once more",
  cards: [["to get used to", "to become familiar with something"], ["to look forward to", "to be excited about something coming"], ["to run out of", "to have none left"]],
  quizTitle: "Do your homework", quizText: "Ten exercise types. Some are checked instantly; your teacher checks the rest and leaves comments.",
  quizRight: "Correct!", quizWrong: "Not quite.", quizExplain: "Present perfect: something started in the past and is still true now — “since 2020”.", quizRetry: "Try again",
  notesTitle: "Get your lesson notes", notesText: "After every lesson: a short summary, new words and homework. All checked by your teacher.",
  notesLesson: "Lesson 12 · Present perfect", notesSummary: "We talked about moving and work, compared past simple with present perfect, and practised “How long…?” questions.", notesVocab: "New words", notesHomework: "Homework: 10 questions", notesChecked: "Checked by your teacher",
  tiles: [
    ["Calendar", "Book and move lessons yourself, in your own time zone."],
    ["Reminders", "Lesson reminders and the lesson link arrive on Telegram."],
    ["Progress", "Streaks, learned words and achievements — you can see yourself moving."],
    ["Your language", "Word translations in Russian, Kazakh or Arabic."],
  ],
  pricesEyebrow: "Prices", pricesTitle: "Lesson packs", pricesText: "Pay for lessons, not a subscription. Change the currency at the top of the page.",
  loading: "Loading prices…", empty: "Prices aren't showing right now. Message us on WhatsApp and we'll help.",
  faqEyebrow: "Questions", faqTitle: "Frequently asked questions",
  faq: [
    ["What level do I need?", "Any — you can start from zero. We'll check your level in the trial lesson and pick a program."],
    ["Do you use a textbook?", "Yes, the general course follows English File. For speaking and grammar, your teacher chooses materials for your goal."],
    ["What happens in the trial lesson?", "It's a normal one-hour lesson: getting to know you, checking your level and talking about your goal. No obligation to continue."],
    ["How do I pay?", "Sign up and choose a pack. We'll message you on WhatsApp to agree on a convenient way to pay."],
    ["What if I can't make it?", "Move the lesson in your account if it's more than 6 hours away. Cancelling with the lesson returned also needs 6 hours' notice — up to twice in 30 days."],
    ["How long is a pack valid?", "Each pack shows its validity, counted from your first lesson. Travelling or ill? You can pause the pack."],
    ["What do I need for a lesson?", "A computer or phone with internet, and headphones. Lessons are on Google Meet."],
  ],
  finalTitle: "Start with a trial lesson", finalText: "Meet your teacher, find out your level and see the platform from the inside. Questions? Message us on WhatsApp.", start: "Book a trial lesson",
  legal: "Legal information", privacy: "Privacy", terms: "Terms of study", back: "Back to top", email: "Email",
};

export const LANDING_COPY: Record<PublicLandingLocale, LandingCopy> = { ru, kk, en, ar };

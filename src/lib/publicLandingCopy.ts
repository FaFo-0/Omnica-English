import type { PublicLandingLocale } from "./publicLandingLocale";

export const PUBLIC_LANGUAGE_OPTIONS = [
  { value: "ru", label: "Русский" },
  { value: "kk", label: "Қазақша" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
] as const;

type Pair = readonly [title: string, body: string];

export type LandingCopy = {
  metaTitle: string; metaDescription: string;
  language: string; currency: string; home: string; signIn: string; register: string;
  navHow: string; navPrices: string; navFaq: string;
  eyebrow: string; heroA: string; heroB: string; hero: string;
  ctaTrial: string; ctaWhatsapp: string; whatsapp: string; heroFacts: readonly string[];
  illustration: string; lesson: string; live: string; review: string; word: string; wordExample: string; card: string; cardFront: string; cardBack: string; teacher: string;
  painEyebrow: string; painTitle: string; pains: readonly string[]; painAnswer: string;
  howEyebrow: string; howTitle: string; steps: readonly Pair[];
  betweenEyebrow: string; betweenTitle: string; betweenText: string; between: readonly string[]; readingSample: string; readingHint: string;
  schoolEyebrow: string; schoolTitle: string; schoolText: string; schoolPoints: readonly Pair[];
  pricesEyebrow: string; pricesTitle: string; pricesText: string; included: string;
  trialTitle: string; trialText: string; trialChoose: string; choose: string; ask: string;
  perLesson: (price: string) => string; validity: (days: string) => string; sale: (percent: string) => string;
  paymentNote: string; loading: string; empty: string;
  faqEyebrow: string; faqTitle: string; faq: readonly Pair[];
  finalTitle: string; finalText: string; start: string;
  legal: string; privacy: string; terms: string; back: string; email: string;
};

const ru: LandingCopy = {
  metaTitle: "Английский один на один с живым преподавателем",
  metaDescription: "Онлайн-уроки английского один на один в Google Meet. Пробный урок, удобное расписание, слова с урока в личном кабинете.",
  language: "Язык страницы", currency: "Валюта цен", home: "Главная Omnica English", signIn: "Войти", register: "Записаться",
  navHow: "Как проходят уроки", navPrices: "Цены", navFaq: "Вопросы",
  eyebrow: "Онлайн-школа английского",
  heroA: "Английский один на один", heroB: "с живым преподавателем",
  hero: "Занимаемся по часу в Google Meet, в удобное для вас время. Говорим о том, что нужно именно вам: работа, переезд, путешествия или просто перестать бояться разговора. А слова с урока потом ждут вас в личном кабинете, чтобы не забылись.",
  ctaTrial: "Записаться на пробный урок", ctaWhatsapp: "Задать вопрос в WhatsApp", whatsapp: "Написать нам в WhatsApp",
  heroFacts: ["Пробный урок — полноценный час", "Время выбираете сами", "В WhatsApp отвечаем сами, без ботов"],
  illustration: "Как выглядит урок и повторение — иллюстрация",
  lesson: "Идёт урок", live: "Разговор сохраняется в конспект", review: "Слово с урока", word: "to get used to", wordExample: "привыкать к чему-то", card: "Повторить сегодня", cardFront: "to make progress", cardBack: "делать успехи", teacher: "Преподаватель проверяет конспект, прежде чем вы его увидите",
  painEyebrow: "Знакомо?", painTitle: "Учили годами, а заговорить так и не получилось",
  pains: [
    "В школе и институте были правила и тексты, а разговаривать почти не приходилось.",
    "Вы понимаете собеседника, но пока подбираете слова, разговор уже ушёл дальше.",
    "Приложения бросаются через пару недель: никто не ждёт и никто не поправит.",
  ],
  painAnswer: "Мы не обещаем английский за месяц. Мы предлагаем регулярный разговор с одним преподавателем, который знает ваш уровень, поправляет ошибки и помнит, о чём вы говорили в прошлый раз.",
  howEyebrow: "Как всё устроено", howTitle: "Как проходят занятия",
  steps: [
    ["Пробный урок", "Знакомимся, определяем уровень и разбираемся, зачем вам английский. Это обычный урок на час, а не презентация курса."],
    ["Удобное расписание", "Время выбираете сами в календаре, в своём часовом поясе. Планы поменялись — урок можно перенести, если до начала больше 6 часов."],
    ["Урок в Google Meet", "Час разговора один на один. Нужен только компьютер или телефон с наушниками."],
    ["Повторение после урока", "Преподаватель проверяет конспект и новые слова, и они появляются в вашем кабинете в виде карточек. Десяти минут в день хватает, чтобы они не забылись."],
  ],
  betweenEyebrow: "Между уроками", betweenTitle: "Слова с урока не теряются",
  betweenText: "В личном кабинете собрано всё: ваши слова, домашние задания и тексты для чтения. Нажали на незнакомое слово в тексте — оно попадает в ваш список вместе со словами с урока.",
  between: ["Карточки со словами из ваших уроков", "Домашние задания с проверкой преподавателя", "Тексты для чтения по вашему уровню"],
  readingSample: "Короткий рассказ", readingHint: "Нажмите на слово, чтобы увидеть перевод и сохранить его",
  schoolEyebrow: "О нас", schoolTitle: "Мы небольшая школа — и это плюс",
  schoolText: "Учеников у нас пока немного, поэтому каждого мы знаем по имени. Преподаватели из разных стран, среди них есть носители языка. Пишете в WhatsApp — отвечает человек, а не автоответчик.",
  schoolPoints: [
    ["Свой преподаватель", "Вы занимаетесь с одним преподавателем, который помнит ваши ошибки и успехи."],
    ["Без годовых договоров", "Покупаете пакет уроков, а не курс на год. Нужен перерыв — пакет можно поставить на паузу."],
    ["Понятные правила", "Условия оплаты, переносов и отмен написаны заранее и простыми словами."],
  ],
  pricesEyebrow: "Цены", pricesTitle: "Платите за уроки, а не за подписку",
  pricesText: "Срок пакета считается с первого урока, а не с даты покупки. Чем больше пакет, тем дешевле один урок.",
  included: "В каждый пакет входит",
  trialTitle: "Пробный урок", trialText: "Полноценный час с преподавателем. Поймёте, подходит ли вам формат, прежде чем покупать пакет.", trialChoose: "Записаться",
  choose: "Выбрать пакет", ask: "Спросить в WhatsApp",
  perLesson: (price) => `${price} за урок`, validity: (days) => `Действует ${days} с первого урока`, sale: (percent) => `−${percent}%`,
  paymentNote: "Оплата после регистрации: мы напишем вам в WhatsApp и договоримся, как удобнее оплатить.",
  loading: "Загружаем цены…", empty: "Цены пока не отображаются. Напишите нам в WhatsApp — подскажем.",
  faqEyebrow: "Вопросы", faqTitle: "Частые вопросы",
  faq: [
    ["Какой нужен уровень?", "Любой. Можно начать с нуля, можно прийти подтянуть разговорный. Уровень определим на пробном уроке."],
    ["Как проходит пробный урок?", "Это обычный урок на час: поговорите с преподавателем, определите уровень, обсудите цель. Если формат не подойдёт, продолжать не обязательно."],
    ["Как оплатить?", "Зарегистрируйтесь и выберите пакет. Мы напишем вам в WhatsApp и договоримся об удобном способе оплаты. Уроки появятся на балансе, как только мы подтвердим оплату."],
    ["Что если я не смогу прийти?", "Перенесите урок в кабинете, если до начала больше 6 часов. Отменить с возвратом урока на баланс можно тоже не позже чем за 6 часов — до двух раз за 30 дней."],
    ["Сколько действует пакет?", "Срок указан на каждом пакете и считается с первого урока. Если уезжаете или болеете, пакет можно поставить на паузу — срок остановится."],
    ["Что нужно для урока?", "Компьютер или телефон с интернетом и наушники. Уроки проходят в Google Meet, ссылка будет в кабинете, а напоминание придёт заранее."],
    ["Кто преподаватели?", "Преподаватели из разных стран, в том числе носители английского. С вами работает один закреплённый преподаватель."],
  ],
  finalTitle: "Попробуйте один урок", finalText: "Час разговора с преподавателем — и вы поймёте, ваш ли это формат. Остались вопросы? Напишите нам в WhatsApp.", start: "Записаться на пробный урок",
  legal: "Юридическая информация", privacy: "Конфиденциальность", terms: "Условия обучения", back: "Наверх", email: "Почта",
};

const en: LandingCopy = {
  metaTitle: "One-to-one English with a real teacher",
  metaDescription: "One-to-one online English lessons on Google Meet. A trial lesson, a schedule that fits you, and the words from every lesson saved in your account.",
  language: "Page language", currency: "Price currency", home: "Omnica English home", signIn: "Sign in", register: "Sign up",
  navHow: "How lessons work", navPrices: "Prices", navFaq: "Questions",
  eyebrow: "Online English school",
  heroA: "One-to-one English", heroB: "with a real teacher",
  hero: "Hour-long lessons on Google Meet, at a time that suits you. We talk about what you actually need: work, moving abroad, travel, or simply not freezing up in a conversation. Afterwards, the words from the lesson are waiting in your account so they stick.",
  ctaTrial: "Book a trial lesson", ctaWhatsapp: "Ask us on WhatsApp", whatsapp: "Message us on WhatsApp",
  heroFacts: ["The trial is a full hour", "You choose the time", "Real people answer on WhatsApp"],
  illustration: "What a lesson and review look like — illustration",
  lesson: "Lesson in progress", live: "The conversation becomes lesson notes", review: "Word from the lesson", word: "to get used to", wordExample: "to become familiar with something", card: "Review today", cardFront: "to make progress", cardBack: "to get better at something", teacher: "Your teacher checks the notes before you see them",
  painEyebrow: "Sound familiar?", painTitle: "Years of English classes, but speaking still feels hard",
  pains: [
    "School was grammar rules and texts, with hardly any real conversation.",
    "You understand people, but by the time you find the words, the conversation has moved on.",
    "Apps get dropped after a couple of weeks: nobody is waiting for you and nobody corrects you.",
  ],
  painAnswer: "We don't promise fluency in a month. We offer regular conversation with one teacher who knows your level, corrects your mistakes and remembers what you talked about last time.",
  howEyebrow: "How it works", howTitle: "How lessons work",
  steps: [
    ["Trial lesson", "We get to know you, check your level and talk about why you need English. It's a normal one-hour lesson, not a sales pitch."],
    ["Your schedule", "Pick times in the calendar, in your own time zone. Plans changed? Move the lesson as long as it's more than 6 hours away."],
    ["Lesson on Google Meet", "An hour of one-to-one conversation. All you need is a computer or phone and headphones."],
    ["Review afterwards", "Your teacher checks the notes and new words, and they appear in your account as flashcards. Ten minutes a day keeps them fresh."],
  ],
  betweenEyebrow: "Between lessons", betweenTitle: "Words from your lessons don't get lost",
  betweenText: "Your account keeps everything in one place: your words, homework and reading. Tap an unfamiliar word in a text and it joins your list alongside the words from your lessons.",
  between: ["Flashcards made from your own lessons", "Homework checked by your teacher", "Reading matched to your level"],
  readingSample: "A short story", readingHint: "Tap a word to see the translation and save it",
  schoolEyebrow: "About us", schoolTitle: "We're a small school — and that's a good thing",
  schoolText: "We don't have many students yet, so we know each of them by name. Our teachers come from different countries, including native speakers. When you message us on WhatsApp, a person answers.",
  schoolPoints: [
    ["Your own teacher", "You work with one teacher who remembers your mistakes and your progress."],
    ["No yearly contracts", "You buy a pack of lessons, not a year-long course. Need a break? Pause your pack."],
    ["Clear rules", "Payment, rescheduling and cancellation terms are written down up front, in plain words."],
  ],
  pricesEyebrow: "Prices", pricesTitle: "Pay for lessons, not a subscription",
  pricesText: "A pack's validity starts from your first lesson, not from the day you buy it. Bigger packs make each lesson cheaper.",
  included: "Every pack includes",
  trialTitle: "Trial lesson", trialText: "A full hour with a teacher. See whether the format suits you before you buy a pack.", trialChoose: "Book",
  choose: "Choose this pack", ask: "Ask on WhatsApp",
  perLesson: (price) => `${price} per lesson`, validity: (days) => `Valid for ${days} from your first lesson`, sale: (percent) => `−${percent}%`,
  paymentNote: "You pay after signing up: we'll message you on WhatsApp and agree on the easiest way to pay.",
  loading: "Loading prices…", empty: "Prices aren't showing right now. Message us on WhatsApp and we'll help.",
  faqEyebrow: "Questions", faqTitle: "Frequently asked questions",
  faq: [
    ["What level do I need?", "Any. You can start from zero or come to brush up your speaking. We'll check your level in the trial lesson."],
    ["What happens in the trial lesson?", "It's a normal one-hour lesson: talk with a teacher, check your level, discuss your goal. If the format isn't for you, there's no obligation to continue."],
    ["How do I pay?", "Sign up and choose a pack. We'll message you on WhatsApp to agree on a convenient way to pay. The lessons appear on your balance as soon as we confirm the payment."],
    ["What if I can't make it?", "Move the lesson in your account if it's more than 6 hours away. Cancelling with the lesson returned to your balance also needs 6 hours' notice — up to twice in 30 days."],
    ["How long is a pack valid?", "Each pack shows its validity, counted from your first lesson. Travelling or ill? Pause the pack and the clock stops."],
    ["What do I need for a lesson?", "A computer or phone with internet, and headphones. Lessons happen on Google Meet; the link is in your account and you'll get a reminder beforehand."],
    ["Who are the teachers?", "Teachers from different countries, including native English speakers. You work with one assigned teacher."],
  ],
  finalTitle: "Try one lesson", finalText: "One hour of conversation with a teacher, and you'll know whether this works for you. Still have questions? Message us on WhatsApp.", start: "Book a trial lesson",
  legal: "Legal information", privacy: "Privacy", terms: "Terms of study", back: "Back to top", email: "Email",
};

const kk: LandingCopy = {
  metaTitle: "Тірі оқытушымен жеке ағылшын тілі",
  metaDescription: "Google Meet арқылы жеке онлайн ағылшын сабақтары. Сынақ сабағы, ыңғайлы кесте және әр сабақтағы сөздер жеке кабинетте сақталады.",
  language: "Бет тілі", currency: "Баға валютасы", home: "Omnica English басты беті", signIn: "Кіру", register: "Жазылу",
  navHow: "Сабақтар қалай өтеді", navPrices: "Бағалар", navFaq: "Сұрақтар",
  eyebrow: "Ағылшын тілінің онлайн мектебі",
  heroA: "Жеке ағылшын тілі", heroB: "тірі оқытушымен",
  hero: "Сабақтар Google Meet-те бір сағаттан, сізге ыңғайлы уақытта өтеді. Өзіңізге керек тақырыптарда сөйлесеміз: жұмыс, көшу, саяхат немесе жай ғана сөйлесуден қорықпау. Ал сабақтағы сөздер кейін ұмытылмас үшін жеке кабинетіңізде сақталады.",
  ctaTrial: "Сынақ сабағына жазылу", ctaWhatsapp: "WhatsApp-та сұрақ қою", whatsapp: "Бізге WhatsApp арқылы жазу",
  heroFacts: ["Сынақ сабағы — толық бір сағат", "Уақытты өзіңіз таңдайсыз", "WhatsApp-та боттар емес, адамдар жауап береді"],
  illustration: "Сабақ пен қайталау қалай көрінеді — иллюстрация",
  lesson: "Сабақ жүріп жатыр", live: "Әңгіме конспектіге айналады", review: "Сабақтағы сөз", word: "to get used to", wordExample: "бір нәрсеге үйрену", card: "Бүгін қайталау", cardFront: "to make progress", cardBack: "алға басу", teacher: "Конспектіні сізге көрсетпес бұрын оқытушы тексереді",
  painEyebrow: "Таныс па?", painTitle: "Жылдар бойы оқыдыңыз, бірақ сөйлеу әлі қиын",
  pains: [
    "Мектепте ереже мен мәтін көп болды, ал сөйлесу өте аз болды.",
    "Әңгімелесушіні түсінесіз, бірақ сөз іздеп жатқанда әңгіме алға кетіп қалады.",
    "Қосымшалар екі аптадан кейін тасталады: ешкім күтпейді, ешкім түзетпейді.",
  ],
  painAnswer: "Біз бір айда ағылшын тілін уәде етпейміз. Біз деңгейіңізді білетін, қателеріңізді түзететін және өткен жолы не туралы сөйлескеніңізді есте сақтайтын бір оқытушымен тұрақты әңгімені ұсынамыз.",
  howEyebrow: "Барлығы қалай құрылған", howTitle: "Сабақтар қалай өтеді",
  steps: [
    ["Сынақ сабағы", "Танысамыз, деңгейіңізді анықтаймыз және ағылшын тілі не үшін керек екенін талқылаймыз. Бұл курс таныстырылымы емес, кәдімгі бір сағаттық сабақ."],
    ["Ыңғайлы кесте", "Уақытты күнтізбеден өз уақыт белдеуіңізде таңдайсыз. Жоспар өзгерсе, басталуына 6 сағаттан көп уақыт болса, сабақты ауыстыруға болады."],
    ["Google Meet-тегі сабақ", "Бір сағат жеке әңгіме. Тек компьютер немесе телефон және құлаққап керек."],
    ["Сабақтан кейін қайталау", "Оқытушы конспект пен жаңа сөздерді тексереді, олар кабинетіңізде карточка болып шығады. Ұмытпау үшін күніне он минут жеткілікті."],
  ],
  betweenEyebrow: "Сабақтар арасында", betweenTitle: "Сабақтағы сөздер жоғалмайды",
  betweenText: "Жеке кабинетте бәрі бір жерде: сөздеріңіз, үй тапсырмалары және оқуға арналған мәтіндер. Мәтіндегі таныс емес сөзді бассаңыз, ол сабақтағы сөздермен бірге тізіміңізге қосылады.",
  between: ["Өз сабақтарыңыздағы сөздерден жасалған карточкалар", "Оқытушы тексеретін үй тапсырмалары", "Деңгейіңізге сай оқу мәтіндері"],
  readingSample: "Қысқа әңгіме", readingHint: "Аудармасын көріп, сақтау үшін сөзді басыңыз",
  schoolEyebrow: "Біз туралы", schoolTitle: "Біз шағын мектепіміз — және бұл артықшылық",
  schoolText: "Әзірге оқушыларымыз көп емес, сондықтан әрқайсысын атымен білеміз. Оқытушыларымыз әртүрлі елдерден, арасында ана тілі ағылшын тілі болатындар да бар. WhatsApp-қа жазсаңыз, автожауап емес, адам жауап береді.",
  schoolPoints: [
    ["Өз оқытушыңыз", "Сіз қателеріңіз бен жетістіктеріңізді есте сақтайтын бір оқытушымен оқисыз."],
    ["Жылдық келісімшартсыз", "Бір жылдық курс емес, сабақ пакетін сатып аласыз. Үзіліс керек болса, пакетті тоқтатып қоюға болады."],
    ["Түсінікті ережелер", "Төлем, ауыстыру және болдырмау шарттары алдын ала қарапайым тілмен жазылған."],
  ],
  pricesEyebrow: "Бағалар", pricesTitle: "Жазылым үшін емес, сабақ үшін төлейсіз",
  pricesText: "Пакеттің мерзімі сатып алған күннен емес, бірінші сабақтан басталады. Пакет неғұрлым үлкен болса, бір сабақ соғұрлым арзан.",
  included: "Әр пакетке кіреді",
  trialTitle: "Сынақ сабағы", trialText: "Оқытушымен толық бір сағат. Пакет сатып алмас бұрын формат сізге сай ма, соны түсінесіз.", trialChoose: "Жазылу",
  choose: "Пакетті таңдау", ask: "WhatsApp-та сұрау",
  perLesson: (price) => `Бір сабақ — ${price}`, validity: (days) => `Бірінші сабақтан бастап ${days} жарамды`, sale: (percent) => `−${percent}%`,
  paymentNote: "Төлем тіркелгеннен кейін: біз сізге WhatsApp-та жазып, ыңғайлы төлем тәсілін келісеміз.",
  loading: "Бағалар жүктелуде…", empty: "Бағалар әзірге көрсетілмейді. WhatsApp-қа жазыңыз, көмектесеміз.",
  faqEyebrow: "Сұрақтар", faqTitle: "Жиі қойылатын сұрақтар",
  faq: [
    ["Қандай деңгей керек?", "Кез келген. Нөлден бастауға да, сөйлеу дағдысын жетілдіруге де болады. Деңгейді сынақ сабағында анықтаймыз."],
    ["Сынақ сабағы қалай өтеді?", "Бұл кәдімгі бір сағаттық сабақ: оқытушымен сөйлесесіз, деңгейіңізді анықтайсыз, мақсатыңызды талқылайсыз. Формат ұнамаса, жалғастыру міндетті емес."],
    ["Қалай төлеймін?", "Тіркеліп, пакетті таңдаңыз. Біз WhatsApp-та жазып, ыңғайлы төлем тәсілін келісеміз. Төлемді растағаннан кейін сабақтар балансыңызға түседі."],
    ["Келе алмасам ше?", "Басталуына 6 сағаттан көп уақыт болса, сабақты кабинетте ауыстырыңыз. Сабақты балансқа қайтарып болдырмау да 6 сағат бұрын мүмкін — 30 күнде екі ретке дейін."],
    ["Пакет қанша уақыт жарамды?", "Мерзімі әр пакетте көрсетілген және бірінші сабақтан есептеледі. Сапарға шықсаңыз не ауырып қалсаңыз, пакетті тоқтатып қоюға болады — мерзім тоқтайды."],
    ["Сабаққа не керек?", "Интернеті бар компьютер немесе телефон және құлаққап. Сабақтар Google Meet-те өтеді, сілтеме кабинетте болады, ал еске салғыш алдын ала келеді."],
    ["Оқытушылар кімдер?", "Әртүрлі елдерден келген оқытушылар, олардың арасында ана тілі ағылшын тілі болатындар да бар. Сізбен бекітілген бір оқытушы жұмыс істейді."],
  ],
  finalTitle: "Бір сабақты байқап көріңіз", finalText: "Оқытушымен бір сағат әңгіме — және бұл формат сізге сай ма, түсінесіз. Сұрақтарыңыз қалды ма? WhatsApp-қа жазыңыз.", start: "Сынақ сабағына жазылу",
  legal: "Құқықтық ақпарат", privacy: "Құпиялылық", terms: "Оқу шарттары", back: "Жоғарыға", email: "Пошта",
};

const ar: LandingCopy = {
  metaTitle: "دروس إنجليزية فردية مع معلم حقيقي",
  metaDescription: "دروس إنجليزية فردية عبر Google Meet. درس تجريبي، ومواعيد تناسبك، وكلمات كل درس محفوظة في حسابك.",
  language: "لغة الصفحة", currency: "عملة الأسعار", home: "الصفحة الرئيسية لـ Omnica English", signIn: "تسجيل الدخول", register: "سجّل الآن",
  navHow: "كيف تتم الدروس", navPrices: "الأسعار", navFaq: "الأسئلة",
  eyebrow: "مدرسة إنجليزية عبر الإنترنت",
  heroA: "إنجليزية فردية", heroB: "مع معلم حقيقي",
  hero: "دروس مدتها ساعة عبر Google Meet في الوقت الذي يناسبك. نتحدث عمّا تحتاجه فعلًا: العمل، أو السفر، أو الانتقال إلى بلد آخر، أو ببساطة التحدث دون خوف. وبعد الدرس تجد كلماته في حسابك حتى لا تنساها.",
  ctaTrial: "احجز درسًا تجريبيًا", ctaWhatsapp: "اسألنا عبر واتساب", whatsapp: "راسلنا عبر واتساب",
  heroFacts: ["الدرس التجريبي ساعة كاملة", "أنت تختار الوقت", "يرد عليك أشخاص حقيقيون في واتساب"],
  illustration: "كيف يبدو الدرس والمراجعة — رسم توضيحي",
  lesson: "الدرس جارٍ", live: "تتحول المحادثة إلى ملخص للدرس", review: "كلمة من الدرس", word: "to get used to", wordExample: "يعتاد على شيء", card: "راجع اليوم", cardFront: "to make progress", cardBack: "يحرز تقدمًا", teacher: "يراجع معلمك الملخص قبل أن تراه",
  painEyebrow: "هل يبدو مألوفًا؟", painTitle: "درست الإنجليزية سنوات، وما زال الكلام صعبًا",
  pains: [
    "في المدرسة كانت هناك قواعد ونصوص، لكن المحادثة الحقيقية كانت قليلة جدًا.",
    "تفهم من يحدثك، لكن حين تجد الكلمات المناسبة يكون الحديث قد انتقل إلى موضوع آخر.",
    "تترك التطبيقات بعد أسبوعين: لا أحد ينتظرك ولا أحد يصحح أخطاءك.",
  ],
  painAnswer: "لا نعدك بإتقان الإنجليزية في شهر. نقدم لك محادثة منتظمة مع معلم واحد يعرف مستواك ويصحح أخطاءك ويتذكر ما تحدثتما عنه في المرة السابقة.",
  howEyebrow: "كيف يعمل", howTitle: "كيف تتم الدروس",
  steps: [
    ["الدرس التجريبي", "نتعرف عليك ونحدد مستواك ونفهم لماذا تحتاج الإنجليزية. إنه درس عادي مدته ساعة، وليس عرضًا تسويقيًا."],
    ["مواعيد تناسبك", "تختار الأوقات من التقويم حسب منطقتك الزمنية. تغيرت خططك؟ يمكنك نقل الدرس إذا بقي على بدايته أكثر من 6 ساعات."],
    ["الدرس عبر Google Meet", "ساعة من المحادثة الفردية. كل ما تحتاجه حاسوب أو هاتف وسماعات."],
    ["المراجعة بعد الدرس", "يراجع معلمك الملخص والكلمات الجديدة، فتظهر في حسابك على شكل بطاقات. عشر دقائق يوميًا تكفي لكي لا تنساها."],
  ],
  betweenEyebrow: "بين الدروس", betweenTitle: "كلمات دروسك لا تضيع",
  betweenText: "في حسابك كل شيء في مكان واحد: كلماتك وواجباتك ونصوص القراءة. اضغط على كلمة جديدة في نص، فتنضم إلى قائمتك مع كلمات دروسك.",
  between: ["بطاقات من كلمات دروسك أنت", "واجبات يراجعها معلمك", "نصوص قراءة تناسب مستواك"],
  readingSample: "قصة قصيرة", readingHint: "اضغط على الكلمة لترى الترجمة وتحفظها",
  schoolEyebrow: "من نحن", schoolTitle: "نحن مدرسة صغيرة — وهذه ميزة",
  schoolText: "عدد طلابنا ما زال قليلًا، لذلك نعرف كل واحد منهم باسمه. معلمونا من دول مختلفة، ومن بينهم ناطقون أصليون بالإنجليزية. وعندما تراسلنا عبر واتساب يرد عليك إنسان.",
  schoolPoints: [
    ["معلمك الخاص", "تدرس مع معلم واحد يتذكر أخطاءك وتقدمك."],
    ["دون عقود سنوية", "تشتري باقة دروس، لا دورة لمدة سنة. تحتاج إلى استراحة؟ يمكنك إيقاف الباقة مؤقتًا."],
    ["قواعد واضحة", "شروط الدفع والنقل والإلغاء مكتوبة مسبقًا وبكلمات بسيطة."],
  ],
  pricesEyebrow: "الأسعار", pricesTitle: "ادفع مقابل الدروس، لا مقابل اشتراك",
  pricesText: "تبدأ صلاحية الباقة من أول درس، لا من يوم الشراء. وكلما كبرت الباقة قلّ سعر الدرس الواحد.",
  included: "كل باقة تشمل",
  trialTitle: "درس تجريبي", trialText: "ساعة كاملة مع معلم. اعرف إن كان الأسلوب يناسبك قبل أن تشتري باقة.", trialChoose: "احجز",
  choose: "اختر الباقة", ask: "اسأل عبر واتساب",
  perLesson: (price) => `${price} للدرس`, validity: (days) => `صالحة لمدة ${days} من أول درس`, sale: (percent) => `−${percent}٪`,
  paymentNote: "الدفع بعد التسجيل: سنراسلك عبر واتساب ونتفق على أسهل طريقة للدفع.",
  loading: "جارٍ تحميل الأسعار…", empty: "الأسعار غير ظاهرة الآن. راسلنا عبر واتساب وسنساعدك.",
  faqEyebrow: "الأسئلة", faqTitle: "أسئلة شائعة",
  faq: [
    ["ما المستوى المطلوب؟", "أي مستوى. يمكنك البدء من الصفر أو تحسين المحادثة. سنحدد مستواك في الدرس التجريبي."],
    ["كيف يتم الدرس التجريبي؟", "إنه درس عادي مدته ساعة: تتحدث مع المعلم وتحدد مستواك وتناقش هدفك. وإن لم يناسبك الأسلوب فلا التزام عليك بالاستمرار."],
    ["كيف أدفع؟", "سجّل واختر باقة. سنراسلك عبر واتساب ونتفق على طريقة دفع مناسبة. تظهر الدروس في رصيدك بمجرد تأكيد الدفع."],
    ["ماذا لو لم أستطع الحضور؟", "انقل الدرس من حسابك إذا بقي على بدايته أكثر من 6 ساعات. ويمكن إلغاؤه مع إعادة الدرس إلى رصيدك قبل 6 ساعات أيضًا — حتى مرتين خلال 30 يومًا."],
    ["ما مدة صلاحية الباقة؟", "الصلاحية مكتوبة على كل باقة وتُحسب من أول درس. إذا سافرت أو مرضت يمكنك إيقاف الباقة مؤقتًا فتتوقف المدة."],
    ["ماذا أحتاج للدرس؟", "حاسوب أو هاتف متصل بالإنترنت وسماعات. تتم الدروس عبر Google Meet، والرابط في حسابك، ويصلك تذكير قبل الدرس."],
    ["من هم المعلمون؟", "معلمون من دول مختلفة، من بينهم ناطقون أصليون بالإنجليزية. يعمل معك معلم واحد مخصص لك."],
  ],
  finalTitle: "جرّب درسًا واحدًا", finalText: "ساعة من المحادثة مع معلم، وستعرف إن كان هذا الأسلوب يناسبك. لديك أسئلة؟ راسلنا عبر واتساب.", start: "احجز درسًا تجريبيًا",
  legal: "معلومات قانونية", privacy: "الخصوصية", terms: "شروط التعلم", back: "العودة للأعلى", email: "البريد",
};

export const LANDING_COPY: Record<PublicLandingLocale, LandingCopy> = { ru, kk, en, ar };

// Plain-language academy rules, built from the LIVE policy numbers
// (api.policyConstants.get / getPublic). Nothing here hardcodes a number:
// when the admin changes one in Settings → Policy, every sentence follows.
// Business rules themselves live in POLICY.md — this file only words them.

export type PolicyLocale = "ru" | "en" | "kk" | "ar";

export type PolicyNumbers = {
  reservationMinutes: number;
  teachingMinutes: number;
  lessonStartEarlyMinutes: number;
  bookingMinNoticeHours: number;
  bookingMonthsAhead: number;
  maxStudentBookingsPerDay: number;
  maxStudentBookingsPerWeek: number;
  studentCancelNoticeHours: number;
  studentFreeCancelsPer30Days: number;
  pauseMaxDays: number;
  pausesPer6Months: number;
  expiryWarnFirstDays: number;
  expiryWarnSecondDays: number;
  teacherCancelNoticeHours: number;
  actionHorizonDays: number;
  timeOffApprovalDays: number;
  lessonPublishHours: number;
  teacherMinWeeklyHours: number;
  noShowPingMinutes: number;
  noShowWaitMinutes: number;
};

export type PackLine = { lessons: number; expiryDays: number };

export type PolicyCardIcon =
  | "lesson" | "pack" | "book" | "cancel" | "move" | "missed" | "teacher"
  | "pause" | "bell" | "pay" | "respect" | "horizon" | "timeoff" | "homework"
  | "hours" | "money" | "shield" | "start";

export type PolicyCard = {
  icon: PolicyCardIcon;
  title: string;
  lines: string[];
  tone?: "good" | "warn";
};

// ── Plurals ──────────────────────────────────────────────────────────

const ruRules = new Intl.PluralRules("ru");
function ru(n: number, one: string, few: string, many: string) {
  const form = ruRules.select(n);
  return `${n} ${form === "one" ? one : form === "few" ? few : many}`;
}
const enP = (n: number, word: string, plural = `${word}s`) => `${n} ${n === 1 ? word : plural}`;

const h = {
  ru: (n: number) => ru(n, "час", "часа", "часов"),
  en: (n: number) => enP(n, "hour"),
  kk: (n: number) => `${n} сағат`,
  ar: (n: number) => `${n} ${n === 1 ? "ساعة" : n === 2 ? "ساعتان" : n <= 10 ? "ساعات" : "ساعة"}`,
};
const d = {
  ru: (n: number) => ru(n, "день", "дня", "дней"),
  en: (n: number) => enP(n, "day"),
  kk: (n: number) => `${n} күн`,
  ar: (n: number) => `${n} ${n === 1 ? "يوم" : n === 2 ? "يومان" : n <= 10 ? "أيام" : "يومًا"}`,
};
const m = {
  ru: (n: number) => ru(n, "минута", "минуты", "минут"),
  en: (n: number) => enP(n, "minute"),
  kk: (n: number) => `${n} минут`,
  ar: (n: number) => `${n} ${n <= 10 && n > 2 ? "دقائق" : "دقيقة"}`,
};
const lessonsWord = {
  ru: (n: number) => ru(n, "урок", "урока", "уроков"),
  en: (n: number) => enP(n, "lesson"),
  kk: (n: number) => `${n} сабақ`,
  ar: (n: number) => `${n} ${n === 1 ? "درس" : n === 2 ? "درسان" : n <= 10 ? "دروس" : "درسًا"}`,
};
const times = {
  ru: (n: number) => ru(n, "раз", "раза", "раз"),
  en: (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`),
  kk: (n: number) => `${n} рет`,
  ar: (n: number) => (n === 1 ? "مرة واحدة" : n === 2 ? "مرتين" : n <= 10 ? `${n} مرات` : `${n} مرة`),
};

function bookingWindow(locale: PolicyLocale, months: number): string {
  if (locale === "ru") return months === 0 ? "до конца текущего месяца" : months === 1 ? "до конца следующего месяца" : `на ${ru(months, "месяц", "месяца", "месяцев")} вперёд (до конца месяца)`;
  if (locale === "kk") return months === 0 ? "осы айдың соңына дейін" : months === 1 ? "келесі айдың соңына дейін" : `${months} ай алдын ала (ай соңына дейін)`;
  if (locale === "ar") return months === 0 ? "حتى نهاية الشهر الحالي" : months === 1 ? "حتى نهاية الشهر القادم" : `حتى ${months} أشهر مقدمًا (حتى نهاية الشهر)`;
  return months === 0 ? "until the end of this month" : months === 1 ? "until the end of next month" : `up to ${months} months ahead (to the end of that month)`;
}

// ── Page chrome ──────────────────────────────────────────────────────

export const POLICY_CHROME: Record<PolicyLocale, {
  title: string; intro: string; studentHeading: string; teacherHeading: string;
  timeline: string; timelineBook: string; timelineFree: string; timelineLate: string; timelineStart: string;
  updated: string; copy: string; copied: string; copyFailed: string; language: string; home: string;
  questions: string; whatsapp: string; loading: string; signIn: string;
  bannerText: string; bannerOpen: string; bannerDismiss: string;
}> = {
  ru: {
    title: "Правила занятий", intro: "Коротко и по делу: как записываться, отменять и переносить уроки. Сохраните эту страницу.",
    studentHeading: "Для учеников", teacherHeading: "Для преподавателей",
    timeline: "Когда что можно", timelineBook: "можно записаться", timelineFree: "отмена и перенос бесплатно", timelineLate: "урок списывается", timelineStart: "Начало урока",
    updated: "Обновлено", copy: "Скопировать ссылку", copied: "Ссылка скопирована", copyFailed: "Не удалось скопировать. Скопируйте адрес из браузера.",
    language: "Язык", home: "Главная", questions: "Остались вопросы? Напишите нам —", whatsapp: "WhatsApp", loading: "Загружаем правила…", signIn: "Войти",
    bannerText: "Правила занятий обновились.", bannerOpen: "Посмотреть", bannerDismiss: "Понятно",
  },
  en: {
    title: "Lesson rules", intro: "Short and simple: how to book, cancel and move your lessons. Keep this page handy.",
    studentHeading: "For students", teacherHeading: "For teachers",
    timeline: "What you can do, and when", timelineBook: "you can book", timelineFree: "free cancel or move", timelineLate: "the lesson is used", timelineStart: "Lesson starts",
    updated: "Updated", copy: "Copy link", copied: "Link copied", copyFailed: "Could not copy. Copy the address from your browser.",
    language: "Language", home: "Home", questions: "Questions? Message us on", whatsapp: "WhatsApp", loading: "Loading the rules…", signIn: "Sign in",
    bannerText: "The lesson rules have been updated.", bannerOpen: "See what's new", bannerDismiss: "Got it",
  },
  kk: {
    title: "Сабақ ережелері", intro: "Қысқа әрі түсінікті: сабаққа қалай жазылу, бас тарту және ауыстыру. Бұл бетті сақтап қойыңыз.",
    studentHeading: "Оқушыларға", teacherHeading: "Оқытушыларға",
    timeline: "Не істеуге болады және қашан", timelineBook: "жазылуға болады", timelineFree: "тегін бас тарту не ауыстыру", timelineLate: "сабақ есептен шығады", timelineStart: "Сабақ басталады",
    updated: "Жаңартылды", copy: "Сілтемені көшіру", copied: "Сілтеме көшірілді", copyFailed: "Көшіру мүмкін болмады. Мекенжайды браузерден көшіріңіз.",
    language: "Тіл", home: "Басты бет", questions: "Сұрақтар бар ма? Бізге жазыңыз —", whatsapp: "WhatsApp", loading: "Ережелер жүктелуде…", signIn: "Кіру",
    bannerText: "Сабақ ережелері жаңартылды.", bannerOpen: "Қарау", bannerDismiss: "Түсінікті",
  },
  ar: {
    title: "قواعد الدروس", intro: "باختصار ووضوح: كيف تحجز درسك وتلغيه وتنقله. احتفظ بهذه الصفحة.",
    studentHeading: "للطلاب", teacherHeading: "للمعلمين",
    timeline: "ماذا يمكنك أن تفعل ومتى", timelineBook: "يمكنك الحجز", timelineFree: "إلغاء أو نقل مجاني", timelineLate: "يُحتسب الدرس", timelineStart: "بداية الدرس",
    updated: "آخر تحديث", copy: "نسخ الرابط", copied: "تم نسخ الرابط", copyFailed: "تعذر النسخ. انسخ العنوان من المتصفح.",
    language: "اللغة", home: "الرئيسية", questions: "لديك سؤال؟ راسلنا على", whatsapp: "واتساب", loading: "جارٍ تحميل القواعد…", signIn: "تسجيل الدخول",
    bannerText: "تم تحديث قواعد الدروس.", bannerOpen: "اطّلع عليها", bannerDismiss: "حسنًا",
  },
};

// ── Student cards ────────────────────────────────────────────────────

export function studentPolicyCards(locale: PolicyLocale, p: PolicyNumbers, packs: PackLine[]): PolicyCard[] {
  const L = locale;
  const packLines = packs.map((pk) =>
    L === "ru" ? `${lessonsWord.ru(pk.lessons)} — действуют ${d.ru(pk.expiryDays)}`
    : L === "kk" ? `${lessonsWord.kk(pk.lessons)} — ${d.kk(pk.expiryDays)} жарамды`
    : L === "ar" ? `${lessonsWord.ar(pk.lessons)} — صالحة لمدة ${d.ar(pk.expiryDays)}`
    : `${lessonsWord.en(pk.lessons)} — valid for ${d.en(pk.expiryDays)}`);

  if (L === "ru") return [
    { icon: "lesson", title: "Урок", lines: [`${m.ru(p.reservationMinutes)} в Google Meet: ${p.teachingMinutes} минут английского и короткий перерыв.`, "1 урок из пакета = 1 занятие."] },
    { icon: "pack", title: "Пакеты", lines: [...packLines, "Срок считается с первого урока. Уже забронированный урок остаётся вашим, даже если срок пакета закончится."] },
    { icon: "book", title: "Запись", lines: [`Записывайтесь минимум за ${h.ru(p.bookingMinNoticeHours)} — ${bookingWindow("ru", p.bookingMonthsAhead)}.`, `Не больше ${lessonsWord.ru(p.maxStudentBookingsPerDay)} в день и ${lessonsWord.ru(p.maxStudentBookingsPerWeek)} в неделю.`] },
    { icon: "cancel", title: "Отмена", tone: "good", lines: [`За ${h.ru(p.studentCancelNoticeHours)} и раньше — бесплатно, урок возвращается.`, `Бесплатных отмен: ${p.studentFreeCancelsPer30Days} за 30 дней.`, `Позже или сверх лимита — урок списывается.`] },
    { icon: "move", title: "Перенос", lines: [`За ${h.ru(p.studentCancelNoticeHours)} и раньше — бесплатно.`, `Позже — это как поздняя отмена: урок списывается, а новое время берёт ещё один урок.`] },
    { icon: "missed", title: "Если вы не пришли", tone: "warn", lines: ["Урок списывается — преподаватель ждал вас."] },
    { icon: "teacher", title: "Если отменил преподаватель", tone: "good", lines: ["Урок всегда возвращается вам.", `Если преподавателя нет через ${m.ru(p.noShowWaitMinutes)} после начала, урок вернётся автоматически.`] },
    { icon: "pause", title: "Пауза", lines: [`Уезжаете или болеете? Напишите академии — поставим паузу до ${d.ru(p.pauseMaxDays)}, ${times.ru(p.pausesPer6Months)} за полгода.`, "Во время паузы срок пакета не идёт. Забронированные уроки сначала перенесите или отмените."] },
    { icon: "bell", title: "Напоминания", lines: [`Напомним за ${d.ru(p.expiryWarnFirstDays)} и за ${d.ru(p.expiryWarnSecondDays)} до окончания срока уроков.`] },
    { icon: "pay", title: "Оплата", lines: ["Оплата через WhatsApp с академией. Уроки появятся после подтверждения оплаты."] },
    { icon: "respect", title: "Уважение", lines: ["Будьте вежливы и приходите вовремя. Уроки записываются — это защищает обе стороны.", "Грубость к преподавателю: одно предупреждение, затем прощаемся и возвращаем неиспользованные уроки.", "Проблема? Напишите академии в течение 48 часов — решение принимает академия."] },
  ];
  if (L === "kk") return [
    { icon: "lesson", title: "Сабақ", lines: [`Google Meet-те ${m.kk(p.reservationMinutes)}: ${p.teachingMinutes} минут ағылшын тілі және қысқа үзіліс.`, "Пакеттен 1 сабақ = 1 сабақ."] },
    { icon: "pack", title: "Пакеттер", lines: [...packLines, "Мерзім алғашқы сабақтан басталады. Брондалған сабақ пакет мерзімі біткенде де сіздікі болып қалады."] },
    { icon: "book", title: "Жазылу", lines: [`Кемінде ${h.kk(p.bookingMinNoticeHours)} бұрын жазылыңыз — ${bookingWindow("kk", p.bookingMonthsAhead)}.`, `Күніне ${lessonsWord.kk(p.maxStudentBookingsPerDay)}, аптасына ${lessonsWord.kk(p.maxStudentBookingsPerWeek)} артық емес.`] },
    { icon: "cancel", title: "Бас тарту", tone: "good", lines: [`${h.kk(p.studentCancelNoticeHours)} немесе одан ерте — тегін, сабақ қайтарылады.`, `Тегін бас тарту: 30 күнде ${p.studentFreeCancelsPer30Days} рет.`, "Кешірек немесе лимиттен тыс — сабақ есептен шығады."] },
    { icon: "move", title: "Ауыстыру", lines: [`${h.kk(p.studentCancelNoticeHours)} немесе одан ерте — тегін.`, "Кешірек — кеш бас тарту сияқты: сабақ есептен шығады, жаңа уақыт тағы бір сабақты алады."] },
    { icon: "missed", title: "Келмей қалсаңыз", tone: "warn", lines: ["Сабақ есептен шығады — оқытушы сізді күтті."] },
    { icon: "teacher", title: "Оқытушы бас тартса", tone: "good", lines: ["Сабақ әрқашан сізге қайтарылады.", `Басталғаннан кейін ${m.kk(p.noShowWaitMinutes)} өтсе де оқытушы болмаса, сабақ автоматты түрде қайтады.`] },
    { icon: "pause", title: "Үзіліс", lines: [`Сапар не ауру? Академияға жазыңыз — ${d.kk(p.pauseMaxDays)} дейін үзіліс, жарты жылда ${times.kk(p.pausesPer6Months)}.`, "Үзіліс кезінде пакет мерзімі тоқтайды. Брондалған сабақтарды алдымен ауыстырыңыз не бас тартыңыз."] },
    { icon: "bell", title: "Еске салу", lines: [`Сабақтар мерзімі біткенге дейін ${d.kk(p.expiryWarnFirstDays)} және ${d.kk(p.expiryWarnSecondDays)} бұрын ескертеміз.`] },
    { icon: "pay", title: "Төлем", lines: ["Төлем академиямен WhatsApp арқылы. Сабақтар төлем расталғаннан кейін қосылады."] },
    { icon: "respect", title: "Құрмет", lines: ["Сыпайы болыңыз және уақытында келіңіз. Сабақтар жазылады — бұл екі жақты да қорғайды.", "Оқытушыға дөрекілік: бір ескерту, содан кейін қоштасып, пайдаланылмаған сабақтарды қайтарамыз.", "Мәселе бар ма? 48 сағат ішінде академияға жазыңыз — шешімді академия қабылдайды."] },
  ];
  if (L === "ar") return [
    { icon: "lesson", title: "الدرس", lines: [`${m.ar(p.reservationMinutes)} على Google Meet: ${p.teachingMinutes} دقيقة من الإنجليزية واستراحة قصيرة.`, "درس واحد من الباقة = حصة واحدة."] },
    { icon: "pack", title: "الباقات", lines: [...packLines, "تبدأ المدة من أول درس. الدرس المحجوز يبقى لك حتى لو انتهت مدة الباقة."] },
    { icon: "book", title: "الحجز", lines: [`احجز قبل ${h.ar(p.bookingMinNoticeHours)} على الأقل — ${bookingWindow("ar", p.bookingMonthsAhead)}.`, `بحد أقصى ${lessonsWord.ar(p.maxStudentBookingsPerDay)} في اليوم و${lessonsWord.ar(p.maxStudentBookingsPerWeek)} في الأسبوع.`] },
    { icon: "cancel", title: "الإلغاء", tone: "good", lines: [`قبل ${h.ar(p.studentCancelNoticeHours)} أو أكثر — مجانًا ويعود الدرس إليك.`, `الإلغاءات المجانية: ${p.studentFreeCancelsPer30Days} كل 30 يومًا.`, "بعد ذلك أو فوق الحد — يُحتسب الدرس."] },
    { icon: "move", title: "النقل", lines: [`قبل ${h.ar(p.studentCancelNoticeHours)} أو أكثر — مجانًا.`, "بعد ذلك — يُعامل كإلغاء متأخر: يُحتسب الدرس، والموعد الجديد يستخدم درسًا آخر."] },
    { icon: "missed", title: "إذا لم تحضر", tone: "warn", lines: ["يُحتسب الدرس — فالمعلم كان ينتظرك."] },
    { icon: "teacher", title: "إذا ألغى المعلم", tone: "good", lines: ["يعود الدرس إليك دائمًا.", `إذا لم يحضر المعلم بعد ${m.ar(p.noShowWaitMinutes)} من البداية، يعود الدرس تلقائيًا.`] },
    { icon: "pause", title: "الإيقاف المؤقت", lines: [`مسافر أو مريض؟ راسل الأكاديمية — نوقف حتى ${d.ar(p.pauseMaxDays)}، ${times.ar(p.pausesPer6Months)} كل 6 أشهر.`, "أثناء الإيقاف تتوقف مدة الباقة. انقل الدروس المحجوزة أو ألغها أولًا."] },
    { icon: "bell", title: "التذكيرات", lines: [`نذكّرك قبل ${d.ar(p.expiryWarnFirstDays)} وقبل ${d.ar(p.expiryWarnSecondDays)} من انتهاء مدة الدروس.`] },
    { icon: "pay", title: "الدفع", lines: ["الدفع عبر واتساب مع الأكاديمية. تظهر الدروس بعد تأكيد الدفع."] },
    { icon: "respect", title: "الاحترام", lines: ["كن لطيفًا واحضر في الوقت. الدروس مسجلة — وهذا يحمي الطرفين.", "الإساءة للمعلم: تحذير واحد، ثم ننهي التعاون ونعيد الدروس غير المستخدمة.", "مشكلة؟ راسل الأكاديمية خلال 48 ساعة — والقرار للأكاديمية."] },
  ];
  return [
    { icon: "lesson", title: "Lesson", lines: [`${m.en(p.reservationMinutes)} on Google Meet: ${p.teachingMinutes} minutes of English and a short break.`, "1 lesson from your pack = 1 class."] },
    { icon: "pack", title: "Packs", lines: [...packLines, "The clock starts at your first lesson. A lesson you've already booked stays yours even if the pack runs out of time."] },
    { icon: "book", title: "Booking", lines: [`Book at least ${h.en(p.bookingMinNoticeHours)} ahead, ${bookingWindow("en", p.bookingMonthsAhead)}.`, `Up to ${lessonsWord.en(p.maxStudentBookingsPerDay)} a day and ${lessonsWord.en(p.maxStudentBookingsPerWeek)} a week.`] },
    { icon: "cancel", title: "Cancelling", tone: "good", lines: [`${h.en(p.studentCancelNoticeHours)} or more before: free — the lesson comes back.`, `Free cancellations: ${p.studentFreeCancelsPer30Days} every 30 days.`, "Later than that, or over the limit: the lesson is used."] },
    { icon: "move", title: "Moving", lines: [`${h.en(p.studentCancelNoticeHours)} or more before: free.`, "Later: it counts as a late cancellation — the lesson is used, and the new time uses another."] },
    { icon: "missed", title: "If you don't come", tone: "warn", lines: ["The lesson is used — your teacher was waiting for you."] },
    { icon: "teacher", title: "If your teacher cancels", tone: "good", lines: ["You always get the lesson back.", `If the teacher isn't there ${m.en(p.noShowWaitMinutes)} after the start, the lesson comes back automatically.`] },
    { icon: "pause", title: "Pause", lines: [`Travelling or ill? Ask the academy to pause for up to ${d.en(p.pauseMaxDays)}, ${times.en(p.pausesPer6Months)} every 6 months.`, "While paused, your pack's clock stops. Move or cancel booked lessons first."] },
    { icon: "bell", title: "Reminders", lines: [`We remind you ${d.en(p.expiryWarnFirstDays)} and ${d.en(p.expiryWarnSecondDays)} before your lessons expire.`] },
    { icon: "pay", title: "Paying", lines: ["Pay through WhatsApp with the academy. Lessons appear once payment is confirmed."] },
    { icon: "respect", title: "Respect", lines: ["Be kind and on time. Lessons are recorded — that protects both sides.", "Harassing a teacher: one warning, then we part ways and refund unused lessons.", "A problem? Message the academy within 48 hours — the academy decides."] },
  ];
}

// ── Teacher cards (English + Russian; other locales read English) ────

export function teacherPolicyCards(locale: PolicyLocale, p: PolicyNumbers): PolicyCard[] {
  if (locale === "ru") return [
    { icon: "horizon", title: "Отмена и перенос", lines: [`Вы можете отменять и переносить уроки в ближайшие ${d.ru(p.actionHorizonDays)}.`, `Меньше чем за ${h.ru(p.teacherCancelNoticeHours)} — можно, но это снижает вашу надёжность. Новое время сначала согласуйте с учеником.`, "Ученик всегда получает урок обратно.", "Первый урок с новым учеником отменить нельзя."] },
    { icon: "start", title: "Начало урока", tone: "warn", lines: [`Можно начать за ${m.ru(p.lessonStartEarlyMinutes)} до начала.`, `Через ${m.ru(p.noShowPingMinutes)} без вас — напоминание. Через ${m.ru(p.noShowWaitMinutes)} — урок возвращается ученику и считается вашей неявкой (без оплаты).`] },
    { icon: "timeoff", title: "Выходные", lines: ["Закрывайте свои даты сами. Уроки внутри сначала перенесите или отмените.", `Академия всегда получает уведомление. Больше ${d.ru(p.timeOffApprovalDays)} подряд — нужно подтверждение администратора.`] },
    { icon: "homework", title: "Материалы урока", lines: [`Проверьте и опубликуйте материалы (конспект, слова, тест) в течение ${h.ru(p.lessonPublishHours)} после урока.`, "Проверьте домашнее задание ученика до следующего урока.", "Опоздания с публикацией снижают вашу надёжность."] },
    { icon: "hours", title: "Расписание", lines: [`Держите открытыми минимум ${h.ru(p.teacherMinWeeklyHours)} в обычной неделе.`] },
    { icon: "money", title: "Оплата", lines: ["Выплата раз в месяц, по ставке из вашего договора.", "Оплачиваются: проведённые уроки, неявка ученика и любая отмена или перенос, за которые ученик лишился урока.", "Не оплачиваются: отмены и ваша неявка."] },
    { icon: "shield", title: "Правила поведения", tone: "warn", lines: ["Камера включена, вовремя, только в комнате Meet академии — запись защищает и вас.", "Нельзя уводить учеников в частные занятия — это немедленное увольнение.", "Нельзя передавать данные учеников (контакты, записи, транскрипты) за пределы платформы.", "Спорные ситуации — администрации в течение 48 часов; решение принимает академия."] },
  ];
  return [
    { icon: "horizon", title: "Cancelling and moving", lines: [`You can cancel or move lessons in the next ${d.en(p.actionHorizonDays)}.`, `With less than ${h.en(p.teacherCancelNoticeHours)} notice it's allowed but counts against your reliability. Agree the new time with the student first.`, "The student always gets the lesson back.", "You can't cancel a first lesson with a new student."] },
    { icon: "start", title: "Starting on time", tone: "warn", lines: [`You can start up to ${m.en(p.lessonStartEarlyMinutes)} early.`, `${m.en(p.noShowPingMinutes)} late: a reminder. ${m.en(p.noShowWaitMinutes)} late: the student gets the lesson back and it counts as your no-show (unpaid).`] },
    { icon: "timeoff", title: "Time off", lines: ["Block your own dates. Move or cancel any lessons inside them first.", `The academy is always notified. More than ${d.en(p.timeOffApprovalDays)} in a row needs admin sign-off.`] },
    { icon: "homework", title: "Lesson materials", lines: [`Review and publish the materials (summary, words, quiz) within ${h.en(p.lessonPublishHours)} of the lesson.`, "Check the student's homework before your next lesson with them.", "Late publishing counts against your reliability."] },
    { icon: "hours", title: "Availability", lines: [`Keep at least ${h.en(p.teacherMinWeeklyHours)} open in your usual week.`] },
    { icon: "money", title: "Pay", lines: ["Paid monthly, at the rate in your agreement.", "Paid: completed lessons, student no-shows, and any student cancel or move that used their lesson.", "Not paid: cancellations and your own no-shows."] },
    { icon: "shield", title: "Conduct", tone: "warn", lines: ["Camera on, on time, in the academy's Meet room — the recording protects you too.", "Never take students private — that means immediate removal.", "Never share student data (contacts, recordings, transcripts) outside the platform.", "Disputes go to the admin within 48 hours; the academy decides."] },
  ];
}

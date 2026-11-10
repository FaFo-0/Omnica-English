/** One-tap WhatsApp message carrying a student's homework link. */
const LINE: Record<string, string> = {
  ar: "واجبك جاهز 📚 افتح الرابط وسجّل الدخول:",
  ru: "Домашнее задание готово 📚 Откройте ссылку и войдите:",
  kk: "Үй тапсырмаңыз дайын 📚 Сілтемені ашып, кіріңіз:",
  en: "Your homework is ready 📚 Open the link and sign in:",
};

export function homeworkWhatsAppUrl(link: string, locale: string | null | undefined, phone: string | null | undefined): string {
  const text = `${LINE[locale ?? "en"] ?? LINE.en}\n${link}`;
  // wa.me needs a full international number. A local number ("05…") would open
  // the wrong chat, so then WhatsApp asks which chat to send to instead.
  const trimmed = phone?.trim() ?? "";
  const digits = trimmed.replace(/\D/g, "");
  const international = (trimmed.startsWith("+") || trimmed.startsWith("00")) && digits.length >= 8;
  const number = international ? digits.replace(/^00/, "") : "";
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

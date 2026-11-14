import type { PublicLandingLocale } from "./publicLandingLocale";

/**
 * Adds a pre-typed message to a WhatsApp link. Only number links
 * (https://wa.me/<digits>) accept `?text=`; WhatsApp Business short links
 * (wa.me/message/…) carry their own preset message, so they're returned as-is.
 * Anything that isn't an https wa.me link returns null.
 */
export function whatsappHref(base: string | null | undefined, text?: string): string | null {
  if (!base) return null;
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" || url.hostname !== "wa.me") return null;
    // encodeURIComponent (spaces → %20): WhatsApp can show "+" literally if spaces are form-encoded.
    if (text && /^\/\d+\/?$/.test(url.pathname)) return `${url.origin}${url.pathname}?text=${encodeURIComponent(text)}`;
    return url.href;
  } catch {
    return null;
  }
}

/** What a visitor sends when they tap a pack's WhatsApp button, so the academy knows which pack they picked. */
export function packWhatsappMessage(locale: string, packName: string, price: string): string {
  switch (locale as PublicLandingLocale) {
    case "ru": return `Здравствуйте! Хочу оформить пакет «${packName}» — ${price}.`;
    case "kk": return `Сәлеметсіз бе! «${packName}» пакетін алғым келеді — ${price}.`;
    case "ar": return `مرحبًا! أريد الاشتراك في باقة «${packName}» — ${price}.`;
    default: return `Hi! I'd like the "${packName}" pack — ${price}.`;
  }
}

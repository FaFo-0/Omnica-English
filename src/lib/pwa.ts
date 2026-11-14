"use client";

// Home-screen app + push helpers. Browser-only; every function is safe to
// call during render on the client but returns neutral values on the server.

import { useSyncExternalStore } from "react";

export type Platform = "ios" | "android" | "desktop";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isBrowser = () => typeof window !== "undefined";

export function getPlatform(): Platform {
  if (!isBrowser()) return "desktop";
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch points give it away.
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/** Telegram / Instagram / Facebook / WhatsApp browsers can't install apps. */
export function isInAppBrowser(): boolean {
  if (!isBrowser()) return false;
  const ua = navigator.userAgent;
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|Telegram|WhatsApp|MicroMessenger/i.test(ua)) return true;
  if (/Android/i.test(ua) && /; wv\)/.test(ua)) return true; // Android WebView
  // iOS in-app views drop the "Safari" token that Safari and Chrome keep.
  if (getPlatform() === "ios" && /Mobile\//.test(ua) && !/Safari\//.test(ua)) return true;
  return false;
}

export function isStandalone(): boolean {
  if (!isBrowser()) return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function pushSupported(): boolean {
  return isBrowser() && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// ── install prompt store (Android Chrome / Edge / Samsung) ─────────────

let deferredPrompt: InstallPromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Called once from the root layout so the early browser event isn't missed. */
export function bootPwa() {
  if (!isBrowser() || (window as Window & { __omnicaPwa?: boolean }).__omnicaPwa) return;
  (window as Window & { __omnicaPwa?: boolean }).__omnicaPwa = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installedNow = true;
    emit();
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("[pwa] service worker registration failed", error);
    });
  }
}

const noopSubscribe = () => () => {};
/** False during SSR and the first hydration pass, true after — lets render
 *  read browser-only facts (user agent, display mode) without effects. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function subscribeStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** { canPrompt, installed } — `installed` covers "just installed in this tab". */
export function useInstallPrompt() {
  const canPrompt = useSyncExternalStore(subscribeStore, () => !!deferredPrompt, () => false);
  const installed = useSyncExternalStore(subscribeStore, () => installedNow, () => false);
  return {
    canPrompt,
    installed,
    async prompt(): Promise<boolean> {
      const event = deferredPrompt;
      if (!event) return false;
      await event.prompt();
      const choice = await event.userChoice;
      deferredPrompt = null;
      if (choice.outcome === "accepted") installedNow = true;
      emit();
      return choice.outcome === "accepted";
    },
  };
}

// ── push subscription ───────────────────────────────────────────────

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return await navigator.serviceWorker.ready;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export type SubscriptionKeys = { endpoint: string; p256dh: string; auth: string };

export function subscriptionKeys(sub: PushSubscription): SubscriptionKeys | null {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
}

/** Subscribe this device. Assumes permission is already granted. */
export async function createSubscription(publicKey: string): Promise<SubscriptionKeys> {
  const reg = await registration();
  const key = urlBase64ToUint8Array(publicKey);
  let sub = await reg.pushManager.getSubscription();
  // A subscription made with an older key can't receive our messages.
  if (sub && sub.options.applicationServerKey) {
    const existing = new Uint8Array(sub.options.applicationServerKey);
    if (existing.length !== key.length || existing.some((b, i) => b !== key[i])) {
      await sub.unsubscribe();
      sub = null;
    }
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  const keys = subscriptionKeys(sub);
  if (!keys) throw new Error("This browser returned an incomplete subscription");
  return keys;
}

// ── "Not now" (per device) ──────────────────────────────────────────

const DISMISS_KEY = "omnica-app-banner-dismissed";
const DISMISS_MS = 14 * 24 * 3600_000;

export function bannerDismissed(): boolean {
  if (!isBrowser()) return true;
  const at = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
  return Number.isFinite(at) && Date.now() - at < DISMISS_MS;
}

export function dismissBanner() {
  window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

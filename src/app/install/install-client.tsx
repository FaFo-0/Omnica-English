"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { useLocale } from "@/i18n/provider";
import { isLocale } from "@/i18n/config";
import { getPlatform, isInAppBrowser, isStandalone, useInstallPrompt, useIsClient } from "@/lib/pwa";
import { InstallSteps, OpenInBrowser } from "@/components/pwa/InstallSteps";

export function InstallPageClient() {
  const t = useTranslations("pwa");
  const params = useSearchParams();
  const { setLocale } = useLocale();
  const install = useInstallPrompt();
  const env = useIsClient() ? { platform: getPlatform(), inApp: isInAppBrowser(), standalone: isStandalone() } : null;

  useEffect(() => {
    // ?lang=ru wins; otherwise a first-time visitor gets their phone's language.
    const requested = params.get("lang");
    if (requested && isLocale(requested)) setLocale(requested);
    else if (!window.localStorage.getItem("omnica-locale")) {
      const guess = navigator.language.slice(0, 2);
      if (isLocale(guess)) setLocale(guess);
    }
  }, [params, setLocale]);

  let content: React.ReactNode = null;
  if (env) {
    if (env.standalone || install.installed) {
      content = <p className="body">{t("pageInstalled")}</p>;
    } else if (env.platform !== "desktop" && env.inApp) {
      content = (
        <>
          <div className="h3" style={{ marginBottom: 8 }}>{t("inAppTitle")}</div>
          <OpenInBrowser />
        </>
      );
    } else if (env.platform === "ios") {
      content = <InstallSteps platform="ios" />;
    } else if (env.platform === "android" && install.canPrompt) {
      content = (
        <>
          <p className="body-sm" style={{ marginBottom: 12 }}>{t("pageAndroidReady")}</p>
          <button className="btn btn-tenant btn-block" onClick={() => void install.prompt()}>
            <Download size={18} /> {t("installCta")}
          </button>
        </>
      );
    } else if (env.platform === "android") {
      content = <InstallSteps platform="android" />;
    } else {
      content = <p className="body-sm">{t("pageDesktop")}</p>;
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "48px 16px",
        background: "var(--omnic-gray-50)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Logo size="md" />
        </div>
        <div className="card" style={{ padding: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pwa/icon-192.png" alt="" width={64} height={64} style={{ borderRadius: 14, marginBottom: 16 }} />
          <h1 className="h2" style={{ marginBottom: 6 }}>{t("pageTitle")}</h1>
          <p className="body-sm" style={{ marginBottom: 20 }}>{t("pageBody")}</p>
          {content}
        </div>
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link href="/portal" className="btn btn-secondary btn-sm">{t("pageOpen")}</Link>
        </div>
      </div>
    </main>
  );
}

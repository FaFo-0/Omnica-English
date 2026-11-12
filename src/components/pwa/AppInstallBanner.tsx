"use client";

// Dashboard banner (students + teachers): gets the app onto the phone and
// notifications turned on, in as few taps as each platform allows. Renders
// nothing once this device has notifications on, after "Not now" (2 weeks),
// or when the browser simply can't do it.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bell, Download } from "lucide-react";
import { bannerDismissed, dismissBanner, isInAppBrowser, useInstallPrompt, useIsClient } from "@/lib/pwa";
import { usePushDevice } from "./usePushDevice";
import { InstallSteps, OpenInBrowser } from "./InstallSteps";

type Mode = "inApp" | "iosSteps" | "androidPrompt" | "androidSteps" | "push";

export function AppInstallBanner() {
  const t = useTranslations("pwa");
  const push = usePushDevice();
  const install = useInstallPrompt();
  const mounted = useIsClient();
  const [dismissedNow, setDismissedNow] = useState(false);
  const hidden = dismissedNow || (mounted && bannerDismissed());
  const inApp = mounted && isInAppBrowser();

  if (!mounted || hidden || !push.ready || !push.configured || push.on) return null;

  const phone = push.platform !== "desktop";
  const installedHere = push.standalone || install.installed;
  let mode: Mode | null = null;
  if (phone && inApp) mode = "inApp";
  else if (push.platform === "ios" && !installedHere) mode = "iosSteps";
  else if (push.platform === "android" && !installedHere && install.canPrompt) mode = "androidPrompt";
  else if (push.supported && push.permission === "default") mode = "push";
  else if (push.platform === "android" && !installedHere) mode = "androidSteps";
  if (!mode) return null;

  function notNow() {
    dismissBanner();
    setDismissedNow(true);
    toast(t("dismissedToast"));
  }

  async function turnOn() {
    try {
      const result = await push.enable();
      if (result === "granted") toast.success(t("pushOnToast"));
      else if (result === "denied") toast.error(t("pushDeniedToast"));
    } catch (error) {
      console.warn("[push] turn on failed", error);
      toast.error(t("pushFailed"));
    }
  }

  const title =
    mode === "inApp" ? t("inAppTitle") : mode === "push" ? t("pushTitle") : mode === "iosSteps" ? t("iosTitle") : t("installTitle");
  const body = mode === "push" ? t("pushBody") : mode === "inApp" ? null : t("installBody");

  return (
    <div
      className="card"
      role="region"
      aria-label={title}
      style={{
        padding: 16,
        marginBottom: 24,
        borderColor: "color-mix(in srgb, var(--omnic-tenant-primary) 35%, transparent)",
        background: "color-mix(in srgb, var(--omnic-tenant-primary) 6%, var(--card-bg))",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pwa/icon-192.png" alt="" width={44} height={44} style={{ borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="body" style={{ fontWeight: 700 }}>
            {title}
          </div>
          {body ? (
            <div className="body-sm" style={{ marginTop: 2 }}>
              {body}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {mode === "inApp" ? <OpenInBrowser /> : null}
        {mode === "iosSteps" ? <InstallSteps platform="ios" /> : null}
        {mode === "androidSteps" ? <InstallSteps platform="android" /> : null}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: mode === "push" || mode === "androidPrompt" ? 0 : 14 }}>
        {mode === "androidPrompt" ? (
          <button className="btn btn-tenant" onClick={() => void install.prompt()}>
            <Download size={16} /> {t("installCta")}
          </button>
        ) : null}
        {mode === "push" ? (
          <button className="btn btn-tenant" onClick={() => void turnOn()} disabled={push.busy}>
            <Bell size={16} /> {push.busy ? t("turningOn") : t("pushCta")}
          </button>
        ) : null}
        <button className="btn btn-secondary btn-sm" onClick={notNow} style={{ alignSelf: "center" }}>
          {t("notNow")}
        </button>
      </div>
    </div>
  );
}

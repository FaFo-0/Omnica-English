"use client";

// Profile → "App & notifications" (every role). The permanent home for the
// install steps and the on/off switch; Telegram sits underneath as a quiet
// fallback for anyone who can't or won't install.

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bell, BellOff, Download, Send } from "lucide-react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex";
import { isInAppBrowser, useInstallPrompt, useIsClient } from "@/lib/pwa";
import { TelegramNotificationsCard } from "@/components/shared/TelegramNotificationsCard";
import { usePushDevice } from "./usePushDevice";
import { InstallSteps, OpenInBrowser } from "./InstallSteps";

export function AppNotificationsCard() {
  const t = useTranslations("pwa");
  const push = usePushDevice();
  const install = useInstallPrompt();
  const telegram = useQuery(api.telegram.getMyStatus);
  const inApp = useIsClient() && isInAppBrowser();

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

  async function turnOff() {
    try {
      await push.disable();
      toast(t("pushOffToast"));
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function test() {
    try {
      await push.sendTest();
      toast.success(t("testSent"));
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  const installedHere = push.standalone || install.installed;
  const phone = push.platform !== "desktop";

  let body: React.ReactNode;
  if (!push.ready) {
    body = null;
  } else if (!push.configured) {
    body = <p className="body-sm">{t("notConfigured")}</p>;
  } else if (phone && inApp) {
    body = <OpenInBrowser />;
  } else if (push.on) {
    body = (
      <>
        <p className="body-sm" style={{ marginBottom: 12 }}>
          {t("statusOn")}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-tenant btn-sm" onClick={() => void test()}>
            <Send size={14} /> {t("sendTest")}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => void turnOff()} disabled={push.busy}>
            <BellOff size={14} /> {t("turnOff")}
          </button>
        </div>
      </>
    );
  } else if (push.needsInstallForPush) {
    body = (
      <>
        <p className="body-sm" style={{ marginBottom: 12 }}>
          {t("iosNeedsInstall")}
        </p>
        <InstallSteps platform="ios" />
      </>
    );
  } else if (push.permission === "denied") {
    body = <p className="body-sm">{t("blockedHelp")}</p>;
  } else if (!push.supported) {
    body = <p className="body-sm">{t("pushUnsupported")}</p>;
  } else {
    body = (
      <>
        <p className="body-sm" style={{ marginBottom: 12 }}>
          {t("statusOff")} {t("pushBody")}
        </p>
        <button className="btn btn-tenant btn-sm" onClick={() => void turnOn()} disabled={push.busy}>
          <Bell size={14} /> {push.busy ? t("turningOn") : t("pushCta")}
        </button>
      </>
    );
  }

  return (
    <>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
          <Bell size={20} style={{ color: "var(--omnic-tenant-primary)" }} />
          <div className="h3">{t("cardTitle")}</div>
        </div>
        {body}
        {push.deviceCount > 0 ? (
          <div className="body-sm" style={{ marginTop: 10, color: "var(--omnic-gray-500)" }}>
            {t("deviceCount", { count: push.deviceCount })}
          </div>
        ) : null}
        {push.ready && push.platform === "android" && !installedHere && install.canPrompt ? (
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => void install.prompt()}>
            <Download size={14} /> {t("installCta")}
          </button>
        ) : null}
      </div>

      {/* Telegram stays for people already connected; everyone else sees it
          folded away as a fallback. */}
      {telegram?.connected ? (
        <TelegramNotificationsCard />
      ) : (
        <details style={{ marginBottom: 16 }}>
          <summary className="body-sm" style={{ cursor: "pointer", color: "var(--omnic-gray-500)", paddingBlock: 4 }}>
            {t("otherWays")}
          </summary>
          <div style={{ marginTop: 8 }}>
            <TelegramNotificationsCard />
          </div>
        </details>
      )}
    </>
  );
}

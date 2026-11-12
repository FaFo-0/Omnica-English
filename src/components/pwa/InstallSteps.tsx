"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, EllipsisVertical, Share, SquarePlus, Smartphone } from "lucide-react";
import type { Platform } from "@/lib/pwa";

const stepRow: React.CSSProperties = { display: "flex", gap: 10, alignItems: "center" };
const stepNum: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 999,
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 700,
  background: "var(--omnic-tenant-primary)",
  color: "#fff",
};
const glyph: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: 8,
  flexShrink: 0,
  border: "1px solid var(--omnic-gray-200)",
  background: "var(--card-bg)",
  color: "#007AFF",
};

/** Manual "add to home screen" steps for browsers that can't be prompted. */
export function InstallSteps({ platform }: { platform: Platform }) {
  const t = useTranslations("pwa");
  const steps =
    platform === "ios"
      ? [
          { icon: <Share size={16} />, text: t("iosStep1"), hint: t("iosStep1Hint") },
          { icon: <SquarePlus size={16} />, text: t("iosStep2") },
          { icon: <Smartphone size={16} />, text: t("iosStep3") },
        ]
      : [
          { icon: <EllipsisVertical size={16} style={{ color: "var(--omnic-gray-700)" }} />, text: t("androidStep1") },
          { icon: <Smartphone size={16} style={{ color: "var(--omnic-gray-700)" }} />, text: t("androidStep2") },
        ];
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
      {steps.map((step, i) => (
        <li key={i} style={stepRow}>
          <span style={stepNum}>{i + 1}</span>
          <span style={glyph} aria-hidden>
            {step.icon}
          </span>
          <span className="body-sm" style={{ color: "var(--omnic-gray-800)" }}>
            <strong style={{ fontWeight: 600 }}>{step.text}</strong>
            {step.hint ? <span style={{ display: "block", color: "var(--omnic-gray-500)" }}>{step.hint}</span> : null}
          </span>
        </li>
      ))}
      {platform === "ios" ? (
        <li className="body-sm" style={{ color: "var(--omnic-gray-500)", paddingInlineStart: 34 }}>
          {t("iosSignInNote")}
        </li>
      ) : null}
    </ol>
  );
}

/** For Telegram / Instagram / WhatsApp in-app browsers. */
export function OpenInBrowser() {
  const t = useTranslations("pwa");
  async function copy() {
    const url = `${window.location.origin}/install`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("linkCopied"));
    } catch {
      window.prompt(t("copyLink"), url);
    }
  }
  return (
    <div>
      <div className="body-sm" style={{ marginBottom: 10 }}>
        {t("inAppBody")}
      </div>
      <button className="btn btn-tenant btn-sm" onClick={() => void copy()}>
        <Copy size={14} /> {t("copyLink")}
      </button>
    </div>
  );
}

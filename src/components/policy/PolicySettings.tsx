"use client";

// Admin Settings → Policy. Every number a student or teacher rule uses, with
// a live preview of what students will read. Saving applies to the next
// action only — nothing already cancelled, charged or booked changes.

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex";
import { toast } from "sonner";
import { Icon } from "@/components/shared/icons";
import { PolicyView, packLinesFrom } from "./PolicyView";
import type { PolicyLocale, PolicyNumbers } from "./policyCopy";

type Field = { key: string; label: string; unit: string; help?: string };

const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "Booking",
    fields: [
      { key: "bookingMinNoticeHours", label: "Book at least", unit: "hours ahead" },
      { key: "bookingMonthsAhead", label: "Booking window", unit: "months ahead", help: "1 = until the end of next month, 0 = end of this month." },
      { key: "maxStudentBookingsPerDay", label: "Max lessons per day", unit: "lessons" },
      { key: "maxStudentBookingsPerWeek", label: "Max lessons per week", unit: "lessons" },
    ],
  },
  {
    title: "Student cancel & move",
    fields: [
      { key: "studentCancelNoticeHours", label: "Free cancel / move if at least", unit: "hours before", help: "Later than this, the lesson is used. A late move also uses a lesson for the new time." },
      { key: "studentFreeCancelsPer30Days", label: "Free cancellations", unit: "per 30 days" },
    ],
  },
  {
    title: "Pause & expiry",
    fields: [
      { key: "pauseMaxDays", label: "Longest pause", unit: "days", help: "Admins can always pause for longer." },
      { key: "pausesPer6Months", label: "Pauses allowed", unit: "per 6 months" },
      { key: "expiryWarnFirstDays", label: "First expiry reminder", unit: "days before" },
      { key: "expiryWarnSecondDays", label: "Second expiry reminder", unit: "days before" },
    ],
  },
  {
    title: "Teachers",
    fields: [
      { key: "actionHorizonDays", label: "Teachers can cancel / move lessons in the next", unit: "days" },
      { key: "teacherCancelNoticeHours", label: "Teacher cancel counts as late under", unit: "hours" },
      { key: "timeOffApprovalDays", label: "Time off needs your sign-off when longer than", unit: "days" },
      { key: "lessonPublishHours", label: "Publish lesson materials within", unit: "hours" },
      { key: "teacherMinWeeklyHours", label: "Minimum open hours", unit: "per week", help: "0 turns the reminder off. Below it, the teacher shows in Needs attention — nothing is blocked." },
    ],
  },
  {
    title: "Teacher no-show",
    fields: [
      { key: "noShowPingMinutes", label: "Remind a late teacher after", unit: "minutes" },
      { key: "noShowWaitMinutes", label: "Refund the student after", unit: "minutes", help: "Counts as a teacher no-show; the teacher isn't paid." },
    ],
  },
];

export function PolicySettings() {
  const editor = useQuery(api.policyConstants.getEditor, {});
  const live = useQuery(api.policyConstants.get, {});
  const catalogue = useQuery(api.pricing.getPublicCatalogue, { locale: "ru" });
  const save = useMutation(api.policyConstants.update);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [previewLocale, setPreviewLocale] = useState<PolicyLocale>("ru");
  const [previewAudience, setPreviewAudience] = useState<"student" | "teacher">("student");

  useEffect(() => {
    if (!editor) return;
    setDraft(Object.fromEntries(Object.entries(editor.values).map(([k, v]) => [k, String(v)])));
  }, [editor]);

  const parsed = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(draft)) out[k] = Number(v);
    return out;
  }, [draft]);

  if (!editor || !live) return <div className="card" id="policy" style={{ padding: 24, marginBottom: 24 }}>Loading policy…</div>;

  const errors: Record<string, string> = {};
  for (const [key, raw] of Object.entries(draft)) {
    const [min, max] = editor.limits[key as keyof typeof editor.limits];
    const n = Number(raw);
    if (raw.trim() === "" || !Number.isInteger(n) || n < min || n > max) errors[key] = `${min}–${max}`;
  }
  if (!errors.noShowWaitMinutes && parsed.noShowPingMinutes >= parsed.noShowWaitMinutes) errors.noShowWaitMinutes = "Must be after the reminder";
  if (!errors.expiryWarnSecondDays && parsed.expiryWarnSecondDays >= parsed.expiryWarnFirstDays) errors.expiryWarnSecondDays = "Must be closer than the first";
  const dirty = Object.keys(draft).some((k) => parsed[k] !== editor.values[k as keyof typeof editor.values]);
  const valid = Object.keys(errors).length === 0;
  const preview: PolicyNumbers = { ...live, ...(valid ? parsed : {}) };

  async function submit() {
    setBusy(true);
    try {
      await save({ values: parsed });
      toast.success("Policy saved — it applies from the next action");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/policy`);
      toast.success("Policy link copied — paste it in WhatsApp");
    } catch {
      toast.error("Could not copy the link");
    }
  }

  return (
    <div className="card" id="policy" style={{ padding: 24, marginBottom: 24, scrollMarginTop: 90 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div className="h3" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="file" size={18} stroke="var(--omnic-tenant-primary)" /> Policy
          </div>
          <p className="body-sm" style={{ margin: 0, maxWidth: 560 }}>
            Every number in the academy rules. Change one and save: the calendar, the cancel and move dialogs,
            the rules page and the guides all follow from the next action. Lessons already cancelled, charged or
            booked are never recalculated.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => void copyLink()}>Copy /policy link</button>
          <a className="btn btn-secondary btn-sm" href="/policy" target="_blank" rel="noreferrer">Open</a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, marginTop: 20 }}>
        <div>
          {GROUPS.map((group) => (
            <fieldset key={group.title} style={{ border: 0, padding: 0, margin: "0 0 18px" }}>
              <legend className="h3" style={{ fontSize: 14, marginBottom: 8 }}>{group.title}</legend>
              {group.fields.map((f) => {
                const changed = parsed[f.key] !== editor.defaults[f.key as keyof typeof editor.defaults];
                return (
                  <label key={f.key} style={{ display: "block", padding: "8px 0", borderBottom: "1px solid var(--omnic-gray-100)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
                      <span className="body-sm" style={{ color: "var(--omnic-gray-800)" }}>{f.label}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <input
                          className="input"
                          inputMode="numeric"
                          style={{ width: 72, textAlign: "center", borderColor: errors[f.key] ? "var(--feedback-error)" : undefined }}
                          value={draft[f.key] ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value.replace(/[^0-9]/g, "") }))}
                        />
                        <span className="body-sm" style={{ width: 92 }}>{f.unit}</span>
                      </span>
                    </div>
                    {(errors[f.key] || f.help || changed) && (
                      <div className="body-sm" style={{ fontSize: 12, marginTop: 4, color: errors[f.key] ? "var(--feedback-error)" : "var(--omnic-gray-500)" }}>
                        {errors[f.key] ? `Allowed: ${errors[f.key]}` : f.help}
                        {!errors[f.key] && changed && (
                          <> {f.help ? "· " : ""}Default {editor.defaults[f.key as keyof typeof editor.defaults]}{" "}
                            <button type="button" className="link" style={{ fontSize: 12 }} onClick={() => setDraft((d) => ({ ...d, [f.key]: String(editor.defaults[f.key as keyof typeof editor.defaults]) }))}>reset</button>
                          </>
                        )}
                      </div>
                    )}
                  </label>
                );
              })}
            </fieldset>
          ))}

          <div className="card" style={{ padding: 14, background: "var(--omnic-gray-50)", marginBottom: 16 }}>
            <div className="h3" style={{ fontSize: 13, marginBottom: 4 }}>Fixed (would break booked lessons)</div>
            <div className="body-sm">
              Lesson {live.reservationMinutes} min ({live.teachingMinutes} teaching) · {live.bookingGranularityMinutes}-minute calendar grid ·
              teachers may start {live.lessonStartEarlyMinutes} min early. Pack lengths and prices are set per pack in Billing.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-tenant" disabled={!dirty || !valid || busy} onClick={() => void submit()}>
              {busy ? "Saving…" : "Save policy"}
            </button>
            {dirty && (
              <button className="btn btn-secondary" disabled={busy} onClick={() => setDraft(Object.fromEntries(Object.entries(editor.values).map(([k, v]) => [k, String(v)])))}>
                Undo changes
              </button>
            )}
            {editor.updatedAt && <span className="body-sm">Last saved {new Date(editor.updatedAt).toLocaleString()}</span>}
          </div>
        </div>

        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {(["student", "teacher"] as const).map((a) => (
              <button key={a} className={`btn btn-sm ${previewAudience === a ? "btn-tenant" : "btn-secondary"}`} onClick={() => setPreviewAudience(a)}>
                {a === "student" ? "Students see" : "Teachers see"}
              </button>
            ))}
            <select className="input" style={{ width: "auto", marginInlineStart: "auto" }} value={previewLocale} onChange={(e) => setPreviewLocale(e.target.value as PolicyLocale)}>
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="kk">Қазақша</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <div
            dir={previewLocale === "ar" ? "rtl" : "ltr"}
            style={{ maxHeight: 720, overflowY: "auto", padding: 12, borderRadius: 12, background: "#faf7ef", "--policy-accent": "var(--omnic-tenant-primary)" } as CSSProperties}
          >
            <PolicyView locale={previewLocale} policy={preview} packs={packLinesFrom(catalogue)} audience={previewAudience} />
          </div>
        </div>
      </div>
    </div>
  );
}

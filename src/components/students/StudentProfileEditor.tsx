"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DAYS: [string, string][] = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"]];
const TIMES: [string, string][] = [["morning", "Mornings"], ["afternoon", "Afternoons"], ["evening", "Evenings"], ["late", "Late nights"]];
const INTERESTS: [string, string][] = [["business", "Business"], ["travel", "Travel"], ["exams", "IELTS / exams"], ["tech", "Tech"], ["culture", "Culture"], ["news", "News"], ["movies", "Films & TV"], ["sport", "Sport"], ["science", "Science"]];
const REFERRALS: [string, string][] = [["", "—"], ["friend", "A friend"], ["instagram", "Instagram"], ["google", "Google"], ["telegram", "Telegram"], ["other", "Somewhere else"]];
const LEVELS = ["", "A1", "A2", "B1", "B2", "C1", "C2"];
const TIMEZONES: string[] = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

export type StudentProfileValues = {
  name: string; phone: string; guardianName: string; guardianPhone: string; timezone: string;
  age: string; englishLevel: string; country: string; goal: string; inTheirWords: string;
  preferredDays: string[]; preferredTimeOfDay: string[]; interests: string[]; referralSource: string;
};

function Chips({ options, value, onChange }: { options: [string, string][]; value: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([key, label]) => {
        const on = value.includes(key);
        return (
          <button key={key} type="button" aria-pressed={on}
            className={on ? "btn btn-tenant btn-sm" : "btn btn-secondary btn-sm"}
            onClick={() => onChange(on ? value.filter(v => v !== key) : [...value, key])}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs" style={{ color: "var(--omnic-gray-500)" }}>{hint}</span>}
    </label>
  );
}

/** Admin: edit everything a student told us about themselves. */
export function StudentProfileEditor({ studentId, email, initial, onClose }: {
  studentId: string; email: string; initial: StudentProfileValues; onClose: () => void;
}) {
  const save = useMutation(api.users.adminUpdateStudentProfile);
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof StudentProfileValues>(key: K, value: StudentProfileValues[K]) => setF(prev => ({ ...prev, [key]: value }));

  async function submit() {
    setBusy(true);
    try {
      await save({
        studentId, name: f.name, phone: f.phone, guardianName: f.guardianName, guardianPhone: f.guardianPhone,
        timezone: f.timezone, age: f.age.trim() ? Number(f.age) : null, englishLevel: f.englishLevel, country: f.country,
        goal: f.goal, inTheirWords: f.inTheirWords, preferredDays: f.preferredDays, preferredTimeOfDay: f.preferredTimeOfDay,
        interests: f.interests, referralSource: f.referralSource,
      });
      toast.success("Student profile saved");
      onClose();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit student</DialogTitle>
          <DialogDescription>Sign-in email ({email}) is their login and can&apos;t be changed here.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Row label="Name"><Input value={f.name} onChange={e => set("name", e.target.value)} /></Row>
          <Row label="Phone / WhatsApp" hint="Include the country code, e.g. +966 56 757 0787, so Send on WhatsApp opens their chat.">
            <Input type="tel" inputMode="tel" value={f.phone} onChange={e => set("phone", e.target.value)} />
          </Row>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Guardian name"><Input value={f.guardianName} onChange={e => set("guardianName", e.target.value)} /></Row>
            <Row label="Guardian phone"><Input type="tel" value={f.guardianPhone} onChange={e => set("guardianPhone", e.target.value)} /></Row>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Row label="English level">
              <select className="input" value={f.englishLevel} onChange={e => set("englishLevel", e.target.value)}>
                {LEVELS.map(level => <option key={level} value={level}>{level || "—"}</option>)}
              </select>
            </Row>
            <Row label="Age"><Input type="number" inputMode="numeric" min={3} max={120} value={f.age} onChange={e => set("age", e.target.value)} /></Row>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Country"><Input value={f.country} onChange={e => set("country", e.target.value)} placeholder="e.g. Saudi Arabia" /></Row>
            <Row label="Timezone">
              <Input list="student-tz" value={f.timezone} onChange={e => set("timezone", e.target.value)} placeholder="e.g. Asia/Riyadh" />
              <datalist id="student-tz">{TIMEZONES.map(tz => <option key={tz} value={tz} />)}</datalist>
            </Row>
          </div>
          <Row label="Goal"><Textarea rows={2} value={f.goal} onChange={e => set("goal", e.target.value)} /></Row>
          <Row label="Days they can study"><Chips options={DAYS} value={f.preferredDays} onChange={v => set("preferredDays", v)} /></Row>
          <Row label="Times of day"><Chips options={TIMES} value={f.preferredTimeOfDay} onChange={v => set("preferredTimeOfDay", v)} /></Row>
          <Row label="Availability in their words"><Textarea rows={2} value={f.inTheirWords} onChange={e => set("inTheirWords", e.target.value)} /></Row>
          <Row label="Topics they enjoy"><Chips options={INTERESTS} value={f.interests} onChange={v => set("interests", v)} /></Row>
          <Row label="Found us via">
            <select className="input" value={f.referralSource} onChange={e => set("referralSource", e.target.value)}>
              {REFERRALS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </Row>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={busy || !f.name.trim()}>{busy ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

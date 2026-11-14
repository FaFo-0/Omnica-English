"use client";

// Homework — every student's homework in one place, grouped by what the
// teacher has to do next. Each row opens the lesson on its Homework tab.

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex";
import type { FunctionReturnType } from "convex/server";

type Row = FunctionReturnType<typeof api.homework.listForTeacher>[number];

function when(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function href(row: Row): string {
  return row.lessonId ? `/teacher/sessions/${row.lessonId}?tab=homework` : `/teacher/students/${row.studentId}`;
}

function HomeworkRow({ row, now }: { row: Row; now: number }) {
  const overdue = (row.status === "assigned" || row.status === "in_progress") && row.dueAt !== null && Date.parse(row.dueAt) < now;
  let detail = "";
  if (row.status === "submitted") detail = `Submitted ${when(row.submittedAt)}`;
  else if (row.status === "reviewed") detail = row.maxScore ? `Score ${row.score ?? 0}/${row.maxScore}` : `Reviewed ${when(row.reviewedAt)}`;
  else if (row.status === "draft") detail = row.approved ? "Approved — goes out when you publish the lesson" : "Draft — not sent yet";
  else detail = `${row.status === "in_progress" ? "Started · " : ""}${row.dueAt ? `due ${when(row.dueAt)}` : "no due date"}`;
  return (
    <Link
      href={href(row)}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-card px-4 py-3 transition-shadow hover:shadow-md"
      style={{ borderColor: "var(--omnic-gray-100)" }}
    >
      <span className="font-semibold">{row.studentName}</span>
      <span className="min-w-0 flex-1 truncate text-sm" style={{ color: "var(--omnic-gray-600)" }}>
        {row.lessonTitle ?? row.title}
      </span>
      <span className={`text-sm ${overdue ? "font-semibold text-red-600 dark:text-red-400" : ""}`} style={overdue ? undefined : { color: "var(--omnic-gray-500)" }}>
        {overdue ? `Overdue · ${detail}` : detail}
      </span>
    </Link>
  );
}

function Section({ title, hint, rows, now, empty }: { title: string; hint?: string; rows: Row[]; now: number; empty?: string }) {
  if (!rows.length && !empty) return null;
  return (
    <section className="mb-6">
      <h2 className="h3 mb-1">{title} <span className="body-sm" style={{ color: "var(--omnic-gray-500)" }}>({rows.length})</span></h2>
      {hint && <p className="body-sm mb-2" style={{ color: "var(--omnic-gray-500)" }}>{hint}</p>}
      {rows.length ? (
        <div className="grid gap-2">{rows.map((row) => <HomeworkRow key={row._id} row={row} now={now} />)}</div>
      ) : (
        <p className="body-sm" style={{ color: "var(--omnic-gray-400)" }}>{empty}</p>
      )}
    </section>
  );
}

export default function TeacherHomeworkPage() {
  const rows = useQuery(api.homework.listForTeacher, {});
  const [student, setStudent] = useState("");
  const [now] = useState(() => Date.now());

  const students = [...new Map((rows ?? []).map((r) => [r.studentId, r.studentName])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const list = (rows ?? []).filter((r) => !student || r.studentId === student);
  const byTime = (key: "submittedAt" | "dueAt" | "reviewedAt" | "createdAt", asc: boolean) => (a: Row, b: Row) => {
    const x = a[key] ?? a.createdAt;
    const y = b[key] ?? b.createdAt;
    return asc ? x.localeCompare(y) : y.localeCompare(x);
  };
  const toReview = list.filter((r) => r.status === "submitted").sort(byTime("submittedAt", true));
  const waiting = list.filter((r) => r.status === "assigned" || r.status === "in_progress").sort(byTime("dueAt", true));
  const drafts = list.filter((r) => r.status === "draft").sort(byTime("createdAt", false));
  const reviewed = list.filter((r) => r.status === "reviewed").sort(byTime("reviewedAt", false)).slice(0, 30);

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1" style={{ margin: 0 }}>Homework</h1>
        {students.length > 1 && (
          <select className="input" style={{ width: "auto" }} aria-label="Student" value={student} onChange={(e) => setStudent(e.target.value)}>
            <option value="">All students</option>
            {students.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
      </div>
      {rows === undefined ? (
        <p className="body-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="body-sm" style={{ color: "var(--omnic-gray-500)" }}>No homework yet. It appears here once you create it on a lesson&apos;s Homework tab.</p>
      ) : (
        <>
          <Section title="To review" hint="Submitted by the student — open to check and give feedback." rows={toReview} now={now} empty="Nothing waiting for review." />
          <Section title="Waiting for students" rows={waiting} now={now} />
          <Section title="Drafts" hint="Not sent yet. Approve it and publish the lesson to send it." rows={drafts} now={now} />
          <Section title="Reviewed" rows={reviewed} now={now} />
        </>
      )}
    </div>
  );
}

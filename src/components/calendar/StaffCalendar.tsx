"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { addDays, format, startOfWeek } from "date-fns";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@convex";
import type { Id } from "@convex/dataModel";
import { userHasPermission } from "../../../convex/lib/permissions";
import { SlotCalendar } from "./SlotCalendar";
import {
  calendarRange,
  calendarToday,
  useCalendarWeekStart,
  useViewerTz,
  useTimeFormat,
  useZonedCalendar,
  useCalendarSnapshot,
  TimezoneSelect,
  TimeFormatToggle,
  type DisplayEvent,
  CalendarSkeleton,
} from "./calendarShared";
import {
  projectCalendarSlots,
  calendarSlotKey,
  type CalendarSlot,
  type ProjectedCalendarSlot,
} from "@/lib/calendarSlots";
import { CalendarAvailabilityEdits, type AvailabilityEdit } from "@/lib/calendarAvailabilityEdits";
import { zonedToInstant, instantToZoned, convertZoned } from "@/lib/tz";
import { sessionStartWindow } from "@/lib/sessionStart";
import { errText } from "@/lib/convexError";
import { formatTime } from "@/lib/timeFormat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function StaffCalendar({
  teacherId,
  admin = false,
  header,
  initialDate,
  initialEventId,
}: {
  teacherId: string;
  admin?: boolean;
  header?: ReactNode;
  initialDate?: Date;
  initialEventId?: string;
}) {
  const availabilityText = useTranslations("components.calendar.availabilityActions");
  const me = useQuery(api.users.getMe);
  const livePolicy = useQuery(api.policyConstants.get, {});
  const rulesHref = me?.role === "teacher" ? "/teacher/policy" : "/admin/settings#policy";
  const [viewerTz, setViewerTz] = useViewerTz(me?.timezone);
  const [clock, setClock] = useTimeFormat(me?.timeFormat);
  const [selectedDate, setDate] = useState<Date | null>(() => initialDate ?? null);
  const date = selectedDate ?? calendarToday(viewerTz);
  const [weekStartPreference, setWeekStartPreference, weekStartsOn] = useCalendarWeekStart(me?.externalId ?? "loading", viewerTz);
  const [mode, setMode] = useState<"day" | "week">("week");
  useEffect(() => {
    if (window.matchMedia("(max-width: 640px)").matches) setMode("day");
  }, []);
  const range = calendarRange(mode, date, weekStartsOn);
  const ownCal = useQuery(
    api.calendar.getTeacherCalendar,
    admin ? "skip" : range,
  );
  const adminCal = useQuery(
    api.calendar.getAdminCalendar,
    admin ? { ...range, teacherId } : "skip",
  );
  const freshCal = admin ? adminCal : ownCal;
  const scope = `${me?.externalId ?? "loading"}:${teacherId}`;
  const cal = useCalendarSnapshot(freshCal, scope);
  const orgTz = cal?.orgTz ?? "Asia/Almaty";
  const [event, setEvent] = useState<DisplayEvent | null>(null);
  const [moving, setMoving] = useState<DisplayEvent | null>(null);
  const [target, setTarget] = useState<ProjectedCalendarSlot | null>(null);
  const [adding, setAdding] = useState(false);
  const [studentId, setStudentId] = useState("");
  // Lesson plan: the weekly times picked for the student, optionally repeated
  // weekly until a date (viewer timezone), minus individual skipped dates.
  const [picks, setPicks] = useState<ProjectedCalendarSlot[]>([]);
  const [repeatUntil, setRepeatUntil] = useState("");
  const [skipped, setSkipped] = useState<string[]>([]);
  const allUsers = useQuery(api.users.listAllUsers, admin ? {} : "skip");
  const roster = useQuery(
    api.users.getStudentsForTeacher,
    admin ? "skip" : { teacherId },
  );
  const students = admin
    ? (allUsers ?? []).filter((u) => u.role === "student")
    : (roster ?? []);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const freshCells = useQuery(api.calendarAvailability.getCells, {
    ...range,
    teacherId,
    nowTick: Math.floor(now / 60000),
    eventId: moving ? (moving._id as Id<"scheduleEvents">) : undefined,
    studentId: adding && studentId ? studentId : undefined,
  });
  const cellData = useCalendarSnapshot(freshCells, scope);
  const refreshing = !freshCal || !freshCells;
  const { events } = useZonedCalendar(cal, viewerTz);
  const openedInitial = useRef<string | null>(null);
  useEffect(() => {
    if (!initialEventId || openedInitial.current === initialEventId) return;
    const found = events.find((row) => row._id === initialEventId);
    if (found) {
      openedInitial.current = initialEventId;
      setEvent(found);
      setTitle(found.title);
    }
  }, [initialEventId, events]);
  const [showCancelled, setShowCancelled] = useState(false);
  const attention = useQuery(api.calendar.needsAttention, admin ? "skip" : {});
  const source = useQuery(api.vacancies.getSourceForTeacher, { teacherId });
  const preview = useQuery(
    api.calendar.actionPreview,
    event ? { eventId: event._id as Id<"scheduleEvents"> } : "skip",
  );
  const movePreview = useQuery(
    api.calendar.previewMove,
    moving && target
      ? {
          eventId: moving._id as Id<"scheduleEvents">,
          toDate: target.date,
          toStartTime: target.startTime,
        }
      : "skip",
  );
  const edit = useMutation(api.calendarAvailability.editCells),
    undo = useMutation(api.calendarAvailability.undo);
  const replaceWeekly = useMutation(api.vacancies.replaceForTeacher);
  const reschedule = useMutation(api.calendar.rescheduleEvent),
    cancel = useMutation(api.calendar.cancelEvent);
  const bookPlan_ = useMutation(api.lessonPlan.bookLessonPlan),
    rename = useMutation(api.calendar.renameEvent),
    start = useMutation(api.lessons.create);
  const timeOff = useMutation(api.calendar.blockTimeOff),
    removeTimeOff = useMutation(api.calendar.unblockTimeOff);
  const [actionSaving, setSaving] = useState(false),
    lock = useRef(false);
  const [undoStack, setUndoStack] = useState<
    Id<"calendarAvailabilityChanges">[]
  >([]);
  const weekFrom = format(startOfWeek(date, { weekStartsOn }), "yyyy-MM-dd");
  const weekUntil = format(addDays(startOfWeek(date, { weekStartsOn }), 6), "yyyy-MM-dd");
  const weeklyCells = useQuery(api.calendarAvailability.getCells, {
    ...calendarRange("week", date, weekStartsOn), teacherId, nowTick: Math.floor(now / 60000),
  });
  const draftStorageKey = `calendar-past-drafts:${scope}`;
  const [draftsLoaded, setDraftsLoaded] = useState<string | null>(null);
  const [pastDrafts, setPastDrafts] = useState<Record<string, boolean>>({});
  const draftPrefix = `${scope}|`;
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(sessionStorage.getItem(draftStorageKey) ?? "{}");
      if (stored && typeof stored === "object" && !Array.isArray(stored))
        setPastDrafts(Object.fromEntries(Object.entries(stored).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean")));
    } catch { /* Storage is optional in private browsing. */ }
    setDraftsLoaded(draftStorageKey);
  }, [draftStorageKey]);
  useEffect(() => {
    if (draftsLoaded !== draftStorageKey) return;
    try { sessionStorage.setItem(draftStorageKey, JSON.stringify(pastDrafts)); }
    catch { /* The in-memory draft remains editable. */ }
  }, [draftStorageKey, draftsLoaded, pastDrafts]);
  const ownDrafts = Object.entries(pastDrafts).filter(([key]) => key.startsWith(draftPrefix));
  const [lastGesture, setLastGesture] = useState<CalendarSlot[]>([]);
  const [pendingEdits, setPendingEdits] = useState<readonly AvailabilityEdit[]>([]);
  const [availabilityEdits] = useState(() => new CalendarAvailabilityEdits({
    save: ({ requestId, changes }) => edit({ teacherId, requestId, changes }),
    changed: setPendingEdits,
    saved: (id, gesture) => {
      setUndoStack((previous) => [...previous, id]);
      setLastGesture(gesture.cells);
    },
    failed: (error) => toast.error(errText(error)),
  }));
  useEffect(() => {
    availabilityEdits.resume();
    return () => availabilityEdits.pause();
  }, [availabilityEdits]);
  useEffect(() => {
    if (lastGesture.some((cell) => cell.open && cell.withinBookingNotice)) {
      toast.info(availabilityText("nearTermOpened", { hours: livePolicy?.bookingMinNoticeHours ?? 12 }));
    }
  }, [lastGesture, availabilityText, livePolicy?.bookingMinNoticeHours]);
  useEffect(() => {
    if (freshCells) availabilityEdits.observe(freshCells.cells);
  }, [freshCells, availabilityEdits]);
  const saving = actionSaving || pendingEdits.some(edit => !edit.acknowledged);
  const sourceCells = projectCalendarSlots(weeklyCells?.cells ?? [], orgTz, viewerTz)
    .filter(cell => !cell.continuation && cell.viewerDate >= weekFrom && cell.viewerDate <= weekUntil);
  const weeklyStart = sourceCells.map(cell => cell.date).sort()[0];
  const effectiveFrom = source?.academyDate && weeklyStart
    ? (weeklyStart > source.academyDate ? weeklyStart : source.academyDate) : "";
  const weekDraftKeys = new Set(sourceCells.map(cell => `${draftPrefix}${cell.key}`));
  const weeklyOpenCount = sourceCells.filter(cell => {
    const state = JSON.parse(weeklyCells!.cells.find(row => calendarSlotKey(row) === cell.key)!.expectedState) as { override: { value: boolean | null }; inherited: string[] };
    return pastDrafts[`${draftPrefix}${cell.key}`] ?? state.override.value ?? state.inherited.length > 0;
  }).length;
  const projectedCells = useMemo(
    () => projectCalendarSlots(cellData?.cells ?? [], orgTz, viewerTz),
    [cellData, orgTz, viewerTz],
  );
  const cells = useMemo(() => {
    const optimistic = new Map(pendingEdits.flatMap((gesture) =>
      gesture.cells.map((cell) => [calendarSlotKey(cell), cell.open] as const),
    ));
    return projectedCells.map((cell) => {
      const open = optimistic.get(cell.key);
      const draftOpen = pastDrafts[`${draftPrefix}${cell.key}`];
      const past = cell.startMs <= now;
      return { ...cell, open: draftOpen ?? open ?? cell.open,
        editable: past ? canEditPast(cell) : cell.editable };
    });
  }, [projectedCells, pendingEdits, pastDrafts, draftPrefix, now]);
  const [tools, setTools] = useState(false),
    [off, setOff] = useState(false),
    [repeat, setRepeat] = useState(false);
  const [from, setFrom] = useState(""),
    [until, setUntil] = useState("");
  const bookedOff = useQuery(
    api.calendar.bookedInRange,
    off && from && until ? { fromDate: from, toDate: until, teacherId } : "skip",
  );
  const [title, setTitle] = useState("");
  // null → idle; "choose" → picking who the cancellation is for; else picked.
  const [cancelChoice, setCancelChoice] = useState<null | "choose" | "teacher" | "student" | "academy">(null);
  const canEdit =
    !!me &&
    userHasPermission(me, admin ? "scheduling.edit" : "calendar.edit.full");
  const canAssign = !!me && userHasPermission(me, "calendar.edit.full");
  async function run(action: () => Promise<unknown>, message?: string) {
    if (lock.current || availabilityEdits.busy) return;
    lock.current = true;
    setSaving(true);
    try {
      await action();
      if (message) toast.success(message);
    } catch (error) {
      toast.error(errText(error));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  function paint(painted: CalendarSlot[], open: boolean | null) {
    if (!cellData || lock.current) return;
    const past = painted.filter(cell => zonedToInstant(cell.date, cell.startTime, orgTz).getTime() <= Date.now());
    if (past.length && open !== null) setPastDrafts(previous => ({ ...previous,
      ...Object.fromEntries(past.filter(canEditPast).map(cell => [`${draftPrefix}${calendarSlotKey(cell)}`, open])),
    }));
    const source = new Map(cellData.cells.map(cell => [calendarSlotKey(cell), cell]));
    const future = painted.filter(cell => !past.includes(cell)).flatMap(cell => {
      const current = source.get(calendarSlotKey(cell));
      const expectedState = cell.expectedState ?? current?.expectedState;
      return expectedState ? [{ ...cell, expectedState }] : [];
    });
    availabilityEdits.enqueue(
      future,
      open,
      crypto.randomUUID(),
    );
  }
  function selectCell(cell: ProjectedCalendarSlot) {
    if (refreshing) return;
    if (adding && studentId) {
      if (!cell.canMove) return;
      const key = `${cell.date}|${cell.startTime}`;
      setPicks((current) =>
        current.some((pick) => `${pick.date}|${pick.startTime}` === key)
          ? current.filter((pick) => `${pick.date}|${pick.startTime}` !== key)
          : [...current, cell],
      );
      setSkipped([]);
      planRequest.current = "";
      return;
    }
    if (moving) {
      if (cell.canMove) setTarget(cell);
      return;
    }
    if (cell.editable) void paint([cell], !cell.open);
  }
  const planRequest = useRef("");
  const planBookings = useMemo(() => {
    const out = new Map<string, { date: string; startTime: string }>();
    for (const pick of picks) {
      if (!repeatUntil) {
        out.set(`${pick.date}|${pick.startTime}`, { date: pick.date, startTime: pick.startTime });
        continue;
      }
      // Step in the viewer's own calendar so DST never drifts the usual time.
      for (
        let day = pick.viewerDate;
        day <= repeatUntil && out.size < 60;
        day = new Date(Date.parse(`${day}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10)
      ) {
        const academy = convertZoned(day, pick.viewerStartTime, viewerTz, orgTz);
        out.set(`${academy.date}|${academy.time}`, { date: academy.date, startTime: academy.time });
      }
    }
    return [...out.entries()]
      .filter(([key]) => !skipped.includes(key))
      .map(([, booking]) => booking)
      .sort((x, y) => `${x.date}${x.startTime}`.localeCompare(`${y.date}${y.startTime}`));
  }, [picks, repeatUntil, skipped, viewerTz, orgTz]);
  const planPreview = useQuery(
    api.lessonPlan.previewLessonPlan,
    adding && studentId && planBookings.length
      ? { studentId, teacherId: admin ? teacherId : undefined, bookings: planBookings }
      : "skip",
  );
  const planOk = planPreview?.items.filter((item) => item.ok) ?? [];
  function resetPlan() {
    setPicks([]);
    setRepeatUntil("");
    setSkipped([]);
    planRequest.current = "";
  }
  function lessonLabel(date: string, startTime: string) {
    const local = convertZoned(date, startTime, orgTz, viewerTz);
    const day = new Date(`${local.date}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    return `${day} · ${formatTime(local.time, clock)}`;
  }
  async function bookPlan() {
    if (!planOk.length || !studentId) return;
    planRequest.current ||= crypto.randomUUID();
    await run(async () => {
      const result = await bookPlan_({
        studentId,
        teacherId: admin ? teacherId : undefined,
        bookings: planOk.map(({ date, startTime }) => ({ date, startTime })),
        requestId: planRequest.current,
      });
      setAdding(false);
      setStudentId("");
      resetPlan();
      toast.success(
        `Booked ${result.booked} lesson${result.booked === 1 ? "" : "s"}` +
          (result.unpaid ? ` · ${result.unpaid} need payment follow-up` : ""),
      );
    });
  }
  const offGroups = new Map<string, { from: string; until: string }>();
  for (const row of source?.exceptions ?? []) {
    if (!row.timeOffGroupId) continue;
    const existing = offGroups.get(row.timeOffGroupId);
    offGroups.set(row.timeOffGroupId, {
      from: existing && existing.from < row.date ? existing.from : row.date,
      until: existing && existing.until > row.date ? existing.until : row.date,
    });
  }
  const activeLessonId = event
    ? cal?.events.find((e) => e._id === event._id)?.activeLessonId
    : null;
  const startReady =
    event &&
    sessionStartWindow({
      nowMs: now,
      startMs: zonedToInstant(
        event.orgDate,
        event.orgStartTime,
        orgTz,
      ).getTime(),
      lessonMinutes: 60,
    }).kind === "ready";
  if (!cal || !cellData) return <CalendarSkeleton />;
  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>{header ?? <h1 className="h1">Calendar</h1>}</div>
        <div className="flex flex-wrap gap-2">
          {pendingEdits.length > 0 && (
            <span role="status" className="self-center text-xs text-muted-foreground">Saving…</span>
          )}
          {undoStack.length > 0 && (
            <Button
              variant="outline"
              disabled={saving}
              onClick={() =>
                void run(async () => {
                  await undo({ changeId: undoStack.at(-1)! });
                  setUndoStack((stack) => stack.slice(0, -1));
                  setLastGesture([]);
                }, "Change undone")
              }
            >
              Undo
            </Button>
          )}
          {canAssign && (
            <Button
              disabled={saving}
              onClick={() => {
                setAdding(true);
                setMoving(null);
                setTarget(null);
                resetPlan();
              }}
            >
              Book lessons
            </Button>
          )}
          <Button variant="outline" onClick={() => setTools((value) => !value)}>
            More
          </Button>
        </div>
      </div>
      {tools && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-background p-3">
          <TimezoneSelect value={viewerTz} onChange={setViewerTz} />
          <TimeFormatToggle value={clock} onChange={setClock} />
          <label className="text-sm">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
            />{" "}
            Show cancelled
          </label>
          {canEdit && (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setFrom(instantToZoned(new Date(), orgTz).date);
                  setUntil(instantToZoned(new Date(), orgTz).date);
                  setOff(true);
                }}
              >
                Time off
              </Button>
            </>
          )}
          {!admin && (
            <Link className="text-sm underline" href="/teacher/profile">
              Meeting room
            </Link>
          )}
          {canEdit && (
            <div className="w-full space-y-2 border-t pt-3">
              <Button variant="outline" className="h-auto min-h-9 max-w-full whitespace-normal text-start" disabled={saving || refreshing || !weeklyCells || !source}
                onClick={() => setRepeat(true)}>
                {availabilityText("useWeek")}
              </Button>
              <p className="text-xs text-muted-foreground">{availabilityText("useWeekHelp")}</p>
            </div>
          )}
        </div>
      )}
      {(moving || adding) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <strong>{moving ? "Choose the new time" : "Book lessons"}</strong>
          {adding && (
            <select
              aria-label="Student"
              className="rounded-md border bg-background p-2 max-w-full"
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value);
                setTarget(null);
                resetPlan();
              }}
            >
              <option value="">Choose student</option>
              {students.map((s) => (
                <option key={s.externalId} value={s.externalId}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <span className="text-sm">
            {adding && !studentId
              ? "Choose a student first."
              : adding
                ? "Tap each weekly lesson time (e.g. Mon 18:00 and Wed 18:00), then repeat it below."
                : "Select two free half-hour cells. Published availability is optional."}
          </span>
          <Button
            variant="ghost"
            onClick={() => {
              setMoving(null);
              setAdding(false);
              setTarget(null);
              resetPlan();
            }}
          >
            Exit
          </Button>
        </div>
      )}
      {adding && studentId && picks.length > 0 && (
        <div className="space-y-3 rounded-xl border bg-background p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Weekly times:</span>
            {[...picks]
              .sort((x, y) => `${x.viewerDate}${x.viewerStartTime}`.localeCompare(`${y.viewerDate}${y.viewerStartTime}`))
              .map((pick) => (
                <button
                  key={`${pick.date}|${pick.startTime}`}
                  type="button"
                  className="rounded-full border px-2 py-0.5 text-sm"
                  onClick={() => {
                    setPicks((current) => current.filter((c) => c !== pick));
                    setSkipped([]);
                    planRequest.current = "";
                  }}
                  aria-label={`Remove ${lessonLabel(pick.date, pick.startTime)}`}
                >
                  {lessonLabel(pick.date, pick.startTime)} ×
                </button>
              ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!repeatUntil}
                onChange={(e) => {
                  const first = [...picks].sort((x, y) => x.viewerDate.localeCompare(y.viewerDate))[0];
                  setRepeatUntil(
                    e.target.checked
                      ? new Date(Date.parse(`${first.viewerDate}T00:00:00Z`) + 27 * 86400000).toISOString().slice(0, 10)
                      : "",
                  );
                  setSkipped([]);
                  planRequest.current = "";
                }}
              />
              Repeat every week
            </label>
            {repeatUntil && (
              <label className="flex items-center gap-2 text-sm">
                until
                <Input
                  type="date"
                  className="w-auto"
                  value={repeatUntil}
                  min={[...picks].sort((x, y) => x.viewerDate.localeCompare(y.viewerDate))[0]?.viewerDate}
                  onChange={(e) => {
                    setRepeatUntil(e.target.value);
                    setSkipped([]);
                    planRequest.current = "";
                  }}
                />
              </label>
            )}
          </div>
          {planPreview === undefined ? (
            <p className="text-sm text-muted-foreground">Checking the plan…</p>
          ) : (
            <>
              <p className="text-sm">
                <strong>{planOk.length}</strong> lesson{planOk.length === 1 ? "" : "s"} ·{" "}
                {planOk.filter((item) => item.paid).length} paid from balance ({planPreview.balance} available)
                {planOk.some((item) => !item.paid) && (
                  <span className="text-amber-700 dark:text-amber-300">
                    {" "}· {planOk.filter((item) => !item.paid).length} need payment follow-up
                  </span>
                )}
              </p>
              <ul className="max-h-56 space-y-1 overflow-auto text-sm">
                {planPreview.items.map((item) => (
                  <li key={`${item.date}|${item.startTime}`} className="flex flex-wrap items-center gap-2">
                    <span className={item.ok ? "" : "text-muted-foreground line-through"}>
                      {lessonLabel(item.date, item.startTime)}
                    </span>
                    {!item.ok && <span className="text-destructive">{item.reason}</span>}
                    {item.ok && !item.paid && <span className="text-xs text-amber-700 dark:text-amber-300">unpaid</span>}
                    {item.ok && (
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() => {
                          setSkipped((values) => [...values, `${item.date}|${item.startTime}`]);
                          planRequest.current = "";
                        }}
                      >
                        Skip
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {planPreview.items.some((item) => !item.ok) && (
                <p className="text-xs text-muted-foreground">Crossed-out times don&apos;t fit and won&apos;t be booked.</p>
              )}
              <Button disabled={saving || planOk.length === 0} onClick={() => void bookPlan()}>
                {saving ? "Booking…" : `Book ${planOk.length} lesson${planOk.length === 1 ? "" : "s"}`}
              </Button>
            </>
          )}
        </div>
      )}
      {!admin &&
        !!(
          (attention?.unreviewedHomework.length ?? 0) +
          (attention?.unpublishedNotes.length ?? 0)
        ) && (
          <details className="rounded-xl border bg-background p-3">
            <summary className="text-sm cursor-pointer">Work to review</summary>
            {attention?.unreviewedHomework.map((row) => (
              <Link
                key={row._id}
                href={
                  row.lessonId
                    ? `/teacher/sessions/${row.lessonId}`
                    : "/teacher/students"
                }
                className="block py-1 text-sm underline"
              >
                {row.studentName} · Homework awaiting review
              </Link>
            ))}
            {attention?.unpublishedNotes.map((row) => (
              <Link
                key={row._id}
                href={`/teacher/sessions/${row._id}`}
                className="block py-1 text-sm underline"
              >
                {row.title} · Lesson notes to publish
              </Link>
            ))}
          </details>
        )}
      {!!ownDrafts.length && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-background p-3">
          <p className="flex-1 text-sm">{availabilityText("pastDraft", { count: ownDrafts.length })}</p>
          <Button variant="ghost" className="h-auto min-h-9 max-w-full whitespace-normal" onClick={() => setPastDrafts(previous => Object.fromEntries(
            Object.entries(previous).filter(([key]) => !key.startsWith(draftPrefix)),
          ))}>{availabilityText("discardDraft")}</Button>
        </div>
      )}
      <SlotCalendar
        cells={cells}
        events={events.filter((e) => showCancelled || e.status !== "cancelled")}
        users={students}
        currentDate={date}
        mode={mode}
        weekStartsOn={weekStartsOn}
        weekStartPreference={weekStartPreference}
        onWeekStartChange={setWeekStartPreference}
        viewerTz={viewerTz}
        timeFormat={clock}
        preferenceKey={`${admin ? "admin" : "teacher"}:${me?.externalId}:${teacherId}`}
        onPrevWeek={() =>
          setDate(addDays(date, mode === "day" ? -1 : -7))
        }
        onNextWeek={() =>
          setDate(addDays(date, mode === "day" ? 1 : 7))
        }
        onToday={() => setDate(null)}
        onJumpToDate={setDate}
        headerExtra={
          <div className="flex gap-1">
            {(["day", "week"] as const).map((view) => (
              <Button
                key={view}
                size="sm"
                variant={mode === view ? "default" : "outline"}
                onClick={() => setMode(view)}
              >
                {view === "day" ? "Day" : "Week"}
              </Button>
            ))}
          </div>
        }
        allowPastPaint={canEdit && !moving && !adding}
        staffPaint={canEdit && !moving && !adding}
        onPaint={(slots, open) => void paint(slots, open)}
        onCellClick={selectCell}
        onEventClick={(ev) => {
          setEvent(ev);
          setTitle(ev.title);
          setCancelChoice(null);
        }}
        canDragEvent={(ev) => {
          const row = cal.events.find((e) => e._id === ev._id);
          return (
            !saving &&
            !row?.teacherStartedAt &&
            !row?.endedAt &&
            !row?.completedAt &&
            !row?.activeLessonId &&
            zonedToInstant(ev.orgDate, ev.orgStartTime, orgTz).getTime() > now
          );
        }}
        onEventDrop={
          canAssign
            ? (ev, cell) => {
                setMoving(ev);
                setTarget(cell);
                setAdding(false);
              }
            : undefined
        }
        moveMode={!!moving || (adding && !!studentId)}
        proposed={moving ? (target ?? undefined) : undefined}
        selected={adding ? picks.map(({ date, startTime }) => ({ date, startTime })) : []}
        disabled={actionSaving || refreshing || ((adding || !!moving) && saving) || (adding && !studentId)}
      />
      <Dialog open={!!event} onOpenChange={(value) => !value && setEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{event?.studentName ?? event?.title}</DialogTitle>
          </DialogHeader>
          {event && (
            <>
              <p>
                {event.date} · {formatTime(event.startTime, clock)}–
                {formatTime(event.endTime, clock)}
              </p>
              {event.googleMeetLink && (
                <a
                  href={["scheduled", "makeup"].includes(event.status) ? `/join/${event._id}` : event.googleMeetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Meeting room
                </a>
              )}
              {!admin &&
                (event.status === "scheduled" || event.status === "makeup") && (
                  <Button
                    disabled={saving || (!activeLessonId && !startReady)}
                    onClick={() =>
                      void run(async () => {
                        if (activeLessonId) {
                          window.location.href = `/teacher/sessions/${activeLessonId}/live`;
                          return;
                        }
                        if (!event.studentId) return;
                        const id = await start({
                          studentId: event.studentId,
                          title: event.title,
                          scheduledFor: zonedToInstant(
                            event.orgDate,
                            event.orgStartTime,
                            orgTz,
                          ).toISOString(),
                          recordingMode: "live",
                          scheduleEventId: event._id as Id<"scheduleEvents">,
                        });
                        window.location.href = `/teacher/sessions/${id}/live`;
                      })
                    }
                  >
                    {activeLessonId
                      ? "Resume lesson"
                      : startReady
                        ? "Start lesson"
                        : "Start opens 10 minutes before"}
                  </Button>
                )}
              {canAssign && (
                <div className="flex gap-2">
                  <Input
                    aria-label="Lesson title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    disabled={saving || !title.trim()}
                    onClick={() =>
                      void run(async () => {
                        await rename({
                          eventId: event._id as Id<"scheduleEvents">,
                          title,
                        });
                        setEvent(null);
                      }, "Lesson renamed")
                    }
                  >
                    Rename
                  </Button>
                </div>
              )}
              {preview && (
                <>
                  {cancelChoice === null && (
                    <p className="text-sm text-muted-foreground">
                      {preview.reschedule.reason}{" "}
                      <Link href={rulesHref} className="underline underline-offset-2">Rules</Link>
                    </p>
                  )}
                  {cancelChoice === null ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={!preview.reschedule.allowed || saving}
                        onClick={() => {
                          setMoving(event);
                          setEvent(null);
                          setAdding(false);
                          setTarget(null);
                        }}
                      >
                        Move lesson
                      </Button>
                      <Button
                        variant="outline"
                        disabled={(!preview.cancel.allowed && !preview.cancelForStudent?.allowed) || saving}
                        onClick={() => setCancelChoice("choose")}
                      >
                        Cancel lesson
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Why is this lesson cancelled?{" "}
                        <Link href={rulesHref} className="text-xs font-normal underline underline-offset-2">Rules</Link>
                      </p>
                      {(admin
                        ? ([
                            ["student", "Student asked to cancel", preview.cancelForStudent],
                            ["teacher", "Teacher can't make it", preview.cancel],
                            ["academy", "Academy decision", preview.cancel],
                          ] as const)
                        : ([
                            ["teacher", "I can't teach it", preview.cancel],
                            ["student", "Student asked to cancel", preview.cancelForStudent],
                          ] as const)
                      ).map(([value, label, verdict]) => (
                        <button
                          key={value}
                          type="button"
                          disabled={!verdict?.allowed || saving}
                          onClick={() => setCancelChoice(value)}
                          className="w-full rounded-md border px-3 py-2 text-start disabled:opacity-50"
                          style={{
                            borderColor: cancelChoice === value ? "var(--brand-purple, #6716A4)" : undefined,
                            background: cancelChoice === value ? "rgba(103,22,164,0.06)" : undefined,
                          }}
                        >
                          <span className="block text-sm font-medium">{label}</span>
                          <span className="block text-xs text-muted-foreground">
                            {value === "teacher" && verdict?.allowed
                              ? admin
                                ? "Lesson credited back; counts as the teacher's cancellation. The student is told the teacher can't make it."
                                : `${verdict.reason}. The student is told you can't make it.`
                              : value === "student" && verdict?.allowed
                                ? `${verdict.reason}. The student is told it was cancelled at their request.`
                                : value === "academy" && verdict?.allowed
                                  ? "Lesson credited back. Nobody's cancellation record changes."
                                  : verdict?.reason}
                          </span>
                        </button>
                      ))}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="destructive"
                          disabled={cancelChoice === "choose" || saving}
                          onClick={() =>
                            cancelChoice !== "choose" &&
                            void run(async () => {
                              await cancel({
                                eventId: event._id as Id<"scheduleEvents">,
                                cancelFor: cancelChoice ?? undefined,
                              });
                              setEvent(null);
                              setCancelChoice(null);
                            }, "Lesson cancelled — the student has been told")
                          }
                        >
                          Confirm cancellation
                        </Button>
                        <Button variant="outline" disabled={saving} onClick={() => setCancelChoice(null)}>
                          Back
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!target}
        onOpenChange={(value) => !value && setTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Move lesson
            </DialogTitle>
          </DialogHeader>
          {target && (
            <>
              <p>
                {target.viewerDate} ·{" "}
                {formatTime(target.viewerStartTime, clock)} · 60-minute
                reservation
              </p>
              {moving && (
                <p className="text-sm">
                  {movePreview?.reason ?? "Checking this time…"}
                </p>
              )}
              <Button
                disabled={saving || (!!moving && !movePreview?.allowed)}
                onClick={() =>
                  moving &&
                  void run(async () => {
                    await reschedule({
                      eventId: moving._id as Id<"scheduleEvents">,
                      toDate: target.date,
                      toStartTime: target.startTime,
                    });
                    setMoving(null);
                    setTarget(null);
                  }, "Lesson moved")
                }
              >
                {saving ? "Saving…" : "Confirm"}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={off} onOpenChange={setOff}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Time off</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Removing time off later restores your custom slots.
          </p>
          <label>
            From
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Through
            <Input
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </label>
          {bookedOff && bookedOff.length > 0 && (
            <div className="space-y-1 rounded-md border p-3 text-sm">
              <p className="font-medium">
                {bookedOff.length} lesson{bookedOff.length === 1 ? " is" : "s are"} booked in these dates
              </p>
              <ul className="space-y-0.5">
                {bookedOff.map((row) => (
                  <li key={row._id} className={row.canCancel ? "" : "text-destructive"}>
                    {row.date} · {formatTime(row.startTime, clock)} · {row.studentName}
                    {!row.canCancel && row.reason ? ` — ${row.reason}` : ""}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground">
                {bookedOff.every((row) => row.canCancel)
                  ? "They'll be cancelled as yours: each student gets their lessons back and one message saying you can't make it."
                  : "Move the lessons marked in red first, or ask the academy to cancel them."}
              </p>
            </div>
          )}
          <Button
            disabled={
              saving ||
              !from ||
              !until ||
              bookedOff === undefined ||
              (bookedOff.length > 0 && !bookedOff.every((row) => row.canCancel))
            }
            onClick={() =>
              void run(async () => {
                const result = await timeOff({
                  teacherId,
                  fromDate: from,
                  toDate: until,
                  cancelBookedLessons: (bookedOff?.length ?? 0) > 0,
                });
                setOff(false);
                if (result.affectedLessons > 0)
                  toast.success(
                    `${result.affectedLessons} lesson${result.affectedLessons === 1 ? "" : "s"} cancelled — students have been told`,
                  );
              }, "Time off saved")
            }
          >
            {bookedOff && bookedOff.length > 0
              ? `Cancel ${bookedOff.length} lesson${bookedOff.length === 1 ? "" : "s"} and block these dates`
              : "Block these dates"}
          </Button>
          {[...offGroups.entries()].map(([id, group]) => (
            <div
              key={id}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span>
                {group.from}–{group.until}
              </span>
              <Button
                variant="outline"
                disabled={saving}
                onClick={() =>
                  void run(
                    () =>
                      removeTimeOff({
                        groupId: id,
                        teacherId,
                        fromDate: group.from,
                        toDate: group.until,
                      }),
                    "Time off removed",
                  )
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </DialogContent>
      </Dialog>
      <Dialog open={repeat} onOpenChange={setRepeat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{availabilityText("useWeek")}</DialogTitle>
            <DialogDescription>{availabilityText("useWeekDescription", {
              from: weekFrom, until: weekUntil, effective: effectiveFrom, timezone: viewerTz,
            })}</DialogDescription>
          </DialogHeader>
          <p className="text-sm">{availabilityText("weeklyScope")}</p>
          <p className="text-sm text-muted-foreground">{availabilityText("academyTime", { timezone: orgTz })}</p>
          <p className="text-sm">{availabilityText("weeklyHours", { hours: weeklyOpenCount / 2 })}</p>
          {weeklyOpenCount === 0 && <p className="text-sm font-medium">{availabilityText("emptyWeek")}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setRepeat(false)}>{availabilityText("cancelWeekly")}</Button>
            <Button disabled={saving || !source || !weeklyCells || !sourceCells.length || !effectiveFrom}
              onClick={() => void run(async () => {
                if (!source || !weeklyCells) return;
                const byKey = new Map(weeklyCells.cells.map(cell => [calendarSlotKey(cell), cell]));
                await replaceWeekly({ teacherId, slots: [], effectiveFrom,
                  expectedSourceState: source.sourceState,
                  sourceWeek: { fromDate: weekFrom, timezone: viewerTz, cells: sourceCells.map(cell => ({
                    date: cell.date, startTime: cell.startTime,
                    expectedState: byKey.get(cell.key)!.expectedState,
                    draftOpen: pastDrafts[`${draftPrefix}${cell.key}`],
                  })) },
                });
                setPastDrafts(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => !weekDraftKeys.has(key))));
                setRepeat(false);
                setUndoStack([]);
              }, availabilityText("weeklyUpdated"))}>
              {availabilityText("confirmWeekly")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function canEditPast(cell: CalendarSlot) {
  return !cell.busy && !cell.eventId && !cell.timeOff;
}

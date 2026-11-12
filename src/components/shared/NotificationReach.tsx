import { Bell, Circle, Send } from "lucide-react";

/** Staff-only: how (and whether) a member can be reached outside the app. */
export function NotificationReach({ app, telegram }: { app: boolean; telegram: boolean }) {
  if (!app && !telegram) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
        <Circle size={13} aria-hidden="true" /> None
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap gap-1">
      {app && (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
          <Bell size={13} aria-hidden="true" /> App
        </span>
      )}
      {telegram && (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
          <Send size={13} aria-hidden="true" /> Telegram
        </span>
      )}
    </span>
  );
}

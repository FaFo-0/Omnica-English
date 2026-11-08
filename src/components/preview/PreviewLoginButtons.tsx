"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";

type Option = { key: string; label: string };

/** One-tap test sign-in. Rendered only when the server says preview login is enabled. */
export function PreviewLoginButtons({ options, compact = false }: { options: Option[]; compact?: boolean }) {
  const { signOut, user } = useClerk();
  const [busy, setBusy] = useState<string | null>(null);

  async function go(key: string) {
    setBusy(key);
    const target = `/api/preview-login?as=${encodeURIComponent(key)}`;
    if (user) await signOut({ redirectUrl: target });
    else window.location.assign(target);
  }

  return (
    <div className={compact ? "flex flex-col gap-1.5" : "w-full max-w-sm rounded-xl border border-dashed border-amber-500/60 bg-amber-50 p-3 dark:bg-amber-950/30"}>
      {!compact && <p className="mb-2 text-center text-xs font-semibold text-amber-800 dark:text-amber-200">Test site — sign in as</p>}
      <div className={compact ? "flex flex-col gap-1.5" : "grid grid-cols-2 gap-2"}>
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            disabled={busy !== null}
            onClick={() => go(o.key)}
            className="rounded-lg bg-amber-500 px-3 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {busy === o.key ? "…" : o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

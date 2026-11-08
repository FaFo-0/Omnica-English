"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { PreviewLoginButtons } from "./PreviewLoginButtons";

type Option = { key: string; label: string };

/** Floating "Test as…" chip on preview sites: switch role from any page. */
export function PreviewSwitcher({ options }: { options: Option[] }) {
  const { user } = useUser();
  // Remount per signed-in user so the panel closes once a switch lands.
  return <Switcher key={user?.id ?? "anon"} options={options} />;
}

function Switcher({ options }: { options: Option[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-20 end-3 z-[100] flex flex-col items-end gap-2 md:bottom-4">
      {open && (
        <div className="rounded-xl border border-amber-500/60 bg-background p-2 shadow-xl">
          <PreviewLoginButtons options={options} compact />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-lg"
      >
        {open ? "Close" : "Test as…"}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { toast } from "sonner";
import { Languages, Loader2, Undo2 } from "lucide-react";
import { api } from "@convex";
import type { Id } from "@convex/dataModel";
import { Button } from "@/components/ui/button";
import { errText } from "@/lib/convexError";

/**
 * Speech recognition writes English said inside Arabic/Russian speech in those
 * letters. One tap rewrites it into English letters; Undo restores the original.
 */
export function FixEnglishBar({ lessonId, fixed }: { lessonId: Id<"lessons">; fixed: boolean }) {
  const fix = useAction(api.transcriptEnglish.fix);
  const undo = useMutation(api.transcriptEnglish.undo);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const result = await fix({ lessonId });
      toast.success(
        result.checked === 0
          ? "Nothing to fix — no lines in Arabic or Russian letters"
          : `Fixed ${result.changed} of ${result.checked} lines. Re-run Vocabulary and Mistakes to use the English.`,
      );
    } catch (error) {
      toast.error(errText(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3" style={{ borderColor: "var(--omnic-gray-100)" }}>
      <p className="me-auto text-sm" style={{ color: "var(--omnic-gray-600)" }}>
        English written in Arabic letters (like &ldquo;آي أم سيريان&rdquo;)? Fix it so vocabulary and mistakes can read it.
      </p>
      <Button size="sm" onClick={() => void run()} disabled={busy} className="gap-1.5">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Languages size={13} />}
        {busy ? "Fixing… (about a minute)" : fixed ? "Fix again" : "Fix English"}
      </Button>
      {fixed && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={busy}
          onClick={() => void undo({ lessonId }).then(() => toast.success("Original transcript restored")).catch((e) => toast.error(errText(e)))}
        >
          <Undo2 size={13} /> Undo
        </Button>
      )}
    </div>
  );
}

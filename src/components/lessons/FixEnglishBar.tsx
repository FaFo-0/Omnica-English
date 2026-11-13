"use client";

import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
import { api } from "@convex";
import type { Id } from "@convex/dataModel";
import { errText } from "@/lib/convexError";

/**
 * Shown only on lessons the automatic Arabic fix changed (Arabic-speaking
 * students): English Soniox wrote in Arabic letters was rewritten after the
 * lesson ended. Undo restores the transcript exactly as transcribed.
 */
export function FixEnglishBar({ lessonId }: { lessonId: Id<"lessons"> }) {
  const undo = useMutation(api.transcriptEnglish.undo);
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--omnic-gray-500)" }}>
      English written in Arabic letters was rewritten in English automatically.
      <button
        type="button"
        className="inline-flex items-center gap-1 underline"
        onClick={() => void undo({ lessonId }).then(() => toast.success("Original transcript restored")).catch((e) => toast.error(errText(e)))}
      >
        <Undo2 size={12} /> Undo
      </button>
    </p>
  );
}

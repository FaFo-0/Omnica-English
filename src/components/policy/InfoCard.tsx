// The card used by the rules and the teacher guide: icon tile, title, bullets.

import type { ComponentType, ReactNode } from "react";

export type InfoTone = "good" | "warn" | "accent" | "plain";

export function InfoCard({
  icon: Icon,
  title,
  lines,
  tone = "accent",
  children,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  title: ReactNode;
  lines?: ReactNode[];
  tone?: InfoTone;
  children?: ReactNode;
}) {
  const tint =
    tone === "good" ? "bg-emerald-50 text-emerald-700"
    : tone === "warn" ? "bg-amber-50 text-amber-700"
    : tone === "plain" ? "bg-[#26143f]/5 text-[#26143f]"
    : "bg-[color-mix(in_srgb,var(--policy-accent)_12%,white)] text-[var(--policy-accent)]";
  return (
    <article className="rounded-2xl border border-[#26143f]/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tint}`}>
          <Icon size={20} strokeWidth={2.2} />
        </span>
        <h3 className="text-lg font-extrabold text-[#26143f]">{title}</h3>
      </div>
      {lines && lines.length > 0 && (
        <ul className="mt-3 space-y-1.5 ps-1 text-[15px] leading-relaxed text-[#4a4155]">
          {lines.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#26143f]/30" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
      {children}
    </article>
  );
}

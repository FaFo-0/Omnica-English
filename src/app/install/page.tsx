import type { Metadata } from "next";
import { Suspense } from "react";
import { InstallPageClient } from "./install-client";

export const metadata: Metadata = {
  title: "Install Omnica English",
  description: "Put Omnica English on your phone's Home Screen and get a reminder before every lesson.",
};

/** Shareable link (omnicaenglish.com/install) — teachers drop it in a chat. */
export default function InstallPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <InstallPageClient />
    </Suspense>
  );
}

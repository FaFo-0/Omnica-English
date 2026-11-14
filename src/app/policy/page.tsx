import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicPolicyPage } from "./policy-client";
import { POLICY_CHROME, type PolicyLocale } from "@/components/policy/policyCopy";

type Params = Promise<{ lang?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: Params }): Promise<Metadata> {
  const lang = (await searchParams).lang;
  const locale: PolicyLocale = lang === "en" || lang === "kk" || lang === "ar" ? lang : "ru";
  const c = POLICY_CHROME[locale];
  return {
    title: `${c.title} — Omnica English`,
    description: c.intro,
    openGraph: { title: `${c.title} — Omnica English`, description: c.intro },
  };
}

export default function PolicyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf7ef]" />}>
      <PublicPolicyPage />
    </Suspense>
  );
}

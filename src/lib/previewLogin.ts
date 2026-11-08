
// One-tap sign-in for preview/dev sites so FaFo can test as any role without
// typing. Three independent locks keep it off production:
//   1. Vercel production builds never qualify (VERCEL_ENV === "production").
//   2. Only a Clerk *development* key (sk_test_) can mint the tickets.
//   3. The frontend must point at the dev Convex deployment.
const DEV_CONVEX_URL = "https://quixotic-quail-572.convex.cloud";

export const PREVIEW_PERSONAS = [
  { key: "admin", label: "Admin", email: "qa-admin+omnica@example.com" },
  { key: "teacher", label: "Teacher", email: "qa-teacher+omnica@example.com" },
  { key: "student", label: "Student RU", email: "qa-student-ru+omnica@example.com" },
  { key: "student-kk", label: "Student KK", email: "qa-student-kk+omnica@example.com" },
] as const;

export type PreviewPersona = (typeof PREVIEW_PERSONAS)[number];

export function previewLoginEnabled(): boolean {
  return (
    process.env.VERCEL_ENV !== "production" &&
    (process.env.CLERK_SECRET_KEY ?? "").startsWith("sk_test_") &&
    process.env.NEXT_PUBLIC_CONVEX_URL === DEV_CONVEX_URL
  );
}

export function previewPersonaOptions() {
  return PREVIEW_PERSONAS.map(({ key, label }) => ({ key, label }));
}

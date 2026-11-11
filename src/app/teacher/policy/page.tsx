"use client";

import { PortalPolicyPage } from "@/components/policy/PortalPolicyPage";

// Teachers see their own rules and the student rules they enforce.
export default function TeacherPolicyPage() {
  return <PortalPolicyPage audience="all" />;
}

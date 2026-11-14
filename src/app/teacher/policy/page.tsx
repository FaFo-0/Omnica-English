import { redirect } from "next/navigation";

// The rules live in the teacher guide now; old links land on that section.
export default function TeacherPolicyRedirect() {
  redirect("/teacher/guide#rules");
}

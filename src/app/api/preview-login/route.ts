import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { PREVIEW_PERSONAS, previewLoginEnabled } from "@/lib/previewLogin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!previewLoginEnabled()) return new NextResponse("Not found", { status: 404 });
  const persona = PREVIEW_PERSONAS.find((p) => p.key === req.nextUrl.searchParams.get("as"));
  if (!persona) return new NextResponse("Unknown persona", { status: 400 });

  const clerk = await clerkClient();
  const { data: users } = await clerk.users.getUserList({ emailAddress: [persona.email], limit: 1 });
  if (!users[0]) return new NextResponse("Test account missing — run npm run qa:setup", { status: 409 });

  const { token } = await clerk.signInTokens.createSignInToken({ userId: users[0].id, expiresInSeconds: 60 });
  const target = new URL("/sign-in", req.nextUrl.origin);
  target.searchParams.set("__clerk_ticket", token);
  return NextResponse.redirect(target, { headers: { "Cache-Control": "no-store" } });
}

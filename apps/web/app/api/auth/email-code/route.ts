import { NextResponse } from "next/server";
import { createEmailVerificationCode } from "../../../../lib/mock-email-verification";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";

  if (!emailPattern.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const { code, expiresInSeconds } = createEmailVerificationCode(email);

  return NextResponse.json({
    ok: true,
    delivery: "mock",
    expiresInSeconds,
    previewCode: code
  });
}

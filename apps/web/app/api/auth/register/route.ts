import { NextResponse } from "next/server";
import { verifyEmailVerificationCode } from "../../../../lib/mock-email-verification";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; verificationCode?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const verificationCode = body?.verificationCode?.trim() ?? "";

  if (!emailPattern.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  if (!verificationCode) {
    return NextResponse.json({ ok: false, error: "missing_code" }, { status: 400 });
  }

  const result = verifyEmailVerificationCode(email, verificationCode);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

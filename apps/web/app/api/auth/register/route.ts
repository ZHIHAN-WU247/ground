import { NextResponse } from "next/server";
import { verifyEmailVerificationCode } from "../../../../lib/mock-email-verification";
import { registerConfirmedSupabaseAuthUser } from "../../../../lib/supabase-admin-registration";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { account?: string; email?: string; password?: string; verificationCode?: string } | null;
  const account = body?.account?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const verificationCode = body?.verificationCode?.trim() ?? "";

  if (!account || !password) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

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

  try {
    await registerConfirmedSupabaseAuthUser({ account, email, password });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "supabase_registration_failed" }, { status: 500 });
  }
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isPasswordRecoveryHash } from "../../../lib/password-recovery";
import { setSupabaseRecoverySessionFromHash, updateSupabasePassword } from "../../../lib/supabase-auth";

const copy = {
  title: "Reset password",
  description: "Enter a new password for this Supabase Auth account.",
  password: "New password",
  confirmPassword: "Confirm new password",
  submit: "Update password",
  loading: "Verifying recovery link...",
  invalidLink: "The password recovery link is invalid or expired. Please send a new recovery email.",
  mismatch: "The two passwords do not match.",
  tooShort: "Password must be at least 6 characters.",
  success: "Password updated. You can now sign in with the new password.",
  failed: "Password update failed. Please request a new recovery email and try again.",
  login: "Go to admin login"
};

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const establishRecoverySession = async () => {
      if (!isPasswordRecoveryHash(window.location.hash)) {
        setMessage(copy.invalidLink);
        setIsReady(false);
        return;
      }

      try {
        await setSupabaseRecoverySessionFromHash(window.location.hash);
        setIsReady(true);
        window.history.replaceState(null, "", window.location.pathname);
      } catch {
        setMessage(copy.invalidLink);
        setIsReady(false);
      }
    };

    void establishRecoverySession();
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    if (password.length < 6) {
      setMessage(copy.tooShort);
      return;
    }

    if (password !== confirmPassword) {
      setMessage(copy.mismatch);
      return;
    }

    setIsSubmitting(true);

    try {
      await updateSupabasePassword(password);
      setPassword("");
      setConfirmPassword("");
      setMessage(copy.success);
      setIsSuccess(true);
    } catch {
      setMessage(copy.failed);
    }

    setIsSubmitting(false);
  };

  return (
    <form className="panel" onSubmit={submit}>
      <div className="form-section-heading">
        <p className="eyebrow">Supabase Auth</p>
        <h2>{copy.title}</h2>
        <p className="muted">{isReady ? copy.description : copy.loading}</p>
      </div>

      {isReady ? (
        <>
          <div className="form-grid compact-auth-grid">
            <div className="field">
              <label htmlFor="new-password">{copy.password}</label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="confirm-password">{copy.confirmPassword}</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
          </div>
          <div className="button-row">
            <button className="button primary" type="submit" disabled={isSubmitting}>
              {copy.submit}
            </button>
          </div>
        </>
      ) : null}

      {message ? <p className={isSuccess ? "status success" : "status danger"}>{message}</p> : null}
      {isSuccess ? (
        <div className="button-row">
          <Link className="button primary" href="/admin/login">
            {copy.login}
          </Link>
        </div>
      ) : null}
    </form>
  );
}

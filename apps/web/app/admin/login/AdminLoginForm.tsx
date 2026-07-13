"use client";

import { useState } from "react";
import { getSafeAdminReturnPath } from "../../../lib/auth-redirect";
import { clearSupabaseAuthSession, isSupabaseAdminSession, signInWithSupabasePassword } from "../../../lib/supabase-auth";

const adminLoginCopy = {
  account: "Admin account / email",
  password: "Admin password",
  submit: "Login to admin",
  success: "Admin login succeeded. Redirecting...",
  invalidCredentials: "The admin account or password is incorrect.",
  hint: "Use a Supabase Auth account with admin role."
};

export function AdminLoginForm() {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setIsSuccess(false);

    try {
      await signInWithSupabasePassword(account, password);
      if (!isSupabaseAdminSession()) {
        clearSupabaseAuthSession();
        throw new Error("Admin role is required.");
      }
      setMessage(adminLoginCopy.success);
      setIsSuccess(true);
      window.location.assign(getSafeAdminReturnPath(window.location.search));
    } catch {
      setMessage(adminLoginCopy.invalidCredentials);
      setAccount("");
      setPassword("");
      setIsSubmitting(false);
      return;
    }
  };

  return (
    <form className="panel" onSubmit={login}>
      <div className="form-section-heading">
        <p className="eyebrow">Admin</p>
        <h2>Admin login</h2>
        <p className="muted">{adminLoginCopy.hint}</p>
      </div>
      <div className="form-grid compact-auth-grid">
        <div className="field">
          <label htmlFor="admin-account">{adminLoginCopy.account}</label>
          <input id="admin-account" type="text" value={account} onChange={(event) => setAccount(event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="admin-password">{adminLoginCopy.password}</label>
          <input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
      </div>
      <div className="button-row">
        <button className="button primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? adminLoginCopy.submit : adminLoginCopy.submit}
        </button>
      </div>
      {message ? <p className={isSuccess ? "status success" : "status danger"}>{message}</p> : null}
    </form>
  );
}

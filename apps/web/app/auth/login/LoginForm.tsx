"use client";

import { useState } from "react";
import { useI18n } from "../../../components/I18nProvider";
import { authenticateAdminAccount, isFixedAdminAccount } from "../../../lib/admin-auth";
import { getSafeAuthReturnPath } from "../../../lib/auth-redirect";
import { findLocalAuthAccountByLogin } from "../../../lib/local-auth";
import { findLocalUserProfileByEmail, saveLocalUserProfile } from "../../../lib/local-user-profile";

const loginCopy = {
  zh: {
    account: "账号 / 邮箱",
    password: "密码",
    success: "登录成功，正在跳转。",
    invalidCredentials: "账号或密码错误。",
    registerFirst: "该账号尚未注册，请先完成注册。",
    submit: "登录"
  },
  en: {
    account: "Account / email",
    password: "Password",
    success: "Signed in successfully. Redirecting...",
    invalidCredentials: "The account or password is incorrect.",
    registerFirst: "This account is not registered yet.",
    submit: "Login"
  },
  ru: {
    account: "Аккаунт / email",
    password: "Пароль",
    success: "Вход выполнен. Переходим дальше.",
    invalidCredentials: "Неверный аккаунт или пароль.",
    registerFirst: "Этот аккаунт еще не зарегистрирован.",
    submit: "Войти"
  }
} as const;

export function LoginForm() {
  const { locale, t } = useI18n();
  const copy = loginCopy[locale];
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const redirectAfterAuth = () => {
    window.location.assign(getSafeAuthReturnPath(window.location.search));
  };

  const login = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setIsSuccess(false);

    const adminResult = authenticateAdminAccount(account, password);
    const adminProfile = adminResult.ok ? adminResult.profile : null;

    if (adminProfile) {
      saveLocalUserProfile(adminProfile);
      setMessage(t("auth.login.adminSuccess"));
      setIsSuccess(true);
      redirectAfterAuth();
    } else if (isFixedAdminAccount(account)) {
      setMessage(t("auth.login.invalidAdminCredentials"));
    } else {
      const authAccount = findLocalAuthAccountByLogin(account);

      if (!authAccount) {
        setMessage(copy.registerFirst);
      } else if (authAccount.password !== password) {
        setMessage(copy.invalidCredentials);
      } else {
        const profile = findLocalUserProfileByEmail(authAccount.email) ?? {
          name: authAccount.account,
          email: authAccount.email,
          phone: "",
          country: "China",
          province: "",
          city: "",
          postalCode: "",
          addressLine: ""
        };

        saveLocalUserProfile(profile);
        setMessage(copy.success);
        setIsSuccess(true);
        redirectAfterAuth();
      }
    }

    setAccount("");
    setPassword("");
    setIsSubmitting(false);
  };

  return (
    <form className="panel" onSubmit={login}>
      <div className="form-grid compact-auth-grid">
        <div className="field">
          <label htmlFor="account">{copy.account}</label>
          <input id="account" type="text" value={account} onChange={(event) => setAccount(event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">{copy.password}</label>
          <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
      </div>
      <div className="button-row">
        <button className="button primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? copy.submit : copy.submit}
        </button>
      </div>
      {message ? <p className={isSuccess ? "status success" : "status danger"}>{message}</p> : null}
    </form>
  );
}

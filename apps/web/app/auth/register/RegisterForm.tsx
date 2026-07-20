"use client";

import { useState } from "react";
import { useI18n } from "../../../components/I18nProvider";
import { getSafeAuthReturnPath } from "../../../lib/auth-redirect";
import { hasLocalAuthAccountByAccount, hasLocalAuthAccountByEmail, registerLocalAuthAccount } from "../../../lib/local-auth";
import { saveLocalUserProfile } from "../../../lib/local-user-profile";
import { signInWithSupabasePassword } from "../../../lib/supabase-auth";
import { savePersistentUserProfile } from "../../../lib/user-profile-api";

const initialState = {
  account: "",
  email: "",
  password: "",
  verificationCode: ""
};

const registerCopy = {
  zh: {
    account: "账号",
    email: "邮箱",
    password: "密码",
    verificationCode: "邮箱验证码",
    sendCode: "发送验证码",
    sendingCode: "发送中...",
    success: "注册成功，正在进入账户页面。",
    duplicateAccount: "该账号已被注册，请更换账号。",
    duplicateEmail: "该邮箱已被注册，请直接登录。",
    invalidEmail: "请输入有效邮箱后再发送验证码。",
    codeSent: "验证码已发送。",
    mockCode: "当前为开发环境模拟发送，验证码：{code}",
    invalidCode: "邮箱验证码错误，请重新输入。",
    expiredCode: "邮箱验证码已过期，请重新发送。",
    missingCode: "请先发送并填写邮箱验证码。",
    genericError: "注册失败，请稍后重试。",
    submit: "注册"
  },
  en: {
    account: "Account",
    email: "Email",
    password: "Password",
    verificationCode: "Email code",
    sendCode: "Send code",
    sendingCode: "Sending...",
    success: "Registration succeeded. Redirecting to your account.",
    duplicateAccount: "This account name is already registered.",
    duplicateEmail: "This email is already registered. Please log in instead.",
    invalidEmail: "Enter a valid email before requesting the code.",
    codeSent: "Verification code sent.",
    mockCode: "Mock delivery preview code: {code}",
    invalidCode: "The email verification code is incorrect.",
    expiredCode: "The email verification code has expired. Please resend it.",
    missingCode: "Send and fill in the email verification code first.",
    genericError: "Registration failed. Please try again.",
    submit: "Register"
  },
  ru: {
    account: "Аккаунт",
    email: "Email",
    password: "Пароль",
    verificationCode: "Код из email",
    sendCode: "Отправить код",
    sendingCode: "Отправка...",
    success: "Регистрация успешна. Переходим в аккаунт.",
    duplicateAccount: "Этот аккаунт уже зарегистрирован.",
    duplicateEmail: "Этот email уже зарегистрирован. Войдите в аккаунт.",
    invalidEmail: "Введите корректный email перед отправкой кода.",
    codeSent: "Код подтверждения отправлен.",
    mockCode: "Тестовый код: {code}",
    invalidCode: "Неверный код подтверждения из email.",
    expiredCode: "Код подтверждения истек. Отправьте новый.",
    missingCode: "Сначала отправьте и заполните код подтверждения.",
    genericError: "Не удалось зарегистрироваться. Попробуйте снова.",
    submit: "Зарегистрироваться"
  }
} as const;

type MessageTone = "success" | "danger";

export function RegisterForm() {
  const { locale } = useI18n();
  const copy = registerCopy[locale];
  const [form, setForm] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("success");

  const updateField = (field: keyof typeof initialState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const showMessage = (tone: MessageTone, nextMessage: string) => {
    setMessageTone(tone);
    setMessage(nextMessage);
  };

  const sendCode = async () => {
    if (!form.email.trim()) {
      showMessage("danger", copy.invalidEmail);
      return;
    }

    setIsSendingCode(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/email-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: form.email })
      });

      const payload = (await response.json().catch(() => null)) as { previewCode?: string; error?: string } | null;

      if (!response.ok) {
        showMessage("danger", copy.invalidEmail);
        return;
      }

      const previewMessage = payload?.previewCode ? ` ${copy.mockCode.replace("{code}", payload.previewCode)}` : "";
      showMessage("success", `${copy.codeSent}${previewMessage}`);
    } catch {
      showMessage("danger", copy.genericError);
    } finally {
      setIsSendingCode(false);
    }
  };

  const register = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    if (hasLocalAuthAccountByAccount(form.account)) {
      showMessage("danger", copy.duplicateAccount);
      setIsSubmitting(false);
      return;
    }

    if (hasLocalAuthAccountByEmail(form.email)) {
      showMessage("danger", copy.duplicateEmail);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          account: form.account,
          email: form.email,
          password: form.password,
          verificationCode: form.verificationCode
        })
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        const error = payload?.error ?? "generic_error";
        const errorMessage =
          error === "invalid_code"
            ? copy.invalidCode
            : error === "expired_code"
              ? copy.expiredCode
              : error === "missing_code"
                ? copy.missingCode
                : error === "invalid_email"
                  ? copy.invalidEmail
                  : copy.genericError;

        showMessage("danger", errorMessage);
        setIsSubmitting(false);
        return;
      }

      await signInWithSupabasePassword(form.email, form.password);

      const registerResult = registerLocalAuthAccount({
        account: form.account,
        email: form.email,
        password: form.password
      });

      if (!registerResult.ok) {
        showMessage("danger", registerResult.reason === "duplicate_account" ? copy.duplicateAccount : copy.duplicateEmail);
        setIsSubmitting(false);
        return;
      }

      const initialProfile = {
        name: form.account,
        email: form.email,
        phone: "",
        country: "China",
        province: "",
        city: "",
        postalCode: "",
        addressLine: ""
      };

      saveLocalUserProfile(initialProfile);
      await savePersistentUserProfile(initialProfile);

      showMessage("success", copy.success);
      window.location.assign(getSafeAuthReturnPath(window.location.search));
    } catch {
      showMessage("danger", copy.genericError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="panel" onSubmit={register}>
      <div className="form-grid compact-auth-grid">
        <div className="field">
          <label htmlFor="account">{copy.account}</label>
          <input id="account" value={form.account} onChange={(event) => updateField("account", event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="email">{copy.email}</label>
          <div className="field-action-row">
            <input id="email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required />
            <button className="button" type="button" onClick={sendCode} disabled={isSendingCode}>
              {isSendingCode ? copy.sendingCode : copy.sendCode}
            </button>
          </div>
        </div>
        <div className="field">
          <label htmlFor="password">{copy.password}</label>
          <input id="password" type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="verificationCode">{copy.verificationCode}</label>
          <input
            id="verificationCode"
            inputMode="numeric"
            value={form.verificationCode}
            onChange={(event) => updateField("verificationCode", event.target.value)}
            required
          />
        </div>
      </div>
      <div className="button-row">
        <button className="button primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? copy.submit : copy.submit}
        </button>
      </div>
      {message ? <p className={`status ${messageTone}`}>{message}</p> : null}
    </form>
  );
}

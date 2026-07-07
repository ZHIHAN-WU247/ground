import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="auth-page login-page">
      <section className="shell section auth-page-content">
        <LoginForm />
      </section>
    </div>
  );
}

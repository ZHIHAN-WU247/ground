import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="auth-page register-page">
      <section className="shell section auth-page-content">
        <RegisterForm />
      </section>
    </div>
  );
}

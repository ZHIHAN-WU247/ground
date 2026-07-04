import { PageHero } from "../../../components/PageHero";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <>
      <PageHero eyebrowKey="auth.eyebrow" titleKey="auth.login.title" descriptionKey="auth.login.description" />
      <section className="shell section">
        <LoginForm />
      </section>
    </>
  );
}

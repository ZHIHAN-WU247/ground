import { PageHero } from "../../../components/PageHero";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <>
      <PageHero eyebrowKey="auth.eyebrow" titleKey="auth.register.title" descriptionKey="auth.register.description" />
      <section className="shell section">
        <RegisterForm />
      </section>
    </>
  );
}

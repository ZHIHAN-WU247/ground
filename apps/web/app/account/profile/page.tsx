import { AccountNav } from "../AccountNav";
import { ProfileForm } from "./ProfileForm";

export default function AccountProfilePage() {
  return (
    <div className="account-themed-page account-profile-page">
      <AccountNav />
      <section className="shell section account-themed-page-content">
        <ProfileForm />
      </section>
    </div>
  );
}

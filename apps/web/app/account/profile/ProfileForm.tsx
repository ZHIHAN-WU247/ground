"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../../../components/I18nProvider";
import { getActiveLocalUserProfile, saveLocalUserProfile, type LocalUserProfile } from "../../../lib/local-user-profile";

const emptyProfile: LocalUserProfile = {
  name: "",
  phone: "",
  email: "",
  country: "China",
  province: "",
  city: "",
  postalCode: "",
  addressLine: ""
};

export function ProfileForm() {
  const { t } = useI18n();
  const [profile, setProfile] = useState(emptyProfile);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const storedProfile = getActiveLocalUserProfile();

    if (storedProfile) {
      setProfile(storedProfile);
    }
  }, []);

  const updateField = (field: keyof LocalUserProfile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const savedProfile = saveLocalUserProfile(profile);
    setProfile(savedProfile ?? profile);
    setMessage(t("account.profile.saved"));
  };

  return (
    <form className="panel" onSubmit={saveProfile}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="profileName">{t("auth.name")}</label>
          <input id="profileName" value={profile.name} onChange={(event) => updateField("name", event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="profileEmail">{t("auth.email")}</label>
          <input id="profileEmail" type="email" value={profile.email} onChange={(event) => updateField("email", event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="profilePhone">{t("auth.phone")}</label>
          <input id="profilePhone" value={profile.phone} onChange={(event) => updateField("phone", event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="profileProvince">{t("auth.province")}</label>
          <input id="profileProvince" value={profile.province} onChange={(event) => updateField("province", event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="profileCity">{t("auth.city")}</label>
          <input id="profileCity" value={profile.city} onChange={(event) => updateField("city", event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="profilePostalCode">{t("auth.postalCode")}</label>
          <input id="profilePostalCode" value={profile.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} required />
        </div>
        <div className="field full">
          <label htmlFor="profileAddress">{t("auth.address")}</label>
          <input id="profileAddress" value={profile.addressLine} onChange={(event) => updateField("addressLine", event.target.value)} required />
        </div>
      </div>
      <div className="button-row">
        <button className="button primary" type="submit">{t("account.profile.save")}</button>
      </div>
      {message ? <p className="status success">{message}</p> : null}
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { ContentBanner } from "@ground/shared";
import { useI18n } from "../../../../components/I18nProvider";
import { listAdminContentBanners, saveAdminContentBanner } from "../../../../lib/content-banners-api";

type BannerForm = Omit<ContentBanner, "createdAt" | "updatedAt">;

const emptyBanner: BannerForm = {
  id: "",
  title: "",
  placement: "home",
  isActive: true,
  sortOrder: 0,
  metadata: {}
};

export function AdminBannersClient() {
  const { t } = useI18n();
  const [banners, setBanners] = useState<ContentBanner[]>([]);
  const [form, setForm] = useState<BannerForm>(emptyBanner);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadBanners = async () => {
    setBanners(await listAdminContentBanners());
  };

  useEffect(() => {
    void loadBanners();
  }, []);

  const updateForm = <K extends keyof BannerForm>(field: K, value: BannerForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const editBanner = (banner: ContentBanner) => {
    setForm({
      id: banner.id,
      title: banner.title,
      ...(banner.subtitle ? { subtitle: banner.subtitle } : {}),
      ...(banner.imageFileAssetId ? { imageFileAssetId: banner.imageFileAssetId } : {}),
      ...(banner.imageUrl ? { imageUrl: banner.imageUrl } : {}),
      ...(banner.href ? { href: banner.href } : {}),
      placement: banner.placement,
      isActive: banner.isActive,
      sortOrder: banner.sortOrder,
      metadata: banner.metadata
    });
    setMessage("");
  };

  const saveBanner = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      const saved = await saveAdminContentBanner(form);
      setForm(emptyBanner);
      await loadBanners();
      setMessage(`Saved ${saved.title}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid two">
      <form className="panel" onSubmit={saveBanner}>
        <div className="form-section-heading">
          <p className="eyebrow">{t("admin.content.banners.eyebrow")}</p>
          <h1>{t("admin.content.banners.title")}</h1>
          <p className="muted">{t("admin.content.banners.description")}</p>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Title</span>
            <input value={form.title} onChange={(event) => updateForm("title", event.target.value)} required />
          </label>
          <label className="field">
            <span>Placement</span>
            <input value={form.placement} onChange={(event) => updateForm("placement", event.target.value)} required />
          </label>
          <label className="field full">
            <span>Subtitle</span>
            <input value={form.subtitle ?? ""} onChange={(event) => updateForm("subtitle", event.target.value)} />
          </label>
          <label className="field full">
            <span>Image URL</span>
            <input value={form.imageUrl ?? ""} onChange={(event) => updateForm("imageUrl", event.target.value)} />
          </label>
          <label className="field full">
            <span>Link</span>
            <input value={form.href ?? ""} onChange={(event) => updateForm("href", event.target.value)} />
          </label>
          <label className="field">
            <span>Sort</span>
            <input type="number" value={form.sortOrder} onChange={(event) => updateForm("sortOrder", Number(event.target.value))} />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.isActive} onChange={(event) => updateForm("isActive", event.target.checked)} />
            <span>Active</span>
          </label>
        </div>
        <div className="button-row">
          <button className="button primary" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save banner"}
          </button>
          {form.id ? (
            <button className="button" type="button" onClick={() => setForm(emptyBanner)}>
              New banner
            </button>
          ) : null}
        </div>
        {message ? <p className={message.includes("failed") || message.includes("required") ? "status danger" : "status success"}>{message}</p> : null}
      </form>

      <div className="panel">
        <div className="form-section-heading">
          <p className="eyebrow">Published content</p>
          <h3>Banners</h3>
        </div>
        {banners.length === 0 ? (
          <div className="empty-state">No banners yet.</div>
        ) : (
          <div className="grid">
            {banners.map((banner) => (
              <article className="card" key={banner.id}>
                <div className="detail-head">
                  <div>
                    <h3>{banner.title}</h3>
                    <p>{banner.placement}</p>
                  </div>
                  <span className={banner.isActive ? "status success" : "status"}>{banner.isActive ? "Active" : "Draft"}</span>
                </div>
                {banner.subtitle ? <p className="muted">{banner.subtitle}</p> : null}
                {banner.href ? <p className="muted">{banner.href}</p> : null}
                <div className="button-row compact">
                  <button className="button" type="button" onClick={() => editBanner(banner)}>
                    Edit
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

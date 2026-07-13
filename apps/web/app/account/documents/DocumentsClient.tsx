"use client";

import { useEffect, useState } from "react";
import type { CustomerDocument } from "@ground/shared";
import { useI18n } from "../../../components/I18nProvider";
import { deleteCustomerDocument, listCustomerDocuments, saveCustomerDocument } from "../../../lib/customer-documents-api";
import { getPrivateFileAssetSignedUrl, uploadPrivateFileAsset } from "../../../lib/file-assets-api";
import { getActiveLocalUserProfile } from "../../../lib/local-user-profile";

type FormState = Pick<CustomerDocument, "documentNo" | "documentType" | "id" | "metadata"> & {
  fileAssetId?: string;
  holderName: string;
};

const emptyForm: FormState = {
  id: "",
  documentType: "tax_id",
  documentNo: "",
  holderName: "",
  metadata: {}
};

export function DocumentsClient() {
  const { t } = useI18n();
  const [ownerEmail, setOwnerEmail] = useState("");
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadDocuments = async (email: string) => {
    setDocuments(await listCustomerDocuments(email));
  };

  useEffect(() => {
    const email = getActiveLocalUserProfile()?.email ?? "";
    setOwnerEmail(email);
    void loadDocuments(email);
  }, []);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const editDocument = (document: CustomerDocument) => {
    setForm({
      id: document.id,
      documentType: document.documentType,
      documentNo: document.documentNo,
      ...(document.fileAssetId ? { fileAssetId: document.fileAssetId } : {}),
      holderName: typeof document.metadata.holderName === "string" ? document.metadata.holderName : "",
      metadata: document.metadata
    });
    setSelectedFile(null);
    setMessage("");
  };

  const removeDocument = async (id: string) => {
    await deleteCustomerDocument(ownerEmail, id);
    await loadDocuments(ownerEmail);
    setMessage("Document deleted.");
  };

  const openPrivateFile = async (fileAssetId: string) => {
    setMessage("");

    try {
      const result = await getPrivateFileAssetSignedUrl(ownerEmail, fileAssetId);
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to open private file.");
    }
  };

  const saveDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      let saved = await saveCustomerDocument(ownerEmail, {
        id: form.id,
        documentType: form.documentType,
        documentNo: form.documentNo,
        ...(form.fileAssetId ? { fileAssetId: form.fileAssetId } : {}),
        metadata: {
          ...form.metadata,
          holderName: form.holderName
        }
      });
      if (selectedFile) {
        const asset = await uploadPrivateFileAsset({
          ownerEmail,
          file: selectedFile,
          purpose: "customer_document",
          relatedEntityType: "customer_document",
          relatedEntityId: saved.id,
          metadata: {
            documentType: form.documentType,
            documentNo: form.documentNo
          }
        });
        saved = await saveCustomerDocument(ownerEmail, {
          id: saved.id,
          documentType: saved.documentType,
          documentNo: saved.documentNo,
          fileAssetId: asset.id,
          ...(saved.verifiedAt ? { verifiedAt: saved.verifiedAt } : {}),
          metadata: saved.metadata
        });
      }
      setForm(emptyForm);
      setSelectedFile(null);
      await loadDocuments(ownerEmail);
      setMessage(`Saved ${saved.documentType}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid two">
      <form className="panel" onSubmit={saveDocument}>
        <div className="form-section-heading">
          <p className="eyebrow">{t("account.documents.eyebrow")}</p>
          <h3>{t("account.documents.title")}</h3>
          <p className="muted">{t("account.documents.note")}</p>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Document type</span>
            <select value={form.documentType} onChange={(event) => updateField("documentType", event.target.value)}>
              <option value="tax_id">Tax ID</option>
              <option value="passport">Passport</option>
              <option value="national_id">National ID</option>
            </select>
          </label>
          <label className="field">
            <span>Document number</span>
            <input value={form.documentNo} onChange={(event) => updateField("documentNo", event.target.value)} required />
          </label>
          <label className="field full">
            <span>Holder name</span>
            <input value={form.holderName} onChange={(event) => updateField("holderName", event.target.value)} />
          </label>
          <label className="field full">
            <span>Private file</span>
            <input type="file" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div className="button-row">
          <button className="button primary" type="submit" disabled={isSubmitting || !ownerEmail}>
            {isSubmitting ? t("common.submitting") : "Save document"}
          </button>
          {form.id ? (
            <button className="button" type="button" onClick={() => {
              setForm(emptyForm);
              setSelectedFile(null);
            }}>
              Cancel
            </button>
          ) : null}
        </div>
        {!ownerEmail ? <p className="status danger">Login is required to save documents.</p> : null}
        {message ? <p className={message.includes("failed") || message.includes("required") ? "status danger" : "status success"}>{message}</p> : null}
      </form>
      <div className="panel">
        <div className="form-section-heading">
          <p className="eyebrow">{t("account.nav.documents")}</p>
          <h3>{t("account.documents.title")}</h3>
        </div>
        {documents.length === 0 ? (
          <div className="empty-state">{t("account.documents.description")}</div>
        ) : (
          <div className="grid">
            {documents.map((document) => (
              <article className="card" key={document.id}>
                <div className="detail-head">
                  <div>
                    <h3>{document.documentType}</h3>
                    <p>{document.documentNo}</p>
                  </div>
                  {document.verifiedAt ? <span className="status success">Verified</span> : null}
                </div>
                <p className="muted">{typeof document.metadata.holderName === "string" ? document.metadata.holderName : ""}</p>
                {document.fileAssetId ? <p className="muted">Private file attached</p> : null}
                <div className="button-row compact">
                  {document.fileAssetId ? (
                    <button className="button" type="button" onClick={() => openPrivateFile(document.fileAssetId!)}>
                      View file
                    </button>
                  ) : null}
                  <button className="button" type="button" onClick={() => editDocument(document)}>
                    Edit
                  </button>
                  <button className="button" type="button" onClick={() => removeDocument(document.id)}>
                    Delete
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

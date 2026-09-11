import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Lock, RotateCcw, Save } from "lucide-react";

import { configuration as configApi } from "../../api/resources";
import { useAsyncData } from "../../hooks/useResource";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ROLES } from "../../config/navigation";
import { ErrorState, Field, LoadingState, Spinner } from "../../components/ui";
import ConfigBack from "../../components/config/ConfigBack";

const EDITOR_ROLES = [ROLES.PROPERTY_OWNER, ROLES.SYSTEM_OPERATOR, ROLES.ACCOUNTANT];

/* The five blocks a document is assembled from, in the order they appear on
   the page. `note` is the sentence under a section that explains what the
   document prints when the block is left empty. */
const SECTIONS = [
    {
        id: "letterhead",
        title: "Letterhead",
        blurb: "The block at the top of every document.",
        fields: [
            { key: "tradingName", label: "Trading name" },
            { key: "tagline", label: "Tagline" },
            { key: "address", label: "Address", full: true },
            { key: "city", label: "City" },
            { key: "state", label: "State" },
            { key: "pincode", label: "Pincode", mono: true },
            { key: "phone", label: "Phone", mono: true },
            { key: "email", label: "Email" },
            { key: "website", label: "Website" },
            { key: "supportHours", label: "Support hours", placeholder: "Mon–Sat, 10am–6pm" },
            { key: "brandColour", label: "Brand colour", placeholder: "#1f3d68", mono: true },
        ],
    },
    {
        id: "legal",
        title: "Legal identity",
        blurb: "What the company is called on a registrable instrument.",
        fields: [
            { key: "legalName", label: "Legal name", full: true },
            { key: "cin", label: "CIN", mono: true },
            { key: "gstin", label: "GSTIN", mono: true },
            { key: "reraRegistration", label: "RERA registration", mono: true },
            {
                key: "signatoryName",
                label: "Signatory name",
                hint: "The agreements name the person who signs for the company — “represented by its authorised signatory …”.",
            },
            { key: "signatoryDesignation", label: "Signatory designation" },
        ],
        note: "The Agreement for Sale and the Sale Deed recite the state on its own — “stamp paper of the value prescribed in …”. Without it that clause prints a dash.",
    },
    {
        id: "account",
        title: "Collection account",
        blurb: "Where a buyer is told to pay, and where a lender is told to disburse. Printed on the Agreement for Sale, the Tripartite Agreement and the mortgage NOC.",
        fields: [
            { key: "accountName", label: "Account name", full: true },
            { key: "accountNumber", label: "Account number", mono: true },
            { key: "ifsc", label: "IFSC", mono: true },
            { key: "bank", label: "Bank" },
            { key: "branch", label: "Branch" },
        ],
        note: "Until this is filled in, the agreements print “All payments shall be made … in favour of —, account no. —”.",
    },
    {
        id: "terms",
        title: "Contractual terms",
        blurb: "Periods and rates the documents state as terms.",
        fields: [
            { key: "paymentDueDays", label: "Payment due (days)", number: true },
            { key: "curePeriodDays", label: "Cure period (days)", number: true },
            { key: "agreementExecutionDays", label: "Agreement execution (days)", number: true },
            { key: "allotmentAcceptanceDays", label: "Allotment acceptance (days)", number: true },
            { key: "nocValidityDays", label: "NOC validity (days)", number: true },
            { key: "quotationValidityDays", label: "Quotation validity (days)", number: true },
            {
                key: "delayInterestPercent",
                label: "Delay interest (% per annum)",
                number: true,
                nullable: true,
                placeholder: "9.50",
            },
        ],
        note: "Leave the rate empty if no interest is chargeable. It is never printed as “0%” — a zero on a contract is a term saying interest cannot be charged at all.",
    },
    {
        id: "numbering",
        title: "Numbering",
        blurb: "The prefix on every document reference — SKY/AFS/2026-27/0001. Changing it does not renumber anything already issued.",
        fields: [{ key: "organisationPrefix", label: "Organisation prefix", mono: true }],
    },
];

const ALL_FIELDS = SECTIONS.flatMap((section) => section.fields);

/* The periods the model falls back to. An organisation configured before
   these fields existed has none stored, and a blank box would read as "no
   cure period" rather than "the usual fifteen days". */
const DEFAULT_TERMS = {
    paymentDueDays: 15,
    curePeriodDays: 15,
    agreementExecutionDays: 30,
    allotmentAcceptanceDays: 7,
    nocValidityDays: 90,
    quotationValidityDays: 15,
};

/**
 * What every letter, agreement and certificate says about the company. A
 * field left empty is not an error: the document prints an em-dash where the
 * value would have gone and stays issuable.
 */
const DocumentSettings = () => {
    const toast = useToast();
    const { user } = useAuth();

    const { data, isLoading, error, refetch } = useAsyncData(() => configApi.get(), []);

    const [form, setForm] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    /* Stored values win; the defaults only fill a gap. */
    const saved = useMemo(
        () => ({ ...DEFAULT_TERMS, ...(data?.documentSettings || {}) }),
        [data]
    );

    useEffect(() => {
        if (data) setForm(saved);
    }, [data, saved]);

    const canEdit = EDITOR_ROLES.includes(user.role);

    const isDirty = useMemo(() => {
        if (!form) return false;

        return ALL_FIELDS.some(
            (field) => (form[field.key] ?? null) !== (saved[field.key] ?? null)
        );
    }, [form, saved]);

    const save = async () => {
        setIsSaving(true);

        try {
            await configApi.update({ documentSettings: form });
            toast.success("Document settings saved");
            refetch();
        } catch (err) {
            toast.error("Could not save document settings", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (error) return <ErrorState message={error} onRetry={refetch} />;
    if (isLoading || !form) return <LoadingState label="Loading document settings" />;

    const set = (field, raw) => {
        let value = raw;

        if (field.number) {
            // An empty rate stays empty rather than becoming a contractual
            // zero, which would say something quite different.
            value = raw === "" ? (field.nullable ? null : 0) : Number(raw);
            if (Number.isNaN(value)) return;
        }

        setForm((current) => ({ ...current, [field.key]: value }));
    };

    return (
        <div className="cfg-shell">
            <header className="cfg-head">
                <div className="cfg-head__lead">
                    <ConfigBack />

                    <nav className="cfg-crumbs">
                        <Link to="/layout/configuration">Configuration</Link>
                        <ChevronRight />
                        <span>Document Settings</span>
                    </nav>

                    <h1 className="cfg-title">Document Settings</h1>

                    <p className="cfg-sub">
                        What every letter, agreement and certificate says about your company.
                        {isDirty ? " Unsaved changes." : ""}
                    </p>
                </div>

                {canEdit ? (
                    <div className="cfg-head__actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setForm(saved)}
                            disabled={!isDirty || isSaving}
                        >
                            <RotateCcw /> Discard
                        </button>

                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={save}
                            disabled={!isDirty || isSaving}
                        >
                            {isSaving ? <Spinner inline /> : <Save />}
                            {isSaving ? "Saving…" : "Save"}
                        </button>
                    </div>
                ) : (
                    <div className="cfg-head__actions">
                        <span className="cfg-muted">
                            <Lock /> View only
                        </span>
                    </div>
                )}
            </header>

            <p className="page-note">
                A field left empty is not an error. The document prints an em-dash where the value
                would have gone — a visible gap for whoever settles it — and stays issuable.
            </p>

            {SECTIONS.map((section) => (
                <section key={section.id} className="config-section">
                    <h2 className="section-title">{section.title}</h2>
                    <p className="config-hint cfg-section-blurb">{section.blurb}</p>

                    <div className="card">
                        <div className="card-pad">
                            <div className="form-grid">
                                {section.fields.map((field) => (
                                    <Field
                                        key={field.key}
                                        label={field.label}
                                        hint={field.hint}
                                        full={field.full}
                                    >
                                        <input
                                            className={`input${field.mono || field.number ? " mono" : ""}`}
                                            inputMode={field.number ? "decimal" : undefined}
                                            value={form[field.key] ?? ""}
                                            placeholder={field.placeholder}
                                            disabled={!canEdit}
                                            onChange={(event) => set(field, event.target.value)}
                                        />
                                    </Field>
                                ))}
                            </div>

                            {section.note ? <p className="config-hint">{section.note}</p> : null}
                        </div>
                    </div>
                </section>
            ))}
        </div>
    );
};

export default DocumentSettings;

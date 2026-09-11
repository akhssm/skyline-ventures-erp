import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, RotateCcw, Save } from "lucide-react";

import { configuration as configApi } from "../../api/resources";
import { useAsyncData } from "../../hooks/useResource";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ROLES } from "../../config/navigation";
import { taxConfig as taxModule } from "../../config/modules";
import ResourcePage from "../../components/ResourcePage";
import { ErrorState, Field, LoadingState, Spinner } from "../../components/ui";
import ConfigBack from "../../components/config/ConfigBack";

const EDITOR_ROLES = [ROLES.PROPERTY_OWNER, ROLES.SYSTEM_OPERATOR, ROLES.ACCOUNTANT];

/* The statutory defaults. A booking reads these when it raises a commission
   or prices a unit, so changing one here changes every figure calculated
   after it, and none calculated before. */
const RATES = [
    {
        key: "defaultGstPercent",
        label: "Default GST percent",
        hint: "Applied to a unit price when a quotation or invoice is raised.",
    },
    {
        key: "defaultTdsPercent",
        label: "Default TDS percent",
        hint: "Withheld from a channel-partner payout unless the plan overrides it.",
    },
    {
        key: "defaultCommissionPercent",
        label: "Default commission percent",
        hint: "Used when a booking raises a commission and no plan applies.",
    },
];

const OWNED = RATES.map((rate) => rate.key);

/**
 * The rates commission and invoices apply, above the filings they produce.
 * The rates are organisation settings; the table below is the record of
 * what has actually been filed and paid.
 */
const TaxConfig = () => {
    const toast = useToast();
    const { user } = useAuth();

    const { data, isLoading, error, refetch } = useAsyncData(() => configApi.get(), []);

    const [form, setForm] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (data) setForm(data);
    }, [data]);

    const canEdit = EDITOR_ROLES.includes(user.role);

    const isDirty = useMemo(() => {
        if (!form || !data) return false;

        return OWNED.some((key) => (form[key] ?? null) !== (data[key] ?? null));
    }, [form, data]);

    const save = async () => {
        setIsSaving(true);

        try {
            const payload = Object.fromEntries(OWNED.map((key) => [key, form[key]]));

            await configApi.update(payload);
            toast.success("Tax rates saved");
            refetch();
        } catch (err) {
            toast.error("Could not save", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (error) return <ErrorState message={error} onRetry={refetch} />;
    if (isLoading || !form) return <LoadingState label="Loading tax settings" />;

    const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

    return (
        <div className="cfg-shell">
            <header className="cfg-head">
                <div className="cfg-head__lead">
                    <ConfigBack />

                    <nav className="cfg-crumbs">
                        <Link to="/layout/configuration">Configuration</Link>
                        <ChevronRight />
                        <span>Tax</span>
                    </nav>

                    <h1 className="cfg-title">Tax</h1>

                    <p className="cfg-sub">
                        The rates commission and invoices apply
                        {isDirty ? <span className="is-warning"> · Unsaved changes</span> : null}
                    </p>
                </div>

                {canEdit ? (
                    <div className="cfg-head__actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setForm(data)}
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
                            Save changes
                        </button>
                    </div>
                ) : null}
            </header>

            <section className="config-section">
                <h2 className="section-title">Rates</h2>

                <div className="card">
                    <div className="card-pad">
                        <div className="form-grid">
                            {RATES.map((field) => (
                                <Field key={field.key} label={field.label} hint={field.hint}>
                                    <input
                                        className="input mono"
                                        inputMode="decimal"
                                        value={form[field.key] ?? ""}
                                        disabled={!canEdit}
                                        onChange={(event) =>
                                            set(field.key, Number(event.target.value) || 0)
                                        }
                                    />
                                </Field>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="config-section cfg-embedded">
                <h2 className="section-title">Filings</h2>

                <ResourcePage config={taxModule} />
            </section>
        </div>
    );
};

export default TaxConfig;

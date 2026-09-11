import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, RotateCcw, Save } from "lucide-react";

import { configuration as configApi } from "../../api/resources";
import { useAsyncData } from "../../hooks/useResource";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ROLES } from "../../config/navigation";
import { ErrorState, Field, LoadingState, Spinner } from "../../components/ui";
import ConfigBack from "../../components/config/ConfigBack";

const EDITOR_ROLES = [ROLES.PROPERTY_OWNER, ROLES.SYSTEM_OPERATOR, ROLES.ACCOUNTANT];

/* The settings this screen owns. Sending only these keeps a save here from
   writing back what the other configuration screens are holding. */
const OWNED = ["autoAssignLeads", "followUpOverdueHours", "unitHoldHours", "duplicateWindowDays"];

const WINDOWS = [
    {
        key: "followUpOverdueHours",
        label: "Respond within (hours)",
        hint: "A lead with no contact inside this window is counted overdue on the leads screen.",
    },
    {
        key: "unitHoldHours",
        label: "Unit hold expires after (hours)",
        hint: "How long a held unit stays off the available list before it returns.",
    },
    {
        key: "duplicateWindowDays",
        label: "Duplicate detection window (days)",
        hint: "How far back the duplicates screen looks for the same party.",
    },
];

/**
 * Who picks up a new lead, and how long they have. The rotation itself is
 * the product's: each new lead goes to the CRM Executive on its project who
 * has waited longest for one. This screen decides whether it runs at all,
 * and the windows the leads console measures against.
 */
const AssignmentRules = () => {
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
            const payload = Object.fromEntries(
                OWNED.filter((key) => form[key] !== undefined).map((key) => [key, form[key]])
            );

            await configApi.update(payload);
            toast.success("Assignment rules saved");
            refetch();
        } catch (err) {
            toast.error("Could not change auto assignment. It is unchanged.", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (error) return <ErrorState message={error} onRetry={refetch} />;
    if (isLoading || !form) return <LoadingState label="Loading assignment rules" />;

    const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

    return (
        <div className="cfg-shell">
            <header className="cfg-head">
                <div className="cfg-head__lead">
                    <ConfigBack />

                    <nav className="cfg-crumbs">
                        <Link to="/layout/configuration">Configuration</Link>
                        <ChevronRight />
                        <span>Assignment Rules</span>
                    </nav>

                    <h1 className="cfg-title">Assignment Rules</h1>

                    <p className="cfg-sub">
                        Who receives a new lead, and how long they have to answer it
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
                <h2 className="section-title">Distributes</h2>

                <div className="card">
                    <div className="card-pad">
                        <label className="check-line">
                            <input
                                type="checkbox"
                                className="checkbox"
                                checked={Boolean(form.autoAssignLeads)}
                                disabled={!canEdit}
                                onChange={(event) => set("autoAssignLeads", event.target.checked)}
                            />
                            Automatically assign each new lead
                        </label>

                        <p className="config-hint">
                            {form.autoAssignLeads
                                ? "Each new lead goes to the CRM Executive on its project who has waited longest for one."
                                : "Off: a new lead lands with no owner and is handed out by hand."}
                        </p>
                    </div>
                </div>
            </section>

            <section className="config-section">
                <h2 className="section-title">Windows</h2>

                <div className="card">
                    <div className="card-pad">
                        <div className="form-grid">
                            {WINDOWS.map((field) => (
                                <Field key={field.key} label={field.label} hint={field.hint}>
                                    <input
                                        className="input mono"
                                        inputMode="numeric"
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
        </div>
    );
};

export default AssignmentRules;

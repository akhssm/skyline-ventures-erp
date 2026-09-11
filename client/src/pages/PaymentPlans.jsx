import { useEffect, useMemo, useState } from "react";
import { GripVertical, Plus, Save, Trash2 } from "lucide-react";

import { paymentPlans as plansApi, projects as projectsApi } from "../api/resources";
import { useAsyncData } from "../hooks/useResource";
import { useToast } from "../context/ToastContext";
import {
    Badge,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    Field,
    LoadingState,
    Spinner,
} from "../components/ui";
import { titleCase } from "../utils/format";

const PLAN_TYPES = [
    { value: "construction_linked", label: "Construction linked" },
    { value: "time_linked", label: "Time linked" },
    { value: "down_payment", label: "Down payment" },
    { value: "custom", label: "Custom" },
];

const blankPlan = () => ({
    name: "",
    planType: "construction_linked",
    project: "",
    isActive: true,
    milestones: [{ label: "On booking", percentage: 10, dueAfterDays: 0 }],
});

/**
 * A plan is a list of stages. Each stage bills a percentage of the unit price
 * a set number of days after booking, and the stages must total 100 percent
 * or the schedule would under-bill every unit it is applied to.
 */
const PaymentPlans = () => {
    const toast = useToast();

    const { data: plans, isLoading, error, refetch } = useAsyncData(
        () => plansApi.list({ limit: 100, sort: "name" }),
        []
    );
    const { data: projectList } = useAsyncData(() => projectsApi.list({ limit: 100, sort: "name" }), []);

    const [selectedId, setSelectedId] = useState(null);
    const [draft, setDraft] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);

    // Opening the screen selects the first plan so the editor is never blank.
    useEffect(() => {
        if (!plans?.length || selectedId !== null) return;

        setSelectedId(plans[0]._id);
        setDraft({ ...plans[0], project: plans[0].project?._id || "" });
    }, [plans, selectedId]);

    const total = useMemo(
        () => (draft?.milestones || []).reduce((sum, m) => sum + (Number(m.percentage) || 0), 0),
        [draft]
    );

    const isBalanced = Math.round(total) === 100;

    const openPlan = (plan) => {
        setSelectedId(plan._id);
        setDraft({ ...plan, project: plan.project?._id || "" });
    };

    const startNew = () => {
        setSelectedId("new");
        setDraft(blankPlan());
    };

    const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

    const setStage = (index, patch) =>
        setDraft((d) => ({
            ...d,
            milestones: d.milestones.map((m, i) => (i === index ? { ...m, ...patch } : m)),
        }));

    const addStage = () =>
        setDraft((d) => ({
            ...d,
            milestones: [...d.milestones, { label: "", percentage: 0, dueAfterDays: 0 }],
        }));

    const removeStage = (index) =>
        setDraft((d) => ({ ...d, milestones: d.milestones.filter((_, i) => i !== index) }));

    const save = async () => {
        if (!draft.name.trim()) {
            toast.error("Give this plan a name.");
            return;
        }

        if (!draft.milestones.length) {
            toast.error("Add at least one stage.");
            return;
        }

        if (!isBalanced) {
            toast.error(`Stages must total 100 percent, currently ${Math.round(total)} percent`);
            return;
        }

        setIsSaving(true);

        const payload = {
            name: draft.name.trim(),
            planType: draft.planType,
            isActive: draft.isActive,
            milestones: draft.milestones.map((m) => ({
                label: m.label.trim(),
                percentage: Number(m.percentage) || 0,
                dueAfterDays: Number(m.dueAfterDays) || 0,
            })),
            ...(draft.project ? { project: draft.project } : {}),
        };

        try {
            if (selectedId === "new") {
                const created = await plansApi.create(payload);
                setSelectedId(created.data._id);
            } else {
                await plansApi.update(selectedId, payload);
            }

            toast.success("Payment plan saved successfully");
            refetch();
        } catch (err) {
            toast.error("Could not save the payment plan", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async () => {
        try {
            await plansApi.remove(pendingDelete._id);
            toast.success("Payment plan deleted");

            setPendingDelete(null);
            setSelectedId(null);
            setDraft(null);
            refetch();
        } catch (err) {
            toast.error("Could not delete the payment plan", err.message);
        }
    };

    if (error) return <ErrorState message={error} onRetry={refetch} />;
    if (isLoading) return <LoadingState label="Loading payment plans" />;

    return (
        <>
            <div className="page-head">
                <div>
                    <h1 className="page-title">Payment Plans</h1>
                    <div className="page-summary">
                        <span>
                            <b>{plans?.length ?? 0}</b> plans
                        </span>
                        <span className="sep">·</span>
                        <span>Stages bill a percentage of the unit price after booking</span>
                    </div>
                </div>

                <div className="page-actions">
                    <button type="button" className="btn btn-primary" onClick={startNew}>
                        <Plus /> New plan
                    </button>
                </div>
            </div>

            <div className="plan-layout">
                <aside className="card">
                    <div className="card-head">
                        <h3>Select plan</h3>
                    </div>

                    <div className="plan-list">
                        {plans?.length ? (
                            plans.map((plan) => (
                                <button
                                    key={plan._id}
                                    type="button"
                                    className={`plan-item${plan._id === selectedId ? " is-active" : ""}`}
                                    onClick={() => openPlan(plan)}
                                >
                                    <span className="plan-item-name">{plan.name}</span>
                                    <span className="plan-item-meta">
                                        {titleCase(plan.planType)} · {plan.milestones?.length || 0} stages
                                    </span>
                                </button>
                            ))
                        ) : (
                            <EmptyState title="No plans yet" description="Create your first payment plan." />
                        )}
                    </div>
                </aside>

                <section className="card">
                    {!draft ? (
                        <EmptyState
                            title="Select a plan"
                            description="Pick a plan on the left, or create a new one."
                        />
                    ) : (
                        <>
                            <div className="card-head">
                                <h3>{selectedId === "new" ? "New payment plan" : draft.name || "Payment plan"}</h3>

                                <div style={{ display: "flex", gap: 8 }}>
                                    {selectedId !== "new" ? (
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setPendingDelete(draft)}
                                        >
                                            <Trash2 /> Delete
                                        </button>
                                    ) : null}

                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={save}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Spinner inline /> : <Save />}
                                        Save Plan
                                    </button>
                                </div>
                            </div>

                            <div className="card-pad">
                                <div className="form-grid">
                                    <Field label="Plan name">
                                        <input
                                            className="input"
                                            placeholder="e.g. Construction-linked"
                                            value={draft.name}
                                            onChange={(event) => setField("name", event.target.value)}
                                        />
                                    </Field>

                                    <Field label="Segment">
                                        <select
                                            className="select"
                                            value={draft.planType}
                                            onChange={(event) => setField("planType", event.target.value)}
                                        >
                                            {PLAN_TYPES.map((t) => (
                                                <option key={t.value} value={t.value}>
                                                    {t.label}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>

                                    <Field label="Project" hint="Leave blank to offer this plan everywhere">
                                        <select
                                            className="select"
                                            value={draft.project}
                                            onChange={(event) => setField("project", event.target.value)}
                                        >
                                            <option value="">All projects</option>
                                            {(projectList || []).map((p) => (
                                                <option key={p._id} value={p._id}>
                                                    {p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>

                                    <Field label="Availability">
                                        <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
                                            <input
                                                type="checkbox"
                                                className="checkbox"
                                                checked={Boolean(draft.isActive)}
                                                onChange={(event) => setField("isActive", event.target.checked)}
                                            />
                                            Offer this plan on new bookings
                                        </label>
                                    </Field>
                                </div>

                                <div className="stage-head">
                                    <h4>Stages</h4>

                                    <Badge tone={isBalanced ? "success" : "danger"}>
                                        {Math.round(total)}% of 100%
                                    </Badge>
                                </div>

                                {draft.milestones.length ? (
                                    <div className="stage-list">
                                        <div className="stage-row is-header">
                                            <span />
                                            <span>Stage name</span>
                                            <span>Percent of unit price</span>
                                            <span>Days after booking</span>
                                            <span />
                                        </div>

                                        {draft.milestones.map((stage, index) => (
                                            <div key={index} className="stage-row">
                                                <span className="stage-grip">
                                                    <GripVertical />
                                                </span>

                                                <input
                                                    className="input"
                                                    placeholder="e.g. On Possession"
                                                    value={stage.label}
                                                    onChange={(event) =>
                                                        setStage(index, { label: event.target.value })
                                                    }
                                                />

                                                <input
                                                    className="input mono"
                                                    inputMode="decimal"
                                                    value={stage.percentage}
                                                    onChange={(event) =>
                                                        setStage(index, { percentage: event.target.value })
                                                    }
                                                />

                                                <input
                                                    className="input mono"
                                                    inputMode="numeric"
                                                    value={stage.dueAfterDays}
                                                    onChange={(event) =>
                                                        setStage(index, { dueAfterDays: event.target.value })
                                                    }
                                                />

                                                <button
                                                    type="button"
                                                    className="row-action tone-danger"
                                                    onClick={() => removeStage(index)}
                                                    aria-label={`Remove stage ${index + 1}`}
                                                >
                                                    <Trash2 />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "18px 0" }}>
                                        No stages yet.
                                    </p>
                                )}

                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ marginTop: 14 }}
                                    onClick={addStage}
                                >
                                    <Plus /> Add Stage
                                </button>
                            </div>
                        </>
                    )}
                </section>
            </div>

            {pendingDelete ? (
                <ConfirmDialog
                    title="Delete this payment plan?"
                    message={`${pendingDelete.name} will be removed. Bookings already using it keep their schedule.`}
                    confirmLabel="Delete"
                    onConfirm={confirmDelete}
                    onCancel={() => setPendingDelete(null)}
                />
            ) : null}
        </>
    );
};

export default PaymentPlans;

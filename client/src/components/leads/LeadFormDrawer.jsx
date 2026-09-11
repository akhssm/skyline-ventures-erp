import { useState } from "react";

import { leads as leadsApi } from "../../api/resources";
import { useToast } from "../../context/ToastContext";
import { Drawer, Field, Spinner } from "../ui";
import { titleCase } from "../../utils/format";

const STAGES = [
    "new", "contacted", "prospect", "site_scheduled", "site_visited",
    "site_rescheduled", "negotiation", "booked", "lost", "not_qualified",
];

const SOURCES = [
    "website", "walk_in", "facebook", "instagram", "google_ads",
    "magicbricks", "99acres", "housing", "channel_partner", "referral", "other",
];

const TYPES = ["buyer", "investor", "tenant"];
const CATEGORIES = ["hot", "warm", "cold", "negotiation", "closure"];

// A date input needs yyyy-mm-dd, not an ISO timestamp.
const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

const emptyLead = {
    name: "",
    phone: "",
    email: "",
    project: "",
    stage: "new",
    source: "",
    leadType: "",
    category: "",
    budgetMin: "",
    budgetMax: "",
    requirement: "",
    assignedTo: "",
    nextFollowUpAt: "",
    notes: "",
};

const LeadFormDrawer = ({ lead, projects, agents, canAssign, onClose, onSaved }) => {
    const toast = useToast();
    const isEditing = Boolean(lead?._id);

    const [form, setForm] = useState(() =>
        lead
            ? {
                  ...emptyLead,
                  ...lead,
                  project: lead.project?._id || lead.project || "",
                  assignedTo: lead.assignedTo?._id || lead.assignedTo || "",
                  nextFollowUpAt: toDateInput(lead.nextFollowUpAt),
              }
            : emptyLead
    );

    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    const set = (field) => (event) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const validate = () => {
        const next = {};

        if (!form.name.trim()) next.name = "Name is required";
        if (!/^[6-9]\d{9}$/.test(form.phone)) next.phone = "Enter a valid 10-digit mobile number";
        if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email";

        if (form.budgetMin && form.budgetMax && Number(form.budgetMin) > Number(form.budgetMax)) {
            next.budgetMax = "Maximum must be at least the minimum";
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const submit = async (event) => {
        event.preventDefault();

        if (!validate()) return;

        setIsSaving(true);

        // Empty strings would fail the enum validators, so they are dropped.
        const payload = Object.fromEntries(
            Object.entries({
                ...form,
                budgetMin: form.budgetMin ? Number(form.budgetMin) : 0,
                budgetMax: form.budgetMax ? Number(form.budgetMax) : 0,
            }).filter(([, value]) => value !== "" && value !== null && value !== undefined)
        );

        delete payload._id;
        delete payload.duplicateCount;
        delete payload.siteVisitStatus;

        try {
            if (isEditing) await leadsApi.update(lead._id, payload);
            else await leadsApi.create(payload);

            toast.success(isEditing ? "Lead updated" : "Lead created");
            onSaved();
        } catch (err) {
            toast.error("Could not save the lead", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Drawer
            title={isEditing ? "Edit lead" : "New lead"}
            description={isEditing ? form.name : "Capture a new enquiry"}
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="submit"
                        form="lead-form"
                        className="btn btn-primary"
                        disabled={isSaving}
                    >
                        {isSaving ? <Spinner inline /> : null}
                        {isEditing ? "Save changes" : "Create lead"}
                    </button>
                </>
            }
        >
            <form id="lead-form" className="form-grid" onSubmit={submit} noValidate>
                <Field label="Full name" error={errors.name}>
                    <input className="input" value={form.name} onChange={set("name")} autoFocus />
                </Field>

                <Field label="Mobile number" error={errors.phone}>
                    <input
                        className="input mono"
                        inputMode="numeric"
                        maxLength={10}
                        value={form.phone}
                        onChange={(event) =>
                            setForm((c) => ({
                                ...c,
                                phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                            }))
                        }
                    />
                </Field>

                <Field label="Email" error={errors.email}>
                    <input className="input" type="email" value={form.email} onChange={set("email")} />
                </Field>

                <Field label="Project">
                    <select className="select" value={form.project} onChange={set("project")}>
                        <option value="">Not decided</option>
                        {projects.map((project) => (
                            <option key={project._id} value={project._id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Stage">
                    <select className="select" value={form.stage} onChange={set("stage")}>
                        {STAGES.map((stage) => (
                            <option key={stage} value={stage}>
                                {titleCase(stage)}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Source">
                    <select className="select" value={form.source} onChange={set("source")}>
                        <option value="">Unknown</option>
                        {SOURCES.map((source) => (
                            <option key={source} value={source}>
                                {titleCase(source)}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Type">
                    <select className="select" value={form.leadType} onChange={set("leadType")}>
                        <option value="">Not set</option>
                        {TYPES.map((type) => (
                            <option key={type} value={type}>
                                {titleCase(type)}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Category">
                    <select className="select" value={form.category} onChange={set("category")}>
                        <option value="">Not set</option>
                        {CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                                {titleCase(category)}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Budget from" hint="In rupees">
                    <input
                        className="input mono"
                        inputMode="numeric"
                        value={form.budgetMin}
                        onChange={set("budgetMin")}
                    />
                </Field>

                <Field label="Budget to" error={errors.budgetMax}>
                    <input
                        className="input mono"
                        inputMode="numeric"
                        value={form.budgetMax}
                        onChange={set("budgetMax")}
                    />
                </Field>

                <Field label="Requirement">
                    <input
                        className="input"
                        placeholder="3BHK, east facing"
                        value={form.requirement}
                        onChange={set("requirement")}
                    />
                </Field>

                <Field label="Next follow-up">
                    <input
                        className="input"
                        type="date"
                        value={form.nextFollowUpAt}
                        onChange={set("nextFollowUpAt")}
                    />
                </Field>

                {canAssign ? (
                    <Field label="Assigned agent" full>
                        <select className="select" value={form.assignedTo} onChange={set("assignedTo")}>
                            <option value="">Unassigned</option>
                            {agents.map((agent) => (
                                <option key={agent._id} value={agent._id}>
                                    {agent.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                ) : null}

                <Field label="Notes" full>
                    <textarea className="textarea" value={form.notes} onChange={set("notes")} />
                </Field>
            </form>
        </Drawer>
    );
};

export default LeadFormDrawer;

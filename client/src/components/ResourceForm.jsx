import { useState } from "react";

import { useToast } from "../context/ToastContext";
import { Drawer, Field, Spinner } from "./ui";

/** ISO timestamp to the yyyy-mm-dd a date input expects. */
const toDateInput = (value) => {
    if (!value) return "";

    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

const initialValue = (field, record) => {
    const raw = record?.[field.name];

    if (field.type === "date") return toDateInput(raw);

    // A populated reference arrives as an object; the select needs its id.
    if (field.type === "reference") return raw?._id || raw || "";

    if (field.type === "checkbox") return Boolean(raw ?? field.defaultValue ?? false);

    return raw ?? field.defaultValue ?? "";
};

/**
 * Renders a create or edit form from a field description list, so every
 * module gets working CRUD without a bespoke form component.
 *
 * Field shape:
 *   { name, label, type, options, required, hint, full, min, max, optionsFrom }
 *   type: text | number | currency | phone | email | date | textarea |
 *         select | reference | checkbox
 */
const ResourceForm = ({ resource, record, fields, title, lookups = {}, onClose, onSaved }) => {
    const toast = useToast();
    const isEditing = Boolean(record?._id);

    const [values, setValues] = useState(() =>
        Object.fromEntries(fields.map((field) => [field.name, initialValue(field, record)]))
    );

    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    const set = (name, value) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const validate = () => {
        const next = {};

        fields.forEach((field) => {
            const value = values[field.name];

            if (field.required && (value === "" || value === null || value === undefined)) {
                next[field.name] = `${field.label} is required`;
                return;
            }

            if (!value) return;

            if (field.type === "phone" && !/^[6-9]\d{9}$/.test(value)) {
                next[field.name] = "Enter a valid 10-digit mobile number";
            }

            if (field.type === "email" && !/^\S+@\S+\.\S+$/.test(value)) {
                next[field.name] = "Enter a valid email address";
            }

            if ((field.type === "number" || field.type === "currency") && Number.isNaN(Number(value))) {
                next[field.name] = "Enter a number";
            }
        });

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const submit = async (event) => {
        event.preventDefault();

        if (!validate()) return;

        setIsSaving(true);

        const payload = {};

        fields.forEach((field) => {
            const value = values[field.name];

            // Empty strings would trip the enum validators on the server.
            if (value === "" || value === null || value === undefined) return;

            payload[field.name] =
                field.type === "number" || field.type === "currency" ? Number(value) : value;
        });

        try {
            if (isEditing) await resource.update(record._id, payload);
            else await resource.create(payload);

            toast.success(isEditing ? "Changes saved" : "Record created");
            onSaved();
        } catch (err) {
            toast.error("Could not save", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const renderControl = (field) => {
        const value = values[field.name];

        if (field.type === "textarea") {
            return (
                <textarea
                    className="textarea"
                    value={value}
                    onChange={(event) => set(field.name, event.target.value)}
                />
            );
        }

        if (field.type === "checkbox") {
            return (
                <label style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 400 }}>
                    <input
                        type="checkbox"
                        className="checkbox"
                        checked={Boolean(value)}
                        onChange={(event) => set(field.name, event.target.checked)}
                    />
                    {field.checkboxLabel || "Enabled"}
                </label>
            );
        }

        if (field.type === "select" || field.type === "reference") {
            // A reference draws its options from the lookups the page loaded.
            const options =
                field.type === "reference"
                    ? (lookups[field.optionsFrom] || []).map((item) => ({
                          value: item._id,
                          label: field.optionLabel ? field.optionLabel(item) : item.name,
                      }))
                    : field.options;

            return (
                <select
                    className="select"
                    value={value}
                    onChange={(event) => set(field.name, event.target.value)}
                >
                    <option value="">{field.placeholder || "Not set"}</option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            );
        }

        if (field.type === "phone") {
            return (
                <input
                    className="input mono"
                    inputMode="numeric"
                    maxLength={10}
                    value={value}
                    onChange={(event) =>
                        set(field.name, event.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                />
            );
        }

        return (
            <input
                className={`input${field.type === "currency" || field.type === "number" ? " mono" : ""}`}
                type={field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
                inputMode={field.type === "currency" || field.type === "number" ? "numeric" : undefined}
                value={value}
                placeholder={field.placeholder}
                onChange={(event) => set(field.name, event.target.value)}
            />
        );
    };

    return (
        <Drawer
            title={isEditing ? `Edit ${title}` : `New ${title}`}
            description={isEditing ? record.name || record.title || record._id : undefined}
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="submit"
                        form="resource-form"
                        className="btn btn-primary"
                        disabled={isSaving}
                    >
                        {isSaving ? <Spinner inline /> : null}
                        {isEditing ? "Save changes" : "Create"}
                    </button>
                </>
            }
        >
            <form id="resource-form" className="form-grid" onSubmit={submit} noValidate>
                {fields.map((field) => (
                    <Field
                        key={field.name}
                        label={field.label}
                        hint={field.hint}
                        error={errors[field.name]}
                        full={field.full || field.type === "textarea"}
                    >
                        {renderControl(field)}
                    </Field>
                ))}
            </form>
        </Drawer>
    );
};

export default ResourceForm;

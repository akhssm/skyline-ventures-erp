import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { vendors as vendorsApi } from "../../api/resources";
import { useAsyncData } from "../../hooks/useResource";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ROLES } from "../../config/navigation";
import { ConfirmDialog, ErrorState, Field, LoadingState, Modal, Spinner } from "../../components/ui";
import ConfigBack from "../../components/config/ConfigBack";

const EDITOR_ROLES = [ROLES.PROPERTY_OWNER, ROLES.SYSTEM_OPERATOR, ROLES.ACCOUNTANT];

const BLANK = { name: "", contactPerson: "", phone: "", vehicleNumber: "" };

/**
 * The cab operators and drivers a site visit can be booked against. The
 * name, vehicle and phone go into the message the lead receives, so a phone
 * number that cannot be dialled is worse than none at all: it is optional,
 * but checked when given.
 */
const VendorConfig = () => {
    const toast = useToast();
    const { user } = useAuth();

    const { data, isLoading, error, refetch } = useAsyncData(
        () => vendorsApi.list({ limit: 200, sort: "name" }),
        []
    );

    const [rows, setRows] = useState([]);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(BLANK);
    const [submitted, setSubmitted] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (data) setRows(Array.isArray(data) ? data : data.rows || data.items || []);
    }, [data]);

    const canEdit = EDITOR_ROLES.includes(user.role);

    const nameError = submitted && !form.name.trim() ? "Vendor name is required" : null;

    // Blank is allowed; anything else has to be a number somebody can ring.
    const phoneError =
        submitted && form.phone.trim() && !/^\d{10}$/.test(form.phone.trim())
            ? "Enter a valid 10-digit mobile number, or leave it blank"
            : null;

    const openAdd = () => {
        setEditing({ id: null });
        setForm(BLANK);
        setSubmitted(false);
    };

    const openEdit = (row) => {
        setEditing({ id: row._id });
        setForm({
            name: row.name || "",
            contactPerson: row.contactPerson || "",
            phone: row.phone || "",
            vehicleNumber: row.vehicleNumber || "",
        });
        setSubmitted(false);
    };

    const save = async () => {
        setSubmitted(true);

        if (!form.name.trim()) return;
        if (form.phone.trim() && !/^\d{10}$/.test(form.phone.trim())) return;

        setIsSaving(true);

        const payload = {
            name: form.name.trim(),
            contactPerson: form.contactPerson.trim(),
            phone: form.phone.trim(),
            vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
        };

        try {
            if (editing.id) await vendorsApi.update(editing.id, payload);
            else await vendorsApi.create(payload);

            toast.success("Vendor saved");
            setEditing(null);
            refetch();
        } catch (err) {
            toast.error("Something went wrong", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const remove = async () => {
        setIsSaving(true);

        try {
            await vendorsApi.remove(pendingDelete._id);
            toast.success("Vendor deleted");
            setPendingDelete(null);
            refetch();
        } catch (err) {
            toast.error("Something went wrong", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (error) return <ErrorState message={error} onRetry={refetch} />;
    if (isLoading && !data) return <LoadingState label="Loading cabs and drivers" />;

    return (
        <div className="cfg-shell">
            <header className="cfg-head">
                <div className="cfg-head__lead">
                    <ConfigBack />

                    <nav className="cfg-crumbs">
                        <Link to="/layout/configuration">Configuration</Link>
                        <ChevronRight />
                        <span>Cabs &amp; Drivers</span>
                    </nav>

                    <h1 className="cfg-title">Cabs &amp; Drivers</h1>

                    <p className="cfg-sub">
                        <b className="mono">{rows.length}</b> vendors · chosen when scheduling a site
                        visit. The name, vehicle and phone go into the message the lead receives.
                    </p>
                </div>

                {canEdit ? (
                    <div className="cfg-head__actions">
                        <button type="button" className="btn btn-primary" onClick={openAdd}>
                            <Plus /> Add vendor
                        </button>
                    </div>
                ) : null}
            </header>

            <div className="card">
                {rows.length ? (
                    <div className="table-scroll">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Vendor</th>
                                    <th>Contact</th>
                                    <th>Phone</th>
                                    <th>Vehicle</th>
                                    <th style={{ width: 170 }} />
                                </tr>
                            </thead>

                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row._id}>
                                        <td>{row.name}</td>
                                        <td>{row.contactPerson || "—"}</td>
                                        <td className="mono">{row.phone || "—"}</td>
                                        <td className="mono">{row.vehicleNumber || "—"}</td>

                                        <td className="cfg-row-actions">
                                            {canEdit ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => openEdit(row)}
                                                    >
                                                        <Pencil /> Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => setPendingDelete(row)}
                                                    >
                                                        <Trash2 /> Delete
                                                    </button>
                                                </>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="card-pad">
                        <div className="state">
                            <b>No cabs or drivers yet</b>
                            <p>
                                Add the operators you use to take leads to site, and they become
                                selectable when scheduling a visit.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {editing ? (
                <Modal
                    title={editing.id ? "Edit Vendor" : "Add Vendor"}
                    description="A cab operator or driver who takes leads to site"
                    onClose={() => setEditing(null)}
                    footer={
                        <>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setEditing(null)}
                                disabled={isSaving}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={save}
                                disabled={isSaving}
                            >
                                {isSaving ? <Spinner inline /> : null}
                                {isSaving ? "Saving…" : editing.id ? "Update" : "Create"}
                            </button>
                        </>
                    }
                >
                    <div className="form-grid">
                        <Field label="Vendor name" error={nameError} full>
                            <input
                                className="input"
                                autoFocus
                                value={form.name}
                                placeholder="e.g. City Cabs"
                                onChange={(event) =>
                                    setForm((current) => ({ ...current, name: event.target.value }))
                                }
                            />
                        </Field>

                        <Field label="Contact person">
                            <input
                                className="input"
                                value={form.contactPerson}
                                placeholder="e.g. Ramesh"
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        contactPerson: event.target.value,
                                    }))
                                }
                            />
                        </Field>

                        <Field label="Phone" error={phoneError}>
                            <input
                                className="input mono"
                                inputMode="numeric"
                                value={form.phone}
                                placeholder="10-digit mobile"
                                onChange={(event) =>
                                    setForm((current) => ({ ...current, phone: event.target.value }))
                                }
                            />
                        </Field>

                        <Field label="Vehicle number">
                            <input
                                className="input mono"
                                value={form.vehicleNumber}
                                placeholder="e.g. TS09AB1234"
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        vehicleNumber: event.target.value,
                                    }))
                                }
                            />
                        </Field>
                    </div>
                </Modal>
            ) : null}

            {pendingDelete ? (
                <ConfirmDialog
                    title="Delete this vendor?"
                    message={`${pendingDelete.name} stops being offered when a site visit is scheduled. Visits already booked against them are unaffected.`}
                    confirmLabel="Delete"
                    isBusy={isSaving}
                    onConfirm={remove}
                    onCancel={() => setPendingDelete(null)}
                />
            ) : null}
        </div>
    );
};

export default VendorConfig;

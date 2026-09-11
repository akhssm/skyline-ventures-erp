import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { configuration as configApi } from "../../api/resources";
import { useAsyncData } from "../../hooks/useResource";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ROLES } from "../../config/navigation";
import {
    Badge,
    ConfirmDialog,
    ErrorState,
    Field,
    LoadingState,
    Modal,
    Spinner,
} from "../ui";
import ConfigBack from "./ConfigBack";

/* Writing is limited to the roles the server lets through PATCH
   /configuration, so no button is offered that the API would refuse. */
const EDITOR_ROLES = [ROLES.PROPERTY_OWNER, ROLES.SYSTEM_OPERATOR, ROLES.ACCOUNTANT];

/**
 * One editable list of short strings, presented as a table with an add and
 * edit dialog. Every screen under Configuration that manages a single
 * vocabulary is this component with different copy.
 *
 * `builtIn` names values that ship with the product. They are listed so the
 * dropdown a user sees here matches the one the forms offer, but they cannot
 * be renamed or removed, because they are not stored per organisation.
 */
const ListConfigPage = ({
    // Copy
    title,
    breadcrumb,
    tagline,
    noun,
    nounPlural,
    columnHeader,
    addLabel,
    dialogDescription,
    placeholder,
    emptyTitle,
    emptyDescription,
    deleteWarning,
    intro,
    // Data
    field,
    builtIn = [],
}) => {
    const toast = useToast();
    const { user } = useAuth();

    const { data, isLoading, error, refetch } = useAsyncData(() => configApi.get(), []);

    const [values, setValues] = useState([]);
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (data) setValues(data[field] || []);
    }, [data, field]);

    const canEdit = EDITOR_ROLES.includes(user.role);

    /* Built-in rows first, then the organisation's own, so the shared part of
       the list reads as the foundation it is. */
    const rows = useMemo(
        () => [
            ...builtIn.map((value) => ({ value, isBuiltIn: true })),
            ...values.map((value) => ({ value, isBuiltIn: false })),
        ],
        [builtIn, values]
    );

    /* Every value on screen, used to reject a duplicate before it is saved.
       Matching ignores case so "East" and "east" cannot both feed a
       dropdown. */
    const taken = useMemo(
        () => new Set(rows.map((row) => row.value.toLowerCase())),
        [rows]
    );

    const openAdd = () => {
        setEditing({ original: null });
        setDraft("");
        setSubmitted(false);
    };

    const openEdit = (row) => {
        setEditing({ original: row.value });
        setDraft(row.value);
        setSubmitted(false);
    };

    const close = () => {
        setEditing(null);
        setSubmitted(false);
    };

    /* One PATCH per change. Only this list is sent, so a save here never
       writes back the settings another screen is holding. */
    const persist = async (next, message) => {
        setIsSaving(true);

        try {
            await configApi.update({ [field]: next });
            setValues(next);
            toast.success(message);
            refetch();
            return true;
        } catch (err) {
            toast.error("Could not save", err.message);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const save = async () => {
        setSubmitted(true);

        const value = draft.trim();
        if (!value) return;

        // An unchanged name is a no-op rather than an error.
        if (editing.original && editing.original === value) {
            close();
            return;
        }

        if (taken.has(value.toLowerCase())) {
            toast.error(`${columnHeader} already exists`, `"${value}" is already on this list.`);
            return;
        }

        const next = editing.original
            ? values.map((item) => (item === editing.original ? value : item))
            : [...values, value];

        const saved = await persist(next, editing.original ? `${noun} updated` : `${noun} saved`);
        if (saved) close();
    };

    const remove = async () => {
        const next = values.filter((item) => item !== pendingDelete.value);

        const saved = await persist(next, `${noun} deleted`);
        if (saved) setPendingDelete(null);
    };

    if (error) return <ErrorState message={error} onRetry={refetch} />;
    if (isLoading && !data) return <LoadingState label={`Loading ${nounPlural.toLowerCase()}`} />;

    const ownCount = values.length;

    return (
        <div className="cfg-shell">
            <header className="cfg-head">
                <div className="cfg-head__lead">
                    <ConfigBack />

                    <nav className="cfg-crumbs">
                        <Link to="/layout/configuration">Configuration</Link>
                        <ChevronRight />
                        <span>{breadcrumb || title}</span>
                    </nav>

                    <h1 className="cfg-title">{title}</h1>

                    <p className="cfg-sub">
                        <b className="mono">{rows.length}</b>{" "}
                        {rows.length === 1 ? noun.toLowerCase() : nounPlural.toLowerCase()}
                        {builtIn.length ? ` available · ${ownCount} yours` : ""}
                        {tagline ? ` · ${tagline}` : ""}
                    </p>
                </div>

                {canEdit ? (
                    <div className="cfg-head__actions">
                        <button type="button" className="btn btn-primary" onClick={openAdd}>
                            <Plus /> {addLabel}
                        </button>
                    </div>
                ) : null}
            </header>

            {intro ? <p className="page-note">{intro}</p> : null}

            <div className="card">
                {rows.length ? (
                    <div className="table-scroll">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{columnHeader}</th>
                                    <th style={{ width: 120 }}>Source</th>
                                    <th style={{ width: 170 }} />
                                </tr>
                            </thead>

                            <tbody>
                                {rows.map((row) => (
                                    <tr key={`${row.isBuiltIn ? "builtin" : "own"}-${row.value}`}>
                                        <td>{row.value}</td>

                                        <td>
                                            <Badge tone={row.isBuiltIn ? "neutral" : "info"}>
                                                {row.isBuiltIn ? "Built in" : "Yours"}
                                            </Badge>
                                        </td>

                                        <td className="cfg-row-actions">
                                            {row.isBuiltIn ? (
                                                <span className="cfg-muted">Shared list</span>
                                            ) : canEdit ? (
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
                            <b>{emptyTitle}</b>
                            <p>{emptyDescription}</p>
                        </div>
                    </div>
                )}
            </div>

            {editing ? (
                <Modal
                    title={editing.original ? `Edit ${noun}` : `Add ${noun}`}
                    description={dialogDescription}
                    onClose={close}
                    footer={
                        <>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={close}
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
                                {isSaving ? "Saving…" : editing.original ? "Update" : "Create"}
                            </button>
                        </>
                    }
                >
                    <Field
                        label={columnHeader}
                        error={submitted && !draft.trim() ? `${columnHeader} is required` : null}
                    >
                        <input
                            className="input"
                            autoFocus
                            value={draft}
                            placeholder={placeholder}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    save();
                                }
                            }}
                        />
                    </Field>
                </Modal>
            ) : null}

            {pendingDelete ? (
                <ConfirmDialog
                    title={`Delete this ${noun.toLowerCase()}?`}
                    message={`${pendingDelete.value} ${deleteWarning}`}
                    confirmLabel="Delete"
                    isBusy={isSaving}
                    onConfirm={remove}
                    onCancel={() => setPendingDelete(null)}
                />
            ) : null}
        </div>
    );
};

export default ListConfigPage;

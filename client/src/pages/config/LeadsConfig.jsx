import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";

import { configuration as configApi } from "../../api/resources";
import { useAsyncData } from "../../hooks/useResource";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ROLES } from "../../config/navigation";
import {
    ConfirmDialog,
    ErrorState,
    Field,
    LoadingState,
    Modal,
    SearchInput,
    Spinner,
} from "../../components/ui";
import ConfigBack from "../../components/config/ConfigBack";

const EDITOR_ROLES = [ROLES.PROPERTY_OWNER, ROLES.SYSTEM_OPERATOR, ROLES.ACCOUNTANT];

/* The three lists the leads console picks from. Stages carry an order,
   because the order they are stored in is the order every stage dropdown
   and the lead detail header show them in. */
const TABS = [
    {
        id: "stages",
        label: "Stages",
        field: "leadStages",
        noun: "Lead Stage",
        column: "Stage",
        ordered: true,
        placeholder: "e.g. site_visit_done",
    },
    {
        id: "sources",
        label: "Sources",
        field: "leadSources",
        noun: "Lead Source",
        column: "Source",
        ordered: false,
        placeholder: "e.g. 99acres",
    },
    {
        id: "categories",
        label: "Categories",
        field: "leadCategories",
        noun: "Lead Category",
        column: "Category",
        ordered: false,
        placeholder: "e.g. Investor",
    },
];

const LeadsConfig = () => {
    const toast = useToast();
    const { user } = useAuth();

    const { data, isLoading, error, refetch } = useAsyncData(() => configApi.get(), []);

    const [tabId, setTabId] = useState("stages");
    const [lists, setLists] = useState({});
    const [autoAssign, setAutoAssign] = useState(false);
    const [search, setSearch] = useState("");
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!data) return;

        setLists({
            leadStages: data.leadStages || [],
            leadSources: data.leadSources || [],
            leadCategories: data.leadCategories || [],
        });
        setAutoAssign(Boolean(data.autoAssignLeads));
    }, [data]);

    const tab = TABS.find((entry) => entry.id === tabId);
    const canEdit = EDITOR_ROLES.includes(user.role);
    const values = lists[tab.field] || [];

    /* Searching filters what is shown but never what is saved: a reorder or
       a delete always works against the full list. */
    const visible = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return values;

        return values.filter((value) => value.toLowerCase().includes(needle));
    }, [values, search]);

    const persist = async (field, next, message) => {
        setIsSaving(true);

        try {
            await configApi.update({ [field]: next });
            setLists((current) => ({ ...current, [field]: next }));
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

        if (editing.original === value) {
            setEditing(null);
            return;
        }

        if (values.some((item) => item.toLowerCase() === value.toLowerCase())) {
            toast.error(`${tab.noun} already exists`, `"${value}" is already on this list.`);
            return;
        }

        const next = editing.original
            ? values.map((item) => (item === editing.original ? value : item))
            : [...values, value];

        const saved = await persist(
            tab.field,
            next,
            editing.original ? `${tab.noun} updated` : `${tab.noun} saved`
        );

        if (saved) setEditing(null);
    };

    const remove = async () => {
        const next = values.filter((item) => item !== pendingDelete);
        const saved = await persist(tab.field, next, `${tab.noun} deleted`);

        if (saved) setPendingDelete(null);
    };

    /* Display order only. Moving a stage never changes which stage an action
       sets, only where it appears in the list. */
    const move = (value, direction) => {
        const index = values.indexOf(value);
        const target = index + direction;

        if (index < 0 || target < 0 || target >= values.length) return;

        const next = [...values];
        next[index] = next[target];
        next[target] = value;

        persist(tab.field, next, "Stage order saved");
    };

    const toggleAutoAssign = async (checked) => {
        setAutoAssign(checked);
        setIsSaving(true);

        try {
            await configApi.update({ autoAssignLeads: checked });
            toast.success(checked ? "New leads distribute automatically" : "New leads land in Unassigned");
            refetch();
        } catch (err) {
            setAutoAssign(!checked);
            toast.error("Could not change lead distribution. It is unchanged.", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (error) return <ErrorState message={error} onRetry={refetch} />;
    if (isLoading && !data) return <LoadingState label="Loading lead configuration" />;

    return (
        <div className="cfg-shell">
            <header className="cfg-head">
                <div className="cfg-head__lead">
                    <ConfigBack />

                    <nav className="cfg-crumbs">
                        <Link to="/layout/configuration">Configuration</Link>
                        <ChevronRight />
                        <span>Lead Config</span>
                    </nav>

                    <h1 className="cfg-title">Lead Configuration</h1>

                    <p className="cfg-sub">the lists your team picks from</p>
                </div>

                {canEdit ? (
                    <div className="cfg-head__actions">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                                setEditing({ original: null });
                                setDraft("");
                                setSubmitted(false);
                            }}
                        >
                            <Plus /> Add {tab.label.slice(0, -1).toLowerCase()}
                        </button>
                    </div>
                ) : null}
            </header>

            <section className="config-section">
                <h2 className="section-title">Lead distribution</h2>

                <div className="card">
                    <div className="card-pad">
                        <label className="check-line">
                            <input
                                type="checkbox"
                                className="checkbox"
                                checked={autoAssign}
                                disabled={!canEdit || isSaving}
                                onChange={(event) => toggleAutoAssign(event.target.checked)}
                            />
                            Distribute new leads automatically
                        </label>

                        <p className="config-hint">
                            {autoAssign
                                ? "Each new lead goes to the CRM Executive on its project who has waited longest for one."
                                : "New leads land in Unassigned and a manager assigns them."}
                        </p>
                    </div>
                </div>
            </section>

            <section className="config-section">
                <div className="cfg-toolbar">
                    <div className="segmented">
                        {TABS.map((entry) => (
                            <button
                                key={entry.id}
                                type="button"
                                className={entry.id === tabId ? "is-active" : ""}
                                onClick={() => {
                                    setTabId(entry.id);
                                    setSearch("");
                                }}
                            >
                                {entry.label}
                            </button>
                        ))}
                    </div>

                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder={`Search ${tab.label.toLowerCase()}`}
                    />
                </div>

                {tab.ordered ? (
                    <p className="page-note">
                        Use the arrows to change the order a stage appears in on lead detail and in
                        every stage dropdown. This changes display order only — it never changes
                        which stage an action sets.
                    </p>
                ) : null}

                <div className="card">
                    {visible.length ? (
                        <div className="table-scroll">
                            <table className="table">
                                <thead>
                                    <tr>
                                        {tab.ordered ? <th style={{ width: 70 }}>Order</th> : null}
                                        <th>{tab.column}</th>
                                        <th style={{ width: 250 }} />
                                    </tr>
                                </thead>

                                <tbody>
                                    {visible.map((value) => {
                                        const index = values.indexOf(value);

                                        return (
                                            <tr key={value}>
                                                {tab.ordered ? (
                                                    <td className="mono">{index + 1}</td>
                                                ) : null}

                                                <td>{value}</td>

                                                <td className="cfg-row-actions">
                                                    {canEdit ? (
                                                        <>
                                                            {tab.ordered ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        className="icon-button"
                                                                        aria-label="Move up"
                                                                        disabled={index === 0 || isSaving}
                                                                        onClick={() => move(value, -1)}
                                                                    >
                                                                        <ChevronUp />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className="icon-button"
                                                                        aria-label="Move down"
                                                                        disabled={
                                                                            index === values.length - 1 ||
                                                                            isSaving
                                                                        }
                                                                        onClick={() => move(value, 1)}
                                                                    >
                                                                        <ChevronDown />
                                                                    </button>
                                                                </>
                                                            ) : null}

                                                            <button
                                                                type="button"
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => {
                                                                    setEditing({ original: value });
                                                                    setDraft(value);
                                                                    setSubmitted(false);
                                                                }}
                                                            >
                                                                <Pencil /> Edit
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => setPendingDelete(value)}
                                                            >
                                                                <Trash2 /> Delete
                                                            </button>
                                                        </>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="card-pad">
                            <div className="state">
                                <b>
                                    {search.trim()
                                        ? `No ${tab.label.toLowerCase()} match`
                                        : `No ${tab.label.toLowerCase()} yet`}
                                </b>

                                <p>
                                    {search.trim()
                                        ? "Nothing matches that search — try clearing it."
                                        : `Add a ${tab.column.toLowerCase()} to get started.`}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {editing ? (
                <Modal
                    title={editing.original ? `Update ${tab.noun}` : `Add ${tab.noun}`}
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
                                {isSaving ? "Saving…" : "Save changes"}
                            </button>
                        </>
                    }
                >
                    <Field
                        label={tab.noun}
                        error={submitted && !draft.trim() ? `Enter a ${tab.column.toLowerCase()}` : null}
                    >
                        <input
                            className="input"
                            autoFocus
                            value={draft}
                            placeholder={tab.placeholder}
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
                    title={`Delete this ${tab.column.toLowerCase()}?`}
                    message={`${pendingDelete} disappears from the ${tab.column.toLowerCase()} dropdown. Leads already using it keep the value they were saved with.`}
                    confirmLabel="Delete"
                    isBusy={isSaving}
                    onConfirm={remove}
                    onCancel={() => setPendingDelete(null)}
                />
            ) : null}
        </div>
    );
};

export default LeadsConfig;

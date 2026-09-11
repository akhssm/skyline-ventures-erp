import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CreditCard, Plus, SlidersHorizontal, Trash2 } from "lucide-react";

import {
    configuration as configApi,
    expenses as expensesApi,
    projects as projectsApi,
} from "../api/resources";
import { useAsyncData, useDebounced, useResource } from "../hooks/useResource";
import { useToast } from "../context/ToastContext";
import {
    Badge,
    ConfirmDialog,
    DataTable,
    Modal,
    Pagination,
    SearchInput,
    Spinner,
} from "../components/ui";
import ResourceForm from "../components/ResourceForm";
import { compactCurrency, currency, date, titleCase } from "../utils/format";

/* Capital spend builds the asset; operating spend runs the business. The
   original separates them because they are reported against differently. */
const TABS = [
    { id: "all", slug: "expenses", label: "All", categories: null },
    {
        id: "capex",
        slug: "capex",
        label: "Capex",
        categories: ["construction", "legal"],
    },
    {
        id: "opex",
        slug: "opex",
        label: "Opex",
        categories: ["marketing", "salary", "commission", "utilities", "office", "travel", "other"],
    },
];

const STATUS_TONE = {
    paid: "success",
    approved: "success",
    submitted: "warning",
    draft: "neutral",
    rejected: "danger",
};

const CategoryManager = ({ categories, onClose, onSaved }) => {
    const toast = useToast();

    const [list, setList] = useState(categories);
    const [draft, setDraft] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const add = () => {
        const value = draft.trim().toLowerCase().replace(/\s+/g, "_");
        if (!value || list.includes(value)) return;

        setList([...list, value]);
        setDraft("");
    };

    const save = async () => {
        setIsSaving(true);

        try {
            await configApi.update({ expenseCategories: list });
            toast.success("Categories saved");
            onSaved(list);
        } catch (err) {
            toast.error("Could not save", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            title="Manage Categories"
            description="Categories available when recording an expense."
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="button" className="btn btn-primary" onClick={save} disabled={isSaving}>
                        {isSaving ? <Spinner inline /> : null}
                        Save
                    </button>
                </>
            }
        >
            <div className="tag-editor">
                {list.map((c) => (
                    <span key={c} className="tag">
                        {titleCase(c)}
                        <button
                            type="button"
                            onClick={() => setList(list.filter((x) => x !== c))}
                            aria-label={`Remove ${c}`}
                        >
                            <Trash2 />
                        </button>
                    </span>
                ))}

                <input
                    value={draft}
                    placeholder="Add and press Enter"
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            add();
                        }
                    }}
                />
            </div>
        </Modal>
    );
};

const Expenses = () => {
    const { view } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const activeTab = TABS.find((t) => t.slug === (view || "expenses")) || TABS[0];

    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounced(searchTerm);

    const [projectId, setProjectId] = useState("");
    const [editing, setEditing] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [isManagingCategories, setIsManagingCategories] = useState(false);

    const list = useResource(expensesApi, { limit: 25 });

    const { data: projectList } = useAsyncData(() => projectsApi.list({ limit: 100, sort: "name" }), []);
    const { data: config, refetch: refetchConfig } = useAsyncData(() => configApi.get(), []);

    const categories = config?.expenseCategories?.length
        ? config.expenseCategories
        : ["marketing", "construction", "salary", "commission", "utilities", "legal", "office", "travel", "other"];

    useEffect(() => {
        list.setFilter({
            search: debouncedSearch || undefined,
            project: projectId || undefined,
            // Capex and Opex are category groups, sent as a comma list.
            category: activeTab.categories ? activeTab.categories.join(",") : undefined,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, projectId, activeTab.id]);

    const total = useMemo(
        () => list.items.reduce((sum, row) => sum + (row.amount || 0), 0),
        [list.items]
    );

    const confirmDelete = async () => {
        try {
            await expensesApi.remove(pendingDelete._id);
            toast.success("Expense deleted");
            setPendingDelete(null);
            list.refetch();
        } catch (err) {
            toast.error("Could not delete", err.message);
        }
    };

    const formFields = [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "vendor", label: "Vendor", type: "text" },
        { name: "project", label: "Project", type: "reference", optionsFrom: "projects" },
        {
            name: "category",
            label: "Category",
            type: "select",
            options: categories.map((c) => ({ value: c, label: titleCase(c) })),
        },
        { name: "amount", label: "Amount", type: "currency", required: true },
        { name: "gstAmount", label: "GST amount", type: "currency" },
        { name: "paidAt", label: "Paid on", type: "date" },
        {
            name: "mode",
            label: "Mode",
            type: "select",
            options: ["cash", "cheque", "neft", "rtgs", "upi", "card"].map((m) => ({
                value: m,
                label: titleCase(m),
            })),
        },
        { name: "invoiceNo", label: "Invoice number", type: "text" },
        {
            name: "status",
            label: "Status",
            type: "select",
            options: ["draft", "submitted", "approved", "rejected", "paid"].map((s) => ({
                value: s,
                label: titleCase(s),
            })),
        },
        { name: "remarks", label: "Remarks", type: "textarea" },
    ];

    return (
        <>
            <div className="page-head">
                <div>
                    <h1 className="page-title">Expenses</h1>
                    <div className="page-summary">
                        <span>
                            <b>{list.pagination.total.toLocaleString("en-IN")}</b> records
                        </span>
                        <span className="sep">·</span>
                        <span>
                            <b>{compactCurrency(total)}</b> on this page
                        </span>
                    </div>
                </div>

                <div className="page-actions">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setIsManagingCategories(true)}
                    >
                        <SlidersHorizontal /> Manage Categories
                    </button>

                    <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
                        <Plus /> New expense
                    </button>
                </div>
            </div>

            <div className="filters">
                <div className="booking-tabs" role="tablist">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={tab.id === activeTab.id}
                            className={`booking-tab${tab.id === activeTab.id ? " is-active" : ""}`}
                            onClick={() => navigate(`/layout/${tab.slug}`)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search title, vendor or invoice"
                />

                <select
                    className="select"
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                    aria-label="Select Project"
                >
                    <option value="">All Projects</option>
                    {(projectList || []).map((p) => (
                        <option key={p._id} value={p._id}>
                            {p.name}
                        </option>
                    ))}
                </select>

                <select
                    className="select"
                    value={list.params.status || ""}
                    onChange={(event) => list.setFilter({ status: event.target.value })}
                    aria-label="Filter by status"
                >
                    <option value="">All Statuses</option>
                    {["draft", "submitted", "approved", "rejected", "paid"].map((s) => (
                        <option key={s} value={s}>
                            {titleCase(s)}
                        </option>
                    ))}
                </select>
            </div>

            <div className="card">
                <DataTable
                    columns={[
                        {
                            key: "title",
                            header: "Expense",
                            sortKey: "title",
                            render: (row) => (
                                <div>
                                    <div className="record-name">{row.title}</div>
                                    <div className="record-sub">{row.invoiceNo || "No invoice"}</div>
                                </div>
                            ),
                        },
                        { key: "vendor", header: "Vendor" },
                        { key: "project", header: "Project", render: (row) => row.project?.name || "—" },
                        {
                            key: "category",
                            header: "Category",
                            render: (row) => <Badge tone="neutral">{titleCase(row.category)}</Badge>,
                        },
                        {
                            key: "amount",
                            header: "Amount",
                            className: "num",
                            sortKey: "amount",
                            render: (row) => <strong>{currency(row.amount)}</strong>,
                        },
                        {
                            key: "gstAmount",
                            header: "GST",
                            className: "num",
                            render: (row) => currency(row.gstAmount),
                        },
                        {
                            key: "paidAt",
                            header: "Paid",
                            className: "num",
                            sortKey: "paidAt",
                            render: (row) => date(row.paidAt),
                        },
                        {
                            key: "status",
                            header: "Status",
                            render: (row) => (
                                <Badge tone={STATUS_TONE[row.status] || "neutral"}>
                                    {titleCase(row.status)}
                                </Badge>
                            ),
                        },
                        {
                            key: "actions",
                            header: "Actions",
                            className: "col-actions",
                            render: (row) => (
                                <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        className="row-action tone-danger"
                                        onClick={() => setPendingDelete(row)}
                                        aria-label={`Delete ${row.title}`}
                                    >
                                        <Trash2 />
                                    </button>
                                </div>
                            ),
                        },
                    ]}
                    rows={list.items}
                    isLoading={list.isLoading}
                    error={list.error}
                    onRetry={list.refetch}
                    sort={list.sort}
                    onSort={list.toggleSort}
                    onRowClick={(row) => setEditing(row)}
                    emptyIcon={CreditCard}
                    emptyTitle="No expenses recorded"
                />

                <Pagination pagination={list.pagination} onPageChange={list.setPage} />
            </div>

            {editing ? (
                <ResourceForm
                    resource={expensesApi}
                    record={editing._id ? editing : null}
                    fields={formFields}
                    title="expense"
                    lookups={{ projects: projectList || [] }}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        list.refetch();
                    }}
                />
            ) : null}

            {isManagingCategories ? (
                <CategoryManager
                    categories={categories}
                    onClose={() => setIsManagingCategories(false)}
                    onSaved={() => {
                        setIsManagingCategories(false);
                        refetchConfig();
                    }}
                />
            ) : null}

            {pendingDelete ? (
                <ConfirmDialog
                    title="Delete this expense?"
                    message={`${pendingDelete.title} will be removed. This cannot be undone.`}
                    confirmLabel="Delete"
                    onConfirm={confirmDelete}
                    onCancel={() => setPendingDelete(null)}
                />
            ) : null}
        </>
    );
};

export default Expenses;

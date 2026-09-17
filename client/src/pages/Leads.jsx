import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, MessageCircle, Phone, Plus, Trash2, Upload, UserPlus, Users } from "lucide-react";

import { leads as leadsApi, projects as projectsApi, users as usersApi } from "../api/resources";
import { useAsyncData, useDebounced, useResource } from "../hooks/useResource";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ROLES, canAccess } from "../config/navigation";
import {
    Badge,
    ConfirmDialog,
    DataTable,
    Pagination,
    SearchInput,
} from "../components/ui";
import LeadFormDrawer from "../components/leads/LeadFormDrawer";
import AssignLeadsModal from "../components/leads/AssignLeadsModal";
import {
    date,
    number,
    phone as formatPhone,
    scoreBand,
    scoreBandLabel,
    titleCase,
} from "../utils/format";

/* ---------------------------------------------------------
   OPTION LISTS
   --------------------------------------------------------- */

const STAGES = [
    "new", "contacted", "prospect", "site_scheduled", "site_visited",
    "site_rescheduled", "negotiation", "booked", "lost", "not_qualified",
];

const SOURCES = [
    "website", "walk_in", "facebook", "instagram", "google_ads",
    "magicbricks", "99acres", "housing", "channel_partner", "referral", "other",
];

const CATEGORIES = ["hot", "warm", "cold", "negotiation", "closure"];

// Stage drives the colour of the pill in the table.
const STAGE_TONE = {
    booked: "brand",
    negotiation: "brand",
    site_scheduled: "info",
    site_rescheduled: "info",
    site_visited: "info",
    prospect: "info",
    contacted: "info",
    new: "info",
    lost: "danger",
    not_qualified: "neutral",
};

const SITE_VISIT_TONE = {
    completed: "success",
    pending: "warning",
    scheduled: "info",
    rescheduled: "info",
    cancelled: "danger",
    no_show: "danger",
};

/* ---------------------------------------------------------
   LEADS
   --------------------------------------------------------- */

const Leads = () => {
    const { user } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounced(searchTerm);

    // A dashboard tile can open this list already narrowed, e.g. ?ownership=unassigned.
    const [searchParams] = useSearchParams();
    const [ownership, setOwnership] = useState(() =>
        ["mine", "unassigned"].includes(searchParams.get("ownership"))
            ? searchParams.get("ownership")
            : "all"
    );
    const [selected, setSelected] = useState(new Set());
    const [editing, setEditing] = useState(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const list = useResource(leadsApi, { limit: 25 });
    const { data: stats, refetch: refetchStats } = useAsyncData(() => leadsApi.stats(), []);
    const { data: projectList } = useAsyncData(() => projectsApi.list({ limit: 100 }), []);

    // Only roles that may read the user list get the agent filter.
    const canSeeAgents = canAccess(user.role, "users") || user.role === ROLES.MARKETING_MANAGER;
    const { data: agentList } = useAsyncData(
        () => usersApi.list({ role: `${ROLES.MARKETING},${ROLES.MARKETING_MANAGER}`, limit: 100 }),
        [],
        { enabled: canSeeAgents }
    );

    // An executive's list is already scoped server-side, so they get no
    // ownership switch; managers and owners do.
    const showOwnership = user.role !== ROLES.MARKETING;

    useEffect(() => {
        list.setFilter({ search: debouncedSearch || undefined });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    useEffect(() => {
        list.setFilter({
            assignedTo:
                ownership === "mine" ? user.id : ownership === "unassigned" ? "null" : undefined,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ownership]);

    const refreshAll = () => {
        list.refetch();
        refetchStats();
        setSelected(new Set());
    };

    const confirmDelete = async () => {
        setIsDeleting(true);

        try {
            if (pendingDelete === "bulk") {
                await leadsApi.bulkRemove([...selected]);
                toast.success(`${selected.size} leads deleted`);
            } else {
                await leadsApi.remove(pendingDelete._id);
                toast.success("Lead deleted");
            }

            setPendingDelete(null);
            refreshAll();
        } catch (err) {
            toast.error("Could not delete", err.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const isOverdueFilterOn = Boolean(list.params.overdue);

    const columns = useMemo(
        () => [
            {
                key: "lead",
                header: "Lead",
                sortKey: "name",
                render: (row) => (
                    <div className="record">
                        <span className={`rail tone-${scoreBand(row.score)}`} />

                        <div>
                            <div className="record-name">
                                {row.name}
                                {row.duplicateCount > 1 ? (
                                    <Badge tone="warning">{row.duplicateCount} dupes</Badge>
                                ) : null}
                            </div>

                            <div className="record-sub">
                                {formatPhone(row.phone)}
                                {row.project?.name ? (
                                    <>
                                        <span className="dot">·</span>
                                        {row.project.name}
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                key: "score",
                header: "Score",
                sortKey: "score",
                render: (row) => (
                    <div className="score">
                        <b>{row.score}</b>
                        <span className={`band tone-${scoreBand(row.score)}`}>
                            {scoreBandLabel(row.score)}
                        </span>
                    </div>
                ),
            },
            {
                key: "stage",
                header: "Stage",
                render: (row) => (
                    <Badge tone={STAGE_TONE[row.stage] || "neutral"}>{titleCase(row.stage)}</Badge>
                ),
            },
            {
                key: "responseStatus",
                header: "Response",
                render: (row) =>
                    row.responseStatus ? (
                        <span className="muted">{titleCase(row.responseStatus)}</span>
                    ) : (
                        <span className="muted">—</span>
                    ),
            },
            {
                key: "leadType",
                header: "Type",
                render: (row) =>
                    row.leadType ? (
                        <Badge tone="neutral">{titleCase(row.leadType)}</Badge>
                    ) : (
                        <span className="muted">—</span>
                    ),
            },
            {
                key: "category",
                header: "Category",
                render: (row) =>
                    row.category ? (
                        <Badge tone="purple">{titleCase(row.category)}</Badge>
                    ) : (
                        <span className="muted">—</span>
                    ),
            },
            {
                key: "source",
                header: "Source",
                render: (row) =>
                    row.source ? titleCase(row.source) : <span className="muted">—</span>,
            },
            {
                key: "assignedTo",
                header: "Agent",
                render: (row) =>
                    row.assignedTo?.name || <span className="muted">Unassigned</span>,
            },
            {
                key: "siteVisit",
                header: "Site Visit",
                render: (row) =>
                    row.siteVisitStatus ? (
                        <Badge tone={SITE_VISIT_TONE[row.siteVisitStatus] || "neutral"}>
                            {titleCase(row.siteVisitStatus)}
                        </Badge>
                    ) : (
                        <span className="muted">—</span>
                    ),
            },
            {
                key: "nextFollowUpAt",
                header: "Next Follow-up",
                className: "num",
                sortKey: "nextFollowUpAt",
                render: (row) => {
                    if (!row.nextFollowUpAt) return <span className="muted">—</span>;

                    const isOverdue = new Date(row.nextFollowUpAt) < new Date();

                    return (
                        <span style={isOverdue ? { color: "var(--danger)" } : undefined}>
                            {date(row.nextFollowUpAt)}
                        </span>
                    );
                },
            },
            {
                key: "actions",
                header: "Actions",
                className: "col-actions",
                render: (row) => (
                    <div className="row-actions" onClick={(event) => event.stopPropagation()}>
                        <a
                            className="row-action"
                            href={`tel:+91${row.phone}`}
                            title={`Call ${row.name}`}
                            aria-label={`Call ${row.name}`}
                        >
                            <Phone />
                        </a>

                        <a
                            className="row-action tone-success"
                            href={`https://wa.me/91${row.phone}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Open WhatsApp"
                            aria-label={`WhatsApp ${row.name}`}
                        >
                            <MessageCircle />
                        </a>

                        <button
                            type="button"
                            className="row-action"
                            onClick={() => navigate(`/layout/quotation?lead=${row._id}`)}
                            title="Create quotation"
                            aria-label={`Create a quotation for ${row.name}`}
                        >
                            <FileText />
                        </button>

                        <button
                            type="button"
                            className="row-action tone-danger"
                            onClick={() => setPendingDelete(row)}
                            title="Delete lead"
                            aria-label={`Delete ${row.name}`}
                        >
                            <Trash2 />
                        </button>
                    </div>
                ),
            },
        ],
        [navigate]
    );

    return (
        <>
            <div className="page-head">
                <div>
                    <h1 className="page-title">Leads</h1>

                    {stats ? (
                        <div className="page-summary">
                            <span>
                                <b>{number(stats.total)}</b> total
                            </span>
                            <span className="sep">·</span>
                            <span style={{ color: "var(--danger)" }}>
                                <b>{number(stats.followUpOverdue)}</b> follow-up overdue
                            </span>
                            <span className="sep">·</span>
                            <span>
                                <b>{number(stats.hot)}</b> hot
                            </span>
                            <span className="sep">·</span>
                            <span>
                                <b>{number(stats.unqualified)}</b> unqualified
                            </span>
                        </div>
                    ) : null}
                </div>

                <div className="page-actions">
                    {selected.size > 0 ? (
                        <>
                            <span className="pagination-info">
                                <b>{selected.size}</b> selected
                            </span>

                            {canSeeAgents ? (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setIsAssigning(true)}
                                >
                                    <UserPlus /> Assign
                                </button>
                            ) : null}

                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setPendingDelete("bulk")}
                            >
                                <Trash2 /> Delete
                            </button>
                        </>
                    ) : null}

                    {canAccess(user.role, "importLeads") ? (
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate("/layout/import-leads")}
                        >
                            <Upload /> Import leads
                        </button>
                    ) : null}

                    <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
                        <Plus /> New lead
                    </button>
                </div>
            </div>

            <div className="filters">
                <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search name or phone"
                />

                {showOwnership ? (
                    <div className="chips" role="group" aria-label="Ownership">
                        {[
                            { id: "all", label: "All" },
                            { id: "mine", label: "Mine" },
                            { id: "unassigned", label: "Unassigned" },
                        ].map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                className={ownership === option.id ? "is-active" : ""}
                                onClick={() => setOwnership(option.id)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                ) : null}

                <button
                    type="button"
                    className={`pill-filter tone-danger${isOverdueFilterOn ? " is-active" : ""}`}
                    onClick={() => list.setFilter({ overdue: isOverdueFilterOn ? undefined : "true" })}
                    aria-pressed={isOverdueFilterOn}
                >
                    Follow-up overdue <b>{number(stats?.followUpOverdue ?? 0)}</b>
                </button>

                <button
                    type="button"
                    className={`pill-filter tone-neutral${list.params.minScore ? " is-active" : ""}`}
                    onClick={() =>
                        list.setFilter({
                            sort: list.params.minScore ? undefined : "-score",
                            minScore: list.params.minScore ? undefined : "80",
                        })
                    }
                    aria-pressed={Boolean(list.params.minScore)}
                >
                    Hot <b>{number(stats?.hot ?? 0)}</b>
                </button>

                <select
                    className="select"
                    value={list.params.stage || ""}
                    onChange={(event) => list.setFilter({ stage: event.target.value })}
                    aria-label="Filter by stage"
                >
                    <option value="">All Stages</option>
                    {STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                            {titleCase(stage)}
                        </option>
                    ))}
                </select>

                <select
                    className="select"
                    value={list.params.source || ""}
                    onChange={(event) => list.setFilter({ source: event.target.value })}
                    aria-label="Filter by source"
                >
                    <option value="">All Sources</option>
                    {SOURCES.map((source) => (
                        <option key={source} value={source}>
                            {titleCase(source)}
                        </option>
                    ))}
                </select>

                <select
                    className="select"
                    value={list.params.category || ""}
                    onChange={(event) => list.setFilter({ category: event.target.value })}
                    aria-label="Filter by category"
                >
                    <option value="">All Categories</option>
                    {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                            {titleCase(category)}
                        </option>
                    ))}
                </select>

                {canSeeAgents ? (
                    <select
                        className="select"
                        value={list.params.assignedTo || ""}
                        onChange={(event) => {
                            setOwnership("all");
                            list.setFilter({ assignedTo: event.target.value });
                        }}
                        aria-label="Filter by agent"
                    >
                        <option value="">All Agents</option>
                        {(agentList || []).map((agent) => (
                            <option key={agent._id} value={agent._id}>
                                {agent.name}
                            </option>
                        ))}
                    </select>
                ) : null}

                <select
                    className="select"
                    value={list.params.project || ""}
                    onChange={(event) => list.setFilter({ project: event.target.value })}
                    aria-label="Filter by project"
                >
                    <option value="">All Projects</option>
                    {(projectList || []).map((project) => (
                        <option key={project._id} value={project._id}>
                            {project.name}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                        setSearchTerm("");
                        setOwnership("all");
                        list.clearFilters();
                    }}
                >
                    Clear
                </button>
            </div>

            <div className="card">
                <DataTable
                    columns={columns}
                    rows={list.items}
                    isLoading={list.isLoading}
                    error={list.error}
                    onRetry={list.refetch}
                    sort={list.sort}
                    onSort={list.toggleSort}
                    selected={selected}
                    onSelect={setSelected}
                    onRowClick={(row) => setEditing(row)}
                    emptyIcon={Users}
                    emptyTitle="No leads match these filters"
                    emptyDescription="Clear a filter or add your first lead to get started."
                />

                <Pagination pagination={list.pagination} onPageChange={list.setPage} />
            </div>

            {editing ? (
                <LeadFormDrawer
                    lead={editing._id ? editing : null}
                    projects={projectList || []}
                    agents={agentList || []}
                    canAssign={canSeeAgents}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        refreshAll();
                    }}
                />
            ) : null}

            {isAssigning ? (
                <AssignLeadsModal
                    count={selected.size}
                    agents={agentList || []}
                    onClose={() => setIsAssigning(false)}
                    onAssign={async (agentId) => {
                        await leadsApi.bulkAssign([...selected], agentId);
                        toast.success(`${selected.size} leads assigned`);
                        setIsAssigning(false);
                        refreshAll();
                    }}
                />
            ) : null}

            {pendingDelete ? (
                <ConfirmDialog
                    title={pendingDelete === "bulk" ? "Delete selected leads?" : "Delete this lead?"}
                    message={
                        pendingDelete === "bulk"
                            ? `${selected.size} leads will be removed. This cannot be undone.`
                            : `${pendingDelete.name} will be removed from your pipeline. This cannot be undone.`
                    }
                    confirmLabel="Delete"
                    isBusy={isDeleting}
                    onConfirm={confirmDelete}
                    onCancel={() => setPendingDelete(null)}
                />
            ) : null}
        </>
    );
};

export default Leads;

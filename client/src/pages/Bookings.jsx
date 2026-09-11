import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Home, Phone, ShoppingCart, Undo2, Users } from "lucide-react";

import {
    bookings as bookingsApi,
    projects as projectsApi,
    users as usersApi,
} from "../api/resources";
import { useAsyncData, useDebounced, useResource } from "../hooks/useResource";
import { useToast } from "../context/ToastContext";
import { ROLES } from "../config/navigation";
import {
    Badge,
    ConfirmDialog,
    DataTable,
    Field,
    Modal,
    Pagination,
    SearchInput,
    Spinner,
} from "../components/ui";
import BookingDetailDrawer from "../components/bookings/BookingDetailDrawer";
import {
    compactCurrency,
    currency,
    date,
    number,
    percent,
    phone as formatPhone,
    titleCase,
} from "../utils/format";

/* The five tabs, and the route slug each maps to. */
const TABS = [
    { id: "pending", label: "Pending", slug: "pending-bookings", title: "Pending Bookings" },
    { id: "confirmed", label: "Confirmed", slug: "confirmed", title: "Confirmed Bookings" },
    { id: "completed", label: "Completed", slug: "completed", title: "Completed Bookings" },
    { id: "cancelled", label: "Cancelled", slug: "cancelled", title: "Cancelled Bookings" },
    { id: "refund", label: "Refunds", slug: "refunds", title: "Refunds" },
];

const OWNERSHIP = [
    { id: "all", label: "All" },
    { id: "assigned", label: "Assigned" },
    { id: "unassigned", label: "Unassigned" },
];

/* Where each booking stands against its payment schedule. */
const PAYMENT_FILTERS = [
    { id: "", label: "All payments", key: "all" },
    { id: "paid", label: "Paid", key: "paid" },
    { id: "partpaid", label: "Part-paid", key: "partpaid" },
    { id: "unpaid", label: "Unpaid", key: "unpaid" },
    { id: "overdue", label: "Overdue", key: "overdue" },
];

const PAYMENT_TONE = {
    paid: "success",
    partpaid: "warning",
    unpaid: "neutral",
};

const PAYMENT_LABEL = {
    paid: "Paid",
    partpaid: "Part-paid",
    unpaid: "Unpaid",
};

const AssignModal = ({ booking, managers, onClose, onDone }) => {
    const toast = useToast();

    const [assignee, setAssignee] = useState(booking.assignedTo?._id || "");
    const [isSaving, setIsSaving] = useState(false);

    const submit = async () => {
        setIsSaving(true);

        try {
            await bookingsApi.assign(booking._id, assignee || null);
            toast.success(assignee ? "Booking assigned" : "Booking unassigned");
            onDone();
        } catch (err) {
            toast.error("Could not assign", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            title="Assign booking"
            description={`${booking.customerName} · ${booking.unit?.flatNo || ""}`}
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={submit}
                        disabled={isSaving}
                    >
                        {isSaving ? <Spinner inline /> : null}
                        Save
                    </button>
                </>
            }
        >
            <Field label="Post-sales owner">
                <select
                    className="select"
                    value={assignee}
                    onChange={(event) => setAssignee(event.target.value)}
                    autoFocus
                >
                    <option value="">Unassigned</option>
                    {managers.map((manager) => (
                        <option key={manager._id} value={manager._id}>
                            {manager.name}
                        </option>
                    ))}
                </select>
            </Field>
        </Modal>
    );
};

/* Moving a cancelled booking to refunds records what is being returned, so
   the amount is asked for rather than defaulted to zero. */
const RefundModal = ({ booking, onClose, onDone }) => {
    const toast = useToast();

    const [amount, setAmount] = useState(String(booking.receivedAmount || ""));
    const [isSaving, setIsSaving] = useState(false);

    const submit = async () => {
        setIsSaving(true);

        try {
            await bookingsApi.changeStatus(booking._id, {
                status: "refund",
                refundAmount: Number(amount) || 0,
            });

            toast.success("Moved to refunds");
            onDone();
        } catch (err) {
            toast.error("Could not move to refunds", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            title="Move to refunds?"
            description={`${booking.customerName} · ${currency(booking.receivedAmount)} collected`}
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={submit}
                        disabled={isSaving}
                    >
                        {isSaving ? <Spinner inline /> : null}
                        Move to refunds
                    </button>
                </>
            }
        >
            <Field label="Refund amount" hint="Defaults to everything collected on the booking">
                <input
                    type="number"
                    className="input"
                    min="0"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    autoFocus
                />
            </Field>
        </Modal>
    );
};

const Bookings = () => {
    const { tab: slug } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const activeTab = TABS.find((t) => t.slug === slug) || TABS[0];

    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounced(searchTerm);
    const [ownership, setOwnership] = useState("all");

    const [assigning, setAssigning] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [confirming, setConfirming] = useState(null);
    const [refunding, setRefunding] = useState(null);
    const [isBusy, setIsBusy] = useState(false);

    const list = useResource(bookingsApi, {
        initialParams: { status: activeTab.id },
        limit: 25,
    });

    /* The tiles are measured over the same rows the table is showing, so
       every filter except the payment chip is passed straight through. */
    const statsParams = {
        status: activeTab.id,
        project: list.params.project || undefined,
        saleType: list.params.saleType || undefined,
        assignedTo: ownership === "unassigned" ? "null" : undefined,
        hasOwner: ownership === "assigned" ? "true" : undefined,
        search: debouncedSearch || undefined,
    };

    const { data: stats, refetch: refetchStats } = useAsyncData(
        () => bookingsApi.stats(statsParams),
        [
            activeTab.id,
            list.params.project,
            list.params.saleType,
            ownership,
            debouncedSearch,
        ]
    );

    const { data: managers } = useAsyncData(
        () => usersApi.list({ role: ROLES.ACCOUNTANT, limit: 50 }),
        []
    );

    const { data: projectList } = useAsyncData(
        () => projectsApi.list({ limit: 100, sort: "name" }),
        []
    );

    useEffect(() => {
        list.setFilter({ status: activeTab.id, payment: undefined });
        setOwnership("all");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab.id]);

    useEffect(() => {
        list.setFilter({ search: debouncedSearch || undefined });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    useEffect(() => {
        list.setFilter({
            assignedTo: ownership === "unassigned" ? "null" : undefined,
            hasOwner: ownership === "assigned" ? "true" : undefined,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ownership]);

    const refreshAll = () => {
        list.refetch();
        refetchStats();
    };

    const runStatusChange = async () => {
        setIsBusy(true);

        try {
            await bookingsApi.changeStatus(confirming.booking._id, {
                status: confirming.next,
                reason: confirming.reason || "",
            });

            toast.success(`Booking marked ${confirming.next}`);
            setConfirming(null);
            refreshAll();
        } catch (err) {
            toast.error("Could not update the booking", err.message);
        } finally {
            setIsBusy(false);
        }
    };

    const columns = useMemo(
        () => [
            {
                key: "customerName",
                header: "Customer name",
                sortKey: "customerName",
                render: (row) => (
                    <div className="customer-cell">
                        <span className="customer-icon">
                            <Users />
                        </span>

                        <div>
                            <div className="record-name">{row.customerName}</div>
                            <div className="record-sub is-phone">
                                <Phone /> {formatPhone(row.customerPhone)}
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                key: "flatNo",
                header: "Flat no",
                render: (row) =>
                    row.unit ? (
                        <span className="flat-chip">
                            <Home /> {row.unit.flatNo}
                        </span>
                    ) : (
                        <span className="muted">—</span>
                    ),
            },
            {
                key: "project",
                header: "Project",
                render: (row) => (
                    <span className="project-cell">
                        <b>{row.project?.name || "—"}</b>{" "}
                        <span>{row.unit?.tower || ""}</span>
                    </span>
                ),
            },
            {
                key: "totalAmount",
                header: "Total amount",
                className: "num",
                sortKey: "totalAmount",
                render: (row) => <strong>{currency(row.totalAmount)}</strong>,
            },
            {
                key: "payment",
                header: "Payment",
                render: (row) => {
                    const state = row.collection?.state || "unpaid";

                    return (
                        <div className="pay-cell">
                            <Badge tone={row.collection?.isOverdue ? "danger" : PAYMENT_TONE[state]}>
                                {row.collection?.isOverdue ? "Overdue" : PAYMENT_LABEL[state]}
                            </Badge>

                            {row.collection?.outstanding ? (
                                <span>{compactCurrency(row.collection.outstanding)} due</span>
                            ) : null}
                        </div>
                    );
                },
            },
            {
                key: "updatedAt",
                header: "Modified",
                className: "num",
                sortKey: "updatedAt",
                render: (row) => date(row.updatedAt),
            },
            {
                key: "ownership",
                header: "Ownership",
                render: (row) => (
                    <div className="ownership" onClick={(event) => event.stopPropagation()}>
                        <span className="ownership-who">
                            <b className={row.assignedTo ? undefined : "is-unassigned"}>
                                {row.assignedTo ? row.assignedTo.name : "Unassigned"}
                            </b>

                            {row.soldBy ? <span>sold by {row.soldBy.name}</span> : null}
                        </span>

                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setAssigning(row)}
                        >
                            {row.assignedTo ? "Reassign" : "Assign"}
                        </button>
                    </div>
                ),
            },
            {
                key: "actions",
                header: "Actions",
                className: "col-actions",
                render: (row) => (
                    <div className="row-actions" onClick={(event) => event.stopPropagation()}>
                        {row.status === "pending" ? (
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() =>
                                    setConfirming({
                                        booking: row,
                                        next: "confirmed",
                                        title: "Confirm this sale?",
                                        message: `${row.customerName} takes flat ${row.unit?.flatNo}. The unit is marked sold and the payment schedule is generated.`,
                                        label: "Confirm sale",
                                        tone: "primary",
                                    })
                                }
                            >
                                <ShoppingCart /> Sale
                            </button>
                        ) : null}

                        {row.status === "confirmed" ? (
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() =>
                                    setConfirming({
                                        booking: row,
                                        next: "completed",
                                        title: "Mark as completed?",
                                        message: `${row.customerName}'s booking will be closed as completed.`,
                                        label: "Mark completed",
                                        tone: "primary",
                                    })
                                }
                            >
                                Complete
                            </button>
                        ) : null}

                        {row.status === "cancelled" ? (
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setRefunding(row)}
                            >
                                <Undo2 /> Refund
                            </button>
                        ) : null}
                    </div>
                ),
            },
        ],
        []
    );

    return (
        <>
            <div className="page-head">
                <div>
                    <h1 className="page-title">{activeTab.title}</h1>

                    {stats ? (
                        <div className="page-summary">
                            <span>
                                <b>{number(stats.total)}</b>{" "}
                                {activeTab.id === "pending" ? "awaiting confirmation" : "records"}
                            </span>
                            <span className="sep">·</span>
                            <span>
                                <b>{currency(stats.amountInPlay)}</b> in play
                            </span>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="stat-strip">
                <div className="stat-tile">
                    <div className="label">Total scheduled</div>
                    <div className="value">{compactCurrency(stats?.money?.scheduled || 0)}</div>
                    <div className="note">across {number(stats?.total || 0)} bookings</div>
                </div>

                <div className="stat-tile">
                    <div className="label">Collected</div>
                    <div className="value is-success">
                        {compactCurrency(stats?.money?.collected || 0)}
                    </div>
                    <div className="note">
                        {stats?.money?.scheduled
                            ? percent((stats.money.collected / stats.money.scheduled) * 100)
                            : "—"}{" "}
                        of scheduled
                    </div>
                </div>

                <div className="stat-tile">
                    <div className="label">Outstanding</div>
                    <div className="value">
                        {compactCurrency(stats?.money?.outstanding || 0)}
                    </div>
                    <div className="note">still to come in</div>
                </div>

                <div className="stat-tile">
                    <div className="label">Overdue</div>
                    <div className="value is-danger">
                        {compactCurrency(stats?.money?.overdue || 0)}
                    </div>
                    <div className="note">
                        {number(stats?.payment?.overdue || 0)} bookings past a due date
                    </div>
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
                            onClick={() => navigate(`/layout/bookings/${tab.slug}`)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search name, phone, unit"
                />

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

                <select
                    className="select"
                    value={list.params.saleType || ""}
                    onChange={(event) => list.setFilter({ saleType: event.target.value })}
                    aria-label="Filter by sale type"
                >
                    <option value="">All Sale Types</option>
                    {["sale", "resale", "rental"].map((type) => (
                        <option key={type} value={type}>
                            {titleCase(type)}
                        </option>
                    ))}
                </select>

                <div className="chips" role="group" aria-label="Ownership">
                    {OWNERSHIP.map((option) => {
                        const count =
                            option.id === "all"
                                ? stats?.total
                                : option.id === "assigned"
                                  ? stats?.assigned
                                  : stats?.unassigned;

                        return (
                            <button
                                key={option.id}
                                type="button"
                                className={ownership === option.id ? "is-active" : ""}
                                onClick={() => setOwnership(option.id)}
                            >
                                {option.label}
                                {count !== undefined ? ` (${count})` : ""}
                            </button>
                        );
                    })}
                </div>

                <div className="chips" role="group" aria-label="Payment state">
                    {PAYMENT_FILTERS.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            className={(list.params.payment || "") === option.id ? "is-active" : ""}
                            onClick={() => list.setFilter({ payment: option.id || undefined })}
                        >
                            {option.label} <b>{number(stats?.payment?.[option.key] ?? 0)}</b>
                        </button>
                    ))}
                </div>
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
                    onRowClick={(row) => setViewing(row)}
                    emptyIcon={ShoppingCart}
                    emptyTitle={`No ${activeTab.label.toLowerCase()} bookings`}
                    emptyDescription="Bookings appear here as your sales team closes deals."
                />

                <Pagination pagination={list.pagination} onPageChange={list.setPage} />
            </div>

            {assigning ? (
                <AssignModal
                    booking={assigning}
                    managers={managers || []}
                    onClose={() => setAssigning(null)}
                    onDone={() => {
                        setAssigning(null);
                        refreshAll();
                    }}
                />
            ) : null}

            {viewing ? (
                <BookingDetailDrawer
                    bookingId={viewing._id}
                    onClose={() => setViewing(null)}
                    onChanged={refreshAll}
                />
            ) : null}

            {refunding ? (
                <RefundModal
                    booking={refunding}
                    onClose={() => setRefunding(null)}
                    onDone={() => {
                        setRefunding(null);
                        refreshAll();
                    }}
                />
            ) : null}

            {confirming ? (
                <ConfirmDialog
                    title={confirming.title}
                    message={confirming.message}
                    confirmLabel={confirming.label}
                    tone={confirming.tone}
                    isBusy={isBusy}
                    onConfirm={runStatusChange}
                    onCancel={() => setConfirming(null)}
                />
            ) : null}
        </>
    );
};

export default Bookings;

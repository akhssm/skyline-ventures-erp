import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Boxes, Layers } from "lucide-react";

import {
    bookings as bookingsApi,
    configuration as configApi,
    units as unitsApi,
} from "../api/resources";
import { useAsyncData, useDebounced, useResource } from "../hooks/useResource";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../config/navigation";
import { DataTable, Pagination, SearchInput } from "../components/ui";
import BookingDetailDrawer from "../components/bookings/BookingDetailDrawer";
import BulkFlats from "../components/inventory/BulkFlats";
import UnitPeek from "../components/inventory/UnitPeek";
import { compactCurrency, number, titleCase } from "../utils/format";

/* The five states, in the order the login hero and the legend draw them. */
const UNIT_STATES = [
    { key: "available", label: "Available", color: "var(--unit-available)" },
    { key: "hold", label: "Hold", color: "var(--unit-hold)" },
    { key: "reserved", label: "Reserved", color: "var(--unit-reserved)" },
    { key: "booked", label: "Booked", color: "var(--unit-booked)" },
    { key: "sold", label: "Sold", color: "var(--unit-sold)" },
];

/* Roles allowed to load stock. Everyone else reads the list. */
const EDITOR_ROLES = [ROLES.PROPERTY_OWNER, ROLES.SYSTEM_OPERATOR];

/* ---------------------------------------------------------
   INVENTORY
   --------------------------------------------------------- */

const Inventory = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounced(searchTerm);

    const [peekId, setPeekId] = useState(null);
    const [bookingId, setBookingId] = useState(null);
    const [isBulkOpen, setIsBulkOpen] = useState(false);

    const list = useResource(unitsApi, { limit: 25 });

    const { data: facets, refetch: refetchFacets } = useAsyncData(() => unitsApi.facets(), []);
    const { data: config } = useAsyncData(() => configApi.get(), []);

    /* The peek shows the whole record and the table row carries only a
       summary, so it is always loaded by id. */
    const { data: peekUnit } = useAsyncData(() => unitsApi.get(peekId), [peekId], {
        enabled: Boolean(peekId),
    });

    /* A booked or sold unit has a booking behind it; the peek links out to it. */
    const { data: peekBookings } = useAsyncData(
        () => bookingsApi.list({ unit: peekId, limit: 1 }),
        [peekId],
        { enabled: Boolean(peekId) }
    );

    useEffect(() => {
        list.setFilter({ search: debouncedSearch || undefined });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const canEdit = EDITOR_ROLES.includes(user.role);

    const statusCounts = useMemo(
        () => Object.fromEntries((facets?.status || []).map((entry) => [entry.name, entry.cnt])),
        [facets]
    );

    const takenCount = (statusCounts.booked || 0) + (statusCounts.sold || 0);

    /* The bulk builder offers what Configuration lists. Where a list has not
       been set up, it falls back to whatever the existing stock already uses,
       so a new tower still matches the ones beside it. */
    const masters = useMemo(() => {
        const fromFacets = (group) => (facets?.[group] || []).map((entry) => entry.name);
        const pick = (configured, group) =>
            configured?.length ? configured : fromFacets(group);

        return {
            facing: pick(config?.facings, "facing"),
            unitType: pick(config?.unitTypes, "unitType"),
            view: pick(config?.viewTypes, "view"),
        };
    }, [config, facets]);

    const activeStatus = list.params.status || "";

    /* Both loads keep their previous result while the next one is in flight,
       so the panel waits for the record it was actually opened for. */
    const openUnit = peekUnit?._id === peekId ? peekUnit : null;
    const openBooking =
        peekBookings?.[0] && String(peekBookings[0].unit?._id || peekBookings[0].unit) === peekId
            ? peekBookings[0]
            : null;

    const columns = [
        {
            key: "flatNo",
            header: "Unit",
            sortKey: "flatNo",
            render: (row) => (
                <div>
                    <div className="record-name">{row.flatNo}</div>
                    <div className="record-sub">{row.unitCategory || "Flat / Apartment"}</div>
                </div>
            ),
        },
        { key: "project", header: "Project", render: (row) => row.project?.name || "—" },
        { key: "tower", header: "Tower", sortKey: "tower" },
        { key: "floor", header: "Floor", className: "num", sortKey: "floor" },
        { key: "unitType", header: "Type", render: (row) => row.unitType || "—" },
        {
            key: "builtUpArea",
            header: "Area",
            className: "num",
            sortKey: "builtUpArea",
            render: (row) => (row.builtUpArea ? `${number(row.builtUpArea)} sft` : "—"),
        },
        { key: "facing", header: "Facing", render: (row) => row.facing || "—" },
        { key: "view", header: "View", render: (row) => row.view || "—" },
        {
            key: "ratePerSqft",
            header: "Rate",
            className: "num",
            sortKey: "ratePerSqft",
            render: (row) => (row.ratePerSqft ? `₹${number(row.ratePerSqft)}` : "—"),
        },
        {
            key: "totalPrice",
            header: "All-in price",
            className: "num",
            sortKey: "totalPrice",
            render: (row) => <strong>{compactCurrency(row.totalPrice)}</strong>,
        },
        {
            key: "status",
            header: "Status",
            render: (row) => (
                <span className={`unit-pill is-${row.status}`}>{titleCase(row.status)}</span>
            ),
        },
    ];

    return (
        <>
            <div className="page-head">
                <div>
                    <h1 className="page-title">Inventory</h1>

                    <div className="page-summary">
                        <span>
                            <b>{number(facets?.total ?? list.pagination.total)}</b> units
                        </span>
                        <span className="sep">·</span>
                        <span>
                            <b>{number(facets?.projectCount ?? 0)}</b> projects
                        </span>
                        <span className="sep">·</span>
                        <span>
                            <b>{number(takenCount)}</b> booked or sold
                        </span>
                    </div>
                </div>

                <div className="page-actions">
                    {canEdit ? (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setIsBulkOpen(true)}
                        >
                            <Layers /> Bulk Add
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="status-strip" role="group" aria-label="Filter by status">
                {UNIT_STATES.map((state) => (
                    <button
                        key={state.key}
                        type="button"
                        className={`status-chip is-${state.key}${
                            activeStatus === state.key ? " is-active" : ""
                        }`}
                        aria-pressed={activeStatus === state.key}
                        onClick={() =>
                            list.setFilter({
                                status: activeStatus === state.key ? undefined : state.key,
                            })
                        }
                    >
                        <i style={{ background: state.color }} />
                        {state.label}
                        <b>{number(statusCounts[state.key] || 0)}</b>
                    </button>
                ))}

                {activeStatus ? (
                    <button
                        type="button"
                        className="link-clear"
                        onClick={() => list.setFilter({ status: undefined })}
                    >
                        Clear
                    </button>
                ) : null}
            </div>

            <div className="filters">
                <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search unit number or tower"
                />

                <select
                    className="select"
                    value={list.params.project || ""}
                    onChange={(event) => list.setFilter({ project: event.target.value })}
                    aria-label="Filter by project"
                >
                    <option value="">All Projects</option>
                    {(facets?.project || []).map((entry) => (
                        <option key={entry.id} value={entry.id}>
                            {entry.name}
                        </option>
                    ))}
                </select>

                <select
                    className="select"
                    value={list.params.tower || ""}
                    onChange={(event) => list.setFilter({ tower: event.target.value })}
                    aria-label="Filter by tower"
                >
                    <option value="">All Towers</option>
                    {(facets?.tower || []).map((entry) => (
                        <option key={entry.name} value={entry.name}>
                            {entry.name}
                        </option>
                    ))}
                </select>

                <select
                    className="select"
                    value={list.params.unitType || ""}
                    onChange={(event) => list.setFilter({ unitType: event.target.value })}
                    aria-label="Filter by unit type"
                >
                    <option value="">All Types</option>
                    {(facets?.unitType || []).map((entry) => (
                        <option key={entry.name} value={entry.name}>
                            {entry.name}
                        </option>
                    ))}
                </select>

                {/* Facing and view are optional on a unit, so their filters
                    only appear once some stock actually carries them. */}
                {facets?.facing?.length ? (
                    <select
                        className="select"
                        value={list.params.facing || ""}
                        onChange={(event) => list.setFilter({ facing: event.target.value })}
                        aria-label="Filter by facing"
                    >
                        <option value="">All Facing</option>
                        {facets.facing.map((entry) => (
                            <option key={entry.name} value={entry.name}>
                                {entry.name}
                            </option>
                        ))}
                    </select>
                ) : null}

                {facets?.view?.length ? (
                    <select
                        className="select"
                        value={list.params.view || ""}
                        onChange={(event) => list.setFilter({ view: event.target.value })}
                        aria-label="Filter by view"
                    >
                        <option value="">All Views</option>
                        {facets.view.map((entry) => (
                            <option key={entry.name} value={entry.name}>
                                {entry.name}
                            </option>
                        ))}
                    </select>
                ) : null}
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
                    onRowClick={(row) => setPeekId(row._id)}
                    emptyIcon={Boxes}
                    emptyTitle="No units found"
                    emptyDescription="Adjust the filters, or add stock with Bulk Add."
                />

                <Pagination pagination={list.pagination} onPageChange={list.setPage} />
            </div>

            {openUnit ? (
                <UnitPeek
                    unit={{ ...openUnit, booking: openBooking }}
                    onClose={() => setPeekId(null)}
                    onOpenFloor={() =>
                        navigate(
                            `/layout/bookings/floors/${
                                openUnit.project?._id || openUnit.project
                            }/${encodeURIComponent(openUnit.tower)}`
                        )
                    }
                    onOpenBooking={() => openBooking && setBookingId(openBooking._id)}
                />
            ) : null}

            {bookingId ? (
                <BookingDetailDrawer bookingId={bookingId} onClose={() => setBookingId(null)} />
            ) : null}

            {isBulkOpen ? (
                <BulkFlats
                    masters={masters}
                    onClose={() => setIsBulkOpen(false)}
                    onCreated={() => {
                        setIsBulkOpen(false);
                        list.refetch();
                        refetchFacets();
                    }}
                />
            ) : null}
        </>
    );
};

export default Inventory;

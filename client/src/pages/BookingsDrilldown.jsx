import { Link, useNavigate, useParams } from "react-router-dom";
import { Building2, ChevronRight, Folder, Layers } from "lucide-react";

import { bookings as bookingsApi, projects as projectsApi, units as unitsApi } from "../api/resources";
import { useAsyncData } from "../hooks/useResource";
import { Badge, DataTable, ErrorState, LoadingState } from "../components/ui";
import { compactCurrency, currency, date, number, percent, phone as formatPhone } from "../utils/format";

const STATUS_TONE = {
    available: "success",
    hold: "warning",
    reserved: "purple",
    booked: "danger",
    sold: "neutral",
};

const Crumbs = ({ trail }) => (
    <nav className="crumbs" aria-label="Breadcrumb">
        {trail.map((crumb, index) => (
            <span key={crumb.label} className="crumb">
                {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <b>{crumb.label}</b>}
                {index < trail.length - 1 ? <ChevronRight /> : null}
            </span>
        ))}
    </nav>
);

/* ---------------------------------------------------------
   LEVEL 1  Projects
   --------------------------------------------------------- */

const ProjectLevel = () => {
    const navigate = useNavigate();

    const { data: projects, isLoading, error, refetch } = useAsyncData(
        () => projectsApi.list({ limit: 100, sort: "name" }),
        []
    );
    const { data: grid } = useAsyncData(() => unitsApi.grid(), []);

    // Roll the unit board up to a per-project summary.
    const byProject = (grid?.towers || []).reduce((acc, tower) => {
        const row = (acc[tower.project] ||= { towers: 0, total: 0, sold: 0, booked: 0, available: 0 });

        row.towers += 1;

        tower.units.forEach((unit) => {
            row.total += 1;
            if (unit.status === "sold") row.sold += 1;
            if (unit.status === "booked") row.booked += 1;
            if (unit.status === "available") row.available += 1;
        });

        return acc;
    }, {});

    if (error) return <ErrorState message={error} onRetry={refetch} />;
    if (isLoading) return <LoadingState label="Loading projects" />;

    return (
        <DataTable
            columns={[
                {
                    key: "name",
                    header: "Project Name",
                    sortKey: "name",
                    render: (row) => (
                        <div className="record">
                            <span className="customer-icon">
                                <Folder />
                            </span>
                            <div>
                                <div className="record-name">{row.name}</div>
                                <div className="record-sub">
                                    {row.code} <span className="dot">·</span> {row.city || "—"}
                                </div>
                            </div>
                        </div>
                    ),
                },
                {
                    key: "towers",
                    header: "Total Towers",
                    className: "num",
                    render: (row) => number(byProject[row.name]?.towers ?? row.towers?.length ?? 0),
                },
                {
                    key: "units",
                    header: "Total units",
                    className: "num",
                    render: (row) => number(byProject[row.name]?.total ?? 0),
                },
                {
                    key: "available",
                    header: "Available",
                    className: "num",
                    render: (row) => number(byProject[row.name]?.available ?? 0),
                },
                {
                    key: "booked",
                    header: "Booked",
                    className: "num",
                    render: (row) => number(byProject[row.name]?.booked ?? 0),
                },
                {
                    key: "sold",
                    header: "Sold",
                    className: "num",
                    render: (row) => number(byProject[row.name]?.sold ?? 0),
                },
                {
                    key: "absorption",
                    header: "Absorption",
                    className: "num",
                    render: (row) => {
                        const p = byProject[row.name];
                        if (!p?.total) return "—";

                        const value = ((p.sold + p.booked) / p.total) * 100;

                        return (
                            <strong style={{ color: value >= 60 ? "var(--success)" : "var(--text)" }}>
                                {percent(value, 0)}
                            </strong>
                        );
                    },
                },
            ]}
            rows={projects || []}
            onRowClick={(row) => navigate(`/layout/bookings/towers/${row._id}`)}
            emptyIcon={Folder}
            emptyTitle="No projects found"
        />
    );
};

/* ---------------------------------------------------------
   LEVEL 2  Towers
   --------------------------------------------------------- */

const TowerLevel = ({ projectId }) => {
    const navigate = useNavigate();

    const { data: project } = useAsyncData(() => projectsApi.get(projectId), [projectId]);
    const { data: grid, isLoading, error, refetch } = useAsyncData(
        () => unitsApi.grid({ project: projectId }),
        [projectId]
    );

    if (error) return <ErrorState message={error} onRetry={refetch} />;
    if (isLoading) return <LoadingState label="Loading towers" />;

    const rows = (grid?.towers || []).map((tower) => {
        const counts = tower.units.reduce((acc, unit) => {
            acc[unit.status] = (acc[unit.status] || 0) + 1;
            return acc;
        }, {});

        const floors = new Set(tower.units.map((u) => u.floor));

        return {
            _id: tower.tower,
            tower: tower.tower,
            floors: floors.size,
            total: tower.units.length,
            available: counts.available || 0,
            booked: counts.booked || 0,
            sold: counts.sold || 0,
        };
    });

    return (
        <>
            <Crumbs
                trail={[
                    { label: "Projects", to: "/layout/bookings/projects" },
                    { label: project?.name || "Project" },
                ]}
            />

            <DataTable
                columns={[
                    {
                        key: "tower",
                        header: "Tower Name",
                        render: (row) => (
                            <div className="record">
                                <span className="customer-icon">
                                    <Building2 />
                                </span>
                                <div className="record-name">{row.tower}</div>
                            </div>
                        ),
                    },
                    { key: "floors", header: "Floors", className: "num", render: (row) => number(row.floors) },
                    { key: "total", header: "Total units", className: "num", render: (row) => number(row.total) },
                    { key: "available", header: "Available", className: "num", render: (row) => number(row.available) },
                    { key: "booked", header: "Booked", className: "num", render: (row) => number(row.booked) },
                    { key: "sold", header: "Sold", className: "num", render: (row) => number(row.sold) },
                    {
                        key: "absorption",
                        header: "Absorption",
                        className: "num",
                        render: (row) =>
                            row.total ? percent(((row.sold + row.booked) / row.total) * 100, 0) : "—",
                    },
                ]}
                rows={rows}
                onRowClick={(row) =>
                    navigate(`/layout/bookings/floors/${projectId}/${encodeURIComponent(row.tower)}`)
                }
                emptyIcon={Building2}
                emptyTitle="No towers in this project"
            />
        </>
    );
};

/* ---------------------------------------------------------
   LEVEL 3  Floors and their units
   --------------------------------------------------------- */

const FloorLevel = ({ projectId, tower }) => {
    const { data: project } = useAsyncData(() => projectsApi.get(projectId), [projectId]);

    const { data: units, isLoading, error, refetch } = useAsyncData(
        () => unitsApi.list({ project: projectId, tower, limit: 200, sort: "floor flatNo" }),
        [projectId, tower]
    );

    const { data: sales } = useAsyncData(
        () => bookingsApi.list({ project: projectId, limit: 200 }),
        [projectId]
    );

    if (error) return <ErrorState message={error} onRetry={refetch} />;
    if (isLoading) return <LoadingState label="Loading units" />;

    // A unit's buyer comes from the booking raised against it.
    const bookingByUnit = Object.fromEntries(
        (sales || []).filter((b) => b.unit).map((b) => [b.unit._id || b.unit, b])
    );

    return (
        <>
            <Crumbs
                trail={[
                    { label: "Projects", to: "/layout/bookings/projects" },
                    { label: project?.name || "Project", to: `/layout/bookings/towers/${projectId}` },
                    { label: tower },
                ]}
            />

            <DataTable
                columns={[
                    {
                        key: "flatNo",
                        header: "Flat No",
                        render: (row) => (
                            <div>
                                <div className="record-name">{row.flatNo}</div>
                                <div className="record-sub">Floor {row.floor}</div>
                            </div>
                        ),
                    },
                    { key: "unitType", header: "BHK" },
                    {
                        key: "builtUpArea",
                        header: "Dimension",
                        className: "num",
                        render: (row) => `${number(row.builtUpArea)} sft`,
                    },
                    { key: "facing", header: "Facing" },
                    {
                        key: "totalPrice",
                        header: "All-in price",
                        className: "num",
                        render: (row) => compactCurrency(row.totalPrice),
                    },
                    {
                        key: "status",
                        header: "Status",
                        render: (row) => (
                            <Badge tone={STATUS_TONE[row.status] || "neutral"}>
                                {row.status.toUpperCase()}
                            </Badge>
                        ),
                    },
                    {
                        key: "customer",
                        header: "Customer",
                        render: (row) => {
                            const booking = bookingByUnit[row._id];

                            return booking ? (
                                <div>
                                    <div className="record-name">{booking.customerName}</div>
                                    <div className="record-sub">{formatPhone(booking.customerPhone)}</div>
                                </div>
                            ) : (
                                <span className="muted">—</span>
                            );
                        },
                    },
                    {
                        key: "received",
                        header: "Received",
                        className: "num",
                        render: (row) => {
                            const booking = bookingByUnit[row._id];
                            return booking ? currency(booking.receivedAmount) : <span className="muted">—</span>;
                        },
                    },
                    {
                        key: "bookingDate",
                        header: "Booked on",
                        className: "num",
                        render: (row) => {
                            const booking = bookingByUnit[row._id];
                            return booking ? date(booking.bookingDate) : <span className="muted">—</span>;
                        },
                    },
                ]}
                rows={units || []}
                emptyIcon={Layers}
                emptyTitle="No units in this tower"
            />
        </>
    );
};

/* ---------------------------------------------------------
   BOOKINGS DRILLDOWN
   Projects, then towers, then the units and who bought them.
   --------------------------------------------------------- */

const BookingsDrilldown = () => {
    const { projectId, tower } = useParams();

    const heading = tower ? "Units" : projectId ? "Towers" : "Bookings";

    return (
        <>
            <div className="page-head">
                <div>
                    <h1 className="page-title">{heading}</h1>
                    <div className="page-summary">
                        <span>Sales performance by project, tower and unit</span>
                    </div>
                </div>
            </div>

            <div className="card">
                {tower ? (
                    <FloorLevel projectId={projectId} tower={decodeURIComponent(tower)} />
                ) : projectId ? (
                    <TowerLevel projectId={projectId} />
                ) : (
                    <ProjectLevel />
                )}
            </div>
        </>
    );
};

export default BookingsDrilldown;

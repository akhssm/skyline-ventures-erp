import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Download } from "lucide-react";

import { reports as reportsApi } from "../api/resources";
import { useAsyncData } from "../hooks/useResource";
import { DataTable, ErrorState, LoadingState } from "../components/ui";
import { compactCurrency, number, percent, titleCase } from "../utils/format";

const SERIES = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--chart-6)",
];

const tooltipStyle = {
    background: "var(--surface-raised)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    fontSize: 12,
    color: "var(--text)",
    boxShadow: "var(--shadow-md)",
};

const axisTick = { fill: "var(--chart-axis)", fontSize: 11 };

/** Turns any array of objects into a CSV the browser downloads. */
const exportCsv = (rows, fileName) => {
    if (!rows?.length) return;

    const headers = Object.keys(rows[0]);

    const escape = (value) => {
        const text = String(value ?? "");
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const csv = [
        headers.join(","),
        ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
    ].join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);
};

/* ---------------------------------------------------------
   LEADS AND SITE VISITS
   --------------------------------------------------------- */

const LeadsAndVisits = () => {
    const { data, isLoading, error, refetch } = useAsyncData(
        () => reportsApi.leadsAndSiteVisits(),
        []
    );

    if (error) return <ErrorState message={error} onRetry={refetch} />;
    if (isLoading || !data) return <LoadingState label="Building the report" />;

    const bySource = data.bySource.map((row) => ({
        name: titleCase(row._id || "unknown"),
        leads: row.leads,
    }));

    const byStage = data.byStage.map((row) => ({
        name: titleCase(row._id),
        leads: row.leads,
    }));

    const visits = data.visitFunnel.map((row) => ({
        name: titleCase(row._id),
        visits: row.visits,
    }));

    const totalLeads = bySource.reduce((sum, row) => sum + row.leads, 0);
    const totalVisits = visits.reduce((sum, row) => sum + row.visits, 0);
    const completedVisits = visits.find((v) => v.name === "Completed")?.visits || 0;

    return (
        <>
            <div className="page-head">
                <div>
                    <h1 className="page-title">Leads &amp; Site Visits</h1>
                    <div className="page-summary">
                        <span>Last six months of pipeline and visit activity</span>
                    </div>
                </div>

                <div className="page-actions">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => exportCsv(data.byAgent, "agent-performance.csv")}
                    >
                        <Download /> Export agent table
                    </button>
                </div>
            </div>

            <div className="stat-strip">
                <div className="stat-tile">
                    <div className="label">Leads created</div>
                    <div className="value">{number(totalLeads)}</div>
                </div>

                <div className="stat-tile">
                    <div className="label">Site visits</div>
                    <div className="value">{number(totalVisits)}</div>
                </div>

                <div className="stat-tile">
                    <div className="label">Visits completed</div>
                    <div className="value">{number(completedVisits)}</div>
                    <div className="note">
                        {totalVisits ? percent((completedVisits / totalVisits) * 100) : "—"} of
                        scheduled
                    </div>
                </div>

                <div className="stat-tile">
                    <div className="label">Visit rate</div>
                    <div className="value">
                        {totalLeads ? percent((totalVisits / totalLeads) * 100) : "—"}
                    </div>
                    <div className="note">of leads booked a visit</div>
                </div>
            </div>

            <div className="report-grid" style={{ marginBottom: 16 }}>
                <section className="chart-card">
                    <div className="section-label">Leads by source</div>

                    <div className="chart-frame" style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bySource} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={axisTick}
                                    interval={0}
                                    angle={-32}
                                    textAnchor="end"
                                    height={72}
                                />
                                <YAxis tickLine={false} axisLine={false} tick={axisTick} />
                                <Tooltip cursor={{ fill: "var(--surface-hover)" }} contentStyle={tooltipStyle} />
                                <Bar dataKey="leads" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={34} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                <section className="chart-card">
                    <div className="section-label">Pipeline by stage</div>

                    <div className="chart-frame" style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={byStage}
                                    dataKey="leads"
                                    nameKey="name"
                                    innerRadius={58}
                                    outerRadius={98}
                                    paddingAngle={2}
                                >
                                    {byStage.map((entry, index) => (
                                        <Cell key={entry.name} fill={SERIES[index % SERIES.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>

            <div className="card">
                <div className="card-head">
                    <h3>Agent performance</h3>
                </div>

                <DataTable
                    columns={[
                        { key: "agent", header: "Agent", render: (row) => <span className="record-name">{row.agent}</span> },
                        { key: "leads", header: "Leads", className: "num", render: (row) => number(row.leads) },
                        { key: "booked", header: "Booked", className: "num", render: (row) => number(row.booked) },
                        {
                            key: "conversion",
                            header: "Conversion",
                            className: "num",
                            render: (row) => (
                                <strong
                                    style={{
                                        color:
                                            row.conversion >= 10
                                                ? "var(--success)"
                                                : row.conversion >= 4
                                                  ? "var(--text)"
                                                  : "var(--text-muted)",
                                    }}
                                >
                                    {percent(row.conversion)}
                                </strong>
                            ),
                        },
                        { key: "avgScore", header: "Avg score", className: "num" },
                    ]}
                    rows={data.byAgent}
                    rowKey={(row) => row.agent}
                    emptyTitle="No agent activity in this period"
                />
            </div>
        </>
    );
};

/* ---------------------------------------------------------
   ALL REPORTS
   --------------------------------------------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const AllReports = () => {
    const { data, isLoading, error, refetch } = useAsyncData(() => reportsApi.summary(), []);

    if (error) return <ErrorState message={error} onRetry={refetch} />;
    if (isLoading || !data) return <LoadingState label="Building the report" />;

    const collections = data.collections.map((row) => ({
        name: MONTHS[row._id.month - 1],
        collected: +(row.collected / 10000000).toFixed(2),
    }));

    const expenses = data.expenses.map((row) => ({
        name: titleCase(row._id),
        spent: +(row.spent / 100000).toFixed(1),
    }));

    const totalBookingValue = data.bookings.reduce((sum, row) => sum + row.value, 0);
    const totalBookings = data.bookings.reduce((sum, row) => sum + row.count, 0);
    const totalCollected = data.collections.reduce((sum, row) => sum + row.collected, 0);
    const totalSpent = data.expenses.reduce((sum, row) => sum + row.spent, 0);
    const pipelineValue = data.pipeline.reduce((sum, row) => sum + (row.value || 0), 0);

    return (
        <>
            <div className="page-head">
                <div>
                    <h1 className="page-title">All Reports</h1>
                    <div className="page-summary">
                        <span>Bookings, collections, spend and open pipeline</span>
                    </div>
                </div>

                <div className="page-actions">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                            exportCsv(
                                data.bookings.map((row) => ({
                                    status: row._id,
                                    count: row.count,
                                    value: row.value,
                                })),
                                "bookings-summary.csv"
                            )
                        }
                    >
                        <Download /> Export
                    </button>
                </div>
            </div>

            <div className="stat-strip">
                <div className="stat-tile">
                    <div className="label">Bookings</div>
                    <div className="value">{number(totalBookings)}</div>
                    <div className="note">{compactCurrency(totalBookingValue)} of sale value</div>
                </div>

                <div className="stat-tile">
                    <div className="label">Collected</div>
                    <div className="value">{compactCurrency(totalCollected)}</div>
                </div>

                <div className="stat-tile">
                    <div className="label">Spend</div>
                    <div className="value">{compactCurrency(totalSpent)}</div>
                </div>

                <div className="stat-tile">
                    <div className="label">Open pipeline</div>
                    <div className="value">{compactCurrency(pipelineValue)}</div>
                    <div className="note">
                        {number(data.pipeline.reduce((sum, row) => sum + row.count, 0))} live deals
                    </div>
                </div>
            </div>

            <div className="report-grid">
                <section className="chart-card">
                    <div className="section-label">
                        Collections <span>₹ Cr per month</span>
                    </div>

                    <div className="chart-frame" style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={collections} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
                                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={axisTick} />
                                <YAxis tickLine={false} axisLine={false} tick={axisTick} />
                                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${v} Cr`, "Collected"]} />
                                <Line
                                    type="monotone"
                                    dataKey="collected"
                                    stroke="var(--chart-2)"
                                    strokeWidth={2.4}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                <section className="chart-card">
                    <div className="section-label">
                        Spend by category <span>₹ Lakh</span>
                    </div>

                    <div className="chart-frame" style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={expenses}
                                layout="vertical"
                                margin={{ top: 8, right: 14, left: 22, bottom: 8 }}
                            >
                                <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
                                <XAxis type="number" tickLine={false} axisLine={false} tick={axisTick} />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={axisTick}
                                    width={86}
                                />
                                <Tooltip cursor={{ fill: "var(--surface-hover)" }} contentStyle={tooltipStyle} formatter={(v) => [`₹${v} L`, "Spent"]} />
                                <Bar dataKey="spent" fill="var(--chart-3)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
                <div className="card-head">
                    <h3>Bookings by status</h3>
                </div>

                <DataTable
                    columns={[
                        {
                            key: "_id",
                            header: "Status",
                            render: (row) => <span className="record-name">{titleCase(row._id)}</span>,
                        },
                        { key: "count", header: "Bookings", className: "num", render: (row) => number(row.count) },
                        {
                            key: "value",
                            header: "Sale value",
                            className: "num",
                            render: (row) => <strong>{compactCurrency(row.value)}</strong>,
                        },
                        {
                            key: "share",
                            header: "Share",
                            className: "num",
                            render: (row) =>
                                totalBookingValue
                                    ? percent((row.value / totalBookingValue) * 100)
                                    : "—",
                        },
                    ]}
                    rows={data.bookings}
                    rowKey={(row) => row._id}
                    emptyTitle="No bookings in this period"
                />
            </div>
        </>
    );
};

const Reports = ({ view }) => (view === "all" ? <AllReports /> : <LeadsAndVisits />);

export default Reports;

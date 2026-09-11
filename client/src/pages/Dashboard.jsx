import { useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

import { dashboard, projects as projectsApi } from "../api/resources";
import { useAsyncData } from "../hooks/useResource";
import { ErrorState, LoadingState } from "../components/ui";
import { compactCurrency, number, percent } from "../utils/format";

const PERIODS = [
    { id: "month", label: "This Month" },
    { id: "quarter", label: "This Quarter" },
    { id: "ytd", label: "YTD" },
];

const UNIT_STATES = [
    { key: "available", label: "Available", color: "var(--unit-available)" },
    { key: "hold", label: "Hold", color: "var(--unit-hold)" },
    { key: "reserved", label: "Reserved", color: "var(--unit-reserved)" },
    { key: "booked", label: "Booked", color: "var(--unit-booked)" },
    { key: "sold", label: "Sold", color: "var(--unit-sold)" },
];

/* ---------------------------------------------------------
   KPI TILE
   --------------------------------------------------------- */

const Delta = ({ value, unit, caption }) => {
    if (value === null || value === undefined) return null;

    const tone = value > 0 ? "is-up" : value < 0 ? "is-down" : "is-flat";
    const Icon = value >= 0 ? TrendingUp : TrendingDown;

    return (
        <div className={`kpi-delta ${tone}`}>
            <Icon />
            <b>
                {value > 0 ? "+" : ""}
                {unit === "cr" ? compactCurrency(value * 10000000) : `${value} pts`}
            </b>
            <span>{caption}</span>
        </div>
    );
};

// The six-column sparkline under each tile.
const Sparkline = ({ series }) => {
    if (!series?.length) return null;

    const max = Math.max(...series.map((point) => point.value), 1);

    return (
        <div className="kpi-spark">
            {series.map((point, index) => (
                <div
                    key={point.label + index}
                    className={`kpi-spark-col${index === series.length - 1 ? " is-last" : ""}`}
                >
                    <em>{point.value}</em>
                    <i style={{ height: `${Math.max((point.value / max) * 30, 3)}px` }} />
                </div>
            ))}
        </div>
    );
};

const Kpi = ({ tint, tone, label, value, note, delta, meter, spark }) => (
    <article className={`kpi tint-${tint}${tone ? ` tone-${tone}` : ""}`}>
        <span className="kpi-label">{label}</span>
        <div className="kpi-value">{value}</div>
        {note ? <p className="kpi-note">{note}</p> : null}

        {meter !== undefined ? (
            <div className="kpi-meter">
                <i style={{ width: `${Math.min(Math.max(meter, 0), 100)}%` }} />
            </div>
        ) : null}

        {delta}

        <Sparkline series={spark} />
    </article>
);

/* ---------------------------------------------------------
   DASHBOARD
   --------------------------------------------------------- */

const Dashboard = () => {
    const [period, setPeriod] = useState("quarter");
    const [projectId, setProjectId] = useState("");

    const { data: projectList } = useAsyncData(() => projectsApi.list({ limit: 100 }), []);

    const { data, isLoading, error, refetch } = useAsyncData(
        () => dashboard.executive({ period, ...(projectId ? { project: projectId } : {}) }),
        [period, projectId]
    );

    const momentum = data?.momentum || [];

    // The tiles reuse the momentum series so their sparklines and the chart
    // below always tell the same story.
    const bookingSpark = momentum.map((m) => ({ label: m.label, value: m.bookings }));
    const collectionSpark = momentum.map((m) => ({ label: m.label, value: m.collections }));

    return (
        <>
            <div className="page-head">
                <h1 className="page-title">Executive Overview</h1>

                <div className="page-actions">
                    <select
                        className="select"
                        value={projectId}
                        onChange={(event) => setProjectId(event.target.value)}
                        aria-label="Filter by project"
                    >
                        <option value="">All Projects</option>
                        {(projectList || []).map((project) => (
                            <option key={project._id} value={project._id}>
                                {project.name}
                            </option>
                        ))}
                    </select>

                    <div className="segmented" role="group" aria-label="Reporting period">
                        {PERIODS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                className={period === option.id ? "is-active" : ""}
                                onClick={() => setPeriod(option.id)}
                                aria-pressed={period === option.id}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error ? (
                <ErrorState message={error} onRetry={refetch} />
            ) : isLoading && !data ? (
                <LoadingState label="Building your overview" />
            ) : data ? (
                <>
                    <div className="section-label">Headline</div>

                    <div className="kpi-row">
                        <Kpi
                            tint={1}
                            tone="good"
                            label="Revenue"
                            value={compactCurrency(data.revenue.value)}
                            note="receipts recognised this period"
                            delta={
                                <Delta
                                    value={data.revenue.deltaCr}
                                    unit="cr"
                                    caption={`vs previous ${period === "ytd" ? "year" : period}`}
                                />
                            }
                            spark={collectionSpark}
                        />

                        <Kpi
                            tint={2}
                            label="Booking Rate"
                            value={
                                <>
                                    {data.bookingRate.percent}
                                    <small>%</small>
                                </>
                            }
                            note={`${number(data.bookingRate.bookedUnits)} of ${number(
                                data.bookingRate.totalUnits
                            )} units booked or sold`}
                            spark={bookingSpark}
                        />

                        <Kpi
                            tint={3}
                            tone="good"
                            label="Collection Efficiency"
                            value={
                                <>
                                    {data.collectionEfficiency.percent}
                                    <small>%</small>
                                </>
                            }
                            note={`${compactCurrency(
                                data.collectionEfficiency.collectedCr * 10000000
                            )} collected of ${compactCurrency(
                                data.collectionEfficiency.dueCr * 10000000
                            )} fallen due`}
                            meter={data.collectionEfficiency.percent}
                            spark={collectionSpark}
                        />

                        <Kpi
                            tint={4}
                            label="Pipeline Value"
                            value={compactCurrency(data.pipeline.valueCr * 10000000)}
                            note={`${number(data.pipeline.openDeals)} open deals, not yet booked`}
                            spark={bookingSpark}
                        />

                        <Kpi
                            tint={5}
                            tone="good"
                            label="Last Payment"
                            value={
                                data.lastPayment ? compactCurrency(data.lastPayment.amount) : "—"
                            }
                            note={
                                data.lastPayment
                                    ? `Flat ${data.lastPayment.flatNo || "—"} · ${new Date(
                                          data.lastPayment.paidAt
                                      ).toLocaleDateString("en-GB")}`
                                    : "No receipts yet"
                            }
                        />
                    </div>

                    <div className="dashboard-split">
                        <section className="chart-card">
                            <div className="section-label">
                                Momentum · last 6 months
                                <span>bookings vs collections (₹ Cr)</span>
                            </div>

                            <ul className="chart-legend">
                                <li>
                                    <i style={{ background: "var(--chart-1)" }} /> Bookings
                                </li>
                                <li>
                                    <i style={{ background: "var(--chart-2)" }} /> Collections
                                </li>
                            </ul>

                            <div className="chart-frame">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={momentum}
                                        margin={{ top: 8, right: 8, left: -14, bottom: 8 }}
                                        barGap={5}
                                    >
                                        <CartesianGrid
                                            vertical={false}
                                            stroke="var(--chart-grid)"
                                        />
                                        <XAxis
                                            dataKey="label"
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            width={48}
                                            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: "var(--surface-hover)" }}
                                            contentStyle={{
                                                background: "var(--surface-raised)",
                                                border: "1px solid var(--border)",
                                                borderRadius: 10,
                                                fontSize: 12,
                                                color: "var(--text)",
                                                boxShadow: "var(--shadow-md)",
                                            }}
                                            formatter={(value, name) => [`₹${value} Cr`, name]}
                                        />
                                        <Legend
                                            wrapperStyle={{ display: "none" }}
                                            payload={[]}
                                        />
                                        <Bar
                                            dataKey="bookings"
                                            name="Bookings"
                                            fill="var(--chart-1)"
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={38}
                                        />
                                        <Bar
                                            dataKey="collections"
                                            name="Collections"
                                            fill="var(--chart-2)"
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={38}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </section>

                        <section className="card">
                            <div className="card-head">
                                <h3>Inventory mix</h3>
                                <span className="mono" style={{ color: "var(--text-muted)" }}>
                                    {number(
                                        Object.values(data.inventoryMix || {}).reduce(
                                            (sum, n) => sum + n,
                                            0
                                        )
                                    )}{" "}
                                    units
                                </span>
                            </div>

                            <div className="mix-list">
                                {(() => {
                                    const total =
                                        Object.values(data.inventoryMix || {}).reduce(
                                            (sum, n) => sum + n,
                                            0
                                        ) || 1;

                                    return UNIT_STATES.map((state) => {
                                        const count = data.inventoryMix?.[state.key] || 0;

                                        return (
                                            <div key={state.key} className="mix-row">
                                                <span className="name">
                                                    <i style={{ background: state.color }} />
                                                    {state.label}
                                                </span>

                                                <span className="bar">
                                                    <i
                                                        style={{
                                                            width: `${(count / total) * 100}%`,
                                                            background: state.color,
                                                        }}
                                                    />
                                                </span>

                                                <span className="val">
                                                    {number(count)}
                                                    <span className="muted">
                                                        {" "}
                                                        {percent((count / total) * 100, 0)}
                                                    </span>
                                                </span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </section>
                    </div>
                </>
            ) : null}
        </>
    );
};

export default Dashboard;

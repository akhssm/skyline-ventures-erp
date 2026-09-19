import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { dashboard, projects as projectsApi } from "../api/resources";
import { useAsyncData } from "../hooks/useResource";
import { ErrorState, LoadingState } from "../components/ui";
import {
    Donut,
    Empty,
    FEED_KINDS,
    Funnel,
    Legend,
    Panel,
    Rows,
    Section,
    Spark,
    Swatch,
    Table,
    axisTick,
    DeltaPill,
    foldTail,
    hue,
    pct,
    tooltipStyle,
    trendDelta,
} from "../components/dashboard/DashboardKit";
import { compactCurrency, number, relativeTime } from "../utils/format";

/* =========================================================
   TEAM & PIPELINE
   The CRM Manager's dashboard. One filter row scopes every
   card; each chart can flip to the table that backs it.
   ========================================================= */

const PERIODS = [
    { id: "month", label: "This Month" },
    { id: "quarter", label: "This Quarter" },
    { id: "ytd", label: "YTD" },
];

/* ---------------------------------------------------------
   PAGE
   --------------------------------------------------------- */

const ManagerDashboard = () => {
    const navigate = useNavigate();

    const [period, setPeriod] = useState("quarter");
    const [projectId, setProjectId] = useState("");
    const [feedLimit, setFeedLimit] = useState(8);

    const { data: projectList } = useAsyncData(
        () => projectsApi.list({ limit: 100, sort: "name" }),
        []
    );

    const { data, isLoading, error, refetch } = useAsyncData(
        () => dashboard.manager({ period, ...(projectId ? { project: projectId } : {}) }),
        [period, projectId]
    );

    const view = useMemo(() => {
        if (!data) return null;

        const leadSeries = data.leadGen.map((row) => row.leads);
        const convSeries = data.leadGen.map((row) => row.conversion);

        const funnel = [
            { name: "Leads", value: data.funnel.leads },
            { name: "Visits", value: data.funnel.visits },
            { name: "Quotations", value: data.funnel.quotations },
            { name: "Booked", value: data.funnel.booked },
        ].map((stage, index) => ({ ...stage, hue: hue(index) }));

        return {
            leadSeries,
            convSeries,
            leadDelta: trendDelta(leadSeries, "pct"),
            convDelta: trendDelta(convSeries, "pts"),
            funnel,
            outcomes: foldTail(data.outcomes, "outcome", "leads"),
            sources: foldTail(data.sources, "source", "leads"),
            stages: data.pipelineByStage.map((row, index) => ({
                name: row.stage,
                value: row.value,
                leads: row.leads,
                hue: hue(index),
            })),
            stageTotal: data.pipelineByStage.reduce((sum, row) => sum + row.value, 0),
            owners: foldTail(data.pipelineByOwner, "owner", "value"),
            forecast: data.forecastByRep.slice(0, 8).map((row, index) => ({
                name: row.rep,
                value: row.forecast,
                lost: row.lost,
                hue: hue(index),
            })),
            topReps: data.repBreakdown.slice(0, 8).map((row, index) => ({
                name: row.rep,
                value: row.conversion,
                hue: hue(index),
                row,
            })),
            visitStatus: foldTail(data.visitsByStatus, "status", "visits"),
            winLoss: data.forecastByRep.slice(0, 8),
        };
    }, [data]);

    const shownActivity = data?.activity.slice(0, feedLimit) || [];

    return (
        <div className="sb-page">
            <div className="page-head">
                <div>
                    <h1 className="page-title">Team &amp; Pipeline</h1>
                    <p className="page-lede">
                        CRM Manager view - every card below is scoped by the filter row
                    </p>
                </div>
            </div>

            <div className="sb-filters">
                <label className="sb-ctrl">
                    <span aria-hidden="true">▦</span>
                    <select
                        id="sb-project"
                        aria-label="Project"
                        value={projectId}
                        onChange={(event) => setProjectId(event.target.value)}
                    >
                        <option value="">All Projects</option>
                        {(projectList || []).map((project) => (
                            <option key={project._id} value={project._id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="segmented" role="group" aria-label="Period">
                    {PERIODS.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            className={period === option.id ? "is-active" : undefined}
                            aria-pressed={period === option.id}
                            onClick={() => setPeriod(option.id)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                <div className="sb-spacer" />

                <button type="button" className="sb-ghost" onClick={refetch}>
                    ↻ Refresh
                </button>
            </div>

            {error ? <ErrorState message={error} onRetry={refetch} /> : null}
            {isLoading && !data ? <LoadingState label="Loading the team dashboard" /> : null}

            {data && view ? (
                <div className={isLoading ? "sb-body is-refreshing" : "sb-body"}>
                    {/* ---- Team headline ---- */}
                    <Section title="Team headline" note="the four numbers the manager opens for" />

                    <div className="sb-grid">
                        <section className="sb-card sb-tile sb-hero span4">
                            <div className="lab">Weighted forecast</div>
                            <div className="val">{compactCurrency(data.headline.weightedForecast)}</div>
                            <div className="cap">
                                Open pipeline weighted by each stage&apos;s win-probability.
                            </div>
                            <div className="sb-chips">
                                <span className="sb-chip">
                                    Quotations <b>{number(data.funnel.quotations)}</b>
                                </span>
                                <span className="sb-chip">
                                    Booked <b>{number(data.headline.teamBooked)}</b>
                                </span>
                                <span className="sb-chip">
                                    Visits <b>{number(data.funnel.visits)}</b>
                                </span>
                            </div>
                        </section>

                        <section
                            className="sb-card sb-tile sb-card--link span3"
                            onClick={() => navigate("/layout/customers")}
                        >
                            <div className="sb-accent" style={{ background: "linear-gradient(90deg, var(--sb-1), var(--sb-1-lift))" }} />
                            <div className="lab sb-lab-row">
                                Team lead count
                                <button
                                    type="button"
                                    className="sb-go"
                                    aria-label="Open leads"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        navigate("/layout/customers");
                                    }}
                                >
                                    →
                                </button>
                            </div>
                            <div className="val">{number(data.headline.teamLeads)}</div>
                            <div className="cap">across the team&apos;s projects</div>
                            <div>
                                <DeltaPill delta={view.leadDelta} />
                            </div>
                            <Spark series={view.leadSeries} />
                        </section>

                        <section className="sb-card sb-tile span3">
                            <div className="sb-accent" style={{ background: "linear-gradient(90deg, var(--sb-3), var(--sb-3-lift))" }} />
                            <div className="lab">Team conversion</div>
                            <div className="val">{pct(data.headline.teamConversion)}</div>
                            <div className="cap">
                                {number(data.headline.teamBooked)} booked of{" "}
                                {number(data.headline.teamLeads)} leads
                            </div>
                            <div>
                                <DeltaPill delta={view.convDelta} />
                            </div>
                            <Spark series={view.convSeries} />
                        </section>

                        <section
                            className="sb-card sb-tile sb-card--link span2"
                            onClick={() => navigate("/layout/customers?ownership=unassigned")}
                        >
                            <div className="sb-accent" style={{ background: "linear-gradient(90deg, var(--warning), var(--danger))" }} />
                            <div className="lab sb-lab-row">
                                Unassigned backlog
                                <button
                                    type="button"
                                    className="sb-go"
                                    aria-label="Open unassigned leads"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        navigate("/layout/customers?ownership=unassigned");
                                    }}
                                >
                                    →
                                </button>
                            </div>
                            <div className="val sb-warn">{number(data.headline.unassignedBacklog)}</div>
                            <div className="cap">leads waiting to be assigned</div>
                            <div className="sb-meter">
                                <i
                                    style={{
                                        width: `${data.headline.backlogShare}%`,
                                        background: "linear-gradient(90deg, var(--warning), var(--danger))",
                                    }}
                                />
                            </div>
                            <div className="cap" style={{ marginTop: 8 }}>
                                {pct(data.headline.backlogShare)} of the team&apos;s leads
                            </div>
                        </section>
                    </div>

                    {/* ---- Lead generation ---- */}
                    <Section
                        title="Lead generation"
                        note="last 6 months · leads → visits → bookings"
                    />

                    <div className="sb-grid">
                        <Panel
                            span={8}
                            title="Leads · visits · bookings"
                            note="Three counts on one scale — never a second y-axis."
                            table={
                                <Table
                                    rows={data.leadGen}
                                    columns={[
                                        { label: "Month", render: (r) => r.month },
                                        { label: "Leads", num: true, render: (r) => number(r.leads) },
                                        { label: "Visits", num: true, render: (r) => number(r.visits) },
                                        { label: "Bookings", num: true, render: (r) => number(r.bookings) },
                                    ]}
                                />
                            }
                        >
                            <div className="sb-chart">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.leadGen} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={3}>
                                        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                                        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
                                        <YAxis tickLine={false} axisLine={false} width={44} tick={axisTick} allowDecimals={false} />
                                        <Tooltip cursor={{ fill: "var(--surface-hover)" }} contentStyle={tooltipStyle} />
                                        <Bar dataKey="leads" name="Leads" fill={hue(0)} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                                        <Bar dataKey="visits" name="Visits" fill={hue(1)} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                                        <Bar dataKey="bookings" name="Bookings" fill={hue(2)} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <Legend
                                items={[
                                    { name: "Leads", hue: hue(0) },
                                    { name: "Visits", hue: hue(1) },
                                    { name: "Bookings", hue: hue(2) },
                                ]}
                            />
                        </Panel>

                        <Panel
                            span={4}
                            title="Conversion rate"
                            note="Its own chart and its own axis, so a spike reads as a spike."
                            table={
                                <Table
                                    rows={data.leadGen}
                                    columns={[
                                        { label: "Month", render: (r) => r.month },
                                        { label: "Conversion", num: true, render: (r) => pct(r.conversion) },
                                    ]}
                                />
                            }
                        >
                            <div className="sb-chart">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.leadGen} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="sb-conv-fill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="var(--sb-3)" stopOpacity={0.32} />
                                                <stop offset="100%" stopColor="var(--sb-3)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                                        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
                                        <YAxis tickLine={false} axisLine={false} width={44} tick={axisTick} tickFormatter={(v) => `${v}%`} />
                                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [pct(v), "Conversion"]} />
                                        <Area
                                            type="monotone"
                                            dataKey="conversion"
                                            stroke="var(--sb-3)"
                                            strokeWidth={2}
                                            fill="url(#sb-conv-fill)"
                                            dot={{ r: 3, fill: "var(--sb-3)", strokeWidth: 0 }}
                                            isAnimationActive={false}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Panel>
                    </div>

                    {/* ---- Funnel, outcomes & sources ---- */}
                    <Section title="Funnel, outcomes & sources" note="where the pipeline leaks" />

                    <div className="sb-grid">
                        <Panel
                            span={4}
                            title="Lead funnel"
                            note="One hue per stage. Band width = share of the top; the taper is the loss."
                            table={
                                <Table
                                    rows={view.funnel}
                                    columns={[
                                        { label: "Stage", render: (r) => (<><Swatch color={r.hue} />{r.name}</>) },
                                        { label: "Leads", num: true, render: (r) => number(r.value) },
                                        {
                                            label: "Share",
                                            num: true,
                                            render: (r) => pct(view.funnel[0].value ? (r.value / view.funnel[0].value) * 100 : 0),
                                        },
                                    ]}
                                />
                            }
                        >
                            {view.funnel[0].value ? (
                                <Funnel stages={view.funnel} />
                            ) : (
                                <Empty title="No leads in this period" />
                            )}
                        </Panel>

                        <Panel
                            span={4}
                            title="Leads by call outcome"
                            note={'The "How did it go?" mix — one hue per outcome.'}
                            table={
                                <Table
                                    rows={view.outcomes}
                                    columns={[
                                        { label: "Outcome", render: (r) => (<><Swatch color={r.hue} />{r.name}</>) },
                                        { label: "Leads", num: true, render: (r) => number(r.value) },
                                    ]}
                                />
                            }
                        >
                            {view.outcomes.length ? (
                                <Donut items={view.outcomes} unit="leads" />
                            ) : (
                                <Empty title="No call outcomes yet" />
                            )}
                        </Panel>

                        <Panel
                            span={4}
                            title="Top lead sources"
                            note={'One hue per source; the tail folds into "Other".'}
                            table={
                                <Table
                                    rows={view.sources}
                                    columns={[
                                        { label: "Source", render: (r) => (<><Swatch color={r.hue} />{r.name}</>) },
                                        { label: "Leads", num: true, render: (r) => number(r.value) },
                                        {
                                            label: "MoM",
                                            num: true,
                                            render: (r) =>
                                                r.row?.mom === null || r.row?.mom === undefined
                                                    ? "—"
                                                    : `${r.row.mom > 0 ? "+" : ""}${r.row.mom}%`,
                                        },
                                    ]}
                                />
                            }
                        >
                            {view.sources.length ? (
                                <Rows
                                    items={view.sources}
                                    extra={(item) =>
                                        item.row && item.row.mom !== null ? (
                                            <span className={`sb-pill ${item.row.mom >= 0 ? "up" : "down"}`}>
                                                {item.row.mom >= 0 ? "▲" : "▼"} {Math.abs(item.row.mom)}%
                                            </span>
                                        ) : null
                                    }
                                />
                            ) : (
                                <Empty title="No sources recorded" />
                            )}
                        </Panel>
                    </div>

                    {/* ---- Pipeline value ---- */}
                    <Section title="Pipeline value" note="where the money is sitting, and with whom" />

                    <div className="sb-grid">
                        <Panel
                            span={5}
                            title="Sales pipeline by stage"
                            note={`${compactCurrency(view.stageTotal)} active · one hue per stage`}
                            table={
                                <Table
                                    rows={view.stages}
                                    columns={[
                                        { label: "Stage", render: (r) => (<><Swatch color={r.hue} />{r.name}</>) },
                                        { label: "Leads", num: true, render: (r) => number(r.leads) },
                                        { label: "Open value", num: true, render: (r) => compactCurrency(r.value) },
                                    ]}
                                />
                            }
                        >
                            {view.stages.length ? (
                                <>
                                    <div className="sb-chart sb-chart--sm">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={view.stages} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                                                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                                                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={false} height={4} />
                                                <YAxis
                                                    tickLine={false}
                                                    axisLine={false}
                                                    width={62}
                                                    tick={axisTick}
                                                    tickFormatter={(v) => compactCurrency(v)}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: "var(--surface-hover)" }}
                                                    contentStyle={tooltipStyle}
                                                    formatter={(v) => [compactCurrency(v), "Open value"]}
                                                />
                                                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
                                                    {view.stages.map((stage) => (
                                                        <Cell key={stage.name} fill={stage.hue} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <Legend
                                        items={view.stages.map((stage) => ({
                                            ...stage,
                                            value: compactCurrency(stage.value),
                                        }))}
                                    />
                                </>
                            ) : (
                                <Empty title="No lead at any stage" />
                            )}
                        </Panel>

                        <Panel
                            span={4}
                            title="Pipeline value by owner"
                            note="Share of open pipeline · one hue per owner."
                            table={
                                <Table
                                    rows={data.pipelineByOwner}
                                    columns={[
                                        { label: "Owner", render: (r, i) => (<><Swatch color={hue(Math.min(i, 8))} />{r.owner}</>) },
                                        { label: "Leads", num: true, render: (r) => number(r.leads) },
                                        { label: "Open value", num: true, render: (r) => compactCurrency(r.value) },
                                    ]}
                                />
                            }
                        >
                            {view.owners.length ? (
                                <Donut items={view.owners} unit="open value" format={compactCurrency} />
                            ) : (
                                <Empty title="No open pipeline" />
                            )}
                        </Panel>

                        <Panel
                            span={3}
                            title="Sales forecast by rep"
                            note="Weighted by stage win-probability · top 8."
                            table={
                                <Table
                                    rows={data.forecastByRep}
                                    columns={[
                                        { label: "Rep", render: (r) => r.rep },
                                        { label: "Forecast", num: true, render: (r) => compactCurrency(r.forecast) },
                                    ]}
                                />
                            }
                        >
                            {view.forecast.length ? (
                                <Rows items={view.forecast} format={compactCurrency} />
                            ) : (
                                <Empty title="No forecast yet" note="No rep holds an open lead in this period." />
                            )}
                        </Panel>
                    </div>

                    {/* ---- Per-rep performance ---- */}
                    <Section title="Per-rep performance" note="productivity comparison" />

                    <div className="sb-grid">
                        <Panel
                            span={5}
                            title="Conversion by rep"
                            note="Top 8 by conversion · one hue per rep."
                            table={
                                <Table
                                    rows={view.topReps.map((item) => item.row)}
                                    columns={[
                                        { label: "Rep", render: (r) => r.rep },
                                        { label: "Leads", num: true, render: (r) => number(r.leads) },
                                        { label: "Booked", num: true, render: (r) => number(r.booked) },
                                        { label: "Conversion", num: true, render: (r) => pct(r.conversion) },
                                    ]}
                                />
                            }
                        >
                            {view.topReps.length ? (
                                <Rows items={view.topReps} format={pct} />
                            ) : (
                                <Empty title="No rep activity" />
                            )}
                        </Panel>

                        <Panel
                            span={7}
                            title="Rep breakdown"
                            note="The table is the chart's accessible twin — always readable."
                        >
                            {data.repBreakdown.length ? (
                                <div className="sb-tblwrap">
                                    <Table
                                        rows={data.repBreakdown}
                                        columns={[
                                            { label: "Rep", render: (r) => r.rep },
                                            { label: "Leads", num: true, render: (r) => number(r.leads) },
                                            { label: "Booked", num: true, render: (r) => number(r.booked) },
                                            {
                                                label: "Conversion",
                                                num: true,
                                                render: (r, i) => {
                                                    const max = data.repBreakdown[0]?.conversion || 1;
                                                    return (
                                                        <>
                                                            <span className="sb-repbar">
                                                                <i
                                                                    style={{
                                                                        width: `${(r.conversion / max) * 100}%`,
                                                                        background: hue(Math.min(i, 8)),
                                                                    }}
                                                                />
                                                            </span>
                                                            {pct(r.conversion)}
                                                        </>
                                                    );
                                                },
                                            },
                                        ]}
                                    />
                                </div>
                            ) : (
                                <Empty title="No rep activity" />
                            )}
                        </Panel>
                    </div>

                    {/* ---- Visits ---- */}
                    <Section title="Visits" note={`${number(data.visitTotal)} visits this period`} />

                    <div className="sb-grid">
                        <Panel
                            span={4}
                            title="Visits by status"
                            note="One hue per status."
                            table={
                                <Table
                                    rows={view.visitStatus}
                                    columns={[
                                        { label: "Status", render: (r) => (<><Swatch color={r.hue} />{r.name}</>) },
                                        { label: "Visits", num: true, render: (r) => number(r.value) },
                                    ]}
                                />
                            }
                        >
                            {view.visitStatus.length ? (
                                <Donut items={view.visitStatus} unit="visits" />
                            ) : (
                                <Empty title="No site visits" />
                            )}
                        </Panel>

                        <Panel
                            span={8}
                            title="Scheduled → completed, by executive"
                            note="Two hues, one row per executive. The gap is the story."
                            table={
                                <Table
                                    rows={data.visitsByExecutive}
                                    columns={[
                                        { label: "Executive", render: (r) => r.executive },
                                        { label: "Scheduled", num: true, render: (r) => number(r.scheduled) },
                                        { label: "Completed", num: true, render: (r) => number(r.completed) },
                                        { label: "Done", num: true, render: (r) => pct(r.done) },
                                    ]}
                                />
                            }
                        >
                            {data.visitsByExecutive.length ? (
                                <>
                                    <div className="sb-pairs">
                                        {(() => {
                                            const max = Math.max(1, ...data.visitsByExecutive.map((r) => r.scheduled));

                                            return data.visitsByExecutive.map((row) => (
                                                <div key={row.executive} className="sb-pair">
                                                    <span className="nm" title={row.executive}>{row.executive}</span>
                                                    <span className="bars">
                                                        <i style={{ width: `${(row.scheduled / max) * 100}%`, background: hue(0) }} />
                                                        <i style={{ width: `${(row.completed / max) * 100}%`, background: hue(2) }} />
                                                    </span>
                                                    <span className="vl">
                                                        {number(row.completed)}
                                                        <em>/ {number(row.scheduled)}</em>
                                                    </span>
                                                </div>
                                            ));
                                        })()}
                                    </div>

                                    <Legend
                                        items={[
                                            { name: "Scheduled", hue: hue(0) },
                                            { name: "Completed", hue: hue(2) },
                                        ]}
                                    />
                                </>
                            ) : (
                                <Empty title="No site visits" />
                            )}
                        </Panel>
                    </div>

                    {/* ---- Outcomes & activity ---- */}
                    <Section
                        title="Outcomes & activity"
                        note="closed business and what the team did today"
                    />

                    <div className="sb-grid">
                        <Panel
                            span={6}
                            title="Forecast vs lost value by rep"
                            note="Diverging: two opposite hues, neutral zero line."
                            table={
                                <Table
                                    rows={data.forecastByRep}
                                    columns={[
                                        { label: "Rep", render: (r) => r.rep },
                                        { label: "Forecast", num: true, render: (r) => compactCurrency(r.forecast) },
                                        { label: "Lost", num: true, render: (r) => compactCurrency(r.lost) },
                                    ]}
                                />
                            }
                        >
                            {view.winLoss.length ? (
                                <>
                                    <div className="sb-diverge">
                                        {(() => {
                                            const max = Math.max(
                                                1,
                                                ...view.winLoss.map((r) => Math.max(r.forecast, r.lost))
                                            );

                                            return view.winLoss.map((row) => (
                                                <div key={row.rep} className="sb-dv">
                                                    <span className="nm" title={row.rep}>{row.rep}</span>
                                                    <span className="side is-lost">
                                                        <em>{compactCurrency(row.lost)}</em>
                                                        <i style={{ width: `${(row.lost / max) * 100}%` }} />
                                                    </span>
                                                    <span className="zero" />
                                                    <span className="side is-won">
                                                        <i style={{ width: `${(row.forecast / max) * 100}%` }} />
                                                        <em>{compactCurrency(row.forecast)}</em>
                                                    </span>
                                                </div>
                                            ));
                                        })()}
                                    </div>

                                    <Legend
                                        items={[
                                            { name: "Forecast", hue: "var(--sb-won)" },
                                            { name: "Lost", hue: "var(--sb-lost)" },
                                        ]}
                                    />
                                </>
                            ) : (
                                <Empty title="Nothing forecast or lost" />
                            )}
                        </Panel>

                        <Panel
                            span={6}
                            title="Team feed"
                            note="Newest first · who did what"
                            table={
                                <Table
                                    rows={shownActivity}
                                    columns={[
                                        { label: "Kind", render: (r) => FEED_KINDS[r.kind]?.label },
                                        { label: "Lead", render: (r) => r.lead || "—" },
                                        { label: "What", render: (r) => r.what },
                                        { label: "Who", render: (r) => r.who || "—" },
                                        { label: "When", render: (r) => relativeTime(r.at) },
                                    ]}
                                />
                            }
                        >
                            {data.activity.length ? (
                                <>
                                    <div className="sb-feed">
                                        {shownActivity.map((item, index) => (
                                            <div key={index} className="sb-fi">
                                                <span
                                                    className="tag"
                                                    style={{ background: FEED_KINDS[item.kind]?.color }}
                                                >
                                                    {FEED_KINDS[item.kind]?.label}
                                                </span>
                                                <span className="mid">
                                                    <span className="t1">{item.what}</span>
                                                    <span className="t2">
                                                        {item.lead || "—"} · {item.who || "—"}
                                                    </span>
                                                </span>
                                                <span className="when">{relativeTime(item.at)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {data.activity.length > feedLimit ? (
                                        <button
                                            type="button"
                                            className="sb-more"
                                            onClick={() => setFeedLimit(data.activity.length)}
                                        >
                                            Show all {data.activity.length}
                                        </button>
                                    ) : null}
                                </>
                            ) : (
                                <Empty
                                    title="Nothing logged yet"
                                    note="No follow-ups, visits or stage changes in this period."
                                />
                            )}
                        </Panel>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default ManagerDashboard;

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
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
    DeltaPill,
    Donut,
    Empty,
    FEED_KINDS,
    Feed,
    FilterBar,
    Funnel,
    Panel,
    Rows,
    Section,
    Spark,
    Swatch,
    Table,
    axisTick,
    foldTail,
    hue,
    pct,
    tooltipStyle,
    trendDelta,
} from "../components/dashboard/DashboardKit";
import { number, relativeTime } from "../utils/format";

/* =========================================================
   MY DASHBOARD
   The CRM Executive's own book. Where the manager's screen
   asks how the team is doing, this one asks what needs me
   before anything else.
   ========================================================= */

const RepDashboard = () => {
    const navigate = useNavigate();

    const [period, setPeriod] = useState("quarter");
    const [projectId, setProjectId] = useState("");
    const [feedLimit, setFeedLimit] = useState(8);

    const { data: projectList } = useAsyncData(
        () => projectsApi.list({ limit: 100, sort: "name" }),
        []
    );

    const { data, isLoading, error, refetch } = useAsyncData(
        () => dashboard.rep({ period, ...(projectId ? { project: projectId } : {}) }),
        [period, projectId]
    );

    const view = useMemo(() => {
        if (!data) return null;

        const leadSeries = data.trend.map((row) => row.leads);

        return {
            leadSeries,
            leadDelta: trendDelta(leadSeries, "pct"),
            funnel: [
                { name: "Leads", value: data.myFunnel.leads },
                { name: "Visits", value: data.myFunnel.visits },
                { name: "Quotations", value: data.myFunnel.quotations },
                { name: "Booked", value: data.myFunnel.booked },
            ].map((stage, index) => ({ ...stage, hue: hue(index) })),
            gauges: [
                {
                    name: "Conversion",
                    value: data.quality.personalConversionRate,
                    hue: hue(0),
                    note: "of my leads reached Booked",
                },
                {
                    name: "Visit to booking",
                    value: data.quality.siteVisitToBooking,
                    hue: hue(2),
                    note: "of my completed visits booked",
                },
                {
                    name: "Follow-ups on time",
                    value: data.quality.followUpOnTime,
                    hue: hue(3),
                    note: "of my open book is not overdue",
                },
            ],
            buckets: data.buckets.map((bucket, index) => ({
                name: bucket.name,
                value: bucket.value,
                hue: bucket.urgent ? "var(--warning)" : hue(index),
            })),
            health: data.health.map((row, index) => ({ ...row, hue: hue(index) })),
            months: data.trend.map((row, index) => ({
                name: row.month,
                value: row.leads,
                hue: hue(index),
            })),
            outcomes: foldTail(data.outcomes, "outcome", "leads"),
            sources: foldTail(data.sources, "source", "leads"),
            stages: foldTail(data.stages, "stage", "leads"),
            visitOutcomes: foldTail(data.visitOutcomes, "outcome", "visits"),
            visitStatus: foldTail(data.visitsByStatus, "status", "visits"),
        };
    }, [data]);

    const shownActivity = (data?.activity || []).slice(0, feedLimit).map((item) => ({
        ...item,
        when: relativeTime(item.at),
    }));

    return (
        <div className="sb-page">
            <div className="page-head">
                <div>
                    <h1 className="page-title">My Dashboard</h1>
                    <p className="page-lede">CRM Executive view - my own book only</p>
                </div>
            </div>

            <FilterBar
                projects={projectList}
                projectId={projectId}
                onProject={setProjectId}
                period={period}
                onPeriod={setPeriod}
                onRefresh={refetch}
            />

            {error ? <ErrorState message={error} onRetry={refetch} /> : null}
            {isLoading && !data ? <LoadingState label="Loading my dashboard" /> : null}

            {data && view ? (
                <div className={isLoading ? "sb-body is-refreshing" : "sb-body"}>
                    {/* ---- My day ---- */}
                    <Section title="My day" note="what needs me before anything else" />

                    <div className="sb-grid">
                        <section className="sb-card sb-tile sb-hero span4">
                            <div className="lab">My conversion rate</div>
                            <div className="val">{pct(data.quality.personalConversionRate)}</div>
                            <div className="cap">
                                {number(data.headline.conversions)} of my{" "}
                                {number(data.headline.myLeads)} assigned leads have reached Booked.
                            </div>
                            <div className="chips">
                                <span className="chip">
                                    Booked <b>{number(data.headline.conversions)}</b>
                                </span>
                                <span className="chip">
                                    Visits <b>{number(data.myFunnel.visits)}</b>
                                </span>
                                <span className="chip">
                                    Visit → booking <b>{pct(data.quality.siteVisitToBooking)}</b>
                                </span>
                            </div>
                        </section>

                        <section
                            className="sb-card sb-tile sb-card--link span3"
                            onClick={() => navigate("/layout/customers")}
                        >
                            <div
                                className="sb-accent"
                                style={{ background: "linear-gradient(90deg, var(--sb-1), var(--sb-1-lift))" }}
                            />
                            <div className="lab sb-lab-row">
                                My leads
                                <button
                                    type="button"
                                    className="sb-go"
                                    aria-label="Open my leads"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        navigate("/layout/customers");
                                    }}
                                >
                                    →
                                </button>
                            </div>
                            <div className="val">{number(data.headline.myLeads)}</div>
                            <div className="cap">assigned to me</div>
                            <div>
                                <DeltaPill delta={view.leadDelta} />
                            </div>
                            <Spark series={view.leadSeries} />
                        </section>

                        <section className="sb-card sb-tile span3">
                            <div
                                className="sb-accent"
                                style={{ background: "linear-gradient(90deg, var(--sb-3), var(--sb-3-lift))" }}
                            />
                            <div className="lab">Conversions</div>
                            <div className="val">{number(data.headline.conversions)}</div>
                            <div className="cap">reached Booked</div>
                            <div>
                                <span className="sb-pill up">
                                    {pct(data.quality.personalConversionRate)} of my leads
                                </span>
                            </div>
                            <div className="cap" style={{ marginTop: 10 }}>
                                Visits this week: <b>{number(data.headline.siteVisitsWeek)}</b>
                            </div>
                        </section>

                        <section
                            className="sb-card sb-tile sb-card--link span2"
                            onClick={() => navigate("/layout/follow-ups")}
                        >
                            <div
                                className="sb-accent"
                                style={{ background: "linear-gradient(90deg, var(--warning), var(--danger))" }}
                            />
                            <div className="lab sb-lab-row">
                                Pending follow-ups
                                <button
                                    type="button"
                                    className="sb-go"
                                    aria-label="Open follow-ups"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        navigate("/layout/follow-ups");
                                    }}
                                >
                                    →
                                </button>
                            </div>
                            <div className="val sb-warn">{number(data.headline.pendingFollowUps)}</div>
                            <div className="cap">due today or overdue</div>
                            <div className="sb-meter">
                                <i
                                    style={{
                                        width: `${data.headline.followUpShare}%`,
                                        background: "linear-gradient(90deg, var(--warning), var(--danger))",
                                    }}
                                />
                            </div>
                            <div className="cap" style={{ marginTop: 8 }}>
                                {pct(data.headline.followUpShare)} of my open book
                            </div>
                        </section>
                    </div>

                    {/* ---- My quality ---- */}
                    <Section title="My quality" note="three ratios that decide my month" />

                    <div className="sb-grid">
                        <Panel
                            span={5}
                            title="Quality gauges"
                            note="One hue per measure — they are never compared against each other."
                            table={
                                <Table
                                    rows={view.gauges}
                                    columns={[
                                        {
                                            label: "Measure",
                                            render: (r) => (
                                                <>
                                                    <Swatch color={r.hue} />
                                                    {r.name}
                                                </>
                                            ),
                                        },
                                        { label: "Rate", num: true, render: (r) => pct(r.value) },
                                    ]}
                                />
                            }
                        >
                            <div className="sb-gauges">
                                {view.gauges.map((gauge) => (
                                    <div key={gauge.name} className="sb-gauge">
                                        <div className="sb-gauge-top">
                                            <span className="nm">{gauge.name}</span>
                                            <b>{pct(gauge.value)}</b>
                                        </div>
                                        <span className="tr">
                                            <i
                                                style={{
                                                    width: `${Math.min(gauge.value, 100)}%`,
                                                    background: gauge.hue,
                                                }}
                                            />
                                        </span>
                                        <span className="cap">{gauge.note}</span>
                                    </div>
                                ))}
                            </div>
                        </Panel>

                        <Panel
                            span={4}
                            title="My follow-up queue"
                            note="Straight from the Follow-ups module's own buckets."
                            table={
                                <Table
                                    rows={data.buckets}
                                    columns={[
                                        { label: "Bucket", render: (r) => r.name },
                                        { label: "Follow-ups", num: true, render: (r) => number(r.value) },
                                    ]}
                                />
                            }
                        >
                            <Rows items={view.buckets} />
                        </Panel>

                        <Panel
                            span={3}
                            title="Lead health"
                            note="The four counts on my Leads screen."
                            table={
                                <Table
                                    rows={data.health}
                                    columns={[
                                        { label: "Count", render: (r) => r.name },
                                        { label: "Leads", num: true, render: (r) => number(r.value) },
                                    ]}
                                />
                            }
                        >
                            <Rows items={view.health} />
                        </Panel>
                    </div>

                    {/* ---- My pipeline ---- */}
                    <Section title="My pipeline" note="lead flow · monthly intake" />

                    <div className="sb-grid">
                        <Panel
                            span={4}
                            title="My funnel"
                            note="One hue per stage. Band width = share of my leads."
                            table={
                                <Table
                                    rows={view.funnel}
                                    columns={[
                                        {
                                            label: "Stage",
                                            render: (r) => (
                                                <>
                                                    <Swatch color={r.hue} />
                                                    {r.name}
                                                </>
                                            ),
                                        },
                                        { label: "Count", num: true, render: (r) => number(r.value) },
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
                            span={8}
                            title="My leads · last 6 months"
                            note="One hue per month — a short current month is a part-month, not a collapse."
                            table={
                                <Table
                                    rows={data.trend}
                                    columns={[
                                        { label: "Month", render: (r) => r.month },
                                        { label: "Leads", num: true, render: (r) => number(r.leads) },
                                        { label: "Booked", num: true, render: (r) => number(r.booked) },
                                    ]}
                                />
                            }
                        >
                            <div className="sb-chart">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={data.trend}
                                        margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                                    >
                                        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                                        <XAxis
                                            dataKey="month"
                                            tickLine={false}
                                            axisLine={false}
                                            tick={axisTick}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            width={44}
                                            tick={axisTick}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: "var(--surface-hover)" }}
                                            contentStyle={tooltipStyle}
                                        />
                                        <Bar
                                            dataKey="leads"
                                            name="Leads"
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={44}
                                            isAnimationActive={false}
                                        >
                                            {data.trend.map((row, index) => (
                                                <Cell key={row.month} fill={hue(index)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Panel>
                    </div>

                    {/* ---- My conversations ---- */}
                    <Section
                        title="My conversations"
                        note="what my calls produced, and where the leads came from"
                    />

                    <div className="sb-grid">
                        <Panel
                            span={4}
                            title="My call outcomes"
                            note={'The "How did it go?" mix — one hue per outcome.'}
                            table={
                                <Table
                                    rows={view.outcomes}
                                    columns={[
                                        {
                                            label: "Outcome",
                                            render: (r) => (
                                                <>
                                                    <Swatch color={r.hue} />
                                                    {r.name}
                                                </>
                                            ),
                                        },
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
                            title="My lead sources"
                            note={'One hue per source; the tail folds into "Other".'}
                            table={
                                <Table
                                    rows={view.sources}
                                    columns={[
                                        {
                                            label: "Source",
                                            render: (r) => (
                                                <>
                                                    <Swatch color={r.hue} />
                                                    {r.name}
                                                </>
                                            ),
                                        },
                                        { label: "Leads", num: true, render: (r) => number(r.value) },
                                    ]}
                                />
                            }
                        >
                            {view.sources.length ? (
                                <Rows items={view.sources} />
                            ) : (
                                <Empty title="No sources recorded" />
                            )}
                        </Panel>

                        <Panel
                            span={4}
                            title="My visit outcomes"
                            note="What the visit ended in."
                            table={
                                <Table
                                    rows={view.visitOutcomes}
                                    columns={[
                                        {
                                            label: "Outcome",
                                            render: (r) => (
                                                <>
                                                    <Swatch color={r.hue} />
                                                    {r.name}
                                                </>
                                            ),
                                        },
                                        { label: "Visits", num: true, render: (r) => number(r.value) },
                                    ]}
                                />
                            }
                        >
                            {view.visitOutcomes.length ? (
                                <Rows items={view.visitOutcomes} />
                            ) : (
                                <Empty
                                    title="No completed visits yet"
                                    note="An outcome is recorded once a visit is completed."
                                />
                            )}
                        </Panel>
                    </div>

                    {/* ---- My visits ---- */}
                    <Section
                        title="My visits"
                        note={`${number(data.visitTotal)} visits scheduled against my leads this period`}
                    />

                    <div className="sb-grid">
                        <Panel
                            span={5}
                            title="Visits by status"
                            note="One hue per status."
                            table={
                                <Table
                                    rows={view.visitStatus}
                                    columns={[
                                        {
                                            label: "Status",
                                            render: (r) => (
                                                <>
                                                    <Swatch color={r.hue} />
                                                    {r.name}
                                                </>
                                            ),
                                        },
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
                            span={3}
                            title="My stage mix"
                            note="Assigned leads by current stage."
                            table={
                                <Table
                                    rows={view.stages}
                                    columns={[
                                        {
                                            label: "Stage",
                                            render: (r) => (
                                                <>
                                                    <Swatch color={r.hue} />
                                                    {r.name}
                                                </>
                                            ),
                                        },
                                        { label: "Leads", num: true, render: (r) => number(r.value) },
                                    ]}
                                />
                            }
                        >
                            {view.stages.length ? (
                                <Rows items={view.stages} />
                            ) : (
                                <Empty title="No leads in this period" />
                            )}
                        </Panel>

                        <Panel
                            span={4}
                            title="My recent activity"
                            note="Newest first · only my own actions"
                            table={
                                <Table
                                    rows={shownActivity}
                                    columns={[
                                        { label: "Kind", render: (r) => FEED_KINDS[r.kind]?.label },
                                        { label: "Lead", render: (r) => r.lead || "—" },
                                        { label: "What", render: (r) => r.what },
                                        { label: "When", render: (r) => r.when },
                                    ]}
                                />
                            }
                        >
                            {data.activity.length ? (
                                <>
                                    <Feed items={shownActivity} showWho={false} />

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
                                    note="No follow-ups, visits or calls of mine in this period."
                                />
                            )}
                        </Panel>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default RepDashboard;

import { useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
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
    Empty,
    FilterBar,
    Legend,
    Panel,
    Section,
    Spark,
    Swatch,
    Table,
    axisTick,
    hue,
    pct,
    tooltipStyle,
} from "../components/dashboard/DashboardKit";
import { compactCurrency, date, number } from "../utils/format";

/* =========================================================
   COLLECTIONS & FINANCE
   The Post-Sales Manager's dashboard. What is owed, how late
   it is, and what we owe partners.
   ========================================================= */

const CollectionsDashboard = () => {
    const [period, setPeriod] = useState("quarter");
    const [projectId, setProjectId] = useState("");

    const { data: projectList } = useAsyncData(
        () => projectsApi.list({ limit: 100, sort: "name" }),
        []
    );

    const { data, isLoading, error, refetch } = useAsyncData(
        () => dashboard.collections({ period, ...(projectId ? { project: projectId } : {}) }),
        [period, projectId]
    );

    const vsLabel =
        period === "month"
            ? "vs previous month"
            : period === "quarter"
              ? "vs previous quarter"
              : "vs previous period";

    const view = useMemo(() => {
        if (!data) return null;

        const change = data.headline.collectionEfficiency - data.headline.collectionEfficiencyPrev;
        const rounded = Math.round(change * 10) / 10;

        return {
            efficiencyDelta: data.headline.collectionEfficiencyPrev
                ? {
                      up: rounded >= 0,
                      text: `${rounded >= 0 ? "▲" : "▼"} ${Math.abs(rounded)} pts`,
                  }
                : null,
            agingMax: Math.max(1, ...data.aging.map((row) => row.amount)),
            // The rate each of the last six months achieved, for the tile's
            // sparkline. One series, the same rows the chart below plots.
            efficiencySeries: data.trend.map((row) =>
                row.due ? Math.round((row.collected / row.due) * 1000) / 10 : 0
            ),
            commission: [
                { name: "Earned", value: data.commission.earned, hue: hue(0) },
                { name: "Due for payout", value: data.commission.dueForPayout, hue: hue(3) },
                { name: "On hold", value: data.commission.heldOnHold, hue: hue(1) },
                { name: "Paid to date", value: data.commission.netPaid, hue: hue(2) },
            ],
        };
    }, [data]);

    return (
        <div className="sb-page">
            <div className="page-head">
                <div>
                    <h1 className="page-title">Collections &amp; Finance</h1>
                    <p className="page-lede">
                        Post-Sales view - what is owed, how late it is, and what we owe partners
                    </p>
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
            {isLoading && !data ? <LoadingState label="Loading collections" /> : null}

            {data && view ? (
                <div className={isLoading ? "sb-body is-refreshing" : "sb-body"}>
                    {/* ---- Collections headline ---- */}
                    <Section title="Collections headline" note="money owed, and how it is arriving" />

                    <div className="sb-grid sb-grid--auto">
                        <section className="sb-card sb-tile sb-tint-rose">
                            <div className="lab">Outstanding Dues</div>
                            <div className="val is-num is-crit">
                                {compactCurrency(data.headline.outstandingDues)}
                            </div>
                            <div className="cap">overdue &amp; unpaid, past due date</div>
                            <div>
                                <span className="sb-pillbig">
                                    {number(data.headline.overdueMilestones)} milestones overdue
                                </span>
                            </div>
                        </section>

                        <section className="sb-card sb-tile sb-tint-blue">
                            <div className="lab">Collection Efficiency</div>
                            <div className="val is-num is-good">
                                {data.headline.collectionEfficiency.toFixed(1)}
                                <span className="u">%</span>
                            </div>
                            <div className="cap">
                                {compactCurrency(data.headline.collected)} of{" "}
                                {compactCurrency(data.headline.amountDue)} <b>due</b>
                            </div>
                            <DeltaPill delta={view.efficiencyDelta} caption={vsLabel} />
                            <Spark series={view.efficiencySeries} />
                        </section>

                        <section className="sb-card sb-tile sb-tint-blue">
                            <div className="lab">DSO</div>
                            <div className="val is-num">
                                ~{number(data.headline.dsoDays)}
                                <span className="u"> days</span>
                            </div>
                            <div className="cap">days sales outstanding</div>
                        </section>

                        <section className="sb-card sb-tile sb-tint-sun">
                            <div className="lab">Upcoming Milestones · 30d</div>
                            <div className="val is-num">
                                {compactCurrency(data.headline.upcomingAmount)}
                            </div>
                            <div className="cap">
                                {number(data.headline.upcomingCount)} milestones due next 30 days
                            </div>
                        </section>

                        <section className="sb-card sb-tile sb-tint-blue">
                            <div className="lab">Last Payment</div>
                            {data.headline.lastPaymentAmount ? (
                                <>
                                    <div className="val is-num is-good">
                                        {compactCurrency(data.headline.lastPaymentAmount)}
                                    </div>
                                    <div className="cap">
                                        {data.headline.lastPaymentUnit || "Unit"} ·{" "}
                                        {date(data.headline.lastPaymentDate)}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="val is-num">—</div>
                                    <div className="cap">nothing collected in this period</div>
                                </>
                            )}
                        </section>
                    </div>

                    {/* ---- Due vs collected ---- */}
                    <Section title="Due vs collected · last 6 months" note="month-on-month" />

                    <div className="sb-grid">
                        <Panel
                            span={8}
                            title="Due against collected"
                            note="Both series count the month a milestone fell due, never the day a cheque cleared."
                            table={
                                <Table
                                    rows={data.trend}
                                    columns={[
                                        { label: "Month", render: (r) => r.month },
                                        { label: "Due", num: true, render: (r) => compactCurrency(r.due) },
                                        {
                                            label: "Collected",
                                            num: true,
                                            render: (r) => compactCurrency(r.collected),
                                        },
                                        {
                                            label: "Rate",
                                            num: true,
                                            render: (r) => (r.due ? pct((r.collected / r.due) * 100) : "—"),
                                        },
                                    ]}
                                />
                            }
                        >
                            <div className="sb-chart">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={data.trend}
                                        margin={{ top: 8, right: 8, left: 6, bottom: 0 }}
                                        barGap={4}
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
                                            width={64}
                                            tick={axisTick}
                                            tickFormatter={(value) => compactCurrency(value)}
                                        />
                                        <Tooltip
                                            cursor={{ fill: "var(--surface-hover)" }}
                                            contentStyle={tooltipStyle}
                                            formatter={(value, name) => [compactCurrency(value), name]}
                                        />
                                        <Bar
                                            dataKey="due"
                                            name="Due"
                                            fill={hue(3)}
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={30}
                                            isAnimationActive={false}
                                        />
                                        <Bar
                                            dataKey="collected"
                                            name="Collected"
                                            fill={hue(2)}
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={30}
                                            isAnimationActive={false}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <Legend
                                items={[
                                    { name: "Due", hue: hue(3) },
                                    { name: "Collected", hue: hue(2) },
                                ]}
                            />
                        </Panel>

                        <Panel
                            span={4}
                            title="Dues Ageing"
                            note="How far past its due date the unpaid money is."
                            table={
                                <Table
                                    rows={data.aging}
                                    columns={[
                                        { label: "Bucket", render: (r) => r.bucket },
                                        {
                                            label: "Amount",
                                            num: true,
                                            render: (r) => compactCurrency(r.amount),
                                        },
                                        { label: "Count", num: true, render: (r) => number(r.count) },
                                    ]}
                                />
                            }
                        >
                            {data.aging.length ? (
                                <div className="sb-rows">
                                    {data.aging.map((bucket) => (
                                        <div key={bucket.bucket} className="sb-row">
                                            <span className="nm">{bucket.bucket}</span>
                                            <span className="tr">
                                                <i
                                                    style={{
                                                        width: `${(bucket.amount / view.agingMax) * 100}%`,
                                                        background: bucket.isCritical
                                                            ? "var(--danger)"
                                                            : "var(--warning)",
                                                    }}
                                                />
                                            </span>
                                            <span className="vl">{compactCurrency(bucket.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Empty
                                    title="Nothing overdue"
                                    note="₹0 is past its due date."
                                />
                            )}
                        </Panel>
                    </div>

                    {/* ---- Compliance ---- */}
                    <Section title="Payment plan compliance" note="how close receipts land to their due date" />

                    <div className="sb-grid">
                        <section className="sb-card sb-tile span4">
                            <div className="lab">Average variance</div>
                            <div className="val">
                                {data.compliance.avgVarianceDays >= 0 ? "+" : ""}
                                {data.compliance.avgVarianceDays}
                                <span className="sb-unit"> days</span>
                            </div>
                            <div className="cap">
                                received against planned due date ·{" "}
                                {pct(data.compliance.onTimePercent)} on-time across{" "}
                                {number(data.compliance.receiptsMeasured)} receipts
                            </div>
                        </section>

                        <Panel
                            span={8}
                            title="Commission liability"
                            note="what we owe partners, book to date"
                            table={
                                <Table
                                    rows={view.commission}
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
                                        {
                                            label: "Amount",
                                            num: true,
                                            render: (r) => compactCurrency(r.value),
                                        },
                                    ]}
                                />
                            }
                        >
                            <div className="sb-money">
                                {view.commission.map((item) => (
                                    <div key={item.name} className="sb-money-item">
                                        <span className="lab">{item.name}</span>
                                        <b style={{ color: item.hue }}>{compactCurrency(item.value)}</b>
                                    </div>
                                ))}

                                <div className="sb-money-item">
                                    <span className="lab">Under clawback</span>
                                    <b
                                        style={{
                                            color: data.commission.underClawback
                                                ? "var(--danger)"
                                                : "var(--text-muted)",
                                        }}
                                    >
                                        {compactCurrency(data.commission.underClawback)}
                                    </b>
                                </div>
                            </div>
                        </Panel>
                    </div>

                    {/* ---- Commission by partner ---- */}
                    <Section title="Commission by partner" note="who is owed, and what has been settled" />

                    <div className="sb-grid">
                        <Panel span={12} title="By channel partner" note="Book to date, highest fee first.">
                            {data.commissionByPartner.length ? (
                                <div className="sb-tblwrap">
                                    <Table
                                        rows={data.commissionByPartner}
                                        columns={[
                                            { label: "Partner", render: (r) => r.partner },
                                            { label: "Lines", num: true, render: (r) => number(r.lines) },
                                            {
                                                label: "Gross fee",
                                                num: true,
                                                render: (r) => compactCurrency(r.gross),
                                            },
                                            {
                                                label: "Paid",
                                                num: true,
                                                render: (r) => compactCurrency(r.paid),
                                            },
                                            {
                                                label: "Pending",
                                                num: true,
                                                render: (r) => compactCurrency(r.pending),
                                            },
                                        ]}
                                    />
                                </div>
                            ) : (
                                <Empty title="No commission raised yet" />
                            )}
                        </Panel>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default CollectionsDashboard;

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { number } from "../../utils/format";

/* =========================================================
   DASHBOARD KIT
   The pieces every role dashboard is assembled from: the
   labelled band, the card that flips to its own table, the
   bar rows, the donut and the funnel.
   ========================================================= */

export const PERIODS = [
    { id: "month", label: "This Month" },
    { id: "quarter", label: "This Quarter" },
    { id: "ytd", label: "YTD" },
];

// Eight categorical hues, then one for whatever folds into "Other".
export const hue = (index) => (index > 7 ? "var(--sb-other)" : `var(--sb-${index + 1})`);

export const FEED_KINDS = {
    followup: { label: "Follow-up", color: "var(--sb-1)" },
    call: { label: "Call", color: "var(--sb-7)" },
    visit: { label: "Visit", color: "var(--sb-3)" },
    lead: { label: "Lead", color: "var(--sb-2)" },
};

export const pct = (value) => `${Number(value || 0).toFixed(1)}%`;

export const tooltipStyle = {
    background: "var(--surface-raised)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    fontSize: 12,
    color: "var(--text)",
    boxShadow: "var(--shadow-md)",
};

export const axisTick = { fill: "var(--chart-axis)", fontSize: 11 };

/** Keeps the top eight and folds the tail into one "Other" entry. */
export const foldTail = (rows, nameKey, valueKey) => {
    const head = rows.slice(0, 8).map((row, index) => ({
        name: row[nameKey],
        value: row[valueKey],
        hue: hue(index),
        row,
    }));

    const tail = rows.slice(8);

    if (tail.length) {
        head.push({
            name: "Other",
            value: tail.reduce((sum, row) => sum + row[valueKey], 0),
            hue: hue(9),
            row: null,
        });
    }

    return head;
};

/** "▲ 12.5%" style change between the last two points of a series. */
export const trendDelta = (series, unit) => {
    if (!series || series.length < 2) return null;

    const last = series[series.length - 1];
    const previous = series[series.length - 2];

    let change;

    if (unit === "pts") {
        change = Math.round((last - previous) * 10) / 10;
    } else {
        if (previous === 0) return null;
        change = Math.round(((last - previous) / previous) * 1000) / 10;
    }

    const up = change >= 0;

    return { up, text: `${up ? "▲" : "▼"} ${Math.abs(change)}${unit === "pts" ? " pts" : "%"}` };
};

/* ---------------------------------------------------------
   BUILDING BLOCKS
   --------------------------------------------------------- */

export const Section = ({ title, note }) => (
    <div className="sb-sect">
        <h2>{title}</h2>
        <span>{note}</span>
        <div className="rule" />
    </div>
);

export const Empty = ({ title, note = "Nothing in the selected project and period." }) => (
    <div className="sb-empty">
        <b>{title}</b>
        <span>{note}</span>
    </div>
);

/** A card whose chart can be swapped for the table beneath it. */
export const Panel = ({ span, title, note, table, children }) => {
    const [showTable, setShowTable] = useState(false);

    return (
        <section className={`sb-card span${span}`}>
            <div className="sb-card-h">
                <div>
                    <h3>{title}</h3>
                    {note ? <p>{note}</p> : null}
                </div>

                {table ? (
                    <div className="tools">
                        <button
                            type="button"
                            className="sb-iconbtn"
                            title={showTable ? "Chart view" : "Table view"}
                            aria-label={showTable ? "Show chart" : "Show table"}
                            aria-pressed={showTable}
                            onClick={() => setShowTable((current) => !current)}
                        >
                            ▤
                        </button>
                    </div>
                ) : null}
            </div>

            {showTable && table ? <div className="sb-tblwrap">{table}</div> : children}
        </section>
    );
};

export const Table = ({ columns, rows }) => (
    <table className="sb-tbl">
        <thead>
            <tr>
                {columns.map((column) => (
                    <th key={column.label} className={column.num ? "n" : undefined}>
                        {column.label}
                    </th>
                ))}
            </tr>
        </thead>

        <tbody>
            {rows.map((row, index) => (
                <tr key={index}>
                    {columns.map((column) => (
                        <td key={column.label} className={column.num ? "n" : undefined}>
                            {column.render(row, index)}
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    </table>
);

export const Swatch = ({ color }) => <i className="swat" style={{ background: color }} />;

export const Legend = ({ items }) => (
    <div className="sb-legend">
        {items.map((item) => (
            <span key={item.name} className="k">
                <i className="sw" style={{ background: item.hue }} />
                {item.name}
                {item.value !== undefined ? <b>{item.value}</b> : null}
            </span>
        ))}
    </div>
);

export const DeltaPill = ({ delta, caption = "vs previous month" }) =>
    delta ? (
        <span className={`sb-delta ${delta.up ? "up" : "down"}`}>
            {delta.text} {caption}
        </span>
    ) : null;

/** Six thin columns, the last one emphasised. */
export const Spark = ({ series }) => {
    if (!series?.length) return null;

    const max = Math.max(...series, 1);

    return (
        <div className="sb-spark" aria-hidden="true">
            {series.map((value, index) => (
                <i
                    key={index}
                    className={index === series.length - 1 ? "is-last" : undefined}
                    style={{ height: `${Math.max((value / max) * 100, 6)}%` }}
                />
            ))}
        </div>
    );
};

/** Labelled horizontal bars on one shared scale. */
export const Rows = ({ items, format = number, extra }) => {
    const max = Math.max(1, ...items.map((item) => item.value));

    return (
        <div className="sb-rows">
            {items.map((item) => (
                <div key={item.name} className="sb-row">
                    <span className="nm" title={item.name}>
                        {item.name}
                    </span>
                    <span className="tr">
                        <i style={{ width: `${(item.value / max) * 100}%`, background: item.hue }} />
                    </span>
                    <span className="vl">
                        {extra ? extra(item) : null}
                        {format(item.value)}
                    </span>
                </div>
            ))}
        </div>
    );
};

export const Donut = ({ items, unit, format = number }) => {
    const total = items.reduce((sum, item) => sum + item.value, 0);

    return (
        <>
            <div className="sb-chart sb-chart--sm sb-donut">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={items}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="58%"
                            outerRadius="88%"
                            paddingAngle={1}
                            stroke="var(--surface)"
                            strokeWidth={2}
                            isAnimationActive={false}
                        >
                            {items.map((item) => (
                                <Cell key={item.name} fill={item.hue} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={tooltipStyle}
                            formatter={(value, name) => [format(value), name]}
                        />
                    </PieChart>
                </ResponsiveContainer>

                <div className="sb-donut-mid">
                    <b>{format(total)}</b>
                    <span>{unit}</span>
                </div>
            </div>

            <Legend items={items.map((item) => ({ ...item, value: format(item.value) }))} />
        </>
    );
};

/** Bands whose width is each stage's share of the top one. */
export const Funnel = ({ stages }) => {
    const top = stages[0]?.value || 0;

    return (
        <div className="sb-funnel">
            {stages.map((stage, index) => {
                const share = top ? (stage.value / top) * 100 : 0;
                const previous = stages[index - 1]?.value;
                const kept = previous ? (stage.value / previous) * 100 : null;
                const isLast = index === stages.length - 1;

                return (
                    <div key={stage.name} className="sb-frow">
                        <div className="sb-ftrack">
                            <i
                                className="sb-ftrap"
                                style={{ width: `${Math.max(share, 2)}%`, background: stage.hue }}
                            />
                        </div>

                        <div className="sb-finfo">
                            <b>{number(stage.value)}</b>
                            <span className="st">
                                <i className="sw" style={{ background: stage.hue }} />
                                {stage.name} · {pct(share)}
                            </span>
                            {kept !== null ? (
                                <span className={`dropoff${isLast ? " won" : ""}`}>
                                    {isLast
                                        ? `${pct(kept)} closed`
                                        : `−${pct(100 - Math.min(kept, 100))} from ${stages[index - 1].name}`}
                                </span>
                            ) : null}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

/** The filter row every role dashboard carries. */
export const FilterBar = ({ projects, projectId, onProject, period, onPeriod, onRefresh }) => (
    <div className="sb-filters">
        <label className="sb-ctrl">
            <span aria-hidden="true">▦</span>
            <select
                id="sb-project"
                aria-label="Project"
                value={projectId}
                onChange={(event) => onProject(event.target.value)}
            >
                <option value="">All Projects</option>
                {(projects || []).map((project) => (
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
                    onClick={() => onPeriod(option.id)}
                >
                    {option.label}
                </button>
            ))}
        </div>

        <div className="sb-spacer" />

        <button type="button" className="sb-ghost" onClick={onRefresh}>
            ↻ Refresh
        </button>
    </div>
);

/** The activity list shared by the manager and executive dashboards. */
export const Feed = ({ items, showWho = true }) => (
    <div className="sb-feed">
        {items.map((item, index) => (
            <div key={index} className="sb-fi">
                <span className="tag" style={{ background: FEED_KINDS[item.kind]?.color }}>
                    {FEED_KINDS[item.kind]?.label}
                </span>
                <span className="mid">
                    <span className="t1">{item.what}</span>
                    <span className="t2">
                        {item.lead || "—"}
                        {showWho ? ` · ${item.who || "—"}` : ""}
                    </span>
                </span>
                <span className="when">{item.when}</span>
            </div>
        ))}
    </div>
);

import { useState } from "react";
import { PhoneCall, Save } from "lucide-react";

import { callLogs as callLogsApi, configuration as configApi } from "../api/resources";
import { useAsyncData, useResource } from "../hooks/useResource";
import { useToast } from "../context/ToastContext";
import {
    Badge,
    DataTable,
    ErrorState,
    Field,
    LoadingState,
    Pagination,
    Spinner,
} from "../components/ui";
import { dateTime, duration, phone as formatPhone, titleCase } from "../utils/format";

const PROVIDERS = [
    { value: "exotel", label: "Exotel" },
    { value: "twilio", label: "Twilio" },
    { value: "knowlarity", label: "Knowlarity" },
    { value: "none", label: "Not connected" },
];

const OUTCOME_TONE = {
    answered: "success",
    missed: "danger",
    rejected: "danger",
    busy: "warning",
    no_answer: "warning",
};

const CallingSettings = () => {
    const toast = useToast();

    const { data: config, isLoading, error, refetch } = useAsyncData(() => configApi.get(), []);
    const log = useResource(callLogsApi, { limit: 10 });

    const [form, setForm] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const state = form ?? {
        callingEnabled: config?.callingEnabled ?? false,
        callingProvider: config?.callingProvider ?? "none",
        callerId: config?.callerId ?? "",
        recordCalls: config?.recordCalls ?? true,
        maskNumbers: config?.maskNumbers ?? false,
        // Seconds a call must last before it counts as connected.
        minConnectedSeconds: config?.minConnectedSeconds ?? 15,
    };

    const set = (key, value) => setForm({ ...state, [key]: value });

    const save = async () => {
        setIsSaving(true);

        try {
            await configApi.update({
                callingEnabled: state.callingEnabled,
                callingProvider: state.callingProvider,
                callerId: state.callerId,
                recordCalls: state.recordCalls,
                maskNumbers: state.maskNumbers,
                minConnectedSeconds: Number(state.minConnectedSeconds) || 0,
            });

            toast.success("Settings saved");
            refetch();
        } catch (err) {
            toast.error("Could not save", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (error) return <ErrorState message={error} onRetry={refetch} />;
    if (isLoading || !config) return <LoadingState label="Loading calling settings" />;

    return (
        <>
            <div className="page-head">
                <div>
                    <h1 className="page-title">Calling Settings</h1>
                    <div className="page-summary">
                        <span>
                            When off, agents dial from their own handset and nothing is recorded.
                        </span>
                    </div>
                </div>

                <div className="page-actions">
                    <button type="button" className="btn btn-primary" onClick={save} disabled={isSaving}>
                        {isSaving ? <Spinner inline /> : <Save />}
                        Save settings
                    </button>
                </div>
            </div>

            <div className="config-grid" style={{ marginBottom: 16 }}>
                <section className="card">
                    <div className="card-head">
                        <h3>Telephony</h3>
                        <Badge tone={state.callingEnabled ? "success" : "neutral"}>
                            {state.callingEnabled ? "Connected" : "Off"}
                        </Badge>
                    </div>

                    <div className="card-pad">
                        <div className="form-grid">
                            <Field label="Enable click to call" full>
                                <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={Boolean(state.callingEnabled)}
                                        onChange={(event) => set("callingEnabled", event.target.checked)}
                                    />
                                    Route agent calls through the connected provider
                                </label>
                            </Field>

                            <Field label="Provider">
                                <select
                                    className="select"
                                    value={state.callingProvider}
                                    onChange={(event) => set("callingProvider", event.target.value)}
                                >
                                    {PROVIDERS.map((p) => (
                                        <option key={p.value} value={p.value}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field label="Caller ID" hint="The number your leads see">
                                <input
                                    className="input mono"
                                    value={state.callerId}
                                    onChange={(event) =>
                                        set("callerId", event.target.value.replace(/\D/g, ""))
                                    }
                                />
                            </Field>
                        </div>
                    </div>
                </section>

                <section className="card">
                    <div className="card-head">
                        <h3>Recording and privacy</h3>
                    </div>

                    <div className="card-pad">
                        <div className="form-grid">
                            <Field label="Call recording" full>
                                <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={Boolean(state.recordCalls)}
                                        onChange={(event) => set("recordCalls", event.target.checked)}
                                    />
                                    Record calls and attach them to the lead
                                </label>
                            </Field>

                            <Field label="Number masking" full>
                                <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={Boolean(state.maskNumbers)}
                                        onChange={(event) => set("maskNumbers", event.target.checked)}
                                    />
                                    Hide the customer number from agents
                                </label>
                            </Field>

                            <Field
                                label="Connected after (seconds)"
                                hint="Shorter calls are logged but not counted as connected"
                            >
                                <input
                                    className="input mono"
                                    inputMode="numeric"
                                    value={state.minConnectedSeconds}
                                    onChange={(event) =>
                                        set("minConnectedSeconds", event.target.value.replace(/\D/g, ""))
                                    }
                                />
                            </Field>
                        </div>
                    </div>
                </section>
            </div>

            <section className="card">
                <div className="card-head">
                    <h3>Recent calls</h3>
                </div>

                <DataTable
                    columns={[
                        {
                            key: "lead",
                            header: "Lead",
                            render: (row) => (
                                <div>
                                    <div className="record-name">{row.lead?.name || "Unknown"}</div>
                                    <div className="record-sub">
                                        {state.maskNumbers ? "•••• ••••" : formatPhone(row.phone)}
                                    </div>
                                </div>
                            ),
                        },
                        { key: "agent", header: "Agent", render: (row) => row.agent?.name || "—" },
                        {
                            key: "direction",
                            header: "Direction",
                            render: (row) => <Badge tone="neutral">{titleCase(row.direction)}</Badge>,
                        },
                        {
                            key: "status",
                            header: "Outcome",
                            render: (row) => (
                                <Badge tone={OUTCOME_TONE[row.status] || "neutral"}>
                                    {titleCase(row.status)}
                                </Badge>
                            ),
                        },
                        {
                            key: "duration",
                            header: "Duration",
                            className: "num",
                            render: (row) => duration(row.duration),
                        },
                        {
                            key: "startedAt",
                            header: "Started",
                            className: "num",
                            render: (row) => dateTime(row.startedAt),
                        },
                    ]}
                    rows={log.items}
                    isLoading={log.isLoading}
                    error={log.error}
                    onRetry={log.refetch}
                    emptyIcon={PhoneCall}
                    emptyTitle="No calls logged yet"
                />

                <Pagination pagination={log.pagination} onPageChange={log.setPage} />
            </section>
        </>
    );
};

export default CallingSettings;

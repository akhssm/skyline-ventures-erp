import { useState } from "react";
import { MessageCircle, RefreshCw, Save, Send } from "lucide-react";

import { configuration as configApi, whatsapp as whatsappApi } from "../api/resources";
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
import { dateTime, phone as formatPhone, titleCase } from "../utils/format";

/* The template set an organisation provisions for outbound messaging. Each one
   is versioned: a live version keeps sending while the next is in review. */
const TEMPLATE_PURPOSES = [
    { code: "lead_welcome", label: "Lead welcome" },
    { code: "site_visit_reminder", label: "Site visit reminder" },
    { code: "quotation_share", label: "Quotation share" },
    { code: "payment_due", label: "Payment due" },
    { code: "booking_confirmed", label: "Booking confirmed" },
];

const VERSION_TONE = {
    live: "success",
    approved: "info",
    in_review: "warning",
    draft: "neutral",
    rejected: "danger",
};

const DELIVERY_TONE = {
    read: "success",
    delivered: "success",
    sent: "info",
    queued: "warning",
    failed: "danger",
};

const WhatsAppSettings = () => {
    const toast = useToast();

    const { data: config, isLoading, error, refetch } = useAsyncData(() => configApi.get(), []);
    const log = useResource(whatsappApi, { limit: 10 });

    const [form, setForm] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [testPhone, setTestPhone] = useState("");

    // The saved configuration seeds the form the first time it arrives.
    const state = form ?? {
        whatsappEnabled: config?.whatsappEnabled ?? false,
        wabaNamespace: config?.wabaNamespace ?? "",
        wabaPhoneNumber: config?.wabaPhoneNumber ?? "",
        whatsappTemplates: config?.whatsappTemplates ?? [],
    };

    const set = (key, value) => setForm({ ...state, [key]: value });

    const templateFor = (code) =>
        state.whatsappTemplates.find((t) => t.purpose === code) || {
            purpose: code,
            providerName: "",
            version: 1,
            status: "draft",
        };

    const setTemplate = (code, patch) => {
        const next = state.whatsappTemplates.some((t) => t.purpose === code)
            ? state.whatsappTemplates.map((t) => (t.purpose === code ? { ...t, ...patch } : t))
            : [...state.whatsappTemplates, { ...templateFor(code), ...patch }];

        set("whatsappTemplates", next);
    };

    const save = async () => {
        setIsSaving(true);

        try {
            await configApi.update({
                whatsappEnabled: state.whatsappEnabled,
                wabaNamespace: state.wabaNamespace,
                wabaPhoneNumber: state.wabaPhoneNumber,
                whatsappTemplates: state.whatsappTemplates,
            });

            toast.success("Settings saved");
            refetch();
        } catch (err) {
            toast.error("Could not save", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const sendTest = async () => {
        if (!/^[6-9]\d{9}$/.test(testPhone)) {
            toast.error("Enter a valid 10-digit mobile number");
            return;
        }

        try {
            await whatsappApi.create({
                phone: testPhone,
                templateName: "controlled_test_send",
                body: "This is a controlled test send from your Sell&Bill workspace.",
            });

            toast.success("Test message queued", `Sent to +91 ${testPhone}`);
            setTestPhone("");
            log.refetch();
        } catch (err) {
            toast.error("Could not send the test", err.message);
        }
    };

    if (error) return <ErrorState message={error} onRetry={refetch} />;
    if (isLoading || !config) return <LoadingState label="Loading WhatsApp settings" />;

    return (
        <>
            <div className="page-head">
                <div>
                    <h1 className="page-title">WhatsApp Settings</h1>
                    <div className="page-summary">
                        <span>
                            When off, no WhatsApp messages are sent for your organisation.
                        </span>
                    </div>
                </div>

                <div className="page-actions">
                    <button type="button" className="btn btn-secondary" onClick={refetch}>
                        <RefreshCw /> Refresh status
                    </button>

                    <button type="button" className="btn btn-primary" onClick={save} disabled={isSaving}>
                        {isSaving ? <Spinner inline /> : <Save />}
                        Save settings
                    </button>
                </div>
            </div>

            <div className="config-grid" style={{ marginBottom: 16 }}>
                <section className="card">
                    <div className="card-head">
                        <h3>Sending</h3>
                        <Badge tone={state.whatsappEnabled ? "success" : "neutral"}>
                            {state.whatsappEnabled ? "Enabled" : "Off"}
                        </Badge>
                    </div>

                    <div className="card-pad">
                        <div className="form-grid">
                            <Field label="Enable WhatsApp sending" full>
                                <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={Boolean(state.whatsappEnabled)}
                                        onChange={(event) => set("whatsappEnabled", event.target.checked)}
                                    />
                                    Send WhatsApp messages for this organisation
                                </label>
                            </Field>

                            <Field label="WABA namespace">
                                <input
                                    className="input mono"
                                    value={state.wabaNamespace}
                                    onChange={(event) => set("wabaNamespace", event.target.value)}
                                />
                            </Field>

                            <Field
                                label="Business number"
                                hint="Digits only, including country code. No +, spaces or dashes."
                            >
                                <input
                                    className="input mono"
                                    value={state.wabaPhoneNumber}
                                    onChange={(event) =>
                                        set("wabaPhoneNumber", event.target.value.replace(/\D/g, ""))
                                    }
                                />
                            </Field>
                        </div>
                    </div>
                </section>

                <section className="card">
                    <div className="card-head">
                        <h3>Controlled test send</h3>
                    </div>

                    <div className="card-pad">
                        <Field
                            label="Mobile number"
                            hint="Sends one message so you can confirm delivery before going live."
                        >
                            <input
                                className="input mono"
                                inputMode="numeric"
                                maxLength={10}
                                value={testPhone}
                                onChange={(event) =>
                                    setTestPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                                }
                            />
                        </Field>

                        <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ marginTop: 14 }}
                            onClick={sendTest}
                            disabled={!state.whatsappEnabled}
                        >
                            <Send /> Send test message
                        </button>

                        {!state.whatsappEnabled ? (
                            <p style={{ marginTop: 10, fontSize: 12, color: "var(--text-subtle)" }}>
                                Turn sending on and save before testing.
                            </p>
                        ) : null}
                    </div>
                </section>
            </div>

            <section className="card" style={{ marginBottom: 16 }}>
                <div className="card-head">
                    <h3>Templates</h3>
                    <span className="mono" style={{ color: "var(--text-muted)" }}>
                        {TEMPLATE_PURPOSES.length} purposes
                    </span>
                </div>

                <DataTable
                    columns={[
                        {
                            key: "purpose",
                            header: "Purpose",
                            render: (row) => (
                                <div>
                                    <div className="record-name">{row.label}</div>
                                    <div className="record-sub">{row.code}</div>
                                </div>
                            ),
                        },
                        {
                            key: "providerName",
                            header: "Provider template name",
                            render: (row) => {
                                const t = templateFor(row.code);

                                return (
                                    <input
                                        className="input mono"
                                        style={{ maxWidth: 260 }}
                                        placeholder="Leave blank to use the purpose code"
                                        value={t.providerName}
                                        onChange={(event) =>
                                            setTemplate(row.code, { providerName: event.target.value })
                                        }
                                    />
                                );
                            },
                        },
                        {
                            key: "version",
                            header: "Version",
                            className: "num",
                            render: (row) => `v${templateFor(row.code).version}`,
                        },
                        {
                            key: "status",
                            header: "Status",
                            render: (row) => {
                                const t = templateFor(row.code);

                                return (
                                    <Badge tone={VERSION_TONE[t.status] || "neutral"}>
                                        {titleCase(t.status)}
                                    </Badge>
                                );
                            },
                        },
                        {
                            key: "actions",
                            header: "Actions",
                            className: "col-actions",
                            render: (row) => {
                                const t = templateFor(row.code);

                                return (
                                    <div className="row-actions">
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() =>
                                                setTemplate(row.code, {
                                                    version: t.version + 1,
                                                    status: "draft",
                                                })
                                            }
                                        >
                                            + New version
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            disabled={t.status !== "draft"}
                                            onClick={() => setTemplate(row.code, { status: "in_review" })}
                                        >
                                            Submit for approval
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            disabled={t.status !== "approved"}
                                            title={
                                                t.status === "approved"
                                                    ? "Make this version live"
                                                    : "Only an approved version can be made live"
                                            }
                                            onClick={() => setTemplate(row.code, { status: "live" })}
                                        >
                                            Make live
                                        </button>
                                    </div>
                                );
                            },
                        },
                    ]}
                    rows={TEMPLATE_PURPOSES}
                    rowKey={(row) => row.code}
                />
            </section>

            <section className="card">
                <div className="card-head">
                    <h3>Recent messages</h3>
                </div>

                <DataTable
                    columns={[
                        {
                            key: "phone",
                            header: "Recipient",
                            render: (row) => (
                                <div>
                                    <div className="record-name">{row.lead?.name || "Unknown"}</div>
                                    <div className="record-sub">{formatPhone(row.phone)}</div>
                                </div>
                            ),
                        },
                        { key: "templateName", header: "Template", className: "num" },
                        {
                            key: "status",
                            header: "Delivery",
                            render: (row) => (
                                <Badge tone={DELIVERY_TONE[row.status] || "neutral"}>
                                    {titleCase(row.status)}
                                </Badge>
                            ),
                        },
                        {
                            key: "sentAt",
                            header: "Last sent",
                            className: "num",
                            render: (row) => dateTime(row.sentAt),
                        },
                    ]}
                    rows={log.items}
                    isLoading={log.isLoading}
                    error={log.error}
                    onRetry={log.refetch}
                    emptyIcon={MessageCircle}
                    emptyTitle="No messages sent yet"
                />

                <Pagination pagination={log.pagination} onPageChange={log.setPage} />
            </section>
        </>
    );
};

export default WhatsAppSettings;

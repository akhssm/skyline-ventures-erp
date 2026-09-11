import { useMemo, useState } from "react";
import { AlertCircle, Link2, RefreshCw } from "lucide-react";

import { integrations as integrationsApi } from "../api/resources";
import { useAsyncData } from "../hooks/useResource";
import { useToast } from "../context/ToastContext";
import { EmptyState, ErrorState, LoadingState, Spinner } from "../components/ui";
import ProviderMark, {
    PROVIDER_GROUPS,
    providerMeta,
} from "../components/integrations/ProviderMark";
import { relativeTime } from "../utils/format";

const STATUS_LABEL = {
    connected: "Connected",
    not_connected: "Not connected",
    error: "Needs attention",
};

const TABS = [
    { id: "all", label: "All" },
    { id: "connected", label: "Connected" },
    { id: "not_connected", label: "Available" },
    { id: "error", label: "Needs attention" },
];

/* ---------------------------------------------------------
   CARD
   --------------------------------------------------------- */

const IntegrationCard = ({ integration, isBusy, onToggle }) => {
    const meta = providerMeta(integration.provider);
    const isConnected = integration.isActive;

    return (
        <article className={`integration-card is-${integration.status}`}>
            <header>
                <ProviderMark provider={integration.provider} />

                <div className="integration-name">
                    <h4>{integration.displayName || meta.label}</h4>
                    <p>{meta.blurb}</p>
                </div>

                <span className={`conn-dot is-${integration.status}`} aria-hidden="true" />
            </header>

            {integration.lastError ? (
                <p className="integration-error">
                    <AlertCircle /> {integration.lastError}
                </p>
            ) : null}

            <footer>
                <div className="integration-state">
                    <span className={`conn-label is-${integration.status}`}>
                        {STATUS_LABEL[integration.status] || integration.status}
                    </span>

                    <span className="integration-sync">
                        {integration.lastSyncAt
                            ? `Synced ${relativeTime(integration.lastSyncAt)}`
                            : "Never synced"}
                    </span>
                </div>

                <button
                    type="button"
                    className={`btn btn-sm ${isConnected ? "btn-secondary" : "btn-primary"}`}
                    onClick={() => onToggle(integration)}
                    disabled={isBusy}
                >
                    {isBusy ? <Spinner inline /> : null}
                    {isConnected ? "Disconnect" : "Connect"}
                </button>
            </footer>
        </article>
    );
};

/* ---------------------------------------------------------
   INTEGRATIONS
   --------------------------------------------------------- */

const Integrations = () => {
    const toast = useToast();
    const { data, isLoading, error, refetch } = useAsyncData(
        () => integrationsApi.list({ limit: 50 }),
        []
    );

    const [tab, setTab] = useState("all");
    const [busyId, setBusyId] = useState(null);

    const rows = data || [];

    const counts = useMemo(
        () => ({
            all: rows.length,
            connected: rows.filter((row) => row.status === "connected").length,
            not_connected: rows.filter((row) => row.status === "not_connected").length,
            error: rows.filter((row) => row.status === "error").length,
        }),
        [rows]
    );

    const visible = tab === "all" ? rows : rows.filter((row) => row.status === tab);

    /* Cards are grouped the way the sidebar groups the work they feed:
       conversations, then where leads come from, then the money. */
    const sections = useMemo(
        () =>
            PROVIDER_GROUPS.map((group) => ({
                ...group,
                items: visible.filter((row) => providerMeta(row.provider).group === group.id),
            })).filter((group) => group.items.length),
        [visible]
    );

    const ungrouped = visible.filter(
        (row) => !PROVIDER_GROUPS.some((group) => group.id === providerMeta(row.provider).group)
    );

    const toggle = async (integration) => {
        setBusyId(integration._id);

        const nextActive = !integration.isActive;

        try {
            await integrationsApi.update(integration._id, {
                isActive: nextActive,
                status: nextActive ? "connected" : "not_connected",
                ...(nextActive ? { lastSyncAt: new Date().toISOString(), lastError: "" } : {}),
            });

            toast.success(
                `${integration.displayName} ${nextActive ? "connected" : "disconnected"}`
            );
            refetch();
        } catch (err) {
            toast.error("Could not update the integration", err.message);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <>
            <div className="page-head">
                <div>
                    <h1 className="page-title">Integrations</h1>

                    <div className="page-summary">
                        <span>
                            <b>{counts.connected}</b> of <b>{counts.all}</b> connected
                        </span>

                        {counts.error ? (
                            <>
                                <span className="sep">·</span>
                                <span className="is-danger">
                                    <b>{counts.error}</b> need attention
                                </span>
                            </>
                        ) : null}
                    </div>
                </div>

                <div className="page-actions">
                    <button type="button" className="btn btn-secondary" onClick={refetch}>
                        <RefreshCw /> Refresh
                    </button>
                </div>
            </div>

            {error ? (
                <ErrorState message={error} onRetry={refetch} />
            ) : isLoading ? (
                <LoadingState label="Loading integrations" />
            ) : !rows.length ? (
                <div className="card">
                    <EmptyState
                        icon={Link2}
                        title="No integrations configured"
                        description="Connect a lead source or messaging provider to start syncing."
                    />
                </div>
            ) : (
                <>
                    <div className="filters">
                        <div className="chips" role="tablist" aria-label="Filter integrations">
                            {TABS.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === option.id}
                                    className={tab === option.id ? "is-active" : ""}
                                    onClick={() => setTab(option.id)}
                                >
                                    {option.label} <b>{counts[option.id]}</b>
                                </button>
                            ))}
                        </div>
                    </div>

                    {!visible.length ? (
                        <div className="card">
                            <EmptyState
                                icon={Link2}
                                title="Nothing in this view"
                                description="Pick another filter to see the rest of the providers."
                            />
                        </div>
                    ) : null}

                    {sections.map((group) => (
                        <section key={group.id} className="integration-section">
                            <h2 className="section-title">{group.label}</h2>

                            <div className="integration-grid">
                                {group.items.map((integration) => (
                                    <IntegrationCard
                                        key={integration._id}
                                        integration={integration}
                                        isBusy={busyId === integration._id}
                                        onToggle={toggle}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}

                    {ungrouped.length ? (
                        <section className="integration-section">
                            <h2 className="section-title">Other</h2>

                            <div className="integration-grid">
                                {ungrouped.map((integration) => (
                                    <IntegrationCard
                                        key={integration._id}
                                        integration={integration}
                                        isBusy={busyId === integration._id}
                                        onToggle={toggle}
                                    />
                                ))}
                            </div>
                        </section>
                    ) : null}
                </>
            )}
        </>
    );
};

export default Integrations;

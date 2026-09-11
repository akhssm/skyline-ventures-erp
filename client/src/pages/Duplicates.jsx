import { useState } from "react";
import { Merge, Share2 } from "lucide-react";

import { leads as leadsApi } from "../api/resources";
import { useAsyncData } from "../hooks/useResource";
import { useToast } from "../context/ToastContext";
import {
    Badge,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    LoadingState,
} from "../components/ui";
import {
    date,
    number,
    phone as formatPhone,
    scoreBand,
    scoreBandLabel,
    titleCase,
} from "../utils/format";

/**
 * Leads that share a phone number, grouped so the duplicates can be merged
 * into whichever record the team wants to keep.
 */
const Duplicates = () => {
    const toast = useToast();
    const { data: groups, isLoading, error, refetch } = useAsyncData(() => leadsApi.duplicates(), []);

    const [merging, setMerging] = useState(null);
    const [isBusy, setIsBusy] = useState(false);

    const runMerge = async () => {
        setIsBusy(true);

        try {
            const others = merging.group.leads
                .filter((lead) => lead._id !== merging.primary._id)
                .map((lead) => lead._id);

            await leadsApi.merge(merging.primary._id, others);

            toast.success(`${others.length} duplicates merged into ${merging.primary.name}`);
            setMerging(null);
            refetch();
        } catch (err) {
            toast.error("Could not merge", err.message);
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <>
            <div className="page-head">
                <div>
                    <h1 className="page-title">Duplicate people</h1>

                    <div className="page-summary">
                        <span>
                            <b>{number(groups?.length ?? 0)}</b> phone numbers appear on more than
                            one lead
                        </span>
                    </div>
                </div>
            </div>

            {error ? (
                <ErrorState message={error} onRetry={refetch} />
            ) : isLoading ? (
                <LoadingState label="Scanning for duplicates" />
            ) : !groups?.length ? (
                <div className="card">
                    <EmptyState
                        icon={Share2}
                        title="No duplicates found"
                        description="Every lead in your pipeline has a unique phone number."
                    />
                </div>
            ) : (
                groups.map((group) => {
                    // The oldest record is the safest default to keep.
                    const primary = [...group.leads].sort(
                        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
                    )[0];

                    return (
                        <div key={group.phone} className="dupe-group">
                            <div className="dupe-head">
                                <span className="phone">{formatPhone(group.phone)}</span>
                                <Badge tone="warning">{group.count} records</Badge>

                                <div style={{ marginLeft: "auto" }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setMerging({ group, primary })}
                                    >
                                        <Merge /> Merge them
                                    </button>
                                </div>
                            </div>

                            <div className="table-scroll">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Lead</th>
                                            <th>Score</th>
                                            <th>Stage</th>
                                            <th>Source</th>
                                            <th>Agent</th>
                                            <th>Created</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {group.leads.map((lead) => (
                                            <tr key={lead._id}>
                                                <td>
                                                    <div className="record-name">
                                                        {lead.name}
                                                        {lead._id === primary._id ? (
                                                            <Badge tone="brand">Keep</Badge>
                                                        ) : null}
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="score">
                                                        <b>{lead.score}</b>
                                                        <span className={`band tone-${scoreBand(lead.score)}`}>
                                                            {scoreBandLabel(lead.score)}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td>
                                                    <Badge tone="neutral">{titleCase(lead.stage)}</Badge>
                                                </td>

                                                <td>{lead.source ? titleCase(lead.source) : "—"}</td>
                                                <td>{lead.assignedTo?.name || "Unassigned"}</td>
                                                <td className="num">{date(lead.createdAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })
            )}

            {merging ? (
                <ConfirmDialog
                    title="Merge these duplicates?"
                    message={`${merging.group.count - 1} record${
                        merging.group.count - 1 === 1 ? "" : "s"
                    } will be retired and their history kept against ${merging.primary.name}.`}
                    confirmLabel="Merge"
                    tone="primary"
                    isBusy={isBusy}
                    onConfirm={runMerge}
                    onCancel={() => setMerging(null)}
                />
            ) : null}
        </>
    );
};

export default Duplicates;

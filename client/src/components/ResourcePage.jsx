import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { useDebounced, useLookups, useResource } from "../hooks/useResource";
import { useToast } from "../context/ToastContext";
import {
    ConfirmDialog,
    DataTable,
    Pagination,
    SearchInput,
} from "./ui";
import ResourceForm from "./ResourceForm";

/**
 * One screen for any module whose behaviour is ordinary CRUD.
 *
 * The config carries the title, the resource client, the columns, the filter
 * controls, the form fields and any lookup lists the form needs, so adding a
 * module means adding a config entry rather than a component.
 */
const ResourcePage = ({ config }) => {
    const toast = useToast();

    const {
        title,
        subtitle,
        resource,
        columns,
        filters = [],
        formFields,
        formTitle,
        lookups = {},
        searchPlaceholder = "Search",
        initialParams = {},
        canCreate = true,
        canEdit = true,
        canDelete = true,
        emptyIcon,
        emptyTitle,
        emptyDescription,
        renderSummary,
        renderAbove,
    } = config;

    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounced(searchTerm);

    const [selected, setSelected] = useState(new Set());
    const [editing, setEditing] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const list = useResource(resource, { initialParams, limit: 25 });

    // Reference lists shared by the filter selects and the form drawer.
    const lookupData = useLookups(lookups);

    useEffect(() => {
        list.setFilter({ search: debouncedSearch || undefined });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const confirmDelete = async () => {
        setIsDeleting(true);

        try {
            if (pendingDelete === "bulk") {
                await resource.bulkRemove([...selected]);
                toast.success(`${selected.size} records deleted`);
                setSelected(new Set());
            } else {
                await resource.remove(pendingDelete._id);
                toast.success("Record deleted");
            }

            setPendingDelete(null);
            list.refetch();
        } catch (err) {
            toast.error("Could not delete", err.message);
        } finally {
            setIsDeleting(false);
        }
    };

    // The row action column is appended so configs never repeat it.
    const tableColumns = useMemo(() => {
        if (!canEdit && !canDelete) return columns;

        return [
            ...columns,
            {
                key: "__actions",
                header: "Actions",
                className: "col-actions",
                render: (row) => (
                    <div className="row-actions" onClick={(event) => event.stopPropagation()}>
                        {canEdit ? (
                            <button
                                type="button"
                                className="row-action"
                                onClick={() => setEditing(row)}
                                title="Edit"
                                aria-label="Edit record"
                            >
                                <Pencil />
                            </button>
                        ) : null}

                        {canDelete ? (
                            <button
                                type="button"
                                className="row-action tone-danger"
                                onClick={() => setPendingDelete(row)}
                                title="Delete"
                                aria-label="Delete record"
                            >
                                <Trash2 />
                            </button>
                        ) : null}
                    </div>
                ),
            },
        ];
    }, [columns, canEdit, canDelete]);

    return (
        <>
            <div className="page-head">
                <div>
                    <h1 className="page-title">{title}</h1>

                    {renderSummary ? (
                        renderSummary(list)
                    ) : subtitle ? (
                        <div className="page-summary">
                            <span>
                                <b>{list.pagination.total.toLocaleString("en-IN")}</b> {subtitle}
                            </span>
                        </div>
                    ) : null}
                </div>

                <div className="page-actions">
                    {canDelete && selected.size > 0 ? (
                        <>
                            <span className="pagination-info">
                                <b>{selected.size}</b> selected
                            </span>

                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setPendingDelete("bulk")}
                            >
                                <Trash2 /> Delete
                            </button>
                        </>
                    ) : null}

                    {canCreate && formFields ? (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setEditing({})}
                        >
                            <Plus /> New {formTitle || title.replace(/s$/, "").toLowerCase()}
                        </button>
                    ) : null}
                </div>
            </div>

            {renderAbove ? renderAbove(list, lookupData) : null}

            <div className="filters">
                <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder={searchPlaceholder}
                />

                {filters.map((filter) => {
                    const options =
                        filter.type === "reference"
                            ? (lookupData[filter.optionsFrom] || []).map((item) => ({
                                  value: item._id,
                                  label: filter.optionLabel ? filter.optionLabel(item) : item.name,
                              }))
                            : filter.options;

                    return (
                        <select
                            key={filter.name}
                            className="select"
                            value={list.params[filter.name] || ""}
                            onChange={(event) =>
                                list.setFilter({ [filter.name]: event.target.value })
                            }
                            aria-label={filter.label}
                        >
                            <option value="">{filter.label}</option>
                            {options.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    );
                })}

                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                        setSearchTerm("");
                        list.clearFilters();
                    }}
                >
                    Clear
                </button>
            </div>

            <div className="card">
                <DataTable
                    columns={tableColumns}
                    rows={list.items}
                    isLoading={list.isLoading}
                    error={list.error}
                    onRetry={list.refetch}
                    sort={list.sort}
                    onSort={list.toggleSort}
                    selected={canDelete ? selected : undefined}
                    onSelect={canDelete ? setSelected : undefined}
                    emptyIcon={emptyIcon}
                    emptyTitle={emptyTitle}
                    emptyDescription={emptyDescription}
                />

                <Pagination pagination={list.pagination} onPageChange={list.setPage} />
            </div>

            {editing && formFields ? (
                <ResourceForm
                    resource={resource}
                    record={editing._id ? editing : null}
                    fields={formFields}
                    title={formTitle || title.replace(/s$/, "").toLowerCase()}
                    lookups={lookupData}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        list.refetch();
                    }}
                />
            ) : null}

            {pendingDelete ? (
                <ConfirmDialog
                    title={pendingDelete === "bulk" ? "Delete selected records?" : "Delete this record?"}
                    message={
                        pendingDelete === "bulk"
                            ? `${selected.size} records will be removed. This cannot be undone.`
                            : "This record will be removed. This cannot be undone."
                    }
                    confirmLabel="Delete"
                    isBusy={isDeleting}
                    onConfirm={confirmDelete}
                    onCancel={() => setPendingDelete(null)}
                />
            ) : null}
        </>
    );
};

export default ResourcePage;

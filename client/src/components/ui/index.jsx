import { useEffect, useRef } from "react";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    Inbox,
    Search,
    TriangleAlert,
    X,
} from "lucide-react";

/* =========================================================
   BADGE
   ========================================================= */

export const Badge = ({ tone = "neutral", pill = false, children }) => (
    <span className={`badge tone-${tone}${pill ? " badge-pill" : ""}`}>{children}</span>
);

/* =========================================================
   STATES
   ========================================================= */

export const Spinner = ({ inline = false }) => (
    <div className={`spinner${inline ? " is-inline" : ""}`} role="status" aria-label="Loading" />
);

export const LoadingState = ({ label = "Loading" }) => (
    <div className="state">
        <Spinner />
        <p>{label}</p>
    </div>
);

export const EmptyState = ({
    icon: Icon = Inbox,
    title = "Nothing here yet",
    description,
    action,
}) => (
    <div className="state">
        <Icon />
        <b>{title}</b>
        {description ? <p>{description}</p> : null}
        {action}
    </div>
);

export const ErrorState = ({ message, onRetry }) => (
    <div className="state">
        <TriangleAlert />
        <b>Could not load this</b>
        <p>{message}</p>
        {onRetry ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
                Try again
            </button>
        ) : null}
    </div>
);

/* =========================================================
   SEARCH INPUT
   ========================================================= */

export const SearchInput = ({ value, onChange, placeholder = "Search" }) => {
    const inputRef = useRef(null);

    // "/" focuses search from anywhere, as long as focus is not already in a
    // field the key belongs to.
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key !== "/" || event.metaKey || event.ctrlKey) return;

            const tag = document.activeElement?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

            event.preventDefault();
            inputRef.current?.focus();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    return (
        <div className="search">
            <Search />
            <input
                ref={inputRef}
                type="search"
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
                aria-label={placeholder}
            />
            {!value ? <kbd>/</kbd> : null}
        </div>
    );
};

/* =========================================================
   PAGINATION
   ========================================================= */

// Shows at most seven slots, with gaps standing in for skipped ranges.
const pageWindow = (current, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, "gap", total];
    if (current >= total - 3) return [1, "gap", total - 4, total - 3, total - 2, total - 1, total];

    return [1, "gap", current - 1, current, current + 1, "gap", total];
};

export const Pagination = ({ pagination, onPageChange }) => {
    const { page, pages, total, limit } = pagination;

    // A list that fits on one page shows no footer at all; the count already
    // sits in the page statline.
    if (!total || pages <= 1) return null;

    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    return (
        <div className="pagination">
            <span className="pagination-info">
                Showing <b>{from}</b> to <b>{to}</b> of <b>{total.toLocaleString("en-IN")}</b>
            </span>

            {pages > 1 ? (
                <div className="pagination-controls">
                    <button
                        type="button"
                        className="page-btn"
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                        aria-label="Previous page"
                    >
                        <ChevronLeft />
                    </button>

                    {pageWindow(page, pages).map((slot, index) =>
                        slot === "gap" ? (
                            <span key={`gap-${index}`} className="pagination-info">
                                &hellip;
                            </span>
                        ) : (
                            <button
                                key={slot}
                                type="button"
                                className={`page-btn${slot === page ? " is-active" : ""}`}
                                onClick={() => onPageChange(slot)}
                                aria-current={slot === page ? "page" : undefined}
                            >
                                {slot}
                            </button>
                        )
                    )}

                    <button
                        type="button"
                        className="page-btn"
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= pages}
                        aria-label="Next page"
                    >
                        <ChevronRight />
                    </button>
                </div>
            ) : null}
        </div>
    );
};

/* =========================================================
   DATA TABLE
   Columns are declared as data so every module screen renders
   through the same component.
   ========================================================= */

export const DataTable = ({
    columns,
    rows,
    rowKey = (row) => row._id,
    isLoading,
    error,
    onRetry,
    emptyTitle,
    emptyDescription,
    emptyIcon,
    sort,
    onSort,
    selected,
    onSelect,
    onRowClick,
}) => {
    const selectable = Boolean(onSelect);
    const allSelected = selectable && rows.length > 0 && rows.every((r) => selected.has(rowKey(r)));

    const toggleAll = () => {
        const next = new Set(selected);

        if (allSelected) rows.forEach((row) => next.delete(rowKey(row)));
        else rows.forEach((row) => next.add(rowKey(row)));

        onSelect(next);
    };

    const toggleOne = (id) => {
        const next = new Set(selected);

        if (next.has(id)) next.delete(id);
        else next.add(id);

        onSelect(next);
    };

    if (error) return <ErrorState message={error} onRetry={onRetry} />;

    // Skeleton rows keep the header in place so the table does not jump.
    if (isLoading && !rows.length) {
        return (
            <div className="table-scroll">
                <table className="table">
                    <thead>
                        <tr>
                            {selectable ? <th className="col-check" /> : null}
                            {columns.map((column) => (
                                <th key={column.key}>{column.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 8 }).map((_, rowIndex) => (
                            <tr key={rowIndex}>
                                {selectable ? (
                                    <td>
                                        <div className="skeleton" style={{ width: 15 }} />
                                    </td>
                                ) : null}
                                {columns.map((column) => (
                                    <td key={column.key}>
                                        <div
                                            className="skeleton"
                                            style={{ width: `${45 + ((rowIndex * 13) % 45)}%` }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (!rows.length) {
        return (
            <EmptyState
                icon={emptyIcon}
                title={emptyTitle || "No records found"}
                description={emptyDescription || "Try clearing the filters or widening the date range."}
            />
        );
    }

    return (
        <div className="table-scroll">
            <table className="table">
                <thead>
                    <tr>
                        {selectable ? (
                            <th className="col-check">
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    checked={allSelected}
                                    onChange={toggleAll}
                                    aria-label="Select all rows on this page"
                                />
                            </th>
                        ) : null}

                        {columns.map((column) => {
                            const isSorted =
                                column.sortKey && (sort === column.sortKey || sort === `-${column.sortKey}`);

                            return (
                                <th
                                    key={column.key}
                                    className={[
                                        column.className,
                                        column.sortKey ? "is-sortable" : "",
                                        isSorted ? "is-sorted" : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    style={column.width ? { width: column.width } : undefined}
                                    onClick={column.sortKey ? () => onSort(column.sortKey) : undefined}
                                >
                                    {column.header}
                                    {column.sortKey ? <ChevronsUpDown className="sort-icon" /> : null}
                                </th>
                            );
                        })}
                    </tr>
                </thead>

                <tbody>
                    {rows.map((row) => {
                        const id = rowKey(row);

                        return (
                            <tr
                                key={id}
                                className={selectable && selected.has(id) ? "is-selected" : undefined}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                style={onRowClick ? { cursor: "pointer" } : undefined}
                            >
                                {selectable ? (
                                    <td className="col-check" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="checkbox"
                                            checked={selected.has(id)}
                                            onChange={() => toggleOne(id)}
                                            aria-label={`Select row ${id}`}
                                        />
                                    </td>
                                ) : null}

                                {columns.map((column) => (
                                    <td key={column.key} className={column.className}>
                                        {column.render ? column.render(row) : (row[column.key] ?? "—")}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

/* =========================================================
   MODAL AND DRAWER
   ========================================================= */

const useDismissable = (onClose) => {
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);

        // The page behind must not scroll while an overlay is open.
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previous;
        };
    }, [onClose]);
};

export const Modal = ({ title, description, onClose, footer, wide = false, children }) => {
    useDismissable(onClose);

    return (
        <div
            className="overlay is-centered"
            onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
            <div className={`modal${wide ? " is-wide" : ""}`} role="dialog" aria-modal="true">
                <header className="modal-head">
                    <div>
                        <h2>{title}</h2>
                        {description ? <p>{description}</p> : null}
                    </div>

                    <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
                        <X />
                    </button>
                </header>

                <div className="modal-body">{children}</div>

                {footer ? <footer className="modal-foot">{footer}</footer> : null}
            </div>
        </div>
    );
};

export const Drawer = ({ title, description, onClose, footer, children }) => {
    useDismissable(onClose);

    return (
        <div
            className="overlay is-side"
            onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
            <aside className="drawer" role="dialog" aria-modal="true">
                <header className="drawer-head">
                    <div>
                        <h2>{title}</h2>
                        {description ? <p>{description}</p> : null}
                    </div>

                    <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
                        <X />
                    </button>
                </header>

                <div className="drawer-body">{children}</div>

                {footer ? <footer className="drawer-foot">{footer}</footer> : null}
            </aside>
        </div>
    );
};

export const ConfirmDialog = ({
    title,
    message,
    confirmLabel = "Confirm",
    tone = "danger",
    isBusy = false,
    onConfirm,
    onCancel,
}) => (
    <Modal title={title} onClose={onCancel}>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-muted)" }}>{message}</p>

        <div className="modal-foot" style={{ padding: "20px 0 0", border: "none" }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isBusy}>
                Cancel
            </button>

            <button
                type="button"
                className={`btn btn-${tone}`}
                onClick={onConfirm}
                disabled={isBusy}
            >
                {isBusy ? <Spinner inline /> : null}
                {confirmLabel}
            </button>
        </div>
    </Modal>
);

/* =========================================================
   FORM FIELD
   ========================================================= */

export const Field = ({ label, hint, error, full = false, children }) => (
    <div className={`form-field${full ? " is-full" : ""}`}>
        {label ? <label>{label}</label> : null}
        {children}
        {hint && !error ? <span className="hint">{hint}</span> : null}
        {error ? <span className="error">{error}</span> : null}
    </div>
);

/* =========================================================
   DETAIL LIST
   ========================================================= */

export const DetailList = ({ items }) => (
    <dl className="detail-list">
        {items.map((item) => (
            <div key={item.label} className={`detail-item${item.full ? " is-full" : ""}`}>
                <dt>{item.label}</dt>
                <dd className={item.mono ? "num" : undefined}>{item.value ?? "—"}</dd>
            </div>
        ))}
    </dl>
);

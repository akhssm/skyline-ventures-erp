import { useMemo, useState } from "react";
import { Ban, Percent, Wallet } from "lucide-react";

import {
    bookings as bookingsApi,
    channelPartners as partnersApi,
    commissions as commissionsApi,
    configuration as configApi,
    payments as paymentsApi,
} from "../../api/resources";
import { useAsyncData } from "../../hooks/useResource";
import { useToast } from "../../context/ToastContext";
import { Badge, DetailList, Drawer, ErrorState, Field, LoadingState, Modal, Spinner } from "../ui";
import { currency, date, phone as formatPhone, titleCase } from "../../utils/format";

const STATUS_TONE = {
    pending: "warning",
    confirmed: "info",
    completed: "success",
    cancelled: "danger",
    refund: "purple",
};

const PAYMENT_TONE = {
    paid: "success",
    due: "warning",
    bounced: "danger",
    cancelled: "neutral",
};

const PAYMENT_MODES = ["cash", "cheque", "neft", "rtgs", "upi", "card", "loan"];

const today = () => new Date().toISOString().slice(0, 10);

/* ---------------------------------------------------------
   RECEIPT
   Settles one milestone and moves the booking's collected
   total with it.
   --------------------------------------------------------- */

const ReceiptModal = ({ bookingId, milestone, onClose, onSaved }) => {
    const toast = useToast();

    const [amount, setAmount] = useState(String(milestone.amount || ""));
    const [paidAt, setPaidAt] = useState(today());
    const [mode, setMode] = useState(milestone.mode || "neft");
    const [referenceNo, setReferenceNo] = useState("");
    const [remarks, setRemarks] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const submit = async () => {
        if (!Number(amount)) {
            toast.error("Enter the amount received");
            return;
        }

        setIsSaving(true);

        try {
            await bookingsApi.receipt(bookingId, {
                payment: milestone._id,
                amount: Number(amount),
                paidAt,
                mode,
                referenceNo,
                remarks,
            });

            toast.success("Receipt recorded");
            onSaved();
        } catch (err) {
            toast.error("Could not record the receipt", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            title="Record receipt"
            description={`${milestone.milestoneLabel} · ${milestone.receiptNo}`}
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={submit}
                        disabled={isSaving}
                    >
                        {isSaving ? <Spinner inline /> : null}
                        Save receipt
                    </button>
                </>
            }
        >
            <div className="form-grid">
                <Field label="Amount received">
                    <input
                        type="number"
                        className="input"
                        min="0"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        autoFocus
                    />
                </Field>

                <Field label="Received on">
                    <input
                        type="date"
                        className="input"
                        value={paidAt}
                        onChange={(event) => setPaidAt(event.target.value)}
                    />
                </Field>

                <Field label="Mode">
                    <select
                        className="select"
                        value={mode}
                        onChange={(event) => setMode(event.target.value)}
                    >
                        {PAYMENT_MODES.map((option) => (
                            <option key={option} value={option}>
                                {titleCase(option)}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Reference number">
                    <input
                        className="input"
                        placeholder="UTR, cheque or transaction id"
                        value={referenceNo}
                        onChange={(event) => setReferenceNo(event.target.value)}
                    />
                </Field>

                <Field label="Remarks" full>
                    <textarea
                        className="input"
                        rows={2}
                        value={remarks}
                        onChange={(event) => setRemarks(event.target.value)}
                    />
                </Field>
            </div>
        </Modal>
    );
};

/* ---------------------------------------------------------
   COMMISSION
   Raises the ledger line the payout run later pays out.
   --------------------------------------------------------- */

const CommissionModal = ({ booking, onClose, onSaved }) => {
    const toast = useToast();

    const { data: partners } = useAsyncData(() => partnersApi.list({ limit: 100, sort: "name" }), []);
    const { data: config } = useAsyncData(() => configApi.get(), []);

    const [partnerId, setPartnerId] = useState(booking.channelPartner?._id || "");
    const [percentage, setPercentage] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const tdsPercent = config?.defaultTdsPercent ?? 5;

    const partner = (partners || []).find((row) => row._id === partnerId);

    /* An empty box follows the partner's own rate, then the org default. */
    const effectivePercent =
        percentage !== ""
            ? Number(percentage)
            : (partner?.commissionPercent ?? config?.defaultCommissionPercent ?? 2);

    const gross = Math.round((booking.totalAmount * effectivePercent) / 100);
    const tds = Math.round((gross * tdsPercent) / 100);

    const submit = async () => {
        setIsSaving(true);

        try {
            await bookingsApi.raiseCommission(booking._id, {
                channelPartner: partnerId || null,
                percentage: effectivePercent,
            });

            toast.success("Commission raised");
            onSaved();
        } catch (err) {
            toast.error("Could not raise the commission", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            title="Raise commission"
            description={`${booking.customerName} · ${currency(booking.totalAmount)}`}
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={submit}
                        disabled={isSaving}
                    >
                        {isSaving ? <Spinner inline /> : null}
                        Raise
                    </button>
                </>
            }
        >
            <div className="form-grid">
                <Field label="Channel partner" hint="Leave empty for a direct sale">
                    <select
                        className="select"
                        value={partnerId}
                        onChange={(event) => setPartnerId(event.target.value)}
                    >
                        <option value="">Direct sale</option>
                        {(partners || []).map((row) => (
                            <option key={row._id} value={row._id}>
                                {row.name}
                                {row.firmName ? ` · ${row.firmName}` : ""}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field
                    label="Percentage"
                    hint={partner ? `${partner.name} is set to ${partner.commissionPercent}%` : ""}
                >
                    <input
                        type="number"
                        className="input"
                        min="0"
                        step="0.25"
                        placeholder={String(effectivePercent)}
                        value={percentage}
                        onChange={(event) => setPercentage(event.target.value)}
                    />
                </Field>
            </div>

            <div className="commission-preview">
                <div>
                    <span>Gross</span>
                    <b>{currency(gross)}</b>
                </div>
                <div>
                    <span>TDS at {tdsPercent}%</span>
                    <b>−{currency(tds)}</b>
                </div>
                <div className="is-net">
                    <span>Net payable</span>
                    <b>{currency(gross - tds)}</b>
                </div>
            </div>
        </Modal>
    );
};

/* ---------------------------------------------------------
   CANCEL
   The reason is stored on the booking, so it is asked for
   rather than assumed.
   --------------------------------------------------------- */

const CancelModal = ({ booking, onClose, onSaved }) => {
    const toast = useToast();

    const [reason, setReason] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const submit = async () => {
        if (!reason.trim()) {
            toast.error("Give a reason for the cancellation");
            return;
        }

        setIsSaving(true);

        try {
            await bookingsApi.changeStatus(booking._id, { status: "cancelled", reason });

            toast.success("Booking cancelled");
            onSaved();
        } catch (err) {
            toast.error("Could not cancel the booking", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            title="Cancel this booking?"
            description={`Flat ${booking.unit?.flatNo || ""} returns to available stock.`}
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Keep booking
                    </button>

                    <button
                        type="button"
                        className="btn btn-danger"
                        onClick={submit}
                        disabled={isSaving}
                    >
                        {isSaving ? <Spinner inline /> : null}
                        Cancel booking
                    </button>
                </>
            }
        >
            <Field label="Reason">
                <textarea
                    className="input"
                    rows={3}
                    placeholder="Loan rejected, unit changed, customer withdrew…"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    autoFocus
                />
            </Field>
        </Modal>
    );
};

/* ---------------------------------------------------------
   DRAWER
   --------------------------------------------------------- */

const BookingDetailDrawer = ({ bookingId, onClose, onChanged }) => {
    const {
        data: booking,
        isLoading,
        error,
        refetch,
    } = useAsyncData(() => bookingsApi.get(bookingId), [bookingId]);

    const {
        data: schedule,
        refetch: refetchSchedule,
    } = useAsyncData(
        () => paymentsApi.list({ booking: bookingId, limit: 50, sort: "dueDate" }),
        [bookingId]
    );

    const { data: commissions, refetch: refetchCommission } = useAsyncData(
        () => commissionsApi.list({ booking: bookingId, limit: 1 }),
        [bookingId]
    );

    const [receipting, setReceipting] = useState(null);
    const [isRaising, setIsRaising] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const commission = commissions?.[0] || null;

    const balance = booking
        ? Math.max(booking.totalAmount - booking.discount - booking.receivedAmount, 0)
        : 0;

    /* How much of the schedule is settled, drawn as a bar over the rows. */
    const collected = useMemo(() => {
        const rows = schedule || [];
        const total = rows.reduce((sum, row) => sum + (row.amount || 0), 0);
        const paid = rows
            .filter((row) => row.status === "paid")
            .reduce((sum, row) => sum + (row.amount || 0), 0);

        return { total, paid, percent: total ? Math.round((paid / total) * 100) : 0 };
    }, [schedule]);

    const canReceive = booking && ["confirmed", "completed"].includes(booking.status);
    const canCancel = booking && ["pending", "confirmed"].includes(booking.status);
    const canRaise = booking && ["confirmed", "completed"].includes(booking.status) && !commission;

    const afterChange = () => {
        refetch();
        refetchSchedule();
        refetchCommission();
        onChanged?.();
    };

    return (
        <Drawer
            title={booking?.customerName || "Booking"}
            description={
                booking ? `${booking.bookingNo} · ${formatPhone(booking.customerPhone)}` : ""
            }
            onClose={onClose}
            footer={
                booking ? (
                    <>
                        {canCancel ? (
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={() => setIsCancelling(true)}
                            >
                                <Ban /> Cancel booking
                            </button>
                        ) : null}

                        {canRaise ? (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setIsRaising(true)}
                            >
                                <Percent /> Raise commission
                            </button>
                        ) : null}
                    </>
                ) : null
            }
        >
            {error ? (
                <ErrorState message={error} onRetry={refetch} />
            ) : isLoading || !booking ? (
                <LoadingState label="Loading booking" />
            ) : (
                <>
                    <div style={{ marginBottom: 20 }}>
                        <Badge tone={STATUS_TONE[booking.status] || "neutral"}>
                            {titleCase(booking.status)}
                        </Badge>
                    </div>

                    <DetailList
                        items={[
                            { label: "Project", value: booking.project?.name },
                            {
                                label: "Unit",
                                value: booking.unit
                                    ? `${booking.unit.tower} · ${booking.unit.flatNo} · ${booking.unit.unitType}`
                                    : "—",
                            },
                            {
                                label: "Total amount",
                                value: currency(booking.totalAmount),
                                mono: true,
                            },
                            { label: "Discount", value: currency(booking.discount), mono: true },
                            {
                                label: "Received",
                                value: currency(booking.receivedAmount),
                                mono: true,
                            },
                            { label: "Balance", value: currency(balance), mono: true },
                            { label: "Booking date", value: date(booking.bookingDate), mono: true },
                            { label: "Sale type", value: titleCase(booking.saleType) },
                            { label: "Sold by", value: booking.soldBy?.name },
                            {
                                label: "Post-sales owner",
                                value: booking.assignedTo?.name || "Unassigned",
                            },
                            {
                                label: "Channel partner",
                                value: booking.channelPartner
                                    ? `${booking.channelPartner.name} (${booking.channelPartner.firmName})`
                                    : "Direct",
                                full: true,
                            },
                            ...(booking.refundAmount
                                ? [
                                      {
                                          label: "Refunded",
                                          value: currency(booking.refundAmount),
                                          mono: true,
                                      },
                                  ]
                                : []),
                            ...(booking.cancelReason
                                ? [
                                      {
                                          label: "Cancel reason",
                                          value: booking.cancelReason,
                                          full: true,
                                      },
                                  ]
                                : []),
                        ]}
                    />

                    {commission ? (
                        <>
                            <h3 className="drawer-section">Commission</h3>

                            <div className="commission-line">
                                <div>
                                    <b>{currency(commission.netAmount)}</b>
                                    <span>
                                        {commission.percentage}% of{" "}
                                        {currency(commission.bookingValue)} less{" "}
                                        {commission.tdsPercent}% TDS
                                    </span>
                                </div>

                                <Badge tone={commission.status === "paid" ? "success" : "warning"}>
                                    {titleCase(commission.status)}
                                </Badge>
                            </div>
                        </>
                    ) : null}

                    <h3 className="drawer-section">
                        Payment schedule
                        {collected.total ? (
                            <span className="drawer-section-note">
                                {currency(collected.paid)} of {currency(collected.total)} collected
                            </span>
                        ) : null}
                    </h3>

                    {schedule?.length ? (
                        <>
                            <div
                                className="collect-bar"
                                role="img"
                                aria-label={`${collected.percent}% collected`}
                            >
                                <i style={{ width: `${collected.percent}%` }} />
                            </div>

                            <div className="table-scroll">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Milestone</th>
                                            <th>Due</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            {canReceive ? <th /> : null}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {schedule.map((row) => (
                                            <tr key={row._id}>
                                                <td>{row.milestoneLabel}</td>
                                                <td className="num">{date(row.dueDate)}</td>
                                                <td className="num">{currency(row.amount)}</td>
                                                <td>
                                                    <Badge
                                                        tone={PAYMENT_TONE[row.status] || "neutral"}
                                                    >
                                                        {titleCase(row.status)}
                                                    </Badge>
                                                </td>

                                                {canReceive ? (
                                                    <td className="col-actions">
                                                        {row.status === "due" ||
                                                        row.status === "bounced" ? (
                                                            <button
                                                                type="button"
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => setReceipting(row)}
                                                            >
                                                                <Wallet /> Receive
                                                            </button>
                                                        ) : null}
                                                    </td>
                                                ) : null}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                            The schedule is generated when the booking is confirmed.
                        </p>
                    )}
                </>
            )}

            {receipting ? (
                <ReceiptModal
                    bookingId={bookingId}
                    milestone={receipting}
                    onClose={() => setReceipting(null)}
                    onSaved={() => {
                        setReceipting(null);
                        afterChange();
                    }}
                />
            ) : null}

            {isRaising ? (
                <CommissionModal
                    booking={booking}
                    onClose={() => setIsRaising(false)}
                    onSaved={() => {
                        setIsRaising(false);
                        afterChange();
                    }}
                />
            ) : null}

            {isCancelling ? (
                <CancelModal
                    booking={booking}
                    onClose={() => setIsCancelling(false)}
                    onSaved={() => {
                        setIsCancelling(false);
                        afterChange();
                    }}
                />
            ) : null}
        </Drawer>
    );
};

export default BookingDetailDrawer;

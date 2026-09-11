import { useEffect } from "react";

import { compactCurrency, date, number, titleCase } from "../../utils/format";

/**
 * The side panel the original opens when a row in the inventory table is
 * clicked. Facts first, then whatever the booking added, then the two links
 * out to the floor view and the booking.
 */

const Fact = ({ label, value, mono = false, wide = false }) => (
    <div className={`peek-fact${wide ? " is-wide" : ""}`}>
        <div className="peek-fact-label">{label}</div>
        <div className={`peek-fact-value${mono ? " is-mono" : ""}${value ? "" : " is-missing"}`}>
            {value || "Not set"}
        </div>
    </div>
);

const UnitPeek = ({ unit, onClose, onOpenFloor, onOpenBooking }) => {
    useEffect(() => {
        const onKeyDown = (event) => event.key === "Escape" && onClose();

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    const hasBooking = Boolean(unit.booking);
    const projectName = unit.project?.name || "Unassigned";

    return (
        <aside className="unit-peek" role="dialog" aria-modal="false" aria-label="Unit detail">
            <header className="peek-head">
                <div className="peek-name">{unit.flatNo}</div>

                <div className="peek-meta">
                    {projectName} · {unit.tower} · Floor {unit.floor}
                </div>

                <button type="button" className="peek-close" onClick={onClose} aria-label="Close">
                    ✕
                </button>
            </header>

            <div className="peek-body">
                <p className="peek-overline">Unit facts</p>

                <div className="peek-facts">
                    <Fact label="Project" value={projectName} />
                    <Fact label="Tower" value={unit.tower} />
                    <Fact label="Floor" value={String(unit.floor ?? "")} mono />
                    <Fact label="Unit No" value={unit.flatNo} mono />
                    <Fact label="Type" value={unit.unitType} />
                    <Fact
                        label="Area (sq.ft)"
                        value={unit.builtUpArea ? number(unit.builtUpArea) : ""}
                        mono
                    />
                    <Fact label="Facing" value={unit.facing} />
                    <Fact label="View" value={unit.view} />

                    <div className="peek-fact is-wide">
                        <div className="peek-fact-label">Status</div>
                        <div className="peek-fact-value">
                            <span className={`unit-pill is-${unit.status}`}>
                                {titleCase(unit.status)}
                            </span>
                        </div>
                    </div>

                    <Fact
                        label="All-in price"
                        value={unit.totalPrice ? compactCurrency(unit.totalPrice) : ""}
                        mono
                        wide
                    />

                    {hasBooking ? (
                        <>
                            <Fact label="Customer" value={unit.booking?.customerName} />
                            <Fact
                                label="Booked on"
                                value={unit.booking?.bookingDate ? date(unit.booking.bookingDate) : ""}
                                mono
                            />
                        </>
                    ) : null}
                </div>
            </div>

            <footer className="peek-foot">
                {hasBooking ? (
                    <button type="button" className="peek-go is-primary" onClick={onOpenBooking}>
                        Open booking &amp; payments →
                    </button>
                ) : null}

                <button type="button" className="peek-go" onClick={onOpenFloor}>
                    Open floor view →
                </button>
            </footer>
        </aside>
    );
};

export default UnitPeek;

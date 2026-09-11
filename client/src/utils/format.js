/* =========================================================
   FORMATTING
   Indian numbering, dates and label casing used across the app.
   ========================================================= */

const LAKH = 100000;
const CRORE = 10000000;

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** 6339375 -> "6,33,9375" style Indian grouping, with the rupee sign. */
export const currency = (value) =>
    value === null || value === undefined || Number.isNaN(Number(value))
        ? "—"
        : `₹${inr.format(Math.round(Number(value)))}`;

/** Condenses large figures the way the dashboard does: 36.47 Cr, 13.34 L. */
export const compactCurrency = (value) => {
    const n = Number(value) || 0;
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(n);

    if (abs >= CRORE) return `${sign}₹${(abs / CRORE).toFixed(2)} Cr`;
    if (abs >= LAKH) return `${sign}₹${(abs / LAKH).toFixed(2)} L`;
    if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)} K`;

    return `${sign}₹${inr.format(abs)}`;
};

export const number = (value) =>
    value === null || value === undefined ? "—" : inr.format(Number(value));

export const percent = (value, digits = 1) =>
    value === null || value === undefined ? "—" : `${Number(value).toFixed(digits)}%`;

/** 08/09/2026 — the format used in every table cell. */
export const date = (value) => {
    if (!value) return "—";

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";

    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export const dateTime = (value) => {
    if (!value) return "—";

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";

    return `${date(value)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** "3 days ago", used in the notification panel. */
export const relativeTime = (value) => {
    if (!value) return "";

    const diff = Date.now() - new Date(value).getTime();
    const minutes = Math.round(diff / 60000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;

    return date(value);
};

/** 9876543210 -> 98765 43210 */
export const phone = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits || "—";
};

/** site_rescheduled -> Site Rescheduled */
export const titleCase = (value) =>
    !value
        ? "—"
        : String(value)
              .split(/[_\s-]+/)
              .filter(Boolean)
              .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
              .join(" ");

export const initials = (name) =>
    String(name || "")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("") || "?";

/** Score band shared by the rail colour and the pill label. */
export const scoreBand = (score) => {
    const n = Number(score) || 0;

    if (n >= 80) return "hot";
    if (n >= 55) return "warm";
    if (n >= 30) return "cold";

    return "very_cold";
};

export const scoreBandLabel = (score) =>
    ({ hot: "Hot", warm: "Warm", cold: "Cold", very_cold: "Very Cold" })[scoreBand(score)];

export const duration = (seconds) => {
    const s = Number(seconds) || 0;
    if (!s) return "—";

    const m = Math.floor(s / 60);
    return m ? `${m}m ${s % 60}s` : `${s}s`;
};

export const fileSize = (bytes) => {
    const b = Number(bytes) || 0;
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
};

import {
    Building2,
    CloudUpload,
    Calendar,
    Compass,
    FileText,
    Folder,
    Handshake,
    Percent,
    PhoneCall,
    Receipt,
    Send,
    ShoppingCart,
    User,
    Wallet,
} from "lucide-react";

import * as api from "../api/resources";
import { Badge } from "../components/ui";
import {
    compactCurrency,
    currency,
    date,
    dateTime,
    duration,
    fileSize,
    number,
    phone as formatPhone,
    titleCase,
} from "../utils/format";

/* ---------------------------------------------------------
   SHARED PIECES
   --------------------------------------------------------- */

const toOptions = (values) => values.map((value) => ({ value, label: titleCase(value) }));

// Lookup loaders. Each is called once per page and shared by filters and forms.
const LOOKUPS = {
    projects: () => api.projects.list({ limit: 100, sort: "name" }),
    units: () => api.units.list({ limit: 200 }),
    leads: () => api.leads.list({ limit: 100, sort: "-createdAt" }),
    users: () => api.users.list({ limit: 100, sort: "name" }),
    partners: () => api.channelPartners.list({ limit: 100, sort: "name" }),
    bookings: () => api.bookings.list({ limit: 100 }),
    plans: () => api.paymentPlans.list({ limit: 50 }),
};

const tone = (map, fallback = "neutral") => (value) => map[value] || fallback;

const statusBadge = (map) => (row) =>
    row.status ? <Badge tone={tone(map)(row.status)}>{titleCase(row.status)}</Badge> : "—";

const referenceCell = (path, field = "name") => (row) => {
    const value = path.split(".").reduce((acc, key) => acc?.[key], row);
    return value?.[field] || value || <span className="muted">—</span>;
};

/* ---------------------------------------------------------
   PROJECTS
   --------------------------------------------------------- */

export const projectsConfig = {
    id: "projects",
    title: "Projects",
    subtitle: "projects",
    resource: api.projects,
    searchPlaceholder: "Search project, code or city",
    emptyIcon: Folder,
    emptyTitle: "No projects yet",
    emptyDescription: "Add a project to start loading inventory against it.",
    filters: [
        {
            name: "status",
            label: "All Statuses",
            options: toOptions(["planning", "under_construction", "ready", "completed"]),
        },
    ],
    columns: [
        {
            key: "name",
            header: "Project Name",
            sortKey: "name",
            render: (row) => (
                <div>
                    <div className="record-name">{row.name}</div>
                    <div className="record-sub">
                        {row.code} <span className="dot">·</span> {row.city || "—"}
                    </div>
                </div>
            ),
        },
        {
            key: "towers",
            header: "Total Towers",
            className: "num",
            render: (row) => number(row.towers?.length || 0),
        },
        {
            key: "units",
            header: "Total units",
            className: "num",
            // Floors times units per floor, summed across every tower.
            render: (row) =>
                number(
                    (row.towers || []).reduce(
                        (sum, t) => sum + (t.floors || 0) * (t.unitsPerFloor || 0),
                        0
                    )
                ),
        },
        { key: "reraNumber", header: "RERA", className: "num" },
        {
            key: "status",
            header: "Unit status",
            render: statusBadge({
                ready: "success",
                completed: "success",
                under_construction: "info",
                planning: "warning",
            }),
        },
        {
            key: "possessionDate",
            header: "Possession",
            className: "num",
            sortKey: "possessionDate",
            render: (row) => date(row.possessionDate),
        },
    ],
    formTitle: "project",
    formFields: [
        { name: "name", label: "Project name", type: "text", required: true },
        { name: "code", label: "Short code", type: "text", hint: "Used in booking numbers" },
        { name: "city", label: "City", type: "text" },
        { name: "reraNumber", label: "RERA number", type: "text" },
        {
            name: "status",
            label: "Status",
            type: "select",
            options: toOptions(["planning", "under_construction", "ready", "completed"]),
        },
        { name: "possessionDate", label: "Possession date", type: "date" },
        { name: "address", label: "Address", type: "textarea" },
    ],
};

/* ---------------------------------------------------------
   USERS
   --------------------------------------------------------- */

export const usersConfig = {
    id: "users",
    title: "Employees",
    subtitle: "employees",
    resource: api.users,
    searchPlaceholder: "Search name, phone, email",
    emptyIcon: User,
    emptyTitle: "No employees yet",
    filters: [
        {
            name: "role",
            label: "All Roles",
            options: [
                { value: "property_owner", label: "Property Owner" },
                { value: "marketing_manager", label: "CRM Manager" },
                { value: "marketing", label: "CRM Executive" },
                { value: "channel_partner", label: "Channel Partner" },
                { value: "accountant", label: "Post-Sales Manager" },
                { value: "receptionist", label: "Receptionist" },
                { value: "system_operator", label: "System Operator" },
            ],
        },
        {
            name: "isActive",
            label: "All States",
            options: [
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
            ],
        },
    ],
    columns: [
        {
            key: "name",
            header: "Member",
            sortKey: "name",
            render: (row) => (
                <div className="record">
                    <span
                        className="avatar"
                        style={{ background: row.avatarColor || "var(--brand-600)" }}
                    >
                        {row.name
                            .split(" ")
                            .slice(0, 2)
                            .map((p) => p[0])
                            .join("")
                            .toUpperCase()}
                    </span>

                    <div>
                        <div className="record-name">{row.name}</div>
                        <div className="record-sub">{formatPhone(row.phone)}</div>
                    </div>
                </div>
            ),
        },
        { key: "email", header: "Email" },
        {
            key: "role",
            header: "Role",
            render: (row) => <Badge tone="info">{titleCase(row.role)}</Badge>,
        },
        { key: "reportsTo", header: "Reports to", render: referenceCell("reportsTo") },
        {
            key: "lastLoginAt",
            header: "Last login",
            className: "num",
            sortKey: "lastLoginAt",
            render: (row) => (row.lastLoginAt ? dateTime(row.lastLoginAt) : "Never"),
        },
        {
            key: "isActive",
            header: "State",
            render: (row) => (
                <Badge tone={row.isActive ? "success" : "neutral"}>
                    {row.isActive ? "Active" : "Inactive"}
                </Badge>
            ),
        },
    ],
    lookups: { users: LOOKUPS.users },
    formTitle: "employee",
    formFields: [
        { name: "name", label: "Full name", type: "text", required: true },
        { name: "phone", label: "Mobile number", type: "phone", required: true },
        { name: "email", label: "Email", type: "email" },
        {
            name: "role",
            label: "Role",
            type: "select",
            required: true,
            options: [
                { value: "property_owner", label: "Property Owner" },
                { value: "marketing_manager", label: "CRM Manager" },
                { value: "marketing", label: "CRM Executive" },
                { value: "channel_partner", label: "Channel Partner" },
                { value: "accountant", label: "Post-Sales Manager" },
                { value: "receptionist", label: "Receptionist" },
                { value: "system_operator", label: "System Operator" },
            ],
        },
        { name: "reportsTo", label: "Reports to", type: "reference", optionsFrom: "users" },
        { name: "isActive", label: "Account state", type: "checkbox", checkboxLabel: "Active" },
    ],
};

/* ---------------------------------------------------------
   FOLLOW-UPS
   --------------------------------------------------------- */

export const followUpsConfig = {
    id: "followUps",
    title: "Follow-ups",
    subtitle: "follow-ups",
    resource: api.followUps,
    searchPlaceholder: "Search remarks",
    emptyIcon: Calendar,
    emptyTitle: "No follow-ups scheduled",
    initialParams: { status: "pending" },
    filters: [
        { name: "status", label: "All Statuses", options: toOptions(["pending", "done", "missed", "rescheduled"]) },
        { name: "channel", label: "All Channels", options: toOptions(["call", "whatsapp", "email", "meeting", "site_visit"]) },
    ],
    columns: [
        {
            key: "lead",
            header: "Lead",
            render: (row) =>
                row.lead ? (
                    <div>
                        <div className="record-name">{row.lead.name}</div>
                        <div className="record-sub">{formatPhone(row.lead.phone)}</div>
                    </div>
                ) : (
                    "—"
                ),
        },
        {
            key: "dueAt",
            header: "Due",
            className: "num",
            sortKey: "dueAt",
            render: (row) => {
                const isOverdue = row.status === "pending" && new Date(row.dueAt) < new Date();

                return (
                    <span style={isOverdue ? { color: "var(--danger)" } : undefined}>
                        {dateTime(row.dueAt)}
                    </span>
                );
            },
        },
        { key: "channel", header: "Channel", render: (row) => titleCase(row.channel) },
        {
            key: "status",
            header: "Status",
            render: statusBadge({ done: "success", pending: "warning", missed: "danger", rescheduled: "info" }),
        },
        { key: "assignedTo", header: "Agent", render: referenceCell("assignedTo") },
        { key: "remarks", header: "Remarks" },
    ],
    lookups: { leads: LOOKUPS.leads, users: LOOKUPS.users },
    formTitle: "follow-up",
    formFields: [
        { name: "lead", label: "Lead", type: "reference", optionsFrom: "leads", required: true },
        { name: "dueAt", label: "Due date", type: "date", required: true },
        { name: "channel", label: "Channel", type: "select", options: toOptions(["call", "whatsapp", "email", "meeting", "site_visit"]) },
        { name: "status", label: "Status", type: "select", options: toOptions(["pending", "done", "missed", "rescheduled"]) },
        { name: "assignedTo", label: "Agent", type: "reference", optionsFrom: "users" },
        { name: "remarks", label: "Remarks", type: "textarea" },
    ],
};

/* ---------------------------------------------------------
   CALL LOG
   --------------------------------------------------------- */

export const callLogConfig = {
    id: "callLog",
    title: "Call Log",
    subtitle: "calls",
    resource: api.callLogs,
    searchPlaceholder: "Search phone or notes",
    emptyIcon: PhoneCall,
    emptyTitle: "No calls logged",
    filters: [
        { name: "status", label: "All Outcomes", options: toOptions(["answered", "missed", "busy", "no_answer", "rejected"]) },
        { name: "direction", label: "All Directions", options: toOptions(["inbound", "outbound"]) },
    ],
    columns: [
        {
            key: "lead",
            header: "Lead",
            render: (row) =>
                row.lead ? (
                    <div>
                        <div className="record-name">{row.lead.name}</div>
                        <div className="record-sub">{formatPhone(row.phone)}</div>
                    </div>
                ) : (
                    <span className="mono">{formatPhone(row.phone)}</span>
                ),
        },
        { key: "agent", header: "Agent", render: referenceCell("agent") },
        {
            key: "direction",
            header: "Direction",
            render: (row) => <Badge tone="neutral">{titleCase(row.direction)}</Badge>,
        },
        {
            key: "status",
            header: "Outcome",
            render: statusBadge({ answered: "success", missed: "danger", rejected: "danger", busy: "warning", no_answer: "warning" }),
        },
        { key: "duration", header: "Duration", className: "num", render: (row) => duration(row.duration) },
        { key: "startedAt", header: "Started", className: "num", sortKey: "startedAt", render: (row) => dateTime(row.startedAt) },
        { key: "notes", header: "Notes" },
    ],
    lookups: { leads: LOOKUPS.leads, users: LOOKUPS.users },
    formTitle: "call",
    formFields: [
        { name: "lead", label: "Lead", type: "reference", optionsFrom: "leads" },
        { name: "phone", label: "Phone", type: "phone", required: true },
        { name: "agent", label: "Agent", type: "reference", optionsFrom: "users" },
        { name: "direction", label: "Direction", type: "select", options: toOptions(["inbound", "outbound"]) },
        { name: "status", label: "Outcome", type: "select", options: toOptions(["answered", "missed", "busy", "no_answer", "rejected"]) },
        { name: "duration", label: "Duration in seconds", type: "number" },
        { name: "notes", label: "Notes", type: "textarea" },
    ],
};

/* ---------------------------------------------------------
   SITE VISITS
   --------------------------------------------------------- */

export const siteVisitsConfig = {
    id: "siteVisits",
    title: "Site Visits",
    subtitle: "visits",
    resource: api.siteVisits,
    searchPlaceholder: "Search name or phone",
    emptyIcon: Compass,
    emptyTitle: "No site visits scheduled",
    filters: [
        { name: "status", label: "All Status", options: toOptions(["pending", "scheduled", "rescheduled", "completed", "cancelled", "no_show"]) },
        { name: "project", label: "All Projects", type: "reference", optionsFrom: "projects" },
    ],
    columns: [
        {
            key: "lead",
            header: "Lead",
            render: (row) =>
                row.lead ? (
                    <div>
                        <div className="record-name">{row.lead.name}</div>
                        <div className="record-sub">{formatPhone(row.lead.phone)}</div>
                    </div>
                ) : (
                    "—"
                ),
        },
        { key: "project", header: "Project", render: referenceCell("project") },
        { key: "scheduledAt", header: "Scheduled", className: "num", sortKey: "scheduledAt", render: (row) => dateTime(row.scheduledAt) },
        {
            key: "status",
            header: "Status",
            render: statusBadge({ completed: "success", scheduled: "info", rescheduled: "info", pending: "warning", cancelled: "danger", no_show: "danger" }),
        },
        { key: "agent", header: "Assigned to", render: referenceCell("agent") },
        {
            key: "rating",
            header: "Rating",
            className: "num",
            render: (row) => (row.rating ? `${row.rating} / 5` : "—"),
        },
        { key: "feedback", header: "Outcome" },
    ],
    lookups: { leads: LOOKUPS.leads, projects: LOOKUPS.projects, users: LOOKUPS.users },
    formTitle: "site visit",
    formFields: [
        { name: "lead", label: "Lead", type: "reference", optionsFrom: "leads", required: true },
        { name: "project", label: "Project", type: "reference", optionsFrom: "projects" },
        { name: "scheduledAt", label: "Scheduled for", type: "date", required: true },
        { name: "status", label: "Status", type: "select", options: toOptions(["pending", "scheduled", "rescheduled", "completed", "cancelled", "no_show"]) },
        { name: "agent", label: "Agent", type: "reference", optionsFrom: "users" },
        { name: "rating", label: "Rating out of 5", type: "number" },
        { name: "feedback", label: "Feedback", type: "textarea" },
    ],
};

/* ---------------------------------------------------------
   QUOTATIONS
   --------------------------------------------------------- */

export const quotationsConfig = {
    id: "quotation",
    title: "Quotation",
    subtitle: "quotations",
    resource: api.quotations,
    searchPlaceholder: "Search quote number",
    emptyIcon: Receipt,
    emptyTitle: "No quotations yet",
    canCreate: false,
    filters: [
        { name: "status", label: "All Statuses", options: toOptions(["draft", "sent", "accepted", "rejected", "expired"]) },
        { name: "project", label: "All Projects", type: "reference", optionsFrom: "projects" },
    ],
    lookups: { projects: LOOKUPS.projects },
    columns: [
        { key: "quoteNo", header: "Quote no", className: "num", sortKey: "quoteNo" },
        {
            key: "lead",
            header: "Lead",
            render: (row) =>
                row.lead ? (
                    <div>
                        <div className="record-name">{row.lead.name}</div>
                        <div className="record-sub">{formatPhone(row.lead.phone)}</div>
                    </div>
                ) : (
                    "—"
                ),
        },
        { key: "project", header: "Project", render: referenceCell("project") },
        { key: "unit", header: "Unit", render: (row) => row.unit?.flatNo || "—" },
        { key: "subTotal", header: "Sub total", className: "num", render: (row) => currency(row.subTotal) },
        { key: "taxAmount", header: "GST", className: "num", render: (row) => currency(row.taxAmount) },
        { key: "grandTotal", header: "Grand total", className: "num", sortKey: "grandTotal", render: (row) => <strong>{currency(row.grandTotal)}</strong> },
        {
            key: "status",
            header: "Status",
            render: statusBadge({ accepted: "success", sent: "info", draft: "neutral", rejected: "danger", expired: "warning" }),
        },
        { key: "validUntil", header: "Valid until", className: "num", render: (row) => date(row.validUntil) },
    ],
};

/* ---------------------------------------------------------
   BOOKING REQUESTS
   --------------------------------------------------------- */

export const bookingRequestsConfig = {
    id: "bookingRequests",
    title: "Booking Requests",
    subtitle: "requests",
    resource: api.bookingRequests,
    searchPlaceholder: "Search remarks",
    emptyIcon: ShoppingCart,
    emptyTitle: "No booking requests",
    initialParams: { status: "pending" },
    filters: [
        { name: "status", label: "All Statuses", options: toOptions(["pending", "approved", "rejected"]) },
    ],
    columns: [
        {
            key: "lead",
            header: "Customer",
            render: (row) =>
                row.lead ? (
                    <div>
                        <div className="record-name">{row.lead.name}</div>
                        <div className="record-sub">{formatPhone(row.lead.phone)}</div>
                    </div>
                ) : (
                    "—"
                ),
        },
        { key: "project", header: "Project", render: referenceCell("project") },
        { key: "unit", header: "Unit", render: (row) => (row.unit ? `${row.unit.tower} · ${row.unit.flatNo}` : "—") },
        { key: "requestedAmount", header: "Amount", className: "num", render: (row) => currency(row.requestedAmount) },
        { key: "tokenAmount", header: "Token", className: "num", render: (row) => currency(row.tokenAmount) },
        { key: "requestedBy", header: "Raised by", render: referenceCell("requestedBy") },
        {
            key: "status",
            header: "Status",
            render: statusBadge({ approved: "success", pending: "warning", rejected: "danger" }),
        },
        { key: "createdAt", header: "Raised", className: "num", sortKey: "createdAt", render: (row) => date(row.createdAt) },
    ],
    lookups: { leads: LOOKUPS.leads, units: LOOKUPS.units, users: LOOKUPS.users },
    formTitle: "booking request",
    formFields: [
        { name: "lead", label: "Lead", type: "reference", optionsFrom: "leads", required: true },
        {
            name: "unit",
            label: "Unit",
            type: "reference",
            optionsFrom: "units",
            optionLabel: (unit) => `${unit.tower} · ${unit.flatNo} · ${unit.unitType}`,
            required: true,
        },
        { name: "requestedAmount", label: "Requested amount", type: "currency" },
        { name: "tokenAmount", label: "Token amount", type: "currency" },
        { name: "status", label: "Status", type: "select", options: toOptions(["pending", "approved", "rejected"]) },
        { name: "remarks", label: "Remarks", type: "textarea" },
    ],
};



/* ---------------------------------------------------------
   CHANNEL PARTNERS
   --------------------------------------------------------- */

export const channelPartnersConfig = {
    id: "channelPartners",
    title: "Channel Partners",
    subtitle: "partners",
    resource: api.channelPartners,
    searchPlaceholder: "Search partner or firm",
    emptyIcon: Handshake,
    emptyTitle: "No channel partners",
    filters: [
        { name: "status", label: "All Statuses", options: toOptions(["pending", "active", "suspended"]) },
    ],
    columns: [
        {
            key: "name",
            header: "Partner",
            sortKey: "name",
            render: (row) => (
                <div>
                    <div className="record-name">{row.name}</div>
                    <div className="record-sub">{row.firmName || "Individual"}</div>
                </div>
            ),
        },
        { key: "phone", header: "Phone", className: "num", render: (row) => formatPhone(row.phone) },
        { key: "reraNumber", header: "RERA", className: "num" },
        { key: "panNumber", header: "PAN", className: "num" },
        {
            key: "commissionPercent",
            header: "Commission",
            className: "num",
            render: (row) => `${row.commissionPercent}%`,
        },
        {
            key: "status",
            header: "Status",
            render: statusBadge({ active: "success", pending: "warning", suspended: "danger" }),
        },
    ],
    formTitle: "channel partner",
    formFields: [
        { name: "name", label: "Partner name", type: "text", required: true },
        { name: "firmName", label: "Firm name", type: "text" },
        { name: "phone", label: "Mobile number", type: "phone", required: true },
        { name: "email", label: "Email", type: "email" },
        { name: "reraNumber", label: "RERA number", type: "text" },
        { name: "panNumber", label: "PAN", type: "text" },
        { name: "gstin", label: "GSTIN", type: "text" },
        { name: "commissionPercent", label: "Commission percent", type: "number" },
        { name: "bankName", label: "Bank", type: "text" },
        { name: "accountNumber", label: "Account number", type: "text" },
        { name: "ifsc", label: "IFSC", type: "text" },
        { name: "status", label: "Status", type: "select", options: toOptions(["pending", "active", "suspended"]) },
    ],
};

/* ---------------------------------------------------------
   COMMISSION LEDGER
   --------------------------------------------------------- */

export const commissionsConfig = {
    id: "commissionLedger",
    title: "Commission Ledger",
    subtitle: "ledger lines",
    resource: api.commissions,
    searchPlaceholder: "Search",
    emptyIcon: Building2,
    emptyTitle: "No commission lines",
    canCreate: false,
    filters: [
        { name: "status", label: "All Statuses", options: toOptions(["accrued", "approved", "on_hold", "paid", "reversed"]) },
        { name: "channelPartner", label: "All Partners", type: "reference", optionsFrom: "partners" },
    ],
    lookups: { partners: LOOKUPS.partners },
    columns: [
        {
            key: "booking",
            header: "Booking",
            render: (row) =>
                row.booking ? (
                    <div>
                        <div className="record-name">{row.booking.customerName}</div>
                        <div className="record-sub">{row.booking.bookingNo}</div>
                    </div>
                ) : (
                    "—"
                ),
        },
        {
            key: "channelPartner",
            header: "Partner",
            render: (row) => row.channelPartner?.name || <span className="muted">Direct</span>,
        },
        { key: "agent", header: "Agent", render: referenceCell("agent") },
        { key: "bookingValue", header: "Booking value", className: "num", render: (row) => compactCurrency(row.bookingValue) },
        { key: "percentage", header: "Rate", className: "num", render: (row) => `${row.percentage}%` },
        { key: "grossAmount", header: "Gross", className: "num", render: (row) => currency(row.grossAmount) },
        { key: "tdsAmount", header: "TDS", className: "num", render: (row) => currency(row.tdsAmount) },
        { key: "netAmount", header: "Net payable", className: "num", sortKey: "netAmount", render: (row) => <strong>{currency(row.netAmount)}</strong> },
        {
            key: "status",
            header: "Status",
            render: statusBadge({ paid: "success", approved: "info", accrued: "neutral", on_hold: "warning", reversed: "danger" }),
        },
    ],
};

/* ---------------------------------------------------------
   PAYOUT RUNS
   --------------------------------------------------------- */

export const payoutRunsConfig = {
    id: "payoutRuns",
    title: "Payout Runs",
    subtitle: "runs",
    resource: api.payoutRuns,
    searchPlaceholder: "Search run or UTR",
    emptyIcon: Wallet,
    emptyTitle: "No payout runs",
    emptyDescription: "A run batches approved commission lines into a single transfer.",
    filters: [
        { name: "status", label: "All Statuses", options: toOptions(["draft", "approved", "processing", "paid", "failed"]) },
    ],
    columns: [
        { key: "runNo", header: "Run", className: "num", sortKey: "runNo" },
        {
            key: "period",
            header: "Period",
            className: "num",
            render: (row) => `${date(row.periodFrom)} – ${date(row.periodTo)}`,
        },
        { key: "commissions", header: "Lines", className: "num", render: (row) => number(row.commissions?.length || 0) },
        { key: "totalGross", header: "Gross", className: "num", render: (row) => currency(row.totalGross) },
        { key: "totalTds", header: "TDS", className: "num", render: (row) => currency(row.totalTds) },
        { key: "totalNet", header: "Net paid", className: "num", render: (row) => <strong>{currency(row.totalNet)}</strong> },
        { key: "utrNumber", header: "UTR", className: "num" },
        {
            key: "status",
            header: "Status",
            render: statusBadge({ paid: "success", approved: "info", processing: "warning", draft: "neutral", failed: "danger" }),
        },
    ],
    formTitle: "payout run",
    formFields: [
        { name: "runNo", label: "Run number", type: "text", required: true },
        { name: "periodFrom", label: "Period from", type: "date", required: true },
        { name: "periodTo", label: "Period to", type: "date", required: true },
        { name: "status", label: "Status", type: "select", options: toOptions(["draft", "approved", "processing", "paid", "failed"]) },
        { name: "utrNumber", label: "UTR number", type: "text" },
    ],
};

/* ---------------------------------------------------------
   TAX
   --------------------------------------------------------- */

export const taxConfig = {
    id: "tax",
    title: "Tax",
    subtitle: "filings",
    resource: api.taxRecords,
    searchPlaceholder: "Search period or challan",
    emptyIcon: Percent,
    emptyTitle: "No tax records",
    filters: [
        { name: "taxType", label: "All Types", options: toOptions(["gst_output", "gst_input", "tds", "stamp_duty", "registration"]) },
        { name: "status", label: "All Statuses", options: toOptions(["pending", "filed", "paid", "overdue"]) },
    ],
    columns: [
        { key: "period", header: "Period", className: "num", sortKey: "period" },
        { key: "taxType", header: "Type", render: (row) => <Badge tone="info">{titleCase(row.taxType)}</Badge> },
        { key: "taxableValue", header: "Taxable value", className: "num", render: (row) => currency(row.taxableValue) },
        { key: "ratePercent", header: "Rate", className: "num", render: (row) => `${row.ratePercent}%` },
        { key: "taxAmount", header: "Tax", className: "num", render: (row) => <strong>{currency(row.taxAmount)}</strong> },
        { key: "dueDate", header: "Due", className: "num", sortKey: "dueDate", render: (row) => date(row.dueDate) },
        { key: "challanNo", header: "Challan", className: "num" },
        {
            key: "status",
            header: "Status",
            render: statusBadge({ paid: "success", filed: "success", pending: "warning", overdue: "danger" }),
        },
    ],
    formTitle: "tax record",
    formFields: [
        { name: "taxType", label: "Tax type", type: "select", required: true, options: toOptions(["gst_output", "gst_input", "tds", "stamp_duty", "registration"]) },
        { name: "period", label: "Period", type: "text", required: true, placeholder: "2026-09" },
        { name: "taxableValue", label: "Taxable value", type: "currency" },
        { name: "ratePercent", label: "Rate percent", type: "number" },
        { name: "taxAmount", label: "Tax amount", type: "currency" },
        { name: "dueDate", label: "Due date", type: "date" },
        { name: "challanNo", label: "Challan number", type: "text" },
        { name: "status", label: "Status", type: "select", options: toOptions(["pending", "filed", "paid", "overdue"]) },
    ],
};

/* ---------------------------------------------------------
   DOCUMENTS
   --------------------------------------------------------- */

export const documentsConfig = {
    id: "documents",
    title: "Documents",
    subtitle: "documents",
    resource: api.documents,
    searchPlaceholder: "Search by name or project",
    emptyIcon: FileText,
    emptyTitle: "No documents uploaded",
    filters: [
        { name: "category", label: "All types", options: toOptions(["agreement", "allotment_letter", "kyc", "brochure", "floor_plan", "rera", "receipt", "noc", "other"]) },
        { name: "status", label: "All Statuses", options: toOptions(["pending", "uploaded", "verified", "rejected", "expired"]) },
        { name: "project", label: "All projects", type: "reference", optionsFrom: "projects" },
    ],
    columns: [
        {
            key: "title",
            header: "Document",
            sortKey: "title",
            render: (row) => (
                <div>
                    <div className="record-name">{row.title}</div>
                    <div className="record-sub">{fileSize(row.fileSize)}</div>
                </div>
            ),
        },
        { key: "category", header: "Category", render: (row) => <Badge tone="neutral">{titleCase(row.category)}</Badge> },
        { key: "project", header: "Project", render: referenceCell("project") },
        { key: "booking", header: "Booking", render: (row) => row.booking?.bookingNo || "—" },
        {
            key: "status",
            header: "Status",
            render: statusBadge({ verified: "success", uploaded: "info", pending: "warning", rejected: "danger", expired: "warning" }),
        },
        { key: "createdAt", header: "Added", className: "num", sortKey: "createdAt", render: (row) => date(row.createdAt) },
        {
            key: "fileUrl",
            header: "File",
            render: (row) =>
                row.fileUrl ? (
                    <a href={row.fileUrl} target="_blank" rel="noreferrer" className="btn-link">
                        Open
                    </a>
                ) : (
                    <span className="muted">—</span>
                ),
        },
    ],
    lookups: { projects: LOOKUPS.projects, bookings: LOOKUPS.bookings, leads: LOOKUPS.leads },
    formTitle: "document",
    formFields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "category", label: "Category", type: "select", options: toOptions(["agreement", "allotment_letter", "kyc", "brochure", "floor_plan", "rera", "receipt", "noc", "other"]) },
        { name: "fileUrl", label: "File URL", type: "text", hint: "Link to the stored file", full: true },
        { name: "project", label: "Project", type: "reference", optionsFrom: "projects" },
        {
            name: "booking",
            label: "Booking",
            type: "reference",
            optionsFrom: "bookings",
            optionLabel: (booking) => `${booking.bookingNo} · ${booking.customerName}`,
        },
        { name: "status", label: "Status", type: "select", options: toOptions(["pending", "uploaded", "verified", "rejected", "expired"]) },
        { name: "expiresAt", label: "Expires on", type: "date" },
    ],
};



/* ---------------------------------------------------------
   NOTIFICATIONS
   The full log behind the bell in the topbar.
   --------------------------------------------------------- */

export const notificationsConfig = {
    id: "notifications",
    title: "Notifications",
    subtitle: "notifications",
    resource: api.notifications,
    searchPlaceholder: "Search title or body",
    emptyIcon: Send,
    emptyTitle: "Nothing to catch up on",
    canCreate: false,
    canEdit: false,
    filters: [
        {
            name: "type",
            label: "All Types",
            options: toOptions([
                "lead_assigned",
                "follow_up_due",
                "site_visit",
                "booking",
                "payment",
                "approval",
                "system",
            ]),
        },
    ],
    columns: [
        {
            key: "title",
            header: "Notification",
            render: (row) => (
                <div>
                    <div className="record-name">
                        {row.title}
                        {row.readAt ? null : <Badge tone="brand">New</Badge>}
                    </div>
                    <div className="record-sub" style={{ fontFamily: "var(--font-sans)" }}>
                        {row.body}
                    </div>
                </div>
            ),
        },
        { key: "type", header: "Type", render: (row) => <Badge tone="neutral">{titleCase(row.type)}</Badge> },
        {
            key: "createdAt",
            header: "Received",
            className: "num",
            sortKey: "createdAt",
            render: (row) => dateTime(row.createdAt),
        },
        {
            key: "readAt",
            header: "State",
            render: (row) => (
                <Badge tone={row.readAt ? "neutral" : "info"}>{row.readAt ? "Read" : "Unread"}</Badge>
            ),
        },
    ],
};

/* ---------------------------------------------------------
   IMPORT HISTORY
   Shown under the Import Leads screen so a partial upload can be
   reviewed after the fact.
   --------------------------------------------------------- */

export const importJobsConfig = {
    id: "importJobs",
    title: "Import history",
    subtitle: "imports",
    resource: api.importJobs,
    searchPlaceholder: "Search file name",
    emptyIcon: CloudUpload,
    emptyTitle: "No imports yet",
    canCreate: false,
    canEdit: false,
    columns: [
        {
            key: "fileName",
            header: "File",
            sortKey: "fileName",
            render: (row) => <span className="record-name">{row.fileName}</span>,
        },
        { key: "totalRows", header: "Rows", className: "num", render: (row) => number(row.totalRows) },
        { key: "importedRows", header: "Imported", className: "num", render: (row) => number(row.importedRows) },
        { key: "duplicateRows", header: "Duplicates", className: "num", render: (row) => number(row.duplicateRows) },
        { key: "failedRows", header: "Failed", className: "num", render: (row) => number(row.failedRows) },
        {
            key: "status",
            header: "Status",
            render: statusBadge({
                completed: "success",
                processing: "info",
                queued: "warning",
                failed: "danger",
            }),
        },
        {
            key: "createdAt",
            header: "Started",
            className: "num",
            sortKey: "createdAt",
            render: (row) => dateTime(row.createdAt),
        },
    ],
};

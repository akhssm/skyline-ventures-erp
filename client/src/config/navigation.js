import {
    Activity,
    BarChart3,
    Box,
    Briefcase,
    Calendar,
    CalendarClock,
    Cloud,
    Compass,
    CreditCard,
    FileText,
    Folder,
    GitMerge,
    Link2,
    MessageCircle,
    MessagesSquare,
    Phone,
    Receipt,
    Settings,
    TrendingUp,
    UserPlus,
    Users,
    Wallet,
} from "lucide-react";

export const ROLES = {
    PROPERTY_OWNER: "property_owner",
    MARKETING_MANAGER: "marketing_manager",
    MARKETING: "marketing",
    CHANNEL_PARTNER: "channel_partner",
    ACCOUNTANT: "accountant",
    RECEPTIONIST: "receptionist",
    SYSTEM_OPERATOR: "system_operator",
};

export const ROLE_LABELS = {
    [ROLES.PROPERTY_OWNER]: "Property Owner",
    [ROLES.MARKETING_MANAGER]: "CRM Manager",
    [ROLES.MARKETING]: "CRM Executive",
    [ROLES.CHANNEL_PARTNER]: "Channel Partner",
    [ROLES.ACCOUNTANT]: "Post-Sales Manager",
    [ROLES.RECEPTIONIST]: "Receptionist",
    [ROLES.SYSTEM_OPERATOR]: "System Operator",
};

const R = ROLES;

// Roles that reach the quotation builder. The Property Owner does not; they
// see priced inventory through Bookings instead.
const QUOTATION_ROLES = [
    R.MARKETING,
    R.MARKETING_MANAGER,
    R.CHANNEL_PARTNER,
    R.ACCOUNTANT,
    R.SYSTEM_OPERATOR,
];

/**
 * The whole menu, declared once in the order the product renders it, with the
 * roles each entry belongs to. Filtering this list by role reproduces each
 * role's sidebar exactly, which is how the reference application does it.
 *
 * `match` lists extra path prefixes that should still light the entry up, for
 * modules whose detail screens live under a different path.
 */
const MENU = [
    {
        id: "dashboard",
        label: "Dashboard",
        icon: Activity,
        path: "/layout/dashboard",
        roles: [R.PROPERTY_OWNER, R.MARKETING_MANAGER, R.MARKETING, R.ACCOUNTANT, R.RECEPTIONIST, R.SYSTEM_OPERATOR, R.CHANNEL_PARTNER],
    },
    {
        id: "inventory",
        label: "Inventory",
        icon: Box,
        path: "/layout/inventory",
        roles: [R.PROPERTY_OWNER, R.MARKETING_MANAGER, R.MARKETING, R.ACCOUNTANT, R.RECEPTIONIST, R.SYSTEM_OPERATOR, R.CHANNEL_PARTNER],
    },
    {
        id: "expenses",
        label: "Expenses",
        icon: CreditCard,
        path: "/layout/expenses",
        match: ["/layout/expenses", "/layout/capex", "/layout/opex"],
        roles: [R.PROPERTY_OWNER, R.ACCOUNTANT],
    },
    {
        id: "channelPartners",
        label: "Channel Partners",
        icon: UserPlus,
        path: "/layout/channel-partners",
        roles: [R.ACCOUNTANT, R.SYSTEM_OPERATOR],
    },
    {
        id: "bookingRequests",
        label: "Booking Requests",
        icon: FileText,
        path: "/layout/booking-requests",
        badge: "bookingRequests",
        roles: [R.ACCOUNTANT, R.SYSTEM_OPERATOR],
    },
    {
        id: "commissionLedger",
        label: "Commission Ledger",
        icon: Wallet,
        path: "/layout/commission-ledger",
        roles: [R.ACCOUNTANT, R.SYSTEM_OPERATOR],
    },
    {
        id: "payoutRuns",
        label: "Payout Runs",
        icon: CreditCard,
        path: "/layout/payout-runs",
        roles: [R.ACCOUNTANT, R.SYSTEM_OPERATOR],
    },
    {
        id: "notifications",
        label: "Notifications",
        icon: MessagesSquare,
        path: "/layout/commission-inbox",
        roles: [R.ACCOUNTANT, R.SYSTEM_OPERATOR, R.CHANNEL_PARTNER],
    },
    {
        id: "tax",
        label: "Tax",
        icon: Receipt,
        path: "/layout/tax-config",
        roles: [R.ACCOUNTANT],
    },
    {
        id: "projects",
        label: "Projects",
        icon: Folder,
        path: "/layout/projects",
        match: ["/layout/projects", "/layout/new-project", "/layout/towers", "/layout/floors", "/layout/flats"],
        roles: [R.PROPERTY_OWNER, R.MARKETING_MANAGER, R.MARKETING, R.ACCOUNTANT, R.SYSTEM_OPERATOR, R.CHANNEL_PARTNER],
    },
    {
        id: "leads",
        label: "Leads",
        icon: Users,
        path: "/layout/customers",
        badge: "leads",
        roles: [R.PROPERTY_OWNER, R.MARKETING_MANAGER, R.MARKETING, R.RECEPTIONIST, R.CHANNEL_PARTNER],
    },
    {
        id: "followUps",
        label: "Follow-ups",
        icon: Calendar,
        path: "/layout/follow-ups",
        badge: "followUps",
        roles: [R.MARKETING, R.MARKETING_MANAGER, R.RECEPTIONIST, R.CHANNEL_PARTNER],
    },
    {
        id: "callLog",
        label: "Call Log",
        icon: Phone,
        path: "/layout/call-log",
        roles: [R.MARKETING, R.MARKETING_MANAGER],
    },
    {
        id: "siteVisits",
        label: "Site Visits",
        icon: Compass,
        path: "/layout/site-visits",
        roles: [R.PROPERTY_OWNER, R.MARKETING, R.MARKETING_MANAGER, R.RECEPTIONIST, R.CHANNEL_PARTNER],
    },
    {
        id: "importLeads",
        label: "Import Leads",
        icon: Cloud,
        path: "/layout/lead-import",
        roles: [R.MARKETING, R.MARKETING_MANAGER, R.SYSTEM_OPERATOR],
    },
    {
        id: "paymentPlan",
        label: "Payment Plan",
        icon: CreditCard,
        path: "/layout/payment-plan",
        roles: [R.PROPERTY_OWNER, R.ACCOUNTANT],
    },
    {
        id: "documents",
        label: "Documents",
        icon: FileText,
        path: "/layout/documents",
        roles: [R.PROPERTY_OWNER, R.MARKETING, R.MARKETING_MANAGER, R.ACCOUNTANT, R.RECEPTIONIST, R.SYSTEM_OPERATOR, R.CHANNEL_PARTNER],
    },
    {
        id: "users",
        label: "Users",
        icon: Briefcase,
        path: "/layout/employees",
        roles: [R.PROPERTY_OWNER, R.SYSTEM_OPERATOR],
    },
    {
        id: "duplicates",
        label: "Duplicates",
        icon: GitMerge,
        path: "/layout/party-duplicates",
        roles: [R.PROPERTY_OWNER, R.ACCOUNTANT, R.SYSTEM_OPERATOR],
    },
    {
        id: "whatsapp",
        label: "WhatsApp",
        icon: MessageCircle,
        path: "/layout/whatsapp-settings",
        roles: [R.PROPERTY_OWNER],
    },
    {
        id: "calling",
        label: "Calling",
        icon: Phone,
        path: "/layout/calling-settings",
        roles: [R.PROPERTY_OWNER, R.SYSTEM_OPERATOR],
    },
    {
        id: "integrations",
        label: "Integrations",
        icon: Link2,
        path: "/layout/integrations",
        roles: [R.PROPERTY_OWNER],
    },
    {
        id: "bookingsDrilldown",
        label: "Bookings",
        icon: TrendingUp,
        path: "/layout/bookings/projects",
        match: ["/layout/bookings"],
        roles: [R.PROPERTY_OWNER],
    },
    {
        id: "bookings",
        label: "Bookings",
        icon: CalendarClock,
        path: "/layout/bookings/pending-bookings",
        match: ["/layout/bookings"],
        roles: [R.ACCOUNTANT],
    },
    {
        id: "quotation",
        label: "Quotation",
        icon: Receipt,
        path: "/layout/quotations",
        roles: QUOTATION_ROLES,
    },
    {
        id: "configuration",
        label: "Configuration",
        icon: Settings,
        path: "/layout/configuration",
        roles: [R.PROPERTY_OWNER, R.MARKETING_MANAGER, R.ACCOUNTANT, R.SYSTEM_OPERATOR],
    },
    {
        id: "reports",
        label: "Reports",
        icon: BarChart3,
        roles: [R.PROPERTY_OWNER, R.MARKETING_MANAGER, R.MARKETING, R.ACCOUNTANT, R.RECEPTIONIST, R.CHANNEL_PARTNER],
        children: [
            { label: "Leads & Site Visits", path: "/layout/lead-reports" },
            { label: "All Reports", path: "/layout/reports" },
        ],
    },
    {
        id: "contact",
        label: "Contact us",
        icon: MessagesSquare,
        path: "/layout/contact-us",
        roles: [R.PROPERTY_OWNER, R.MARKETING, R.MARKETING_MANAGER, R.ACCOUNTANT, R.RECEPTIONIST, R.SYSTEM_OPERATOR, R.CHANNEL_PARTNER],
    },
];

/** The ordered menu entries one role sees. */
export const menuForRole = (role) => MENU.filter((item) => item.roles.includes(role));

/** Where a role lands after signing in. */
export const landingPathForRole = (role) => {
    if (role === ROLES.ACCOUNTANT) return "/layout/bookings/pending-bookings";
    if (role === ROLES.MARKETING_MANAGER || role === ROLES.MARKETING) return "/layout/customers";

    return "/layout/dashboard";
};

/** True when the role may open the module at all. */
export const canAccess = (role, moduleId) => {
    const item = MENU.find((entry) => entry.id === moduleId);
    return Boolean(item?.roles.includes(role));
};

export { MENU };

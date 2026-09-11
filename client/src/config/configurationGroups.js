import {
    AlertCircle,
    Car,
    Compass,
    CreditCard,
    Eye,
    FileText,
    Funnel,
    GitBranch,
    Home,
    Layers,
    Link2,
    Receipt,
    Tags,
    Wallet,
} from "lucide-react";

import { ROLES } from "./navigation";

/* The reference application ships a Super Admin who sits above every
   organisation. This workspace has no such account, so the constant exists
   only to keep the role lists identical; nothing here ever matches it. */
export const SUPER_ADMIN = "super_admin";

const R = ROLES;

/* The three roles that own most of the vocabulary. Named once because the
   reference groups reuse the same trio for nearly every list. */
const OWNERS = [SUPER_ADMIN, R.PROPERTY_OWNER, R.SYSTEM_OPERATOR];

/**
 * Every configuration screen, grouped the way the reference application
 * groups them. Each entry carries the roles allowed to open it, so a role
 * that owns nothing in a group never sees the group at all.
 */
export const CONFIG_GROUPS = [
    {
        title: "Unit attributes",
        blurb: "The vocabulary the inventory forms offer when a unit is created.",
        entries: [
            {
                label: "BHK Config",
                path: "bhk-config",
                icon: Home,
                blurb: "Unit configurations — 2BHK, 3BHK and the rest.",
                roles: OWNERS,
            },
            {
                label: "Facing Config",
                path: "facing-config",
                icon: Compass,
                blurb: "Which way a unit faces.",
                roles: OWNERS,
            },
            {
                label: "View Type Config",
                path: "view-config",
                icon: Eye,
                blurb: "What a unit looks out on. The Add Flat form reads this list.",
                roles: [R.SYSTEM_OPERATOR, R.PROPERTY_OWNER],
            },
        ],
    },
    {
        title: "Payments",
        blurb: "How money is described when it is taken and when it is spent.",
        entries: [
            {
                label: "Payment Heads",
                path: "payment-head-config",
                icon: Tags,
                blurb: "What a payment can be against.",
                roles: OWNERS,
            },
            {
                label: "Payment Modes",
                path: "payment-mode-config",
                icon: CreditCard,
                blurb: "How a payment can arrive.",
                roles: OWNERS,
            },
            {
                label: "Expenditure Category",
                path: "expenditure-config",
                icon: Wallet,
                blurb: "The categories Capex and Opex are filed under.",
                roles: [R.SYSTEM_OPERATOR],
            },
        ],
    },
    {
        title: "Leads",
        blurb: "The pipeline, and who picks a lead up.",
        entries: [
            {
                label: "Lead Config",
                path: "leads-config",
                icon: Funnel,
                blurb: "Stages, sources and categories for the leads console.",
                roles: [R.SYSTEM_OPERATOR, R.PROPERTY_OWNER, SUPER_ADMIN],
            },
            {
                label: "Assignment Rules",
                path: "assignment-rules",
                icon: GitBranch,
                blurb: "The round-robin that hands a lead or a booking to a person.",
                roles: [
                    R.SYSTEM_OPERATOR,
                    R.PROPERTY_OWNER,
                    SUPER_ADMIN,
                    R.MARKETING_MANAGER,
                    R.ACCOUNTANT,
                ],
            },
            {
                label: "Escalation Queue",
                path: "escalation-queue",
                icon: AlertCircle,
                blurb: "What happens when nobody responds in time.",
                roles: [R.MARKETING_MANAGER, R.ACCOUNTANT],
            },
        ],
    },
    {
        title: "Projects",
        blurb: "How construction progress is described.",
        entries: [
            {
                label: "Project Stages",
                path: "project-stage-config",
                icon: Layers,
                blurb: "The construction milestones a project moves through.",
                roles: [R.SYSTEM_OPERATOR, R.PROPERTY_OWNER],
            },
        ],
    },
    {
        title: "Site visits",
        blurb: "What a site visit is arranged with.",
        entries: [
            {
                label: "Cabs & Drivers",
                path: "vendor-config",
                icon: Car,
                blurb: "The vehicles and drivers a site visit can be booked against.",
                roles: [
                    SUPER_ADMIN,
                    R.PROPERTY_OWNER,
                    R.SYSTEM_OPERATOR,
                    R.ACCOUNTANT,
                    R.MARKETING,
                ],
            },
        ],
    },
    {
        title: "Commission & tax",
        blurb: "Channel-partner commission plans and the statutory rates they read.",
        entries: [
            {
                label: "Commission Plans",
                path: "commission-plans",
                icon: Wallet,
                blurb: "Per project and tier: the fee, and when each slice becomes payable.",
                roles: [SUPER_ADMIN, R.SYSTEM_OPERATOR, R.ACCOUNTANT],
            },
            {
                label: "Tax",
                path: "tax-config",
                icon: Receipt,
                blurb: "GST, TDS, RERA and stamp duty — the rates commission and invoices apply.",
                roles: [SUPER_ADMIN, R.SYSTEM_OPERATOR],
            },
            {
                label: "Payout Settings",
                path: "payout-settings",
                icon: CreditCard,
                blurb: "The calendar, bank file, numbering and clawback for commission payouts.",
                roles: [SUPER_ADMIN, R.SYSTEM_OPERATOR, R.ACCOUNTANT],
            },
        ],
    },
    {
        title: "Documents",
        blurb: "What every letter, agreement and certificate says about the company.",
        entries: [
            {
                label: "Document Settings",
                path: "document-settings",
                icon: FileText,
                blurb: "Letterhead, legal identity, the collection account and the numbering prefix.",
                roles: [SUPER_ADMIN, R.PROPERTY_OWNER, R.SYSTEM_OPERATOR, R.ACCOUNTANT],
            },
        ],
    },
    {
        title: "Platform",
        blurb: "The product itself, rather than the data in it.",
        entries: [
            {
                label: "Subscriptions",
                path: "admin-subscriptions",
                icon: CreditCard,
                blurb: "Plans and billing across organisations.",
                roles: [SUPER_ADMIN],
            },
            {
                label: "Integrations",
                path: "integrations",
                icon: Link2,
                blurb: "Meta lead ads, webhooks and the WhatsApp connection.",
                roles: [R.SYSTEM_OPERATOR],
            },
        ],
    },
];

/** The groups one role may open, with empty groups dropped. */
export const configGroupsForRole = (role) =>
    CONFIG_GROUPS.map((group) => ({
        ...group,
        entries: group.entries.filter((entry) => entry.roles.includes(role)),
    })).filter((group) => group.entries.length > 0);

/** True when the role may open one configuration screen. */
export const canOpenConfigPage = (role, path) =>
    CONFIG_GROUPS.some((group) =>
        group.entries.some((entry) => entry.path === path && entry.roles.includes(role))
    );

// Canonical role identifiers. These are the ONLY spellings stored in MongoDB
// and the only spellings the client is allowed to compare against.
const ROLES = {
    PROPERTY_OWNER: "property_owner",
    MARKETING_MANAGER: "marketing_manager",
    MARKETING: "marketing",
    CHANNEL_PARTNER: "channel_partner",
    ACCOUNTANT: "accountant",
    RECEPTIONIST: "receptionist",
    SYSTEM_OPERATOR: "system_operator",
};

const ROLE_VALUES = Object.values(ROLES);

// Labels shown in the top-right profile chip.
const ROLE_LABELS = {
    [ROLES.PROPERTY_OWNER]: "Property Owner",
    [ROLES.MARKETING_MANAGER]: "CRM Manager",
    [ROLES.MARKETING]: "CRM Executive",
    [ROLES.CHANNEL_PARTNER]: "Channel Partner",
    [ROLES.ACCOUNTANT]: "Post-Sales Manager",
    [ROLES.RECEPTIONIST]: "Receptionist",
    [ROLES.SYSTEM_OPERATOR]: "System Operator",
};

// Roles that may see every record in the organization rather than only
// the records assigned to them.
const ORG_WIDE_ROLES = [
    ROLES.PROPERTY_OWNER,
    ROLES.MARKETING_MANAGER,
    ROLES.ACCOUNTANT,
    ROLES.SYSTEM_OPERATOR,
];

module.exports = { ROLES, ROLE_VALUES, ROLE_LABELS, ORG_WIDE_ROLES };

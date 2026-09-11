const express = require("express");

const { protect, restrict } = require("../middleware/auth");
const crudRouter = require("../utils/crudRouter");
const { ROLES } = require("../config/roles");

const authRoutes = require("./authRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const leadRoutes = require("./leadRoutes");
const bookingRoutes = require("./bookingRoutes");
const inventoryRoutes = require("./inventoryRoutes");
const notificationRoutes = require("./notificationRoutes");
const reportRoutes = require("./reportRoutes");
const configurationRoutes = require("./configurationRoutes");

const router = express.Router();

router.use("/auth", authRoutes);

// Everything past this line requires a valid token.
router.use(protect);

router.use("/dashboard", dashboardRoutes);
router.use("/leads", leadRoutes);
router.use("/bookings", bookingRoutes);
router.use("/units", inventoryRoutes);
router.use("/notifications", notificationRoutes);
router.use("/reports", reportRoutes);
router.use("/configuration", configurationRoutes);

// ---------------------------------------------------------------
// Resources that need nothing beyond standard CRUD are declared as
// data rather than as a file each.
// ---------------------------------------------------------------
const resources = [
    {
        path: "/projects",
        model: require("../models/Project"),
        searchFields: ["name", "code", "city"],
        filterFields: ["status", "city", "isActive"],
        defaultSort: "name",
    },
    {
        path: "/users",
        model: require("../models/User"),
        searchFields: ["name", "phone", "email"],
        filterFields: ["role", "isActive", "reportsTo"],
        populate: [{ path: "reportsTo", select: "name role" }],
        defaultSort: "name",
        guard: [ROLES.PROPERTY_OWNER, ROLES.SYSTEM_OPERATOR, ROLES.MARKETING_MANAGER],
    },
    {
        path: "/follow-ups",
        model: require("../models/FollowUp"),
        filterFields: ["status", "channel", "assignedTo", "lead"],
        populate: [
            { path: "lead", select: "name phone stage score project" },
            { path: "assignedTo", select: "name" },
        ],
        defaultSort: "dueAt",
        ownerField: "assignedTo",
    },
    {
        path: "/call-logs",
        model: require("../models/CallLog"),
        searchFields: ["phone", "notes"],
        filterFields: ["status", "direction", "agent", "lead"],
        populate: [
            { path: "lead", select: "name phone" },
            { path: "agent", select: "name" },
        ],
        defaultSort: "-startedAt",
        ownerField: "agent",
    },
    {
        path: "/site-visits",
        model: require("../models/SiteVisit"),
        filterFields: ["status", "project", "agent", "lead"],
        populate: [
            { path: "lead", select: "name phone" },
            { path: "project", select: "name" },
            { path: "unit", select: "flatNo tower" },
            { path: "agent", select: "name" },
        ],
        defaultSort: "-scheduledAt",
        ownerField: "agent",
    },
    {
        path: "/quotations",
        model: require("../models/Quotation"),
        searchFields: ["quoteNo"],
        filterFields: ["status", "project", "lead"],
        populate: [
            { path: "lead", select: "name phone" },
            { path: "project", select: "name" },
            { path: "unit", select: "flatNo tower" },
        ],
        defaultSort: "-createdAt",
    },
    {
        path: "/booking-requests",
        model: require("../models/BookingRequest"),
        filterFields: ["status", "requestedBy", "project"],
        populate: [
            { path: "lead", select: "name phone" },
            { path: "unit", select: "flatNo tower" },
            { path: "project", select: "name" },
            { path: "requestedBy", select: "name" },
        ],
        defaultSort: "-createdAt",
    },
    {
        path: "/payment-plans",
        model: require("../models/PaymentPlan"),
        searchFields: ["name"],
        filterFields: ["planType", "project", "isActive"],
        populate: [{ path: "project", select: "name" }],
        defaultSort: "name",
    },
    {
        path: "/payments",
        model: require("../models/Payment"),
        searchFields: ["receiptNo", "referenceNo"],
        filterFields: ["status", "mode", "booking"],
        populate: [{ path: "booking", select: "bookingNo customerName" }],
        defaultSort: "-paidAt",
    },
    {
        path: "/expenses",
        model: require("../models/Expense"),
        searchFields: ["title", "vendor", "invoiceNo"],
        filterFields: ["category", "status", "project", "mode"],
        populate: [{ path: "project", select: "name" }],
        defaultSort: "-paidAt",
    },
    {
        path: "/vendors",
        model: require("../models/Vendor"),
        searchFields: ["name", "contactPerson", "phone", "vehicleNumber"],
        filterFields: ["isActive"],
        defaultSort: "name",
        guard: [ROLES.PROPERTY_OWNER, ROLES.SYSTEM_OPERATOR, ROLES.ACCOUNTANT, ROLES.MARKETING],
    },
    {
        path: "/channel-partners",
        model: require("../models/ChannelPartner"),
        searchFields: ["name", "firmName", "phone"],
        filterFields: ["status", "isActive"],
        defaultSort: "name",
    },
    {
        path: "/commissions",
        model: require("../models/Commission"),
        filterFields: ["status", "booking", "channelPartner", "agent", "payoutRun"],
        populate: [
            { path: "booking", select: "bookingNo customerName totalAmount" },
            { path: "channelPartner", select: "name firmName" },
            { path: "agent", select: "name" },
        ],
        defaultSort: "-earnedAt",
    },
    {
        path: "/payout-runs",
        model: require("../models/PayoutRun"),
        searchFields: ["runNo", "utrNumber"],
        filterFields: ["status"],
        defaultSort: "-createdAt",
        guard: [ROLES.ACCOUNTANT, ROLES.PROPERTY_OWNER],
    },
    {
        path: "/tax-records",
        model: require("../models/TaxRecord"),
        searchFields: ["period", "challanNo"],
        filterFields: ["taxType", "status", "period"],
        defaultSort: "-dueDate",
        guard: [ROLES.ACCOUNTANT, ROLES.PROPERTY_OWNER],
    },
    {
        path: "/documents",
        model: require("../models/Document"),
        searchFields: ["title"],
        filterFields: ["category", "status", "lead", "booking", "project", "isActive"],
        populate: [
            { path: "lead", select: "name" },
            { path: "booking", select: "bookingNo" },
            { path: "project", select: "name" },
        ],
        defaultSort: "-createdAt",
    },
    {
        path: "/whatsapp",
        model: require("../models/WhatsAppMessage"),
        searchFields: ["phone", "body"],
        filterFields: ["status", "direction", "lead"],
        populate: [{ path: "lead", select: "name phone" }],
        defaultSort: "-sentAt",
    },
    {
        path: "/integrations",
        model: require("../models/Integration"),
        filterFields: ["provider", "status", "isActive"],
        defaultSort: "displayName",
        guard: [ROLES.PROPERTY_OWNER, ROLES.SYSTEM_OPERATOR],
    },
    {
        path: "/import-jobs",
        model: require("../models/ImportJob"),
        searchFields: ["fileName"],
        filterFields: ["status"],
        defaultSort: "-createdAt",
    },
    {
        path: "/contact-messages",
        model: require("../models/ContactMessage"),
        searchFields: ["subject", "message"],
        filterFields: ["status", "category", "priority"],
        populate: [{ path: "raisedBy", select: "name role" }],
        defaultSort: "-createdAt",
    },
];

resources.forEach(({ path, model, guard, ...options }) => {
    const middleware = guard ? [restrict(...guard)] : [];
    router.use(path, ...middleware, crudRouter(model, options));
});

module.exports = router;

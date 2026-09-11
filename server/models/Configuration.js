const { tenantSchema } = require("./_base");

// Editable dropdown values and thresholds, one document per organization.
const configurationSchema = tenantSchema({
    leadSources: [{ type: String, trim: true }],
    leadStages: [{ type: String, trim: true }],
    lostReasons: [{ type: String, trim: true }],
    unitTypes: [{ type: String, trim: true }],
    // Which way a unit faces, and what it looks out on. The bulk
    // builder and the Add Unit form both read these lists.
    facings: [{ type: String, trim: true }],
    viewTypes: [{ type: String, trim: true }],
    expenseCategories: [{ type: String, trim: true }],
    // How a lead is grouped once it is qualified, alongside its stage.
    leadCategories: [{ type: String, trim: true }],
    // What a payment can be against, and how it may arrive. Both feed the
    // payment form; the built-in modes are added by the client, so only the
    // organisation's own additions are stored here.
    paymentHeads: [{ type: String, trim: true }],
    paymentModes: [{ type: String, trim: true }],
    // Construction milestones, offered when a project is created.
    projectStages: [{ type: String, trim: true }],
    // Hours after which a lead with no contact is flagged overdue.
    followUpOverdueHours: { type: Number, default: 24 },
    // Hours a unit may sit on hold before it returns to available.
    unitHoldHours: { type: Number, default: 48 },
    defaultGstPercent: { type: Number, default: 5 },
    defaultCommissionPercent: { type: Number, default: 2 },
    defaultTdsPercent: { type: Number, default: 5 },
    autoAssignLeads: { type: Boolean, default: false },
    duplicateWindowDays: { type: Number, default: 90 },

    // ---- Documents ------------------------------------------------
    // What every letter, agreement and certificate says about the company.
    // A field left empty is not an error: the document prints an em-dash
    // where the value would have gone and stays issuable.
    documentSettings: {
        // The block at the top of every document.
        tradingName: { type: String, default: "", trim: true },
        tagline: { type: String, default: "", trim: true },
        address: { type: String, default: "", trim: true },
        city: { type: String, default: "", trim: true },
        state: { type: String, default: "", trim: true },
        pincode: { type: String, default: "", trim: true },
        phone: { type: String, default: "", trim: true },
        email: { type: String, default: "", trim: true, lowercase: true },
        website: { type: String, default: "", trim: true },
        supportHours: { type: String, default: "", trim: true },
        brandColour: { type: String, default: "", trim: true },

        // What the company is called on a registrable instrument.
        legalName: { type: String, default: "", trim: true },
        cin: { type: String, default: "", trim: true, uppercase: true },
        gstin: { type: String, default: "", trim: true, uppercase: true },
        reraRegistration: { type: String, default: "", trim: true },
        signatoryName: { type: String, default: "", trim: true },
        signatoryDesignation: { type: String, default: "", trim: true },

        // Where a buyer is told to pay, and a lender told to disburse.
        accountName: { type: String, default: "", trim: true },
        accountNumber: { type: String, default: "", trim: true },
        ifsc: { type: String, default: "", trim: true, uppercase: true },
        bank: { type: String, default: "", trim: true },
        branch: { type: String, default: "", trim: true },

        // Periods and rates the documents state as terms.
        paymentDueDays: { type: Number, default: 15 },
        curePeriodDays: { type: Number, default: 15 },
        agreementExecutionDays: { type: Number, default: 30 },
        allotmentAcceptanceDays: { type: Number, default: 7 },
        nocValidityDays: { type: Number, default: 90 },
        quotationValidityDays: { type: Number, default: 15 },
        // Null rather than zero: a zero on a contract is a term saying
        // interest cannot be charged at all, which is not the same as no
        // rate having been set.
        delayInterestPercent: { type: Number, default: null },

        // The prefix on every document reference, SKY/AFS/2026-27/0001.
        organisationPrefix: { type: String, default: "", trim: true, uppercase: true },
    },

    // ---- WhatsApp -------------------------------------------------
    // With sending off, nothing leaves the organisation whatever the
    // templates say.
    whatsappEnabled: { type: Boolean, default: false },
    wabaNamespace: { type: String, default: "", trim: true },
    wabaPhoneNumber: { type: String, default: "", trim: true },
    // One entry per message purpose. Versions let the next draft go for
    // approval while the live one keeps sending.
    whatsappTemplates: [
        {
            purpose: { type: String, required: true, trim: true },
            providerName: { type: String, default: "", trim: true },
            version: { type: Number, default: 1 },
            status: {
                type: String,
                enum: ["draft", "in_review", "approved", "live", "rejected"],
                default: "draft",
            },
        },
    ],

    // ---- Telephony ------------------------------------------------
    callingEnabled: { type: Boolean, default: false },
    callingProvider: {
        type: String,
        enum: ["exotel", "twilio", "knowlarity", "none"],
        default: "none",
    },
    callerId: { type: String, default: "", trim: true },
    recordCalls: { type: Boolean, default: true },
    maskNumbers: { type: Boolean, default: false },
    // Calls shorter than this are logged but not counted as connected.
    minConnectedSeconds: { type: Number, default: 15 },
});

// tenantSchema already indexes organization; the unique constraint replaces
// that single-field index rather than sitting alongside it.
configurationSchema.path("organization").index(false);
configurationSchema.index({ organization: 1 }, { unique: true });

module.exports = require("mongoose").model("Configuration", configurationSchema);

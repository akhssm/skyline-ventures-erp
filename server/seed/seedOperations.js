const Lead = require("../models/Lead");
const FollowUp = require("../models/FollowUp");
const CallLog = require("../models/CallLog");
const SiteVisit = require("../models/SiteVisit");
const Quotation = require("../models/Quotation");
const Booking = require("../models/Booking");
const BookingRequest = require("../models/BookingRequest");
const Payment = require("../models/Payment");
const Expense = require("../models/Expense");
const Commission = require("../models/Commission");
const PayoutRun = require("../models/PayoutRun");
const TaxRecord = require("../models/TaxRecord");
const DocumentModel = require("../models/Document");
const Notification = require("../models/Notification");
const WhatsAppMessage = require("../models/WhatsAppMessage");
const Integration = require("../models/Integration");
const Vendor = require("../models/Vendor");
const Configuration = require("../models/Configuration");
const ContactMessage = require("../models/ContactMessage");

const { FIRST_NAMES, LAST_NAMES, SOURCES, EXPENSE_CATEGORIES } = require("./data");
const { pick, between, chance, daysAgo, daysAhead, randomPhone, log } = require("./helpers");

const LEAD_COUNT = Number(process.env.SEED_LEADS || 2421);

const STAGES = [
    "new", "contacted", "prospect", "site_scheduled", "site_visited",
    "site_rescheduled", "negotiation", "booked", "lost", "not_qualified",
];

// Roughly how the demo book is distributed across the funnel.
const STAGE_WEIGHTS = [
    ["new", 26], ["contacted", 18], ["prospect", 12], ["site_scheduled", 9],
    ["site_visited", 8], ["site_rescheduled", 4], ["negotiation", 6],
    ["booked", 7], ["lost", 9], ["not_qualified", 1],
];

const weightedStage = () => {
    const roll = Math.random() * 100;
    let cursor = 0;

    for (const [stage, weight] of STAGE_WEIGHTS) {
        cursor += weight;
        if (roll < cursor) return stage;
    }

    return "new";
};

// A lead's score follows its stage, so the coloured pills in the table line up
// with where the lead actually sits in the funnel.
const scoreForStage = (stage) => {
    if (stage === "booked") return 100;
    if (stage === "negotiation") return between(70, 92);
    if (stage === "site_visited") return between(55, 78);
    if (stage === "site_scheduled" || stage === "site_rescheduled") return between(30, 60);
    if (stage === "prospect") return between(20, 45);
    if (stage === "not_qualified" || stage === "lost") return between(5, 15);
    return between(8, 30);
};

const seedOperations = async (context) => {
    const { org, owner, users, agents, managers, accountants, projects, units, plans, partners } =
        context;

    const byName = Object.fromEntries(users.map((u) => [u.name, u]));
    const salesPeople = [...agents, ...managers];

    // ---------------------------------------------------------------
    // Leads
    // ---------------------------------------------------------------
    const leadRows = [];
    const usedPhones = new Set();

    for (let i = 0; i < LEAD_COUNT; i += 1) {
        const stage = weightedStage();
        const project = pick(projects);
        const createdAt = daysAgo(between(0, 240));

        let phone = randomPhone();

        // A deliberate slice of repeats so the Duplicates screen has content.
        if (chance(3) && leadRows.length) {
            phone = leadRows[between(0, leadRows.length - 1)].phone;
        } else {
            while (usedPhones.has(phone)) phone = randomPhone();
        }

        usedPhones.add(phone);

        const budgetMin = between(35, 90) * 100000;

        leadRows.push({
            organization: org,
            createdBy: owner._id,
            name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
            phone,
            email: chance(45) ? `lead${i}@example.com` : "",
            project: project._id,
            stage,
            source: pick(SOURCES),
            leadType: chance(80) ? pick(["buyer", "investor"]) : undefined,
            category: chance(35)
                ? pick(["hot", "warm", "cold", "negotiation", "closure"])
                : undefined,
            budgetMin,
            budgetMax: budgetMin + between(10, 60) * 100000,
            requirement: pick(["2BHK", "3BHK", "3BHK Premium", "4BHK"]),
            score: scoreForStage(stage),
            assignedTo: chance(94) ? pick(salesPeople)._id : null,
            lastContactedAt: chance(70) ? daysAgo(between(0, 40)) : null,
            // Over half sit in the past, which is what fills the overdue counter.
            nextFollowUpAt: chance(58) ? daysAgo(between(1, 30)) : daysAhead(between(1, 14)),
            responseStatus: chance(60)
                ? pick(["answered", "no_answer", "busy", "switched_off"])
                : undefined,
            isQualified: stage !== "not_qualified",
            createdAt,
            updatedAt: createdAt,
        });
    }

    const leads = await Lead.insertMany(leadRows, { ordered: false });

    log(`${leads.length} leads`);

    // ---------------------------------------------------------------
    // Follow-ups, calls and site visits
    // ---------------------------------------------------------------
    const openLeads = leads.filter(
        (l) => !["booked", "lost", "not_qualified"].includes(l.stage)
    );

    await FollowUp.insertMany(
        openLeads.slice(0, 900).map((lead) => {
            const due = lead.nextFollowUpAt || daysAhead(between(1, 10));

            return {
                organization: org,
                createdBy: owner._id,
                lead: lead._id,
                assignedTo: lead.assignedTo,
                dueAt: due,
                channel: pick(["call", "whatsapp", "email", "meeting", "site_visit"]),
                status: due < new Date() ? pick(["pending", "missed"]) : "pending",
                remarks: pick([
                    "Customer asked for a revised quote",
                    "Wants a weekend site visit",
                    "Comparing with a competing project",
                    "Waiting on home loan sanction",
                    "Requested floor plan on WhatsApp",
                ]),
            };
        })
    );

    await CallLog.insertMany(
        leads.slice(0, 1200).map((lead) => {
            const status = pick(["answered", "missed", "busy", "no_answer", "rejected"]);

            return {
                organization: org,
                createdBy: owner._id,
                lead: lead._id,
                agent: lead.assignedTo,
                phone: lead.phone,
                direction: chance(75) ? "outbound" : "inbound",
                status,
                duration: status === "answered" ? between(25, 480) : 0,
                startedAt: daysAgo(between(0, 60)),
                notes: status === "answered" ? "Discussed pricing and availability" : "",
            };
        })
    );

    const visitLeads = leads.filter((l) =>
        ["site_scheduled", "site_visited", "site_rescheduled", "negotiation", "booked"].includes(
            l.stage
        )
    );

    await SiteVisit.insertMany(
        visitLeads.map((lead) => {
            const completed = ["site_visited", "negotiation", "booked"].includes(lead.stage);
            const scheduledAt = completed ? daysAgo(between(1, 60)) : daysAhead(between(0, 14));

            return {
                organization: org,
                createdBy: owner._id,
                lead: lead._id,
                project: lead.project,
                agent: lead.assignedTo,
                scheduledAt,
                status: completed
                    ? "completed"
                    : lead.stage === "site_rescheduled"
                      ? "rescheduled"
                      : pick(["scheduled", "pending"]),
                visitedAt: completed ? scheduledAt : null,
                rating: completed ? between(3, 5) : 0,
                feedback: completed ? pick(["Liked the layout", "Concerned about the price", "Wants a higher floor"]) : "",
                pickupRequired: chance(25),
            };
        })
    );

    log(`follow-ups, call logs and site visits`);

    // ---------------------------------------------------------------
    // Quotations
    // ---------------------------------------------------------------
    const quoteLeads = leads
        .filter((l) => ["negotiation", "site_visited", "booked"].includes(l.stage))
        .slice(0, 320);

    await Quotation.insertMany(
        quoteLeads.map((lead, index) => {
            const unit = pick(units);
            const base = unit.basePrice;

            return {
                organization: org,
                createdBy: owner._id,
                quoteNo: `QT-${String(index + 1).padStart(5, "0")}`,
                lead: lead._id,
                project: lead.project,
                unit: unit._id,
                lineItems: [
                    { label: "Base price", amount: base, taxable: true },
                    { label: "Floor rise", amount: Math.round(base * 0.02), taxable: true },
                    { label: "Covered car parking", amount: 350000, taxable: true },
                    { label: "Corpus fund", amount: 120000, taxable: false },
                    { label: "Legal and documentation", amount: 45000, taxable: false },
                ],
                discount: chance(40) ? between(50, 250) * 1000 : 0,
                gstPercent: 5,
                validUntil: daysAhead(between(7, 30)),
                status: lead.stage === "booked" ? "accepted" : pick(["draft", "sent", "sent", "rejected"]),
                sentAt: daysAgo(between(1, 45)),
            };
        })
    );

    log(`${quoteLeads.length} quotations`);

    // ---------------------------------------------------------------
    // Bookings
    // ---------------------------------------------------------------
    // Sold and booked units each get a booking so inventory and bookings agree.
    const soldUnits = units.filter((u) => u.status === "sold");
    const bookedUnits = units.filter((u) => u.status === "booked");
    const bookedLeads = leads.filter((l) => l.stage === "booked");

    const projectById = Object.fromEntries(projects.map((p) => [String(p._id), p]));

    let bookingSeq = 0;

    const buildBooking = (unit, status, overrides = {}) => {
        bookingSeq += 1;

        const lead = bookedLeads[bookingSeq % bookedLeads.length];
        const bookingDate = daysAgo(between(0, 210));
        const soldBy = pick(salesPeople);

        return {
            organization: org,
            createdBy: owner._id,
            bookingNo: `BK-${String(bookingSeq).padStart(5, "0")}`,
            lead: lead?._id,
            customerName: lead?.name || `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
            customerPhone: lead?.phone || randomPhone(),
            customerEmail: "",
            project: unit.project,
            unit: unit._id,
            paymentPlan: pick(plans)._id,
            soldBy: soldBy._id,
            // Post-sales assigns these later, which is why many start null.
            assignedTo: chance(70) ? pick(accountants)._id : null,
            channelPartner: chance(30) ? pick(partners)._id : null,
            totalAmount: unit.totalPrice,
            discount: chance(35) ? between(50, 300) * 1000 : 0,
            bookingDate,
            status,
            saleType: "sale",
            createdAt: bookingDate,
            updatedAt: bookingDate,
            ...overrides,
        };
    };

    const bookingRows = [
        ...soldUnits.map((unit) => buildBooking(unit, chance(70) ? "confirmed" : "completed")),
        ...bookedUnits.map((unit) => buildBooking(unit, "pending")),
    ];

    // The two rows the Pending Bookings screen opens on, pinned to real units
    // so the flat numbers and projects resolve.
    const grandCourt = projects.find((p) => p.name === "Grand Court");
    const palmSprings = projects.find((p) => p.name === "Palm Springs");

    const featuredUnitA = units.find(
        (u) => String(u.project) === String(grandCourt._id) && u.tower === "Tower A" && u.flatNo === "0103"
    );
    const featuredUnitB = units.find(
        (u) => String(u.project) === String(palmSprings._id) && u.tower === "Tower A" && u.flatNo === "0501"
    );

    const featured = [];

    if (featuredUnitA) {
        featured.push({
            ...buildBooking(featuredUnitA, "pending"),
            bookingNo: "BK-DEMO-01",
            customerName: "Harini Rao",
            customerPhone: "8000000020",
            totalAmount: 6339375,
            discount: 0,
            assignedTo: null,
            soldBy: byName["Srinivas Naidu"]._id,
            bookingDate: daysAgo(1),
            updatedAt: daysAgo(1),
        });
    }

    if (featuredUnitB) {
        featured.push({
            ...buildBooking(featuredUnitB, "pending"),
            bookingNo: "BK-DEMO-02",
            customerName: "Kishore",
            customerPhone: "8881020888",
            totalAmount: 11517083,
            discount: 0,
            assignedTo: null,
            soldBy: byName["Aadhya Shetty"]._id,
            bookingDate: daysAgo(5),
            updatedAt: daysAgo(5),
        });
    }

    // The featured units are excluded from the generated rows so one unit is
    // never booked twice.
    const featuredUnitIds = new Set(featured.map((b) => String(b.unit)));

    const bookings = await Booking.insertMany(
        [...bookingRows.filter((b) => !featuredUnitIds.has(String(b.unit))), ...featured],
        { ordered: false }
    );

    log(`${bookings.length} bookings`);

    // ---------------------------------------------------------------
    // Payment schedules and receipts
    // ---------------------------------------------------------------
    const planById = Object.fromEntries(plans.map((p) => [String(p._id), p]));
    const paymentRows = [];

    bookings.forEach((booking, bookingIndex) => {
        if (booking.status === "cancelled") return;

        const plan = planById[String(booking.paymentPlan)] || plans[0];
        const net = booking.totalAmount - booking.discount;

        // Confirmed and completed bookings have collected more of their plan.
        const paidThrough =
            booking.status === "completed"
                ? plan.milestones.length
                : booking.status === "confirmed"
                  ? between(2, plan.milestones.length - 1)
                  : 1;

        plan.milestones.forEach((milestone, index) => {
            const isPaid = index < paidThrough;
            const dueDate = new Date(
                booking.bookingDate.getTime() + milestone.dueAfterDays * 24 * 60 * 60 * 1000
            );

            paymentRows.push({
                organization: org,
                createdBy: owner._id,
                receiptNo: `${booking.bookingNo}-M${index + 1}`,
                booking: booking._id,
                milestoneLabel: milestone.label,
                amount: Math.round((net * milestone.percentage) / 100),
                dueDate,
                paidAt: isPaid ? new Date(Math.min(dueDate.getTime(), Date.now())) : null,
                mode: pick(["neft", "rtgs", "upi", "cheque", "loan"]),
                referenceNo: isPaid ? `TXN${between(100000, 999999)}` : "",
                status: isPaid ? "paid" : "due",
            });
        });
    });

    // Inserted in chunks because a single insertMany of this size can exceed
    // the 16MB command limit.
    for (let i = 0; i < paymentRows.length; i += 2000) {
        await Payment.insertMany(paymentRows.slice(i, i + 2000), { ordered: false });
    }

    // receivedAmount on each booking has to agree with its paid receipts.
    const paidByBooking = await Payment.aggregate([
        { $match: { organization: org, status: "paid" } },
        { $group: { _id: "$booking", received: { $sum: "$amount" } } },
    ]);

    await Booking.bulkWrite(
        paidByBooking.map((row) => ({
            updateOne: {
                filter: { _id: row._id },
                update: { receivedAmount: row.received },
            },
        }))
    );

    log(`${paymentRows.length} payment rows`);

    // ---------------------------------------------------------------
    // Booking requests awaiting approval
    // ---------------------------------------------------------------
    const reservedUnits = units.filter((u) => u.status === "reserved").slice(0, 40);

    await BookingRequest.insertMany(
        reservedUnits.map((unit, index) => {
            const lead = bookedLeads[index % bookedLeads.length];

            return {
                organization: org,
                createdBy: owner._id,
                lead: lead._id,
                unit: unit._id,
                project: unit.project,
                requestedBy: pick(salesPeople)._id,
                requestedAmount: unit.totalPrice,
                tokenAmount: between(100, 500) * 1000,
                status: index < 24 ? "pending" : pick(["approved", "rejected"]),
                remarks: pick(["Customer paid token by UPI", "Awaiting KYC documents", "Discount approval needed"]),
            };
        })
    );

    // ---------------------------------------------------------------
    // Commissions and payout runs
    // ---------------------------------------------------------------
    const partnerBookings = bookings.filter((b) => b.channelPartner).slice(0, 400);
    const partnerByPartnerId = Object.fromEntries(partners.map((p) => [String(p._id), p]));

    const commissions = await Commission.insertMany(
        partnerBookings.map((booking) => ({
            organization: org,
            createdBy: owner._id,
            booking: booking._id,
            channelPartner: booking.channelPartner,
            agent: booking.soldBy,
            bookingValue: booking.totalAmount,
            percentage: partnerByPartnerId[String(booking.channelPartner)]?.commissionPercent || 2,
            tdsPercent: 5,
            status: pick(["accrued", "accrued", "approved", "paid", "on_hold"]),
            earnedAt: booking.bookingDate,
        }))
    );

    const paidCommissions = commissions.filter((c) => c.status === "paid");

    if (paidCommissions.length) {
        const run = await PayoutRun.create({
            organization: org,
            createdBy: owner._id,
            runNo: `PR-${new Date().getFullYear()}-01`,
            periodFrom: daysAgo(30),
            periodTo: new Date(),
            commissions: paidCommissions.map((c) => c._id),
            totalGross: paidCommissions.reduce((sum, c) => sum + c.grossAmount, 0),
            totalTds: paidCommissions.reduce((sum, c) => sum + c.tdsAmount, 0),
            totalNet: paidCommissions.reduce((sum, c) => sum + c.netAmount, 0),
            status: "paid",
            approvedBy: accountants[0]._id,
            paidAt: daysAgo(3),
            utrNumber: `UTR${between(100000000, 999999999)}`,
        });

        await Commission.updateMany(
            { _id: { $in: paidCommissions.map((c) => c._id) } },
            { payoutRun: run._id }
        );
    }

    log(`${commissions.length} commission lines`);

    // ---------------------------------------------------------------
    // Expenses and tax
    // ---------------------------------------------------------------
    await Expense.insertMany(
        Array.from({ length: 260 }, (_, index) => {
            const amount = between(15, 900) * 1000;

            return {
                organization: org,
                createdBy: owner._id,
                title: pick([
                    "Hoarding campaign",
                    "Digital ads",
                    "Site office rent",
                    "Contractor payment",
                    "Legal retainer",
                    "Sales team incentive",
                    "Electricity bill",
                    "Brochure printing",
                ]),
                project: pick(projects)._id,
                category: pick(EXPENSE_CATEGORIES),
                vendor: pick(["Vega Media", "BuildRight Constructions", "Anand Legal", "PrintHub", "Metro Power"]),
                amount,
                gstAmount: Math.round(amount * 0.18),
                paidAt: daysAgo(between(0, 180)),
                mode: pick(["neft", "rtgs", "upi", "cheque"]),
                invoiceNo: `INV-${between(10000, 99999)}`,
                status: pick(["submitted", "approved", "approved", "paid", "rejected"]),
                approvedBy: index % 3 === 0 ? accountants[0]._id : undefined,
            };
        })
    );

    const periods = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];

    await TaxRecord.insertMany(
        periods.flatMap((period) =>
            ["gst_output", "gst_input", "tds"].map((taxType) => {
                const taxableValue = between(50, 400) * 100000;
                const ratePercent = taxType === "tds" ? 5 : 5;

                return {
                    organization: org,
                    createdBy: owner._id,
                    taxType,
                    period,
                    taxableValue,
                    ratePercent,
                    taxAmount: Math.round((taxableValue * ratePercent) / 100),
                    dueDate: new Date(`${period}-20T00:00:00Z`),
                    status: period < "2026-09" ? "filed" : "pending",
                    challanNo: period < "2026-09" ? `CH${between(100000, 999999)}` : "",
                    filedAt: period < "2026-09" ? new Date(`${period}-18T00:00:00Z`) : null,
                };
            })
        )
    );

    log("expenses and tax records");

    // ---------------------------------------------------------------
    // Documents, notifications, WhatsApp
    // ---------------------------------------------------------------
    await DocumentModel.insertMany(
        bookings.slice(0, 300).flatMap((booking) =>
            ["agreement", "allotment_letter", "kyc", "receipt"].map((category) => ({
                organization: org,
                createdBy: owner._id,
                title: `${category.replace(/_/g, " ")} - ${booking.customerName}`,
                category,
                booking: booking._id,
                project: booking.project,
                fileUrl: `https://files.example.com/${booking.bookingNo}-${category}.pdf`,
                fileType: "application/pdf",
                fileSize: between(80000, 2400000),
                status: pick(["uploaded", "verified", "verified", "pending"]),
            }))
        )
    );

    await Notification.insertMany(
        users.flatMap((user) =>
            Array.from({ length: between(4, 14) }, () => ({
                organization: org,
                recipient: user._id,
                title: pick([
                    "New lead assigned to you",
                    "Follow-up due today",
                    "Site visit confirmed",
                    "Booking awaiting approval",
                    "Payment received",
                    "Commission approved",
                ]),
                body: "Open the record to see the full details.",
                type: pick(["lead_assigned", "follow_up_due", "site_visit", "booking", "payment", "approval"]),
                link: pick(["/layout/leads", "/layout/site-visits", "/layout/bookings/pending-bookings"]),
                readAt: chance(30) ? daysAgo(between(1, 10)) : null,
                createdAt: daysAgo(between(0, 20)),
            }))
        )
    );

    await WhatsAppMessage.insertMany(
        leads.slice(0, 600).map((lead) => ({
            organization: org,
            createdBy: owner._id,
            lead: lead._id,
            phone: lead.phone,
            templateName: pick(["welcome_v2", "site_visit_reminder", "price_list", "festive_offer"]),
            body: "Hi, thanks for your interest in Skyline Ventures. Here are the details you asked for.",
            direction: chance(80) ? "outbound" : "inbound",
            status: pick(["sent", "delivered", "delivered", "read", "failed"]),
            sentBy: lead.assignedTo,
            sentAt: daysAgo(between(0, 45)),
        }))
    );

    // ---------------------------------------------------------------
    // Integrations, configuration, support tickets
    // ---------------------------------------------------------------
    await Integration.insertMany([
        { provider: "whatsapp_cloud", displayName: "WhatsApp Cloud API", status: "connected", isActive: true, lastSyncAt: daysAgo(0) },
        { provider: "exotel", displayName: "Exotel Cloud Telephony", status: "connected", isActive: true, lastSyncAt: daysAgo(0) },
        { provider: "facebook_leads", displayName: "Facebook Lead Ads", status: "connected", isActive: true, lastSyncAt: daysAgo(1) },
        { provider: "google_ads", displayName: "Google Ads", status: "connected", isActive: true, lastSyncAt: daysAgo(1) },
        { provider: "magicbricks", displayName: "MagicBricks", status: "not_connected", isActive: false },
        { provider: "99acres", displayName: "99acres", status: "not_connected", isActive: false },
        { provider: "housing", displayName: "Housing.com", status: "error", isActive: false, lastError: "API key rejected" },
        { provider: "razorpay", displayName: "Razorpay Payments", status: "connected", isActive: true, lastSyncAt: daysAgo(0) },
        { provider: "tally", displayName: "Tally Prime", status: "not_connected", isActive: false },
    ].map((row) => ({ ...row, organization: org, createdBy: owner._id })));

    // The cabs a site visit can be booked against.
    await Vendor.insertMany(
        [
            { name: "City Cabs", contactPerson: "Ramesh", phone: "9700100001", vehicleNumber: "TS09AB1234" },
            { name: "Skyline Fleet", contactPerson: "Imran", phone: "9700100002", vehicleNumber: "TS08CD5678" },
            { name: "Prime Travels", contactPerson: "Lakshmi", phone: "9700100003", vehicleNumber: "AP28EF9012" },
            { name: "Sai Drivers", contactPerson: "Naveen", phone: "9700100004", vehicleNumber: "TS07GH3456" },
        ].map((row) => ({ ...row, organization: org, createdBy: owner._id }))
    );

    await Configuration.create({
        organization: org,
        createdBy: owner._id,
        leadSources: SOURCES,
        leadStages: STAGES,
        lostReasons: ["Budget mismatch", "Bought elsewhere", "Location not suitable", "Loan rejected", "Not reachable"],
        unitTypes: ["2BHK", "2.5BHK", "3BHK", "3BHK Premium", "4BHK"],
        // The facings the unit seed draws from, so the dropdown and the data
        // it validates agree.
        facings: ["East", "West", "North", "South", "North-East"],
        viewTypes: ["Park", "Pool", "City", "Road", "Courtyard"],
        expenseCategories: EXPENSE_CATEGORIES,
        leadCategories: ["Investor", "End user", "NRI", "Channel referral"],
        paymentHeads: ["Booking amount", "Agreement value", "Legal", "Club house", "Documentation"],
        // Cash, Cheque and Bank Transfer ship with the product, so only the
        // organisation's own additions are seeded here.
        paymentModes: ["UPI", "NEFT", "Credit card"],
        projectStages: [
            "Pre-launch",
            "Launched",
            "Under construction",
            "Finishing",
            "Ready to move",
            "Completed",
        ],
        followUpOverdueHours: 24,
        unitHoldHours: 48,
        defaultGstPercent: 5,
        defaultCommissionPercent: 2,
        defaultTdsPercent: 5,
        duplicateWindowDays: 90,
        documentSettings: {
            tradingName: "Skyline Ventures",
            tagline: "Homes that hold their value",
            address: "Plot 44, Financial District, Nanakramguda",
            city: "Hyderabad",
            state: "Telangana",
            pincode: "500032",
            phone: "04040404040",
            email: "sales@skylineventures.in",
            website: "www.skylineventures.in",
            supportHours: "Mon–Sat, 10am–6pm",
            brandColour: "#1f3d68",
            legalName: "Skyline Ventures Private Limited",
            cin: "U70109TG2016PTC112233",
            gstin: "36AABCS1429B1ZP",
            reraRegistration: "P02400004321",
            signatoryName: "Venkat Prasad",
            signatoryDesignation: "Managing Director",
            accountName: "Skyline Ventures Private Limited",
            accountNumber: "50200078451236",
            ifsc: "HDFC0001234",
            bank: "HDFC Bank",
            branch: "Gachibowli",
            paymentDueDays: 15,
            curePeriodDays: 15,
            agreementExecutionDays: 30,
            allotmentAcceptanceDays: 7,
            nocValidityDays: 90,
            quotationValidityDays: 15,
            // No interest term is set, so the agreements stay silent on it
            // rather than printing a contractual zero.
            delayInterestPercent: null,
            organisationPrefix: "SKY",
        },
    });

    await ContactMessage.insertMany(
        Array.from({ length: 12 }, () => ({
            organization: org,
            raisedBy: pick(users)._id,
            subject: pick([
                "Cannot export the leads report",
                "WhatsApp template not sending",
                "Need an extra user licence",
                "Payment receipt shows wrong GST",
                "Request training for new agents",
            ]),
            message: "Please look into this at your earliest convenience.",
            category: pick(["bug", "feature", "billing", "training"]),
            priority: pick(["low", "medium", "high", "urgent"]),
            status: pick(["open", "in_progress", "resolved", "closed"]),
        }))
    );

    log("documents, notifications, integrations and configuration");
};

module.exports = seedOperations;

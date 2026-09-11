const Organization = require("../models/Organization");
const User = require("../models/User");
const Project = require("../models/Project");
const Unit = require("../models/Unit");
const PaymentPlan = require("../models/PaymentPlan");
const ChannelPartner = require("../models/ChannelPartner");

const { USERS, PROJECTS, UNIT_TYPES } = require("./data");
const { pick, between, daysAhead, log } = require("./helpers");

const MODELS_TO_CLEAR = [
    "User", "Project", "Unit", "Lead", "FollowUp", "CallLog", "SiteVisit",
    "Quotation", "Booking", "BookingRequest", "PaymentPlan", "Payment",
    "Expense", "ChannelPartner", "Commission", "PayoutRun", "TaxRecord",
    "Document", "Notification", "WhatsAppMessage", "Integration",
    "Configuration", "ContactMessage",
];

/**
 * Creates the organization, staff, projects, inventory, payment plans and
 * channel partners, then hands the created documents to the next stage.
 */
const seedCore = async () => {
    const mongoose = require("mongoose");

    const organization = await Organization.findOneAndUpdate(
        { name: "Skyline Ventures" },
        {
            name: "Skyline Ventures",
            city: "Hyderabad",
            gstin: "36AABCS1429B1ZQ",
            address: "Level 8, Cyber Towers, HITEC City, Hyderabad 500081",
        },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );

    const org = organization._id;

    // Only this organization's rows are removed, so any other tenant sharing
    // the database is left alone.
    await Promise.all(
        MODELS_TO_CLEAR.map((name) =>
            mongoose.model(name).deleteMany({ organization: org })
        )
    );

    log("cleared previous demo data");

    // ---------------------------------------------------------------
    // Staff
    // ---------------------------------------------------------------
    const users = await User.insertMany(
        USERS.map(([role, name, phone, avatarColor]) => ({
            organization: org,
            name,
            phone,
            email: `${name.toLowerCase().replace(/\s+/g, ".")}@skylineventures.in`,
            role,
            avatarColor,
        }))
    );

    const byName = Object.fromEntries(users.map((u) => [u.name, u]));
    const owner = byName["Venkat Prasad"];
    const managers = users.filter((u) => u.role === "marketing_manager");
    const agents = users.filter((u) => u.role === "marketing");
    const accountants = users.filter((u) => u.role === "accountant");

    // Give every agent a manager so team filters have something to group by.
    await Promise.all(
        agents.map((agent, index) =>
            User.updateOne(
                { _id: agent._id },
                { reportsTo: managers[index % managers.length]._id }
            )
        )
    );

    log(`${users.length} users`);

    // ---------------------------------------------------------------
    // Projects and inventory
    // ---------------------------------------------------------------
    const projects = await Project.insertMany(
        PROJECTS.map((p) => ({
            organization: org,
            createdBy: owner._id,
            name: p.name,
            code: p.code,
            city: p.city,
            address: `${p.name} Township, ${p.city}`,
            reraNumber: `P0${between(1000, 9999)}/${p.code}`,
            towers: p.towers.map((name) => ({
                name,
                floors: p.floors,
                unitsPerFloor: p.unitsPerFloor,
            })),
            status: "under_construction",
            possessionDate: daysAhead(between(180, 900)),
        }))
    );

    const unitRows = [];

    projects.forEach((project, projectIndex) => {
        const spec = PROJECTS[projectIndex];

        project.towers.forEach((tower) => {
            for (let floor = 1; floor <= spec.floors; floor += 1) {
                for (let n = 1; n <= spec.unitsPerFloor; n += 1) {
                    const type = pick(UNIT_TYPES);
                    const rate = spec.rate + between(-200, 400);
                    const basePrice = Math.round(type.builtUp * rate);

                    // About two thirds of stock ends up booked or sold, which
                    // is what produces the 67 percent booking rate KPI.
                    const roll = Math.random() * 100;
                    const status =
                        roll < 46
                            ? "sold"
                            : roll < 67
                              ? "booked"
                              : roll < 73
                                ? "reserved"
                                : roll < 79
                                  ? "hold"
                                  : "available";

                    unitRows.push({
                        organization: org,
                        createdBy: owner._id,
                        project: project._id,
                        tower: tower.name,
                        flatNo: `${String(floor).padStart(2, "0")}${String(n).padStart(2, "0")}`,
                        floor,
                        unitType: type.label,
                        carpetArea: type.carpet,
                        builtUpArea: type.builtUp,
                        facing: pick(["East", "West", "North", "South", "North-East"]),
                        ratePerSqft: rate,
                        basePrice,
                        totalPrice: Math.round(basePrice * 1.18),
                        status,
                    });
                }
            }
        });
    });

    const units = await Unit.insertMany(unitRows);

    log(`${projects.length} projects, ${units.length} units`);

    // ---------------------------------------------------------------
    // Payment plans
    // ---------------------------------------------------------------
    const plans = await PaymentPlan.insertMany([
        {
            organization: org,
            createdBy: owner._id,
            name: "Construction Linked Plan",
            planType: "construction_linked",
            milestones: [
                { label: "On booking", percentage: 10, dueAfterDays: 0 },
                { label: "On agreement", percentage: 20, dueAfterDays: 30 },
                { label: "On plinth", percentage: 15, dueAfterDays: 120 },
                { label: "On 5th slab", percentage: 15, dueAfterDays: 240 },
                { label: "On 10th slab", percentage: 15, dueAfterDays: 380 },
                { label: "On brickwork", percentage: 15, dueAfterDays: 520 },
                { label: "On possession", percentage: 10, dueAfterDays: 700 },
            ],
        },
        {
            organization: org,
            createdBy: owner._id,
            name: "Down Payment Plan",
            planType: "down_payment",
            milestones: [
                { label: "On booking", percentage: 20, dueAfterDays: 0 },
                { label: "Within 30 days", percentage: 70, dueAfterDays: 30 },
                { label: "On possession", percentage: 10, dueAfterDays: 700 },
            ],
        },
        {
            organization: org,
            createdBy: owner._id,
            name: "Time Linked Plan",
            planType: "time_linked",
            milestones: [
                { label: "On booking", percentage: 15, dueAfterDays: 0 },
                { label: "Quarter 1", percentage: 25, dueAfterDays: 90 },
                { label: "Quarter 2", percentage: 25, dueAfterDays: 180 },
                { label: "Quarter 3", percentage: 25, dueAfterDays: 270 },
                { label: "On possession", percentage: 10, dueAfterDays: 640 },
            ],
        },
    ]);

    log(`${plans.length} payment plans`);

    // ---------------------------------------------------------------
    // Channel partners
    // ---------------------------------------------------------------
    const partners = await ChannelPartner.insertMany(
        users
            .filter((u) => u.role === "channel_partner")
            .map((partner, index) => ({
                organization: org,
                createdBy: owner._id,
                name: partner.name,
                firmName: `${partner.name.split(" ")[0]} Realty LLP`,
                phone: partner.phone,
                email: partner.email,
                reraNumber: `A0${between(1000, 9999)}/CP`,
                panNumber: `ABCDE${between(1000, 9999)}F`,
                commissionPercent: [2, 2.5, 3][index % 3],
                bankName: pick(["HDFC Bank", "ICICI Bank", "Axis Bank"]),
                accountNumber: `${between(10000000, 99999999)}${between(1000, 9999)}`,
                ifsc: pick(["HDFC0001234", "ICIC0004567", "UTIB0008901"]),
                status: "active",
            }))
    );

    log(`${partners.length} channel partners`);

    return { org, owner, users, agents, managers, accountants, projects, units, plans, partners };
};

module.exports = seedCore;

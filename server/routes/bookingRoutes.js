const express = require("express");

const Booking = require("../models/Booking");
const crudFactory = require("../utils/crudFactory");
const {
    stats,
    assign,
    changeStatus,
    receivePayment,
    raiseCommission,
} = require("../controllers/bookingController");
const { extraFilter, enrich } = require("../controllers/bookingQuery");

const router = express.Router();

const handlers = crudFactory(Booking, {
    searchFields: ["customerName", "customerPhone", "bookingNo"],
    filterFields: ["status", "project", "unit", "assignedTo", "soldBy", "saleType", "channelPartner"],
    populate: [
        { path: "project", select: "name" },
        { path: "unit", select: "flatNo tower unitType" },
        { path: "soldBy", select: "name" },
        { path: "assignedTo", select: "name" },
        { path: "channelPartner", select: "name firmName" },
    ],
    defaultSort: "-updatedAt",
    // The Assigned chip and the four payment chips, neither of which maps
    // onto a plain field on the booking.
    extraFilter,
    // Attaches each row's scheduled, collected, outstanding and overdue.
    enrich,
});

router.get("/stats", stats);
router.patch("/:id/assign", assign);
router.patch("/:id/status", changeStatus);
router.post("/:id/receipt", receivePayment);
router.post("/:id/commission", raiseCommission);

router.route("/").get(handlers.list).post(handlers.create);
router.post("/bulk-delete", handlers.bulkRemove);
router
    .route("/:id")
    .get(handlers.getOne)
    .patch(handlers.update)
    .put(handlers.update)
    .delete(handlers.remove);

module.exports = router;

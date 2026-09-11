const express = require("express");

const Notification = require("../models/Notification");
const crudFactory = require("../utils/crudFactory");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const handlers = crudFactory(Notification, {
    searchFields: ["title", "body"],
    filterFields: ["type"],
    defaultSort: "-createdAt",
    // Nobody reads anybody else's bell.
    ownerField: "recipient",
});

// The bell badge caps its label at "9+", but the true count is returned here.
const unreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({
        organization: req.organizationId,
        recipient: req.user._id,
        readAt: null,
    });

    res.json({ success: true, data: { count } });
});

const markRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { organization: req.organizationId, recipient: req.user._id, readAt: null },
        { readAt: new Date() }
    );

    res.json({ success: true, message: "All notifications marked read" });
});

router.get("/unread-count", unreadCount);
router.post("/mark-all-read", markRead);

router.route("/").get(handlers.list).post(handlers.create);
router
    .route("/:id")
    .get(handlers.getOne)
    .patch(handlers.update)
    .delete(handlers.remove);

module.exports = router;

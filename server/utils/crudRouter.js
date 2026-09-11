const express = require("express");
const crudFactory = require("./crudFactory");

/**
 * Mounts the five REST routes for a model onto a fresh router.
 * Pass `extend` to add resource-specific routes before the /:id matcher
 * swallows them.
 */
const crudRouter = (Model, options = {}) => {
    const router = express.Router();
    const handlers = crudFactory(Model, options);

    if (typeof options.extend === "function") {
        options.extend(router, handlers);
    }

    router.route("/").get(handlers.list).post(handlers.create);
    router.post("/bulk-delete", handlers.bulkRemove);
    router
        .route("/:id")
        .get(handlers.getOne)
        .patch(handlers.update)
        .put(handlers.update)
        .delete(handlers.remove);

    return router;
};

module.exports = crudRouter;

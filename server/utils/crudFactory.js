const asyncHandler = require("./asyncHandler");
const ApiError = require("./ApiError");
const { ORG_WIDE_ROLES } = require("../config/roles");

// Neutralises regex metacharacters in a user-supplied search term.
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

// Values arriving as query strings need coercing before they hit Mongoose.
const coerce = (value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null") return null;
    return value;
};

// Turns ?stage=new,contacted into a $in and ?minAmount=5 into a $gte.
const buildFilter = (query, allowedFilters) => {
    const filter = {};

    for (const field of allowedFilters) {
        const raw = query[field];
        if (raw === undefined || raw === "") continue;

        filter[field] = String(raw).includes(",")
            ? { $in: String(raw).split(",").map(coerce) }
            : coerce(raw);
    }

    if (query.from || query.to) {
        const dateField = query.dateField || "createdAt";
        filter[dateField] = {};
        if (query.from) filter[dateField].$gte = new Date(query.from);
        if (query.to) filter[dateField].$lte = new Date(query.to);
    }

    return filter;
};

/**
 * Builds the five standard handlers for one model.
 *
 * @param {import("mongoose").Model} Model
 * @param {object} options
 * @param {string[]} options.searchFields   fields matched by ?search=
 * @param {string[]} options.filterFields   fields accepted as exact filters
 * @param {(string|object)[]} options.populate
 * @param {string} options.defaultSort
 * @param {string} options.ownerField  field holding the assigned user, used to
 *   narrow results for roles that may only see their own records
 * @param {(query: object, req: object) => object} options.extraFilter
 *   returns additional Mongo conditions for query params that do not map to a
 *   plain field, such as ?overdue=true
 * @param {(items: object[], req: object) => Promise<object[]>} options.enrich
 *   decorates one page of results with fields that would be too costly to
 *   compute for the whole collection
 */
const crudFactory = (Model, options = {}) => {
    const {
        searchFields = [],
        filterFields = [],
        populate = [],
        defaultSort = "-createdAt",
        ownerField = null,
        extraFilter = null,
        enrich = null,
    } = options;

    // Every query starts pinned to the caller's organization, and is narrowed
    // further when the caller is not allowed to see the whole org.
    const scope = (req) => {
        const base = { organization: req.organizationId };

        if (ownerField && !ORG_WIDE_ROLES.includes(req.user.role)) {
            base[ownerField] = req.user._id;
        }

        return base;
    };

    const applyPopulate = (queryChain) => {
        populate.forEach((p) => queryChain.populate(p));
        return queryChain;
    };

    const list = asyncHandler(async (req, res) => {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit, 10) || 25, 200);

        const filter = {
            ...scope(req),
            ...buildFilter(req.query, filterFields),
            ...(extraFilter ? await extraFilter(req.query, req) : {}),
        };

        if (req.query.search && searchFields.length) {
            // The term is escaped so a stray bracket cannot break the query.
            const term = new RegExp(escapeRegex(String(req.query.search)), "i");
            filter.$or = searchFields.map((field) => ({ [field]: term }));
        }

        const [items, total] = await Promise.all([
            applyPopulate(
                Model.find(filter)
                    .sort(req.query.sort || defaultSort)
                    .skip((page - 1) * limit)
                    .limit(limit)
            ).lean(),
            Model.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: enrich ? await enrich(items, req) : items,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit) || 1,
            },
        });
    });

    const getOne = asyncHandler(async (req, res) => {
        const item = await applyPopulate(
            Model.findOne({ _id: req.params.id, ...scope(req) })
        ).lean();

        if (!item) throw ApiError.notFound(`${Model.modelName} not found`);

        res.json({ success: true, data: item });
    });

    const create = asyncHandler(async (req, res) => {
        // organization and createdBy come from the token, never from the body.
        const item = await Model.create({
            ...req.body,
            organization: req.organizationId,
            createdBy: req.user._id,
        });

        res.status(201).json({ success: true, data: item });
    });

    const update = asyncHandler(async (req, res) => {
        const payload = { ...req.body, updatedBy: req.user._id };
        delete payload.organization;
        delete payload.createdBy;

        const item = await Model.findOneAndUpdate(
            { _id: req.params.id, ...scope(req) },
            payload,
            { returnDocument: "after", runValidators: true }
        );

        if (!item) throw ApiError.notFound(`${Model.modelName} not found`);

        res.json({ success: true, data: item });
    });

    const remove = asyncHandler(async (req, res) => {
        const query = { _id: req.params.id, ...scope(req) };

        // Models carrying isActive are retired, not destroyed.
        const softDeletable = Boolean(Model.schema.path("isActive"));

        const item = softDeletable
            ? await Model.findOneAndUpdate(
                  query,
                  { isActive: false, updatedBy: req.user._id },
                  { returnDocument: "after" }
              )
            : await Model.findOneAndDelete(query);

        if (!item) throw ApiError.notFound(`${Model.modelName} not found`);

        res.json({ success: true, message: `${Model.modelName} deleted` });
    });

    const bulkRemove = asyncHandler(async (req, res) => {
        const ids = Array.isArray(req.body.ids) ? req.body.ids : [];

        if (!ids.length) throw ApiError.badRequest("No ids supplied");

        const result = await Model.deleteMany({ _id: { $in: ids }, ...scope(req) });

        res.json({ success: true, message: `${result.deletedCount} deleted` });
    });

    return { list, getOne, create, update, remove, bulkRemove, scope };
};

module.exports = crudFactory;

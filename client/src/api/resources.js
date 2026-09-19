import api from "./client";

/**
 * Builds the five standard calls for one REST resource. Every module screen
 * talks to the API through one of these, so no page hand-writes a URL.
 */
const resource = (path) => ({
    path,
    list: (params) => api.get(path, { params }),
    get: (id) => api.get(`${path}/${id}`),
    create: (payload) => api.post(path, payload),
    update: (id, payload) => api.patch(`${path}/${id}`, payload),
    remove: (id) => api.delete(`${path}/${id}`),
    bulkRemove: (ids) => api.post(`${path}/bulk-delete`, { ids }),
});

export const auth = {
    sendOtp: (phone) => api.post("/auth/send-otp", { phone }),
    verifyOtp: (phone, otp) => api.post("/auth/verify-otp", { phone, otp }),
    me: () => api.get("/auth/me"),
};

export const dashboard = {
    executive: (params) => api.get("/dashboard/executive", { params }),
    manager: (params) => api.get("/dashboard/manager", { params }),
    rep: (params) => api.get("/dashboard/rep", { params }),
    collections: (params) => api.get("/dashboard/collections", { params }),
};

export const leads = {
    ...resource("/leads"),
    stats: (params) => api.get("/leads/stats", { params }),
    duplicates: () => api.get("/leads/duplicates"),
    merge: (id, duplicateIds) => api.post(`/leads/${id}/merge`, { duplicateIds }),
    bulkAssign: (ids, assignedTo) => api.post("/leads/bulk-assign", { ids, assignedTo }),
    import: (fileName, rows) => api.post("/leads/import", { fileName, rows }),
};

export const bookings = {
    ...resource("/bookings"),
    stats: (params) => api.get("/bookings/stats", { params }),
    assign: (id, assignedTo) => api.patch(`/bookings/${id}/assign`, { assignedTo }),
    changeStatus: (id, payload) => api.patch(`/bookings/${id}/status`, payload),
    // Receipts and commission lines are written against the booking so the
    // collected total and the ledger stay in step with it.
    receipt: (id, payload) => api.post(`/bookings/${id}/receipt`, payload),
    raiseCommission: (id, payload) => api.post(`/bookings/${id}/commission`, payload),
};

export const units = {
    ...resource("/units"),
    grid: (params) => api.get("/units/grid", { params }),
    // Counts behind the status chips, the statline and every filter list.
    facets: () => api.get("/units/facets"),
    bulkCreate: (payload) => api.post("/units/bulk", payload),
};

export const notifications = {
    ...resource("/notifications"),
    unreadCount: () => api.get("/notifications/unread-count"),
    markAllRead: () => api.post("/notifications/mark-all-read"),
};

export const reports = {
    leadsAndSiteVisits: (params) => api.get("/reports/leads-site-visits", { params }),
    summary: (params) => api.get("/reports/summary", { params }),
};

export const configuration = {
    get: () => api.get("/configuration"),
    update: (payload) => api.patch("/configuration", payload),
};

export const projects = resource("/projects");
export const users = resource("/users");
export const followUps = resource("/follow-ups");
export const callLogs = resource("/call-logs");
export const siteVisits = resource("/site-visits");
export const quotations = resource("/quotations");
export const bookingRequests = resource("/booking-requests");
export const paymentPlans = resource("/payment-plans");
export const payments = resource("/payments");
export const expenses = resource("/expenses");
export const vendors = resource("/vendors");
export const channelPartners = resource("/channel-partners");
export const commissions = resource("/commissions");
export const payoutRuns = resource("/payout-runs");
export const taxRecords = resource("/tax-records");
export const documents = resource("/documents");
export const whatsapp = resource("/whatsapp");
export const integrations = resource("/integrations");
export const importJobs = resource("/import-jobs");
export const contactMessages = resource("/contact-messages");

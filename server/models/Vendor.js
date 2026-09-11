const { tenantSchema } = require("./_base");

// A cab operator or driver who takes leads to site. The name, vehicle and
// phone go into the message the lead receives when a visit is scheduled.
const vendorSchema = tenantSchema({
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: "", trim: true },
    // Optional, but validated when given: the message to the lead is useless
    // with a number that cannot be dialled.
    phone: { type: String, default: "", trim: true },
    vehicleNumber: { type: String, default: "", trim: true, uppercase: true },
    isActive: { type: Boolean, default: true },
});

// One vendor name per organisation, so the site-visit dropdown never offers
// the same operator twice.
vendorSchema.index({ organization: 1, name: 1 }, { unique: true });

module.exports = require("mongoose").model("Vendor", vendorSchema);

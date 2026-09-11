// Requiring this module registers every schema with Mongoose.
//
// Without it, a populate() against a model that no route file happened to
// require throws "Schema hasn't been registered for model". Importing it once
// at server start makes every ref resolvable regardless of request path.

module.exports = {
    Organization: require("./Organization"),
    User: require("./User"),
    OtpToken: require("./OtpToken"),
    Project: require("./Project"),
    Unit: require("./Unit"),
    Lead: require("./Lead"),
    FollowUp: require("./FollowUp"),
    CallLog: require("./CallLog"),
    SiteVisit: require("./SiteVisit"),
    Quotation: require("./Quotation"),
    Booking: require("./Booking"),
    BookingRequest: require("./BookingRequest"),
    PaymentPlan: require("./PaymentPlan"),
    Payment: require("./Payment"),
    Expense: require("./Expense"),
    ChannelPartner: require("./ChannelPartner"),
    Commission: require("./Commission"),
    PayoutRun: require("./PayoutRun"),
    TaxRecord: require("./TaxRecord"),
    Document: require("./Document"),
    Notification: require("./Notification"),
    WhatsAppMessage: require("./WhatsAppMessage"),
    Integration: require("./Integration"),
    ImportJob: require("./ImportJob"),
    Vendor: require("./Vendor"),
    Configuration: require("./Configuration"),
    ContactMessage: require("./ContactMessage"),
};

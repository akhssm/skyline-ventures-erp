import ListConfigPage from "../../components/config/ListConfigPage";

/* What a payment can be against. The list starts empty: the built-in heads
   are part of the payment form, and anything added here sits alongside
   them. */
const PaymentHeadConfig = () => (
    <ListConfigPage
        field="paymentHeads"
        title="Payment Heads"
        breadcrumb="Payment Heads"
        tagline="what a payment can be against"
        noun="payment head"
        nounPlural="payment heads"
        columnHeader="Name"
        addLabel="Add payment head"
        dialogDescription="A charge line this organisation uses, beyond the built-in ones."
        placeholder="e.g. Legal"
        emptyTitle="No payment heads yet"
        emptyDescription="Nothing is missing — this list starts empty. Add a head for a charge the built-in set does not already cover, such as Legal, Club House or Documentation."
        deleteWarning="disappears from the payment head dropdown. Payments already recorded against it are unaffected."
    />
);

export default PaymentHeadConfig;

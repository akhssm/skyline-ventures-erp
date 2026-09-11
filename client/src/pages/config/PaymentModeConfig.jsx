import ListConfigPage from "../../components/config/ListConfigPage";

/* How a payment can arrive. Cash, Cheque and Bank Transfer ship with the
   product, so they are listed but not stored per organisation and cannot be
   edited. */
const BUILT_IN = ["Cash", "Cheque", "Bank Transfer"];

const PaymentModeConfig = () => (
    <ListConfigPage
        field="paymentModes"
        title="Payment Modes"
        breadcrumb="Payment Modes"
        tagline="how a payment can arrive"
        noun="payment mode"
        nounPlural="payment modes"
        columnHeader="Name"
        addLabel="Add payment mode"
        dialogDescription="How this organisation takes money — UPI, DD, anything else."
        placeholder="e.g. UPI"
        emptyTitle="No payment modes"
        emptyDescription="Add a mode for how this organisation takes money."
        deleteWarning="disappears from the payment mode dropdown. Payments already recorded against it are unaffected."
        intro="Cash, Cheque and Bank Transfer ship with the product and are shared by every builder, so they cannot be renamed or removed. Anything you add here is yours alone."
        builtIn={BUILT_IN}
    />
);

export default PaymentModeConfig;

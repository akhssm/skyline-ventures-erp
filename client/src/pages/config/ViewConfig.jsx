import ListConfigPage from "../../components/config/ListConfigPage";

/* What a unit looks out on. The Add Flat form reads this list. */
const ViewConfig = () => (
    <ListConfigPage
        field="viewTypes"
        title="View Types"
        breadcrumb="View Type Config"
        tagline="read by the Add Flat form"
        noun="view type"
        nounPlural="view types"
        columnHeader="View Name"
        addLabel="Add view type"
        dialogDescription="What a unit looks out on, offered when a flat is added."
        placeholder="e.g. Garden view"
        emptyTitle="No view types yet"
        emptyDescription="Add a view type to get started."
        deleteWarning="disappears from the view dropdown. Units already using it keep the name they were saved with."
    />
);

export default ViewConfig;

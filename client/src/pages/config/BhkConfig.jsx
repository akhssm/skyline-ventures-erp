import ListConfigPage from "../../components/config/ListConfigPage";

/* The unit configurations the inventory forms offer. One list for the whole
   organisation: every project draws its unit types from it. */
const BhkConfig = () => (
    <ListConfigPage
        field="unitTypes"
        title="BHK Types"
        breadcrumb="BHK Config"
        tagline="offered when a unit is created"
        noun="BHK type"
        nounPlural="BHK types"
        columnHeader="BHK Name"
        addLabel="Add BHK type"
        dialogDescription="The list buyers pick from when a unit is created."
        placeholder="e.g. 3 BHK"
        emptyTitle="No BHK types yet"
        emptyDescription="Add a BHK type to get started."
        deleteWarning="disappears from the BHK dropdown. Units already using it keep the name they were saved with."
        intro="BHK names are shared by every project in this organisation."
    />
);

export default BhkConfig;

import ListConfigPage from "../../components/config/ListConfigPage";

/* Which way a unit faces. The unit form and the bulk builder both read this
   list, so a name removed here stops being offered everywhere at once. */
const FacingConfig = () => (
    <ListConfigPage
        field="facings"
        title="Facings"
        breadcrumb="Facing Config"
        tagline="offered by the unit form and the bulk builder"
        noun="facing"
        nounPlural="facings"
        columnHeader="Facing"
        addLabel="Add facing"
        dialogDescription="The directions a plot or unit can face."
        placeholder="e.g. East"
        emptyTitle="No facings yet"
        emptyDescription="Add a facing to get started."
        deleteWarning="disappears from the facing dropdown. Units already using it keep the name they were saved with."
    />
);

export default FacingConfig;

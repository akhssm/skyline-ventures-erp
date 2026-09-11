import ListConfigPage from "../../components/config/ListConfigPage";

/* The categories spend is filed under. The expenses screen groups them into
   Capex and Opex. */
const ExpenditureConfig = () => (
    <ListConfigPage
        field="expenseCategories"
        title="Expenditure Category"
        breadcrumb="Expenditure Category"
        tagline="grouped into Capex and Opex on the expenses screen"
        noun="category"
        nounPlural="categories"
        columnHeader="Category"
        addLabel="Add category"
        dialogDescription="What a line of spend is filed under."
        placeholder="e.g. Site security"
        emptyTitle="No categories yet"
        emptyDescription="Add a category to get started."
        deleteWarning="disappears from the category dropdown. Expenses already filed under it keep the name they were saved with."
    />
);

export default ExpenditureConfig;

import ListConfigPage from "../../components/config/ListConfigPage";

/* The construction milestones a project moves through, offered when a
   property is created. */
const ProjectStageConfig = () => (
    <ListConfigPage
        field="projectStages"
        title="Project Stages"
        breadcrumb="Project Stages"
        tagline="chosen when a property is created"
        noun="stage"
        nounPlural="stages"
        columnHeader="Stage"
        addLabel="Add stage"
        dialogDescription="Stages a property can be at, in the order they happen."
        placeholder="Under construction"
        emptyTitle="No project stages yet"
        emptyDescription="Add a stage and it becomes selectable when a property is created."
        deleteWarning="disappears from the stage dropdown. Projects already using it keep the stage they were saved with."
    />
);

export default ProjectStageConfig;

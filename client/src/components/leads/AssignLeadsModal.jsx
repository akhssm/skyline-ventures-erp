import { useState } from "react";

import { useToast } from "../../context/ToastContext";
import { Field, Modal, Spinner } from "../ui";

const AssignLeadsModal = ({ count, agents, onClose, onAssign }) => {
    const toast = useToast();

    const [agentId, setAgentId] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const submit = async () => {
        if (!agentId) return;

        setIsSaving(true);

        try {
            await onAssign(agentId);
        } catch (err) {
            toast.error("Could not assign", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            title="Assign leads"
            description={`${count} lead${count === 1 ? "" : "s"} will move to the chosen agent.`}
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={submit}
                        disabled={!agentId || isSaving}
                    >
                        {isSaving ? <Spinner inline /> : null}
                        Assign
                    </button>
                </>
            }
        >
            <Field label="Agent">
                <select
                    className="select"
                    value={agentId}
                    onChange={(event) => setAgentId(event.target.value)}
                    autoFocus
                >
                    <option value="">Choose an agent</option>
                    {agents.map((agent) => (
                        <option key={agent._id} value={agent._id}>
                            {agent.name}
                        </option>
                    ))}
                </select>
            </Field>
        </Modal>
    );
};

export default AssignLeadsModal;

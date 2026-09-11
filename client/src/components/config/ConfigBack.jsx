import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * The back control every configuration screen carries. It steps back through
 * history when there is somewhere to step back to, so a screen opened from
 * the leads console returns there rather than jumping to the index. With no
 * history, typically a deep link or a fresh tab, it falls back to the path
 * given, which is the configuration index unless a caller says otherwise.
 */
const ConfigBack = ({ fallback = "/layout/configuration" }) => {
    const navigate = useNavigate();

    const back = () => {
        // A fresh tab starts at index 0, so anything above it means the user
        // arrived from somewhere inside the app.
        if (window.history.state?.idx > 0) navigate(-1);
        else navigate(fallback, { replace: true });
    };

    return (
        <button type="button" className="btn btn-ghost cfg-back" onClick={back}>
            <ArrowLeft /> Back
        </button>
    );
};

export default ConfigBack;

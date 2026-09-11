import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const nextId = useRef(1);

    const dismiss = useCallback((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const push = useCallback(
        (tone, title, description) => {
            const id = nextId.current++;

            setToasts((current) => [...current, { id, tone, title, description }]);

            // Errors stay a little longer because they usually need reading.
            setTimeout(() => dismiss(id), tone === "error" ? 6500 : 4000);
        },
        [dismiss]
    );

    const value = useMemo(
        () => ({
            success: (title, description) => push("success", title, description),
            error: (title, description) => push("error", title, description),
            info: (title, description) => push("info", title, description),
        }),
        [push]
    );

    return (
        <ToastContext.Provider value={value}>
            {children}

            <div className="toasts" role="status" aria-live="polite">
                {toasts.map((toast) => {
                    const Icon = ICONS[toast.tone];

                    return (
                        <div key={toast.id} className={`toast tone-${toast.tone}`}>
                            <Icon />

                            <div className="toast-text">
                                <b>{toast.title}</b>
                                {toast.description ? <span>{toast.description}</span> : null}
                            </div>

                            <button
                                type="button"
                                className="toast-close"
                                onClick={() => dismiss(toast.id)}
                                aria-label="Dismiss"
                            >
                                <X />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);

    if (!context) throw new Error("useToast must be used inside ToastProvider");

    return context;
};

import { useState } from "react";
import { Clock, Mail, MessageSquare, Phone, Send } from "lucide-react";

import { contactMessages as contactApi } from "../api/resources";
import { useResource } from "../hooks/useResource";
import { useToast } from "../context/ToastContext";
import { Badge, DataTable, Field, Pagination, Spinner } from "../components/ui";
import { date, titleCase } from "../utils/format";

const STATUS_TONE = {
    open: "warning",
    in_progress: "info",
    resolved: "success",
    closed: "neutral",
};

const PRIORITY_TONE = {
    urgent: "danger",
    high: "warning",
    medium: "info",
    low: "neutral",
};

const emptyForm = { subject: "", message: "", category: "other", priority: "medium" };

const ContactUs = () => {
    const toast = useToast();
    const list = useResource(contactApi, { limit: 10 });

    const [form, setForm] = useState(emptyForm);
    const [isSending, setIsSending] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (field) => (event) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const submit = async (event) => {
        event.preventDefault();

        const next = {};
        if (!form.subject.trim()) next.subject = "Give your request a subject";
        if (!form.message.trim()) next.message = "Describe what you need";

        setErrors(next);
        if (Object.keys(next).length) return;

        setIsSending(true);

        try {
            await contactApi.create(form);
            toast.success("Request raised", "Our team will get back to you shortly.");

            setForm(emptyForm);
            list.refetch();
        } catch (err) {
            toast.error("Could not send", err.message);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <>
            <div className="page-head">
                <div>
                    <h1 className="page-title">Support</h1>
                    <div className="page-summary">
                        <span>Raise a request and track what your team has already asked</span>
                    </div>
                </div>
            </div>

            <div className="contact-layout">
                <div>
                    <section className="card" style={{ marginBottom: 16 }}>
                        <div className="card-head">
                            <h3>Raise a request</h3>
                        </div>

                        <div className="card-pad">
                            <form className="form-grid" onSubmit={submit} noValidate>
                                <Field label="Subject" error={errors.subject} full>
                                    <input
                                        className="input"
                                        value={form.subject}
                                        onChange={set("subject")}
                                        placeholder="Cannot export the leads report"
                                    />
                                </Field>

                                <Field label="Category">
                                    <select
                                        className="select"
                                        value={form.category}
                                        onChange={set("category")}
                                    >
                                        {["bug", "feature", "billing", "training", "other"].map((c) => (
                                            <option key={c} value={c}>
                                                {titleCase(c)}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Priority">
                                    <select
                                        className="select"
                                        value={form.priority}
                                        onChange={set("priority")}
                                    >
                                        {["low", "medium", "high", "urgent"].map((p) => (
                                            <option key={p} value={p}>
                                                {titleCase(p)}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Details" error={errors.message} full>
                                    <textarea
                                        className="textarea"
                                        value={form.message}
                                        onChange={set("message")}
                                        placeholder="Tell us what happened and what you expected"
                                    />
                                </Field>

                                <div className="form-field is-full">
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ alignSelf: "flex-start" }}
                                        disabled={isSending}
                                    >
                                        {isSending ? <Spinner inline /> : <Send />}
                                        Send request
                                    </button>
                                </div>
                            </form>
                        </div>
                    </section>

                    <section className="card">
                        <div className="card-head">
                            <h3>Your tickets</h3>
                        </div>

                        <DataTable
                            columns={[
                                {
                                    key: "subject",
                                    header: "Subject",
                                    render: (row) => (
                                        <div>
                                            <div className="record-name">{row.subject}</div>
                                            <div className="record-sub">{titleCase(row.category)}</div>
                                        </div>
                                    ),
                                },
                                {
                                    key: "priority",
                                    header: "Priority",
                                    render: (row) => (
                                        <Badge tone={PRIORITY_TONE[row.priority] || "neutral"}>
                                            {titleCase(row.priority)}
                                        </Badge>
                                    ),
                                },
                                {
                                    key: "status",
                                    header: "Status",
                                    render: (row) => (
                                        <Badge tone={STATUS_TONE[row.status] || "neutral"}>
                                            {titleCase(row.status)}
                                        </Badge>
                                    ),
                                },
                                {
                                    key: "createdAt",
                                    header: "Raised",
                                    className: "num",
                                    render: (row) => date(row.createdAt),
                                },
                            ]}
                            rows={list.items}
                            isLoading={list.isLoading}
                            error={list.error}
                            onRetry={list.refetch}
                            emptyIcon={MessageSquare}
                            emptyTitle="No tickets yet"
                            emptyDescription="Anything you raise will be tracked here."
                        />

                        <Pagination pagination={list.pagination} onPageChange={list.setPage} />
                    </section>
                </div>

                <aside className="card contact-info">
                    <div className="contact-info-item">
                        <Phone />
                        <div>
                            <b>Support line</b>
                            <span>+91 90000 12345</span>
                        </div>
                    </div>

                    <div className="contact-info-item">
                        <Mail />
                        <div>
                            <b>Email</b>
                            <span>support@sellandbill.com</span>
                        </div>
                    </div>

                    <div className="contact-info-item">
                        <Clock />
                        <div>
                            <b>Hours</b>
                            <span>Monday to Saturday, 9am to 7pm IST</span>
                        </div>
                    </div>

                    <div className="contact-info-item">
                        <MessageSquare />
                        <div>
                            <b>Response time</b>
                            <span>
                                Urgent within 2 hours, everything else within one business day
                            </span>
                        </div>
                    </div>
                </aside>
            </div>
        </>
    );
};

export default ContactUs;

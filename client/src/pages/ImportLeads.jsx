import { useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";

import { leads as leadsApi } from "../api/resources";
import { useToast } from "../context/ToastContext";
import ResourcePage from "../components/ResourcePage";
import { importJobsConfig } from "../config/modules";
import { Badge, Spinner } from "../components/ui";
import { number } from "../utils/format";

const TEMPLATE_HEADERS = ["name", "phone", "email", "source", "requirement"];

/**
 * Splits a CSV line, honouring double-quoted fields that contain commas.
 */
const splitCsvLine = (line) => {
    const cells = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];

        if (char === '"') {
            // A doubled quote inside a quoted field is a literal quote.
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            cells.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    cells.push(current.trim());
    return cells;
};

const parseCsv = (text) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) throw new Error("The file needs a header row and at least one lead");

    const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ""));

    if (!headers.includes("phone")) {
        throw new Error('The file must contain a "phone" column');
    }

    return lines.slice(1).map((line) => {
        const cells = splitCsvLine(line);
        return Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
    });
};

const ImportLeads = () => {
    const toast = useToast();
    const fileInput = useRef(null);

    const [rows, setRows] = useState(null);
    const [fileName, setFileName] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [parseError, setParseError] = useState("");

    const handleFile = async (file) => {
        if (!file) return;

        setParseError("");
        setResult(null);

        try {
            const parsed = parseCsv(await file.text());

            setRows(parsed);
            setFileName(file.name);
        } catch (err) {
            setRows(null);
            setParseError(err.message);
        }
    };

    const startImport = async () => {
        setIsUploading(true);

        try {
            const response = await leadsApi.import(fileName, rows);

            setResult(response.data);
            setRows(null);
            toast.success(`${response.data.importedRows} leads imported`);
        } catch (err) {
            toast.error("Import failed", err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const downloadTemplate = () => {
        const csv = `${TEMPLATE_HEADERS.join(",")}\nRavi Kumar,9876543210,ravi@example.com,website,3BHK east facing\n`;
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));

        const link = document.createElement("a");
        link.href = url;
        link.download = "lead-import-template.csv";
        link.click();

        URL.revokeObjectURL(url);
    };

    return (
        <>
            <div className="page-head">
                <div>
                    <h1 className="page-title">Import Leads</h1>
                    <div className="page-summary">
                        <span>
                            Upload a CSV with a <b>phone</b> column. Numbers already in your
                            pipeline are skipped.
                        </span>
                    </div>
                </div>

                <div className="page-actions">
                    <button type="button" className="btn btn-secondary" onClick={downloadTemplate}>
                        <FileSpreadsheet /> Download template
                    </button>
                </div>
            </div>

            <div className="card card-pad" style={{ marginBottom: 22 }}>
                <input
                    ref={fileInput}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: "none" }}
                    onChange={(event) => handleFile(event.target.files?.[0])}
                />

                <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                        event.preventDefault();
                        handleFile(event.dataTransfer.files?.[0]);
                    }}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 12,
                        padding: "40px 20px",
                        border: "1.5px dashed var(--border-strong)",
                        borderRadius: "var(--r-lg)",
                        background: "var(--surface-sunken)",
                        textAlign: "center",
                    }}
                >
                    <Upload size={30} style={{ color: "var(--text-subtle)" }} />

                    <b style={{ fontSize: 14.5, color: "var(--text-strong)" }}>
                        Drop a CSV here, or choose a file
                    </b>

                    <p style={{ fontSize: 12.5, color: "var(--text-muted)", maxWidth: 420 }}>
                        Supported columns: {TEMPLATE_HEADERS.join(", ")}
                    </p>

                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => fileInput.current?.click()}
                    >
                        Choose file
                    </button>

                    {parseError ? (
                        <div className="login-error" style={{ marginTop: 4 }}>
                            {parseError}
                        </div>
                    ) : null}
                </div>

                {rows ? (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            marginTop: 18,
                            flexWrap: "wrap",
                        }}
                    >
                        <Badge tone="info">{fileName}</Badge>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                            <b className="mono">{number(rows.length)}</b> rows ready to import
                        </span>

                        <button
                            type="button"
                            className="btn btn-primary"
                            style={{ marginLeft: "auto" }}
                            onClick={startImport}
                            disabled={isUploading}
                        >
                            {isUploading ? <Spinner inline /> : <Upload />}
                            Import {number(rows.length)} leads
                        </button>
                    </div>
                ) : null}

                {result ? (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            marginTop: 18,
                            padding: 14,
                            border: "1px solid var(--success-border)",
                            borderRadius: "var(--r-md)",
                            background: "var(--success-bg)",
                            flexWrap: "wrap",
                        }}
                    >
                        <CheckCircle2 size={17} style={{ color: "var(--success)" }} />

                        <span style={{ fontSize: 13, color: "var(--success)" }}>
                            <b>{number(result.importedRows)}</b> imported,{" "}
                            <b>{number(result.duplicateRows)}</b> duplicates skipped,{" "}
                            <b>{number(result.failedRows)}</b> failed
                        </span>
                    </div>
                ) : null}
            </div>

            <ResourcePage config={importJobsConfig} />
        </>
    );
};

export default ImportLeads;

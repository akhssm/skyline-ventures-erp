import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Copy, FileText, Plus, Trash2 } from "lucide-react";

import { projects as projectsApi, units as unitsApi } from "../../api/resources";
import { useToast } from "../../context/ToastContext";
import { Modal, Spinner } from "../ui";

/* ---------------------------------------------------------
   CONSTANTS
   The categories, area units and numbering patterns the
   original offers, in the original's order.
   --------------------------------------------------------- */

const FLOOR_MIN = 0;
const FLOOR_MAX = 200;
const BATCH_MAX = 1000;

/* Archetype A is numbered by floor and position. B and C are a flat series,
   so they ask for a prefix and a number range instead of a floor plate. */
const CATEGORIES = [
    { value: "Flat / Apartment", archetype: "A" },
    { value: "Studio", archetype: "A" },
    { value: "Shop / Retail", archetype: "A" },
    { value: "Office", archetype: "A" },
    { value: "Warehouse / Godown", archetype: "A" },
    { value: "Co-working", archetype: "A" },
    { value: "PG / Hostel", archetype: "A", unitNoun: "rooms" },
    { value: "Plot", archetype: "B" },
    { value: "Agricultural Land", archetype: "B" },
    { value: "Villa / Row house", archetype: "C" },
    { value: "Farmhouse", archetype: "C" },
];

const AREA_UNIT_GROUPS = [
    { label: "Standard", units: ["Sq.yd", "Sq.ft", "Sq.m", "Acre", "Hectare"] },
    {
        label: "Regional",
        units: [
            "Ground",
            "Cent",
            "Guntha",
            "Bigha (Bihar / Bengal)",
            "Bigha (UP / MP)",
            "Bigha (Rajasthan)",
            "Kattha",
            "Marla",
            "Kanal",
        ],
    },
];

const PATTERN_PRESETS = [
    { label: "Floor + position (101, 102)", value: "{floor}{pos:02}" },
    { label: "Tower + floor + position (A-101)", value: "{tower}-{floor}{pos:02}" },
    { label: "Padded floor (0101, 1001)", value: "{floor:02}{pos:02}" },
];

const EXPECTED_COLUMNS = ["Floor No", "Flat Number", "Total SFT", "Facing", "BHK", "View"];

const FALLBACK_FACING = ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"];
const FALLBACK_BHK = ["1BHK", "2BHK", "2.5BHK", "3BHK", "3BHK Premium", "4BHK"];
const FALLBACK_VIEW = ["Park", "Road", "Pool", "Club", "City", "Lake"];

const inr = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);

const blankPosition = () => ({
    builtUpArea: "",
    facing: "",
    unitType: "",
    view: "",
    facingCharge: false,
    cornerCharge: false,
});

/** Replaces the tokens in a numbering pattern for one floor and position. */
const buildName = (pattern, tower, floor, position) =>
    String(pattern || "")
        .replace(/\{tower\}/g, tower || "")
        .replace(/\{floor:0(\d)\}/g, (_, width) => String(floor).padStart(Number(width), "0"))
        .replace(/\{floor\}/g, String(floor))
        .replace(/\{pos:0(\d)\}/g, (_, width) => String(position).padStart(Number(width), "0"))
        .replace(/\{pos\}/g, String(position))
        .trim();

/** Splits one delimited line, honouring quoted fields. */
const splitRow = (line, delimiter) => {
    const cells = [];
    let cell = "";
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];

        if (char === '"') {
            if (quoted && line[index + 1] === '"') {
                cell += '"';
                index += 1;
            } else {
                quoted = !quoted;
            }
        } else if (char === delimiter && !quoted) {
            cells.push(cell);
            cell = "";
        } else {
            cell += char;
        }
    }

    cells.push(cell);
    return cells.map((value) => value.trim());
};

/* ---------------------------------------------------------
   FIELD
   --------------------------------------------------------- */

const BulkField = ({ label, required, hint, error, full, children }) => (
    <div className={`bf-field${full ? " is-full" : ""}`}>
        <label>
            {label}
            {required ? <span className="req">*</span> : null}
        </label>

        {children}

        {hint && !error ? <span className="bf-hint">{hint}</span> : null}
        {error ? (
            <span className="bf-error">
                <AlertCircle /> {error}
            </span>
        ) : null}
    </div>
);

/* ---------------------------------------------------------
   BULK FLATS
   --------------------------------------------------------- */

const BulkFlats = ({ onClose, onCreated, masters = {} }) => {
    const toast = useToast();
    const fileInput = useRef(null);

    const [projectList, setProjectList] = useState([]);
    const [projectId, setProjectId] = useState("");
    const [towerName, setTowerName] = useState("");

    const [category, setCategory] = useState("Flat / Apartment");
    const [mode, setMode] = useState("generate");

    const [floorFrom, setFloorFrom] = useState(1);
    const [floorTo, setFloorTo] = useState(1);
    const [pattern, setPattern] = useState(PATTERN_PRESETS[0].value);
    const [positions, setPositions] = useState([blankPosition()]);

    const [seriesPrefix, setSeriesPrefix] = useState("Plot");
    const [sectorBlock, setSectorBlock] = useState("");
    const [seriesFrom, setSeriesFrom] = useState(1);
    const [seriesTo, setSeriesTo] = useState(20);
    const [defaultArea, setDefaultArea] = useState("");
    const [areaUnit, setAreaUnit] = useState("Sq.yd");
    const [seriesFacing, setSeriesFacing] = useState("");

    const [priceMode, setPriceMode] = useState("fixed");
    const [basePrice, setBasePrice] = useState("");
    const [ratePerArea, setRatePerArea] = useState("");

    const [excelRows, setExcelRows] = useState([]);
    const [excelFileName, setExcelFileName] = useState("");

    const [submitted, setSubmitted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        projectsApi
            .list({ limit: 100, sort: "name" })
            .then((response) => setProjectList(response.data || []))
            .catch(() => setProjectList([]));
    }, []);

    const facingOptions = masters.facing?.length ? masters.facing : FALLBACK_FACING;
    const bhkOptions = masters.unitType?.length ? masters.unitType : FALLBACK_BHK;
    const viewOptions = masters.view?.length ? masters.view : FALLBACK_VIEW;

    const archetype = CATEGORIES.find((c) => c.value === category)?.archetype ?? "A";
    const isSeries = archetype !== "A";
    const unitNoun = CATEGORIES.find((c) => c.value === category)?.unitNoun ?? "units";

    const towers = useMemo(
        () => projectList.find((project) => project._id === projectId)?.towers || [],
        [projectList, projectId]
    );

    /* ---- preview ---- */

    const pricingBasis = isSeries ? areaUnit : "sq.ft";
    const pricingArea = isSeries ? Number(defaultArea) || 0 : Number(positions[0]?.builtUpArea) || 0;

    const pricedAreas = useMemo(() => {
        if (mode === "excel" && !isSeries) return excelRows.map((row) => Number(row.builtUpArea) || 0);
        if (isSeries) return [pricingArea];
        return positions.map((position) => Number(position.builtUpArea) || 0);
    }, [mode, isSeries, excelRows, positions, pricingArea]);

    const canPriceByRate = pricedAreas.some((area) => Number(area) > 0);

    const priceForArea = (area) =>
        priceMode === "rate"
            ? (Number(ratePerArea) || 0) * (Number(area) || 0)
            : Number(basePrice) || 0;

    const computedPrice =
        priceMode === "rate" ? (Number(ratePerArea) || 0) * pricingArea : Number(basePrice) || 0;

    const previewRows = useMemo(() => {
        if (isSeries) return [];

        if (mode === "excel") {
            return excelRows.map((row) => ({ ...row, basePrice: priceForArea(row.builtUpArea) }));
        }

        const from = Number(floorFrom);
        const to = Number(floorTo);

        if (Number.isNaN(from) || Number.isNaN(to) || to < from) return [];

        const rows = [];

        for (let floor = from; floor <= to; floor += 1) {
            positions.forEach((position, index) => {
                rows.push({
                    flatNo: buildName(pattern, towerName, floor, index + 1),
                    floor,
                    builtUpArea: Number(position.builtUpArea) || 0,
                    facing: position.facing,
                    unitType: position.unitType,
                    view: position.view,
                    isFacingChargeApplicable: position.facingCharge,
                    isCornerChargeApplicable: position.cornerCharge,
                    basePrice: priceForArea(Number(position.builtUpArea) || 0),
                });
            });
        }

        return rows;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSeries, mode, excelRows, floorFrom, floorTo, positions, pattern, towerName, priceMode, basePrice, ratePerArea]);

    const previewSeriesRows = useMemo(() => {
        if (!isSeries) return [];

        const from = Number(seriesFrom);
        const to = Number(seriesTo);
        const prefix = String(seriesPrefix || "").trim();

        if (!prefix || Number.isNaN(from) || Number.isNaN(to) || to < from) return [];

        const rows = [];

        for (let n = from; n <= to; n += 1) {
            rows.push({
                flatNo: `${prefix}-${n}`,
                floor: 0,
                builtUpArea: Number(defaultArea) || 0,
                facing: seriesFacing,
                unitType: sectorBlock ? `${category} · ${sectorBlock}` : category,
                view: "",
                basePrice: computedPrice,
            });
        }

        return rows;
    }, [isSeries, seriesFrom, seriesTo, seriesPrefix, defaultArea, seriesFacing, sectorBlock, category, computedPrice]);

    const rows = isSeries ? previewSeriesRows : previewRows;
    const previewCount = rows.length;
    const previewChips = rows.slice(0, 40).map((row) => row.flatNo);
    const previewOverflow = Math.max(0, previewCount - 40);

    const duplicateNames = useMemo(() => {
        const seen = new Map();
        rows.forEach((row) => seen.set(row.flatNo, (seen.get(row.flatNo) || 0) + 1));
        return [...seen.entries()].filter(([, count]) => count > 1).map(([name]) => name);
    }, [rows]);

    const pricingLine = useMemo(() => {
        if (priceMode === "fixed") return computedPrice ? `Each unit: ${inr(computedPrice)}` : "";

        const rate = Number(ratePerArea) || 0;
        const areas = pricedAreas.filter((area) => area > 0);

        if (!rate || !areas.length) return "";

        const low = Math.min(...areas);
        const high = Math.max(...areas);
        const rateText = new Intl.NumberFormat("en-IN").format(rate);

        return low === high
            ? `Each unit: ${inr(rate * low)} (${rateText} × ${low} ${pricingBasis})`
            : `${inr(rate * low)} to ${inr(rate * high)} (${rateText} × ${low}–${high} ${pricingBasis})`;
    }, [priceMode, computedPrice, ratePerArea, pricedAreas, pricingBasis]);

    /* ---- positions ---- */

    const patchPosition = (index, patch) =>
        setPositions((current) =>
            current.map((position, i) => (i === index ? { ...position, ...patch } : position))
        );

    const addPosition = () => setPositions((current) => [...current, blankPosition()]);

    const clonePosition = (index) =>
        setPositions((current) => [
            ...current.slice(0, index + 1),
            { ...current[index] },
            ...current.slice(index + 1),
        ]);

    const removePosition = (index) =>
        setPositions((current) => current.filter((_, i) => i !== index));

    /* ---- excel ---- */

    const downloadSample = () => {
        const sample = [
            EXPECTED_COLUMNS.join(","),
            "1,101,1250,East,2BHK,Park",
            "1,102,1480,West,3BHK,Road",
        ].join("\n");

        const url = URL.createObjectURL(new Blob([sample], { type: "text/csv" }));
        const link = document.createElement("a");

        link.href = url;
        link.download = "Bulk Flats Upload.csv";
        link.click();

        URL.revokeObjectURL(url);
    };

    const onFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!/\.(csv|txt)$/i.test(file.name)) {
            toast.error(
                "Only CSV files are read here",
                "Save the workbook as CSV, then choose it again."
            );
            event.target.value = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = (loaded) => {
            try {
                const lines = String(loaded.target.result)
                    .split(/\r?\n/)
                    .filter((line) => line.trim());

                if (lines.length < 2) {
                    toast.error("The file has no rows");
                    return;
                }

                const delimiter = lines[0].includes("\t") ? "\t" : ",";
                const header = splitRow(lines[0], delimiter);
                const missing = EXPECTED_COLUMNS.filter((column) => !header.includes(column));

                if (missing.length) {
                    toast.error(`Missing column(s): ${missing.join(", ")}`);
                    return;
                }

                const at = (cells, column) => cells[header.indexOf(column)] ?? "";
                const parsed = [];

                for (let index = 1; index < lines.length; index += 1) {
                    const cells = splitRow(lines[index], delimiter);
                    const where = `Row ${index + 1}`;

                    const flatNo = at(cells, "Flat Number");
                    if (!flatNo) {
                        toast.error(`${where}: Flat Number is required`);
                        return;
                    }

                    const floor = Number(at(cells, "Floor No"));
                    if (at(cells, "Floor No") === "" || Number.isNaN(floor)) {
                        toast.error(`${where}: Floor No is required`);
                        return;
                    }

                    if (floor < FLOOR_MIN || floor > FLOOR_MAX) {
                        toast.error(
                            `${where}: Floor No must be between ${FLOOR_MIN} (ground) and ${FLOOR_MAX}`
                        );
                        return;
                    }

                    const area = Number(at(cells, "Total SFT"));
                    if (!area || area <= 0) {
                        toast.error(`${where}: Total SFT must be greater than zero`);
                        return;
                    }

                    parsed.push({
                        flatNo,
                        floor,
                        builtUpArea: area,
                        facing: at(cells, "Facing"),
                        unitType: at(cells, "BHK"),
                        view: at(cells, "View"),
                    });
                }

                setExcelRows(parsed);
                setExcelFileName(file.name);
                toast.success(`${parsed.length} row(s) read — review and create`);
            } catch {
                toast.error("Could not read that file");
            } finally {
                event.target.value = "";
            }
        };

        reader.readAsText(file);
    };

    /* ---- submit ---- */

    const pricingValid =
        priceMode === "rate" ? canPriceByRate && Number(ratePerArea) > 0 : Number(basePrice) > 0;

    const isValid = (() => {
        if (!projectId || !towerName) return false;
        if (!previewCount || previewCount > BATCH_MAX) return false;
        if (!pricingValid) return false;
        if (duplicateNames.length) return false;

        if (isSeries) return Boolean(Number(defaultArea) > 0 && areaUnit && seriesFacing);

        return !rows.some(
            (row) =>
                !row.flatNo?.trim() ||
                Number.isNaN(Number(row.floor)) ||
                Number(row.floor) < FLOOR_MIN ||
                Number(row.floor) > FLOOR_MAX ||
                !row.builtUpArea ||
                row.builtUpArea <= 0 ||
                !row.facing ||
                !row.unitType
        );
    })();

    const create = async () => {
        setSubmitted(true);

        if (!isValid) {
            toast.error("Check the highlighted fields and try again.");
            return;
        }

        setIsSaving(true);

        try {
            const response = await unitsApi.bulkCreate({
                project: projectId,
                tower: towerName,
                units: rows.map((row) => ({
                    ...row,
                    unitCategory: category,
                    ratePerSqft: priceMode === "rate" ? Number(ratePerArea) || 0 : 0,
                    totalPrice: row.basePrice,
                })),
            });

            toast.success(`${response.data?.created ?? previewCount} units created`);
            onCreated();
        } catch (err) {
            toast.error("Could not create", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    /* ---- render ---- */

    const noTowers = projectId && !towers.length;

    return (
        <Modal
            wide
            title="Bulk add flats"
            description={`${towerName || "This tower"} — define the floor plate once, or upload a sheet`}
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={create}
                        disabled={isSaving || !previewCount || previewCount > BATCH_MAX}
                    >
                        {isSaving ? <Spinner inline /> : null}
                        {isSaving
                            ? "Creating…"
                            : `Create ${previewCount}${isSeries ? " units" : " flats"}`}
                    </button>
                </>
            }
        >
            <div className="bf">
                {!isSeries ? (
                    <div className="bf-modes is-full">
                        <button
                            type="button"
                            className={`btn ${mode === "generate" ? "btn-primary" : "btn-secondary"}`}
                            onClick={() => setMode("generate")}
                        >
                            Generate
                        </button>

                        <button
                            type="button"
                            className={`btn ${mode === "excel" ? "btn-primary" : "btn-secondary"}`}
                            onClick={() => setMode("excel")}
                        >
                            From Excel
                        </button>
                    </div>
                ) : null}

                <BulkField label="Project" required error={submitted && !projectId ? "Pick the project these units belong to." : ""}>
                    <select
                        className="select"
                        value={projectId}
                        onChange={(event) => {
                            setProjectId(event.target.value);
                            setTowerName("");
                        }}
                    >
                        <option value="">Select project</option>
                        {projectList.map((project) => (
                            <option key={project._id} value={project._id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                </BulkField>

                <BulkField
                    label="Tower"
                    required
                    error={
                        noTowers
                            ? "This project has no towers yet."
                            : submitted && !towerName
                              ? "Pick a tower."
                              : ""
                    }
                >
                    <select
                        className="select"
                        value={towerName}
                        onChange={(event) => setTowerName(event.target.value)}
                        disabled={!projectId}
                    >
                        <option value="">Select tower</option>
                        {towers.map((tower) => (
                            <option key={tower.name} value={tower.name}>
                                {tower.name}
                            </option>
                        ))}
                    </select>
                </BulkField>

                <BulkField label="Unit category" required>
                    <select
                        className="select"
                        value={category}
                        onChange={(event) => {
                            const next = event.target.value;
                            const nextArchetype =
                                CATEGORIES.find((c) => c.value === next)?.archetype ?? "A";

                            setCategory(next);
                            setSeriesPrefix(
                                nextArchetype === "C"
                                    ? next.startsWith("Farmhouse")
                                        ? "Farmhouse"
                                        : "Villa"
                                    : next === "Agricultural Land"
                                      ? "Land"
                                      : "Plot"
                            );
                        }}
                    >
                        {CATEGORIES.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.value}
                            </option>
                        ))}
                    </select>
                </BulkField>

                {/* ---- generate ---- */}

                {mode === "generate" && !isSeries ? (
                    <>
                        <BulkField label="Floor from" required>
                            <input
                                type="number"
                                className="input"
                                placeholder="0 for ground"
                                min={FLOOR_MIN}
                                max={FLOOR_MAX}
                                value={floorFrom}
                                onChange={(event) => setFloorFrom(event.target.value)}
                            />
                        </BulkField>

                        <BulkField
                            label="Floor to"
                            required
                            error={
                                submitted && Number(floorTo) < Number(floorFrom)
                                    ? "The last floor cannot be below the first."
                                    : ""
                            }
                        >
                            <input
                                type="number"
                                className="input"
                                placeholder="12"
                                min={FLOOR_MIN}
                                max={FLOOR_MAX}
                                value={floorTo}
                                onChange={(event) => setFloorTo(event.target.value)}
                            />
                        </BulkField>

                        <BulkField
                            label="Numbering"
                            full
                            hint="Tokens: {tower} {floor} {floor:02} {pos} {pos:02}"
                        >
                            <select
                                className="select"
                                value={pattern}
                                onChange={(event) => setPattern(event.target.value)}
                            >
                                {PATTERN_PRESETS.map((preset) => (
                                    <option key={preset.value} value={preset.value}>
                                        {preset.label}
                                    </option>
                                ))}
                            </select>
                        </BulkField>

                        <div className="bf-plate is-full">
                            <div className="bf-plate-head">
                                <h3>Floor plate</h3>
                                <p>
                                    One row per {unitNoun === "rooms" ? "room" : "unit"} position.
                                    This repeats on every floor in the range.
                                </p>
                            </div>

                            {positions.map((position, index) => (
                                <div key={index} className="bf-pos">
                                    <div className="bf-pos-no">{index + 1}</div>

                                    <BulkField
                                        label="Total SFT"
                                        required
                                        error={submitted && !position.builtUpArea ? "Required" : ""}
                                    >
                                        <input
                                            type="number"
                                            className="input"
                                            min="0"
                                            value={position.builtUpArea}
                                            onChange={(event) =>
                                                patchPosition(index, { builtUpArea: event.target.value })
                                            }
                                        />
                                    </BulkField>

                                    <BulkField
                                        label="Facing"
                                        required
                                        error={submitted && !position.facing ? "Required" : ""}
                                    >
                                        <select
                                            className="select"
                                            value={position.facing}
                                            onChange={(event) =>
                                                patchPosition(index, { facing: event.target.value })
                                            }
                                        >
                                            <option value="">Select</option>
                                            {facingOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </BulkField>

                                    <BulkField
                                        label="BHK"
                                        required
                                        error={submitted && !position.unitType ? "Required" : ""}
                                    >
                                        <select
                                            className="select"
                                            value={position.unitType}
                                            onChange={(event) =>
                                                patchPosition(index, { unitType: event.target.value })
                                            }
                                        >
                                            <option value="">Select</option>
                                            {bhkOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </BulkField>

                                    <BulkField label="View">
                                        <select
                                            className="select"
                                            value={position.view}
                                            onChange={(event) =>
                                                patchPosition(index, { view: event.target.value })
                                            }
                                        >
                                            <option value="">None</option>
                                            {viewOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </BulkField>

                                    <div className="bf-pos-flags">
                                        <label>
                                            <input
                                                type="checkbox"
                                                className="checkbox"
                                                checked={position.facingCharge}
                                                onChange={(event) =>
                                                    patchPosition(index, {
                                                        facingCharge: event.target.checked,
                                                    })
                                                }
                                            />
                                            Facing charge
                                        </label>

                                        <label>
                                            <input
                                                type="checkbox"
                                                className="checkbox"
                                                checked={position.cornerCharge}
                                                onChange={(event) =>
                                                    patchPosition(index, {
                                                        cornerCharge: event.target.checked,
                                                    })
                                                }
                                            />
                                            Corner charge
                                        </label>
                                    </div>

                                    <div className="bf-pos-actions">
                                        <button
                                            type="button"
                                            className="bf-pos-clone"
                                            title="Duplicate this position"
                                            aria-label="Duplicate this position"
                                            onClick={() => clonePosition(index)}
                                        >
                                            <Copy />
                                        </button>

                                        {positions.length > 1 ? (
                                            <button
                                                type="button"
                                                className="bf-pos-x"
                                                title="Remove this position"
                                                aria-label="Remove this position"
                                                onClick={() => removePosition(index)}
                                            >
                                                <Trash2 />
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ alignSelf: "flex-start" }}
                                onClick={addPosition}
                            >
                                <Plus /> Add position
                            </button>
                        </div>
                    </>
                ) : null}

                {/* ---- excel ---- */}

                {mode === "excel" && !isSeries ? (
                    <div className="bf-import is-full">
                        <div className="bf-import-meta">
                            <span className="bf-import-title">Bulk import</span>
                            <span className="bf-import-hint">
                                .csv — columns: {EXPECTED_COLUMNS.join(", ")}
                            </span>
                        </div>

                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => fileInput.current?.click()}
                        >
                            Choose file
                        </button>

                        <input
                            ref={fileInput}
                            type="file"
                            accept=".csv,.txt"
                            hidden
                            onChange={onFileChange}
                        />

                        <button type="button" className="btn btn-secondary" onClick={downloadSample}>
                            Sample format
                        </button>

                        {excelFileName ? (
                            <p className="bf-hint is-full">
                                <FileText /> {excelFileName} · {excelRows.length} rows
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {/* ---- series ---- */}

                {isSeries ? (
                    <>
                        <BulkField
                            label={`${archetype === "C" ? "Villa" : "Plot"} prefix`}
                            required
                            error={submitted && !seriesPrefix.trim() ? "Required" : ""}
                        >
                            <input
                                className="input"
                                placeholder="Plot"
                                value={seriesPrefix}
                                onChange={(event) => setSeriesPrefix(event.target.value)}
                            />
                        </BulkField>

                        <BulkField label="Sector / block">
                            <input
                                className="input"
                                placeholder={archetype === "C" ? "e.g. Block 1" : "e.g. Sector A"}
                                value={sectorBlock}
                                onChange={(event) => setSectorBlock(event.target.value)}
                            />
                        </BulkField>

                        <BulkField label="Number start" required>
                            <input
                                type="number"
                                className="input"
                                placeholder="1"
                                value={seriesFrom}
                                onChange={(event) => setSeriesFrom(event.target.value)}
                            />
                        </BulkField>

                        <BulkField
                            label="Number end"
                            required
                            error={
                                submitted && Number(seriesTo) < Number(seriesFrom)
                                    ? "The last number cannot be below the first."
                                    : ""
                            }
                        >
                            <input
                                type="number"
                                className="input"
                                placeholder="20"
                                value={seriesTo}
                                onChange={(event) => setSeriesTo(event.target.value)}
                            />
                        </BulkField>

                        <BulkField
                            label={archetype === "C" ? "Default built-up area" : "Default area"}
                            required
                            hint={`Applied to every ${archetype === "C" ? "villa" : "plot"} - edit individual units later if they differ.`}
                            error={submitted && !defaultArea ? "Required" : ""}
                        >
                            <input
                                type="number"
                                className="input"
                                min="0"
                                placeholder={archetype === "C" ? "e.g. 2400" : "e.g. 200"}
                                value={defaultArea}
                                onChange={(event) => setDefaultArea(event.target.value)}
                            />
                        </BulkField>

                        <BulkField label="Area unit" required>
                            <select
                                className="select"
                                value={areaUnit}
                                onChange={(event) => setAreaUnit(event.target.value)}
                            >
                                {AREA_UNIT_GROUPS.map((group) => (
                                    <optgroup key={group.label} label={group.label}>
                                        {group.units.map((unit) => (
                                            <option key={unit} value={unit}>
                                                {unit}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </BulkField>

                        <BulkField
                            label="Facing"
                            required
                            error={submitted && !seriesFacing ? "Required" : ""}
                        >
                            <select
                                className="select"
                                value={seriesFacing}
                                onChange={(event) => setSeriesFacing(event.target.value)}
                            >
                                <option value="">Select</option>
                                {facingOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </BulkField>
                    </>
                ) : null}

                {/* ---- pricing ---- */}

                <div className="bf-plate is-full">
                    <div className="bf-plate-head">
                        <h3>Pricing</h3>
                        <p>Applied identically to every unit in the batch.</p>
                    </div>

                    <div className="bf-modes">
                        <button
                            type="button"
                            className={`btn ${priceMode === "fixed" ? "btn-primary" : "btn-secondary"}`}
                            onClick={() => setPriceMode("fixed")}
                        >
                            Fixed total per unit
                        </button>

                        <button
                            type="button"
                            className={`btn ${priceMode === "rate" ? "btn-primary" : "btn-secondary"}`}
                            onClick={() => setPriceMode("rate")}
                        >
                            Rate × area
                        </button>
                    </div>

                    {priceMode === "fixed" ? (
                        <BulkField
                            label="Base price per unit (₹)"
                            required
                            error={submitted && !Number(basePrice) ? "Required" : ""}
                        >
                            <input
                                type="number"
                                className="input"
                                min="0"
                                placeholder="e.g. 5000000 = ₹50 L"
                                value={basePrice}
                                onChange={(event) => setBasePrice(event.target.value)}
                            />
                        </BulkField>
                    ) : (
                        <BulkField
                            label={`Rate (₹ / ${pricingBasis})`}
                            required
                            hint={!canPriceByRate ? "Set an area first to price by rate." : ""}
                            error={submitted && canPriceByRate && !Number(ratePerArea) ? "Required" : ""}
                        >
                            <input
                                type="number"
                                className="input"
                                min="0"
                                placeholder="e.g. 6500"
                                value={ratePerArea}
                                disabled={!canPriceByRate}
                                onChange={(event) => setRatePerArea(event.target.value)}
                            />
                        </BulkField>
                    )}

                    {pricingLine ? <p className="bf-pricing-line is-full">{pricingLine}</p> : null}
                </div>

                {/* ---- preview ---- */}

                {previewCount > BATCH_MAX ? (
                    <div className="bf-error is-full">
                        <AlertCircle /> That is {previewCount} units. Create at most {BATCH_MAX} in
                        one batch.
                    </div>
                ) : null}

                {isSeries && previewCount ? (
                    <div className="bf-preview is-full">
                        <div className="bf-preview-head">
                            <h3>Preview</h3>
                            <p>
                                <b>{previewCount}</b> unit{previewCount === 1 ? "" : "s"} · {category}
                            </p>
                        </div>

                        <div className="bf-chips">
                            {previewChips.map((name) => (
                                <span key={name} className="bf-chip">
                                    {name}
                                </span>
                            ))}
                            {previewOverflow ? (
                                <span className="bf-hint">+{previewOverflow} more</span>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                {!isSeries && previewCount ? (
                    <div className="bf-preview is-full">
                        <div className="bf-preview-head">
                            <h3>Preview</h3>
                            <p>
                                <b>{previewCount}</b> flat{previewCount === 1 ? "" : "s"} will be
                                created
                            </p>
                        </div>

                        {duplicateNames.length ? (
                            <div className="bf-error">
                                <AlertCircle /> Repeated numbers: {duplicateNames.join(", ")}
                            </div>
                        ) : null}

                        <div className="table-scroll bf-preview-scroll">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Flat</th>
                                        <th className="num">Floor</th>
                                        <th className="num">SFT</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {rows.map((row) => (
                                        <tr key={`${row.floor}-${row.flatNo}`}>
                                            <td>{row.flatNo}</td>
                                            <td className="num">{row.floor}</td>
                                            <td className="num">{row.builtUpArea}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : null}

                {!previewCount && mode === "generate" ? (
                    <p className="bf-hint is-full">
                        {isSeries
                            ? "Set a prefix and a number range to see the preview."
                            : "Set a floor range and at least one position to see the preview."}
                    </p>
                ) : null}
            </div>
        </Modal>
    );
};

export default BulkFlats;


const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const path = require("path");
const crypto = require("crypto");
const cors = require("cors");
const fs = require("fs");



const app = express();
const PORT = 4000;
const sessions = new Map();

app.use(
    cors({
        origin: "http://localhost:5173",
    })
);

const upload = multer({
    dest: path.join(__dirname, "uploads"),
    limits: { fileSize: 15 * 1024 * 1024 },
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));
const templatesDir = path.join(__dirname, "templates");
fs.mkdirSync(templatesDir, { recursive: true });

const fields = [
    { key: "studentId", label: "Student ID", required: true },
    { key: "studentName", label: "Student Name", required: true },
    { key: "className", label: "Class" },
    { key: "section", label: "Section" },
    { key: "admissionNumber", label: "Admission Number" },
    { key: "dateOfBirth", label: "Date of Birth" },
];

function readSheet(workbook, name) {
    const data = XLSX.utils.sheet_to_json(
        workbook.Sheets[name],
        { header: 1, defval: "", raw: false }
    );

    const headers = (data.shift() || []).map(
        (value, i) => String(value || `Column ${i + 1}`).trim()
    );

    const rows = data
        .filter(row => row.some(value => String(value ?? "").trim()))
        .map(row =>
            headers.map((_, i) => String(row[i] ?? "").trim())
        );

    return { headers, rows };
}

function getSessionData(session) {
    return {
        id: session.id,
        filename: session.filename,
        sheets: session.workbook.SheetNames,
        activeSheet: session.activeSheet,
        headers: session.headers,
        preview: session.rows.slice(0, 10),
        rowCount: session.rows.length,
        fields,
        mapping: session.mapping,
    };
}

app.post("/api/upload", upload.single("workbook"), (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Upload an Excel file." });
        }

        const workbook = XLSX.readFile(req.file.path);
        const activeSheet = workbook.SheetNames[0];

        if (!activeSheet) {
            return res.status(400).json({ error: "No worksheet found." });
        }

        const session = {
            id: crypto.randomUUID(),
            filename: req.file.originalname,
            workbook,
            activeSheet,
            ...readSheet(workbook, activeSheet),
            mapping: {},
        };

        sessions.set(session.id, session);
        res.json(getSessionData(session));
    } catch (error) {
        next(error);
    }
});

app.post("/api/sessions/:id/sheet", (req, res) => {
    const session = sessions.get(req.params.id);

    if (!session) {
        return res.status(404).json({ error: "Session not found." });
    }

    const { sheetName } = req.body;

    if (!session.workbook.SheetNames.includes(sheetName)) {
        return res.status(400).json({ error: "Invalid worksheet." });
    }

    session.activeSheet = sheetName;
    Object.assign(session, readSheet(session.workbook, sheetName));
    session.mapping = {};

    res.json(getSessionData(session));
});

app.post("/api/sessions/:id/mapping", (req, res) => {
    const session = sessions.get(req.params.id);

    if (!session) {
        return res.status(404).json({ error: "Session not found." });
    }

    const mapping = req.body.mapping || {};

    for (const [key, header] of Object.entries(mapping)) {
        if (!fields.some(field => field.key === key)) {
            return res.status(400).json({ error: `Invalid field: ${key}` });
        }

        if (header && !session.headers.includes(header)) {
            return res.status(400).json({ error: `Invalid column: ${header}` });
        }
    }

    session.mapping = mapping;

    const missing = fields
        .filter(field => field.required && !mapping[field.key])
        .map(field => field.label);

    res.json({
        success: missing.length === 0,
        missingRequiredFields: missing,
        message: missing.length
            ? `Please map: ${missing.join(", ")}`
            : "Mapping saved successfully.",
    });
});

app.get("/api/sessions/:id/normalized-preview", (req, res) => {
    const session = sessions.get(req.params.id);

    if (!session) {
        return res.status(404).json({ error: "Session not found." });
    }

    const rows = session.rows.slice(0, 10).map(row => {
        const result = {};

        for (const field of fields) {
            const header = session.mapping[field.key];
            const index = session.headers.indexOf(header);
            result[field.key] = index >= 0 ? row[index] : "";
        }

        return result;
    });

    res.json({
        totalRows: session.rows.length,
        fields,
        rows,
    });
});

// Save or update a template JSON file
app.post("/api/templates", (req, res) => {
    try {
        const { id, name, page, elements } = req.body;

        if (
            typeof id !== "string" ||
            !/^[a-zA-Z0-9_-]+$/.test(id) ||
            typeof name !== "string" ||
            !page ||
            !Array.isArray(elements)
        ) {
            return res.status(400).json({
                message: "Invalid template data",
            });
        }

        const template = {
            id,
            name,
            page,
            elements,
            updatedAt: new Date().toISOString(),
        };

        const filePath = path.join(templatesDir, `${id}.json`);

        fs.writeFileSync(
            filePath,
            JSON.stringify(template, null, 2),
            "utf8"
        );

        return res.status(200).json({
            message: "Template saved successfully",
            template,
        });
    } catch (error) {
        console.error("Error saving template:", error);

        return res.status(500).json({
            message: "Failed to save template",
        });
    }
});

// Retrieve a saved template
app.get("/api/templates/:id", (req, res) => {
    const { id } = req.params;

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        return res.status(400).json({
            message: "Invalid template ID",
        });
    }

    const filePath = path.join(templatesDir, `${id}.json`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            message: "Template not found",
        });
    }

    return res.json(
        JSON.parse(fs.readFileSync(filePath, "utf8"))
    );
});

app.use((error, req, res, next) => {
    console.error(error);
    res.status(400).json({ error: error.message || "Request failed." });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

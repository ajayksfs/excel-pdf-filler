
const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const path = require("path");
const crypto = require("crypto");
const cors = require("cors");
const fs = require("fs");
const puppeteer = require("puppeteer");
const archiver = require("archiver");
const { renderTemplateHtml } = require("./pdfRenderer");



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

app.use(express.json({ limit: "10mb" }));
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


function loadTemplate(templateId) {
    if (!/^[a-zA-Z0-9_-]+$/.test(templateId)) {
        const error = new Error("Invalid template ID");
        error.status = 400;
        throw error;
    }

    const filePath = path.join(
        templatesDir,
        `${templateId}.json`
    );

    if (!fs.existsSync(filePath)) {
        const error = new Error("Template not found");
        error.status = 404;
        throw error;
    }

    const template = JSON.parse(
        fs.readFileSync(filePath, "utf8")
    );

    if (!Array.isArray(template.elements)) {
        const error = new Error("Template elements are invalid");
        error.status = 400;
        throw error;
    }

    return template;
}

function validateRow(row) {
    return (
        row !== null &&
        typeof row === "object" &&
        !Array.isArray(row)
    );
}

async function createPdfBuffer(browser, template, row) {
    const page = await browser.newPage();
    const width = Number(template.page?.width) || 794;
    const height = Number(template.page?.height) || 1123;

    try {
        // Match the designer canvas CSS pixel size so text does not get scaled.
        await page.setViewport({
            width,
            height,
            deviceScaleFactor: 1,
        });
        await page.emulateMediaType("screen");

        // domcontentloaded avoids hanging forever on broken/slow image URLs.
        await page.setContent(renderTemplateHtml(template, row), {
            waitUntil: "domcontentloaded",
            timeout: 30000,
        });

        // Best-effort wait for images; never block PDF generation on them.
        await page
            .evaluate(async () => {
                const images = Array.from(document.images);

                await Promise.all(
                    images.map(
                        (image) =>
                            new Promise((resolve) => {
                                if (image.complete) {
                                    resolve();
                                    return;
                                }

                                const done = () => resolve();
                                image.addEventListener("load", done, {
                                    once: true,
                                });
                                image.addEventListener("error", done, {
                                    once: true,
                                });
                                setTimeout(done, 5000);
                            })
                    )
                );
            })
            .catch(() => {});

        return await page.pdf({
            width: `${width}px`,
            height: `${height}px`,
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            },
        });
    } finally {
        await page.close();
    }
}

// Generate a PDF for one student's row.
app.post("/api/templates/:id/pdf", async (req, res) => {
    let browser;

    try {
        const template = loadTemplate(req.params.id);
        const { row } = req.body;

        if (!validateRow(row)) {
            return res.status(400).json({
                message: "A student row object is required.",
            });
        }

        browser = await puppeteer.launch({ headless: true });

        const pdf = await createPdfBuffer(browser, template, row);

        const safeName = String(
            row.studentName || row["Student Name"] || "student"
        )
            .replace(/[^a-zA-Z0-9_-]/g, "_")
            .slice(0, 80);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${safeName || "student"}.pdf"`
        );

        return res.send(pdf);
    } catch (error) {
        console.error("PDF generation failed:", error);

        return res.status(error.status || 500).json({
            message: error.message || "Failed to generate PDF.",
        });
    } finally {
        if (browser) await browser.close();
    }
});

// Generate one PDF per row and package them into a ZIP.
app.post("/api/templates/:id/batch-pdf", async (req, res) => {
    let browser;
    let archive;

    try {
        const template = loadTemplate(req.params.id);
        const { rows } = req.body;

        if (
            !Array.isArray(rows) ||
            rows.length === 0 ||
            rows.length > 100
        ) {
            return res.status(400).json({
                message: "Provide between 1 and 100 student rows.",
            });
        }

        if (!rows.every(validateRow)) {
            return res.status(400).json({
                message: "Every row must be a student data object.",
            });
        }

        browser = await puppeteer.launch({ headless: true });

        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="student-reports.zip"'
        );

        archive = archiver("zip", {
            zlib: { level: 6 },
        });

        archive.on("error", (error) => {
            console.error("ZIP creation failed:", error);

            if (!res.headersSent) {
                res.status(500).end("Failed to create ZIP.");
            } else {
                res.destroy(error);
            }
        });

        archive.pipe(res);

        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];

            const studentName =
                row.studentName ||
                row["Student Name"] ||
                `student-${index + 1}`;

            const safeName = String(studentName)
                .replace(/[^a-zA-Z0-9_-]/g, "_")
                .slice(0, 80);

            // Prefix the index so duplicate student names do not overwrite.
            const filename =
                `${String(index + 1).padStart(3, "0")}-${safeName || "student"}.pdf`;

            const pdf = await createPdfBuffer(browser, template, row);

            archive.append(pdf, { name: filename });
        }

        await archive.finalize();
    } catch (error) {
        console.error("Batch PDF generation failed:", error);

        if (!res.headersSent) {
            res.status(error.status || 500).json({
                message: error.status
                    ? error.message
                    : "Failed to generate student reports.",
            });
        } else {
            res.destroy(error);
        }
    } finally {
        if (browser) await browser.close();
    }
});


app.use((error, req, res, next) => {
    console.error(error);
    res.status(400).json({ error: error.message || "Request failed." });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

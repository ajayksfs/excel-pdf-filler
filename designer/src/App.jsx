
import { useEffect, useMemo, useState } from "react";
import { Rnd } from "react-rnd";
import {
	getTableRows,
	paginatePagesForTables,
} from "./tablePagination";
import "./App.css";


const PAGE = {
	width: 794,
	height: 1123,
	size: "A4",
	orientation: "portrait",
	unit: "px",
};

const TEMPLATE_ID = "student-progress-report";

const DEFAULT_HEADER = {
	enabled: true,
	left: "",
	center: "Student Progress Report",
	right: "",
	height: 36,
	fontSize: 11,
	color: "#374151",
	showOnFirstPage: true,
};

const DEFAULT_FOOTER = {
	enabled: true,
	left: "",
	center: "",
	right: "",
	height: 36,
	fontSize: 10,
	color: "#6b7280",
	showOnFirstPage: true,
};

const DEFAULT_PAGE_NUMBER = {
	enabled: true,
	format: "Page {{page}} of {{pages}}",
	align: "right",
	fontSize: 10,
	color: "#4b5563",
	showOnFirstPage: true,
};

function normalizeBand(band = {}, defaults) {
	return {
		enabled:
			band.enabled === undefined
				? Boolean(defaults.enabled)
				: Boolean(band.enabled),
		left: typeof band.left === "string" ? band.left : defaults.left,
		center: typeof band.center === "string" ? band.center : defaults.center,
		right: typeof band.right === "string" ? band.right : defaults.right,
		height: Number(band.height) || defaults.height,
		fontSize: Number(band.fontSize) || defaults.fontSize,
		color: band.color || defaults.color,
		showOnFirstPage:
			band.showOnFirstPage === undefined
				? defaults.showOnFirstPage
				: Boolean(band.showOnFirstPage),
	};
}

function normalizePageNumber(config = {}, defaults = DEFAULT_PAGE_NUMBER) {
	return {
		enabled:
			config.enabled === undefined
				? Boolean(defaults.enabled)
				: Boolean(config.enabled),
		format:
			typeof config.format === "string" && config.format.trim()
				? config.format
				: defaults.format,
		align: ["left", "center", "right"].includes(config.align)
			? config.align
			: defaults.align,
		fontSize: Number(config.fontSize) || defaults.fontSize,
		color: config.color || defaults.color,
		showOnFirstPage:
			config.showOnFirstPage === undefined
				? defaults.showOnFirstPage
				: Boolean(config.showOnFirstPage),
	};
}

function resolvePreviewText(text, row, pageNumber, totalPages) {
	return String(text ?? "").replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => {
		if (key === "page") return String(pageNumber);
		if (key === "pages" || key === "totalPages") return String(totalPages);
		const value = row?.[key];
		return value == null ? "" : String(value);
	});
}

function createPage(overrides = {}, index = 0) {
	const pageNumber = index + 1;

	return {
		id:
			overrides.id ||
			`page-${pageNumber}-${Date.now().toString(36)}-${Math.random()
				.toString(36)
				.slice(2, 6)}`,
		name: overrides.name || `Page ${pageNumber}`,
		elements: Array.isArray(overrides.elements)
			? overrides.elements
			: [],
	};
}

/**
 * Normalize legacy single-page templates and multi-page templates
 * into a consistent `{ pages: [...] }` shape.
 */
function normalizeTemplatePages(template = {}) {
	if (Array.isArray(template.pages) && template.pages.length > 0) {
		return template.pages.map((page, index) =>
			createPage(page || {}, index)
		);
	}

	return [
		createPage(
			{
				id: "page-1",
				name: "Page 1",
				elements: Array.isArray(template.elements)
					? template.elements
					: [],
			},
			0
		),
	];
}

const initialElements = [
	{
		id: "heading-1",
		type: "text",
		x: 70,
		y: 45,
		width: 650,
		height: 45,
		content: "STUDENT PROGRESS REPORT",
		fontSize: 25,
		fontFamily: "Arial",
		color: "#172554",
		bold: true,
		align: "center",
	},
	{
		id: "name-1",
		type: "field",
		x: 60,
		y: 125,
		width: 320,
		height: 30,
		field: "studentName",
		content: "Student Name",
		fontSize: 16,
		fontFamily: "Arial",
		color: "#111827",
		bold: true,
		align: "left",
	},
	{
		id: "admission-1",
		type: "field",
		x: 60,
		y: 160,
		width: 320,
		height: 28,
		field: "admissionNo",
		content: "Admission No",
		fontSize: 14,
		fontFamily: "Arial",
		color: "#111827",
		bold: false,
		align: "left",
	},
	{
		id: "class-1",
		type: "field",
		x: 60,
		y: 195,
		width: 320,
		height: 28,
		field: "className",
		content: "Class",
		fontSize: 14,
		fontFamily: "Arial",
		color: "#111827",
		bold: false,
		align: "left",
	},
	{
		id: "photo-1",
		type: "image",
		x: 620,
		y: 110,
		width: 100,
		height: 100,
		src: "",
		field: "studentPhoto",
		alt: "Student photo",
		objectFit: "contain",
	},
	{
		id: "subject-table",
		type: "table",
		x: 30,
		y: 250,
		width: 734,
		height: 240,
		rowHeight: 30,
		field: "subjects",
		columns: [
			{ header: "Subject", field: "subjectName", width: 334 },
			{ header: "Maximum Marks", field: "maxMarks", width: 200 },
			{ header: "Marks Obtained", field: "marksObtained", width: 200 },
		],
	},
];

const createId = () =>
	`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function makeElement(type) {
	const base = {
		id: createId(),
		type,
		x: 70,
		y: 250,
		width: type === "line" ? 500 : 250,
		height: type === "line" ? 4 : 45,
		fontSize: 16,
		fontFamily: "Arial",
		color: "#111827",
		bold: false,
		align: "left",
	};

	if (type === "text") {
		return { ...base, content: "New text element" };
	}

	if (type === "field") {
		return {
			...base,
			field: "studentName",
			content: "Student Name",
		};
	}

	if (type === "rectangle") {
		return {
			...base,
			height: 80,
			content: "",
			fill: "#ffffff",
			borderColor: "#374151",
			borderWidth: 1,
		};
	}

	if (type === "line") {
		return {
			...base,
			height: 4,
			color: "#374151",
		};
	}

	if (type === "image") {
		return {
			id: crypto.randomUUID(),
			type: "image",
			x: 50,
			y: 100,
			width: 100,
			height: 100,
			src: "",
			field: "",
			alt: "Report image",
			objectFit: "contain",
		};
	}

	if (type === "table") {
		return {
			id: crypto.randomUUID(),
			type: "table",
			x: 30,
			y: 250,
			width: 734,
			height: 200,
			rowHeight: 30,
			field: "subjects",
			columns: [
				{ header: "Subject", field: "subjectName", width: 434 },
				{ header: "Maximum Marks", field: "maxMarks", width: 150 },
				{ header: "Marks Obtained", field: "marksObtained", width: 150 },
			],
		};
	}

	return base;
}

function App() {
	const [name, setName] = useState("Student Progress Report");
	const [pages, setPages] = useState([
		createPage({ id: "page-1", name: "Page 1", elements: initialElements }, 0),
	]);
	const [activePageId, setActivePageId] = useState("page-1");
	const [selectedId, setSelectedId] = useState("heading-1");
	const [status, setStatus] = useState("");
	const [sessionId, setSessionId] = useState("");
	const [excelHeaders, setExcelHeaders] = useState([]);
	const [excelRows, setExcelRows] = useState([]);
	const [selectedRowIndex, setSelectedRowIndex] = useState(0);
	const [previewMode, setPreviewMode] = useState(false);
	const [dataStatus, setDataStatus] = useState("");
	const [saveStatus, setSaveStatus] = useState("");
	const [header, setHeader] = useState(DEFAULT_HEADER);
	const [footer, setFooter] = useState(DEFAULT_FOOTER);
	const [pageNumber, setPageNumber] = useState(DEFAULT_PAGE_NUMBER);

	const activePage =
		pages.find((page) => page.id === activePageId) || pages[0];
	const elements = activePage?.elements || [];
	const activePageIndex = Math.max(
		0,
		pages.findIndex((page) => page.id === activePage?.id)
	);

	useEffect(() => {
		async function loadSavedTemplate() {
			try {
				const response = await fetch(`/api/templates/${TEMPLATE_ID}`);

				if (!response.ok) return;

				const template = await response.json();
				const nextPages = normalizeTemplatePages(template);

				setName(template.name || "Student Progress Report");
				setPages(nextPages);
				setActivePageId(nextPages[0]?.id || "page-1");
				setSelectedId(nextPages[0]?.elements?.[0]?.id || null);
				setHeader(normalizeBand(template.header || {}, DEFAULT_HEADER));
				setFooter(normalizeBand(template.footer || {}, DEFAULT_FOOTER));
				setPageNumber(
					normalizePageNumber(template.pageNumber || {}, DEFAULT_PAGE_NUMBER)
				);
			} catch {
				// Keep local defaults when the template is missing.
			}
		}

		loadSavedTemplate();
	}, []);

	async function loadExcelData() {
		if (!sessionId.trim()) {
			setDataStatus("Enter the Excel upload session ID.");
			return;
		}

		try {
			setDataStatus("Loading Excel data...");

			const response = await fetch(
				`/api/sessions/${encodeURIComponent(sessionId.trim())}/normalized-preview`
			);

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || "Failed to load Excel data");
			}

			// Support common response formats.
			const rows =
				result.rows ??
				result.data ??
				result.preview ??
				[];

			if (!Array.isArray(rows)) {
				throw new Error("The API did not return an array of rows.");
			}

			const sample = rows[0] && !Array.isArray(rows[0]) ? rows[0] : null;
			const headers =
				result.headers ??
				result.columns ??
				(sample
					? Object.keys(sample)
					: []);

			const scalarHeaders = headers.filter((header) => {
				if (!sample) return header !== "subjects";
				return !Array.isArray(sample[header]);
			});

			setExcelHeaders(scalarHeaders);
			setExcelRows(rows);
			setSelectedRowIndex(0);

			const modeNote =
				result.mode === "students-subjects"
					? " (Students + Subjects joined)"
					: "";

			setDataStatus(`Loaded ${rows.length} student rows${modeNote}.`);
		} catch (error) {
			setExcelHeaders([]);
			setExcelRows([]);
			setDataStatus(`Error: ${error.message}`);
		}
	}

	const currentPreviewRow = excelRows[selectedRowIndex] ?? null;

	const runtimePreviewPages = useMemo(() => {
		if (!previewMode || !currentPreviewRow) return null;

		return paginatePagesForTables(pages, currentPreviewRow, PAGE.height);
	}, [previewMode, currentPreviewRow, pages]);

	const designedPageCount = pages.filter(
		(page) => (page.elements || []).length > 0
	).length;
	const showRuntimePagination =
		Boolean(runtimePreviewPages) &&
		runtimePreviewPages.length > Math.max(1, designedPageCount);

	function getFieldValue(field) {
		if (!currentPreviewRow || !field) return "";

		if (Array.isArray(currentPreviewRow)) {
			const index = excelHeaders.indexOf(field);
			return index >= 0
				? String(currentPreviewRow[index] ?? "")
				: "";
		}

		return String(currentPreviewRow[field] ?? "");
	}

	const selected = elements.find(
		(element) => element.id === selectedId
	);

	function updateActivePageElements(updater) {
		setPages((currentPages) =>
			currentPages.map((page) => {
				if (page.id !== (activePage?.id || activePageId)) {
					return page;
				}

				const nextElements =
					typeof updater === "function"
						? updater(page.elements || [])
						: updater;

				return {
					...page,
					elements: nextElements,
				};
			})
		);
	}

	function updateElement(id, changes) {
		updateActivePageElements((current) =>
			current.map((element) =>
				element.id === id
					? { ...element, ...changes }
					: element
			)
		);
	}

	function addElement(type) {
		const element = makeElement(type);

		updateActivePageElements((current) => [...current, element]);
		setSelectedId(element.id);
		setStatus("");
	}

	function removeSelected() {
		if (!selectedId) return;

		updateActivePageElements((current) =>
			current.filter((element) => element.id !== selectedId)
		);

		setSelectedId(null);
	}

	function selectPage(pageId) {
		if (!pageId || pageId === activePageId) return;

		setActivePageId(pageId);
		setSelectedId(null);
		setStatus("");
	}

	function addPage() {
		const nextIndex = pages.length;
		const newPage = createPage(
			{
				name: `Page ${nextIndex + 1}`,
				elements: [],
			},
			nextIndex
		);

		setPages((current) => [...current, newPage]);
		setActivePageId(newPage.id);
		setSelectedId(null);
		setStatus(`Added ${newPage.name}.`);
	}

	function deleteActivePage() {
		if (pages.length <= 1) {
			setStatus("At least one page is required.");
			return;
		}

		const remaining = pages.filter((page) => page.id !== activePage?.id);

		const renumbered = remaining.map((page, index) => ({
			...page,
			name: page.name?.startsWith("Page ")
				? `Page ${index + 1}`
				: page.name,
		}));

		setPages(renumbered);
		setActivePageId(renumbered[Math.max(0, activePageIndex - 1)]?.id);
		setSelectedId(null);
		setStatus("Page deleted.");
	}

	async function saveTemplate() {
		setStatus("Saving...");

		const normalizedPages = normalizeTemplatePages({ pages });

		const template = {
			id: TEMPLATE_ID,
			name,
			page: PAGE,
			pages: normalizedPages,
			// Legacy single-page alias for older readers.
			elements: normalizedPages[0]?.elements || [],
			header,
			footer,
			pageNumber,
		};

		try {
			const response = await fetch("/api/templates", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(template),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(
					result.message || "Unable to save template"
				);
			}

			setStatus("Template saved successfully.");
		} catch (error) {
			setStatus(
				`Save failed: ${error.message}. Check that the backend is running.`
			);
		}
	}

	function renderElement(element) {
		if (element.type === "line") {
			return (
				<div
					style={{
						width: "100%",
						height: "100%",
						backgroundColor: element.color,
					}}
				/>
			);
		}

		if (element.type === "rectangle") {
			return (
				<div
					style={{
						width: "100%",
						height: "100%",
						backgroundColor: element.fill,
						border: `${element.borderWidth}px solid ${element.borderColor}`,
						boxSizing: "border-box",
					}}
				/>
			);
		}

		if (element.type === "image") {
			const imageSrc =
				(previewMode && element.field
					? getFieldValue(element.field)
					: "") ||
				element.src ||
				"";

			return imageSrc ? (
				<img
					src={imageSrc}
					alt={element.alt || "Report image"}
					draggable={false}
					style={{
						width: "100%",
						height: "100%",
						objectFit: element.objectFit || "contain",
						background: "#f1f1f1",
					}}
				/>
			) : (
				<div className="image-placeholder">
					<span>Image placeholder</span>
				</div>
			);
		}

		if (element.type === "table") {
			const columns = element.columns || [];
			const tableRows = previewMode
				? getTableRows(element, currentPreviewRow || {})
				: [];

			return (
				<div style={{ width: "100%", overflow: "visible" }}>
					<table
						style={{
							width: "100%",
							borderCollapse: "collapse",
							fontSize: 12,
							tableLayout: "fixed",
						}}
					>
						<thead>
							<tr>
								{columns.map((column, index) => (
									<th
										key={index}
										style={{
											border: "1px solid #333",
											padding: 4,
											background: "#f0f0f0",
											width: column.width || undefined,
											height: element.rowHeight || 30,
										}}
									>
										{column.header}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{previewMode ? (
								tableRows.length ? (
									tableRows.map((item, rowIndex) => (
										<tr key={rowIndex}>
											{columns.map((column, colIndex) => (
												<td
													key={colIndex}
													style={{
														border: "1px solid #333",
														padding: 4,
														height: element.rowHeight || 30,
													}}
												>
													{item?.[column.field] ?? ""}
												</td>
											))}
										</tr>
									))
								) : (
									<tr>
										<td
											colSpan={Math.max(1, columns.length)}
											style={{ border: "1px solid #333", padding: 4 }}
										>
											No rows in {element.field || "table"}
										</td>
									</tr>
								)
							) : (
								<tr>
									<td
										colSpan={Math.max(1, columns.length)}
										style={{ border: "1px solid #333", padding: 4 }}
									>
										{`{{${element.field || "subjects"}}}`} repeating rows
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			);
		}

		const isField = element.type === "field";

		const displayText =
			isField && previewMode
				? getFieldValue(element.field)
				: isField
					? `{{${element.field || "fieldName"}}}`
					: element.content;

		return (
			<div
				className="element-text"
				style={{
					fontSize: `${element.fontSize}px`,
					fontFamily: element.fontFamily,
					color: element.color,
					fontWeight: element.bold ? "bold" : "normal",
					textAlign: element.align,
				}}
			>
				{displayText}
			</div>
		);
	}


	async function readErrorMessage(response, fallback) {
		const contentType = response.headers.get("content-type") || "";
		const text = await response.text();

		if (contentType.includes("application/json")) {
			try {
				const error = JSON.parse(text);
				return error.message || fallback;
			} catch {
				return fallback;
			}
		}

		if (text.includes("Cannot POST") || text.includes("Cannot GET")) {
			return "PDF API route not found. Restart the backend server (npm start).";
		}

		return text.slice(0, 160) || fallback;
	}

	async function downloadPdf() {
		if (!currentPreviewRow) {
			setSaveStatus("Load Excel data and select a student first.");
			return;
		}

		try {
			setSaveStatus("Generating PDF...");

			const response = await fetch(
				`/api/templates/${TEMPLATE_ID}/pdf`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ row: currentPreviewRow }),
				}
			);

			if (!response.ok) {
				throw new Error(
					await readErrorMessage(response, "PDF generation failed")
				);
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");

			link.href = url;
			link.download = "student-report.pdf";
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);

			setSaveStatus("PDF downloaded successfully.");
		} catch (error) {
			setSaveStatus(`PDF error: ${error.message}`);
		}
	}

	async function downloadAllPdfs() {
		if (excelRows.length === 0) {
			setSaveStatus("Load Excel data before generating reports.");
			return;
		}

		if (excelRows.length > 100) {
			setSaveStatus(
				"This starter supports up to 100 students per ZIP. " +
				"Use a smaller selection for now."
			);
			return;
		}

		try {
			setSaveStatus(`Generating ${excelRows.length} student reports...`);

			const response = await fetch(
				`/api/templates/${TEMPLATE_ID}/batch-pdf`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ rows: excelRows }),
				}
			);

			if (!response.ok) {
				throw new Error(
					await readErrorMessage(response, "Batch generation failed")
				);
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");

			link.href = url;
			link.download = "student-reports.zip";
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);

			setSaveStatus("Student report ZIP downloaded successfully.");
		} catch (error) {
			setSaveStatus(`Batch PDF error: ${error.message}`);
		}
	}


	return (
		<div className="app">
			<header className="topbar">
				<div>
					<strong>PDF Template Designer</strong>
					<div className="subtitle">
						Design a reusable report layout
					</div>
				</div>

				<div className="topbar-actions">
					<input
						className="template-name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						aria-label="Template name"
						placeholder="Template name"
					/>

					<button className="primary-button" onClick={saveTemplate}>
						Save Template
					</button>
					<button
						onClick={downloadPdf}
						disabled={!currentPreviewRow}
					>
						Download Student PDF
					</button>

					<button
						onClick={downloadAllPdfs}
						disabled={excelRows.length === 0}
					>
						Download All PDFs (ZIP)
					</button>
				</div>

				{saveStatus && <p className="status">{saveStatus}</p>}
			</header>

			<div className="excel-toolbar">
				<label>
					Excel session ID
					<input
						value={sessionId}
						onChange={(event) => setSessionId(event.target.value)}
						placeholder="Paste the upload session ID"
					/>
				</label>

				<button onClick={loadExcelData}>
					Load Excel data
				</button>

				<label>
					Preview student
					<select
						value={selectedRowIndex}
						onChange={(event) =>
							setSelectedRowIndex(Number(event.target.value))
						}
						disabled={!excelRows.length}
					>
						{excelRows.map((row, index) => (
							<option key={index} value={index}>
								{Array.isArray(row)
									? `Row ${index + 1}`
									: row.studentName ||
									row["Student Name"] ||
									`Row ${index + 1}`}
							</option>
						))}
					</select>
				</label>

				<label className="preview-toggle">
					<input
						type="checkbox"
						checked={previewMode}
						onChange={(event) => setPreviewMode(event.target.checked)}
						disabled={!excelRows.length}
					/>
					Preview real data
				</label>

				<span className="data-status">{dataStatus}</span>
			</div>



			<div className="workspace">
				<aside className="sidebar">
					<h3>Add elements</h3>

					<button onClick={() => addElement("text")}>
						+ Text
					</button>

					<button onClick={() => addElement("field")}>
						+ Excel field
					</button>

					<button onClick={() => addElement("rectangle")}>
						+ Rectangle
					</button>

					<button onClick={() => addElement("line")}>
						+ Line
					</button>

					<button onClick={() => addElement("image")}>
						+ Image
					</button>

					<button onClick={() => addElement("table")}>
						+ Table
					</button>

					<hr />

					<h3>Pages</h3>
					<p>A4 portrait · 794 × 1123 px</p>

					<div className="page-list" role="tablist" aria-label="Template pages">
						{pages.map((page, index) => (
							<button
								key={page.id}
								type="button"
								role="tab"
								aria-selected={page.id === activePage?.id}
								className={
									page.id === activePage?.id
										? "page-tab active"
										: "page-tab"
								}
								onClick={() => selectPage(page.id)}
							>
								{page.name || `Page ${index + 1}`}
								<span className="page-tab-count">
									{(page.elements || []).length}
								</span>
							</button>
						))}
					</div>

					<button type="button" onClick={addPage}>
						+ Add Page
					</button>

					<button
						type="button"
						className="danger-button"
						onClick={deleteActivePage}
						disabled={pages.length <= 1}
					>
						Delete page
					</button>

					{showRuntimePagination && (
						<div className="runtime-pages-note">
							<p className="hint">
								Preview adds {runtimePreviewPages.length - designedPageCount}{" "}
								auto page
								{runtimePreviewPages.length - designedPageCount === 1
									? ""
									: "s"}{" "}
								because the table overflows A4.
							</p>
							<div className="page-list runtime-page-list">
								{runtimePreviewPages.map((page, index) => (
									<div
										key={page.id}
										className={
											page._autoGenerated
												? "page-tab runtime-tab auto"
												: "page-tab runtime-tab"
										}
									>
										{page._autoGenerated
											? `Auto ${index + 1}`
											: page.name || `Page ${index + 1}`}
										<span className="page-tab-count">
											{index + 1}/{runtimePreviewPages.length}
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					<p className="hint">
						Enable <strong>Preview real data</strong> to see
						auto-added pages when a table exceeds one A4 sheet.
					</p>

					<hr />

					<h3>Header / Footer</h3>

					<label className="checkbox-label">
						<input
							type="checkbox"
							checked={header.enabled}
							onChange={(event) =>
								setHeader((current) => ({
									...current,
									enabled: event.target.checked,
								}))
							}
						/>
						Header
					</label>

					{header.enabled && (
						<>
							<label>
								Header center
								<input
									value={header.center}
									onChange={(event) =>
										setHeader((current) => ({
											...current,
											center: event.target.value,
										}))
									}
									placeholder="Report title"
								/>
							</label>
							<label>
								Header left
								<input
									value={header.left}
									onChange={(event) =>
										setHeader((current) => ({
											...current,
											left: event.target.value,
										}))
									}
									placeholder="{{studentName}}"
								/>
							</label>
							<label>
								Header right
								<input
									value={header.right}
									onChange={(event) =>
										setHeader((current) => ({
											...current,
											right: event.target.value,
										}))
									}
								/>
							</label>
						</>
					)}

					<label className="checkbox-label">
						<input
							type="checkbox"
							checked={footer.enabled}
							onChange={(event) =>
								setFooter((current) => ({
									...current,
									enabled: event.target.checked,
								}))
							}
						/>
						Footer
					</label>

					{footer.enabled && (
						<label>
							Footer center
							<input
								value={footer.center}
								onChange={(event) =>
									setFooter((current) => ({
										...current,
										center: event.target.value,
									}))
								}
								placeholder="Confidential"
							/>
						</label>
					)}

					<label className="checkbox-label">
						<input
							type="checkbox"
							checked={pageNumber.enabled}
							onChange={(event) =>
								setPageNumber((current) => ({
									...current,
									enabled: event.target.checked,
								}))
							}
						/>
						Page numbers
					</label>

					{pageNumber.enabled && (
						<>
							<label>
								Format
								<input
									value={pageNumber.format}
									onChange={(event) =>
										setPageNumber((current) => ({
											...current,
											format: event.target.value,
										}))
									}
									placeholder="Page {{page}} of {{pages}}"
								/>
							</label>
							<label>
								Align
								<select
									value={pageNumber.align}
									onChange={(event) =>
										setPageNumber((current) => ({
											...current,
											align: event.target.value,
										}))
									}
								>
									<option value="left">Left</option>
									<option value="center">Center</option>
									<option value="right">Right</option>
								</select>
							</label>
						</>
					)}

					<p className="hint">
						Tokens: {"{{page}}"}, {"{{pages}}"}, {"{{studentName}}"},
						{"{{admissionNo}}"}, {"{{className}}"}
					</p>
				</aside>

				<main className="canvas-area">
					<div className="canvas-caption">
						{previewMode && runtimePreviewPages ? (
							<>
								PDF preview · {runtimePreviewPages.length} page
								{runtimePreviewPages.length === 1 ? "" : "s"}
								{showRuntimePagination
									? " · table overflow pagination active"
									: ""}
							</>
						) : (
							<>
								A4 canvas · {activePage?.name || "Page 1"} ·{" "}
								{elements.length} elements · {pages.length} page
								{pages.length === 1 ? "" : "s"}
							</>
						)}
					</div>

					<div className="canvas-viewport">
						{previewMode && runtimePreviewPages ? (
							<div className="runtime-page-stack">
								{runtimePreviewPages.map((page, pageIndex) => (
									<div
										key={page.id}
										className={
											page._autoGenerated
												? "runtime-page-card auto"
												: "runtime-page-card"
										}
									>
										<div className="runtime-page-label">
											{page._autoGenerated
												? `${page.name || "Continued"} · auto-added`
												: page.name || `Page ${pageIndex + 1}`}
											<span>
												Page {pageIndex + 1} of{" "}
												{runtimePreviewPages.length}
											</span>
										</div>
										<div
											className="page preview-page"
											style={{
												width: PAGE.width,
												height: PAGE.height,
											}}
										>
											{header.enabled &&
												!(pageIndex === 0 && !header.showOnFirstPage) && (
													<div
														className="preview-band preview-header"
														style={{
															height: header.height,
															fontSize: header.fontSize,
															color: header.color,
														}}
													>
														<span>
															{resolvePreviewText(
																header.left,
																currentPreviewRow,
																pageIndex + 1,
																runtimePreviewPages.length
															)}
														</span>
														<span>
															{resolvePreviewText(
																header.center,
																currentPreviewRow,
																pageIndex + 1,
																runtimePreviewPages.length
															)}
														</span>
														<span>
															{resolvePreviewText(
																header.right,
																currentPreviewRow,
																pageIndex + 1,
																runtimePreviewPages.length
															)}
														</span>
													</div>
												)}

											{(page.elements || []).map((element) => {
												const tableRows =
													element.type === "table"
														? getTableRows(
															element,
															currentPreviewRow || {}
														)
														: null;
												const tableHeight =
													element.type === "table"
														? (element.rowHeight || 30) *
														(1 + (tableRows?.length || 0))
														: element.height;

												return (
													<div
														key={`${page.id}-${element.id}`}
														className="preview-element"
														style={{
															left: element.x,
															top: element.y,
															width: element.width,
															height:
																element.type === "table"
																	? tableHeight
																	: element.height,
														}}
													>
														{renderElement(element)}
													</div>
												);
											})}

											{footer.enabled &&
												!(pageIndex === 0 && !footer.showOnFirstPage) && (
													<div
														className="preview-band preview-footer"
														style={{
															height: footer.height,
															fontSize: footer.fontSize,
															color: footer.color,
														}}
													>
														<span>
															{resolvePreviewText(
																footer.left,
																currentPreviewRow,
																pageIndex + 1,
																runtimePreviewPages.length
															)}
														</span>
														<span>
															{resolvePreviewText(
																footer.center,
																currentPreviewRow,
																pageIndex + 1,
																runtimePreviewPages.length
															)}
														</span>
														<span>
															{resolvePreviewText(
																footer.right,
																currentPreviewRow,
																pageIndex + 1,
																runtimePreviewPages.length
															)}
														</span>
													</div>
												)}

											{pageNumber.enabled &&
												!(pageIndex === 0 && !pageNumber.showOnFirstPage) && (
													<div
														className="preview-page-number"
														style={{
															justifyContent:
																pageNumber.align === "left"
																	? "flex-start"
																	: pageNumber.align === "center"
																		? "center"
																		: "flex-end",
															fontSize: pageNumber.fontSize,
															color: pageNumber.color,
															bottom: Math.max(
																10,
																Math.round(
																	((footer.enabled
																		? footer.height
																		: 36) /
																		2) -
																	6
																)
															),
														}}
													>
														{resolvePreviewText(
															pageNumber.format,
															currentPreviewRow,
															pageIndex + 1,
															runtimePreviewPages.length
														)}
													</div>
												)}
										</div>
									</div>
								))}
							</div>
						) : (
							<div
								key={activePage?.id || "page"}
								className="page"
								style={{
									width: PAGE.width,
									height: PAGE.height,
									margin: "0 auto",
								}}
								onClick={() => setSelectedId(null)}
							>
								{elements.map((element) => (
									<Rnd
										key={`${activePage?.id}-${element.id}`}
										bounds="parent"
										position={{ x: element.x, y: element.y }}
										size={{
											width: element.width,
											height: element.height,
										}}
										onDragStart={(event) => event.stopPropagation()}
										onDragStop={(event, position) => {
											updateElement(element.id, {
												x: Math.round(position.x),
												y: Math.round(position.y),
											});
										}}
										onResizeStop={(
											event,
											direction,
											ref,
											delta,
											position
										) => {
											updateElement(element.id, {
												x: Math.round(position.x),
												y: Math.round(position.y),
												width: Math.round(ref.offsetWidth),
												height: Math.round(ref.offsetHeight),
											});
										}}
										onClick={(event) => {
											event.stopPropagation();
											setSelectedId(element.id);
										}}
										onMouseDown={(event) => {
											event.stopPropagation();
											setSelectedId(element.id);
										}}
										className={
											selectedId === element.id
												? "design-element selected"
												: "design-element"
										}
										style={{
											zIndex: selectedId === element.id ? 2 : 1,
										}}
										resizeHandleStyles={{
											right: { right: -5 },
											left: { left: -5 },
											top: { top: -5 },
											bottom: { bottom: -5 },
										}}
									>
										{renderElement(element)}
									</Rnd>
								))}
							</div>
						)}
					</div>
				</main>

				<aside className="properties">
					<h3>Properties</h3>

					{!selected && (
						<p className="hint">
							Select an element on the page to edit its properties.
						</p>
					)}

					{selected && (
						<>
							<label>
								Element type
								<input value={selected.type} disabled />
							</label>

							{selected.type === "text" && (
								<label>
									Text
									<textarea
										value={selected.content || ""}
										onChange={(event) =>
											updateElement(selected.id, {
												content: event.target.value,
											})
										}
									/>
								</label>
							)}


							{selected.type === "field" && (
								<>
									<label>
										Excel field
										<select
											value={selected.field || ""}
											onChange={(event) => {
												const field = event.target.value;

												updateElement(selected.id, {
													field,
													content: field,
												});
											}}
										>
											<option value="">Select an Excel field</option>

											{excelHeaders.map((header) => (
												<option key={header} value={header}>
													{header}
												</option>
											))}
										</select>
									</label>

									<p className="hint">
										Select the Excel column whose value should appear in this
										report element.
									</p>
								</>
							)}


							{selected.type === "image" && (
								<>
									<label>
										Image URL or data URI
										<input
											value={selected.src || ""}
											onChange={(event) =>
												updateElement(selected.id, {
													src: event.target.value,
													field: "",
												})
											}
											placeholder="https://qa.schoolforschools.ai/assets/user-placeholder--3o1MXL2.jpg"
										/>
									</label>

									<label>
										Image field from Excel data
										<input
											value={selected.field || ""}
											onChange={(event) =>
												updateElement(selected.id, {
													field: event.target.value,
													src: "",
												})
											}
											placeholder="studentPhoto"
										/>
									</label>

									<label>
										Fit
										<select
											value={selected.objectFit || "contain"}
											onChange={(event) =>
												updateElement(selected.id, {
													objectFit: event.target.value,
												})
											}
										>
											<option value="contain">Contain</option>
											<option value="cover">Cover</option>
											<option value="fill">Fill</option>
										</select>
									</label>
								</>
							)}

							{selected.type === "table" && (
								<>
									<label>
										Repeating data field
										<select
											value={selected.field || "subjects"}
											onChange={(event) =>
												updateElement(selected.id, {
													field: event.target.value,
												})
											}
										>
											<option value="subjects">subjects</option>
										</select>
									</label>

									<label>
										Row height
										<input
											type="number"
											min="16"
											max="200"
											value={selected.rowHeight || 30}
											onChange={(event) =>
												updateElement(selected.id, {
													rowHeight: Number(event.target.value),
												})
											}
										/>
									</label>

									<p className="hint">
										Uses the Subjects sheet rows linked by admissionNo.
										Columns: subjectName, maxMarks, marksObtained.
									</p>
								</>
							)}

							{selected.type === "rectangle" && (
								<>
									<label>
										Fill color
										<input
											type="color"
											value={selected.fill || "#ffffff"}
											onChange={(event) =>
												updateElement(selected.id, {
													fill: event.target.value,
												})
											}
										/>
									</label>

									<label>
										Border color
										<input
											type="color"
											value={selected.borderColor || "#374151"}
											onChange={(event) =>
												updateElement(selected.id, {
													borderColor: event.target.value,
												})
											}
										/>
									</label>

									<label>
										Border width
										<input
											type="number"
											min="0"
											max="10"
											value={selected.borderWidth ?? 1}
											onChange={(event) =>
												updateElement(selected.id, {
													borderWidth: Number(event.target.value),
												})
											}
										/>
									</label>
								</>
							)}

							{(selected.type === "text" ||
								selected.type === "field") && (
									<>
										<label>
											Font family
											<select
												value={selected.fontFamily || "Arial"}
												onChange={(event) =>
													updateElement(selected.id, {
														fontFamily: event.target.value,
													})
												}
											>
												<option>Arial</option>
												<option>Helvetica</option>
												<option>Times New Roman</option>
												<option>Georgia</option>
												<option>Verdana</option>
											</select>
										</label>

										<label>
											Font size
											<input
												type="number"
												min="6"
												max="96"
												value={selected.fontSize ?? 16}
												onChange={(event) =>
													updateElement(selected.id, {
														fontSize: Number(event.target.value),
													})
												}
											/>
										</label>

										<label>
											Text color
											<input
												type="color"
												value={selected.color || "#111827"}
												onChange={(event) =>
													updateElement(selected.id, {
														color: event.target.value,
													})
												}
											/>
										</label>

										<label>
											Alignment
											<select
												value={selected.align || "left"}
												onChange={(event) =>
													updateElement(selected.id, {
														align: event.target.value,
													})
												}
											>
												<option value="left">Left</option>
												<option value="center">Center</option>
												<option value="right">Right</option>
											</select>
										</label>

										<label className="checkbox-label">
											<input
												type="checkbox"
												checked={Boolean(selected.bold)}
												onChange={(event) =>
													updateElement(selected.id, {
														bold: event.target.checked,
													})
												}
											/>
											Bold
										</label>
									</>
								)}

							<hr />

							<h4>Position and size (px)</h4>

							<div className="number-grid">
								{["x", "y", "width", "height"].map((key) => (
									<label key={key}>
										{key.toUpperCase()}
										<input
											type="number"
											min="0"
											max={key === "x" || key === "width"
												? PAGE.width
												: PAGE.height}
											value={selected[key]}
											onChange={(event) => {
												const value = Number(event.target.value);

												if (key === "width" || key === "height") {
													updateElement(selected.id, {
														[key]: Math.max(1, value),
													});
												} else {
													updateElement(selected.id, {
														[key]: Math.max(0, value),
													});
												}
											}}
										/>
									</label>
								))}
							</div>

							<button className="danger-button" onClick={removeSelected}>
								Delete element
							</button>
						</>
					)}

					{status && <p className="status">{status}</p>}
				</aside>
			</div>
		</div>
	);
}

export default App;

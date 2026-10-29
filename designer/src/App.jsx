
import { useState } from "react";
import { Rnd } from "react-rnd";
import "./App.css";


const PAGE = {
	width: 794,
	height: 1123,
	size: "A4",
	orientation: "portrait",
	unit: "px",
};

const TEMPLATE_ID = "student-progress-report";

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
		id: "class-1",
		type: "field",
		x: 60,
		y: 170,
		width: 320,
		height: 30,
		field: "className",
		content: "Class",
		fontSize: 14,
		fontFamily: "Arial",
		color: "#111827",
		bold: false,
		align: "left",
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
			...base,
			width: 120,
			height: 120,
			content: "",
			alt: "Image placeholder",
		};
	}

	return base;
}

function App() {
	const [name, setName] = useState("Student Progress Report");
	const [elements, setElements] = useState(initialElements);
	const [selectedId, setSelectedId] = useState("heading-1");
	const [status, setStatus] = useState("");
	const [sessionId, setSessionId] = useState("");
	const [excelHeaders, setExcelHeaders] = useState([]);
	const [excelRows, setExcelRows] = useState([]);
	const [selectedRowIndex, setSelectedRowIndex] = useState(0);
	const [previewMode, setPreviewMode] = useState(false);
	const [dataStatus, setDataStatus] = useState("");
	const [saveStatus, setSaveStatus] = useState("");

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

			const headers =
				result.headers ??
				result.columns ??
				(rows.length && !Array.isArray(rows[0])
					? Object.keys(rows[0])
					: []);

			setExcelHeaders(headers);
			setExcelRows(rows);
			setSelectedRowIndex(0);
			setDataStatus(`Loaded ${rows.length} Excel rows.`);
		} catch (error) {
			setExcelHeaders([]);
			setExcelRows([]);
			setDataStatus(`Error: ${error.message}`);
		}
	}

	const currentPreviewRow = excelRows[selectedRowIndex] ?? null;

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

	function updateElement(id, changes) {
		setElements((current) =>
			current.map((element) =>
				element.id === id
					? { ...element, ...changes }
					: element
			)
		);
	}

	function addElement(type) {
		const element = makeElement(type);

		setElements((current) => [...current, element]);
		setSelectedId(element.id);
		setStatus("");
	}

	function removeSelected() {
		if (!selectedId) return;

		setElements((current) =>
			current.filter((element) => element.id !== selectedId)
		);

		setSelectedId(null);
	}

	async function saveTemplate() {
		setStatus("Saving...");

		const template = {
			id: TEMPLATE_ID,
			name,
			page: PAGE,
			elements,
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
			return (
				<div className="image-placeholder">
					{element.content ? (
						<img
							src={element.content}
							alt={element.alt || "Template image"}
						/>
					) : (
						<span>Image placeholder</span>
					)}
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
						+ Image placeholder
					</button>

					<hr />

					<h3>Page</h3>
					<p>A4 portrait</p>
					<p>794 × 1123 px</p>
					<p className="hint">
						Drag elements to reposition them. Drag their corners
						to resize.
					</p>
				</aside>

				<main className="canvas-area">
					<div className="canvas-caption">
						A4 canvas · {elements.length} elements
					</div>

					<div className="canvas-viewport">
						<div
							className="page"
							style={{
								width: PAGE.width,
								height: PAGE.height,
							}}
							onClick={() => setSelectedId(null)}
						>
							{elements.map((element) => (
								<Rnd
									key={element.id}
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
											width: Math.round(
												ref.offsetWidth
											),
											height: Math.round(
												ref.offsetHeight
											),
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
										Image URL
										<input
											value={selected.content || ""}
											placeholder="https://example.com/logo.png"
											onChange={(event) =>
												updateElement(selected.id, {
													content: event.target.value,
												})
											}
										/>
									</label>

									<label>
										Alternative text
										<input
											value={selected.alt || ""}
											onChange={(event) =>
												updateElement(selected.id, {
													alt: event.target.value,
												})
											}
										/>
									</label>
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

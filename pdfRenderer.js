
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };

        return entities[char];
    });
}

function cssColor(value, fallback = "#000000") {
    return /^#[0-9a-fA-F]{3,8}$/.test(value || "")
        ? value
        : fallback;
}

function cssNumber(value, fallback = 0, min = 0, max = 10000) {
    const number = Number(value);

    if (!Number.isFinite(number)) return fallback;

    return Math.min(max, Math.max(min, number));
}

function safeImageSource(src) {
    if (typeof src !== "string") return "";

    const value = src.trim();

    if (!value) return "";

    // Allow embedded images (PNG/JPEG/GIF/WebP).
    if (
        /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-zA-Z0-9+/=\s]+$/i.test(
            value
        )
    ) {
        return value.replace(/\s/g, "");
    }

    try {
        const url = new URL(value);

        // Allow http(s) remote images used in report templates.
        if (url.protocol === "https:" || url.protocol === "http:") {
            return url.href;
        }
    } catch {
        // Invalid URL.
    }

    return "";
}

function resolveImageSource(element, row = {}) {
    const fieldValue =
        typeof element.field === "string" &&
            element.field &&
            row[element.field] != null &&
            String(row[element.field]).trim() !== ""
            ? row[element.field]
            : "";

    return safeImageSource(
        fieldValue || element.src || element.content || ""
    );
}

function renderImage(element, row) {
    const src = resolveImageSource(element, row);

    const fit = ["contain", "cover", "fill", "none"].includes(element.objectFit)
        ? element.objectFit
        : "contain";

    if (!src) {
        return `
          <div style="
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            border:1px dashed #9ca3af;
            color:#6b7280;
            font-size:12px;
            background:#f9fafb;
          ">Image</div>
        `;
    }

    // Keep data URIs unescaped so base64 payloads stay valid.
    const safeSrc = src.startsWith("data:")
        ? src.replace(/"/g, "")
        : escapeHtml(src);

    return `
      <img
        src="${safeSrc}"
        alt="${escapeHtml(element.alt || "Report image")}"
        style="
          width: 100%;
          height: 100%;
          object-fit: ${fit};
          display: block;
        "
      />
    `;
}


function renderTable(element, row) {
    const field = typeof element.field === "string" ? element.field : "subjects";
    const tableRows = Array.isArray(row?.[field]) ? row[field] : [];
    const columns = Array.isArray(element.columns) ? element.columns : [];

    if (!columns.length) {
        return `<div>Table columns are not configured</div>`;
    }

    const width = cssNumber(element.width, 734, 1, 2000);
    const rowHeight = cssNumber(element.rowHeight, 30, 16, 200);
    const columnTotal = columns.reduce(
        (sum, column) => sum + Math.max(1, Number(column.width) || 1),
        0
    );

    const header = columns
        .map((column) => {
            const columnWidth =
                (Math.max(1, Number(column.width) || 1) / columnTotal) * 100;

            return `
        <th style="width:${columnWidth}%; height:${rowHeight}px">
          ${escapeHtml(column.header || "")}
        </th>
      `;
        })
        .join("");

    const body = tableRows.length
        ? tableRows
            .map((item) => {
                const cells = columns
                    .map(
                        (column) => `
          <td style="height:${rowHeight}px">
            ${escapeHtml(item?.[column.field] ?? "")}
          </td>
        `
                    )
                    .join("");

                return `<tr>${cells}</tr>`;
            })
            .join("")
        : `
        <tr>
          <td colspan="${columns.length}" style="height:${rowHeight}px">
            No subject rows
          </td>
        </tr>
      `;

    return `
      <table class="report-table" style="width:${width}px">
        <thead><tr>${header}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    `;
}


function renderElement(element, row) {
    const x = cssNumber(element.x);
    const y = cssNumber(element.y);
    const width = cssNumber(element.width, 100, 1, 10000);
    const height = cssNumber(element.height, 30, 1, 10000);

    if (element.type === "line") {
        return `
        <div style="
          position:absolute;
          left:${x}px;
          top:${y}px;
          width:${width}px;
          height:${Math.max(1, height)}px;
          border-top:${cssNumber(element.borderWidth, 1, 1, 20)}px
            solid ${cssColor(element.color)};
        "></div>
      `;
    }

    if (element.type === "rectangle") {
        return `
        <div style="
          position:absolute;
          left:${x}px;
          top:${y}px;
          width:${width}px;
          height:${height}px;
          box-sizing:border-box;
          border:${cssNumber(element.borderWidth, 1, 0, 20)}px
            solid ${cssColor(element.borderColor)};
          background:${cssColor(element.backgroundColor, "#ffffff")};
        "></div>
      `;
    }

    if (element.type === "image") {
        return `
        <div style="
          position:absolute;
          left:${x}px;
          top:${y}px;
          width:${width}px;
          height:${height}px;
          overflow:hidden;
        ">
          ${renderImage(element, row)}
        </div>
      `;
    }

    if (element.type === "table") {
        return `
          <div style="
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: ${width}px;
          ">
            ${renderTable(element, row)}
          </div>
        `;
    }

    const isField = element.type === "field";
    const rawValue = isField
        ? row[element.field]
        : element.content;

    const value = rawValue == null ? "" : String(rawValue);
    const fontSize = cssNumber(element.fontSize, 14, 6, 96);
    const fontFamily = [
        "Arial",
        "Helvetica",
        "Times New Roman",
        "Georgia",
        "Verdana",
    ].includes(element.fontFamily)
        ? element.fontFamily
        : "Arial";

    const align = ["left", "center", "right"].includes(element.align)
        ? element.align
        : "left";

    return `
      <div style="
        position:absolute;
        left:${x}px;
        top:${y}px;
        width:${width}px;
        min-height:${height}px;
        box-sizing:border-box;
        font-family:${fontFamily};
        font-size:${fontSize}px;
        font-weight:${element.bold ? "bold" : "normal"};
        color:${cssColor(element.color)};
        text-align:${align};
        white-space:pre-wrap;
        overflow-wrap:anywhere;
      ">${escapeHtml(value)}</div>
    `;
}

function renderTemplateHtml(template, row) {
    const pageWidth = cssNumber(template.page?.width, 794, 1, 5000);
    const pageHeight = cssNumber(template.page?.height, 1123, 1, 10000);
    const elements = Array.isArray(template.elements)
        ? template.elements
        : [];

    const content = elements
        .map((element) => renderElement(element, row))
        .join("");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 ${template.page?.orientation === "landscape"
            ? "landscape"
            : "portrait"};
              margin: 0;
            }
  
            * {
              box-sizing: border-box;
            }
  
            html, body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }
  
            .report-page {
              position: relative;
              width: ${pageWidth}px;
              height: ${pageHeight}px;
              overflow: visible;
              background: white;
            }
  
            .report-table {
              border-collapse: collapse;
              table-layout: fixed;
              font-family: Arial, sans-serif;
              font-size: 12px;
            }
  
            .report-table th,
            .report-table td {
              border: 1px solid #333;
              padding: 5px;
              text-align: left;
              overflow-wrap: anywhere;
            }
  
            .report-table th {
              background: #f0f0f0;
              font-weight: bold;
            }
  
            .report-table tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <main class="report-page">
            ${content}
          </main>
        </body>
      </html>
    `;
}

module.exports = { renderTemplateHtml };

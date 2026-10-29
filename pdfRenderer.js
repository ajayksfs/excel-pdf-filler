
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

function cssColor(value, fallback = "#111827") {
    // Only accept simple hex colors from saved template properties.
    return typeof value === "string" &&
        /^#[0-9a-fA-F]{3,8}$/.test(value)
        ? value
        : fallback;
}

function renderElement(element, row) {
    const x = Number(element.x) || 0;
    const y = Number(element.y) || 0;
    const width = Math.max(1, Number(element.width) || 1);
    const height = Math.max(1, Number(element.height) || 1);

    const positionStyle = [
        "position:absolute",
        `left:${x}px`,
        `top:${y}px`,
        `width:${width}px`,
        `height:${height}px`,
        "box-sizing:border-box",
    ].join(";");

    if (element.type === "line") {
        return `
        <div style="${positionStyle};
          background:${cssColor(element.color, "#374151")}">
        </div>
      `;
    }

    if (element.type === "rectangle") {
        const borderWidth = Math.min(
            10,
            Math.max(0, Number(element.borderWidth) || 0)
        );

        return `
        <div style="${positionStyle};
          background:${cssColor(element.fill, "#ffffff")};
          border:${borderWidth}px solid
            ${cssColor(element.borderColor, "#374151")}">
        </div>
      `;
    }

    if (element.type === "image") {
        // Image rendering is intentionally not enabled yet.
        // Add validated local assets or trusted image URLs in a later step.
        return `
        <div style="${positionStyle};
          border:1px dashed #9ca3af;
          display:flex;
          align-items:center;
          justify-content:center;
          color:#6b7280;
          font-size:12px">
          Image placeholder
        </div>
      `;
    }

    let value = "";

    if (element.type === "field") {
        const field = element.field;

        if (typeof field === "string" && field.length > 0) {
            value = row[field] ?? "";
        }
    } else {
        value = element.content ?? "";
    }

    const fontSize = Math.min(
        96,
        Math.max(6, Number(element.fontSize) || 16)
    );

    const allowedFonts = [
        "Arial",
        "Helvetica",
        "Times New Roman",
        "Georgia",
        "Verdana",
    ];

    const fontFamily = allowedFonts.includes(element.fontFamily)
        ? element.fontFamily
        : "Arial";

    const alignment = ["left", "center", "right"].includes(element.align)
        ? element.align
        : "left";

    return `
      <div style="${positionStyle};
        padding:2px;
        overflow:hidden;
        overflow-wrap:anywhere;
        white-space:pre-wrap;
        font-family:'${fontFamily}';
        font-size:${fontSize}px;
        color:${cssColor(element.color)};
        font-weight:${element.bold ? "bold" : "normal"};
        text-align:${alignment}">
        ${escapeHtml(value)}
      </div>
    `;
}

function renderTemplateHtml(template, row) {
    const width = Number(template.page?.width) || 794;
    const height = Number(template.page?.height) || 1123;

    const elementsHtml = template.elements
        .map((element) => renderElement(element, row))
        .join("\n");

    // Use the same CSS pixel page as the designer canvas so layout matches 1:1.
    return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>${escapeHtml(template.name || "Report")}</title>
    <style>
      @page {
        size: ${width}px ${height}px;
        margin: 0;
      }

      * {
        box-sizing: border-box;
      }

      html, body {
        margin: 0;
        padding: 0;
        width: ${width}px;
        height: ${height}px;
      }

      .report-page {
        position: relative;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        background: #ffffff;
      }
    </style>
  </head>
  <body>
    <div class="report-page">
      ${elementsHtml}
    </div>
  </body>
  </html>`;
}

module.exports = { renderTemplateHtml };

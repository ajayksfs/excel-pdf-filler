/**
 * Phase 6 template helpers.
 * Supports multi-page templates while remaining compatible with
 * legacy single-page templates that only have top-level `elements`.
 */

function createPage(overrides = {}, index = 0) {
    const pageNumber = index + 1;

    return {
        id:
            typeof overrides.id === "string" && overrides.id
                ? overrides.id
                : `page-${pageNumber}`,
        name:
            typeof overrides.name === "string" && overrides.name
                ? overrides.name
                : `Page ${pageNumber}`,
        elements: Array.isArray(overrides.elements)
            ? overrides.elements
            : [],
    };
}

function normalizePageSettings(page = {}) {
    return {
        width: Number(page.width) || 794,
        height: Number(page.height) || 1123,
        size: page.size || "A4",
        orientation: page.orientation || "portrait",
        unit: page.unit || "px",
    };
}

/**
 * Always returns a template with a non-empty `pages` array.
 * Legacy `{ elements: [...] }` becomes one page.
 */
function normalizeTemplate(template = {}) {
    const page = normalizePageSettings(template.page);

    let pages;

    if (Array.isArray(template.pages) && template.pages.length > 0) {
        pages = template.pages.map((entry, index) =>
            createPage(entry || {}, index)
        );
    } else {
        pages = [
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

    return {
        ...template,
        page,
        pages,
        // Legacy alias: first page elements (keeps older readers working).
        elements: pages[0].elements,
    };
}

function serializeTemplate(template = {}) {
    const normalized = normalizeTemplate(template);

    return {
        id: normalized.id,
        name: normalized.name,
        page: normalized.page,
        pages: normalized.pages,
        // Keep top-level elements for backward compatibility.
        elements: normalized.pages[0].elements,
        updatedAt: normalized.updatedAt,
    };
}

module.exports = {
    createPage,
    normalizePageSettings,
    normalizeTemplate,
    serializeTemplate,
};

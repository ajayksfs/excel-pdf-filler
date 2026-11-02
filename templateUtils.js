/**
 * Template helpers for multi-page layouts plus header/footer/page numbers.
 * Remains compatible with legacy single-page templates.
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

function normalizeBand(band = {}, defaults = {}) {
    return {
        enabled:
            band.enabled === undefined
                ? Boolean(defaults.enabled)
                : Boolean(band.enabled),
        left: typeof band.left === "string" ? band.left : defaults.left || "",
        center:
            typeof band.center === "string"
                ? band.center
                : defaults.center || "",
        right:
            typeof band.right === "string" ? band.right : defaults.right || "",
        height: Math.min(
            120,
            Math.max(20, Number(band.height) || defaults.height || 36)
        ),
        fontSize: Math.min(
            24,
            Math.max(8, Number(band.fontSize) || defaults.fontSize || 10)
        ),
        color:
            typeof band.color === "string" &&
            /^#[0-9a-fA-F]{3,8}$/.test(band.color)
                ? band.color
                : defaults.color || "#4b5563",
        showOnFirstPage:
            band.showOnFirstPage === undefined
                ? defaults.showOnFirstPage !== false
                : Boolean(band.showOnFirstPage),
    };
}

function normalizePageNumber(config = {}, defaults = {}) {
    const align = ["left", "center", "right"].includes(config.align)
        ? config.align
        : defaults.align || "right";

    return {
        enabled:
            config.enabled === undefined
                ? defaults.enabled !== false
                : Boolean(config.enabled),
        format:
            typeof config.format === "string" && config.format.trim()
                ? config.format
                : defaults.format || "Page {{page}} of {{pages}}",
        align,
        fontSize: Math.min(
            24,
            Math.max(8, Number(config.fontSize) || defaults.fontSize || 10)
        ),
        color:
            typeof config.color === "string" &&
            /^#[0-9a-fA-F]{3,8}$/.test(config.color)
                ? config.color
                : defaults.color || "#4b5563",
        showOnFirstPage:
            config.showOnFirstPage === undefined
                ? defaults.showOnFirstPage !== false
                : Boolean(config.showOnFirstPage),
    };
}

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

/**
 * Always returns a template with a non-empty `pages` array plus
 * normalized header/footer/pageNumber settings.
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
        elements: pages[0].elements,
        header: normalizeBand(template.header || {}, DEFAULT_HEADER),
        footer: normalizeBand(template.footer || {}, DEFAULT_FOOTER),
        pageNumber: normalizePageNumber(
            template.pageNumber || {},
            DEFAULT_PAGE_NUMBER
        ),
    };
}

function serializeTemplate(template = {}) {
    const normalized = normalizeTemplate(template);

    return {
        id: normalized.id,
        name: normalized.name,
        page: normalized.page,
        pages: normalized.pages,
        elements: normalized.pages[0].elements,
        header: normalized.header,
        footer: normalized.footer,
        pageNumber: normalized.pageNumber,
        updatedAt: normalized.updatedAt,
    };
}

module.exports = {
    createPage,
    normalizePageSettings,
    normalizeBand,
    normalizePageNumber,
    normalizeTemplate,
    serializeTemplate,
    DEFAULT_HEADER,
    DEFAULT_FOOTER,
    DEFAULT_PAGE_NUMBER,
};

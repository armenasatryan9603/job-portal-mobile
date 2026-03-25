/** Web: cap main column width so pages don’t stretch on ultra-wide viewports. */
export const WEB_MAIN_CONTENT_MAX_WIDTH = 1280;

/**
 * Web viewports narrower than this use the same shell as mobile (bottom tabs, overlay sidebar, etc.).
 * At or above this width, web gets the desktop layout (top tabs, persistent sidebar column).
 */
export const WEB_LAYOUT_MIN_WIDTH = 768;

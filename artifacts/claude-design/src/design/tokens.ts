// The redesign's values, named once.
//
// Every screen in design/mobile-redesign writes its colours and sizes inline,
// which is right for a design file and wrong for forty template files: the
// hairline #eee7d9 and the field border #e5dfd2 differ by a shade nobody
// catches in review and everybody sees on a phone. The names here are the ones
// design/mobile-redesign/tokens.json uses, so a value can be traced from a
// screen file to this file without translation.
//
// Plain strings rather than CSS custom properties, because the pieces that use
// them build markup as text that is patched into the generated page, and a
// var() would have to resolve against a :root this code does not own.

export const BG = "#faf6f0";
export const SURFACE = "#ffffff";
export const INK = "#33301f";
/** Secondary text: sub-lines, meta, the right-hand side of a section header. */
export const MUTED = "#8a8578";
/** The 10px uppercase labels inside a fact strip; a shade darker than MUTED. */
export const LABEL = "#7a7464";
/** An idle tab, and nothing else. */
export const TAB_IDLE = "#9a947f";

export const OLIVE = "#7d8a3c";
/** Links, back labels, and the one number on a strip worth looking at. */
export const OLIVE_700 = "#5f6a2c";
/** Tile and tag fills. */
export const OLIVE_SOFT = "#eef0dd";
/** A disabled button, a dashed target, the bars a chart is not about. */
export const OLIVE_DIM = "#c6cd93";

/** The kicker above a screen title. */
export const GOLD = "#c9a24a";
/** Between rows of a card and around a fact strip. */
export const HAIRLINE = "#eee7d9";
/** Around a field or a secondary button. */
export const BORDER = "#e5dfd2";
/** The grab handle on a sheet, and a dashed photo tile. */
export const HANDLE = "#c9c2b2";

/** Delete, and the disc under a swipe-to-remove. The only red in the app. */
export const DANGER = "#b0563e";
export const AMBER = "#b07a1f";
export const AMBER_SOFT = "#f5e6cf";

export const CARD_SHADOW = "0 2px 10px rgba(60,55,30,.07)";
export const DOCK_SHADOW = "0 -8px 30px rgba(60,55,30,.10)";
export const SHEET_SHADOW = "0 -8px 30px rgba(60,55,30,.18)";
/** Lifts the Pay disc off the tab bar. */
export const PAY_SHADOW = "0 6px 18px rgba(60,55,30,.10)";
/** Behind a dialog. A sheet dims what is behind it to 55% instead. */
export const SCRIM = "rgba(30,27,22,.42)";

export const R_CARD = "22px";
export const R_STRIP = "18px";
export const R_FIELD = "16px";
export const R_BUTTON = "14px";
export const R_SHEET = "18px";
export const R_TILE = "16px";

/** Side gutters on every screen. */
export const GUTTER = "20px";
export const FONT = "'Poppins', sans-serif";
export const TEXT = "14px";
export const LINE = "1.6";

/**
 * Lining figures. Every number the app shows carries this, so a column of
 * prices lines up and a figure does not jump as it is typed.
 */
export const TNUM = "font-feature-settings:'tnum'";

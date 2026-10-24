// The seven pieces every redesigned screen is built from.
//
// design/mobile-redesign/README.md calls these out by name: a screen is a
// header row, maybe a fact strip, then cards, pill fields, a dock, and the tab
// bar underneath. Written once here, each screen composes them instead of
// repeating forty lines of inline style and drifting a shade at a time.
//
// They return HTML as text rather than elements, because that is what the rest
// of this package deals in: the templates patch the generated page by string,
// so a piece has to be a string to be composable with them.
//
// Every value a caller passes is dropped into the markup as-is, which is what
// lets the same function serve a static screen and a bound one -- pass "12" or
// pass "{{ recipeYield }}". Nothing here escapes anything: callers pass their
// own template text, never a baker's typed input.

import {
  BG, SURFACE, INK, MUTED, LABEL, TAB_IDLE,
  OLIVE, OLIVE_700, GOLD, HAIRLINE, BORDER, HANDLE, DANGER,
  CARD_SHADOW, DOCK_SHADOW, SHEET_SHADOW, PAY_SHADOW, SCRIM, AMBER_SOFT,
  R_CARD, R_STRIP, R_FIELD, R_BUTTON, R_SHEET, TNUM,
} from "./tokens";

/** An attribute only when there is something to put in it. */
const attr = (name: string, value?: string): string => (value ? ` ${name}="${value}"` : "");

const ICON_OPEN =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

/* ------------------------------------------------------------------ header */

export type HeaderAction = {
  /** For a screen reader; these buttons are icons with no text. */
  label: string;
  /** The <path> elements of a 24x24 line icon. */
  icon: string;
  onTap?: string;
  /** Delete, and only delete. */
  danger?: boolean;
};

/**
 * Back link on the left, the screen's kicker centred, round buttons right.
 *
 * The kicker is what the screen is about rather than its title -- "Babka" over
 * a recipe, "New recipe" over the form -- so the title underneath never has to
 * repeat it.
 */
export function headerRow(opts: {
  back?: { label: string; onTap?: string };
  kicker?: string;
  actions?: HeaderAction[];
}): string {
  const back = opts.back
    ? `<button type="button"${attr("sc-camel-on-click", opts.back.onTap)} ` +
      `style="display:flex;align-items:center;gap:4px;min-height:44px;margin-left:-4px;` +
      `border:0;background:none;padding:0;cursor:pointer;font-family:inherit;` +
      `font-size:13px;font-weight:600;color:${OLIVE_700}">` +
      `${ICON_OPEN}<path d="M15 6l-6 6 6 6"></path></svg>${opts.back.label}</button>`
    : '<span style="min-height:44px"></span>';

  const kicker = opts.kicker
    ? `<span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;` +
      `font-weight:600;color:${GOLD}">${opts.kicker}</span>`
    : "<span></span>";

  const actions = (opts.actions || [])
    .map(
      (a) =>
        `<button type="button" aria-label="${a.label}"${attr("sc-camel-on-click", a.onTap)} ` +
        `style="width:40px;height:40px;border-radius:50%;border:0;padding:0;cursor:pointer;` +
        `background:${SURFACE};color:${a.danger ? DANGER : INK};display:grid;place-items:center">` +
        `${ICON_OPEN}${a.icon}</svg></button>`,
    )
    .join("");

  // the right-hand group keeps its width even when empty, so the kicker stays
  // centred on a screen that has no buttons
  const right = actions
    ? `<div style="display:flex;gap:6px">${actions}</div>`
    : '<span style="width:64px"></span>';

  return (
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">` +
    `${back}${kicker}${right}</div>`
  );
}

/* -------------------------------------------------------------- fact strip */

export type Fact = {
  label: string;
  value: string;
  /** The one figure worth looking at: margin on a recipe, earned on an event. */
  good?: boolean;
};

/** Three or four numbers in one bordered box. The answer to "how is this doing". */
export function factStrip(cells: Fact[]): string {
  const inner = cells
    .map(
      (c, i) =>
        `<div style="padding:11px 12px;display:flex;flex-direction:column;gap:3px` +
        `${i > 0 ? `;border-left:1px solid ${HAIRLINE}` : ""}">` +
        `<div style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${LABEL}">${c.label}</div>` +
        `<div style="${TNUM};font-weight:600;font-size:16px;line-height:1.2` +
        `${c.good ? `;color:${OLIVE_700}` : ""}">${c.value}</div></div>`,
    )
    .join("");
  return (
    `<div style="display:grid;grid-template-columns:repeat(${cells.length},minmax(0,1fr));` +
    `border:1px solid ${HAIRLINE};border-radius:${R_STRIP};background:${SURFACE};overflow:hidden">` +
    `${inner}</div>`
  );
}

/* --------------------------------------------------------------------- card */

/**
 * A white card of rows, with its own heading above it.
 *
 * Rows are passed as markup because what a row holds differs everywhere -- an
 * ingredient and its cost, a field and its value, a product and a stepper --
 * while the hairline between them never does. Pass `loop` instead of `rows`
 * when the rows come from an sc-for; the separator then lives on the row.
 */
export function card(opts: {
  title?: string;
  /** The 12px note on the right of the heading: "batch $8.52", "per babka". */
  meta?: string;
  rows?: string[];
  loop?: string;
  radius?: string;
}): string {
  const head = opts.title
    ? `<div style="display:flex;align-items:baseline;justify-content:space-between;padding:0 2px">` +
      `<h6 style="margin:0;font-size:15px;font-weight:700;line-height:1.3">${opts.title}</h6>` +
      (opts.meta ? `<span style="font-size:12px;color:${MUTED};${TNUM}">${opts.meta}</span>` : "") +
      `</div>`
    : "";

  const body =
    opts.loop ??
    (opts.rows || [])
      .map((r, i) => (i === 0 ? r : `<div style="border-top:1px solid ${HAIRLINE}">${r}</div>`))
      .join("");

  const box =
    `<div style="background:${SURFACE};border-radius:${opts.radius || R_CARD};padding:0 16px;` +
    `box-shadow:${CARD_SHADOW};display:flex;flex-direction:column">${body}</div>`;

  return head
    ? `<div style="display:flex;flex-direction:column;gap:10px">${head}${box}</div>`
    : box;
}

/** One row inside a card: something on the left, a figure on the right. */
export function cardRow(opts: { left: string; right?: string; onTap?: string; muted?: boolean }): string {
  const tag = opts.onTap ? "button" : "div";
  const extra = opts.onTap
    ? ` type="button" sc-camel-on-click="${opts.onTap}" style="border:0;background:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;`
    : ' style="';
  return (
    `<${tag}${extra}display:flex;align-items:center;gap:12px;min-height:44px;font-size:13px;` +
    `color:${opts.muted ? LABEL : INK}">` +
    `<span style="flex:1">${opts.left}</span>` +
    (opts.right ? `<span style="${TNUM};font-weight:500">${opts.right}</span>` : "") +
    `</${tag}>`
  );
}

/* --------------------------------------------------------------- pill field */

/**
 * A 48px field that reads as a sentence: label on the left, value on the right.
 * Makes, Active time, Group, Date, Hours, Fee are all this.
 */
export function pillField(opts: {
  label: string;
  /** Markup, so it can be text, an input, or a chevron. */
  value: string;
  onTap?: string;
  /** 6px on the right instead of 14px, for a value that is itself a control. */
  tightRight?: boolean;
}): string {
  const tag = opts.onTap ? "button" : "div";
  return (
    `<${tag}${opts.onTap ? ` type="button" sc-camel-on-click="${opts.onTap}"` : ""} ` +
    `style="flex:1;display:flex;align-items:center;justify-content:space-between;gap:8px;` +
    `height:48px;padding:${opts.tightRight ? "0 6px 0 14px" : "0 14px"};` +
    `border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};` +
    `${opts.onTap ? "cursor:pointer;font-family:inherit;text-align:left;" : ""}">` +
    `<span style="font-size:12px;color:${MUTED};white-space:nowrap">${opts.label}</span>` +
    `<span style="font-size:15px;font-weight:600;color:${INK}">${opts.value}</span>` +
    `</${tag}>`
  );
}

/* -------------------------------------------------------------------- sheet */

/**
 * The bottom sheet. Anything that adds to a list opens one of these rather than
 * navigating away, so the form behind is never lost.
 *
 * `height` is given rather than measured: a sheet that grows with its contents
 * jumps as a list filters, and the drag-to-dismiss threshold is a fraction of
 * its height, which has to be stable to be predictable.
 */
export function sheet(opts: {
  title: string;
  sub?: string;
  body: string;
  height: string;
  onClose?: string;
  label?: string;
}): string {
  return (
    // data-bk-sheet: sheet-dismiss.ts lets it be dragged down to close
    `<div role="dialog" aria-modal="true" aria-label="${opts.label || opts.title}" data-bk-sheet="1" ` +
    `style="position:absolute;left:0;right:0;bottom:0;height:${opts.height};background:${BG};` +
    `border-radius:${R_SHEET} ${R_SHEET} 0 0;box-shadow:${SHEET_SHADOW};padding:10px 20px 0;` +
    `display:flex;flex-direction:column;gap:14px;box-sizing:border-box">` +
    `<div style="width:36px;height:4px;border-radius:2px;background:${HANDLE};align-self:center"></div>` +
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">` +
    `<div style="display:flex;flex-direction:column">` +
    `<h2 style="margin:0;font-size:20px;font-weight:600;line-height:1.3">${opts.title}</h2>` +
    (opts.sub ? `<span style="font-size:12px;color:${MUTED}">${opts.sub}</span>` : "") +
    `</div>` +
    `<button type="button" aria-label="Close"${attr("sc-camel-on-click", opts.onClose)} ` +
    `style="width:40px;height:40px;border-radius:50%;border:0;padding:0;cursor:pointer;` +
    `background:${SURFACE};color:${INK};display:grid;place-items:center">` +
    `${ICON_OPEN}<path d="M6 6l12 12M18 6L6 18"></path></svg></button>` +
    `</div>${opts.body}</div>`
  );
}

/* --------------------------------------------------------------------- dock */

/**
 * The sticky panel at the bottom of every form that prices something.
 *
 * It carries the payoff -- what one costs, what the baker earns -- and updates
 * as they type, so the answer is never a screen away from the question.
 */
export function dock(opts: { left: string; right: string; button: string }): string {
  return (
    `<div style="flex:none;background:${SURFACE};border-radius:${R_CARD} ${R_CARD} 0 0;` +
    `box-shadow:${DOCK_SHADOW};padding:16px 20px 26px;display:flex;flex-direction:column;gap:12px">` +
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px">` +
    `${opts.left}${opts.right}</div>${opts.button}</div>`
  );
}

/** The dock's button, and the primary button everywhere else. */
export function primaryButton(opts: { label: string; onTap?: string; disabled?: boolean }): string {
  return (
    `<button type="button"${attr("sc-camel-on-click", opts.onTap)}${opts.disabled ? " disabled" : ""} ` +
    `style="display:flex;align-items:center;justify-content:center;height:48px;border:0;` +
    `border-radius:${R_BUTTON};background:${opts.disabled ? "#c6cd93" : OLIVE};color:${SURFACE};` +
    `font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">${opts.label}</button>`
  );
}

/* ----------------------------------------------------------- swipe to remove */

/**
 * A row that comes off its list when pulled to the right
 * (SwipeRemove.dc.html): a red × behind it grows in as it goes, and past
 * 72px letting go sends it off the edge and closes the gap. No confirmation.
 *
 * `item` is the loop's name for the row; its sw* values come from the
 * component's swipeRow() (swipe-remove-template.ts), which does the counting.
 * `rowStyle` is the row's own layout; `sep` its top hairline.
 */
export function swipeRow(opts: { item: string; sep: string; rowStyle: string; inner: string; bg?: string }): string {
  const b = (key: string) => `{{ ${opts.item}.${key} }}`;
  return (
    `<div style="position:relative;overflow:hidden;max-height:${b("swMaxH")};opacity:${b("swOpacity")};` +
    `transition:${b("swCollapse")};border-top:${opts.sep}">` +
    `<div style="position:absolute;left:0;top:0;bottom:0;width:72px;display:flex;align-items:center;justify-content:flex-start;padding-left:4px">` +
    `<span aria-hidden="true" style="width:36px;height:36px;border-radius:50%;background:${DANGER};color:${SURFACE};` +
    `display:grid;place-items:center;transform:${b("swDisc")};transition:${b("swDiscTransition")}">` +
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `<path d="M6 6l12 12M18 6L6 18"></path></svg></span></div>` +
    `<div sc-camel-on-pointer-down="${b("swDown")}" sc-camel-on-pointer-move="${b("swMove")}" ` +
    `sc-camel-on-pointer-up="${b("swUp")}" sc-camel-on-pointer-cancel="${b("swUp")}" ` +
    `style="position:relative;background:${opts.bg || SURFACE};${opts.rowStyle};` +
    `transform:${b("swTransform")};transition:${b("swTransition")};touch-action:pan-y">` +
    `${opts.inner}</div></div>`
  );
}

/* ----------------------------------------------------------- delete dialog */

/**
 * The one way anything is deleted: a centred card over the dimmed screen,
 * saying what goes with it, "Keep it" beside a red Delete. Ingredient,
 * packaging, recipe and event all use this; only the words differ, and the
 * words are the point -- `body` says what happens to everything that used
 * the thing, not just that it cannot be undone.
 */
export function deleteDialog(opts: {
  /** The sc-if flag that shows it. */
  open: string;
  title: string;
  body: string;
  onKeep: string;
  onDelete: string;
  label: string;
}): string {
  return (
    `<sc-if value="${opts.open}" hint-placeholder-val="{{ false }}">` +
    `<div style="position:fixed;inset:0;z-index:40;background:${SCRIM};display:flex;align-items:center;justify-content:center;padding:20px">` +
    `<div role="dialog" aria-modal="true" aria-label="${opts.label}" style="width:100%;max-width:340px;background:${BG};` +
    `border-radius:${R_CARD};padding:22px;box-shadow:${PAY_SHADOW};display:flex;flex-direction:column;gap:14px;box-sizing:border-box">` +
    `<div style="width:48px;height:48px;border-radius:50%;background:${AMBER_SOFT};color:${DANGER};display:grid;place-items:center">` +
    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"></path></svg></div>` +
    `<div style="display:flex;flex-direction:column;gap:6px">` +
    `<h2 style="margin:0;font-size:20px;font-weight:600;line-height:1.3">${opts.title}</h2>` +
    `<p style="margin:0;font-size:13px;line-height:1.55;color:${LABEL}">${opts.body}</p></div>` +
    `<div style="display:flex;gap:10px;margin-top:4px">` +
    `<button type="button" sc-camel-on-click="${opts.onKeep}" style="flex:1;height:48px;border:1px solid ${BORDER};` +
    `border-radius:${R_BUTTON};background:${SURFACE};color:${INK};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">Keep it</button>` +
    `<button type="button" sc-camel-on-click="${opts.onDelete}" style="flex:1;height:48px;border:0;` +
    `border-radius:${R_BUTTON};background:${DANGER};color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">Delete</button>` +
    `</div></div></div></sc-if>`
  );
}

/* ------------------------------------------------------------------ tab bar */

export type TabKey = "home" | "pantry" | "pay" | "events" | "analytics";

const TAB_ICONS: Record<TabKey, string> = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"></path>',
  pantry: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"></path><path d="M3 8l9 5 9-5"></path>',
  pay:
    '<path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H3z"></path>' +
    '<path d="M3 8h17a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><path d="M16 14h2"></path>',
  events:
    '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path>',
  analytics: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"></path>',
};

const TAB_LABELS: Record<TabKey, string> = {
  home: "Home",
  pantry: "Pantry",
  pay: "Pay",
  events: "Events",
  analytics: "Analytics",
};

const TAB_ORDER: TabKey[] = ["home", "pantry", "pay", "events", "analytics"];

/**
 * Home · Pantry · Pay · Events · Analytics.
 *
 * Pay sits in the middle as a disc rather than a labelled tab: it is the thing
 * a baker reaches for mid-market with one hand, and it is the only tab that
 * opens a sheet instead of a screen.
 */
export function tabBar(
  active: TabKey | null,
  taps: Partial<Record<TabKey, string>> = {},
  // One bar is drawn for every screen, so which tab is lit is usually a
  // binding ("{{ tcDash }}") rather than something known when the markup is
  // written. A colour given here wins over the active/idle pair; Pay is
  // always olive.
  colorOf: Partial<Record<TabKey, string>> = {},
): string {
  const items = TAB_ORDER.map((key) => {
    const on = key === active;
    const icon = (size: number) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
      `stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
      `${TAB_ICONS[key]}</svg>`;

    const inner =
      key === "pay"
        ? `<span style="width:36px;height:36px;border-radius:50%;background:${OLIVE};color:${SURFACE};` +
          `display:grid;place-items:center;box-shadow:${PAY_SHADOW}">${icon(18)}</span>`
        : `${icon(20)}${TAB_LABELS[key]}`;

    return (
      `<button type="button"${attr("sc-camel-on-click", taps[key])}` +
      (key === "pay" ? ` aria-label="Pay"` : "") +
      (on ? ' aria-current="page"' : "") +
      ` style="flex:1;min-height:50px;display:flex;flex-direction:column;align-items:center;` +
      `justify-content:center;gap:3px;border:0;background:none;padding:0;cursor:pointer;` +
      `font-family:inherit;font-size:10px;color:${key === "pay" ? OLIVE : colorOf[key] || (on ? OLIVE : TAB_IDLE)}` +
      `${key === "pay" ? ";font-weight:600" : ""}">${inner}</button>`
    );
  }).join("");

  return (
    `<nav aria-label="Main" style="flex:none;display:flex;align-items:stretch;` +
    `padding:6px 8px 24px;background:${SURFACE};border-top:1px solid ${HAIRLINE}">${items}</nav>`
  );
}

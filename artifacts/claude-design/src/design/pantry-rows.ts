// The rows the three pantry lists share.
//
// Ingredients, Packaging and Recipes each have a search box, a "Needs a look"
// card when something cannot be costed, and the list itself, and the
// redesign draws all three identically. Only the binding names differ, so
// each list passes its own and gets the same markup back.
//
// A row is a div rather than a link because the app moves between screens by
// state, not by URL; .bk-row gives it the pressed shade a link would have.

const CHEVRON =
  '<svg width="16" height="16" sc-camel-view-box="0 0 24 24" fill="none" stroke="#c9c2b2" stroke-width="1.75" ' +
  'stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M9 6l6 6-6 6"></path></svg>';

const TNUM = "font-feature-settings:'tnum'";

/**
 * A recipe's 44px tile: its own photo when it has one, otherwise the icon of
 * its kind -- loaf, babka, cookie -- in the white tile the app used before the
 * redesign, which bakers already read as "this recipe". Rows that pass `tile`
 * need hasPhoto, noPhoto, photo and iconEl. The photo is drawn by cover:
 * saved photos are already square.
 */
const TILE =
  `<sc-if value="{{ r.hasPhoto }}" hint-placeholder-val="{{ false }}">` +
  `<span aria-hidden="true" style="flex:none;width:44px;height:44px;border-radius:12px;overflow:hidden;background:#ffffff;display:block">` +
  `<img src="{{ r.photo }}" alt="" style="width:44px;height:44px;object-fit:cover;display:block"></span></sc-if>` +
  `<sc-if value="{{ r.noPhoto }}" hint-placeholder-val="{{ true }}">` +
  `<span aria-hidden="true" style="flex:none;width:44px;height:44px;box-sizing:border-box;border-radius:12px;` +
  `border:1px solid #eee7d9;background:#ffffff;display:grid;place-items:center">{{ r.iconEl }}</span></sc-if>`;

export type RowOptions = { tile?: boolean };

/** 44px search field. The input fires its handler on every keystroke. */
export function searchBox(opts: { value: string; onChange: string; placeholder: string }): string {
  return (
    `<label style="display:flex;align-items:center;gap:10px;height:44px;padding:0 16px;border:1px solid #e5dfd2;` +
    `border-radius:16px;background:#ffffff;cursor:text">` +
    `<svg width="18" height="18" sc-camel-view-box="0 0 24 24" fill="none" stroke="#8a8578" stroke-width="1.75" ` +
    `stroke-linecap="round" stroke-linejoin="round" style="flex:none"><circle cx="11" cy="11" r="7"></circle>` +
    `<path d="M20 20l-3.5-3.5"></path></svg>` +
    `<input type="search" value="{{ ${opts.value} }}" sc-camel-on-change="{{ ${opts.onChange} }}" ` +
    `placeholder="${opts.placeholder}" aria-label="${opts.placeholder}" ` +
    `style="flex:1;min-width:0;border:0;outline:none;background:none;font-family:inherit;font-size:14px;color:#33301f">` +
    `</label>`
  );
}

/**
 * Something that cannot be costed yet. The reason sits under the name in
 * amber, so the row says what to fix rather than that something is wrong.
 * Each item in `list` needs name, reason, price, sep and open.
 */
export function lookRows(list: string, opts: RowOptions = {}): string {
  return (
    `<sc-for list="{{ ${list} }}" as="r" hint-placeholder-count="1">` +
    `<div class="bk-row" sc-camel-on-click="{{ r.open }}" style="display:flex;align-items:center;gap:12px;` +
    `min-height:58px;border-top:{{ r.sep }};cursor:pointer">` +
    (opts.tile ? TILE : "") +
    `<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px">` +
    `<span style="font-size:14px;font-weight:500;line-height:1.3;overflow-wrap:anywhere">{{ r.name }}</span>` +
    `<span style="font-size:12px;color:#b07a1f;line-height:1.3">{{ r.reason }}</span></div>` +
    `<div style="flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:3px">` +
    `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;background:#eef0dd;` +
    `color:#5f6a2c;line-height:1.4">needs a look</span>` +
    `<span style="font-size:12px;font-weight:600;color:#7a7464;${TNUM}">{{ r.price }}</span></div>` +
    `${CHEVRON}</div></sc-for>`
  );
}

/**
 * One item in a pantry list: name over a muted line, the unit cost over what
 * it is per. Each item in `list` needs name, sub, price, perUnit, sep and open.
 */
export function itemRows(list: string, opts: RowOptions = {}): string {
  return (
    `<sc-for list="{{ ${list} }}" as="r" hint-placeholder-count="6">` +
    `<div class="bk-row" sc-camel-on-click="{{ r.open }}" style="display:flex;align-items:center;gap:10px;` +
    `min-height:56px;border-top:{{ r.sep }};cursor:pointer">` +
    (opts.tile ? TILE : "") +
    `<div style="flex:1;min-width:0;display:flex;flex-direction:column">` +
    `<span style="font-size:14px;font-weight:500;line-height:1.3;white-space:nowrap;overflow:hidden;` +
    `text-overflow:ellipsis">{{ r.name }}</span>` +
    `<span style="font-size:12px;color:#8a8578;${TNUM};white-space:nowrap;overflow:hidden;` +
    `text-overflow:ellipsis">{{ r.sub }}</span></div>` +
    `<div style="flex:none;display:flex;flex-direction:column;align-items:flex-end;line-height:1.25">` +
    `<span style="font-size:13px;font-weight:600;${TNUM}">{{ r.price }}</span>` +
    `<span style="font-size:11px;color:#8a8578;${TNUM}">{{ r.perUnit }}</span></div>` +
    `${CHEVRON}</div></sc-for>`
  );
}

/** A quiet line for an empty list or a search that found nothing. */
export function quietLine(when: string, text: string): string {
  return (
    `<sc-if value="{{ ${when} }}" hint-placeholder-val="{{ false }}">` +
    `<div style="font-size:13px;color:#8a8578;padding:6px 2px">${text}</div></sc-if>`
  );
}

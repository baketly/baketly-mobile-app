// What bakeries nearby charge, in the new design.
//
// design/mobile-redesign/screens/NearbyPrices.dc.html: when it was checked and
// how many bakeries it found, a refresh button, a strip counting the products
// in range / out of range / with no match, one row per product with what you
// charge, what shops nearby charge, and one verdict tag -- then "Worth a look
// yourself", the shops whose prices could not be read, each with Open ↗.
//
// NearbyProduct.dc.html, a product's own page: your price beside the nearby
// median, a bar with the nearby range on it and you on it, a sentence saying
// where that leaves you, the three suggested prices -- tapping one makes it
// the recipe's selling price -- and who sells it, each shop opening its page.
//
// The entry point is the row above the recipe search on the Pantry's Recipes
// tab, which opened "What changed" before. That screen, with the ingredient
// price moves on it, is left as it was but no longer has a way in.
//
// The check itself is unchanged (watch-template.ts runs it, twice a week or on
// the refresh button). The verdict is worked out again here from the check's
// own bounds -- the middle half of nearby prices, or the low and high of a
// search -- against the recipe's price now, so a price set from this screen
// moves its tag at once. Unchanged, it is the verdict the check returned.

import {
  AMBER, AMBER_SOFT, BORDER, CARD_SHADOW, DANGER, GOLD, HAIRLINE, HANDLE, INK, LABEL, MUTED, OLIVE, OLIVE_700,
  OLIVE_DIM, OLIVE_SOFT, R_CARD, R_FIELD, R_STRIP, SURFACE, TNUM,
} from "./design/tokens";
import { swapOnce } from "./template-blocks";

const LABEL_ = "Nearby prices";

const svg = (size: number, paths: string, width = "1.75") =>
  `<svg width="${size}" height="${size}" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const CHEVRON = `<span style="flex:none;color:${HANDLE};display:grid">${svg(16, '<path d="M9 6l6 6-6 6"></path>')}</span>`;
const BACK = svg(16, '<path d="M15 6l-6 6 6 6"></path>');
const OUT = svg(14, '<path d="M7 17L17 7M9 7h8v8"></path>');
const REFRESH = svg(16, '<path d="M21 12a9 9 0 1 1-2.6-6.4"></path><path d="M21 3v6h-6"></path>');

/* ------------------------------------------------------------- controller */

/** In the watch controller's scope: CUR, check, recipes, recipeCost, costNow, runCheck. */
const bindings = `          ...(() => {
            const screen = this.state.screen;
            const code = (this.state.currency || 'USD');
            // the check quotes the currency it found prices in
            const theirs = check && check.currency ? String(check.currency) : code;
            const same = theirs === code;
            const amount = v => same ? CUR + v.toFixed(2) : v.toFixed(2) + ' ' + theirs;
            const short = v => Math.abs(v - Math.round(v)) < 0.005 ? String(Math.round(v)) : v.toFixed(2);
            const range = (lo, hi) => (same ? CUR : '') + (Math.abs(lo - hi) < 0.005 ? short(lo) : short(lo) + '\\u2013' + short(hi)) + (same ? '' : ' ' + theirs);
            const num = v => (v === null || v === undefined || !isFinite(Number(v))) ? null : Number(v);
            const sep = i => i ? '1px solid ${HAIRLINE}' : '0';
            const TAGS = {
              in_range: { label: 'in range', bg: '${OLIVE_SOFT}', fg: '${OLIVE_700}' },
              over: { label: 'above nearby', bg: '${AMBER_SOFT}', fg: '${AMBER}' },
              under: { label: 'below nearby', bg: '${AMBER_SOFT}', fg: '${AMBER}' },
              unknown: { label: 'no match', bg: '#efe9dd', fg: '${LABEL}' }
            };
            const checkedAt = check && check.checkedAt ? new Date(check.checkedAt) : null;
            const checkedOk = !!checkedAt && !isNaN(checkedAt.getTime());
            const when = !checkedOk ? '' : 'Checked ' + ((Date.now() - checkedAt.getTime()) / 86400000 < 6
              ? checkedAt.toLocaleDateString('en-US', { weekday: 'long' })
              : checkedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

            // each product as it stands now: the recipe's price may have moved since the check
            const rows = (check && Array.isArray(check.products) ? check.products : []).filter(Boolean).map(p => {
              const recipe = recipes.find(r => String(r.name || '').trim() === String(p.name || '').trim()) || null;
              const price = recipe && Number(recipe.price) > 0 ? Number(recipe.price) : Number(p.price) || 0;
              const low = num(p.localLow), high = num(p.localHigh), median = num(p.median);
              const lowB = num(p.p25) !== null ? num(p.p25) : low;
              const highB = num(p.p75) !== null ? num(p.p75) : high;
              const verdict = lowB === null || highB === null ? 'unknown'
                : price < lowB - 0.004 ? 'under' : price > highB + 0.004 ? 'over' : 'in_range';
              return { p, recipe, price, low, high, median, verdict };
            });
            const count = v => rows.filter(r => r.verdict === v).length;
            const out = count('over') + count('under');
            const open = name => () => this.setState(st => ({ nearbyProduct: name, nearbyUndo: null, screen: 'nearbyProduct', stack: [...st.stack, st.screen] }));

            // ---- one product -------------------------------------------
            const row = rows.find(r => r.p.name === this.state.nearbyProduct) || null;
            const pick = row || { p: { competitors: [] }, recipe: null, price: 0, low: null, high: null, median: null, verdict: 'unknown' };
            const lo = pick.low, hi = pick.high;
            const hasRange = lo !== null && hi !== null;
            const scaleLo = hasRange ? Math.min(lo, pick.price) : 0;
            const scaleHi = hasRange ? Math.max(hi, pick.price) : 1;
            const pad = Math.max(0.5, (scaleHi - scaleLo) * 0.2);
            const at = v => Math.max(2, Math.min(98, ((v - (scaleLo - pad)) / ((scaleHi + pad) - (scaleLo - pad))) * 100));
            const cost = pick.recipe ? recipeCost(pick.recipe, costNow) : 0;
            const margin = pick.price > 0 && cost > 0 ? Math.round(((pick.price - cost) / pick.price) * 100) : null;
            const gapMedian = pick.median !== null ? pick.price - pick.median : 0;
            const saying = (() => {
              if (pick.verdict === 'unknown') return String(pick.p.note || '').trim() || 'Baketly found no shop nearby selling one like it, so there is nothing to compare yet.';
              let s;
              if (pick.verdict === 'over') s = hi !== null && pick.price > hi + 0.004
                ? "You're " + amount(pick.price - hi) + ' above the dearest one nearby.'
                : "You're toward the top of what shops nearby charge, " + amount(Math.abs(gapMedian)) + ' above the median.';
              else if (pick.verdict === 'under') s = lo !== null && pick.price < lo - 0.004
                ? "You're " + amount(lo - pick.price) + ' below the cheapest one nearby.'
                : "You're toward the bottom of what shops nearby charge, " + amount(Math.abs(gapMedian)) + ' below the median.';
              else s = "You're within what shops nearby charge" + (pick.median === null || Math.abs(gapMedian) < 0.005 ? ', right at the median.'
                : ', ' + amount(Math.abs(gapMedian)) + (gapMedian > 0 ? ' above' : ' below') + ' the median.');
              return s + (margin !== null ? ' At ' + amount(pick.price) + ' you keep ' + margin + '% after ingredients and packaging.' : '');
            })();
            const suggested = pick.p.suggested || null;
            const undo = this.state.nearbyUndo || null;
            const setPrice = value => () => {
              if (!pick.recipe || !same || !(value > 0)) return;
              const id = pick.recipe.id, before = Number(pick.recipe.price) || 0;
              this.setState(st => ({
                recipeRecords: (st.recipeRecords || []).map(r => r.id === id ? { ...r, price: Math.round(value * 100) / 100 } : r),
                nearbyUndo: { id, price: before, now: Math.round(value * 100) / 100 }
              }));
            };
            const shops = (pick.p.competitors || []).filter(Boolean).map((s, i) => {
              const qty = Number(s.quantity) || 0;
              const each = num(s.equivalentPrice) !== null ? num(s.equivalentPrice) : num(s.price);
              const sub = [];
              if (num(s.distanceKm) !== null) sub.push(Number(s.distanceKm).toFixed(1) + ' km');
              if (s.product) sub.push(String(s.product));
              if (qty > 1 && num(s.price) !== null) sub.push(amount(Number(s.price)) + ' for ' + qty);
              const uri = /^https?:\\/\\//i.test(String(s.uri || '')) ? String(s.uri) : '';
              return { name: String(s.name || 'A bakery'), sub: sub.join(' \\u00b7 '), price: each !== null ? amount(each) : '', uri, hasUri: !!uri, noUri: !uri, sep: sep(i) };
            });
            const unread = (check && Array.isArray(check.unread) ? check.unread : []).filter(Boolean).map((s, i) => {
              const uri = /^https?:\\/\\//i.test(String(s.website || '')) ? String(s.website) : '';
              return { name: String(s.name || 'A bakery'), sub: [num(s.distanceKm) !== null ? Number(s.distanceKm).toFixed(1) + ' km' : '', String(s.reason || '')].filter(Boolean).join(' \\u00b7 '),
                uri, hasUri: !!uri, noUri: !uri, sep: sep(i) };
            });
            const located = !!(this.state.bakeryLocation || '').trim();

            return {
              onNearby: screen === 'nearby',
              onNearbyProduct: screen === 'nearbyProduct',
              goNearby: () => this.setState(st => ({ screen: 'nearby', stack: [...st.stack, st.screen] })),
              // the row above the recipe search
              // short, as before, so the count still fits on the line
              nearbyRowWhen: !checkedOk ? (located ? 'Not checked yet' : 'Add where you sell')
                : 'Checked ' + ((Date.now() - checkedAt.getTime()) / 86400000 < 6
                  ? checkedAt.toLocaleDateString('en-US', { weekday: 'short' })
                  : checkedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
              nearbyRowHasOut: out > 0,
              nearbyRowOut: out + (out === 1 ? ' recipe out of range' : ' recipes out of range'),

              nearbySub: checkedOk
                ? when + (Number(check.bakeriesFound) > 0 ? ' \\u00b7 ' + Number(check.bakeriesFound) + (Number(check.bakeriesFound) === 1 ? ' bakery nearby' : ' bakeries nearby') : '')
                : (located ? 'Not checked yet' : 'Tell Baketly where you sell'),
              nearbyHasRows: rows.length > 0,
              nearbyInRange: String(count('in_range')),
              nearbyOutOfRange: String(out),
              nearbyNoMatch: String(count('unknown')),
              nearbyRows: rows.map((r, i) => ({
                name: r.p.name || 'A product',
                sub: 'You ' + amount(r.price) + ' \\u00b7 nearby ' + (r.low !== null && r.high !== null ? range(r.low, r.high) : '\\u2014'),
                tag: TAGS[r.verdict], sep: sep(i), open: open(r.p.name)
              })),
              nearbyUnread: unread,
              nearbyHasUnread: unread.length > 0,
              nearbyUnreadMeta: unread.length + (unread.length === 1 ? ' bakery' : ' bakeries'),
              nearbyNeedsLocation: !located,
              nearbyAwaiting: located && rows.length === 0 && !this.state.marketPending,
              nearbyPending: this.state.marketPending === true,
              nearbyError: this.state.marketError || '',
              nearbyRefresh: runCheck,
              nearbyRefreshOpacity: this.state.marketPending ? '0.45' : '1',
              nearbyGoSettings: () => this.setState(st => ({ screen: 'settings', stack: [...st.stack, st.screen] })),

              npName: pick.p.name || '',
              npSub: (Number(pick.p.comparableBakeries) || 0) > 0
                ? Number(pick.p.comparableBakeries) + (Number(pick.p.comparableBakeries) === 1 ? ' shop nearby sells one' : ' shops nearby sell one')
                : (pick.p.provenance === 'ai_search' ? 'found by a web search' : 'no shop nearby sells one like it'),
              npTag: TAGS[pick.verdict],
              npYours: amount(pick.price),
              npMedian: pick.median !== null ? amount(pick.median) : '\\u2014',
              npHasRange: hasRange,
              npFillLeft: hasRange ? at(lo).toFixed(1) + '%' : '0%',
              npFillWidth: hasRange ? Math.max(1.5, at(hi) - at(lo)).toFixed(1) + '%' : '0%',
              npDot: at(pick.price).toFixed(1) + '%',
              npRangeLine: hasRange ? range(lo, hi) + ' \\u00b7 what shops nearby charge' : '',
              npYouLine: 'you \\u00b7 ' + (same ? CUR : '') + short(pick.price),
              npSaying: saying,
              npSearched: pick.p.provenance === 'ai_search',
              npHasSuggested: !!suggested,
              npSuggested: suggested ? [['Competitive', suggested.competitive], ['Market', suggested.market], ['Premium', suggested.premium]].map(([label, v]) => {
                const value = Number(v) || 0;
                const on = Math.abs(value - pick.price) < 0.005;
                return { label, value: amount(value), set: setPrice(value), border: on ? '${OLIVE}' : '${BORDER}', bg: on ? '${OLIVE_SOFT}' : '${SURFACE}' };
              }) : [],
              npHint: !pick.recipe ? 'No recipe by this name any more, so there is no price to set.'
                : !same ? 'These are in ' + theirs + ', so they cannot be set as your price.'
                : 'Tap one to set it as the selling price in the recipe.',
              npShowHint: !(undo && pick.recipe && undo.id === pick.recipe.id),
              npJustSet: !!(undo && pick.recipe && undo.id === pick.recipe.id),
              npSetLine: undo ? (pick.p.name || 'It') + ' now sells for ' + amount(undo.now) + '.' : '',
              npUndo: () => {
                const u = this.state.nearbyUndo;
                if (!u) return;
                this.setState(st => ({ recipeRecords: (st.recipeRecords || []).map(r => r.id === u.id ? { ...r, price: u.price } : r), nearbyUndo: null }));
              },
              npShops: shops,
              npHasShops: shops.length > 0
            };
          })(),
`;

function addBindings(template: string): string {
  return swapOnce(template, "          runMarketCheck: runCheck\n", bindings + "          runMarketCheck: runCheck\n", `${LABEL_} bindings`);
}

/* ----------------------------------------------------------------- pieces */

const head = (title: string, meta: string) =>
  '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:0 2px">' +
  `<h6 style="margin:0;font-size:15px;font-weight:700;line-height:1.3">${title}</h6>` +
  `<span style="font-size:12px;color:${MUTED};${TNUM};text-align:right">${meta}</span></div>`;

const whiteCard = (body: string) =>
  `<div style="background:${SURFACE};border-radius:${R_CARD};padding:0 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column">${body}</div>`;

const tag = (t: string) =>
  `<span style="flex:none;font-size:10px;font-weight:600;padding:3px 9px;border-radius:999px;background:{{ ${t}.bg }};color:{{ ${t}.fg }};white-space:nowrap">{{ ${t}.label }}</span>`;

const textCol = (title: string, sub: string) =>
  '<div style="flex:1;min-width:0;display:flex;flex-direction:column">' +
  `<span style="font-size:14px;font-weight:500;line-height:1.3;overflow-wrap:anywhere">${title}</span>` +
  `<span style="font-size:12px;color:${MUTED};${TNUM};overflow-wrap:anywhere">${sub}</span></div>`;

/** A shop: a link where it has a page, a plain row where it has none. */
const shopRow = (alias: string, right: string, height: string) => {
  const style = `display:flex;align-items:center;gap:12px;min-height:${height};padding:8px 0;box-sizing:border-box;border-top:{{ ${alias}.sep }};color:${INK};text-decoration:none`;
  const inner = textCol(`{{ ${alias}.name }}`, `{{ ${alias}.sub }}`) + right;
  return (
    `<sc-if value="{{ ${alias}.hasUri }}" hint-placeholder-val="{{ true }}"><a href="{{ ${alias}.uri }}" target="_blank" rel="noopener noreferrer" style="${style}">${inner}</a></sc-if>` +
    `<sc-if value="{{ ${alias}.noUri }}" hint-placeholder-val="{{ false }}"><div style="${style}">${inner}</div></sc-if>`
  );
};

const topBar = (backLabel: string, kicker: string, right: string) =>
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
  `<button type="button" sc-camel-on-click="{{ back }}" style="display:flex;align-items:center;gap:4px;min-height:44px;margin-left:-4px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:${OLIVE_700}">${BACK}${backLabel}</button>` +
  `<span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${GOLD}">${kicker}</span>` +
  right +
  "</div>";

const cell = (label: string, value: string, color = INK, first = false) =>
  `<div style="padding:11px 12px;${first ? "" : `border-left:1px solid ${HAIRLINE};`}display:flex;flex-direction:column;gap:3px">` +
  `<div style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${LABEL}">${label}</div>` +
  `<div style="font-weight:600;font-size:16px;line-height:1.2;color:${color};${TNUM}">${value}</div></div>`;

/* ----------------------------------------------------------------- list */

const listScreen =
  '<div style="padding:14px 20px 32px;display:flex;flex-direction:column;gap:18px">' +
  topBar(
    "Recipes",
    "Nearby prices",
    `<button type="button" sc-camel-on-click="{{ nearbyRefresh }}" aria-label="Check local prices now" style="width:40px;height:40px;border-radius:50%;border:0;padding:0;cursor:pointer;background:${SURFACE};color:${INK};display:grid;place-items:center;opacity:{{ nearbyRefreshOpacity }}">${REFRESH}</button>`,
  ) +
  '<div style="display:flex;flex-direction:column">' +
  '<h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25">Nearby prices</h1>' +
  `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ nearbySub }}</span></div>` +
  '<sc-if value="{{ nearbyPending }}" hint-placeholder-val="{{ false }}">' +
  `<div style="display:flex;align-items:center;gap:9px;margin-top:-6px"><span class="bk-spinner" aria-hidden="true"></span><span style="font-size:12px;color:${MUTED}">Finding bakeries near you and reading their prices… this takes a minute.</span></div></sc-if>` +
  `<sc-if value="{{ nearbyError }}" hint-placeholder-val=""><div style="font-size:12px;color:${DANGER};margin-top:-6px">{{ nearbyError }}</div></sc-if>` +
  // nowhere to look yet
  '<sc-if value="{{ nearbyNeedsLocation }}" hint-placeholder-val="{{ false }}">' +
  `<button type="button" sc-camel-on-click="{{ nearbyGoSettings }}" style="display:flex;flex-direction:column;gap:6px;padding:14px 16px;border:0;background:${SURFACE};border-radius:${R_CARD};box-shadow:${CARD_SHADOW};cursor:pointer;font-family:inherit;text-align:left;color:${INK}">` +
  '<span style="font-size:14px;line-height:1.5">Baketly checks what bakeries near you charge, twice a week. It needs to know where you sell.</span>' +
  `<span style="font-size:13px;font-weight:600;color:${OLIVE_700}">Add where you sell ›</span></button></sc-if>` +
  '<sc-if value="{{ nearbyAwaiting }}" hint-placeholder-val="{{ false }}">' +
  `<div style="font-size:13px;color:${MUTED}">No local prices yet. Baketly checks twice a week, or tap ↻ to check now.</div></sc-if>` +
  '<sc-if value="{{ nearbyHasRows }}" hint-placeholder-val="{{ true }}">' +
  `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid ${HAIRLINE};border-radius:${R_STRIP};background:${SURFACE};overflow:hidden">` +
  cell("In range", "{{ nearbyInRange }}", OLIVE_700, true) +
  cell("Out of range", "{{ nearbyOutOfRange }}", AMBER) +
  cell("No match", "{{ nearbyNoMatch }}") +
  "</div>" +
  '<div style="display:flex;flex-direction:column;gap:10px">' +
  head("Your products", "") +
  whiteCard(
    '<sc-for list="{{ nearbyRows }}" as="n" hint-placeholder-count="5">' +
      `<button type="button" sc-camel-on-click="{{ n.open }}" style="display:flex;align-items:center;gap:12px;min-height:58px;border:0;border-top:{{ n.sep }};background:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;color:${INK}">` +
      textCol("{{ n.name }}", "{{ n.sub }}") +
      tag("n.tag") +
      CHEVRON +
      "</button></sc-for>",
  ) +
  "</div></sc-if>" +
  '<sc-if value="{{ nearbyHasUnread }}" hint-placeholder-val="{{ true }}">' +
  '<div style="display:flex;flex-direction:column;gap:10px">' +
  head("Worth a look yourself", "{{ nearbyUnreadMeta }}") +
  `<div style="font-size:12px;color:${MUTED};padding:0 2px;margin-top:-4px">Baketly couldn't read prices from these. Their sites open in your browser.</div>` +
  whiteCard(
    '<sc-for list="{{ nearbyUnread }}" as="u" hint-placeholder-count="3">' +
      shopRow(
        "u",
        `<sc-if value="{{ u.hasUri }}" hint-placeholder-val="{{ true }}"><span style="flex:none;display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:${OLIVE_700}">Open${OUT}</span></sc-if>`,
        "52px",
      ) +
      "</sc-for>",
  ) +
  "</div></sc-if>" +
  "</div>";

/* --------------------------------------------------------------- product */

const productScreen =
  '<div style="padding:14px 20px 32px;display:flex;flex-direction:column;gap:18px">' +
  topBar("Nearby prices", "", '<span style="width:40px"></span>') +
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
  '<div style="min-width:0;display:flex;flex-direction:column"><h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25">{{ npName }}</h1>' +
  `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ npSub }}</span></div>` +
  tag("npTag") +
  "</div>" +
  `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border:1px solid ${HAIRLINE};border-radius:${R_STRIP};background:${SURFACE};overflow:hidden">` +
  `<div style="padding:12px 14px;display:flex;flex-direction:column;gap:2px"><div style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${LABEL}">Your price</div><div style="font-weight:600;font-size:22px;line-height:1.2;${TNUM}">{{ npYours }}</div></div>` +
  `<div style="padding:12px 14px;border-left:1px solid ${HAIRLINE};display:flex;flex-direction:column;gap:2px"><div style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${LABEL}">Nearby median</div><div style="font-weight:600;font-size:22px;line-height:1.2;${TNUM}">{{ npMedian }}</div></div>` +
  '<sc-if value="{{ npHasRange }}" hint-placeholder-val="{{ true }}">' +
  `<div style="grid-column:1 / -1;border-top:1px solid ${HAIRLINE};padding:12px 14px 14px;display:flex;flex-direction:column;gap:8px">` +
  '<div style="position:relative;height:8px;border-radius:4px;background:#efe9dd">' +
  `<div style="position:absolute;left:{{ npFillLeft }};width:{{ npFillWidth }};height:100%;border-radius:4px;background:${OLIVE_DIM}"></div>` +
  `<div style="position:absolute;left:{{ npDot }};top:-5px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:${OLIVE};border:3px solid ${SURFACE};box-shadow:0 2px 10px rgba(60,55,30,.18);box-sizing:border-box"></div></div>` +
  `<div style="display:flex;justify-content:space-between;gap:10px;font-size:11px;color:${LABEL};${TNUM}"><span>{{ npRangeLine }}</span><span style="color:${OLIVE_700};font-weight:600;white-space:nowrap">{{ npYouLine }}</span></div>` +
  "</div></sc-if></div>" +
  '<div style="font-size:14px;line-height:1.6">{{ npSaying }}</div>' +
  '<sc-if value="{{ npSearched }}" hint-placeholder-val="{{ false }}">' +
  `<div style="font-size:12px;line-height:1.45;color:${LABEL};padding:10px 12px;border-radius:12px;background:${OLIVE_SOFT};margin-top:-6px">Found by a web search rather than read from the shops' own pages, so treat these numbers as a hint.</div></sc-if>` +
  '<sc-if value="{{ npHasSuggested }}" hint-placeholder-val="{{ true }}">' +
  '<div style="display:flex;flex-direction:column;gap:10px">' +
  head("If you wanted to move", "") +
  '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">' +
  '<sc-for list="{{ npSuggested }}" as="s" hint-placeholder-count="3">' +
  `<button type="button" sc-camel-on-click="{{ s.set }}" style="height:56px;border:1px solid {{ s.border }};border-radius:${R_FIELD};background:{{ s.bg }};color:${INK};font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px">` +
  `<span style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${LABEL}">{{ s.label }}</span>` +
  `<span style="font-size:15px;font-weight:600;${TNUM}">{{ s.value }}</span></button>` +
  "</sc-for></div>" +
  `<sc-if value="{{ npShowHint }}" hint-placeholder-val="{{ true }}"><div style="font-size:12px;color:${MUTED};padding:0 2px">{{ npHint }}</div></sc-if>` +
  '<sc-if value="{{ npJustSet }}" hint-placeholder-val="{{ false }}">' +
  `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;color:${OLIVE_700};padding:0 2px;${TNUM}"><span>{{ npSetLine }}</span>` +
  `<button type="button" sc-camel-on-click="{{ npUndo }}" style="flex:none;border:0;background:none;padding:0 2px;min-height:32px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:${OLIVE_700};text-decoration:underline">Undo</button></div></sc-if>` +
  "</div></sc-if>" +
  '<sc-if value="{{ npHasShops }}" hint-placeholder-val="{{ true }}">' +
  '<div style="display:flex;flex-direction:column;gap:10px">' +
  head("Who sells it", "tap a shop to open its page") +
  whiteCard(
    '<sc-for list="{{ npShops }}" as="c" hint-placeholder-count="3">' +
      shopRow("c", `<span style="flex:none;font-size:13px;font-weight:600;${TNUM}">{{ c.price }}</span>`, "52px") +
      "</sc-for>",
  ) +
  "</div></sc-if>" +
  "</div>";

/* ----------------------------------------------------------------- wiring */

function addScreens(template: string): string {
  // beside "What changed", the screen they came out of
  const anchor = '<sc-if value="{{ onAlerts }}" hint-placeholder-val="{{ false }}">';
  return swapOnce(
    template,
    anchor,
    `<sc-if value="{{ onNearby }}" hint-placeholder-val="{{ false }}">${listScreen}</sc-if>` +
      `<sc-if value="{{ onNearbyProduct }}" hint-placeholder-val="{{ false }}">${productScreen}</sc-if>` +
      anchor,
    `${LABEL_} screens`,
  );
}

/** The row above the recipe search opens these, and counts with the same verdicts. */
function rerouteRow(template: string): string {
  let out = swapOnce(template, 'sc-camel-on-click="{{ goAlerts }}"', 'sc-camel-on-click="{{ goNearby }}"', `${LABEL_} row`);
  out = swapOnce(out, "{{ recNearbyWhen }}", "{{ nearbyRowWhen }}", `${LABEL_} row when`);
  out = swapOnce(out, '<sc-if value="{{ recNearbyHasOut }}"', '<sc-if value="{{ nearbyRowHasOut }}"', `${LABEL_} row has out`);
  return swapOnce(out, "{{ recNearbyOut }}", "{{ nearbyRowOut }}", `${LABEL_} row out`);
}

export function applyNearbyPricesBehavior(template: string): string {
  return rerouteRow(addScreens(addBindings(template)));
}

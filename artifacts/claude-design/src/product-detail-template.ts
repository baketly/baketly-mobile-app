// One product, from Analytics.
//
// design/mobile-redesign/screens/ProductDetail.dc.html: back to Products, a
// round button that opens the recipe, the name and its share of the month,
// a fact strip (sold, earned, share, margin), what it sold each of the last
// six months as bars with the count on each, what it was charged as a line
// with the price written where it changed, the saved price beside what it
// costs to make, and its all-time ledger.
//
// The figures are the product controller's (product-analytics-template.ts).
// Two differ from the old page: Earned is what was left after making it, as
// everywhere else in Analytics -- the old strip put revenue under that
// label -- and the price line is drawn across the six months it covers, so
// a month that sold nothing is a gap in time rather than a point dropped.
// A recipe that has been deleted has no recipe to open, and no button.

import { factStrip } from "./design/pieces";
import {
  CARD_SHADOW, DANGER, GOLD, HAIRLINE, INK, LABEL, MUTED, OLIVE, OLIVE_700, OLIVE_DIM, R_CARD, SURFACE, TNUM,
} from "./design/tokens";
import { scBlock, swapOnce } from "./template-blocks";

const LABEL_ = "Product detail";

const svg = (size: number, paths: string, width = "1.75") =>
  `<svg width="${size}" height="${size}" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

/* ------------------------------------------------------------- controller */

/**
 * In the product controller's scope: chosen, window6, selected, monthRevenue,
 * unitCostOf, totalsOf, money, CUR, shortMonth, now.
 */
const bindings = `          ...(() => {
            const whole = v => (v < 0 ? '\\u2212' : '') + CUR + Math.round(Math.abs(v)).toLocaleString('en-US');
            const monthOf = key => { const p = String(key).split('-').map(Number); return new Date(p[0], (p[1] || 1) - 1, 1); };
            const longName = key => monthOf(key).toLocaleString('en-US', { month: 'long' })
              + (monthOf(key).getFullYear() === now.getFullYear() ? '' : ' ' + monthOf(key).getFullYear());
            const entry = chosen || { name: '', months: {} };
            const month = entry.months[selected] || { items: 0, revenue: 0, cost: 0 };
            const totals = totalsOf(entry);
            const share = monthRevenue > 0 ? Math.round((month.revenue / monthRevenue) * 100) : 0;
            const most = Math.max(0, ...window6.map(k => (entry.months[k] || {}).items || 0));
            // the price is drawn across the six months, at the middle of each column
            // to the cent: a discounted sale moves the average by fractions of one
            const points = window6.map((k, i) => ({ i, b: entry.months[k] })).filter(p => p.b && p.b.items > 0)
              .map(p => ({ i: p.i, price: Math.round((p.b.revenue / p.b.items) * 100) / 100 }));
            const low = points.length ? Math.min(...points.map(p => p.price)) : 0;
            const high = points.length ? Math.max(...points.map(p => p.price)) : 0;
            const span = high - low;
            const xOf = i => (i + 0.5) * 50;
            const yOf = price => span > 0.005 ? 52 - ((price - low) / span) * 24 : 40;
            const best = Object.keys(entry.months).filter(k => entry.months[k].items > 0)
              .sort((a, b) => entry.months[b].items - entry.months[a].items)[0];
            const saved = entry.recipe ? Number(entry.recipe.price) || 0 : 0;
            const cost = unitCostOf(entry.recipe);
            const recipeId = entry.recipe ? entry.recipe.id : '';
            return {
              pdName: entry.name || 'Untitled recipe',
              pdSub: longName(selected) + ' \\u00b7 ' + share + "% of the month's sales",
              pdSold: String(month.items),
              pdEarned: whole(month.revenue - month.cost),
              pdShare: share + '%',
              pdMargin: month.revenue > 0 ? Math.round(((month.revenue - month.cost) / month.revenue) * 100) + '%' : '\\u2014',
              pdBars: window6.map(k => {
                const n = (entry.months[k] || {}).items || 0;
                return { value: String(n), label: shortMonth(k),
                  h: (most > 0 ? Math.max(4, Math.round((n / most) * 76)) : 4) + 'px',
                  bg: k === selected ? '${OLIVE}' : '${OLIVE_DIM}' };
              }),
              pdHasPrices: points.length > 0,
              pdNoPrices: points.length === 0,
              pdPriceRange: !points.length ? '' : points.length > 1 && Math.abs(points[0].price - points[points.length - 1].price) > 0.005
                ? money(points[0].price) + ' \\u2192 ' + money(points[points.length - 1].price) : money(points[points.length - 1].price),
              pdLine: points.map(p => xOf(p.i).toFixed(1) + ',' + yOf(p.price).toFixed(1)).join(' '),
              pdDots: points.map(p => ({ left: (xOf(p.i) / 3).toFixed(2) + '%', top: (yOf(p.price) / 64 * 100).toFixed(2) + '%' })),
              // the price written where it starts and wherever it changes
              pdPriceTags: points.filter((p, n) => n === 0 || Math.abs(p.price - points[n - 1].price) > 0.005).map(p => ({
                text: money(p.price),
                left: (xOf(p.i) / 3).toFixed(2) + '%',
                bottom: (64 - yOf(p.price) + 8).toFixed(1) + 'px',
                shift: p.i === 0 ? '-12%' : p.i === 5 ? '-88%' : '-50%'
              })),
              pdMonths: window6.map(k => ({ label: shortMonth(k) })),
              pdSavedCost: (saved > 0 ? money(saved) : 'no saved price') + ' \\u00b7 ' + (cost > 0 ? money(cost) : '\\u2014'),
              pdAllSold: String(totals.items),
              pdAllRevenue: whole(totals.revenue),
              pdAllCost: (totals.cost > 0.004 ? '\\u2212' : '') + whole(totals.cost),
              pdAllEarned: whole(totals.revenue - totals.cost),
              pdAllMargin: (totals.revenue > 0 ? Math.round(((totals.revenue - totals.cost) / totals.revenue) * 100) : 0) + '%',
              pdBest: best ? 'best month \\u00b7 ' + longName(best) + ', ' + entry.months[best].items + ' sold' : 'nothing sold yet',
              pdNeverSold: totals.items === 0,
              pdHasRecipe: !!recipeId,
              pdOpenRecipe: () => { if (recipeId) this.setState(st => ({ screen: 'recipeEditor', editingKey: '', stack: this.stackTo(st, 'recipeEditor'), activeRecipeId: recipeId, recipeDraft: null, recipeDeleteOpen: false, ingPickerOpen: false, packPickerOpen: false })); }
            };
          })(),
`;

function addBindings(template: string): string {
  return swapOnce(
    template,
    "          onAnalyticsProduct: screen === 'analyticsProduct',\n",
    bindings + "          onAnalyticsProduct: screen === 'analyticsProduct',\n",
    `${LABEL_} bindings`,
  );
}

/* ----------------------------------------------------------------- screen */

const head = (title: string, meta: string) =>
  '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:0 2px">' +
  `<h6 style="margin:0;font-size:15px;font-weight:700;line-height:1.3">${title}</h6>` +
  `<span style="font-size:12px;color:${MUTED};${TNUM};text-align:right">${meta}</span></div>`;

const section = (title: string, meta: string, body: string) =>
  `<div style="display:flex;flex-direction:column;gap:10px">${head(title, meta)}${body}</div>`;

const box = (padding: string, gap: string, body: string) =>
  `<div style="background:${SURFACE};border-radius:${R_CARD};padding:${padding};box-shadow:${CARD_SHADOW};display:flex;flex-direction:column;gap:${gap}">${body}</div>`;

const months = (list: string, gap: string) =>
  `<div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:${gap};font-size:11px;color:${LABEL};text-align:center">` +
  `<sc-for list="{{ ${list} }}" as="m" hint-placeholder-count="6"><span>{{ m.label }}</span></sc-for></div>`;

const ledgerRow = (label: string, value: string, first = false, valueStyle = "") =>
  `<div style="display:flex;justify-content:space-between;min-height:38px;align-items:center${first ? "" : `;border-top:1px solid ${HAIRLINE}`}">` +
  `<span>${label}</span><span style="font-weight:500${valueStyle ? ";" + valueStyle : ""}">${value}</span></div>`;

const screen =
  '<div style="padding:14px 20px 32px;display:flex;flex-direction:column;gap:18px">' +
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
  `<button type="button" sc-camel-on-click="{{ backFromAnalyticsDetail }}" style="display:flex;align-items:center;gap:4px;min-height:44px;margin-left:-4px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:${OLIVE_700}">${svg(16, '<path d="M15 6l-6 6 6 6"></path>')}Products</button>` +
  `<span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${GOLD}">Product</span>` +
  '<span style="width:40px;height:40px;display:grid">' +
  '<sc-if value="{{ pdHasRecipe }}" hint-placeholder-val="{{ true }}">' +
  `<button type="button" sc-camel-on-click="{{ pdOpenRecipe }}" aria-label="Open recipe" style="width:40px;height:40px;border-radius:50%;border:0;padding:0;cursor:pointer;background:${SURFACE};color:${INK};display:grid;place-items:center">${svg(16, '<path d="M6 3h9l4 4v14H6z"></path><path d="M9 12h7M9 16h5"></path>')}</button>` +
  "</sc-if></span></div>" +
  '<div style="display:flex;flex-direction:column">' +
  '<h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25">{{ pdName }}</h1>' +
  `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ pdSub }}</span></div>` +
  factStrip([
    { label: "Sold", value: "{{ pdSold }}" },
    { label: "Earned", value: "{{ pdEarned }}", good: true },
    { label: "Share", value: "{{ pdShare }}" },
    { label: "Margin", value: "{{ pdMargin }}" },
  ]) +
  section(
    "Sold each month",
    "last six months",
    box(
      "14px 16px 12px",
      "6px",
      `<div style="display:flex;align-items:flex-end;gap:8px;height:96px;border-bottom:1px solid ${HAIRLINE}">` +
        '<sc-for list="{{ pdBars }}" as="b" hint-placeholder-count="6">' +
        '<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;height:100%">' +
        `<span style="font-size:11px;font-weight:600;${TNUM}">{{ b.value }}</span>` +
        '<div style="width:100%;max-width:32px;height:{{ b.h }};border-radius:4px 4px 0 0;background:{{ b.bg }}"></div></div>' +
        "</sc-for></div>" +
        months("pdBars", "8px"),
    ),
  ) +
  section(
    "What you charged",
    "{{ pdPriceRange }}",
    box(
      "14px 16px 12px",
      "8px",
      '<sc-if value="{{ pdHasPrices }}" hint-placeholder-val="{{ true }}">' +
        // the line stretches with the card; the dots and prices are laid over
        // it in percentages, so they stay round and upright at any width
        '<div style="position:relative;height:64px" role="img" aria-label="Price charged over the last six months">' +
        '<svg width="100%" height="64" sc-camel-view-box="0 0 300 64" sc-camel-preserve-aspect-ratio="none" aria-hidden="true" style="position:absolute;inset:0;display:block;overflow:visible">' +
        `<polyline points="{{ pdLine }}" fill="none" stroke="${OLIVE}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" sc-camel-vector-effect="non-scaling-stroke"></polyline></svg>` +
        '<sc-for list="{{ pdDots }}" as="d" hint-placeholder-count="3">' +
        `<span style="position:absolute;left:{{ d.left }};top:{{ d.top }};width:8px;height:8px;margin:-6px 0 0 -6px;border-radius:50%;background:${SURFACE};border:2px solid ${OLIVE}"></span>` +
        "</sc-for>" +
        '<sc-for list="{{ pdPriceTags }}" as="t" hint-placeholder-count="2">' +
        `<span style="position:absolute;left:{{ t.left }};bottom:{{ t.bottom }};transform:translateX({{ t.shift }});font-size:11px;font-weight:600;color:${LABEL};white-space:nowrap;${TNUM}">{{ t.text }}</span>` +
        "</sc-for></div>" +
        months("pdMonths", "0") +
        "</sc-if>" +
        '<sc-if value="{{ pdNoPrices }}" hint-placeholder-val="{{ false }}">' +
        `<div style="font-size:13px;color:${MUTED}">Nothing sold in the last six months, so there is no price to show yet.</div></sc-if>` +
        `<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;border-top:1px solid ${HAIRLINE};padding-top:8px;${TNUM}">` +
        `<span style="color:${LABEL}">Saved price · costs to make</span><span style="font-weight:600">{{ pdSavedCost }}</span></div>`,
    ),
  ) +
  section(
    "All time",
    "{{ pdBest }}",
    `<div style="background:${SURFACE};border-radius:${R_CARD};padding:4px 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column;font-size:13px;${TNUM}">` +
      ledgerRow("Sold", "{{ pdAllSold }}", true) +
      ledgerRow("Revenue", "{{ pdAllRevenue }}") +
      ledgerRow("Ingredients and packaging", "{{ pdAllCost }}", false, `color:${DANGER}`) +
      `<div style="display:flex;justify-content:space-between;min-height:42px;align-items:center;border-top:1px solid ${INK};font-size:15px;font-weight:700"><span>Earned</span><span style="color:${OLIVE_700}">{{ pdAllEarned }}</span></div>` +
      `<div style="display:flex;justify-content:space-between;min-height:32px;align-items:center;font-size:12px;color:${LABEL}"><span>Margin</span><span>{{ pdAllMargin }}</span></div>` +
      "</div>",
  ) +
  '<sc-if value="{{ pdNeverSold }}" hint-placeholder-val="{{ false }}">' +
  `<div style="text-align:center;font-size:13px;color:${MUTED}">This one has not sold yet. It will fill in here once it does.</div></sc-if>` +
  "</div>";

function restyle(template: string): string {
  const block = scBlock(template, '<sc-if value="{{ onAnalyticsProduct }}" hint-placeholder-val="{{ false }}">', `${LABEL_} screen`);
  return template.slice(0, block.innerStart) + screen + template.slice(block.innerEnd);
}

export function applyProductDetailBehavior(template: string): string {
  return restyle(addBindings(template));
}

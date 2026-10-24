// Analytics, in the new design.
//
// design/mobile-redesign/screens/Analytics.dc.html, AnalyticsProducts.dc.html
// and AnalyticsEvents.dc.html: "Analytics" with the month as a button beside
// it, Overview / Products / Events as one segmented control, and under it
//   Overview -- four tiles (revenue, earned, margin, items sold), the last
//     three months as bars with the revenue on each and what was earned
//     under it, the top five products by revenue, and what Baketly noticed;
//   Products -- the best earner and the best margin, the month as a donut
//     beside its legend, then every product with what it sold;
//   Events -- the best event and the average, what each event this month
//     earned as bars (one still to come drawn dashed, at what it is projected
//     to earn), the events held this month, and what Baketly noticed.
// Every bar carries its value, and every chart is one hue: olive for the one
// that matters -- the month chosen, the best event -- and pale olive for the
// rest.
//
// The sums are the analytics controller's own (analytics-template.ts); this
// adds the few views the design shows that it had no binding for, all from
// the same sales and events. Money on the tiles and charts is in whole
// amounts, as the design writes it; the breakdown screens keep their cents.
//
// What the old tabs had and the design does not, and so is no longer drawn:
// the tap-a-slice pie picker (the legend names every slice now), and on
// Events the across-every-event strip, the slowest-sellers / best-margin list
// and the tips for the next market. Their bindings are left as they were.
// The Earned and Items sold tiles still open their breakdowns, and a bar
// still opens its month's, as they did.

import {
  AMBER, BORDER, CARD_SHADOW, GOLD, HAIRLINE, HANDLE, INK, LABEL, MUTED, OLIVE, OLIVE_700, OLIVE_DIM,
  R_CARD, R_STRIP, SURFACE, TNUM,
} from "./design/tokens";
import { scBlock, swapOnce } from "./template-blocks";

const LABEL_ = "Analytics screen";

const svg = (size: number, paths: string, width = "1.75") =>
  `<svg width="${size}" height="${size}" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const CHEVRON = `<span style="flex:none;color:${HANDLE};display:grid">${svg(16, '<path d="M9 6l6 6-6 6"></path>')}</span>`;

/** The donut's five shades, darkest first, as the design has them. */
const DONUT = ["#5f6a2c", "#7d8a3c", "#a3ad63", "#c6cd93", "#e3e6c4"];

/* ------------------------------------------------------------- controller */

/**
 * In the analytics controller's scope: CUR, events, sales, salesByMonth,
 * sortedMonths, sortedAsc, selectedMonth, currentMonthKey, monthData, monthRev,
 * monthProfit, now, otherCostTotal, buildEventStats.
 */
const bindings = `          ...(() => {
            const whole = v => (v < 0 ? '\\u2212' : '') + CUR + Math.round(Math.abs(v)).toLocaleString('en-US');
            const dateOf = key => { const p = String(key).split('-').map(Number); return new Date(p[0], (p[1] || 1) - 1, 1); };
            const keyOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            const back = (key, n) => { const d = dateOf(key); return keyOf(new Date(d.getFullYear(), d.getMonth() - n, 1)); };
            const monthName = key => dateOf(key).toLocaleString('en-US', { month: 'long' });
            const shortName = key => dateOf(key).toLocaleString('en-US', { month: 'short' });
            const thisMonth = selectedMonth === currentMonthKey;
            const inMonth = thisMonth ? 'this month' : 'in ' + monthName(selectedMonth);
            const recipes = Array.isArray(this.state.recipeRecords) ? this.state.recipeRecords : [];
            const sep = i => i ? '1px solid ${HAIRLINE}' : '0';
            const openProduct = id => () => this.setState(st => ({ analyticsProductId: id, screen: 'analyticsProduct', stack: [...st.stack, st.screen] }));
            // the month a booth fee belongs to takes it off that month, as the Earned tile does
            const feesIn = key => events.filter(ev => String(ev.occurredAt || '').slice(0, 7) === key)
              .reduce((s, ev) => s + (Number(ev.boothFee) || 0) + otherCostTotal(ev), 0);
            const earnedIn = key => { const b = salesByMonth[key] || { revenue: 0, cost: 0 }; return b.revenue - b.cost - feesIn(key); };
            const seg = on => ({ bg: on ? '${OLIVE}' : 'transparent', fg: on ? '${SURFACE}' : '${MUTED}' });
            const tab = this.state.analyticsTab || 'overview';

            // ---- overview ----------------------------------------------
            // against the last month before it that sold anything, as the tile always has
            const prevKey = (() => {
              const i = sortedAsc.indexOf(selectedMonth);
              for (let j = i - 1; j >= 0; j--) if (salesByMonth[sortedAsc[j]] && salesByMonth[sortedAsc[j]].revenue > 0) return sortedAsc[j];
              return '';
            })();
            const prevRev = prevKey ? salesByMonth[prevKey].revenue : 0;
            const diff = prevRev > 0 ? Math.round(((monthRev - prevRev) / prevRev) * 100) : null;
            const three = [2, 1, 0].map(n => back(selectedMonth, n));
            const topRev = Math.max(0, ...three.map(k => (salesByMonth[k] || {}).revenue || 0));
            const ranked = Object.keys(monthData.products)
              .map(id => ({ id, ...monthData.products[id] }))
              .sort((a, b) => b.revenue - a.revenue);
            const sold = ranked.filter(p => p.revenue > 0);
            const soldTotal = sold.reduce((s, p) => s + p.revenue, 0);
            const topFive = sold.slice(0, 5);

            // ---- products ----------------------------------------------
            const marginOf = p => p.revenue > 0 ? Math.round(((p.revenue - p.cost) / p.revenue) * 100) : 0;
            const bestEarner = sold.slice().sort((a, b) => (b.revenue - b.cost) - (a.revenue - a.cost))[0] || null;
            const bestMargin = sold.slice().sort((a, b) => marginOf(b) - marginOf(a))[0] || null;
            // five slices at most: past five, the fifth is everything else
            const slices = sold.length > 5
              ? sold.slice(0, 4).map(p => ({ id: p.id, name: p.name, revenue: p.revenue }))
                .concat([{ id: '', name: 'Everything else', revenue: sold.slice(4).reduce((s, p) => s + p.revenue, 0) }])
              : sold.map(p => ({ id: p.id, name: p.name, revenue: p.revenue }));
            const C = 2 * Math.PI * 38;
            const gap = slices.length > 1 ? 2 : 0;
            let at = 0;
            const donut = slices.map((s, i) => {
              const len = soldTotal > 0 ? (s.revenue / soldTotal) * C : 0;
              const drawn = Math.max(0.01, len - gap);
              const out = { color: ${JSON.stringify(DONUT)}[i], dash: drawn.toFixed(2) + ' ' + (C - drawn).toFixed(2), offset: (-at).toFixed(2), name: s.name,
                pct: (soldTotal > 0 ? Math.round((s.revenue / soldTotal) * 100) : 0) + '%' };
              at += len;
              return out;
            });
            const colourOf = id => {
              const i = slices.findIndex(s => s.id === id);
              if (i >= 0) return donut[i].color;
              return sold.some(p => p.id === id) ? donut[donut.length - 1].color : '${BORDER}';
            };
            // every recipe is a product, sold this month or not
            const listed = ranked.concat(recipes.filter(r => !monthData.products[r.id])
              .map(r => ({ id: r.id, name: r.name || 'Untitled recipe', revenue: 0, items: 0, cost: 0 })));

            // ---- events ------------------------------------------------
            const localDay = iso => { const m = String(iso || '').match(/^(\\d{4})-(\\d{2})-(\\d{2})/); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null; };
            const unitCost = r => ((r.ingredientKeys || []).reduce((s, k) => s + (Number((r.amounts || {})[k]) || 0) * (this.ING_META[k] ? this.ING_META[k].per : 0), 0)
              / Math.max(1, Number(r.yield) || 1)) + (r.packagingKeys || []).reduce((s, k) => s + (this.PACK_META[k] ? this.PACK_META[k].per : 0), 0);
            // a planned event: what its lineup would take, less making it and the fees
            const projected = ev => (ev.plannedItems || []).reduce((s, it) => {
              const r = recipes.find(x => x.id === (it && it.productId));
              const q = Math.max(0, Number(it && it.quantity) || 0);
              return r ? s + q * ((Number(r.price) || 0) - unitCost(r)) : s;
            }, 0) - (Number(ev.boothFee) || 0) - otherCostTotal(ev);
            const monthEvents = events.filter(ev => String(ev.occurredAt || '').slice(0, 7) === selectedMonth)
              .map(ev => ev.status === 'planned' ? { ev, planned: true, value: projected(ev) } : { ev, planned: false, stats: buildEventStats(ev), value: buildEventStats(ev).profitValue })
              .sort((a, b) => String(a.ev.occurredAt || '').localeCompare(String(b.ev.occurredAt || '')));
            const held = monthEvents.filter(e => !e.planned);
            const best = held.slice().sort((a, b) => b.value - a.value)[0] || null;
            const topAbs = Math.max(0, ...monthEvents.map(e => Math.abs(e.value)));
            const dayLabel = ev => { const d = localDay(ev.occurredAt); return d ? d.toLocaleString('en-US', { month: 'short', day: 'numeric' }) : ''; };

            const bar = (value, top, max, on, dashed) => ({
              h: (top > 0 ? Math.max(4, Math.round((Math.abs(value) / top) * max)) : 4) + 'px',
              bg: dashed ? '${SURFACE}' : on ? '${OLIVE}' : '${OLIVE_DIM}',
              border: dashed ? '1.5px dashed ${OLIVE_DIM}' : '0',
              valueColor: dashed ? '${MUTED}' : '${INK}'
            });

            return {
              anMonthLabel: monthName(selectedMonth) + (dateOf(selectedMonth).getFullYear() === now.getFullYear() ? '' : ' ' + dateOf(selectedMonth).getFullYear()),
              anSegOverview: seg(tab === 'overview'), anSegProducts: seg(tab === 'products'), anSegEvents: seg(tab === 'events'),
              anRevenue: whole(monthRev),
              anRevHasDiff: diff !== null,
              anRevNoDiff: diff === null,
              anRevArrow: diff === null ? '' : (diff >= 0 ? '\\u2191' : '\\u2193') + Math.abs(diff) + '%',
              anRevArrowColor: diff !== null && diff < 0 ? '${AMBER}' : '${OLIVE_700}',
              anRevVs: prevKey ? 'vs ' + monthName(prevKey) : '',
              anEarned: whole(monthProfit),
              anEarnedColor: monthProfit < 0 ? '${AMBER}' : '${OLIVE_700}',
              anItems: String(monthData.items),
              anTrend: three.map(k => {
                const rev = (salesByMonth[k] || {}).revenue || 0;
                return { value: whole(rev), ...bar(rev, topRev, 70, k === selectedMonth, false), top: shortName(k), bottom: 'earned ' + whole(earnedIn(k)),
                  // a month's bar opens what it earned, as the trend's bars did
                  open: () => this.setState(st => ({ analyticsMonth: k, screen: 'analyticsKept', stack: [...st.stack, st.screen] })) };
              }),
              anTopFive: topFive.map((p, i) => ({ name: p.name, value: whole(p.revenue), sep: sep(i),
                w: Math.max(3, Math.round((p.revenue / (topFive[0].revenue || 1)) * 100)) + '%', bg: i === 0 ? '${OLIVE}' : '${OLIVE_DIM}', open: openProduct(p.id) })),
              anHasTopFive: topFive.length > 0,
              anNoTopFive: topFive.length === 0,
              anNothingSold: 'Nothing sold ' + inMonth + ' yet.',
              anTopMeta: 'top ' + Math.min(5, sold.length),

              anBestEarner: bestEarner ? bestEarner.name : '\\u2014',
              anBestEarnerSub: bestEarner ? whole(bestEarner.revenue - bestEarner.cost) + ' earned ' + inMonth : 'nothing sold ' + inMonth,
              anBestMargin: bestMargin ? bestMargin.name : '\\u2014',
              anBestMarginSub: bestMargin ? marginOf(bestMargin) + '% after ingredients' : 'nothing sold ' + inMonth,
              anHasDonut: donut.length > 0,
              anDonut: donut,
              anDonutTotal: whole(soldTotal),
              anDonutWhen: inMonth,
              anProducts: listed.map((p, i) => ({
                name: p.name || 'Untitled recipe',
                sub: p.items + ' sold \\u00b7 ' + (soldTotal > 0 ? Math.round((p.revenue / soldTotal) * 100) : 0) + '% of the month',
                value: whole(p.revenue), dot: colourOf(p.id), sep: sep(i), open: openProduct(p.id)
              })),
              anHasProducts: listed.length > 0,
              anNoProducts: listed.length === 0,

              anBestEvent: best ? (String(best.ev.name || '').trim() || 'Event') : '\\u2014',
              anBestEventSub: best ? whole(best.value) + ' earned \\u00b7 ' + best.stats.marginStr + ' margin' : 'none held ' + inMonth,
              anPerEvent: held.length ? whole(held.reduce((s, e) => s + e.value, 0) / held.length) : '\\u2014',
              anPerEventSub: held.length ? 'earned on average' : 'none held ' + inMonth,
              anEventBars: monthEvents.map(e => ({ value: whole(e.value), ...bar(e.value, topAbs, 70, !!best && e === best, e.planned),
                top: dayLabel(e.ev), bottom: e.planned ? 'projected' : (String(e.ev.name || '').trim() || 'Event'),
                open: e.planned ? (() => {}) : e.stats.open })),
              anHasEventBars: monthEvents.length > 0,
              anNoEventBars: monthEvents.length === 0,
              anNoEvents: 'No events ' + inMonth + '.',
              anHeldMeta: held.length + ' ' + inMonth,
              anHeld: held.slice().reverse().map((e, i) => {
                const fee = (Number(e.ev.boothFee) || 0) + otherCostTotal(e.ev);
                return {
                  title: (String(e.ev.name || '').trim() || 'Event') + ' \\u00b7 ' + dayLabel(e.ev),
                  sub: 'took ' + whole(e.stats.revenueValue) + ' \\u00b7 ' + (fee > 0 ? whole(fee) + ' fee' : 'no fee') + ' \\u00b7 ' + e.stats.marginStr + ' margin',
                  value: whole(e.value), color: e.value < 0 ? '${AMBER}' : '${OLIVE_700}', sep: sep(i), open: e.stats.open
                };
              }),
              anHasHeld: held.length > 0
            };
          })(),
`;

function addBindings(template: string): string {
  return swapOnce(
    template,
    "          analyticsOverviewTab: tab === 'overview',\n",
    bindings + "          analyticsOverviewTab: tab === 'overview',\n",
    `${LABEL_} bindings`,
  );
}

/* ----------------------------------------------------------------- pieces */

/** A figure, or a name: a product or an event name is set smaller, to fit on two lines. */
const tile = (label: string, value: string, sub: string, valueColor = INK, onTap = "", size = "22px") =>
  `<div${onTap ? ` sc-camel-on-click="${onTap}"` : ""} style="min-width:0;background:${SURFACE};border-radius:${R_STRIP};padding:14px 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column;gap:2px${onTap ? ";cursor:pointer" : ""}">` +
  `<span style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${LABEL}">${label}</span>` +
  `<span style="font-size:${size};font-weight:600;line-height:1.2;color:${valueColor};${TNUM};overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere">${value}</span>` +
  `<span style="font-size:11px;color:${MUTED};${TNUM}">${sub}</span></div>`;

const tiles = (...cells: string[]) =>
  `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">${cells.join("")}</div>`;

const head = (title: string, meta: string) =>
  '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:0 2px">' +
  `<h6 style="margin:0;font-size:15px;font-weight:700;line-height:1.3">${title}</h6>` +
  `<span style="font-size:12px;color:${MUTED};${TNUM};white-space:nowrap">${meta}</span></div>`;

const section = (title: string, meta: string, body: string) =>
  `<div style="display:flex;flex-direction:column;gap:10px">${head(title, meta)}${body}</div>`;

const whiteCard = (padding: string, body: string) =>
  `<div style="background:${SURFACE};border-radius:${R_CARD};padding:${padding};box-shadow:${CARD_SHADOW};display:flex;flex-direction:column">${body}</div>`;

/** Bars with the value on each, and two lines under each. */
const barChart = (list: string, count: number) =>
  whiteCard(
    "16px 16px 14px",
    '<div style="display:flex;flex-direction:column;gap:8px">' +
      `<div style="display:flex;align-items:flex-end;gap:10px;height:100px;border-bottom:1px solid ${HAIRLINE}">` +
      `<sc-for list="{{ ${list} }}" as="b" hint-placeholder-count="${count}">` +
      '<div sc-camel-on-click="{{ b.open }}" style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;height:100%;cursor:pointer">' +
      `<span style="font-size:11px;font-weight:600;color:{{ b.valueColor }};${TNUM};white-space:nowrap">{{ b.value }}</span>` +
      '<div style="width:100%;max-width:44px;height:{{ b.h }};border-radius:4px 4px 0 0;background:{{ b.bg }};border:{{ b.border }};box-sizing:border-box"></div>' +
      "</div></sc-for></div>" +
      `<div style="display:flex;gap:10px;font-size:11px;color:${LABEL};text-align:center">` +
      `<sc-for list="{{ ${list} }}" as="b" hint-placeholder-count="${count}">` +
      '<span style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;line-height:1.3">' +
      `<span style="font-weight:600;color:${INK};white-space:nowrap">{{ b.top }}</span>` +
      `<span style="max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${TNUM}">{{ b.bottom }}</span></span>` +
      "</sc-for></div></div>",
  );

const noticed = (text: string, onTap: string) =>
  `<div sc-camel-on-click="{{ ${onTap} }}" style="display:flex;flex-direction:column;gap:6px;padding:14px 16px;background:${SURFACE};border-radius:${R_CARD};box-shadow:${CARD_SHADOW};cursor:pointer">` +
  `<span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${GOLD}">Baketly noticed</span>` +
  `<div style="font-size:13px;line-height:1.55">{{ ${text} }}</div></div>`;

const empty = (text: string) =>
  whiteCard("16px", `<div style="font-size:13px;color:${MUTED};text-align:center">${text}</div>`);

/* ------------------------------------------------------------------ pages */

const header =
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
  '<div style="display:flex;flex-direction:column"><h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25">Analytics</h1>' +
  `<span style="font-size:12px;color:${MUTED}">Updated with every sale</span></div>` +
  // a select laid over the button, so the phone's own picker opens
  `<label style="position:relative;flex:none;display:flex;align-items:center;gap:6px;height:40px;padding:0 14px;border:1px solid ${BORDER};border-radius:14px;background:${SURFACE};color:${INK};font-size:13px;font-weight:600;cursor:pointer">` +
  `{{ anMonthLabel }}${svg(14, '<path d="M6 9l6 6 6-6"></path>')}` +
  '<select value="{{ analyticsMonth }}" data-bk-options="{{ monthOptionsJson }}" sc-camel-on-change="{{ setAnalyticsMonth }}" aria-label="Month" ' +
  'style="position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;font-size:16px"></select></label>' +
  "</div>" +
  `<div role="group" aria-label="Analytics section" style="display:flex;gap:4px;padding:4px;border:1px solid ${BORDER};border-radius:14px;background:${SURFACE}">` +
  [
    ["Overview", "setAnalyticsOverview", "anSegOverview"],
    ["Products", "setAnalyticsProducts", "anSegProducts"],
    ["Events", "setAnalyticsEvents", "anSegEvents"],
  ]
    .map(
      ([label, onTap, seg]) =>
        `<button type="button" sc-camel-on-click="{{ ${onTap} }}" style="flex:1;height:36px;border:0;border-radius:10px;background:{{ ${seg}.bg }};color:{{ ${seg}.fg }};font-family:inherit;font-size:12px;font-weight:600;cursor:pointer">${label}</button>`,
    )
    .join("") +
  "</div>";

const page = (inner: string) => `<div style="display:flex;flex-direction:column;gap:14px">${inner}</div>`;

const overview = page(
  tiles(
    tile(
      "Revenue",
      "{{ anRevenue }}",
      `<sc-if value="{{ anRevHasDiff }}" hint-placeholder-val="{{ true }}"><span style="color:{{ anRevArrowColor }};font-weight:600">{{ anRevArrow }}</span> {{ anRevVs }}</sc-if>` +
        '<sc-if value="{{ anRevNoDiff }}" hint-placeholder-val="{{ false }}">nothing to compare yet</sc-if>',
    ),
    tile("Earned", "{{ anEarned }}", "after all costs", "{{ anEarnedColor }}", "{{ goAnalyticsKept }}"),
    tile("Margin", "{{ monthMarginStr }}", "{{ monthLabourNote }}"),
    tile("Items sold", "{{ anItems }}", "{{ monthOrdersSplit }}", INK, "{{ goAnalyticsItems }}"),
  ) +
    section("Last three months", "revenue", barChart("anTrend", 3)) +
    section(
      "Revenue by product",
      "{{ anTopMeta }}",
      '<sc-if value="{{ anHasTopFive }}" hint-placeholder-val="{{ true }}">' +
        whiteCard(
          "2px 16px",
          '<sc-for list="{{ anTopFive }}" as="t" hint-placeholder-count="5">' +
            '<button type="button" sc-camel-on-click="{{ t.open }}" style="display:flex;align-items:center;gap:12px;min-height:44px;border:0;border-top:{{ t.sep }};background:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;color:inherit">' +
            '<span style="width:118px;flex:none;font-size:13px;font-weight:500;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ t.name }}</span>' +
            '<div style="flex:1;height:8px;border-radius:4px;background:#efe9dd;overflow:hidden"><div style="width:{{ t.w }};height:100%;border-radius:4px;background:{{ t.bg }}"></div></div>' +
            `<span style="flex:none;min-width:48px;text-align:right;font-size:13px;font-weight:600;${TNUM}">{{ t.value }}</span></button>` +
            "</sc-for>",
        ) +
        "</sc-if>" +
        `<sc-if value="{{ anNoTopFive }}" hint-placeholder-val="{{ false }}">${empty("{{ anNothingSold }}")}</sc-if>`,
    ) +
    noticed("insightText", "askAboutInsight"),
);

const donutChart =
  '<div style="position:relative;width:150px;height:150px;flex:none">' +
  // one svg a slice: a loop inside an svg is not drawn
  '<sc-for list="{{ anDonut }}" as="s" hint-placeholder-count="5">' +
  '<svg width="150" height="150" sc-camel-view-box="0 0 100 100" aria-hidden="true" style="position:absolute;inset:0;display:block">' +
  '<circle cx="50" cy="50" r="38" fill="none" stroke="{{ s.color }}" stroke-width="16" stroke-dasharray="{{ s.dash }}" stroke-dashoffset="{{ s.offset }}" transform="rotate(-90 50 50)"></circle></svg>' +
  "</sc-for>" +
  '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.2">' +
  `<span style="font-size:17px;font-weight:600;${TNUM}">{{ anDonutTotal }}</span><span style="font-size:11px;color:${MUTED}">{{ anDonutWhen }}</span></div></div>`;

const products = page(
  tiles(
    tile("Best earner", "{{ anBestEarner }}", "{{ anBestEarnerSub }}", OLIVE_700, "", "17px"),
    tile("Best margin", "{{ anBestMargin }}", "{{ anBestMarginSub }}", INK, "", "17px"),
  ) +
    '<sc-if value="{{ anHasDonut }}" hint-placeholder-val="{{ true }}">' +
    `<div role="img" aria-label="Revenue by product {{ anDonutWhen }}" style="background:${SURFACE};border-radius:${R_CARD};padding:16px;box-shadow:${CARD_SHADOW};display:flex;align-items:center;gap:16px">` +
    donutChart +
    '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">' +
    '<sc-for list="{{ anDonut }}" as="s" hint-placeholder-count="5">' +
    '<div style="display:flex;align-items:center;gap:8px;font-size:12px">' +
    '<span style="width:10px;height:10px;border-radius:3px;background:{{ s.color }};flex:none"></span>' +
    '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ s.name }}</span>' +
    `<span style="font-weight:600;${TNUM}">{{ s.pct }}</span></div></sc-for></div></div></sc-if>` +
    section(
      "Products",
      "sold · share · revenue",
      '<sc-if value="{{ anHasProducts }}" hint-placeholder-val="{{ true }}">' +
        whiteCard(
          "0 16px",
          '<sc-for list="{{ anProducts }}" as="p" hint-placeholder-count="5">' +
            `<button type="button" sc-camel-on-click="{{ p.open }}" style="display:flex;align-items:center;gap:12px;min-height:52px;border:0;border-top:{{ p.sep }};background:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;color:${INK}">` +
            '<span style="width:10px;height:10px;border-radius:3px;background:{{ p.dot }};flex:none"></span>' +
            '<div style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ p.name }}</span>' +
            `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ p.sub }}</span></div>` +
            `<span style="font-size:13px;font-weight:600;${TNUM}">{{ p.value }}</span>` +
            CHEVRON +
            "</button></sc-for>",
        ) +
        "</sc-if>" +
        `<sc-if value="{{ anNoProducts }}" hint-placeholder-val="{{ false }}">${empty("Save a recipe and it will show up here with what it sells.")}</sc-if>`,
    ),
);

const eventsPage = page(
  tiles(
    tile("Best event", "{{ anBestEvent }}", "{{ anBestEventSub }}", OLIVE_700, "", "17px"),
    tile("Per event", "{{ anPerEvent }}", "{{ anPerEventSub }}"),
  ) +
    section(
      "Earned by event",
      "{{ anMonthLabel }}",
      `<sc-if value="{{ anHasEventBars }}" hint-placeholder-val="{{ true }}">${barChart("anEventBars", 4)}</sc-if>` +
        `<sc-if value="{{ anNoEventBars }}" hint-placeholder-val="{{ false }}">${empty("{{ anNoEvents }}")}</sc-if>`,
    ) +
    '<sc-if value="{{ anHasHeld }}" hint-placeholder-val="{{ true }}">' +
    section(
      "Past events",
      "{{ anHeldMeta }}",
      whiteCard(
        "2px 16px",
        '<sc-for list="{{ anHeld }}" as="e" hint-placeholder-count="3">' +
          `<button type="button" sc-camel-on-click="{{ e.open }}" style="display:flex;align-items:center;gap:12px;min-height:50px;border:0;border-top:{{ e.sep }};background:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;color:${INK}">` +
          '<div style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ e.title }}</span>' +
          `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ e.sub }}</span></div>` +
          `<span style="font-size:13px;font-weight:600;color:{{ e.color }};${TNUM}">{{ e.value }}</span></button>` +
          "</sc-for>",
      ),
    ) +
    "</sc-if>" +
    noticed("marketsInsightText", "askAboutMarketsInsight"),
);

/** The three pages, one after another, so the swipe can lay them on a track. */
const screen =
  '<div style="padding:14px 20px 28px;display:flex;flex-direction:column;gap:14px">' +
  header +
  `<sc-if value="{{ analyticsOverviewTab }}" hint-placeholder-val="{{ true }}">${overview}</sc-if>` +
  `<sc-if value="{{ analyticsProductsTab }}" hint-placeholder-val="{{ false }}">${products}</sc-if>` +
  `<sc-if value="{{ analyticsEventsTab }}" hint-placeholder-val="{{ false }}">${eventsPage}</sc-if>` +
  "</div>";

function restyle(template: string): string {
  const block = scBlock(template, '<sc-if value="{{ onAnalytics }}" hint-placeholder-val="{{ false }}">', `${LABEL_} block`);
  return template.slice(0, block.innerStart) + screen + template.slice(block.innerEnd);
}

export function applyAnalyticsScreenBehavior(template: string): string {
  return restyle(addBindings(template));
}

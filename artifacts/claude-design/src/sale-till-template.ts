// Ringing up a sale.
//
// design/mobile-redesign/screens/SaleChooser.dc.html: the wallet opens one
// sheet -- "Single sale", or one of the planned events, and a way to plan
// another -- where it used to be a two-button dialog followed by a second
// dialog listing events.
//
// SaleTill.dc.html is the counter till: search, group chips, a card of rows
// with − count + on each, and the dock with the customer's total, Clear and
// Charge. SaleTillEvent.dc.html is the same till at an event: its day and
// name, a running line (sales so far, taken, what is left of the lineup),
// only the lineup until something is searched for, "of N left" on each row,
// and × to leave the event, ✓ to finish it.
//
// What the till does is unchanged -- counting, stock, charging, leaving and
// finishing are sale-template.ts's; this draws them and adds the few lines
// they are shown with.

import { sheet } from "./design/pieces";
import {
  BORDER, CARD_SHADOW, GOLD, HAIRLINE, HANDLE, INK, MUTED, OLIVE, OLIVE_700, OLIVE_DIM, OLIVE_SOFT,
  R_BUTTON, R_CARD, R_FIELD, SURFACE, TNUM,
} from "./design/tokens";
import { scBlock, swapOnce } from "./template-blocks";

const LABEL_ = "Till";

const svg = (size: number, paths: string, width = "1.75") =>
  `<svg width="${size}" height="${size}" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const CHEVRON = `<span style="flex:none;color:${HANDLE};display:grid">${svg(16, '<path d="M9 6l6 6-6 6"></path>')}</span>`;
const WALLET = svg(20, '<path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H3z"></path><path d="M3 8h17a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><path d="M16 14h2"></path>');

/* ------------------------------------------------------------- controller */

/** In the sale controller's scope: events, sales, attachedEvent, openSaleScreen, CUR. */
const saleBindings = `          saleEventOptions: upcomingForSale,
          ...(() => {
            const money = v => CUR + (Math.abs(v - Math.round(v)) < 0.005 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2));
            const localDay = iso => { const m = String(iso || '').match(/^(\\d{4})-(\\d{2})-(\\d{2})/); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null; };
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const daysTo = d => d ? Math.round((d.getTime() - today.getTime()) / 86400000) : null;
            const relative = n => n === null ? '' : n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : n > 1 ? 'In ' + n + ' days' : (-n) + ' days ago';
            const salesAt = id => sales.filter(sale => sale && sale.eventId === id);
            const soldAt = id => {
              const sold = {};
              salesAt(id).forEach(sale => (sale.lineItems || []).forEach(line => { sold[line.productId] = (sold[line.productId] || 0) + (Number(line.quantity) || 0); }));
              return sold;
            };
            // the events still to sell at, from today on first, as on Events
            const planned = events.filter(ev => ev && ev.status === 'planned')
              .map(ev => ({ ev, day: localDay(ev.occurredAt) }))
              .sort((a, b) => {
                const ah = (daysTo(a.day) ?? -1) >= 0, bh = (daysTo(b.day) ?? -1) >= 0;
                if (ah !== bh) return ah ? -1 : 1;
                return (a.day ? a.day.getTime() : 0) - (b.day ? b.day.getTime() : 0);
              });
            const ev = attachedEvent;
            const evDay = ev ? localDay(ev.occurredAt) : null;
            const evSales = ev ? salesAt(ev.id) : [];
            const evSold = ev ? soldAt(ev.id) : {};
            const evPlanned = ev ? (ev.plannedItems || []).reduce((s, item) => s + Math.max(0, Number(item && item.quantity) || 0), 0) : 0;
            // what is left counts this customer's basket too, as each row does
            const basket = this.state.posQty || {};
            const evLeft = ev ? (ev.plannedItems || []).reduce((s, item) => s + Math.max(0, (Number(item && item.quantity) || 0) - (evSold[item && item.productId] || 0) - (Number(basket[item && item.productId]) || 0)), 0) : 0;
            const taken = evSales.reduce((s, sale) => s + (Number(sale.total) || 0), 0);
            return {
              saleEventRows: planned.map(({ ev: event, day }, i) => {
                const count = (event.plannedItems || []).filter(item => item && Number(item.quantity) > 0).length;
                const takenHere = salesAt(event.id).reduce((s, sale) => s + (Number(sale.total) || 0), 0);
                return {
                  name: String(event.name || '').trim() || 'Event',
                  weekday: day ? day.toLocaleString('en-US', { weekday: 'short' }) : '',
                  dayNum: day ? String(day.getDate()) : '\\u2014',
                  sub: [relative(daysTo(day)), count ? count + (count === 1 ? ' product' : ' products') : 'no lineup yet', takenHere > 0 ? money(takenHere) + ' taken' : (count ? 'nothing sold yet' : '')].filter(Boolean).join(' \\u00b7 '),
                  // the next one stands out, as on Events
                  tileBg: i === 0 ? '${OLIVE}' : '${OLIVE_SOFT}',
                  tileColor: i === 0 ? '${SURFACE}' : '${OLIVE_700}',
                  sep: i ? '1px solid ${HAIRLINE}' : '0',
                  choose: () => openSaleScreen({ saleEventId: event.id })
                };
              }),
              saleHasEvents: planned.length > 0,
              saleNoEvents: planned.length === 0,
              saleKicker: ev ? 'Selling at an event' : 'New sale',
              saleSingleSub: today.toLocaleString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }) + ' \\u00b7 over the counter',
              saleEvWeekday: evDay ? evDay.toLocaleString('en-US', { weekday: 'short' }) : '',
              saleEvDayNum: evDay ? String(evDay.getDate()) : '\\u2014',
              saleRunningLine: evSales.length + (evSales.length === 1 ? ' sale' : ' sales') + ' so far \\u00b7 ' + money(taken) + ' taken'
                + (evPlanned > 0 ? ' \\u00b7 ' + evLeft + ' of ' + evPlanned + ' left' : ''),
              saleSearchPlaceholder: ev ? 'Ring up anything else' : 'Search recipes'
            };
          })(),
`;

/** A till row's counter, and how many of the lineup are left at an event. */
const rowBindings = `                  addOpacity: stockGone ? '0.35' : '1',
                  qtyColor: n > 0 ? '${INK}' : '#b9b4a8',
                  decOpacity: n > 0 ? '1' : '0.4',
                  plusBg: n > 0 ? '${OLIVE}' : '${OLIVE_SOFT}',
                  plusColor: n > 0 ? '${SURFACE}' : '${OLIVE_700}',
                  fewerAria: 'One fewer ' + r.name,
                  moreAria: 'One more ' + r.name,
                  leftLine: stockLeft === null ? '' : stockGone ? 'sold out' : stockLeft + ' of ' + stockPlanned + ' left',
                  leftColor: stockLeft !== null && stockLeft <= 2 ? '#b07a1f' : '${MUTED}',`;

function addBindings(template: string): string {
  let out = swapOnce(template, "          saleEventOptions: upcomingForSale,\n", saleBindings, `${LABEL_} bindings`);
  out = swapOnce(out, "                  addOpacity: stockGone ? '0.35' : '1',", rowBindings, `${LABEL_} row bindings`);
  // the till's chips in the design's olive
  out = swapOnce(
    out,
    "border: posCat === k ? 'var(--color-accent)' : 'var(--color-neutral-300)',\n" +
      "                bg: posCat === k ? 'var(--color-accent)' : '#fff',\n" +
      "                color: posCat === k ? '#fff' : '#8a8578'",
    `border: posCat === k ? '${OLIVE}' : '${BORDER}',\n` +
      `                bg: posCat === k ? '${OLIVE}' : '${SURFACE}',\n` +
      `                color: posCat === k ? '${SURFACE}' : '${INK}'`,
    `${LABEL_} chips`,
  );
  out = swapOnce(out, "chargeOpacity: total > 0 ? 1 : 0.45,", `chargeOpacity: total > 0 ? 1 : 0.45,\n              chargeBg: total > 0 ? '${OLIVE}' : '${OLIVE_DIM}',`, `${LABEL_} charge colour`);
  // "Create an event" from the sale sheet leaves the sheet behind it
  return swapOnce(
    out,
    "startNewEvent: () => this.setState(st => ({ eventOtherCosts: [],",
    "startNewEvent: () => this.setState(st => ({ saleModeOpen: false, saleEventPickerOpen: false, eventOtherCosts: [],",
    `${LABEL_} new event`,
  );
}

/* ------------------------------------------------------------------- till */

const round = (handler: string, label: string, bg: string, color: string, paths: string, width = "1.75") =>
  `<button type="button" sc-camel-on-click="{{ ${handler} }}" aria-label="${label}" style="width:40px;height:40px;border-radius:50%;border:0;padding:0;cursor:pointer;background:${bg};color:${color};display:grid;place-items:center">${svg(16, paths, width)}</button>`;

const header =
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:40px">' +
  `<span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${GOLD}">{{ saleKicker }}</span>` +
  '<sc-if value="{{ saleAttached }}" hint-placeholder-val="{{ false }}"><div style="display:flex;gap:6px">' +
  round("leaveSaleEvent", "Leave this event without finishing it", SURFACE, INK, '<path d="M6 6l12 12M18 6L6 18"></path>') +
  round("finishSaleEvent", "Finish this event", OLIVE, SURFACE, '<path d="M20 6L9 17l-5-5"></path>', "2.25") +
  "</div></sc-if></div>" +
  '<sc-if value="{{ saleNotAttached }}" hint-placeholder-val="{{ true }}"><div style="display:flex;flex-direction:column">' +
  '<h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25">New sale</h1>' +
  `<span style="font-size:12px;color:${MUTED}">{{ saleSingleSub }}</span></div></sc-if>` +
  '<sc-if value="{{ saleAttached }}" hint-placeholder-val="{{ false }}"><div style="display:flex;align-items:center;gap:12px">' +
  `<span style="flex:none;width:44px;height:44px;border-radius:12px;background:${OLIVE};color:${SURFACE};display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1">` +
  '<span style="font-size:9px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85">{{ saleEvWeekday }}</span>' +
  `<span style="font-size:17px;font-weight:600;${TNUM}">{{ saleEvDayNum }}</span></span>` +
  '<div style="min-width:0;display:flex;flex-direction:column">' +
  '<h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25">{{ saleAttachedName }}</h1>' +
  `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ saleRunningLine }}</span></div></div></sc-if>`;

const search =
  `<label style="display:flex;align-items:center;gap:10px;height:44px;padding:0 16px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};cursor:text">` +
  svg(18, '<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path>').replace('stroke="currentColor"', `stroke="${MUTED}"`) +
  `<input type="search" value="{{ posSearch }}" sc-camel-on-change="{{ setPosSearch }}" placeholder="{{ saleSearchPlaceholder }}" aria-label="{{ saleSearchPlaceholder }}" style="flex:1;min-width:0;border:0;outline:none;background:none;font-family:inherit;font-size:14px;color:${INK}"></label>` +
  '<sc-if value="{{ saleLineupOnly }}" hint-placeholder-val="{{ false }}">' +
  `<div style="font-size:12px;color:${MUTED};padding:0 2px;margin-top:-4px">Your lineup for this event. Search to ring up anything else.</div></sc-if>` +
  '<sc-if value="{{ saleShowCats }}" hint-placeholder-val="{{ true }}">' +
  '<div style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -20px;padding:0 20px">' +
  '<sc-for list="{{ posCats }}" as="f" hint-placeholder-count="5">' +
  '<button type="button" sc-camel-on-click="{{ f.set }}" style="height:30px;padding:0 11px;flex:none;border:1px solid {{ f.border }};background:{{ f.bg }};color:{{ f.color }};border-radius:999px;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer">{{ f.label }}</button>' +
  "</sc-for></div></sc-if>";

const step = (handler: string, aria: string, style: string, glyph: string) =>
  `<button type="button" sc-camel-on-click="{{ p.${handler} }}" aria-label="{{ p.${aria} }}" style="width:38px;height:38px;border-radius:50%;font-family:inherit;font-size:18px;cursor:pointer;display:grid;place-items:center;padding:0;${style}">${glyph}</button>`;

const rows =
  `<div style="background:${SURFACE};border-radius:${R_CARD};padding:0 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column;overflow:hidden">` +
  // pulled up a pixel, so the first row's hairline sits under the card's edge
  '<div style="display:flex;flex-direction:column;margin-top:-1px">' +
  '<sc-for list="{{ posProducts }}" as="p" hint-placeholder-count="6">' +
  `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;min-height:58px;box-sizing:border-box;border-top:1px solid ${HAIRLINE}">` +
  '<div style="flex:1;min-width:0;display:flex;flex-direction:column">' +
  '<span style="font-size:14px;font-weight:500;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ p.name }}</span>' +
  `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ p.priceStr }}<sc-if value="{{ p.stockShow }}" hint-placeholder-val="{{ false }}"> · <span style="color:{{ p.leftColor }}">{{ p.leftLine }}</span></sc-if></span></div>` +
  '<div style="flex:none;display:flex;align-items:center;gap:2px">' +
  step("dec", "fewerAria", `border:1px solid ${BORDER};background:${SURFACE};color:${INK};opacity:{{ p.decOpacity }}`, "−") +
  `<span style="width:36px;text-align:center;font-size:17px;font-weight:600;color:{{ p.qtyColor }};${TNUM}">{{ p.qty }}</span>` +
  step("add", "moreAria", "border:0;background:{{ p.plusBg }};color:{{ p.plusColor }};opacity:{{ p.addOpacity }}", "+") +
  "</div></div></sc-for></div></div>" +
  `<sc-if value="{{ posNoMatch }}" hint-placeholder-val="{{ false }}"><div style="text-align:center;font-size:13px;color:${MUTED};padding:14px 0">Nothing matches that. Try another search or group.</div></sc-if>`;

/** The dock, with the stock notice that floats above it kept as it was. */
function dock(notice: string): string {
  return (
    '<div style="position:sticky;bottom:0;z-index:5;margin:auto -20px 0">' +
    notice +
    `<div style="background:${SURFACE};border-radius:${R_CARD} ${R_CARD} 0 0;box-shadow:0 -8px 30px rgba(60,55,30,.10);padding:16px 20px 20px;display:flex;flex-direction:column;gap:12px">` +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
    `<div style="display:flex;flex-direction:column"><span style="font-size:11px;color:${MUTED};${TNUM}">{{ posItemsLabel }} · this customer</span>` +
    `<span style="font-size:24px;font-weight:600;line-height:1.2;${TNUM}">{{ posTotalStr }}</span></div>` +
    `<button type="button" sc-camel-on-click="{{ posClear }}" style="height:36px;padding:0 12px;border:0;background:none;color:${MUTED};font-family:inherit;font-size:12px;font-weight:600;cursor:pointer">Clear</button>` +
    "</div>" +
    `<button type="button" sc-camel-on-click="{{ goChargeIf }}" style="display:flex;align-items:center;justify-content:center;height:48px;border:0;border-radius:${R_BUTTON};background:{{ chargeBg }};color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">{{ chargeCta }}</button>` +
    "</div></div>"
  );
}

function restyleTill(template: string): string {
  const till = scBlock(template, '<sc-if value="{{ onSale }}" hint-placeholder-val="{{ false }}">', `${LABEL_} screen`);
  const old = template.slice(till.innerStart, till.innerEnd);
  // the "sold out" notice keeps its own markup; it is positioned off the dock
  const noticeBlock = scBlock(old, '<sc-if value="{{ posStockNoticeShow }}" hint-placeholder-val="{{ false }}">', `${LABEL_} notice`);
  const notice = old.slice(noticeBlock.start, noticeBlock.end);
  const screen =
    '<div style="padding:14px 20px 0;display:flex;flex-direction:column;gap:14px;min-height:100%;box-sizing:border-box">' +
    header + search + rows + dock(notice) +
    "</div>";
  return template.slice(0, till.innerStart) + screen + template.slice(till.innerEnd);
}

/* ---------------------------------------------------------------- chooser */

const chooser =
  '<sc-if value="{{ saleModeOpen }}" hint-placeholder-val="{{ false }}">' +
  `<div sc-camel-on-click="{{ closeSaleMode }}" style="position:absolute;inset:0;z-index:40;background:rgba(250,246,240,.45)">` +
  sheet({
    title: "New sale",
    sub: "Where is this one being sold?",
    height: "auto",
    onClose: "{{ dismissSaleMode }}",
    body:
      `<button type="button" sc-camel-on-click="{{ chooseSingleSale }}" style="flex:none;display:flex;align-items:center;gap:14px;padding:14px 16px;border:0;background:${SURFACE};border-radius:${R_CARD};box-shadow:${CARD_SHADOW};color:${INK};cursor:pointer;font-family:inherit;text-align:left">` +
      `<span style="flex:none;width:44px;height:44px;border-radius:14px;background:${OLIVE_SOFT};color:${OLIVE_700};display:grid;place-items:center">${WALLET}</span>` +
      '<span style="flex:1;display:flex;flex-direction:column"><span style="font-size:15px;font-weight:600;line-height:1.3">Single sale</span>' +
      `<span style="font-size:12px;color:${MUTED}">Over the counter or an order · not tied to an event</span></span>` +
      CHEVRON + "</button>" +
      '<div style="flex:none;display:flex;flex-direction:column;gap:10px">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:0 2px">' +
      '<h6 style="margin:0;font-size:15px;font-weight:700;line-height:1.3">At an event</h6>' +
      `<span style="font-size:12px;color:${MUTED}">sales are filed to it</span></div>` +
      '<sc-if value="{{ saleHasEvents }}" hint-placeholder-val="{{ true }}">' +
      `<div style="max-height:min(300px, 38vh);overflow:auto;background:${SURFACE};border-radius:${R_CARD};padding:0 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column">` +
      '<sc-for list="{{ saleEventRows }}" as="se" hint-placeholder-count="2">' +
      `<button type="button" sc-camel-on-click="{{ se.choose }}" style="flex:none;display:flex;align-items:center;gap:12px;min-height:62px;border:0;border-top:{{ se.sep }};background:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;color:${INK}">` +
      '<span style="flex:none;width:44px;height:44px;border-radius:12px;background:{{ se.tileBg }};color:{{ se.tileColor }};display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1">' +
      '<span style="font-size:9px;letter-spacing:0.08em;text-transform:uppercase">{{ se.weekday }}</span>' +
      `<span style="font-size:17px;font-weight:600;${TNUM}">{{ se.dayNum }}</span></span>` +
      '<span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:600;line-height:1.3">{{ se.name }}</span>' +
      `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ se.sub }}</span></span>` +
      CHEVRON + "</button></sc-for></div></sc-if>" +
      '<sc-if value="{{ saleNoEvents }}" hint-placeholder-val="{{ false }}">' +
      `<div style="font-size:13px;color:${MUTED};padding:0 2px">No events planned yet.</div></sc-if>` +
      '<div style="padding:0 0 max(30px, env(safe-area-inset-bottom))">' +
      `<button type="button" sc-camel-on-click="{{ startNewEvent }}" style="width:100%;display:flex;align-items:center;justify-content:center;min-height:36px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:${OLIVE_700}">Selling somewhere else? Create an event</button></div>` +
      "</div>",
  }) +
  "</div></sc-if>";

function replaceChooser(template: string): string {
  const mode = scBlock(template, '<sc-if value="{{ saleModeOpen }}" hint-placeholder-val="{{ false }}">', `${LABEL_} chooser`);
  let out = template.slice(0, mode.start) + chooser + template.slice(mode.end);
  // the second dialog, which listed the events, is part of the sheet now
  const picker = scBlock(out, '<sc-if value="{{ saleEventPickerOpen }}" hint-placeholder-val="{{ false }}">', `${LABEL_} event picker`);
  out = out.slice(0, picker.start) + out.slice(picker.end);
  return out;
}

export function applySaleTillBehavior(template: string): string {
  return replaceChooser(restyleTill(addBindings(template)));
}

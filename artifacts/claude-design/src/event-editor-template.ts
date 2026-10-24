// Planning an event, and the list of them.
//
// design/mobile-redesign/screens/NewEvent.dc.html and NewEventFilled.dc.html:
// one scrolling form -- the day and the name, Date and Hours, Market ·
// Pop-up · Order with the fee beside it, the lineup with a quantity box and
// revenue on each row and "Shopping list ›" over it, the other costs -- and
// the dock with what it would take and what you'd earn after everything.
// AddProduct.dc.html is the products picker, now a sheet with a ticked list;
// AddCost.dc.html is a sheet for a cost, which used to be a blank row.
//
// Markets.dc.html is the list, called Events: the next event as a full card
// with projected, you'd earn and how ready it is, the later ones slim, then
// the latest past events with what they earned and their margin. The full
// history, and comparing events, is Analytics' job; the list links there.
//
// The kind of event and its hours are new on a saved event (kind, startTime,
// endTime). A market with no hours saves exactly what it did before, so the
// server only needs to know about them once an event carries them. While a
// form is open they are held as typed for that one event (evMeta), so
// opening another event never shows the last one's hours.

import { card, swipeRow, sheet } from "./design/pieces";
import {
  BORDER, CARD_SHADOW, HAIRLINE, HANDLE, INK, LABEL, MUTED, OLIVE, OLIVE_700, OLIVE_DIM, OLIVE_SOFT,
  R_BUTTON, R_CARD, R_FIELD, SURFACE, TNUM,
} from "./design/tokens";
import { currencySymbolExpr } from "./currency";
import { scBlock, swapOnce } from "./template-blocks";

const LABEL_ = "Event editor";

const svg = (size: number, paths: string, width = "1.75") =>
  `<svg width="${size}" height="${size}" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const PLUS_16 = svg(16, '<path d="M12 5v14M5 12h14"></path>', "2");
const PLUS_18 = svg(18, '<path d="M12 5v14M5 12h14"></path>', "2");
const CHEVRON = svg(14, '<path d="M9 6l6 6-6 6"></path>');
const TICK = svg(14, '<path d="M20 6L9 17l-5-5"></path>', "3");

/* ------------------------------------------------------------- controller */

/** In the event controller's scope: recipes, events, sales, picked, saved, eventId, unitCost, CUR. */
const formBindings = `          ...(() => {
            const border = '1px solid ${HAIRLINE}';
            const qtyOf = id => Math.max(0, Number((this.state.evQty || {})[id]) || 0);
            const money = v => CUR + (Math.abs(v - Math.round(v)) < 0.005 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2));
            const signed = v => (v < 0 ? '\\u2212' : '') + money(Math.abs(v));
            const clock = s => s ? String(Number(s.slice(0, 2))) + ':' + s.slice(3, 5) : '';
            const localDay = iso => { const m = String(iso || '').match(/^(\\d{4})-(\\d{2})-(\\d{2})/); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null; };
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const daysTo = d => d ? Math.round((d.getTime() - today.getTime()) / 86400000) : null;
            const relative = n => n === null ? '' : n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : n > 1 ? 'In ' + n + ' days' : (-n) + ' days ago';
            const costsOf = ev => (Array.isArray(ev.otherCosts) ? ev.otherCosts : []).reduce((s, c) => s + (Number(c && c.amount) || 0), 0);
            const shopRowsFor = items => {
              const ing = {}; const pack = {};
              items.forEach(([recipe, qty]) => {
                if (!(qty > 0)) return;
                (recipe.ingredientKeys || []).forEach(k => { ing[k] = true; });
                (recipe.packagingKeys || []).forEach(k => { pack[k] = true; });
              });
              return Object.keys(ing).length + Object.keys(pack).length;
            };

            // ---- the form --------------------------------------------
            const meta = this.state.evMeta && this.state.evMeta.id === eventId ? this.state.evMeta
              : { id: eventId, kind: (saved && saved.kind) || 'market', start: (saved && saved.startTime) || '', end: (saved && saved.endTime) || '' };
            const setMeta = change => this.setState({ evMeta: { ...meta, ...change } });
            const asTime = v => /^([01]\\d|2[0-3]):[0-5]\\d$/.test(String(v || '')) ? String(v) : '';
            const day = localDay(this.state.eventDate);
            const lineup = picked.map(id => recipes.find(r => r.id === id)).filter(Boolean);
            const projected = lineup.reduce((s, r) => s + qtyOf(r.id) * (Number(r.price) || 0), 0);
            const baking = lineup.reduce((s, r) => s + qtyOf(r.id) * unitCost(r), 0);
            const booth = Math.max(0, Number(this.state.eventBoothFee) || 0);
            const others = (Array.isArray(this.state.eventOtherCosts) ? this.state.eventOtherCosts : [])
              .reduce((s, c) => s + Math.max(0, Number(c && c.amount) || 0), 0);
            const earn = projected - baking - booth - others;
            const planning = lineup.some(r => qtyOf(r.id) > 0);
            // the fee in pieces of the product that earns most on each one
            const best = lineup.filter(r => qtyOf(r.id) > 0)
              .map(r => ({ r, gain: (Number(r.price) || 0) - unitCost(r) }))
              .sort((a, b) => b.gain - a.gain)[0];
            const cover = booth > 0 && best && best.gain > 0 ? Math.ceil(booth / best.gain) : 0;
            const shopRows = shopRowsFor(lineup.map(r => [r, qtyOf(r.id)]));
            const editingNow = this.state.evSaved !== true || (this.state.editingKey || '') === 'ev:' + eventId;
            const draftCost = this.state.evCostDraft || { label: '', amount: '' };
            const costReady = String(draftCost.label || '').trim() && Number(draftCost.amount) > 0;
            const closeCost = () => this.setState({ evCostSheetOpen: false, evCostDraft: { label: '', amount: '' } });

            // ---- the list --------------------------------------------
            const planned = events.filter(ev => ev && ev.status === 'planned')
              .sort((a, b) => new Date(a.occurredAt || 0).getTime() - new Date(b.occurredAt || 0).getTime());
            const describe = ev => {
              const d = localDay(ev.occurredAt);
              const items = (ev.plannedItems || []).map(item => [recipes.find(r => r.id === item.productId), Math.max(0, Number(item.quantity) || 0)]).filter(([r]) => r);
              const take = items.reduce((s, [r, q]) => s + q * (Number(r.price) || 0), 0);
              const make = items.reduce((s, [r, q]) => s + q * unitCost(r), 0);
              const hours = ev.startTime || ev.endTime ? (clock(ev.startTime) || '?') + '\\u2013' + (clock(ev.endTime) || '?') : '';
              const count = items.filter(([, q]) => q > 0).length;
              return {
                name: String(ev.name || '').trim() || 'Event',
                weekday: d ? d.toLocaleString('en-US', { weekday: 'short' }) : '',
                dayNum: d ? String(d.getDate()) : '\\u2014',
                sub: [relative(daysTo(d)), hours, count ? count + (count === 1 ? ' product' : ' products') : 'no lineup yet'].filter(Boolean).join(' \\u00b7 '),
                projected: money(take),
                earn: signed(take - make - (Number(ev.boothFee) || 0) - costsOf(ev)),
                earnColor: take - make - (Number(ev.boothFee) || 0) - costsOf(ev) < 0 ? '#b07a1f' : '${OLIVE_700}',
                right: count ? money(take) : 'Plan',
                rightColor: count ? '${INK}' : '${OLIVE_700}',
                items
              };
            };
            // opened the way the old list opened them, in the same order
            const rows = planned.map((ev, i) => ({ ...describe(ev), ev, ahead: (daysTo(localDay(ev.occurredAt)) ?? -1) >= 0, open: (upcoming[i] && upcoming[i].open) || (() => {}) }));
            // "next" is the first from today on, as on Home; one whose day has
            // gone without being completed waits at the end of the list
            const ahead = rows.filter(r => r.ahead);
            const overdue = rows.filter(r => !r.ahead);
            const next = ahead[0] || null;
            // the shopping list's ticks, read the way Home and the event read them
            const nextShopRows = next ? shopRowsFor(next.items) : 0;
            const ticked = this.state.shopChecked || {};
            let nextTicked = 0;
            for (let i = 0; i < nextShopRows; i++) if (ticked[i]) nextTicked++;
            const nextReady = nextShopRows > 0 && nextTicked === nextShopRows ? 1 : 0;

            return {
              // form
              evFormKicker: saved ? 'Edit event' : 'New event',
              evScreenDisplay: editingNow ? 'flex' : 'block',
              evFormWeekday: day ? day.toLocaleString('en-US', { weekday: 'short' }) : '',
              evFormDayNum: day ? String(day.getDate()) : '\\u2014',
              evDatePill: day ? day.toLocaleString('en-US', { weekday: 'short' }) + ' ' + day.getDate() + ' ' + day.toLocaleString('en-US', { month: 'short' }) : 'Pick a day',
              evHoursPill: meta.start || meta.end ? (clock(meta.start) || '?') + '\\u2013' + (clock(meta.end) || '?') : 'add',
              evHoursColor: meta.start || meta.end ? '${INK}' : '#b9b4a8',
              evStart: meta.start,
              evEnd: meta.end,
              setEvStart: e => setMeta({ start: asTime(e && e.target ? e.target.value : '') }),
              setEvEnd: e => setMeta({ end: asTime(e && e.target ? e.target.value : '') }),
              evKinds: [['market', 'Market'], ['popup', 'Pop-up'], ['order', 'Order']].map(([kind, label]) => ({
                label,
                on: meta.kind === kind,
                bg: meta.kind === kind ? '${OLIVE}' : 'transparent',
                color: meta.kind === kind ? '${SURFACE}' : '${MUTED}',
                pick: () => setMeta({ kind })
              })),
              evFormHasLineup: lineup.length > 0,
              evFormNoLineup: lineup.length === 0,
              evShopLink: 'Shopping list \\u00b7 ' + shopRows,
              evFormOtherMeta: others > 0 ? money(others) : 'optional',
              evFormHasOthers: (Array.isArray(this.state.eventOtherCosts) ? this.state.eventOtherCosts : []).length > 0,
              evFormNoOthers: !(Array.isArray(this.state.eventOtherCosts) ? this.state.eventOtherCosts : []).length,
              // dock
              evDockEmpty: !planning,
              evDockFull: planning,
              evDockProjected: money(projected),
              evDockCover: cover ? 'fee covered by ' + cover + ' \\u00d7 ' + (String(best.r.name || '').trim() || 'one product') : booth > 0 ? 'fee not covered yet' : 'no fee',
              evDockEarn: signed(earn),
              evDockEarnColor: earn < 0 ? '#b07a1f' : '${OLIVE_700}',
              evDockAfter: 'after ' + money(baking) + ' to bake, ' + money(booth) + ' fee, ' + money(others) + ' other',
              evSaveBg: planning ? '${OLIVE}' : '${OLIVE_DIM}',
              // the cost sheet
              evCostSheetOpen: this.state.evCostSheetOpen === true,
              openCostSheet: () => this.setState({ evCostSheetOpen: true, evCostDraft: { label: '', amount: '' } }),
              dismissCostSheet: closeCost,
              closeCostSheet: e => { if (!e || e.target === e.currentTarget) closeCost(); },
              costDraftLabel: String(draftCost.label || ''),
              costDraftAmount: String(draftCost.amount || ''),
              setCostDraftLabel: e => this.setState(st => ({ evCostDraft: { ...(st.evCostDraft || {}), label: String(e.target.value || '').slice(0, 60) } })),
              setCostDraftAmount: e => this.setState(st => ({ evCostDraft: { ...(st.evCostDraft || {}), amount: String(e.target.value || '').replace(/[^0-9.]/g, '').slice(0, 10) } })),
              costAddBg: costReady ? '${OLIVE}' : '${OLIVE_DIM}',
              addCostFromSheet: () => {
                if (!costReady) return;
                this.setState(st => ({
                  eventOtherCosts: [...(Array.isArray(st.eventOtherCosts) ? st.eventOtherCosts : []), { label: String(draftCost.label).trim(), amount: String(Number(draftCost.amount)) }],
                  evCostSheetOpen: false, evCostDraft: { label: '', amount: '' }
                }));
              },
              // the list
              evListMeta: planned.length + ' planned',
              evListHas: rows.length > 0,
              evListNone: rows.length === 0,
              evListNext: next ? [{ ...next, ready: nextReady + ' of 3', readyColor: nextReady === 3 ? '${OLIVE_700}' : '#b07a1f' }] : [],
              evListLater: [...ahead.slice(1), ...overdue]
            };
          })(),
          evSaveLabel: this.state.evSaved === true ? 'Save changes' : 'Save event',
`;

/** In the analytics controller's scope: allPastEventStats, allPastEvents. */
const listBindings = `          ...(() => {
            const now = new Date();
            const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
            const all = Array.isArray(this.state.eventRecords) ? this.state.eventRecords : [];
            const thisMonth = all.filter(ev => String(ev.occurredAt || '').slice(0, 7) === month).length;
            const earned = allPastEventStats.filter(ev => String(ev.occurredAt || '').slice(0, 7) === month)
              .reduce((s, ev) => s + (Number(ev.profitValue) || 0), 0);
            const money = v => CUR + Math.round(v).toLocaleString('en-US');
            return {
              eventsHeaderSub: now.toLocaleString('en-US', { month: 'long' }) + ' \\u00b7 ' + thisMonth + (thisMonth === 1 ? ' event' : ' events')
                + (earned !== 0 ? ' \\u00b7 ' + (earned < 0 ? '\\u2212' : '') + money(Math.abs(earned)) + ' earned so far' : ''),
              evPastHas: allPastEvents.length > 0,
              evPastNone: allPastEvents.length === 0,
              evPastRecent: allPastEvents.slice(0, 5).map((ev, i) => ({ ...ev, sep: i ? '1px solid ${HAIRLINE}' : '0' })),
              // the whole history, and comparing events, is in Analytics
              openPastEvents: () => this.setState({ screen: 'analytics', stack: [], analyticsTab: 'events' })
            };
          })(),
          marketsInsightText,
`;

const pickerRow =
  `name: recipe.name || 'Untitled recipe',
          check: staged.includes(recipe.id) ? '✓' : '',
          ariaChecked: staged.includes(recipe.id) ? 'true' : 'false',
          boxBg: staged.includes(recipe.id) ? '${OLIVE}' : '${SURFACE}',
          boxBorder: staged.includes(recipe.id) ? '${OLIVE}' : '${HANDLE}',
          tickOpacity: staged.includes(recipe.id) ? '1' : '0',
          sep: available.indexOf(recipe) ? '1px solid ${HAIRLINE}' : '0',
          // the price, what one costs, and how many went last time it was taken
          sub: (() => {
            const base = CUR + (Number(recipe.price) || 0).toFixed(2) + ' \\u00b7 costs ' + CUR + unitCost(recipe).toFixed(2);
            const past = events.filter(ev => ev && ev.status !== 'planned' && ev.id !== eventId)
              .sort((a, b) => new Date(b.occurredAt || 0).getTime() - new Date(a.occurredAt || 0).getTime());
            for (const ev of past) {
              const n = sales.filter(sale => sale && sale.eventId === ev.id)
                .reduce((s, sale) => s + (sale.lineItems || []).filter(l => l && l.productId === recipe.id).reduce((m, l) => m + (Number(l.quantity) || 0), 0), 0);
              if (n > 0) return base + ' \\u00b7 sold ' + n + ' last time';
            }
            return base;
          })(),`;

function addBindings(template: string): string {
  let out = swapOnce(template, "          evSaveLabel: this.state.evSaved === true ? 'Save changes' : 'Save event',\n", formBindings, `${LABEL_} form bindings`);
  out = swapOnce(out, "          marketsInsightText,\n", listBindings, `${LABEL_} list bindings`);
  out = swapOnce(out, "name: recipe.name || 'Untitled recipe',\n          check: staged.includes(recipe.id) ? '✓' : '',", pickerRow, `${LABEL_} picker rows`);
  out = swapOnce(out, "evPickerCanAdd: staged.length > 0,", `evPickerCanAdd: staged.length > 0,\n          evPickerAddBg: staged.length ? '${OLIVE}' : '${OLIVE_DIM}',`, `${LABEL_} picker button`);
  out = swapOnce(
    out,
    "border: typeFilter === key ? 'var(--color-accent)' : 'var(--color-neutral-300)',\n" +
      "              bg: typeFilter === key ? 'var(--color-accent)' : '#fff',\n" +
      "              color: typeFilter === key ? '#fff' : '#8a8578'",
    `border: typeFilter === key ? '${OLIVE}' : '${BORDER}',\n` +
      `              bg: typeFilter === key ? '${OLIVE}' : '${SURFACE}',\n` +
      `              color: typeFilter === key ? '${SURFACE}' : '${INK}'`,
    `${LABEL_} picker chips`,
  );
  // a lineup row says what one sells for and costs, and names its box
  out = swapOnce(
    out,
    "          ...this.swipeRow('ev:' + p.id, () => dropFromLineup(p.id)),",
    "          ...this.swipeRow('ev:' + p.id, () => dropFromLineup(p.id)),\n" +
      `          subLine: ${currencySymbolExpr} + (Number(p.price) || 0).toFixed(2) + ' each \\u00b7 costs ' + ${currencySymbolExpr} + (Number(p.cost) || 0).toFixed(2),\n` +
      "          qtyAria: p.name + ' quantity',",
    `${LABEL_} lineup rows`,
  );
  // A new event starts unnamed, as the design's does; one saved without a
  // name is a "New event" rather than a "New market". Unnamed is undefined,
  // not "": the saved workspace refuses an empty name, and refuses the whole
  // save with it -- setEventName stores a cleared box the same way.
  out = swapOnce(out, "eventName: 'New market', eventDate:", "eventName: undefined, eventDate:", `${LABEL_} new name`);
  out = out.split("|| 'New market',").join("|| 'New event',");
  // what kind of event it is and its hours go into the saved record
  return swapOnce(
    out,
    "            ...(otherCosts.length ? { otherCosts } : {}),\n",
    "            ...(otherCosts.length ? { otherCosts } : {}),\n" +
      "            ...(() => {\n" +
      "              const meta = st.evMeta && st.evMeta.id === st.eventCurrentId ? st.evMeta\n" +
      "                : { kind: saved && saved.kind, start: saved && saved.startTime, end: saved && saved.endTime };\n" +
      "              return {\n" +
      "                ...(meta.kind && meta.kind !== 'market' ? { kind: meta.kind } : {}),\n" +
      "                ...(meta.start ? { startTime: meta.start } : {}),\n" +
      "                ...(meta.end ? { endTime: meta.end } : {})\n" +
      "              };\n" +
      "            })(),\n",
    `${LABEL_} saved record`,
  );
}

/* ------------------------------------------------------------------- form */

const pillShell = (inner: string, extra = "") =>
  `<label style="position:relative;flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:8px;height:44px;padding:0 14px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};box-sizing:border-box;cursor:pointer;${extra}">${inner}</label>`;

const overlay = (type: string, value: string, onChange: string, aria: string, where: string) =>
  `<input type="${type}" value="{{ ${value} }}" sc-camel-on-change="{{ ${onChange} }}" aria-label="${aria}" ` +
  `style="position:absolute;top:0;bottom:0;${where};width:auto;height:100%;margin:0;padding:0;border:0;opacity:0;cursor:pointer;font-size:16px">`;

const formTop =
  '<div style="display:flex;flex-direction:column;gap:12px">' +
  '<div style="display:flex;align-items:center;gap:12px">' +
  `<div style="flex:none;width:56px;height:56px;border-radius:${R_FIELD};background:${OLIVE_SOFT};color:${OLIVE_700};display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1">` +
  '<span style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase">{{ evFormWeekday }}</span>' +
  `<span style="font-size:22px;font-weight:600;${TNUM}">{{ evFormDayNum }}</span></div>` +
  `<input type="text" value="{{ eventName }}" sc-camel-on-change="{{ setEventName }}" sc-camel-on-focus="{{ focusEventName }}" placeholder="Name the event" aria-label="Event name" style="flex:1;min-width:0;box-sizing:border-box;height:56px;padding:0 16px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};color:${INK};font-family:inherit;font-weight:600;font-size:20px">` +
  "</div>" +
  '<div style="display:flex;gap:10px">' +
  pillShell(
    `<span style="font-size:12px;color:${LABEL}">Date</span>` +
      `<span style="font-size:13px;font-weight:600;color:${INK};${TNUM}">{{ evDatePill }}</span>` +
      // the whole pill opens the phone's date picker
      overlay("date", "eventDate", "setEventDate", "Event date", "left:0;right:0"),
  ) +
  pillShell(
    `<span style="font-size:12px;color:${LABEL}">Hours</span>` +
      `<span style="font-size:13px;font-weight:600;color:{{ evHoursColor }};${TNUM}">{{ evHoursPill }}</span>` +
      // the left half sets when it opens, the right half when it closes
      overlay("time", "evStart", "setEvStart", "Opens at", "left:0;width:50%") +
      overlay("time", "evEnd", "setEvEnd", "Closes at", "left:50%;width:50%"),
  ) +
  "</div>" +
  '<div style="display:flex;gap:10px">' +
  `<div role="group" aria-label="Event type" style="flex:1.4;display:flex;gap:4px;padding:4px;border:1px solid ${BORDER};border-radius:14px;background:${SURFACE};box-sizing:border-box;height:44px">` +
  '<sc-for list="{{ evKinds }}" as="k" hint-placeholder-count="3">' +
  '<button type="button" sc-camel-on-click="{{ k.pick }}" aria-pressed="{{ k.on }}" style="flex:1;border:0;border-radius:10px;background:{{ k.bg }};color:{{ k.color }};font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;padding:0">{{ k.label }}</button>' +
  "</sc-for></div>" +
  pillShell(
    `<span style="font-size:12px;color:${LABEL}">Fee</span>` +
      `<span style="display:flex;align-items:baseline;gap:2px"><span style="font-size:13px;color:${MUTED}">{{ currencySymbol }}</span>` +
      `<input type="text" inputmode="decimal" value="{{ eventBoothFee }}" sc-camel-on-change="{{ setEventBoothFee }}" placeholder="0" aria-label="Fee" style="width:44px;height:36px;border:0;background:none;padding:0;color:${INK};font-family:inherit;font-weight:600;font-size:15px;text-align:right;${TNUM}"></span>`,
    "flex:1;cursor:text",
  ) +
  "</div></div>";

const heading = (title: string, right: string) =>
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 2px;min-height:24px">' +
  `<h6 style="margin:0;font-size:15px;font-weight:700;line-height:1.3">${title}</h6>${right}</div>`;

const addRow = (handler: string, label: string) =>
  `<button type="button" sc-camel-on-click="{{ ${handler} }}" style="display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border:0;border-top:1px solid ${HAIRLINE};background:none;padding:0;cursor:pointer;font-family:inherit;color:${OLIVE_700};font-size:13px;font-weight:600">${PLUS_16}${label}</button>`;

const lineupSection =
  '<div style="display:flex;flex-direction:column;gap:10px">' +
  heading(
    "Lineup",
    '<sc-if value="{{ evFormHasLineup }}" hint-placeholder-val="{{ true }}">' +
      `<button type="button" sc-camel-on-click="{{ goShopping }}" style="display:flex;align-items:center;gap:4px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:${OLIVE_700};${TNUM}">{{ evShopLink }}${CHEVRON}</button></sc-if>`,
  ) +
  '<sc-if value="{{ evFormHasLineup }}" hint-placeholder-val="{{ true }}">' +
  `<div style="background:${SURFACE};border-radius:${R_CARD};padding:0 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column;overflow:hidden">` +
  // pulled up a pixel, so the first row's hairline sits under the card's edge
  '<div style="display:flex;flex-direction:column;margin-top:-1px">' +
  '<sc-for list="{{ evLineup }}" as="p" hint-placeholder-count="3">' +
  swipeRow({
    item: "p",
    sep: `1px solid ${HAIRLINE}`,
    rowStyle: "display:flex;align-items:center;gap:10px;padding:4px 0;min-height:46px;box-sizing:border-box",
    inner:
      '<div style="flex:1;min-width:0;display:flex;flex-direction:column">' +
      '<span style="font-size:14px;font-weight:500;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ p.name }}</span>' +
      `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ p.subLine }}</span></div>` +
      `<input type="text" inputmode="numeric" value="{{ p.qty }}" sc-camel-on-change="{{ p.setQty }}" aria-label="{{ p.qtyAria }}" style="flex:none;width:52px;height:36px;box-sizing:border-box;padding:0 8px;border:1px solid ${BORDER};border-radius:10px;background:${SURFACE};color:${INK};font-family:inherit;font-weight:600;font-size:13px;text-align:right;${TNUM}">` +
      `<span style="flex:none;min-width:50px;text-align:right;font-size:13px;font-weight:600;${TNUM}">{{ p.revStr }}</span>`,
  }) +
  "</sc-for></div>" +
  addRow("openEvPicker", "Add more") +
  "</div></sc-if>" +
  '<sc-if value="{{ evFormNoLineup }}" hint-placeholder-val="{{ false }}">' +
  `<button type="button" sc-camel-on-click="{{ openEvPicker }}" style="display:flex;align-items:center;justify-content:center;gap:8px;min-height:64px;border:1.5px dashed ${OLIVE_DIM};border-radius:${R_CARD};background:${SURFACE};color:${OLIVE_700};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">${PLUS_18}Add products</button></sc-if>` +
  "</div>";

const othersSection =
  '<div style="display:flex;flex-direction:column;gap:10px">' +
  heading("Other costs", `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ evFormOtherMeta }}</span>`) +
  '<sc-if value="{{ evFormHasOthers }}" hint-placeholder-val="{{ false }}">' +
  `<div style="background:${SURFACE};border-radius:${R_FIELD};padding:0 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column;overflow:hidden">` +
  '<div style="display:flex;flex-direction:column;margin-top:-1px">' +
  '<sc-for list="{{ eventOtherCosts }}" as="oc" hint-placeholder-count="2">' +
  `<div style="display:flex;align-items:center;gap:10px;min-height:42px;border-top:1px solid ${HAIRLINE}">` +
  `<input type="text" value="{{ oc.label }}" sc-camel-on-change="{{ oc.setLabel }}" placeholder="What for" aria-label="Cost label" style="flex:1;min-width:0;height:32px;border:0;background:none;padding:0;color:${INK};font-family:inherit;font-size:13px;font-weight:500">` +
  `<span style="display:flex;align-items:baseline;gap:2px"><span style="font-size:12px;color:${MUTED}">{{ currencySymbol }}</span>` +
  `<input type="text" inputmode="decimal" value="{{ oc.amount }}" sc-camel-on-change="{{ oc.setAmount }}" placeholder="0" aria-label="Cost amount" style="width:52px;height:32px;box-sizing:border-box;padding:0 6px;border:1px solid ${BORDER};border-radius:10px;background:${SURFACE};color:${INK};font-family:inherit;font-weight:600;font-size:13px;text-align:right;${TNUM}"></span>` +
  `<button type="button" sc-camel-on-click="{{ oc.remove }}" aria-label="Remove this cost" style="width:28px;height:28px;border-radius:50%;border:0;background:none;color:${HANDLE};font-family:inherit;font-size:18px;line-height:1;cursor:pointer;padding:0;margin-right:-8px">×</button>` +
  "</div></sc-for></div>" +
  addRow("openCostSheet", "Add a cost") +
  "</div></sc-if>" +
  '<sc-if value="{{ evFormNoOthers }}" hint-placeholder-val="{{ true }}">' +
  `<button type="button" sc-camel-on-click="{{ openCostSheet }}" style="display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border:1.5px dashed ${BORDER};border-radius:${R_FIELD};background:${SURFACE};color:${LABEL};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">${PLUS_16}Add a cost</button></sc-if>` +
  "</div>";

const small = (text: string) => `<span style="font-size:11px;color:${MUTED};${TNUM}">${text}</span>`;

const formDock =
  '<div style="position:sticky;bottom:0;z-index:5;margin:22px -20px -28px">' +
  `<div style="background:${SURFACE};border-radius:${R_CARD} ${R_CARD} 0 0;box-shadow:0 -8px 30px rgba(60,55,30,.10);padding:16px 20px 26px;display:flex;flex-direction:column;gap:12px">` +
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:16px">' +
  '<div style="display:flex;flex-direction:column;gap:2px;min-width:0">' +
  small("Projected takings") +
  `<sc-if value="{{ evDockFull }}" hint-placeholder-val="{{ true }}"><span style="font-size:22px;font-weight:600;line-height:1.2;${TNUM}">{{ evDockProjected }}</span>` +
  `<span style="font-size:11px;color:${MUTED};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px;${TNUM}">{{ evDockCover }}</span></sc-if>` +
  `<sc-if value="{{ evDockEmpty }}" hint-placeholder-val="{{ false }}"><span style="font-size:22px;font-weight:600;color:#b9b4a8;line-height:1.2">—</span></sc-if>` +
  "</div>" +
  '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;text-align:right;min-width:0">' +
  small("You'd earn") +
  `<sc-if value="{{ evDockFull }}" hint-placeholder-val="{{ true }}"><span style="font-size:22px;font-weight:600;color:{{ evDockEarnColor }};line-height:1.2;${TNUM}">{{ evDockEarn }}</span>` +
  small("{{ evDockAfter }}") + "</sc-if>" +
  `<sc-if value="{{ evDockEmpty }}" hint-placeholder-val="{{ false }}"><span style="font-size:22px;font-weight:600;color:#b9b4a8;line-height:1.2">—</span>` +
  small("add products to see it") + "</sc-if>" +
  "</div></div>" +
  `<button type="button" sc-camel-on-click="{{ saveEventNow }}" style="display:flex;align-items:center;justify-content:center;height:48px;border:0;border-radius:${R_BUTTON};background:{{ evSaveBg }};color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">{{ evSaveLabel }}</button>` +
  "</div></div>";

const form =
  `<div style="flex:1;display:flex;flex-direction:column;gap:18px;margin-top:14px">${formTop}${lineupSection}${othersSection}</div>` +
  formDock;

/* ----------------------------------------------------------------- sheets */

const behind = (onTap: string, inner: string) =>
  `<div sc-camel-on-click="{{ ${onTap} }}" style="position:fixed;inset:0;z-index:40;background:rgba(250,246,240,.45)">${inner}</div>`;

const productSheet =
  '<sc-if value="{{ evPickerOpen }}" hint-placeholder-val="{{ false }}">' +
  behind(
    "dismissEvPicker",
    sheet({
      title: "Add products",
      sub: "From your recipes · prices copied in",
      height: "min(640px, calc(100% - 48px))",
      onClose: "{{ closeEvPicker }}",
      body:
        `<label style="flex:none;display:flex;align-items:center;gap:10px;height:48px;padding:0 16px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};cursor:text">` +
        svg(18, '<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path>').replace('stroke="currentColor"', `stroke="${MUTED}"`) +
        `<input type="search" value="{{ evPickerSearch }}" sc-camel-on-change="{{ setEvPickerSearch }}" placeholder="Search your recipes" aria-label="Search your recipes" style="flex:1;min-width:0;border:0;outline:none;background:none;font-family:inherit;font-size:14px;color:${INK}"></label>` +
        '<div style="flex:none;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -20px;padding:0 20px">' +
        '<sc-for list="{{ evPickerCats }}" as="cf" hint-placeholder-count="4">' +
        '<button type="button" sc-camel-on-click="{{ cf.set }}" style="height:30px;padding:0 11px;flex:none;border:1px solid {{ cf.border }};border-radius:999px;background:{{ cf.bg }};color:{{ cf.color }};font-family:inherit;font-size:11px;font-weight:600;cursor:pointer">{{ cf.label }}</button>' +
        "</sc-for></div>" +
        `<div style="flex:1;min-height:0;overflow:auto;background:${SURFACE};border-radius:${R_CARD};padding:4px 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column">` +
        `<sc-if value="{{ evPickerEmpty }}" hint-placeholder-val="{{ false }}"><div style="padding:16px 0;font-size:13px;color:${MUTED};text-align:center">{{ evPickerEmptyText }}</div></sc-if>` +
        '<sc-for list="{{ evPickerItems }}" as="ip" hint-placeholder-count="5">' +
        '<div role="checkbox" aria-checked="{{ ip.ariaChecked }}" tabindex="0" sc-camel-on-click="{{ ip.toggle }}" style="flex:none;display:flex;align-items:center;gap:12px;padding:12px 0;min-height:52px;box-sizing:border-box;border-top:{{ ip.sep }};cursor:pointer">' +
        `<span style="flex:none;width:22px;height:22px;box-sizing:border-box;border-radius:6px;border:1.5px solid {{ ip.boxBorder }};background:{{ ip.boxBg }};color:${SURFACE};display:grid;place-items:center"><span style="display:grid;opacity:{{ ip.tickOpacity }}">${TICK}</span></span>` +
        '<span style="flex:1;min-width:0;display:flex;flex-direction:column">' +
        '<span style="font-size:14px;font-weight:500;line-height:1.3">{{ ip.name }}</span>' +
        `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ ip.sub }}</span></span>` +
        "</div></sc-for></div>" +
        '<div style="flex:none;padding:0 0 max(30px, env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px">' +
        `<button type="button" sc-camel-on-click="{{ addPickedRecipes }}" style="display:flex;align-items:center;justify-content:center;height:48px;border:0;border-radius:${R_BUTTON};background:{{ evPickerAddBg }};color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">{{ evPickerAddLabel }}</button>` +
        `<button type="button" sc-camel-on-click="{{ goNewRecipe }}" style="display:flex;align-items:center;justify-content:center;min-height:36px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:${OLIVE_700}">Something new? Create a recipe</button>` +
        "</div>",
    }),
  ) +
  "</sc-if>";

const costSheet =
  '<sc-if value="{{ evCostSheetOpen }}" hint-placeholder-val="{{ false }}">' +
  behind(
    "closeCostSheet",
    sheet({
      title: "Add a cost",
      sub: "Besides the booth fee and ingredients",
      height: "auto",
      onClose: "{{ dismissCostSheet }}",
      body:
        `<div style="flex:none;background:${SURFACE};border-radius:${R_CARD};padding:18px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column;gap:16px">` +
        '<div style="display:flex;flex-direction:column;gap:6px">' +
        '<span style="font-size:11px;font-weight:600">What for</span>' +
        `<input type="text" value="{{ costDraftLabel }}" sc-camel-on-change="{{ setCostDraftLabel }}" placeholder="Name the cost" aria-label="What the cost is for" style="width:100%;box-sizing:border-box;height:48px;padding:0 16px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};color:${INK};font-family:inherit;font-weight:600;font-size:15px"></div>` +
        '<div style="display:flex;flex-direction:column;gap:6px">' +
        '<span style="font-size:11px;font-weight:600">Amount</span>' +
        `<div style="display:flex;align-items:center;gap:4px;height:48px;padding:0 16px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};box-sizing:border-box">` +
        `<span style="font-size:16px;font-weight:600;color:${MUTED}">{{ currencySymbol }}</span>` +
        `<input type="text" inputmode="decimal" value="{{ costDraftAmount }}" sc-camel-on-change="{{ setCostDraftAmount }}" placeholder="0.00" aria-label="Cost amount" style="flex:1;min-width:0;border:0;outline:none;background:none;padding:0;font-family:inherit;font-weight:600;font-size:16px;color:${INK};${TNUM}"></div></div>` +
        "</div>" +
        '<div style="flex:none;padding:0 0 max(30px, env(safe-area-inset-bottom))">' +
        `<button type="button" sc-camel-on-click="{{ addCostFromSheet }}" style="width:100%;display:flex;align-items:center;justify-content:center;height:48px;border:0;border-radius:${R_BUTTON};background:{{ costAddBg }};color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">Add cost</button></div>`,
    }),
  ) +
  "</sc-if>";

/* ------------------------------------------------------------------- list */

const nextCard =
  '<sc-for list="{{ evListNext }}" as="n" hint-placeholder-count="1">' +
  `<button type="button" sc-camel-on-click="{{ n.open }}" style="display:flex;flex-direction:column;gap:12px;padding:16px;border:0;background:${SURFACE};border-radius:${R_CARD};box-shadow:${CARD_SHADOW};color:${INK};cursor:pointer;font-family:inherit;text-align:left">` +
  '<div style="width:100%;display:flex;align-items:center;gap:12px">' +
  `<div style="flex:none;width:50px;height:50px;border-radius:14px;background:${OLIVE};color:${SURFACE};display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1">` +
  '<span style="font-size:9px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85">{{ n.weekday }}</span>' +
  `<span style="font-size:20px;font-weight:600;${TNUM}">{{ n.dayNum }}</span></div>` +
  '<div style="flex:1;min-width:0;display:flex;flex-direction:column">' +
  '<span style="font-size:15px;font-weight:600;line-height:1.3">{{ n.name }}</span>' +
  `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ n.sub }}</span></div>` +
  `<span style="color:${HANDLE};display:grid">${svg(16, '<path d="M9 6l6 6-6 6"></path>')}</span></div>` +
  `<div style="width:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid ${HAIRLINE};padding-top:10px">` +
  `<div style="display:flex;flex-direction:column;gap:1px"><span style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${LABEL}">Projected</span><span style="font-size:14px;font-weight:600;${TNUM}">{{ n.projected }}</span></div>` +
  `<div style="display:flex;flex-direction:column;gap:1px;border-left:1px solid ${HAIRLINE};padding-left:12px"><span style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${LABEL}">You'd earn</span><span style="font-size:14px;font-weight:600;color:{{ n.earnColor }};${TNUM}">{{ n.earn }}</span></div>` +
  `<div style="display:flex;flex-direction:column;gap:1px;border-left:1px solid ${HAIRLINE};padding-left:12px"><span style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${LABEL}">Ready</span><span style="font-size:14px;font-weight:600;color:{{ n.readyColor }};${TNUM}">{{ n.ready }}</span></div>` +
  "</div></button></sc-for>";

const laterCards =
  '<sc-for list="{{ evListLater }}" as="l" hint-placeholder-count="1">' +
  `<button type="button" sc-camel-on-click="{{ l.open }}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:0;background:${SURFACE};border-radius:${R_CARD};box-shadow:${CARD_SHADOW};color:${INK};cursor:pointer;font-family:inherit;text-align:left">` +
  `<div style="flex:none;width:50px;height:50px;border-radius:14px;background:${OLIVE_SOFT};color:${OLIVE_700};display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1">` +
  '<span style="font-size:9px;letter-spacing:0.08em;text-transform:uppercase">{{ l.weekday }}</span>' +
  `<span style="font-size:20px;font-weight:600;${TNUM}">{{ l.dayNum }}</span></div>` +
  '<div style="flex:1;min-width:0;display:flex;flex-direction:column">' +
  '<span style="font-size:15px;font-weight:600;line-height:1.3">{{ l.name }}</span>' +
  `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ l.sub }}</span></div>` +
  `<span style="font-size:12px;font-weight:600;color:{{ l.rightColor }};${TNUM}">{{ l.right }}</span>` +
  "</button></sc-for>";

const pastCard =
  '<sc-if value="{{ evPastHas }}" hint-placeholder-val="{{ true }}">' +
  `<div style="background:${SURFACE};border-radius:${R_CARD};padding:0 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column">` +
  '<sc-for list="{{ evPastRecent }}" as="pe" hint-placeholder-count="3">' +
  `<button type="button" sc-camel-on-click="{{ pe.open }}" style="display:flex;align-items:center;gap:12px;min-height:60px;border:0;border-top:{{ pe.sep }};background:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;color:${INK}">` +
  '<div style="flex:none;width:40px;display:flex;flex-direction:column;align-items:center;line-height:1.1">' +
  `<span style="font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED}">{{ pe.monthStr }}</span>` +
  `<span style="font-size:16px;font-weight:600;${TNUM}">{{ pe.dayStr }}</span></div>` +
  '<div style="flex:1;min-width:0;display:flex;flex-direction:column">' +
  '<span style="font-size:14px;font-weight:500;line-height:1.3">{{ pe.name }}</span>' +
  `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ pe.subStr }}</span></div>` +
  `<span style="font-size:14px;font-weight:600;${TNUM}">{{ pe.revStr }}</span></button>` +
  "</sc-for>" +
  `<button type="button" sc-camel-on-click="{{ openPastEvents }}" style="display:flex;align-items:center;justify-content:center;min-height:44px;border:0;border-top:1px solid ${HAIRLINE};background:none;padding:0;cursor:pointer;font-family:inherit;color:${OLIVE_700};font-size:13px;font-weight:600">All past events</button>` +
  "</div></sc-if>" +
  '<sc-if value="{{ evPastNone }}" hint-placeholder-val="{{ false }}">' +
  card({ rows: [`<div style="min-height:44px;display:flex;align-items:center;font-size:13px;color:${LABEL}">Nothing finished yet. Completed events show here.</div>`] }) +
  "</sc-if>";

const eventsList =
  '<div style="padding:18px 20px 28px;display:flex;flex-direction:column;gap:20px">' +
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
  '<div style="display:flex;flex-direction:column;min-width:0">' +
  '<h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25">Events</h1>' +
  `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ eventsHeaderSub }}</span></div>` +
  `<button type="button" sc-camel-on-click="{{ startNewEvent }}" aria-label="New event" style="flex:none;width:40px;height:40px;border-radius:50%;border:0;padding:0;cursor:pointer;background:${OLIVE};color:${SURFACE};display:grid;place-items:center;box-shadow:0 6px 18px rgba(60,55,30,.10)">${svg(18, '<path d="M12 5v14M5 12h14"></path>', "2")}</button>` +
  "</div>" +
  '<div style="display:flex;flex-direction:column;gap:10px">' +
  heading("Upcoming", `<span style="font-size:12px;color:${MUTED}">{{ evListMeta }}</span>`) +
  '<sc-if value="{{ evListHas }}" hint-placeholder-val="{{ true }}">' + nextCard + laterCards + "</sc-if>" +
  '<sc-if value="{{ evListNone }}" hint-placeholder-val="{{ false }}">' +
  `<button type="button" sc-camel-on-click="{{ startNewEvent }}" style="display:flex;align-items:center;justify-content:center;gap:8px;min-height:64px;border:1.5px dashed ${OLIVE_DIM};border-radius:${R_CARD};background:${SURFACE};color:${OLIVE_700};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">${PLUS_18}Plan an event</button></sc-if>` +
  "</div>" +
  '<div style="display:flex;flex-direction:column;gap:10px">' +
  heading("Past events", `<button type="button" sc-camel-on-click="{{ openPastEvents }}" style="border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:${OLIVE_700}">Compare ›</button>`) +
  pastCard +
  "</div></div>";

/* ------------------------------------------------------------------ apply */

function restyleForm(template: string): string {
  let out = swapOnce(
    template,
    '<!-- ══ EVENT DETAIL ══ -->\n<sc-if value="{{ onEvent }}" hint-placeholder-val="{{ false }}">\n<div style="padding:14px 20px 28px">',
    '<!-- ══ EVENT DETAIL ══ -->\n<sc-if value="{{ onEvent }}" hint-placeholder-val="{{ false }}">\n' +
      '<div style="padding:14px 20px 28px;box-sizing:border-box;min-height:100%;display:{{ evScreenDisplay }};flex-direction:column">',
    `${LABEL_} screen`,
  );
  const editing = scBlock(out, '<sc-if value="{{ evEditing }}" hint-placeholder-val="{{ true }}">', `${LABEL_} form`);
  out = out.slice(0, editing.innerStart) + form + out.slice(editing.innerEnd);
  const picker = scBlock(out, '<sc-if value="{{ evPickerOpen }}" hint-placeholder-val="{{ false }}">', `${LABEL_} picker`);
  return out.slice(0, picker.start) + productSheet + costSheet + out.slice(picker.end);
}

function restyleList(template: string): string {
  const list = scBlock(template, '<sc-if value="{{ onMarkets }}" hint-placeholder-val="{{ false }}">', `${LABEL_} list`);
  return template.slice(0, list.innerStart) + eventsList + template.slice(list.innerEnd);
}

export function applyEventEditorBehavior(template: string): string {
  return restyleList(restyleForm(addBindings(template)));
}

// A saved event, read before it is edited.
//
// design/mobile-redesign/screens/EventOverview.dc.html: the day and the
// name, the fact strip -- projected, costs, what you'd earn -- with
// "Overview of costs" opening the list in place (EventCostsOpen.dc.html),
// then the lineup, each row with its calculator button, then Getting ready,
// then "Enter what actually sold", which opens SoldSheet.dc.html. No
// paragraph, no button bar; Edit and Delete are the round buttons in the
// header. The form behind the pencil is unchanged for now.
//
// Costs here are everything the event costs: what the lineup costs to make,
// the booth fee, and the other costs. The old screen left the booth fee out
// of its profit; the design's "You'd earn" is after all of it.
//
// Getting ready is three steps. The shopping list is ticked when every row
// on it is; baking and packing have no tick of their own yet -- that would
// be something new to save on each event -- so they say what there is to do,
// and the count reads 1 of 3 at most, as Home's does.
//
// The sold sheet starts from what the till already recorded at this event
// when there is anything, otherwise from what was planned, and completes the
// event the way the old "Mark completed" did.
//
// Delete says what deleting an event does: its plan and costs go, and so do
// the sales recorded at it -- they are deleted with it and leave Analytics.

import { card, deleteDialog, factStrip, sheet } from "./design/pieces";
import { BORDER, HANDLE, HAIRLINE, INK, LABEL, MUTED, OLIVE, OLIVE_700, OLIVE_SOFT, R_BUTTON, R_CARD, R_FIELD, SURFACE, GOLD, TNUM, CARD_SHADOW } from "./design/tokens";
import { itemActions } from "./item-mode-template";
import { scBlock, swapOnce } from "./template-blocks";

const LABEL_ = "Event overview";

const svg = (size: number, paths: string, width = "1.75") =>
  `<svg width="${size}" height="${size}" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const CHEVRON_RIGHT = svg(16, '<path d="M9 6l6 6-6 6"></path>').replace('stroke="currentColor"', `stroke="${HANDLE}"`);

/** Views over the event controller's own values: picked, recipes, sales, saved, eventId, unitCost, soldEntered, CUR. */
const overviewBindings = `          ...(() => {
            const border = '1px solid ${HAIRLINE}';
            const sep = i => i ? border : '0';
            const qtyOf = id => Math.max(0, Number((this.state.evQty || {})[id]) || 0);
            const lineup = picked.map(id => recipes.find(r => r.id === id)).filter(Boolean);
            // whole amounts as whole amounts, the rest to the cent
            const money = v => CUR + (Math.abs(v - Math.round(v)) < 0.005 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2));
            const signed = v => (v < 0 ? '\\u2212' : '') + money(Math.abs(v));
            const projected = lineup.reduce((s, r) => s + qtyOf(r.id) * (Number(r.price) || 0), 0);
            const baking = lineup.reduce((s, r) => s + qtyOf(r.id) * unitCost(r), 0);
            const booth = Math.max(0, Number(this.state.eventBoothFee) || 0);
            const others = (Array.isArray(this.state.eventOtherCosts) ? this.state.eventOtherCosts : [])
              .filter(c => c && (Number(c.amount) || 0) > 0);
            const allCosts = baking + booth + others.reduce((s, c) => s + (Number(c.amount) || 0), 0);
            const earn = projected - allCosts;

            // the day, read as a local date (see evWhen)
            const parts = String(this.state.eventDate || '').match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
            const day = parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const diff = day ? Math.round((day.getTime() - today.getTime()) / 86400000) : null;
            const when = diff === null ? '' : diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : diff === -1 ? 'yesterday'
              : diff > 1 ? 'in ' + diff + ' days' : (-diff) + ' days ago';

            // ---- getting ready ----------------------------------------
            // the shopping list's rows, counted the way the list draws them
            const ing = {}; const pack = {};
            lineup.forEach(r => {
              if (!(qtyOf(r.id) > 0)) return;
              (r.ingredientKeys || []).forEach(k => { ing[k] = true; });
              (r.packagingKeys || []).forEach(k => { pack[k] = (pack[k] || 0) + qtyOf(r.id); });
            });
            const shopRows = Object.keys(ing).length + Object.keys(pack).length;
            const checked = this.state.shopChecked || {};
            let shopTicked = 0;
            for (let i = 0; i < shopRows; i++) if (checked[i]) shopTicked++;
            const shopDone = shopRows > 0 && shopTicked === shopRows;
            const batches = lineup.filter(r => qtyOf(r.id) > 0).map(r => {
              const n = Math.ceil(qtyOf(r.id) / Math.max(1, Number(r.yield) || 1));
              return n + (n === 1 ? ' batch ' : ' batches ') + (String(r.name || '').trim() || 'Untitled recipe');
            });
            const packing = Object.keys(pack).map(k => ((this.PACK_META[k] && this.PACK_META[k].name) || 'Packaging') + ' \\u00d7 ' + pack[k]);

            // ---- the sold sheet ----------------------------------------
            const soldOf = id => Math.max(0, Math.round(Number((this.state.evSold || {})[id]) || 0));
            const setSold = (id, n) => this.setState(st => ({ evSold: { ...(st.evSold || {}), [id]: Math.max(0, n) } }));
            const soldRevenue = lineup.reduce((s, r) => s + soldOf(r.id) * (Number(r.price) || 0), 0);
            const soldTotal = lineup.reduce((s, r) => s + soldOf(r.id), 0);
            const tookTotal = lineup.reduce((s, r) => s + qtyOf(r.id), 0);
            const earned = soldRevenue - allCosts;

            // ---- delete ------------------------------------------------
            const eventSales = sales.filter(sale => sale && sale.eventId === eventId);
            const takenAt = eventSales.reduce((s, sale) => s + (Number(sale.total) || 0), 0);

            const open = this.state.evCostsOpen === true;
            const stack = Array.isArray(this.state.stack) ? this.state.stack : [];
            return {
              evOvBack: stack[stack.length - 1] === 'chat' ? 'Ask Baketly' : 'Events',
              evOvKicker: ({ popup: 'Pop-up', order: 'Order' }[saved && saved.kind] || 'Market') + (when ? ' \\u00b7 ' + when : ''),
              evOvWeekday: day ? day.toLocaleString('en-US', { weekday: 'short' }) : '',
              evOvDayNum: day ? String(day.getDate()) : '\\u2014',
              // its hours when it has them, as the design shows; the full date otherwise
              evOvSub: saved && (saved.startTime || saved.endTime)
                ? [saved.startTime, saved.endTime].map(t => t ? String(Number(t.slice(0, 2))) + ':' + t.slice(3, 5) : '?').join('\\u2013')
                : day ? day.toLocaleString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }) : 'No date yet',
              evOvProjected: money(projected),
              evOvCosts: money(allCosts),
              evOvEarn: signed(earn),
              evOvEarnColor: earn < 0 ? '#b07a1f' : '${OLIVE_700}',
              evCostsOpen: open,
              evCostsLabel: open ? 'Hide costs' : 'Overview of costs',
              evCostsChevron: open ? 'rotate(180deg)' : 'none',
              toggleEvCosts: () => this.setState(st => ({ evCostsOpen: !(st.evCostsOpen === true) })),
              evCostRows: [
                { label: 'Booth fee', note: '', amount: money(booth) },
                { label: 'Baking', note: ' \\u00b7 from the lineup', amount: money(baking) },
                ...others.map(c => ({ label: String(c.label || '').trim() || 'Other cost', note: '', amount: money(Number(c.amount) || 0) }))
              ].map((r, i) => ({ ...r, sep: sep(i) })),
              evOvHasLineup: lineup.length > 0,
              evOvNoLineup: lineup.length === 0,
              evOvLineupMeta: lineup.length + (lineup.length === 1 ? ' product' : ' products'),
              evOvLineup: lineup.map((r, i) => ({
                name: String(r.name || '').trim() || 'Untitled recipe',
                qtyLine: qtyOf(r.id) + ' \\u00d7 ' + CUR + (Number(r.price) || 0).toFixed(2),
                rev: money(qtyOf(r.id) * (Number(r.price) || 0)),
                sep: sep(i),
                // the calculator with the number already decided
                toCalculator: () => this.setState(st => ({ calcRecipeId: r.id, calcUnits: qtyOf(r.id), calcUnitsText: null, screen: 'calculator', stack: [...st.stack, st.screen] }))
              })),
              evReadyMeta: (shopDone ? 1 : 0) + ' of 3 done',
              evShopSub: !shopRows ? 'Nothing to buy yet' : shopDone ? shopRows + ' items \\u00b7 all bought' : shopTicked + ' of ' + shopRows + ' bought',
              evShopBox: shopDone ? '${OLIVE}' : '${SURFACE}',
              evShopBoxBorder: shopDone ? '${OLIVE}' : '${BORDER}',
              evShopTick: shopDone ? '1' : '0',
              evShopTitleColor: shopDone ? '${MUTED}' : '${INK}',
              evShopTitleLine: shopDone ? 'line-through' : 'none',
              evBakeSub: batches.join(' \\u00b7 ') || 'Nothing to bake yet',
              evPackSub: packing.join(' \\u00b7 ') || 'No packaging on these recipes',
              evCanEnterSold: !!saved && saved.status === 'planned' && !entering,
              // what the till recorded here if anything, otherwise the plan
              openSoldSheet: () => this.setState(st => {
                const list = Array.isArray(st.evPicked) ? [...st.evPicked] : [];
                Object.keys(soldEntered).forEach(id => { if (list.indexOf(id) === -1) list.push(id); });
                const start = Object.keys(soldEntered).length ? { ...soldEntered } : { ...(st.evQty || {}) };
                return { evEnteringResults: true, evSold: start, evPicked: list };
              }),
              soldRows: lineup.map((r, i) => {
                const took = qtyOf(r.id);
                const sold = soldOf(r.id);
                const name = String(r.name || '').trim() || 'Untitled recipe';
                return {
                  name,
                  aria: name + ' sold',
                  tookLine: (took > 0 ? 'took ' + took + ' \\u00b7 ' : '') + CUR + (Number(r.price) || 0).toFixed(2),
                  hasNote: took > 0,
                  note: sold >= took ? 'sold out' : (took - sold) + ' left',
                  noteColor: sold >= took ? '${OLIVE_700}' : '#b07a1f',
                  sold: String(sold),
                  sep: sep(i),
                  dec: () => setSold(r.id, sold - 1),
                  inc: () => setSold(r.id, sold + 1),
                  set: e => { const v = parseInt(e && e.target ? e.target.value : '', 10); setSold(r.id, isNaN(v) ? 0 : v); }
                };
              }),
              // where the numbers came from, as they are whichever came first
              soldSheetSub: Object.keys(soldEntered).length
                ? 'Starts at what the till rang up. Adjust and complete.'
                : 'Starts at what you planned. Adjust and complete.',
              soldTook: money(soldRevenue),
              soldCount: soldTotal + ' of ' + tookTotal + ' sold',
              soldEarned: signed(earned),
              soldEarnedColor: earned < 0 ? '#b07a1f' : '${OLIVE_700}',
              soldAfter: 'after ' + money(allCosts) + ' costs',
              closeSoldSheet: e => { if (!e || e.target === e.currentTarget) this.setState({ evEnteringResults: false }); },
              eventDeleteBody: (eventSales.length
                ? 'Its lineup and costs go with it, and so ' + (eventSales.length === 1 ? 'does the sale' : 'do the ' + eventSales.length + ' sales') + ' recorded at it (' + money(takenAt) + '), which come out of Analytics. '
                : 'Its lineup, costs and shopping list go with it. Nothing was recorded as sold there, so your figures stay as they are. ')
                + 'This cannot be undone.'
            };
          })(),
          evCanComplete: !!saved && saved.status === 'planned' && !entering,
`;

const round = (handler: string, label: string, color: string, paths: string) =>
  `<button type="button" sc-camel-on-click="{{ ${handler} }}" aria-label="${label}" style="width:40px;height:40px;border-radius:50%;border:0;padding:0;cursor:pointer;background:${SURFACE};color:${color};display:grid;place-items:center">${svg(16, paths)}</button>`;

const kicker = (text: string) =>
  `<span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${GOLD}">${text}</span>`;

const header =
  `<button type="button" sc-camel-on-click="{{ evBack }}" style="display:flex;align-items:center;gap:4px;min-height:44px;margin-left:-4px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:${OLIVE_700}">${svg(16, '<path d="M15 6l-6 6 6 6"></path>')}{{ evOvBack }}</button>` +
  '<sc-if value="{{ evShowMarketBody }}" hint-placeholder-val="{{ true }}">' +
  `<sc-if value="{{ evPreviewing }}" hint-placeholder-val="{{ true }}">${kicker("{{ evOvKicker }}")}</sc-if>` +
  // the form says what it is: a new event, or one being changed
  `<sc-if value="{{ evEditing }}" hint-placeholder-val="{{ false }}">${kicker("{{ evFormKicker }}")}</sc-if>` +
  // keeps its width when empty, so the kicker stays centred
  '<div style="display:flex;gap:6px;flex:none;min-width:64px;justify-content:flex-end">' +
  // the form has no delete: delete belongs to the saved event, here
  '<sc-if value="{{ evPreviewing }}" hint-placeholder-val="{{ true }}">' +
  round("editEvent", "Edit event", INK, '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path>') +
  round("askDeleteEvent", "Delete this event", "#b0563e", '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"></path>') +
  "</sc-if></div></sc-if>";

/** The fact strip with its costs row beneath, which opens in place. */
const strip =
  `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid ${HAIRLINE};border-radius:18px;background:${SURFACE};overflow:hidden">` +
  factStrip([
    { label: "Projected", value: "{{ evOvProjected }}" },
    { label: "Costs", value: "{{ evOvCosts }}" },
    { label: "You'd earn", value: '<span style="color:{{ evOvEarnColor }}">{{ evOvEarn }}</span>' },
  ])
    // the strip's own box is this grid's first row: its border and radius go
    .replace(/^<div style="display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);[^"]*">/, '<div style="grid-column:1 / -1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr))">') +
  `<button type="button" sc-camel-on-click="{{ toggleEvCosts }}" aria-expanded="{{ evCostsOpen }}" style="grid-column:1 / -1;display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:40px;padding:0 12px;border:0;border-top:1px solid ${HAIRLINE};background:none;color:${OLIVE_700};font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;text-align:left">` +
  "<span>{{ evCostsLabel }}</span>" +
  `<span style="display:grid;transform:{{ evCostsChevron }}">${svg(16, '<path d="M6 9l6 6 6-6"></path>')}</span></button>` +
  '<sc-if value="{{ evCostsOpen }}" hint-placeholder-val="{{ false }}">' +
  `<div style="grid-column:1 / -1;border-top:1px solid ${HAIRLINE};padding:4px 12px 8px;display:flex;flex-direction:column">` +
  '<sc-for list="{{ evCostRows }}" as="c" hint-placeholder-count="3">' +
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:34px;font-size:13px;border-top:{{ c.sep }}">' +
  `<span>{{ c.label }}<span style="color:${MUTED}">{{ c.note }}</span></span><span style="font-weight:500;${TNUM}">{{ c.amount }}</span></div>` +
  "</sc-for>" +
  `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:36px;font-size:13px;font-weight:700;border-top:1px solid ${INK}"><span>All costs</span><span style="${TNUM}">{{ evOvCosts }}</span></div>` +
  "</div></sc-if></div>";

const lineupRows =
  '<sc-for list="{{ evOvLineup }}" as="l" hint-placeholder-count="3">' +
  `<div style="display:flex;align-items:center;gap:12px;min-height:50px;border-top:{{ l.sep }};color:${INK}">` +
  '<div style="flex:1;min-width:0;display:flex;flex-direction:column">' +
  '<span style="font-size:14px;font-weight:500;line-height:1.3">{{ l.name }}</span>' +
  `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ l.qtyLine }}</span></div>` +
  `<span style="min-width:40px;text-align:right;font-size:13px;font-weight:600;${TNUM}">{{ l.rev }}</span>` +
  `<button type="button" sc-camel-on-click="{{ l.toCalculator }}" aria-label="Open in recipe calculator" style="flex:none;width:36px;height:36px;border-radius:50%;border:0;padding:0;cursor:pointer;background:${OLIVE_SOFT};color:${OLIVE_700};display:grid;place-items:center;margin-left:2px">` +
  svg(16, '<rect x="5" y="3" width="14" height="18" rx="2"></rect><path d="M8 7h8M8 12h2M12 12h2M16 12h2M8 16h2M12 16h2M16 16h2"></path>') +
  "</button></div></sc-for>";

const box = (bg: string, borderColor: string, tickOpacity: string) =>
  `<span style="width:22px;height:22px;flex:none;box-sizing:border-box;border-radius:7px;border:1.5px solid ${borderColor};background:${bg};color:${SURFACE};display:grid;place-items:center">` +
  `<span style="display:grid;opacity:${tickOpacity}">${svg(14, '<path d="M20 6L9 17l-5-5"></path>', "3")}</span></span>`;

const readyRows =
  `<button type="button" sc-camel-on-click="{{ goShopping }}" style="display:flex;align-items:center;gap:12px;min-height:50px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;color:${INK}">` +
  box("{{ evShopBox }}", "{{ evShopBoxBorder }}", "{{ evShopTick }}") +
  '<span style="flex:1;min-width:0;display:flex;flex-direction:column">' +
  '<span style="font-size:14px;font-weight:500;line-height:1.3;color:{{ evShopTitleColor }};text-decoration:{{ evShopTitleLine }}">Shopping list</span>' +
  `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ evShopSub }}</span></span>` +
  CHEVRON_RIGHT + "</button>" +
  // baking and packing have nothing to open or tick yet; see the head of the file
  `<div style="display:flex;align-items:center;gap:12px;min-height:50px;border-top:1px solid ${HAIRLINE}">` +
  box(SURFACE, BORDER, "0") +
  '<span style="flex:1;min-width:0;display:flex;flex-direction:column">' +
  '<span style="font-size:14px;font-weight:500;line-height:1.3">Bake</span>' +
  `<span style="font-size:12px;color:${MUTED};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ evBakeSub }}</span></span></div>` +
  `<div style="display:flex;align-items:center;gap:12px;min-height:50px;border-top:1px solid ${HAIRLINE}">` +
  box(SURFACE, BORDER, "0") +
  '<span style="flex:1;min-width:0;display:flex;flex-direction:column">' +
  '<span style="font-size:14px;font-weight:500;line-height:1.3">Pack and label</span>' +
  `<span style="font-size:12px;color:${MUTED};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ evPackSub }}</span></span></div>`;

const overview =
  '<div style="display:flex;flex-direction:column;gap:20px;margin-top:14px">' +
  '<div style="display:flex;align-items:center;gap:14px">' +
  `<div style="flex:none;width:56px;height:56px;border-radius:${R_FIELD};background:${OLIVE_SOFT};color:${OLIVE_700};display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1">` +
  '<span style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase">{{ evOvWeekday }}</span>' +
  `<span style="font-size:22px;font-weight:600;${TNUM}">{{ evOvDayNum }}</span></div>` +
  '<div style="min-width:0;display:flex;flex-direction:column">' +
  '<h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25">{{ eventName }}</h1>' +
  `<div style="font-size:12px;color:${MUTED};${TNUM}">{{ evOvSub }}</div></div></div>` +
  strip +
  '<sc-if value="{{ evOvHasLineup }}" hint-placeholder-val="{{ true }}">' +
  card({ title: "Lineup", meta: "{{ evOvLineupMeta }}", loop: lineupRows }) +
  "</sc-if>" +
  '<sc-if value="{{ evOvNoLineup }}" hint-placeholder-val="{{ false }}">' +
  card({ title: "Lineup", rows: [`<div style="min-height:44px;display:flex;align-items:center;font-size:13px;color:${LABEL}">Nothing planned yet. Tap the pencil to add products.</div>`] }) +
  "</sc-if>" +
  card({ title: "Getting ready", meta: "{{ evReadyMeta }}", loop: readyRows }) +
  '<sc-if value="{{ evCanEnterSold }}" hint-placeholder-val="{{ true }}">' +
  '<div style="display:flex;flex-direction:column;gap:10px">' +
  '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:0 2px"><h6 style="margin:0;font-size:15px;font-weight:700;line-height:1.3">After the event</h6></div>' +
  `<button type="button" sc-camel-on-click="{{ openSoldSheet }}" style="display:flex;align-items:center;gap:12px;min-height:52px;padding:0 16px;border:0;background:${SURFACE};border-radius:${R_FIELD};box-shadow:${CARD_SHADOW};cursor:pointer;font-family:inherit;text-align:left;color:${INK}">` +
  '<span style="flex:1;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500;line-height:1.3">Enter what actually sold</span>' +
  `<span style="font-size:12px;color:${MUTED}">Turns the projection into what you earned</span></span>` +
  CHEVRON_RIGHT + "</button></div></sc-if>" +
  "</div>";

const stepper = (handler: string, label: string, glyph: string) =>
  `<button type="button" sc-camel-on-click="{{ ${handler} }}" aria-label="${label}" style="width:40px;height:40px;border-radius:50%;border:1px solid ${BORDER};background:${SURFACE};color:${INK};font-family:inherit;font-size:18px;cursor:pointer;display:grid;place-items:center;padding:0">${glyph}</button>`;

const soldSheet =
  '<sc-if value="{{ evEnteringResults }}" hint-placeholder-val="{{ false }}">' +
  `<div sc-camel-on-click="{{ closeSoldSheet }}" style="position:fixed;inset:0;z-index:40;background:rgba(250,246,240,.45)">` +
  sheet({
    title: "What actually sold?",
    sub: "{{ soldSheetSub }}",
    height: "auto",
    onClose: "{{ cancelEnteringResults }}",
    body:
      `<div style="flex:none;max-height:min(360px, 46vh);overflow:auto;background:${SURFACE};border-radius:${R_CARD};padding:0 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column">` +
      '<sc-for list="{{ soldRows }}" as="s" hint-placeholder-count="3">' +
      '<div style="flex:none;display:flex;align-items:center;gap:8px;padding:6px 0;min-height:60px;box-sizing:border-box;border-top:{{ s.sep }}">' +
      '<div style="flex:1;min-width:0;display:flex;flex-direction:column">' +
      '<span style="font-size:14px;font-weight:500;line-height:1.3">{{ s.name }}</span>' +
      `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ s.tookLine }}<sc-if value="{{ s.hasNote }}" hint-placeholder-val="{{ true }}"> · <span style="color:{{ s.noteColor }}">{{ s.note }}</span></sc-if></span></div>` +
      '<div style="display:flex;align-items:center;gap:2px">' +
      stepper("s.dec", "One fewer", "−") +
      `<input type="text" inputmode="numeric" value="{{ s.sold }}" sc-camel-on-change="{{ s.set }}" aria-label="{{ s.aria }}" style="width:44px;height:40px;border:0;background:none;color:${INK};font-family:inherit;font-weight:600;font-size:18px;text-align:center;${TNUM}">` +
      stepper("s.inc", "One more", "+") +
      "</div></div></sc-for></div>" +
      '<div style="flex:none;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:4px 2px 0">' +
      '<div style="display:flex;flex-direction:column;gap:2px">' +
      `<span style="font-size:11px;color:${MUTED}">Took</span>` +
      `<span style="font-size:22px;font-weight:600;line-height:1.2;${TNUM}">{{ soldTook }}</span>` +
      `<span style="font-size:11px;color:${MUTED};${TNUM}">{{ soldCount }}</span></div>` +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;text-align:right">' +
      `<span style="font-size:11px;color:${MUTED}">You earned</span>` +
      `<span style="font-size:22px;font-weight:600;color:{{ soldEarnedColor }};line-height:1.2;${TNUM}">{{ soldEarned }}</span>` +
      `<span style="font-size:11px;color:${MUTED};${TNUM}">{{ soldAfter }}</span></div></div>` +
      '<div style="flex:none;padding:0 0 max(30px, env(safe-area-inset-bottom))">' +
      `<button type="button" sc-camel-on-click="{{ confirmCompleted }}" style="width:100%;display:flex;align-items:center;justify-content:center;height:48px;border:0;border-radius:${R_BUTTON};background:${OLIVE};color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">Complete event</button></div>`,
  }) +
  "</div></sc-if>";

function addBindings(template: string): string {
  return swapOnce(template, "          evCanComplete: !!saved && saved.status === 'planned' && !entering,\n", overviewBindings, `${LABEL_} bindings`);
}

function restyleHeader(template: string): string {
  return swapOnce(
    template,
    '<button class="btn btn-ghost" sc-camel-on-click="{{ evBack }}" style="margin-left:-6px;min-height:44px">‹ {{ evBackLabel }}</button>' +
      '<sc-if value="{{ evShowMarketBody }}" hint-placeholder-val="{{ true }}">' +
      itemActions("editEvent", "askDeleteEvent", "event", "evPreviewing", "evCanDelete") +
      "</sc-if>",
    header,
    `${LABEL_} header`,
  );
}

/**
 * The preview keeps its first block, the name shown alone when the sheet is
 * opened from the till; the rest -- the old body, the sold list drawn in the
 * page and "Mark completed" -- is the overview and the sheet now.
 */
function replacePreview(template: string): string {
  const preview = scBlock(template, '<sc-if value="{{ evPreviewing }}" hint-placeholder-val="{{ false }}">', `${LABEL_} preview`);
  const inner = template.slice(preview.innerStart, preview.innerEnd);
  const resultsOnly = scBlock(inner, '<sc-if value="{{ evResultsOnly }}" hint-placeholder-val="{{ false }}">', `${LABEL_} till title`);
  const replaced =
    inner.slice(resultsOnly.start, resultsOnly.end) +
    `<sc-if value="{{ evShowMarketBody }}" hint-placeholder-val="{{ true }}">${overview}</sc-if>`;
  // the sheet sits outside the preview, so it also opens over the till's
  // results-only view
  return template.slice(0, preview.innerStart) + replaced + template.slice(preview.innerEnd, preview.end) + soldSheet + template.slice(preview.end);
}

function replaceDeleteDialog(template: string): string {
  const dialog = scBlock(template, '<sc-if value="{{ eventDeleteOpen }}" hint-placeholder-val="{{ false }}">', `${LABEL_} delete dialog`);
  return (
    template.slice(0, dialog.start) +
    deleteDialog({
      open: "{{ eventDeleteOpen }}",
      label: "Delete this event",
      title: "Delete {{ eventDeleteName }}?",
      body: "{{ eventDeleteBody }}",
      onKeep: "{{ cancelDeleteEvent }}",
      onDelete: "{{ confirmDeleteEvent }}",
    }) +
    template.slice(dialog.end)
  );
}

export function applyEventOverviewBehavior(template: string): string {
  return replaceDeleteDialog(replacePreview(restyleHeader(addBindings(template))));
}

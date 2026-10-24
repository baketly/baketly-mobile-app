// The sale, recorded.
//
// design/mobile-redesign/screens/SaleDone.dc.html: the whole screen olive,
// a white tick, what was taken and how ("$39.00 in cash."), the change to
// give back, the sale itemised on a white card with its total, the receipt
// box, and Next customer / Done for now. It covers the tab bar, as the
// design's has none: the two buttons are the way on.
//
// The card lists the sale as rung up, at the recipes' prices; a discount is
// a line of its own above the total, so the lines still add up to it.
// Recording and the receipt's send are unchanged (sale-template.ts and
// receipt-template.ts); this draws them.
//
// Next customer is the till again, at the same event if there is one. Done
// for now goes home, as the × does; at an event the till stays on it, as it
// already did when a tab was tapped mid-event.

import { swapOnce, scBlock } from "./template-blocks";
import { DANGER, HAIRLINE, INK, OLIVE, OLIVE_700, OLIVE_SOFT, PAY_SHADOW, R_BUTTON, SURFACE, TNUM } from "./design/tokens";

const LABEL_ = "Sale done";

const svg = (size: number, paths: string, width = "1.75") =>
  `<svg width="${size}" height="${size}" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

/* ------------------------------------------------------------- controller */

/** Kept with the sale as it is recorded: in finish(), where total, final, promoPct and hasCustom are. */
const doneRecord = `                  // as rung up, for the done screen: the discount is a line of its own
                  listTotal: total,
                  offLabel: hasCustom ? 'New total' : promoPct + '% off',
                  listLines: posRecipes
                    .filter(r => ((st.posQty || {})[r.id] || 0) > 0)
                    .map(r => ({ name: r.name, quantity: (st.posQty || {})[r.id] || 0, amount: ((st.posQty || {})[r.id] || 0) * (Number(r.sell) || 0) })),
                  // read before posQty is cleared on the next line
`;

/** In the till's scope: posDone, posSent, $. */
const doneBindings = `              ...(() => {
                const done = posDone || {};
                const paid = Number(done.total) || 0;
                const listed = Array.isArray(done.listLines) ? done.listLines
                  : (done.lines || []).map(l => ({ name: l.name, quantity: l.quantity, amount: (Number(l.quantity) || 0) * (Number(l.price) || 0) }));
                const off = Math.max(0, (Number(done.listTotal) || paid) - paid);
                const rows = listed.map(l => ({ label: l.quantity + ' \\u00d7 ' + l.name, amount: $(Number(l.amount) || 0), color: '${INK}' }));
                if (off > 0.004) rows.push({ label: done.offLabel || 'Discount', amount: '\\u2212' + $(off), color: '${DANGER}' });
                const change = Number(done.change) || 0;
                return {
                  doneHeadline: $(paid) + (done.method === 'Cash' ? ' in cash.' : ' by card.'),
                  doneChangeLine: done.method !== 'Cash' ? 'Paid by card.' : change > 0.004 ? 'Give back ' + $(change) + ' change.' : 'Exact amount, no change to give.',
                  doneRows: rows.map((r, i) => ({ ...r, sep: i ? '1px solid ${HAIRLINE}' : '0' })),
                  donePaid: $(paid),
                  doneSendLabel: this.state.posSending ? 'Sending\\u2026' : (posSent ? 'Sent' : 'Send')
                };
              })(),
`;

function addBindings(template: string): string {
  let out = swapOnce(
    template,
    "                  // read before posQty is cleared on the next line\n",
    doneRecord,
    `${LABEL_} record`,
  );
  out = swapOnce(
    out,
    "              doneTitle: posDone && posDone.method === 'Cash' ? 'Cash recorded' : 'Payment approved',\n",
    doneBindings + "              doneTitle: posDone && posDone.method === 'Cash' ? 'Cash recorded' : 'Payment approved',\n",
    `${LABEL_} bindings`,
  );
  return out;
}

/* ----------------------------------------------------------------- screen */

const screen =
  `<div style="position:fixed;inset:0;z-index:35;overflow:auto;background:${OLIVE};color:${SURFACE};display:flex;flex-direction:column">` +
  '<div style="flex:1 0 auto;padding:calc(env(safe-area-inset-top, 0px) + 14px) 24px 0;display:flex;flex-direction:column;gap:20px">' +
  '<div style="display:flex;align-items:center;justify-content:space-between">' +
  `<span style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:${OLIVE_SOFT}">Sale recorded</span>` +
  `<button type="button" sc-camel-on-click="{{ goDash }}" aria-label="Close" style="width:40px;height:40px;border-radius:50%;border:0;padding:0;cursor:pointer;background:rgba(255,255,255,.16);color:${SURFACE};display:grid;place-items:center">${svg(16, '<path d="M6 6l12 12M18 6L6 18"></path>')}</button>` +
  "</div>" +
  // what was taken
  '<div style="display:flex;flex-direction:column;gap:10px">' +
  `<div style="width:56px;height:56px;border-radius:50%;background:${SURFACE};color:${OLIVE};display:grid;place-items:center">${svg(28, '<path d="M20 6L9 17l-5-5"></path>', "2.5")}</div>` +
  `<div style="font-size:32px;font-weight:700;line-height:1.15;margin-top:6px;${TNUM}">{{ doneHeadline }}</div>` +
  `<div style="font-size:15px;color:${OLIVE_SOFT};${TNUM}">{{ doneChangeLine }}</div>` +
  "</div>" +
  // the sale
  `<div style="background:${SURFACE};color:${INK};border-radius:22px;padding:4px 18px;box-shadow:${PAY_SHADOW};display:flex;flex-direction:column;font-size:13px;${TNUM}">` +
  '<sc-for list="{{ doneRows }}" as="d" hint-placeholder-count="3">' +
  '<div style="display:flex;justify-content:space-between;gap:12px;min-height:38px;align-items:center;border-top:{{ d.sep }}">' +
  '<span style="min-width:0">{{ d.label }}</span><span style="flex:none;font-weight:500;color:{{ d.color }}">{{ d.amount }}</span></div>' +
  "</sc-for>" +
  `<div style="display:flex;justify-content:space-between;min-height:40px;align-items:center;border-top:1px solid ${INK};font-weight:700;font-size:14px"><span>Total</span><span>{{ donePaid }}</span></div>` +
  "</div>" +
  // the receipt
  '<div style="display:flex;flex-direction:column;gap:8px">' +
  `<span style="font-size:11px;font-weight:600;color:${OLIVE_SOFT}">Receipt by email · optional</span>` +
  '<div style="display:flex;gap:8px">' +
  `<input type="email" aria-label="Receipt by email" inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" value="{{ posContact }}" sc-camel-on-change="{{ setPosContact }}" placeholder="customer@email.com" style="flex:1;min-width:0;height:46px;padding:0 16px;border:0;border-radius:14px;background:${SURFACE};color:${INK};font-family:inherit;font-size:14px;outline:none">` +
  `<button type="button" sc-camel-on-click="{{ sendReceipt }}" style="flex:none;height:46px;padding:0 16px;border:1px solid rgba(255,255,255,.45);border-radius:14px;background:transparent;color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">{{ doneSendLabel }}</button>` +
  "</div>" +
  `<sc-if value="{{ hasReceiptNote }}" hint-placeholder-val="{{ false }}"><div style="font-size:12px;line-height:1.45;color:${OLIVE_SOFT}">{{ receiptNote }}</div></sc-if>` +
  "</div></div>" +
  // the way on
  '<div style="flex:none;padding:16px 24px calc(env(safe-area-inset-bottom, 0px) + 20px);display:flex;flex-direction:column;gap:10px">' +
  `<button type="button" sc-camel-on-click="{{ saleAgain }}" style="display:flex;align-items:center;justify-content:center;height:48px;border:0;border-radius:${R_BUTTON};background:${SURFACE};color:${OLIVE_700};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">Next customer</button>` +
  `<button type="button" sc-camel-on-click="{{ goDash }}" style="display:flex;align-items:center;justify-content:center;height:44px;border:0;background:none;color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">Done for now</button>` +
  "</div></div>";

function restyleDone(template: string): string {
  const done = scBlock(template, '<sc-if value="{{ onSaleDone }}" hint-placeholder-val="{{ false }}">', `${LABEL_} screen`);
  return template.slice(0, done.innerStart) + screen + template.slice(done.innerEnd);
}

export function applySaleDoneBehavior(template: string): string {
  return restyleDone(addBindings(template));
}

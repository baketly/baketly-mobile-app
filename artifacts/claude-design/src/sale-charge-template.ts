// Taking the money.
//
// design/mobile-redesign/screens/SaleCharge.dc.html: what to pay, large, with
// what is in the basket under it; Card · coming soon beside Cash; what they
// gave -- Exact or a note, or typed in -- and the change due; one button that
// records the cash. "Add a discount" opens SaleDiscount.dc.html, a sheet with
// None / 10 / 15 / 20% or a different total, showing what it comes to before
// it is applied. Applied, the screen reads as SaleChargeDiscounted.dc.html:
// the old total struck through and the discount named.
//
// The sums and the recording are the till's (sale-template.ts and the base
// controller): promotion, custom total, tendered, change, finish. This adds a
// typed amount tendered, the sheet's draft -- so Close leaves the discount as
// it was -- and the lines the screen is drawn with.

import { sheet } from "./design/pieces";
import {
  BORDER, CARD_SHADOW, GOLD, HAIRLINE, INK, LABEL, MUTED, OLIVE, OLIVE_700, OLIVE_DIM, OLIVE_SOFT,
  R_BUTTON, R_FIELD, SURFACE, TNUM,
} from "./design/tokens";
import { scBlock, swapOnce } from "./template-blocks";

const LABEL_ = "Charge";

const svg = (size: number, paths: string, width = "1.75") =>
  `<svg width="${size}" height="${size}" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

/* ------------------------------------------------------------- controller */

/** In the till's scope: total, final, discount, promoPct, hasCustom, posTendered, change, posQty, posRecipes, $. */
const chargeBindings = `              posChangeColor: posTendered > 0 && change < 0 ? '#b0563e' : 'var(--color-accent-700)',
              ...(() => {
                const picked = this.state.posTenderPick || '';
                const chip = on => ({ border: on ? '${OLIVE}' : '${BORDER}', bg: on ? '${OLIVE_SOFT}' : '${SURFACE}', color: on ? '${OLIVE_700}' : '${INK}' });
                const inBasket = posRecipes.filter(r => (posQty[r.id] || 0) > 0);
                const count = inBasket.reduce((s, r) => s + (posQty[r.id] || 0), 0);
                const what = inBasket.map(r => (posQty[r.id] || 0) + ' ' + String(r.name || '').toLowerCase()).join(', ');
                const off = hasCustom ? 'new total' : promoPct + '% off';
                const discounted = discount > 0.004;
                // the sheet works on a copy until Apply, so Close changes nothing
                const draft = this.state.posDiscDraft || { promo: this.state.posPromo || 'none', custom: String(this.state.posCustom || '') };
                const dPct = { none: 0, p10: 10, p15: 15, p20: 20 }[draft.promo] || 0;
                const dCustomVal = parseFloat(String(draft.custom || '').replace(/[^0-9.]/g, ''));
                const dHasCustom = !isNaN(dCustomVal) && String(draft.custom || '').trim() !== '';
                const dDiscount = dHasCustom ? Math.max(0, total - dCustomVal) : total * dPct / 100;
                const dFinal = Math.max(0, dHasCustom ? dCustomVal : total - dDiscount);
                const enough = final > 0 && posTendered >= final;
                return {
                  chargeItemsLine: count + (count === 1 ? ' item' : ' items') + (what ? ' \\u00b7 ' + what : ''),
                  chargeDiscounted: discounted,
                  chargePlain: !discounted,
                  chargeWas: $(total),
                  chargeOff: off,
                  chargeDiscountLink: discounted ? off + ' \\u00b7 change' : 'Add a discount',
                  chargeTenders: tenderOptsRaw().map(o => ({ ...o, ...chip(picked === o.label && posTendered > 0) })),
                  chargeOtherText: picked === 'other' ? String(this.state.posTenderTyped || '') : '',
                  chargeOtherBorder: picked === 'other' ? '${OLIVE}' : '${BORDER}',
                  setChargeOther: e => {
                    const raw = String((e && e.target && e.target.value) || '').replace(/[^0-9.]/g, '').slice(0, 9);
                    const v = parseFloat(raw);
                    this.setState({ posTenderTyped: raw, posTenderPick: 'other', posTendered: isNaN(v) ? 0 : v });
                  },
                  chargeTendered: posTendered > 0 ? $(posTendered) : '\\u2014',
                  chargeChangeLabel: posTendered > 0 && change < 0 ? 'Still to pay' : 'Change due',
                  chargeChange: posTendered > 0 ? $(Math.abs(change)) : '\\u2014',
                  chargeChangeColor: posTendered > 0 && change < 0 ? '#b07a1f' : '${OLIVE_700}',
                  chargeRecordLabel: 'Record cash \\u00b7 ' + $(final),
                  chargeRecordBg: enough ? '${OLIVE}' : '${OLIVE_DIM}',
                  // the discount sheet
                  discSheetOpen: this.state.posDiscOpen === true,
                  openDiscSheet: () => this.setState({ posDiscOpen: true, posDiscDraft: { promo: this.state.posPromo || 'none', custom: String(this.state.posCustom || '') } }),
                  dismissDiscSheet: () => this.setState({ posDiscOpen: false, posDiscDraft: null }),
                  closeDiscSheet: e => { if (!e || e.target === e.currentTarget) this.setState({ posDiscOpen: false, posDiscDraft: null }); },
                  discOpts: [['none', 'None'], ['p10', '10%'], ['p15', '15%'], ['p20', '20%']].map(([k, label]) => ({
                    label,
                    ...chip(!dHasCustom && draft.promo === k),
                    // a percentage replaces a typed total
                    set: () => this.setState({ posDiscDraft: { promo: k, custom: '' } })
                  })),
                  discCustom: String(draft.custom || ''),
                  setDiscCustom: e => this.setState({ posDiscDraft: { ...draft, custom: String((e && e.target && e.target.value) || '').replace(/[^0-9.]/g, '').slice(0, 9) } }),
                  discItems: $(total),
                  discHasLine: dDiscount > 0.004,
                  discLineLabel: dHasCustom ? 'New total' : dPct + '% promotion',
                  discLine: '\\u2212' + $(dDiscount),
                  discToPay: $(dFinal),
                  discApplyLabel: 'Apply \\u00b7 charge ' + $(dFinal),
                  // applied: what they gave no longer matches what they owe
                  applyDisc: () => this.setState({ posPromo: draft.promo, posCustom: draft.custom, posDiscOpen: false, posDiscDraft: null, posTendered: 0, posTenderPick: '', posTenderTyped: '' })
                };
              })(),
`;

function addBindings(template: string): string {
  let out = swapOnce(
    template,
    "              posChangeColor: posTendered > 0 && change < 0 ? '#b0563e' : 'var(--color-accent-700)',\n",
    chargeBindings,
    `${LABEL_} bindings`,
  );
  // the tender choices as plain values, so the chips can be drawn afresh
  out = swapOnce(
    out,
    "              tenderOpts: (() => {\n                const opts = [{ label: 'Exact', v: final }];",
    "              tenderOpts: (() => {\n                const opts = tenderOptsRaw().map(o => ({ label: o.label, v: o.v }));",
    `${LABEL_} tender options`,
  );
  // tenderOptsRaw: Exact, then the notes bigger than the total, up to four
  const start = out.indexOf("const opts = tenderOptsRaw().map(o => ({ label: o.label, v: o.v }));");
  const listStart = out.indexOf("                [10, 20, 50, 100].forEach(v => {", start);
  const listEnd = out.indexOf("\n", listStart);
  const noteLine = out.slice(listStart, listEnd);
  if (listStart < 0 || listStart - start > 200) throw new Error(`${LABEL_}: missing tender notes`);
  out = out.slice(0, listStart) + out.slice(listEnd + 1);
  return swapOnce(
    out,
    "            const change = posTendered - final;\n",
    "            const change = posTendered - final;\n" +
      "            const tenderOptsRaw = () => {\n" +
      "              const opts = [{ label: 'Exact', v: final }];\n" +
      noteLine.replace(/^\s+/, "              ") + "\n" +
      "              return opts.map(o => ({ ...o, set: () => this.setState({ posTendered: o.v, posTenderPick: o.label, posTenderTyped: '' }) }));\n" +
      "            };\n",
    `${LABEL_} tender helper`,
  );
}

/* ----------------------------------------------------------------- screen */

const chips = (list: string, alias: string) =>
  `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">` +
  `<sc-for list="{{ ${list} }}" as="${alias}" hint-placeholder-count="4">` +
  `<button type="button" sc-camel-on-click="{{ ${alias}.set }}" style="height:48px;border:1px solid {{ ${alias}.border }};border-radius:${R_BUTTON};background:{{ ${alias}.bg }};color:{{ ${alias}.color }};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;${TNUM}">{{ ${alias}.label }}</button>` +
  "</sc-for></div>";

const moneyBox = (value: string, onChange: string, placeholder: string, aria: string, border = BORDER) =>
  `<div style="display:flex;align-items:center;gap:4px;height:48px;padding:0 16px;border:1px solid ${border};border-radius:${R_FIELD};background:${SURFACE};box-sizing:border-box">` +
  `<span style="font-size:15px;font-weight:600;color:${MUTED}">{{ currencySymbol }}</span>` +
  `<input type="text" inputmode="decimal" value="{{ ${value} }}" sc-camel-on-change="{{ ${onChange} }}" placeholder="${placeholder}" aria-label="${aria}" style="flex:1;min-width:0;border:0;outline:none;background:none;padding:0;font-family:inherit;font-weight:600;font-size:15px;color:${INK};${TNUM}"></div>`;

const screen =
  '<div style="padding:14px 20px 0;display:flex;flex-direction:column;gap:18px;min-height:100%;box-sizing:border-box">' +
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
  `<button type="button" sc-camel-on-click="{{ back }}" style="display:flex;align-items:center;gap:4px;min-height:44px;margin-left:-4px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:${OLIVE_700}">${svg(16, '<path d="M15 6l-6 6 6 6"></path>')}Back</button>` +
  `<span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${GOLD}">Charge</span>` +
  '<span style="width:40px"></span></div>' +
  // what to pay
  '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 0 4px;text-align:center">' +
  `<span style="font-size:12px;color:${MUTED}">To pay</span>` +
  `<span style="font-size:44px;font-weight:700;line-height:1.1;letter-spacing:-0.01em;${TNUM}">{{ chargeTotalStr }}</span>` +
  `<sc-if value="{{ chargePlain }}" hint-placeholder-val="{{ true }}"><span style="font-size:12px;color:${MUTED};${TNUM}">{{ chargeItemsLine }}</span></sc-if>` +
  `<sc-if value="{{ chargeDiscounted }}" hint-placeholder-val="{{ false }}"><span style="font-size:12px;color:${MUTED};${TNUM}">{{ posItemsLabel }} · <span style="text-decoration:line-through">{{ chargeWas }}</span> · <span style="color:${OLIVE_700};font-weight:600">{{ chargeOff }}</span></span></sc-if>` +
  "</div>" +
  // how they are paying
  `<div role="group" aria-label="How they're paying" style="display:flex;gap:4px;padding:4px;border:1px solid ${BORDER};border-radius:14px;background:${SURFACE}">` +
  `<button type="button" disabled aria-label="Card payments are coming soon" style="flex:1;height:40px;border:0;border-radius:10px;background:transparent;color:#9a947f;font-family:inherit;font-size:12px;font-weight:600">Card · coming soon</button>` +
  `<button type="button" aria-pressed="true" sc-camel-on-click="{{ setPosCash }}" style="flex:1;height:40px;border:0;border-radius:10px;background:${OLIVE};color:${SURFACE};font-family:inherit;font-size:12px;font-weight:600;cursor:pointer">Cash</button>` +
  "</div>" +
  // what they gave
  '<div style="display:flex;flex-direction:column;gap:10px">' +
  '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:0 2px">' +
  '<h6 style="margin:0;font-size:15px;font-weight:700;line-height:1.3">They gave you</h6>' +
  `<button type="button" sc-camel-on-click="{{ openDiscSheet }}" style="border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:${OLIVE_700}">{{ chargeDiscountLink }}</button></div>` +
  chips("chargeTenders", "tn") +
  moneyBox("chargeOtherText", "setChargeOther", "Other amount they gave", "Amount they gave you", "{{ chargeOtherBorder }}") +
  "</div>" +
  // tendered and change
  `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border:1px solid ${HAIRLINE};border-radius:18px;background:${SURFACE};overflow:hidden">` +
  `<div style="padding:12px 14px;display:flex;flex-direction:column;gap:2px"><span style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${LABEL}">Tendered</span><span style="font-weight:600;font-size:20px;line-height:1.2;${TNUM}">{{ chargeTendered }}</span></div>` +
  `<div style="padding:12px 14px;border-left:1px solid ${HAIRLINE};display:flex;flex-direction:column;gap:2px"><span style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${LABEL}">{{ chargeChangeLabel }}</span><span style="font-weight:600;font-size:20px;line-height:1.2;color:{{ chargeChangeColor }};${TNUM}">{{ chargeChange }}</span></div>` +
  "</div>" +
  // record it
  '<div style="position:sticky;bottom:0;z-index:5;margin:auto -20px 0">' +
  `<div style="background:${SURFACE};border-radius:22px 22px 0 0;box-shadow:0 -8px 30px rgba(60,55,30,.10);padding:16px 20px 20px;display:flex;flex-direction:column;gap:10px">` +
  `<button type="button" sc-camel-on-click="{{ recordCash }}" style="display:flex;align-items:center;justify-content:center;height:48px;border:0;border-radius:${R_BUTTON};background:{{ chargeRecordBg }};color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;${TNUM}">{{ chargeRecordLabel }}</button>` +
  "</div></div>" +
  "</div>";

const discountSheet =
  '<sc-if value="{{ discSheetOpen }}" hint-placeholder-val="{{ false }}">' +
  `<div sc-camel-on-click="{{ closeDiscSheet }}" style="position:fixed;inset:0;z-index:40;background:rgba(250,246,240,.45)">` +
  sheet({
    title: "Add a discount",
    sub: "Just for this sale",
    height: "auto",
    onClose: "{{ dismissDiscSheet }}",
    body:
      '<div style="flex:none;display:flex;flex-direction:column;gap:10px">' +
      '<div style="font-size:11px;font-weight:600;padding:0 2px">Take off</div>' +
      chips("discOpts", "d") +
      "</div>" +
      '<div style="flex:none;display:flex;flex-direction:column;gap:6px">' +
      '<span style="font-size:11px;font-weight:600;padding:0 2px">Or charge a different total</span>' +
      moneyBox("discCustom", "setDiscCustom", "e.g. 35.00", "Custom total") +
      `<div style="font-size:12px;color:${MUTED};padding:0 2px">A typed total replaces the percentage.</div>` +
      "</div>" +
      `<div style="flex:none;background:${SURFACE};border-radius:18px;padding:4px 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column;font-size:13px;${TNUM}">` +
      `<div style="display:flex;justify-content:space-between;min-height:36px;align-items:center"><span style="color:${LABEL}">Items</span><span style="font-weight:500">{{ discItems }}</span></div>` +
      '<sc-if value="{{ discHasLine }}" hint-placeholder-val="{{ false }}">' +
      `<div style="display:flex;justify-content:space-between;min-height:36px;align-items:center;border-top:1px solid ${HAIRLINE}"><span style="color:${LABEL}">{{ discLineLabel }}</span><span style="font-weight:500;color:#b0563e">{{ discLine }}</span></div></sc-if>` +
      `<div style="display:flex;justify-content:space-between;min-height:40px;align-items:center;border-top:1px solid ${INK};font-weight:700;font-size:15px"><span>To pay</span><span>{{ discToPay }}</span></div>` +
      "</div>" +
      '<div style="flex:none;padding:0 0 max(30px, env(safe-area-inset-bottom))">' +
      `<button type="button" sc-camel-on-click="{{ applyDisc }}" style="width:100%;display:flex;align-items:center;justify-content:center;height:48px;border:0;border-radius:${R_BUTTON};background:${OLIVE};color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;${TNUM}">{{ discApplyLabel }}</button></div>`,
  }) +
  "</div></sc-if>";

function restyleCharge(template: string): string {
  const charge = scBlock(template, '<sc-if value="{{ onCharge }}" hint-placeholder-val="{{ false }}">', `${LABEL_} screen`);
  return template.slice(0, charge.innerStart) + screen + discountSheet + template.slice(charge.innerEnd);
}

export function applySaleChargeBehavior(template: string): string {
  return restyleCharge(addBindings(template));
}

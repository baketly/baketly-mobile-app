// First-run setup, in the new design.
//
// Four screens where there were three:
//   Onboarding1.dc.html -- the app's own icon, one headline, one line, Get
//     started; Skip goes straight to Home;
//   Onboarding2.dc.html -- the three things Baketly does, as tiles;
//   OnboardingBakery.dc.html -- your name, the bakery's, where you sell, with
//     the design's placeholders and no examples;
//   Onboarding4.dc.html -- the currency, as a row that opens the same sheet
//     Settings uses, and an optional hourly rate; Take me to my bakery.
// A step bar at the foot of each: the current step long, the ones done olive.
//
// The controller and the step logic are onboarding-template.ts's: steps are
// screens 'ob1' and on, walked with goStep, ended by finish, which Skip also
// calls. This adds the fourth step to its list and draws the screens. The
// fields keep the setters they always had, so what is typed is kept as it is
// typed, and where you sell still suggests places.

import {
  BG, BORDER, CARD_SHADOW, HANDLE, INK, LABEL, MUTED, OLIVE, OLIVE_700, OLIVE_SOFT, PAY_SHADOW, R_BUTTON, R_CARD, R_FIELD, SURFACE, TNUM,
} from "./design/tokens";
import { currencySheet } from "./settings-screen-template";
import { scBlock, swapOnce } from "./template-blocks";

const LABEL_ = "Onboarding screens";

const svg = (size: number, paths: string, width = "1.75") =>
  `<svg width="${size}" height="${size}" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

/* ------------------------------------------------------------- controller */

/** In the onboarding controller's scope: steps, here, goStep. */
const bindings = `          onObStep4: this.state.screen === 'ob4',
          obGoStep4: goStep(3),
          obBar: steps.map((s, i) => ({ w: i === here ? '28px' : '8px', bg: i <= here ? '${OLIVE}' : '${BORDER}' })),
          obBarLabel: 'Step ' + (here + 1) + ' of ' + steps.length,
          obBg: here === 0 ? '${OLIVE_SOFT}' : '${BG}',
          finishOnboarding: finish,
`;

function addBindings(template: string): string {
  let out = swapOnce(template, 'const steps = ["ob1","ob2","ob3"];', 'const steps = ["ob1","ob2","ob3","ob4"];', `${LABEL_} steps`);
  return swapOnce(out, "          finishOnboarding: finish,\n", bindings, `${LABEL_} bindings`);
}

/* ----------------------------------------------------------------- pieces */

const topBar = (back: boolean, skip: boolean) =>
  '<div style="flex:none;display:flex;align-items:center;justify-content:space-between;min-height:44px">' +
  (back
    ? `<button type="button" sc-camel-on-click="{{ obBack }}" style="display:flex;align-items:center;gap:4px;min-height:44px;margin-left:-4px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:${OLIVE_700}">${svg(16, '<path d="M15 6l-6 6 6 6"></path>')}Back</button>`
    : '<span style="width:56px"></span>') +
  (skip
    ? `<button type="button" sc-camel-on-click="{{ skipOnboarding }}" style="display:flex;align-items:center;min-height:44px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:${MUTED}">Skip</button>`
    : '<span style="width:40px"></span>') +
  "</div>";

/** The middle of a step, centred in what is left of the screen. */
const middle = (inner: string, align = "stretch") =>
  `<div style="flex:1 0 auto;display:flex;flex-direction:column;justify-content:center;align-items:${align};gap:24px;padding:24px 0">${inner}</div>`;

const foot = (onTap: string, label: string) =>
  '<div style="flex:none;display:flex;flex-direction:column;gap:18px">' +
  '<div role="img" aria-label="{{ obBarLabel }}" style="display:flex;gap:6px;justify-content:center">' +
  '<sc-for list="{{ obBar }}" as="b" hint-placeholder-count="4"><span style="width:{{ b.w }};height:4px;border-radius:2px;background:{{ b.bg }};transition:width 200ms ease"></span></sc-for></div>' +
  `<button type="button" sc-camel-on-click="{{ ${onTap} }}" style="display:flex;align-items:center;justify-content:center;height:48px;border:0;border-radius:${R_BUTTON};background:${OLIVE};color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">${label}</button>` +
  "</div>";

const headline = (text: string) => `<h1 style="margin:0;font-size:32px;font-weight:700;line-height:1.15">${text}</h1>`;
const lead = (text: string, size = "14px") => `<p style="margin:0;font-size:${size};line-height:1.55;color:${LABEL}">${text}</p>`;

const tile = (icon: string, title: string, sub: string) =>
  `<div style="display:flex;align-items:center;gap:16px;padding:16px 18px;background:${SURFACE};border-radius:${R_CARD};box-shadow:${CARD_SHADOW}">` +
  `<span style="flex:none;width:48px;height:48px;border-radius:14px;background:${OLIVE_SOFT};color:${OLIVE_700};display:grid;place-items:center">${svg(22, icon)}</span>` +
  `<span style="display:flex;flex-direction:column"><span style="font-size:16px;font-weight:600;line-height:1.3">${title}</span><span style="font-size:13px;color:${LABEL}">${sub}</span></span></div>`;

const input = (label: string, value: string, onChange: string, placeholder: string, extra = "") =>
  '<div style="display:flex;flex-direction:column;gap:6px">' +
  `<span style="font-size:11px;font-weight:600">${label}</span>` +
  `<input type="text" value="{{ ${value} }}" sc-camel-on-change="{{ ${onChange} }}" aria-label="${label}" placeholder="${placeholder}" ${extra}` +
  `style="width:100%;box-sizing:border-box;height:52px;padding:0 16px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};color:${INK};font-family:inherit;font-size:15px;font-weight:500;outline:none"></div>`;

/* ----------------------------------------------------------------- steps */

const welcome =
  topBar(false, true) +
  middle(
    // public/icon-512.png, beside the page as the loading screen's mark is
    `<img src="icon-512.png" alt="Baketly" width="80" height="80" style="width:80px;height:80px;border-radius:22px;box-shadow:${PAY_SHADOW}">` +
      '<div style="display:flex;flex-direction:column;gap:10px">' +
      headline("Know what every bake really costs.") +
      `<p style="margin:0;font-size:15px;line-height:1.55;color:${LABEL};max-width:28ch">Baketly does the maths, so you can bake.</p></div>`,
    "flex-start",
  ) +
  foot("obGoStep2", "Get started");

const threeThings =
  topBar(true, true) +
  middle(
    headline("Three things, done for you.") +
      '<div style="display:flex;flex-direction:column;gap:12px">' +
      tile('<path d="M6 3h9l4 4v14H6z"></path><path d="M9 12h7M9 16h5"></path>', "Price every recipe", "from what the ingredients cost you") +
      tile('<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path>', "Plan every event", "what to bake, buy and charge") +
      tile('<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"></path>', "See what you earn", "per bake, per event, per month") +
      "</div>",
  ) +
  foot("obGoStep3", "Continue");

const bakery =
  topBar(true, true) +
  middle(
    '<div style="display:flex;flex-direction:column;gap:6px">' +
      headline("Your bakery") +
      lead("Where you sell lets Baketly check what bakeries near you charge.") +
      "</div>" +
      '<div style="display:flex;flex-direction:column;gap:16px">' +
      input("Your name", "ownerName", "setOwnerName", "Enter your name") +
      input("Bakery name", "bakeryName", "setBakeryName", "Enter bakery name") +
      input("Where you sell", "bakeryLocation", "setBakeryLocation", "Start typing a town or address", 'autocomplete="off" ') +
      '<sc-if value="{{ hasLocationSuggestions }}" hint-placeholder-val="{{ false }}">' +
      `<div style="margin-top:-10px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};overflow:hidden">` +
      '<sc-for list="{{ locationSuggestions }}" as="hit" hint-placeholder-count="2">' +
      `<button type="button" sc-camel-on-click="{{ hit.choose }}" style="display:block;width:100%;text-align:left;padding:12px 16px;border:0;border-bottom:1px solid ${BORDER};background:none;cursor:pointer;font-family:inherit;font-size:13px;color:${INK}">{{ hit.place }}</button>` +
      "</sc-for></div></sc-if>" +
      "</div>",
  ) +
  foot("obGoStep4", "Continue");

const pricing =
  topBar(true, false) +
  middle(
    '<div style="display:flex;flex-direction:column;gap:6px">' +
      headline("How you price") +
      lead("Both can change later in Settings.") +
      "</div>" +
      '<div style="display:flex;flex-direction:column;gap:12px">' +
      `<button type="button" sc-camel-on-click="{{ openCurrencySheet }}" aria-label="Currency: {{ setCurrencyName }}" style="display:flex;align-items:center;justify-content:space-between;gap:8px;height:56px;padding:0 18px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};color:${INK};font-family:inherit;cursor:pointer">` +
      `<span style="font-size:12px;color:${LABEL}">Currency</span>` +
      `<span style="display:flex;align-items:center;gap:6px;font-size:15px;font-weight:600">{{ setCurrencyName }}<span style="color:${HANDLE};display:grid">${svg(14, '<path d="M6 9l6 6 6-6"></path>')}</span></span></button>` +
      `<label style="display:flex;align-items:center;justify-content:space-between;gap:8px;height:56px;padding:0 18px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};cursor:text;box-sizing:border-box">` +
      `<span style="font-size:12px;color:${LABEL}">My hourly rate</span>` +
      `<span style="display:flex;align-items:baseline;gap:4px"><span style="font-size:15px;color:${MUTED}">{{ currencySymbol }}</span>` +
      `<input type="text" inputmode="decimal" value="{{ hourlyRateText }}" sc-camel-on-change="{{ setHourlyRate }}" aria-label="My hourly rate" placeholder="optional" style="width:90px;height:40px;border:0;outline:none;background:none;padding:0;color:${INK};font-family:inherit;font-weight:600;font-size:15px;text-align:right;${TNUM}"></span></label>` +
      "</div>" +
      lead("With a rate, every recipe shows what you earn after your time — not just after ingredients.", "13px"),
  ) +
  foot("finishOnboarding", "Take me to my bakery");

const screen =
  // the whole phone, status bar included: the first step is green to its edges
  '<div style="position:fixed;inset:0;z-index:30;overflow:auto;background:{{ obBg }};transition:background 200ms ease">' +
  '<div style="min-height:100%;box-sizing:border-box;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top, 0px) + 14px) 24px calc(env(safe-area-inset-bottom, 0px) + 24px)">' +
  `<sc-if value="{{ onObStep1 }}" hint-placeholder-val="{{ true }}">${welcome}</sc-if>` +
  `<sc-if value="{{ onObStep2 }}" hint-placeholder-val="{{ false }}">${threeThings}</sc-if>` +
  `<sc-if value="{{ onObStep3 }}" hint-placeholder-val="{{ false }}">${bakery}</sc-if>` +
  `<sc-if value="{{ onObStep4 }}" hint-placeholder-val="{{ false }}">${pricing}</sc-if>` +
  "</div>" +
  currencySheet +
  "</div>";

function restyle(template: string): string {
  const block = scBlock(template, '<sc-if value="{{ onOb }}" hint-placeholder-val="{{ false }}">', `${LABEL_} block`);
  return template.slice(0, block.innerStart) + screen + template.slice(block.innerEnd);
}

export function applyOnboardingScreenBehavior(template: string): string {
  return restyle(addBindings(template));
}

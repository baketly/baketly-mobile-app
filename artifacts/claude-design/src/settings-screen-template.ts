// Settings, in the new design.
//
// design/mobile-redesign/screens/Settings.dc.html and SettingsScrolled.dc.html:
// the three chips -- General, Account, Billing -- stay, and General is cards of
// rows that are the fields themselves. Tapping the value puts the caret in it,
// typing changes it, and leaving the field saves it, with "Saved" showing for a
// moment beside the card's heading -- the design's script block, which keeps
// what is typed and commits it on blur. Currency is a row that opens
// CurrencySheet.dc.html; each reminder has its time as a chip beside its
// toggle; recipe groups are chips with ×, and a box to add one.
//
// SettingsAccount.dc.html: who is signed in, with Sign out; "What Baketly
// keeps", which opens SettingsData.dc.html, a page that counts what is in the
// account and opens each list; and deleting the account.
// SettingsBilling.dc.html: the plan, and no receipts yet.
//
// The handlers are the ones Settings already had: reminders and deleting the
// account (settings-template.ts), the currency (currency.ts), the groups
// (recipe-groups-template.ts), where you sell and its suggestions
// (watch-template.ts), the hourly rate (onboarding-template.ts). New here are
// the draft a field holds while it is being typed in, the sheet, and the data
// page's counts.

import { CURRENCIES } from "./currency";
import {
  BORDER, CARD_SHADOW, DANGER, GOLD, HAIRLINE, HANDLE, INK, LABEL, MUTED, OLIVE, OLIVE_700, OLIVE_SOFT,
  R_BUTTON, R_CARD, R_FIELD, SURFACE, TNUM,
} from "./design/tokens";
import { sheet } from "./design/pieces";
import { packagingDefaults } from "./recipe-template";
import { scBlock, swapOnce } from "./template-blocks";

const LABEL_ = "Settings screen";

const svg = (size: number, paths: string, width = "1.75") =>
  `<svg width="${size}" height="${size}" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const CHEVRON = `<span style="flex:none;color:${HANDLE};display:grid">${svg(16, '<path d="M9 6l6 6-6 6"></path>')}</span>`;
const DOWN = svg(14, '<path d="M6 9l6 6 6-6"></path>');
const PENCIL = svg(14, '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path>');
const GEAR =
  '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"></path>';
const PERSON = '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>';
const CARD_ICON = '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 10h18M7 15h4"></path>';
const RECEIPT = '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"></path><path d="M9 8h6M9 12h6"></path>';
const SEARCH = '<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path>';
const CHECK = '<path d="M20 6L9 17l-5-5"></path>';

/** What the sheet calls each currency. The codes and symbols are currency.ts's. */
const NAMES: Record<string, string> = {
  USD: "US dollar", EUR: "Euro", GBP: "British pound", ILS: "Israeli shekel", CAD: "Canadian dollar",
  AUD: "Australian dollar", NZD: "New Zealand dollar", CHF: "Swiss franc", SEK: "Swedish krona",
  NOK: "Norwegian krone", DKK: "Danish krone", PLN: "Polish złoty", CZK: "Czech koruna", HUF: "Hungarian forint",
  RON: "Romanian leu", JPY: "Japanese yen", INR: "Indian rupee", MXN: "Mexican peso", BRL: "Brazilian real",
  ZAR: "South African rand", AED: "UAE dirham", SGD: "Singapore dollar", HKD: "Hong Kong dollar", TRY: "Turkish lira",
};
const CURRENCY_LIST = CURRENCIES.map((c) => ({ code: c.code, symbol: c.symbol, name: NAMES[c.code] || c.code }));
const HIDDEN_PACKAGING = Object.keys(packagingDefaults).filter(
  (k) => (packagingDefaults as Record<string, { visible?: boolean }>)[k].visible === false,
);

/* ------------------------------------------------------------- controller */

const bindings = `      ...(() => {
        const st = this.state;
        const tab = st.settingsTab || 'general';
        const chip = on => ({ bg: on ? '${OLIVE}' : '${SURFACE}', fg: on ? '${SURFACE}' : '${INK}', edge: on ? '${OLIVE}' : '${BORDER}',
          dot: on ? 'rgba(255,255,255,.18)' : '${OLIVE_SOFT}', dotFg: on ? '${SURFACE}' : '${OLIVE_700}' });
        // "Saved" beside a card's heading, for a moment after something in it is kept
        const flash = section => {
          clearTimeout(this._settingsSavedT);
          this.setState({ settingsSaved: section });
          this._settingsSavedT = setTimeout(() => this.setState({ settingsSaved: '' }), 1400);
        };
        const drafts = st.settingsDrafts || {};
        const valueOf = (field, fallback) => Object.prototype.hasOwnProperty.call(drafts, field) ? drafts[field] : (fallback || '');
        const hold = (field, max) => e => {
          const value = String((e && e.target && e.target.value) || '').slice(0, max);
          this.setState(s => ({ settingsDrafts: { ...(s.settingsDrafts || {}), [field]: value } }));
        };
        // leaving the field keeps what was typed
        const commit = (field, section) => () => this.setState(s => {
          const all = { ...(s.settingsDrafts || {}) };
          if (!Object.prototype.hasOwnProperty.call(all, field)) return {};
          const value = all[field];
          delete all[field];
          if (value === (s[field] || '')) return { settingsDrafts: all };
          setTimeout(() => flash(section), 0);
          return { [field]: value, settingsDrafts: all };
        });
        const currencies = ${JSON.stringify(CURRENCY_LIST)};
        const code = st.currency || 'USD';
        const current = currencies.find(c => c.code === code) || currencies[0];
        const query = String(st.currencyQuery || '').trim().toLowerCase();
        const zone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } })();
        const removedIng = new Set(st.removedIngredientKeys || []);
        const removedPack = new Set(st.removedPackagingKeys || []);
        const hiddenPack = new Set(${JSON.stringify(HIDDEN_PACKAGING)});
        const check = st.marketCheck || null;
        const seen = check && Array.isArray(check.products)
          ? check.products.reduce((s, p) => s + ((p && Array.isArray(p.competitors)) ? p.competitors.length : 0), 0) : 0;
        const tabTo = (screen, extra) => () => this.setState({ screen, stack: [], ...(extra || {}) });
        const stack = Array.isArray(st.stack) ? st.stack : [];
        const email = window.__baketlySignedInEmail || '';
        const who = String(st.ownerName || '').trim() || String(st.bakeryName || '').trim() || (email ? email.split('@')[0] : 'You');
        return {
          setOnGeneral: tab === 'general', setOnAccount: tab === 'account', setOnBilling: tab === 'billing', setOnData: tab === 'data',
          setShowChips: tab !== 'data',
          setChipGeneral: chip(tab === 'general'), setChipAccount: chip(tab === 'account'), setChipBilling: chip(tab === 'billing'),
          setBackLabel: stack[stack.length - 1] === 'dash' || !stack.length ? 'Home' : 'Back',
          setOpenData: () => this.setState({ settingsTab: 'data' }),
          setDataBack: () => this.setState({ settingsTab: 'account' }),
          setSavedYou: st.settingsSaved === 'you' ? '1' : '0',
          setSavedMoney: st.settingsSaved === 'money' ? '1' : '0',
          setSavedReminders: st.settingsSaved === 'reminders' ? '1' : '0',

          setOwnerValue: valueOf('ownerName', st.ownerName),
          setOwnerDraft: hold('ownerName', 60),
          setOwnerCommit: commit('ownerName', 'you'),
          setBakeryValue: valueOf('bakeryName', st.bakeryName),
          setBakeryDraft: hold('bakeryName', 120),
          setBakeryCommit: commit('bakeryName', 'you'),
          setWhereValue: valueOf('bakeryLocation', st.bakeryLocation),
          // where you sell suggests places as it is typed, as it always has
          setWhereDraft: e => {
            const value = String((e && e.target && e.target.value) || '').slice(0, 160);
            this.setState(s => ({ settingsDrafts: { ...(s.settingsDrafts || {}), bakeryLocation: value } }));
            if (this.__baketlyPlaceTimer) window.clearTimeout(this.__baketlyPlaceTimer);
            this.__baketlyPlaceTimer = window.setTimeout(() => {
              const q = String(((this.state.settingsDrafts || {}).bakeryLocation) || '').trim();
              if (q.length < 3) { this.setState({ locationSuggestions: [] }); return; }
              window.__baketlySuggestPlaces(q).then(places => {
                if (String(((this.state.settingsDrafts || {}).bakeryLocation) || '').trim() === q) this.setState({ locationSuggestions: places });
              });
            }, 400);
          },
          setWhereCommit: commit('bakeryLocation', 'you'),
          setWhereSuggestions: (Array.isArray(st.locationSuggestions) ? st.locationSuggestions : []).map(place => ({
            place,
            choose: () => {
              this.setState(s => { const all = { ...(s.settingsDrafts || {}) }; delete all.bakeryLocation; return { bakeryLocation: place, locationSuggestions: [], settingsDrafts: all }; });
              flash('you');
            }
          })),
          setHasWhereSuggestions: Array.isArray(st.locationSuggestions) && st.locationSuggestions.length > 0,
          setRateCommit: () => flash('money'),

          setCurrencyName: current.name + ' \\u00b7 ' + current.symbol,
          setCurrencyCode: current.code,
          setCurrencyOpen: st.currencySheetOpen === true,
          openCurrencySheet: () => this.setState({ currencySheetOpen: true, currencyQuery: '' }),
          closeCurrencySheet: e => { if (!e || e.target === e.currentTarget) this.setState({ currencySheetOpen: false }); },
          dismissCurrencySheet: () => this.setState({ currencySheetOpen: false }),
          currencyQuery: String(st.currencyQuery || ''),
          setCurrencyQuery: e => this.setState({ currencyQuery: String((e && e.target && e.target.value) || '').slice(0, 30) }),
          currencyRows: currencies
            .filter(c => !query || c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query) || c.symbol.toLowerCase() === query)
            .map((c, i) => ({
              ...c,
              on: c.code === code, off: c.code !== code,
              color: c.code === code ? '${OLIVE_700}' : '${INK}',
              weight: c.code === code ? '600' : '500',
              symbolSize: c.symbol.length > 2 ? '11px' : '14px',
              sep: i ? '1px solid ${HAIRLINE}' : '0',
              pick: () => { this.setState({ currency: c.code, currencySheetOpen: false }); flash('money'); }
            })),
          currencyNoMatch: !currencies.some(c => !query || c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query) || c.symbol.toLowerCase() === query),

          setZoneCity: 'times in ' + (zone.split('/').pop() || zone).replace(/_/g, ' '),
          setGroupsMeta: (() => { const n = this.recipeGroupList().length; return n + (n === 1 ? ' group' : ' groups'); })(),

          setAvatar: who.slice(0, 1).toUpperCase(),
          setWho: who,
          setEmail: email,
          setDataRows: [
            { label: 'Ingredients', count: Object.keys(st.ingredientRecords || {}).filter(k => !removedIng.has(k)).length, open: tabTo('ingredients', { pantryTab: 'ing' }),
              icon: 'ing' },
            { label: 'Packaging', count: Object.keys(st.packagingRecords || {}).filter(k => !removedPack.has(k) && !hiddenPack.has(k)).length, open: tabTo('ingredients', { pantryTab: 'pack' }), icon: 'pack' },
            { label: 'Recipes', count: (st.recipeRecords || []).length, open: tabTo('ingredients', { pantryTab: 'rec' }), icon: 'rec' },
            { label: 'Events', count: (st.eventRecords || []).length, open: tabTo('markets'), icon: 'ev' },
            { label: 'Sales', count: (st.saleRecords || []).length, open: tabTo('analytics', { analyticsTab: 'overview' }), icon: 'sale' },
            { label: 'Prices you saw nearby', count: seen, open: () => this.setState(s => ({ screen: 'nearby', stack: [...s.stack, s.screen] })), icon: 'near' }
          ].map((r, i) => ({ ...r, count: String(r.count), sep: i ? '1px solid ${HAIRLINE}' : '0',
            isIng: r.icon === 'ing', isPack: r.icon === 'pack', isRec: r.icon === 'rec', isEv: r.icon === 'ev', isSale: r.icon === 'sale', isNear: r.icon === 'near' }))
        };
      })(),
`;

function addBindings(template: string): string {
  const anchor = /([ \t]*)onAnalytics:\s*screen\s*===\s*'analytics',/;
  if (!anchor.test(template)) throw new Error(`${LABEL_}: missing controller anchor`);
  return template.replace(anchor, (_m, indent: string) => `${bindings}${indent}onAnalytics: screen === 'analytics',`);
}

/* ----------------------------------------------------------------- pieces */

const head = (title: string, right = "") =>
  '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:0 2px">' +
  `<h6 style="margin:0;font-size:15px;font-weight:700;line-height:1.3">${title}</h6>${right}</div>`;
const saved = (opacity: string) =>
  `<span style="font-size:12px;font-weight:600;color:${OLIVE_700};opacity:{{ ${opacity} }};transition:opacity 200ms">Saved</span>`;
const meta = (text: string) => `<span style="font-size:12px;color:${MUTED}">${text}</span>`;
const section = (title: string, right: string, body: string) =>
  `<div style="display:flex;flex-direction:column;gap:10px">${head(title, right)}${body}</div>`;
const rowsCard = (body: string) =>
  `<div style="background:${SURFACE};border-radius:${R_CARD};padding:0 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column">${body}</div>`;
const padCard = (body: string, extra = "") =>
  `<div style="background:${SURFACE};border-radius:${R_CARD};padding:16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column;gap:12px;${extra}">${body}</div>`;
const LABEL_COL = `flex:none;width:112px;font-size:12px;color:${LABEL}`;

/** A row that is the field: the whole row is its label, so a tap anywhere puts the caret in it. */
const fieldRow = (label: string, value: string, onChange: string, onBlur: string, placeholder: string, first: boolean, extra = "") =>
  `<label style="display:flex;align-items:center;gap:12px;min-height:50px;cursor:text${first ? "" : `;border-top:1px solid ${HAIRLINE}`}">` +
  `<span style="${LABEL_COL}">${label}</span>` +
  `<input type="text" value="{{ ${value} }}" sc-camel-on-change="{{ ${onChange} }}" sc-camel-on-blur="{{ ${onBlur} }}" placeholder="${placeholder}" aria-label="${label}" ${extra}` +
  `style="flex:1;min-width:0;height:36px;border:0;outline:none;background:none;padding:0;color:${INK};font-family:inherit;font-size:14px;font-weight:500;text-align:right">` +
  `<span style="flex:none;color:${HANDLE};display:grid">${PENCIL}</span></label>`;

const toggle = (on: string, onTap: string, label: string) =>
  `<button type="button" role="switch" aria-checked="{{ ${on} }}" aria-label="${label}" sc-camel-on-click="{{ ${onTap} }}" style="flex:none;width:44px;height:26px;border-radius:999px;border:0;background:{{ ${on}Bg }};position:relative;cursor:pointer;padding:0">` +
  `<span style="position:absolute;top:3px;left:{{ ${on}Left }};width:20px;height:20px;border-radius:50%;background:${SURFACE};box-shadow:0 1px 3px rgba(60,55,30,.2);transition:left 160ms ease"></span></button>`;

/** A reminder: its time as a chip beside the toggle while it is on. */
const reminder = (title: string, sub: string, on: string, onTap: string, time: string, setTime: string, first: boolean) =>
  `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;min-height:60px;box-sizing:border-box${first ? "" : `;border-top:1px solid ${HAIRLINE}`}">` +
  `<div style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500;line-height:1.3">${title}</span><span style="font-size:12px;color:${MUTED};line-height:1.4">${sub}</span></div>` +
  `<sc-if value="{{ ${on} }}" hint-placeholder-val="{{ true }}">` +
  `<label style="position:relative;flex:none;display:flex;align-items:center;gap:4px;height:30px;padding:0 10px;border-radius:10px;background:${OLIVE_SOFT};color:${OLIVE_700};font-size:12px;font-weight:600;cursor:pointer;${TNUM}">{{ ${time} }}${DOWN}` +
  `<select value="{{ ${time} }}" data-bk-value="{{ ${time} }}" data-bk-options="{{ reminderTimesJson }}" sc-camel-on-change="{{ ${setTime} }}" aria-label="Time for: ${title}" style="position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;font-size:16px"></select></label>` +
  "</sc-if>" +
  toggle(on, onTap, title) +
  "</div>";

const chipButton = (onTap: string, chip: string, label: string, icon: string) =>
  `<button type="button" sc-camel-on-click="{{ ${onTap} }}" style="display:flex;align-items:center;gap:8px;height:40px;padding:0 14px 0 6px;border-radius:999px;background:{{ ${chip}.bg }};color:{{ ${chip}.fg }};border:1px solid {{ ${chip}.edge }};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">` +
  `<span style="width:28px;height:28px;border-radius:50%;background:{{ ${chip}.dot }};color:{{ ${chip}.dotFg }};display:grid;place-items:center">${svg(15, icon)}</span>${label}</button>`;

const backButton = (onTap: string, label: string) =>
  `<button type="button" sc-camel-on-click="{{ ${onTap} }}" style="display:flex;align-items:center;gap:4px;min-height:44px;margin-left:-4px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:${OLIVE_700}">${svg(16, '<path d="M15 6l-6 6 6 6"></path>')}${label}</button>`;

/* ----------------------------------------------------------------- general */

const general =
  section(
    "You and your bakery",
    saved("setSavedYou"),
    rowsCard(
      fieldRow("Your name", "setOwnerValue", "setOwnerDraft", "setOwnerCommit", "what Baketly calls you", true) +
        fieldRow("Bakery name", "setBakeryValue", "setBakeryDraft", "setBakeryCommit", "e.g. Base Street Bakes", false) +
        fieldRow("Where you sell", "setWhereValue", "setWhereDraft", "setWhereCommit", "a town or address", false, 'autocomplete="off" ') +
        '<sc-if value="{{ setHasWhereSuggestions }}" hint-placeholder-val="{{ false }}">' +
        `<div style="display:flex;flex-direction:column;margin:0 -16px;border-top:1px solid ${HAIRLINE}">` +
        '<sc-for list="{{ setWhereSuggestions }}" as="hit" hint-placeholder-count="2">' +
        // a press, so it lands before the field's blur moves anything
        `<button type="button" sc-camel-on-pointer-down="{{ hit.choose }}" style="display:block;width:100%;text-align:left;padding:11px 16px;border:0;border-bottom:1px solid ${HAIRLINE};background:#fdfbf7;cursor:pointer;font-family:inherit;font-size:13px;color:${INK}">{{ hit.place }}</button>` +
        "</sc-for></div></sc-if>",
    ),
  ) +
  section(
    "Money",
    saved("setSavedMoney"),
    rowsCard(
      '<div style="display:flex;align-items:center;gap:12px;min-height:50px">' +
        `<span style="${LABEL_COL}">Currency</span>` +
        `<button type="button" sc-camel-on-click="{{ openCurrencySheet }}" aria-label="Currency: {{ setCurrencyName }}" style="flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:8px;height:36px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;color:${INK}">` +
        '<span style="font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ setCurrencyName }}</span>' +
        `<span style="flex:none;display:flex;align-items:center;gap:4px;font-size:12px;color:${MUTED}">{{ setCurrencyCode }}${DOWN}</span></button></div>` +
        `<label style="display:flex;align-items:center;gap:12px;min-height:50px;border-top:1px solid ${HAIRLINE};cursor:text">` +
        `<span style="${LABEL_COL}">My hourly rate</span>` +
        `<span style="flex:1"></span><span style="font-size:14px;color:${MUTED}">{{ currencySymbol }}</span>` +
        `<input type="text" inputmode="decimal" value="{{ hourlyRateText }}" sc-camel-on-change="{{ setHourlyRate }}" sc-camel-on-blur="{{ setRateCommit }}" placeholder="per hour" aria-label="My hourly rate" ` +
        `style="flex:none;width:90px;height:36px;border:0;outline:none;background:none;padding:0;color:${INK};font-family:inherit;font-size:14px;font-weight:500;text-align:right;${TNUM}"></label>` +
        `<div style="font-size:12px;color:${MUTED};padding:0 0 12px;margin-top:-6px">Set a rate and every recipe shows profit after your time, not just ingredients.</div>`,
    ),
  ) +
  section(
    "Reminders",
    meta("{{ setZoneCity }}"),
    rowsCard(
      reminder("What's on today's list", "A morning nudge on days that have to-dos", "remindTodos", "toggleRemindTodos", "todosAt", "setTodosAt", true) +
        reminder("An event tomorrow", "The evening before, with what there is to bake", "remindMarket", "toggleRemindMarket", "marketAt", "setMarketAt", false) +
        reminder("The shopping for an event", "Two days before, while there is time to buy", "remindShopping", "toggleRemindShopping", "shoppingAt", "setShoppingAt", false),
    ),
  ) +
  section(
    "Recipe groups",
    meta("{{ setGroupsMeta }}"),
    padCard(
      '<sc-if value="{{ settingsHasNoGroups }}" hint-placeholder-val="{{ false }}">' +
        `<div style="font-size:13px;color:${MUTED}">No groups yet.</div></sc-if>` +
        '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
        '<sc-for list="{{ settingsGroups }}" as="sg" hint-placeholder-count="4">' +
        `<span style="display:flex;align-items:center;gap:6px;height:32px;padding:0 6px 0 12px;border-radius:999px;background:${OLIVE_SOFT};color:${OLIVE_700};font-size:12px;font-weight:600">{{ sg.name }}` +
        `<button type="button" sc-camel-on-click="{{ sg.remove }}" aria-label="Remove {{ sg.name }}" style="width:22px;height:22px;border-radius:50%;border:0;background:none;color:${OLIVE_700};font-family:inherit;font-size:16px;line-height:1;cursor:pointer;padding:0">×</button></span>` +
        "</sc-for></div>" +
        '<div style="display:flex;align-items:center;gap:8px">' +
        `<input type="text" value="{{ groupDraft }}" sc-camel-on-change="{{ setGroupDraft }}" placeholder="New group, e.g. Pies" aria-label="New group name" style="flex:1;min-width:0;height:40px;padding:0 14px;border:1px solid ${BORDER};border-radius:${R_BUTTON};background:${SURFACE};color:${INK};font-family:inherit;font-size:13px;outline:none;box-sizing:border-box">` +
        `<button type="button" sc-camel-on-click="{{ addGroup }}" style="flex:none;height:40px;padding:0 14px;border:1px solid ${BORDER};border-radius:${R_BUTTON};background:${SURFACE};color:${OLIVE_700};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">Add</button></div>` +
        `<div style="font-size:12px;color:${MUTED}">Removing a group moves its recipes to No group.</div>`,
      "padding:14px 16px",
    ),
  );

/* ----------------------------------------------------------------- account */

const outlineButton = (onTap: string, label: string, color = INK, extra = "") =>
  `<button type="button" sc-camel-on-click="{{ ${onTap} }}" style="flex:none;height:40px;padding:0 14px;border:1px solid ${BORDER};border-radius:${R_BUTTON};background:${SURFACE};color:${color};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;${extra}">${label}</button>`;

const account =
  '<sc-if value="{{ signedIn }}" hint-placeholder-val="{{ true }}">' +
  section(
    "Signed in",
    "",
    `<div style="background:${SURFACE};border-radius:${R_CARD};padding:16px;box-shadow:${CARD_SHADOW};display:flex;align-items:center;gap:14px">` +
      `<div style="flex:none;width:48px;height:48px;border-radius:50%;background:${OLIVE_SOFT};color:${OLIVE_700};display:grid;place-items:center;font-size:18px;font-weight:600">{{ setAvatar }}</div>` +
      '<div style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:600;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ setWho }}</span>' +
      `<span style="font-size:12px;color:${MUTED};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ setEmail }}</span></div>` +
      outlineButton("signOutNow", "Sign out") +
      "</div>",
  ) +
  "</sc-if>" +
  '<sc-if value="{{ signedOut }}" hint-placeholder-val="{{ false }}">' +
  padCard(`<div style="font-size:13px;line-height:1.55;color:${LABEL}">You are not signed in, so nothing is being saved to your account on this device.</div>`) +
  "</sc-if>" +
  section(
    "Your data",
    "",
    rowsCard(
      `<button type="button" sc-camel-on-click="{{ setOpenData }}" style="display:flex;align-items:center;gap:12px;min-height:52px;border:0;background:none;padding:10px 0;cursor:pointer;font-family:inherit;text-align:left;color:${INK}">` +
        '<div style="flex:1;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500;line-height:1.3">What Baketly keeps</span>' +
        `<span style="font-size:12px;color:${MUTED}">Recipes, ingredients, packaging, sales, events and prices</span></div>${CHEVRON}</button>`,
    ),
  ) +
  '<sc-if value="{{ signedIn }}" hint-placeholder-val="{{ true }}">' +
  section(
    "Delete account",
    "",
    padCard(
      `<div style="font-size:13px;line-height:1.55;color:${LABEL}">Removes your account and everything in it. This cannot be undone.</div>` +
        outlineButton("askDeleteAccount", "Delete my account", DANGER, "align-self:flex-start"),
    ),
  ) +
  "</sc-if>";

/* ----------------------------------------------------------------- billing */

const billing =
  `<div style="background:${SURFACE};border-radius:${R_CARD};padding:18px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column;gap:6px">` +
  `<span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${GOLD}">Your plan</span>` +
  '<span style="font-size:20px;font-weight:600;line-height:1.3">Free while Baketly is being built</span>' +
  `<span style="font-size:13px;line-height:1.55;color:${LABEL}">Nothing to bill yet. Anything that changes will show up here first, before it changes anywhere else.</span></div>` +
  section(
    "Receipts",
    "",
    `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:28px 16px;border:1.5px dashed ${BORDER};border-radius:${R_CARD};color:${MUTED};text-align:center">` +
      `${svg(22, RECEIPT)}<span style="font-size:13px">No receipts yet</span></div>`,
  );

/* -------------------------------------------------------------------- data */

const DATA_ICONS: Array<[string, string]> = [
  ["isIng", '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"></path><path d="M3 8l9 5 9-5"></path>'],
  ["isPack", '<rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M3 11h18M12 7v13"></path>'],
  ["isRec", '<path d="M6 3h9l4 4v14H6z"></path><path d="M9 12h7M9 16h5"></path>'],
  ["isEv", '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path>'],
  ["isSale", '<path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H3z"></path><path d="M3 8h17a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><path d="M16 14h2"></path>'],
  ["isNear", '<circle cx="12" cy="10" r="3"></circle><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"></path>'],
];

const data =
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
  backButton("setDataBack", "Account") +
  `<span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${GOLD}">Your data</span>` +
  '<span style="width:64px"></span></div>' +
  '<h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25">What Baketly keeps</h1>' +
  `<div style="font-size:13px;line-height:1.6;color:${LABEL};margin-top:-6px">Everything you've typed or sold, so your costs and events add up. Stored in your account and synced to this phone.</div>` +
  section(
    "In your account",
    meta("tap to open"),
    rowsCard(
      '<sc-for list="{{ setDataRows }}" as="d" hint-placeholder-count="6">' +
        `<button type="button" sc-camel-on-click="{{ d.open }}" style="display:flex;align-items:center;gap:12px;min-height:56px;border:0;border-top:{{ d.sep }};background:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;color:${INK}">` +
        `<span style="flex:none;width:36px;height:36px;border-radius:10px;background:${OLIVE_SOFT};color:${OLIVE_700};display:grid;place-items:center">` +
        DATA_ICONS.map(([flag, paths]) => `<sc-if value="{{ d.${flag} }}" hint-placeholder-val="{{ false }}">${svg(18, paths)}</sc-if>`).join("") +
        "</span>" +
        '<span style="flex:1;font-size:14px;font-weight:500">{{ d.label }}</span>' +
        `<span style="font-size:13px;font-weight:600;${TNUM}">{{ d.count }}</span>${CHEVRON}</button>` +
        "</sc-for>",
    ),
  ) +
  section(
    "Not kept",
    "",
    `<div style="background:${SURFACE};border-radius:${R_CARD};padding:14px 16px;box-shadow:${CARD_SHADOW};font-size:13px;line-height:1.6;color:${LABEL}">Photos of labels you scan are read once and thrown away. Baketly doesn't keep your location, only the town you typed in Settings.</div>`,
  ) +
  '<sc-if value="{{ signedIn }}" hint-placeholder-val="{{ true }}">' +
  `<button type="button" sc-camel-on-click="{{ askDeleteAccount }}" style="display:flex;align-items:center;justify-content:center;height:48px;border:1px solid ${BORDER};border-radius:${R_BUTTON};background:${SURFACE};color:${DANGER};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">Delete everything with my account</button></sc-if>`;

/* ----------------------------------------------------------- currency sheet */

/** Also opened from the last step of onboarding (onboarding-screen-template.ts). */
export const currencySheet =
  '<sc-if value="{{ setCurrencyOpen }}" hint-placeholder-val="{{ false }}">' +
  `<div sc-camel-on-click="{{ closeCurrencySheet }}" style="position:fixed;inset:0;z-index:40;background:rgba(250,246,240,.45)">` +
  sheet({
    title: "Currency",
    sub: "Every price and cost shows in it",
    label: "Choose a currency",
    height: "min(640px, 88vh)",
    onClose: "{{ dismissCurrencySheet }}",
    body:
      `<label style="flex:none;display:flex;align-items:center;gap:10px;height:48px;padding:0 16px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};cursor:text;box-sizing:border-box">` +
      svg(18, SEARCH).replace('stroke="currentColor"', `stroke="${MUTED}"`) +
      `<input type="search" value="{{ currencyQuery }}" sc-camel-on-change="{{ setCurrencyQuery }}" placeholder="Search currencies" aria-label="Search currencies" style="flex:1;min-width:0;border:0;outline:none;background:none;font-family:inherit;font-size:14px;color:${INK}"></label>` +
      `<div style="flex:1;min-height:0;overflow:auto;background:${SURFACE};border-radius:${R_CARD};padding:0 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column">` +
      '<sc-for list="{{ currencyRows }}" as="c" hint-placeholder-count="8">' +
      `<button type="button" sc-camel-on-click="{{ c.pick }}" aria-pressed="{{ c.on }}" style="flex:none;display:flex;align-items:center;gap:12px;min-height:50px;border:0;border-top:{{ c.sep }};background:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;color:{{ c.color }}">` +
      `<span style="flex:none;width:36px;height:36px;border-radius:10px;background:${OLIVE_SOFT};color:${OLIVE_700};display:grid;place-items:center;font-size:{{ c.symbolSize }};font-weight:600">{{ c.symbol }}</span>` +
      '<span style="flex:1;font-size:14px;font-weight:{{ c.weight }}">{{ c.name }}</span>' +
      `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ c.code }}</span>` +
      `<sc-if value="{{ c.on }}" hint-placeholder-val="{{ false }}"><span style="flex:none;color:${OLIVE_700};display:grid">${svg(16, CHECK, "2")}</span></sc-if>` +
      "</button></sc-for>" +
      `<sc-if value="{{ currencyNoMatch }}" hint-placeholder-val="{{ false }}"><div style="padding:16px 0;font-size:13px;color:${MUTED};text-align:center">No currency matches that.</div></sc-if>` +
      "</div>" +
      `<div style="flex:none;padding:0 0 max(30px, env(safe-area-inset-bottom));font-size:12px;color:${MUTED};text-align:center">Changing it doesn't convert anything — your numbers stay as typed.</div>`,
  }) +
  "</div></sc-if>";

/* ----------------------------------------------------------------- screen */

function restyle(template: string): string {
  const block = scBlock(template, '<sc-if value="{{ onSettings }}" hint-placeholder-val="{{ false }}">', `${LABEL_} block`);
  const inner = template.slice(block.innerStart, block.innerEnd);
  // the confirmation keeps its own markup; it is drawn outside the tabs now,
  // so the data page's button can open it too
  const dialog = scBlock(inner, '<sc-if value="{{ accountDeleteOpen }}" hint-placeholder-val="{{ false }}">', `${LABEL_} delete dialog`);
  const screen =
    '<div style="padding:14px 20px 32px;display:flex;flex-direction:column;gap:16px">' +
    '<sc-if value="{{ setShowChips }}" hint-placeholder-val="{{ true }}">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
    backButton("back", "{{ setBackLabel }}") +
    "</div>" +
    '<h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25">Settings</h1>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
    chipButton("pickGeneral", "setChipGeneral", "General", GEAR) +
    chipButton("pickAccount", "setChipAccount", "Account", PERSON) +
    chipButton("pickBilling", "setChipBilling", "Billing", CARD_ICON) +
    "</div></sc-if>" +
    `<sc-if value="{{ setOnGeneral }}" hint-placeholder-val="{{ true }}">${general}</sc-if>` +
    `<sc-if value="{{ setOnAccount }}" hint-placeholder-val="{{ false }}">${account}</sc-if>` +
    `<sc-if value="{{ setOnBilling }}" hint-placeholder-val="{{ false }}">${billing}</sc-if>` +
    `<sc-if value="{{ setOnData }}" hint-placeholder-val="{{ false }}">${data}</sc-if>` +
    "</div>" +
    currencySheet +
    inner.slice(dialog.start, dialog.end);
  return template.slice(0, block.innerStart) + screen + template.slice(block.innerEnd);
}

/** The reminders' toggles, positioned for the design's switch. */
function switchBindings(template: string): string {
  let out = template;
  for (const name of ["Todos", "Market", "Shopping"]) {
    const flag = name === "Todos" ? "todosDaily" : name === "Market" ? "marketEve" : "shoppingList";
    // the old colour binding gives way to the one below
    out = swapOnce(out, `          remind${name}Bg: reminders.`, `          remind${name}OldBg: reminders.`, `${LABEL_} ${name} old colour`);
    out = swapOnce(
      out,
      `          remind${name}Knob: `,
      `          remind${name}Left: reminders.${flag} ? '21px' : '3px',\n` +
        `          remind${name}Bg: reminders.${flag} ? '${OLIVE}' : '${BORDER}',\n` +
        `          remind${name}Knob: `,
      `${LABEL_} ${name} switch`,
    );
  }
  return out;
}

export function applySettingsScreenBehavior(template: string): string {
  return restyle(switchBindings(addBindings(template)));
}

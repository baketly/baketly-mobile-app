// Ask Baketly, in the new design.
//
// design/mobile-redesign/screens/AskBaketly.dc.html: what the baker asked in
// olive bubbles on the right; what Baketly answered on white cards on the
// left, under its name, with the line saying what the answer was read from;
// a change it proposes as a card with its own button and Not now; follow-up
// questions as chips above the composer; and the composer itself -- the box,
// the mic, and send. A pencil starts the conversation over. The screen has no
// tab bar, as the design has none; the back button and the edge swipe leave it.
//
// The conversation is the chat controller's (chat-template.ts and
// ask-baketly.ts): sending, listening, the cards and the questions they ask
// first are unchanged. The follow-ups were already worked out after every
// answer and never drawn; they are the chips now. The box keeps
// data-bk-chatbox and the bubbles data-bk-bubble, which chat-grow.ts and
// chat-pop.ts use to size the box and bring new messages in.

import {
  BG, BORDER, CARD_SHADOW, DANGER, GOLD, INK, MUTED, OLIVE, OLIVE_700, OLIVE_DIM, OLIVE_SOFT, R_BUTTON, R_FIELD, SURFACE,
} from "./design/tokens";
import { scBlock, swapOnce } from "./template-blocks";

const LABEL_ = "Ask Baketly screen";

const svg = (size: number, paths: string, width = "1.75") =>
  `<svg width="${size}" height="${size}" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const SPARKLE = '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"></path>';
const PENCIL = '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path>';
const MIC = '<rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3"></path>';
const UP = '<path d="M12 19V5M5 12l7-7 7 7"></path>';

/* ------------------------------------------------------------- controller */

/** In the chat controller's return: send, followUps, pending, stopListening. */
const bindings = `          chatChips: pending ? [] : followUps.slice(0, 3).map(q => ({ label: q, ask: () => send(q) })),
          chatHasChips: !pending && followUps.length > 0,
          // a fresh conversation, as the app starts each session with
          newChat: () => {
            if (pending) return;
            stopListening();
            this.setState({ chatMsgs: [], chatActions: [], chatFollowUps: [], chatLastTools: [], chatFailed: '', chatError: '', chatDraft: '', chatListening: false });
          },
          newChatOpacity: pending ? '0.45' : '1',
          chatMicBg: this.state.chatListening === true ? '${OLIVE}' : '${SURFACE}',
          chatMicFg: this.state.chatListening === true ? '${SURFACE}' : '${OLIVE_700}',
          chatMicEdge: this.state.chatListening === true ? '${OLIVE}' : '${BORDER}',
          chatDraft: this.state.chatDraft || '',
`;

/** Each message says whose it is, for the two ways of drawing one. */
const whose = `            align: m.who === 'u' ? 'flex-end' : 'flex-start',
            mine: m.who === 'u',
            theirs: m.who !== 'u',
`;

function addBindings(template: string): string {
  let out = swapOnce(template, "          chatDraft: this.state.chatDraft || '',\n", bindings, `${LABEL_} bindings`);
  out = swapOnce(out, "            align: m.who === 'u' ? 'flex-end' : 'flex-start',\n", whose, `${LABEL_} whose`);
  // the design has no tab bar here, nor on the contact form
  return swapOnce(
    out,
    "tabsVisible: !screen.startsWith('ob'),",
    "tabsVisible: !screen.startsWith('ob') && screen !== 'chat' && screen !== 'contact',",
    `${LABEL_} tab bar`,
  );
}

/* ----------------------------------------------------------------- screen */

const card = (key: string, inner: string) =>
  `<div data-bk-bubble="{{ ${key} }}" style="align-self:flex-start;max-width:86%;border:1px solid ${OLIVE_DIM};border-radius:20px 20px 20px 6px;padding:12px 16px;background:${SURFACE};display:flex;flex-direction:column;gap:10px">${inner}</div>`;

const primary = (onTap: string, label: string) =>
  `<button type="button" sc-camel-on-click="{{ ${onTap} }}" style="display:flex;align-items:center;justify-content:center;height:40px;padding:0 18px;border:0;border-radius:${R_BUTTON};background:${OLIVE};color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">${label}</button>`;
const secondary = (onTap: string, label: string) =>
  `<button type="button" sc-camel-on-click="{{ ${onTap} }}" style="height:40px;padding:0 14px;border:1px solid ${BORDER};border-radius:${R_BUTTON};background:${SURFACE};color:${INK};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">${label}</button>`;

const messages =
  '<sc-for list="{{ chatMsgs }}" as="msg" hint-placeholder-count="2">' +
  // what the baker asked
  '<sc-if value="{{ msg.mine }}" hint-placeholder-val="{{ false }}">' +
  `<div data-bk-bubble="{{ msg.key }}" style="align-self:flex-end;max-width:80%;background:${OLIVE};color:${SURFACE};border-radius:20px 20px 6px 20px;padding:12px 16px;font-size:14px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere">{{ msg.text }}</div>` +
  "</sc-if>" +
  // and what Baketly answered
  '<sc-if value="{{ msg.theirs }}" hint-placeholder-val="{{ true }}">' +
  '<div data-bk-bubble="{{ msg.key }}" style="align-self:flex-start;max-width:86%;display:flex;flex-direction:column;gap:6px">' +
  `<div style="display:flex;align-items:center;gap:6px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${OLIVE}">${svg(12, SPARKLE)}Baketly</div>` +
  `<div style="background:${SURFACE};border-radius:20px 20px 20px 6px;padding:12px 16px;box-shadow:${CARD_SHADOW};font-size:14px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere">{{ msg.text }}</div>` +
  `<sc-if value="{{ msg.hasSources }}" hint-placeholder-val="{{ false }}"><span style="font-size:11px;color:${MUTED}">{{ msg.sourceLine }}</span></sc-if>` +
  "</div></sc-if>" +
  "</sc-for>" +
  // a change waiting on the baker
  '<sc-for list="{{ chatActions }}" as="act" hint-placeholder-count="0">' +
  card(
    "act.key",
    '<div style="font-size:14px;line-height:1.5">{{ act.summary }}</div>' +
      `<div style="display:flex;gap:8px;flex-wrap:wrap">${primary("act.confirm", "{{ act.label }}")}${secondary("act.dismiss", "Not now")}</div>`,
  ) +
  "</sc-for>" +
  // and the question it asks first
  '<sc-if value="{{ chatAsking }}" hint-placeholder-val="{{ false }}">' +
  card(
    "chatAskKey",
    '<div style="font-size:14px;line-height:1.5">{{ chatAskingFor }}</div>' +
      '<div style="font-size:14px;line-height:1.5;font-weight:600">{{ chatQuestion }}</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
      '<sc-for list="{{ chatOptions }}" as="opt" hint-placeholder-count="0">' +
      `<button type="button" sc-camel-on-click="{{ opt.pick }}" style="height:36px;padding:0 14px;border:1px solid ${OLIVE_DIM};border-radius:999px;background:${SURFACE};color:${OLIVE_700};font-family:inherit;font-size:12px;font-weight:600;cursor:pointer">{{ opt.name }}</button>` +
      "</sc-for></div>" +
      `<button type="button" sc-camel-on-click="{{ skipChoice }}" style="align-self:flex-start;min-height:32px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:${MUTED}">{{ skipChoiceLabel }}</button>`,
  ) +
  "</sc-if>" +
  '<sc-if value="{{ chatPending }}" hint-placeholder-val="{{ false }}">' +
  `<div style="align-self:flex-start;display:flex;align-items:center;gap:8px;font-size:12px;color:${MUTED}"><span class="bk-spinner" aria-hidden="true"></span>Baketly is reading your numbers…</div></sc-if>` +
  `<sc-if value="{{ chatError }}" hint-placeholder-val=""><div style="font-size:12px;color:${DANGER}">{{ chatError }}</div></sc-if>` +
  '<sc-if value="{{ canRetry }}" hint-placeholder-val="{{ false }}">' +
  `<div style="align-self:flex-start">${secondary("retryAsk", "Ask that again")}</div></sc-if>`;

const composer =
  `<div style="position:sticky;bottom:0;z-index:5;margin-top:auto;padding:10px 20px calc(env(safe-area-inset-bottom, 0px) + 16px);display:flex;flex-direction:column;gap:10px;background:${BG}">` +
  '<sc-if value="{{ chatListening }}" hint-placeholder-val="{{ false }}">' +
  `<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:${OLIVE_700}"><span style="width:8px;height:8px;border-radius:50%;background:${OLIVE};flex:none"></span>Listening — say what you need, then tap send.</div></sc-if>` +
  '<sc-if value="{{ chatHasChips }}" hint-placeholder-val="{{ true }}">' +
  '<div style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -20px;padding:0 20px">' +
  '<sc-for list="{{ chatChips }}" as="c" hint-placeholder-count="3">' +
  `<button type="button" sc-camel-on-click="{{ c.ask }}" style="height:32px;padding:0 12px;flex:none;border:1px solid ${OLIVE_DIM};border-radius:999px;background:${SURFACE};color:${OLIVE_700};font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap">{{ c.label }}</button>` +
  "</sc-for></div></sc-if>" +
  '<div style="display:flex;align-items:flex-end;gap:8px">' +
  `<label style="flex:1;min-width:0;display:flex;align-items:center;min-height:48px;padding:0 16px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};cursor:text;box-sizing:border-box">` +
  `<textarea data-bk-chatbox="1" value="{{ chatDraft }}" sc-camel-on-change="{{ setChatDraft }}" rows="1" maxlength="500" placeholder="Ask about your bakery…" aria-label="Ask about your bakery" style="flex:1;min-width:0;border:0;outline:none;background:none;resize:none;overflow-y:auto;max-height:124px;font-family:inherit;font-size:14px;line-height:1.5;color:${INK};padding:12px 0"></textarea></label>` +
  `<button type="button" sc-camel-on-click="{{ toggleVoice }}" aria-label="{{ voiceLabel }}" style="flex:none;width:48px;height:48px;border-radius:${R_BUTTON};border:1px solid {{ chatMicEdge }};background:{{ chatMicBg }};color:{{ chatMicFg }};display:grid;place-items:center;cursor:pointer;padding:0">${svg(20, MIC)}</button>` +
  `<button type="button" sc-camel-on-click="{{ sendChat }}" aria-label="Send" style="flex:none;width:48px;height:48px;border-radius:${R_BUTTON};border:0;background:${OLIVE};color:${SURFACE};display:grid;place-items:center;cursor:pointer;padding:0">${svg(20, UP, "2")}</button>` +
  "</div></div>";

const screen =
  '<div style="display:flex;flex-direction:column;min-height:100%;box-sizing:border-box">' +
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px 0">' +
  `<button type="button" sc-camel-on-click="{{ back }}" style="display:flex;align-items:center;gap:4px;min-height:44px;margin-left:-4px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:${OLIVE_700}">${svg(16, '<path d="M15 6l-6 6 6 6"></path>')}Back</button>` +
  `<span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${GOLD}">Ask Baketly</span>` +
  `<button type="button" sc-camel-on-click="{{ newChat }}" aria-label="Start a new chat" style="width:40px;height:40px;border-radius:50%;border:0;background:${SURFACE};color:${INK};display:grid;place-items:center;cursor:pointer;padding:0;opacity:{{ newChatOpacity }}">${svg(16, PENCIL)}</button>` +
  "</div>" +
  '<div style="flex:1 0 auto;padding:16px 20px 12px;display:flex;flex-direction:column;gap:14px">' +
  `<div style="align-self:center;font-size:11px;color:${MUTED}">Today</div>` +
  messages +
  "</div>" +
  composer +
  "</div>";

function restyle(template: string): string {
  const block = scBlock(template, '<sc-if value="{{ onChat }}" hint-placeholder-val="{{ false }}">', `${LABEL_} block`);
  return template.slice(0, block.innerStart) + screen + template.slice(block.innerEnd);
}

export function applyAskBaketlyScreenBehavior(template: string): string {
  return restyle(addBindings(template));
}

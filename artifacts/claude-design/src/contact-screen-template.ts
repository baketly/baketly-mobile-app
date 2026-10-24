// Writing to the person who makes Baketly, in the new design.
//
// design/mobile-redesign/screens/Contact.dc.html: what it is about as four
// chips rather than a select, the subject, a tall message box, and a dock with
// who the reply goes to and Send message. Sending, and the four topics, are
// contact-template.ts's; this draws them.
//
// The reply line is true only when someone is signed in: the server keeps the
// message with the account's email and answers there. Signed out, the dock
// gives the address to write to instead.

import { BORDER, DANGER, GOLD, INK, LABEL, MUTED, OLIVE, OLIVE_700, R_BUTTON, R_FIELD, SURFACE } from "./design/tokens";
import { TOPICS } from "./contact-template";
import { scBlock, swapOnce } from "./template-blocks";

const LABEL_ = "Contact screen";

const svg = (size: number, paths: string, width = "1.75") =>
  `<svg width="${size}" height="${size}" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ENVELOPE = '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 7l9 6 9-6"></path>';

const bindings = `      contactTopics: ${JSON.stringify(TOPICS)}.map(t => {
        const on = (this.state.contactTopic || 'suggestion') === t.value;
        return { label: t.label, on, bg: on ? '${OLIVE}' : '${SURFACE}', fg: on ? '${SURFACE}' : '${INK}', edge: on ? '${OLIVE}' : '${BORDER}',
          pick: () => this.setState({ contactTopic: t.value, contactSent: false }) };
      }),
      contactReplyTo: window.__baketlySignedInEmail ? "We'll reply to " + window.__baketlySignedInEmail : '',
      contactNoReply: !window.__baketlySignedInEmail,
      onContact: screen === 'contact',
`;

function addBindings(template: string): string {
  return swapOnce(template, "      onContact: screen === 'contact',\n", bindings, `${LABEL_} bindings`);
}

const field = (label: string, control: string, grow = false) =>
  `<div style="display:flex;flex-direction:column;gap:6px${grow ? ";flex:1 0 auto" : ""}">` +
  `<span style="font-size:11px;font-weight:600;padding:0 2px">${label}</span>${control}</div>`;

const screen =
  '<div style="display:flex;flex-direction:column;min-height:100%;box-sizing:border-box">' +
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px 0">' +
  `<button type="button" sc-camel-on-click="{{ leaveContact }}" style="display:flex;align-items:center;gap:4px;min-height:44px;margin-left:-4px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:${OLIVE_700}">${svg(16, '<path d="M15 6l-6 6 6 6"></path>')}Back</button>` +
  `<span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${GOLD}">Send a message</span>` +
  '<span style="width:40px"></span></div>' +
  '<div style="flex:1 0 auto;padding:16px 20px 20px;display:flex;flex-direction:column;gap:20px">' +
  '<div style="display:flex;flex-direction:column;gap:6px">' +
  '<h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25">Tell us what you need</h1>' +
  `<p style="margin:0;font-size:13px;line-height:1.55;color:${LABEL}">Baketly is built from what bakers ask for. Say what would help, or what is in your way, and a person reads it.</p></div>` +
  field(
    "What is it about",
    '<div role="group" aria-label="What is it about" style="display:flex;flex-wrap:wrap;gap:8px">' +
      '<sc-for list="{{ contactTopics }}" as="t" hint-placeholder-count="4">' +
      `<button type="button" sc-camel-on-click="{{ t.pick }}" aria-pressed="{{ t.on }}" style="height:40px;padding:0 14px;border:1px solid {{ t.edge }};background:{{ t.bg }};color:{{ t.fg }};border-radius:999px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer">{{ t.label }}</button>` +
      "</sc-for></div>",
  ) +
  field(
    "Subject",
    `<input type="text" value="{{ contactSubject }}" sc-camel-on-change="{{ setContactSubject }}" aria-label="Subject" placeholder="In a few words" maxlength="120" style="width:100%;box-sizing:border-box;height:48px;padding:0 16px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};color:${INK};font-family:inherit;font-size:14px;outline:none">`,
  ) +
  field(
    "Message",
    // the value on the attribute, as before: a {{ }} between the tags is not a binding
    `<textarea value="{{ contactBody }}" sc-camel-on-change="{{ setContactBody }}" aria-label="Message" placeholder="As much or as little as you like" maxlength="4000" style="min-height:160px;width:100%;box-sizing:border-box;padding:14px 16px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};color:${INK};font-family:inherit;font-size:14px;line-height:1.55;resize:vertical;outline:none"></textarea>`,
    true,
  ) +
  `<sc-if value="{{ contactError }}" hint-placeholder-val=""><div style="font-size:13px;color:${DANGER};margin-top:-8px">{{ contactError }}</div></sc-if>` +
  '<sc-if value="{{ contactSent }}" hint-placeholder-val="{{ false }}">' +
  `<div style="font-size:13px;color:${OLIVE_700};margin-top:-8px">Sent. Thank you — we read every one of these.</div></sc-if>` +
  "</div>" +
  // the dock
  `<div style="position:sticky;bottom:0;z-index:5;background:${SURFACE};border-radius:22px 22px 0 0;box-shadow:0 -8px 30px rgba(60,55,30,.10);padding:16px 20px calc(env(safe-area-inset-bottom, 0px) + 20px);display:flex;flex-direction:column;gap:10px">` +
  `<sc-if value="{{ contactReplyTo }}" hint-placeholder-val=""><div style="display:flex;align-items:center;gap:8px;font-size:12px;color:${MUTED};min-width:0"><span style="flex:none;display:grid">${svg(16, ENVELOPE)}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ contactReplyTo }}</span></div></sc-if>` +
  `<sc-if value="{{ contactNoReply }}" hint-placeholder-val="{{ false }}"><div style="display:flex;align-items:center;gap:8px;font-size:12px;color:${MUTED}"><span style="flex:none;display:grid">${svg(16, ENVELOPE)}</span>Or write to contact@baketly.com</div></sc-if>` +
  '<sc-if value="{{ contactSending }}" hint-placeholder-val="{{ false }}">' +
  `<div style="display:flex;align-items:center;gap:9px"><span class="bk-spinner" aria-hidden="true"></span><span style="font-size:12px;color:${MUTED}">Sending…</span></div></sc-if>` +
  `<button type="button" sc-camel-on-click="{{ sendContact }}" style="display:flex;align-items:center;justify-content:center;height:48px;border:0;border-radius:${R_BUTTON};background:${OLIVE};color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">{{ contactCta }}</button>` +
  "</div></div>";

function restyle(template: string): string {
  const block = scBlock(template, '<sc-if value="{{ onContact }}" hint-placeholder-val="{{ false }}">', `${LABEL_} block`);
  return template.slice(0, block.innerStart) + screen + template.slice(block.innerEnd);
}

export function applyContactScreenBehavior(template: string): string {
  return restyle(addBindings(template));
}

// Telling the owner a baker has arrived.
//
// Nothing about the signup depends on this. The account is created, the
// session is started, and the baker is already in the app by the time this
// runs; a mail provider that is down, throttled or not configured must never
// turn someone's first minute into an error. So it is sent without being
// waited for and it never throws — the same shape as a baker's message to us,
// for the same reason.
//
// It goes wherever SIGNUP_ALERT_TO says, falling back to the contact inbox so
// a deployment that has one already has this. Set SIGNUP_ALERT_TO to an empty
// string to turn the alerts off without removing the code.

import { logger } from "./logger";

const ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 8_000;

/** How the account came to exist, in the words the owner would use. */
export type SignupRoute = "email" | "Google" | "Apple";

export interface NewSignup {
  email: string;
  displayName: string | null;
  route: SignupRoute;
  at: Date;
}

/** Where the alerts land. An empty SIGNUP_ALERT_TO means "do not send". */
function inbox(): string | null {
  const explicit = process.env.SIGNUP_ALERT_TO;
  if (explicit !== undefined) return explicit.trim() || null;
  return (process.env.CONTACT_EMAIL_TO || "contact@baketly.com").trim() || null;
}

/** The same sender the contact form uses; one verified address, not two. */
function sender(): string {
  return process.env.CONTACT_EMAIL_FROM || "Baketly <onboarding@resend.dev>";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function whenLabel(at: Date): string {
  return at.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function signupAlertText(signup: NewSignup): string {
  const name = signup.displayName?.trim();
  return (
    `${name ? name + " (" + signup.email + ")" : signup.email} signed up for Baketly.\n\n` +
    `Signed up with: ${signup.route === "email" ? "an email address" : signup.route}\n` +
    `When: ${whenLabel(signup.at)} UTC\n`
  );
}

function signupAlertHtml(signup: NewSignup): string {
  const name = signup.displayName?.trim();
  const who = name
    ? `${escapeHtml(name)} <span style="color:#6b665c">(${escapeHtml(signup.email)})</span>`
    : escapeHtml(signup.email);
  return (
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;font-size:15px;color:#22201c">' +
    '<p style="margin:0 0 4px;color:#6b665c;font-size:13px">New baker</p>' +
    `<h2 style="margin:0 0 16px;font-size:19px">${who}</h2>` +
    `<p style="margin:0 0 6px;line-height:1.55">Signed up with ${
      signup.route === "email" ? "an email address" : escapeHtml(signup.route)
    }.</p>` +
    `<p style="margin:0;color:#6b665c;font-size:13px">${escapeHtml(whenLabel(signup.at))} UTC</p>` +
    "</div>"
  );
}

/**
 * Send it, and never mind if it does not go.
 *
 * Resolves either way; the caller has already answered the baker.
 */
export async function alertNewSignup(signup: NewSignup): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = inbox();
  if (!key || !to) {
    // not an error: a deployment with no mail key, or alerts deliberately off
    return false;
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: sender(),
        to: [to],
        subject: `New Baketly signup: ${signup.email}`,
        html: signupAlertHtml(signup),
        text: signupAlertText(signup),
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      logger.error(
        { status: response.status, detail: detail.slice(0, 400) },
        "Mail provider refused a signup alert",
      );
      return false;
    }
    return true;
  } catch (error) {
    logger.error({ err: error }, "Could not send a signup alert");
    return false;
  }
}

import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { alertNewSignup } from "./signup-alert";

const signup = {
  email: "baker@example.com",
  displayName: "Dana",
  route: "email" as const,
  at: new Date("2026-10-17T09:30:00Z"),
};

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.RESEND_API_KEY;
  delete process.env.SIGNUP_ALERT_TO;
  delete process.env.CONTACT_EMAIL_TO;
});

const capture = () => {
  const seen: { sent?: any; called: boolean } = { called: false };
  globalThis.fetch = (async (_url: any, init: any) => {
    seen.called = true;
    seen.sent = JSON.parse(init.body);
    return new Response(JSON.stringify({ id: "re_1" }), { status: 200 });
  }) as typeof fetch;
  return seen;
};

test("without a key, nothing is sent and nothing throws", async () => {
  const seen = capture();
  assert.equal(await alertNewSignup(signup), false);
  assert.equal(seen.called, false);
});

test("an empty SIGNUP_ALERT_TO turns the alerts off", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.SIGNUP_ALERT_TO = "";
  process.env.CONTACT_EMAIL_TO = "contact@baketly.com";
  const seen = capture();
  assert.equal(await alertNewSignup(signup), false);
  assert.equal(seen.called, false);
});

test("it goes to SIGNUP_ALERT_TO, and says who and how", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.SIGNUP_ALERT_TO = "owner@example.com";
  const seen = capture();

  assert.equal(await alertNewSignup(signup), true);
  assert.deepEqual(seen.sent.to, ["owner@example.com"]);
  assert.match(seen.sent.subject, /baker@example\.com/);
  assert.match(seen.sent.text, /Dana/);
  assert.match(seen.sent.text, /an email address/);
});

test("with no alert address of its own it uses the contact inbox", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.CONTACT_EMAIL_TO = "contact@baketly.com";
  const seen = capture();
  assert.equal(await alertNewSignup(signup), true);
  assert.deepEqual(seen.sent.to, ["contact@baketly.com"]);
});

test("the route a baker came in by is named", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.SIGNUP_ALERT_TO = "owner@example.com";
  const seen = capture();
  await alertNewSignup({ ...signup, route: "Apple", displayName: null });
  assert.match(seen.sent.text, /Signed up with: Apple/);
  // no name offered, so the address stands alone rather than "null (…)"
  assert.doesNotMatch(seen.sent.text, /null/);
});

test("a provider that refuses is reported, not thrown", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.SIGNUP_ALERT_TO = "owner@example.com";
  globalThis.fetch = (async () =>
    new Response("no", { status: 403 })) as typeof fetch;
  assert.equal(await alertNewSignup(signup), false);
});

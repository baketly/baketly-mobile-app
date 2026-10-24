// Swiping between Overview, Products and Events.
//
// design/mobile-redesign/screens/AnalyticsSwipe.dc.html, with the pantry's
// logic (pantry-swipe-template.ts) rather than a second one: the three pages
// sit side by side on one track under the heading and the segmented
// control; while a finger is on it the track follows 1:1 with no transition;
// on release past a quarter of the width it moves on, otherwise springs back,
// with transform 260ms cubic-bezier(.2,.8,.2,1); past the first or last page
// it moves a third as far as the finger. The segmented control is
// analyticsTab as before, so it changes on landing.
//
// As on the pantry: a drag starts once a finger has moved 6px sideways, so a
// tap on a product or a bar stays a tap; a vertical scroll belongs to the
// browser (touch-action: pan-y), and a cancelled pointer springs back; the
// width is measured. Only the page on show keeps its height once the track
// settles, so a short page is not scrolled through the length of a long one.
//
// The edge-swipe file's own attempt at this (swipe-back.ts, TAB_SWIPE) stays
// off; it looked for the old .an-pane, which is gone.

import { scBlock, swapOnce } from "./template-blocks";

const LABEL_ = "Analytics swipe";
const PAGE_ORDER = ["overview", "products", "events"] as const;

function swipeablePages(template: string): string {
  const analytics = scBlock(template, '<sc-if value="{{ onAnalytics }}" hint-placeholder-val="{{ false }}">', LABEL_);
  const block = (open: string, from: number) => scBlock(template, open, LABEL_, from);
  const ov = block('<sc-if value="{{ analyticsOverviewTab }}" hint-placeholder-val="{{ true }}">', analytics.innerStart);
  const pr = block('<sc-if value="{{ analyticsProductsTab }}" hint-placeholder-val="{{ false }}">', ov.end);
  const ev = block('<sc-if value="{{ analyticsEventsTab }}" hint-placeholder-val="{{ false }}">', pr.end);
  if (ev.end > analytics.innerEnd) throw new Error(`${LABEL_}: the pages are not inside Analytics`);
  if (template.slice(ov.end, pr.start).trim() !== "" || template.slice(pr.end, ev.start).trim() !== "") {
    throw new Error(`${LABEL_}: the three pages are no longer next to each other`);
  }

  const page = (height: string, inner: string) =>
    `<div style="width:33.3333%;flex:none;box-sizing:border-box;padding:0 20px;height:{{ ${height} }};overflow:hidden">${inner}</div>`;

  const track =
    '<div style="overflow:hidden;margin:0 -20px">' +
    '<div sc-camel-on-pointer-down="{{ anSwipeDown }}" sc-camel-on-pointer-move="{{ anSwipeMove }}" ' +
    'sc-camel-on-pointer-up="{{ anSwipeUp }}" sc-camel-on-pointer-cancel="{{ anSwipeCancel }}" ' +
    'style="display:flex;align-items:flex-start;width:300%;touch-action:pan-y;' +
    'transform:translateX({{ anTrackX }});transition:{{ anTrackEase }}">' +
    page("anOverviewH", template.slice(ov.innerStart, ov.innerEnd)) +
    page("anProductsH", template.slice(pr.innerStart, pr.innerEnd)) +
    page("anEventsH", template.slice(ev.innerStart, ev.innerEnd)) +
    "</div></div>";

  let out = template.slice(0, ov.start) + track + template.slice(ev.end);
  // the segmented control lands the track too
  out = swapOnce(out, 'sc-camel-on-click="{{ setAnalyticsOverview }}"', 'sc-camel-on-click="{{ anGoOverview }}"', `${LABEL_} overview`);
  out = swapOnce(out, 'sc-camel-on-click="{{ setAnalyticsProducts }}"', 'sc-camel-on-click="{{ anGoProducts }}"', `${LABEL_} products`);
  return swapOnce(out, 'sc-camel-on-click="{{ setAnalyticsEvents }}"', 'sc-camel-on-click="{{ anGoEvents }}"', `${LABEL_} events`);
}

// As on the pantry, the gesture's start lives on the component, not in state.
const swipeController = `      ...(() => {
        const ORDER = ${JSON.stringify(PAGE_ORDER)};
        const page = Math.max(0, ORDER.indexOf(this.state.analyticsTab || 'overview'));
        const sw = this.state.analyticsSwipe || null;
        const dragging = !!(sw && sw.captured);
        const moving = !!(sw && (sw.captured || sw.settling));
        const drag = dragging ? (Number(sw.drag) || 0) : 0;
        const land = tab => {
          this.setState({ analyticsTab: tab, analyticsSwipe: { settling: true } });
          setTimeout(() => this.setState(st => (st.analyticsSwipe && st.analyticsSwipe.settling ? { analyticsSwipe: null } : {})), 300);
        };
        const height = i => (i === page || moving ? 'auto' : '0px');
        return {
          anTrackX: 'calc(' + (-page * 100 / 3) + '% + ' + drag + 'px)',
          anTrackEase: dragging ? 'none' : 'transform 260ms cubic-bezier(.2,.8,.2,1)',
          anOverviewH: height(0), anProductsH: height(1), anEventsH: height(2),
          anGoOverview: () => land('overview'),
          anGoProducts: () => land('products'),
          anGoEvents: () => land('events'),
          anSwipeDown: e => {
            const tag = e && e.target && e.target.tagName ? String(e.target.tagName).toLowerCase() : '';
            if (tag === 'input' || tag === 'select' || tag === 'textarea') { this._analyticsGesture = null; return; }
            const box = e.currentTarget && e.currentTarget.parentElement;
            this._analyticsGesture = { startX: e.clientX, width: (box && box.clientWidth) || 390, captured: false };
          },
          anSwipeMove: e => {
            const g = this._analyticsGesture;
            if (!g) return;
            let d = e.clientX - g.startX;
            if (!g.captured) {
              if (Math.abs(d) < 6) return;
              g.captured = true;
              if (e.currentTarget && e.currentTarget.setPointerCapture) {
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
              }
            }
            if ((page === 0 && d > 0) || (page === ORDER.length - 1 && d < 0)) d = d / 3;
            this.setState({ analyticsSwipe: { captured: true, drag: d } });
          },
          anSwipeUp: () => {
            const g = this._analyticsGesture;
            this._analyticsGesture = null;
            if (!g || !g.captured) return;
            const d = (this.state.analyticsSwipe && Number(this.state.analyticsSwipe.drag)) || 0;
            let next = page;
            if (d < -g.width / 4 && next < ORDER.length - 1) next += 1;
            else if (d > g.width / 4 && next > 0) next -= 1;
            land(ORDER[next]);
          },
          anSwipeCancel: () => {
            const g = this._analyticsGesture;
            this._analyticsGesture = null;
            if (g && g.captured) land(ORDER[page]);
          }
        };
      })(),
`;

function addSwipeController(template: string): string {
  const anchor = /([ \t]*)onAnalytics:\s*screen\s*===\s*'analytics',/;
  if (!anchor.test(template)) throw new Error("Missing analytics swipe controller anchor");
  return template.replace(
    anchor,
    (_match, indent: string) => `${swipeController}${indent}onAnalytics: screen === 'analytics',`,
  );
}

export function applyAnalyticsSwipeBehavior(template: string): string {
  return addSwipeController(swipeablePages(template));
}

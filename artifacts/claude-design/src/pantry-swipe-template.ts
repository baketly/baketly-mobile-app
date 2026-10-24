// Swiping between the three pantry lists.
//
// design/mobile-redesign/screens/PantrySwipe.dc.html, its script block ported:
// the three lists sit side by side on one track; while a finger is on it the
// track follows 1:1 with no transition, so the page being left stays in view;
// on release past a quarter of the width it moves on, otherwise springs back,
// with transform 260ms cubic-bezier(.2,.8,.2,1). Dragging past the first or
// last list moves the track a third as far as the finger, as the script does.
// The segmented control is pantryTab like before, so it changes on landing.
//
// Three things the design file did not have to deal with, because it was
// never touched by a phone:
//   - a tap has to stay a tap. Capturing the pointer on touch, as the script
//     does, sends the click that follows to the track, and no row would open.
//     The drag starts once a finger has moved 6px sideways.
//   - the track is touch-action: pan-y, so a vertical scroll belongs to the
//     browser, which cancels the pointer; a cancel springs back.
//   - the width a quarter is taken of is measured, not 390.
//
// Only the list on show is drawn at full height once the track settles;
// the others collapse, so a short list cannot be scrolled through the empty
// length of a long one.

import { scBlock } from "./template-blocks";

const PAGE_ORDER = ["ing", "pack", "rec"] as const;

// the header above the lists opens its count line with the same tags, so
// each list is looked for after the one before it
const block = (template: string, open: string, from = 0) => scBlock(template, open, "Pantry swipe", from);

function swipeablePantry(template: string): string {
  const rec = block(template, '<sc-if value="{{ pantryOnRec }}" hint-placeholder-val="{{ true }}">');
  const ing = block(template, '<sc-if value="{{ pantryOnIng }}" hint-placeholder-val="{{ false }}">', rec.end);
  const pack = block(template, '<sc-if value="{{ pantryOnPack }}" hint-placeholder-val="{{ false }}">', ing.end);

  // the three must sit one after another, or the track would swallow
  // whatever lies between them
  if (template.slice(rec.end, ing.start).trim() !== "" || template.slice(ing.end, pack.start).trim() !== "") {
    throw new Error("Pantry swipe: the three lists are no longer next to each other");
  }

  // each page is a screen wide, carries the side gutter the screen used to,
  // and takes its place on the track by order rather than by source position
  const page = (order: number, height: string, inner: string) =>
    `<div style="order:${order};width:33.3333%;flex:none;box-sizing:border-box;padding:0 20px;` +
    `height:{{ ${height} }};overflow:hidden">${inner}</div>`;

  const track =
    `<div style="overflow:hidden;margin:0 -20px">` +
    `<div sc-camel-on-pointer-down="{{ pantrySwipeDown }}" sc-camel-on-pointer-move="{{ pantrySwipeMove }}" ` +
    `sc-camel-on-pointer-up="{{ pantrySwipeUp }}" sc-camel-on-pointer-cancel="{{ pantrySwipeCancel }}" ` +
    `style="display:flex;align-items:flex-start;width:300%;touch-action:pan-y;` +
    `transform:translateX({{ pantryTrackX }});transition:{{ pantryTrackEase }}">` +
    page(PAGE_ORDER.indexOf("rec"), "pantryRecH", template.slice(rec.innerStart, rec.innerEnd)) +
    page(PAGE_ORDER.indexOf("ing"), "pantryIngH", template.slice(ing.innerStart, ing.innerEnd)) +
    page(PAGE_ORDER.indexOf("pack"), "pantryPackH", template.slice(pack.innerStart, pack.innerEnd)) +
    `</div></div>`;

  return template.slice(0, rec.start) + track + template.slice(pack.end);
}

// The gesture's start lives on the component, not in state: a tap then costs
// no redraw at all, and only a real drag sets state, once per move.
const swipeController = `      ...(() => {
        const ORDER = ${JSON.stringify(PAGE_ORDER)};
        const page = Math.max(0, ORDER.indexOf(this.state.pantryTab || 'ing'));
        const sw = this.state.pantrySwipe || null;
        const dragging = !!(sw && sw.captured);
        const moving = !!(sw && (sw.captured || sw.settling));
        const drag = dragging ? (Number(sw.drag) || 0) : 0;
        // land on a list; the track still needs its 260ms to get there, and
        // the page it is leaving has to stay drawn until it has
        const land = tab => {
          this.setState({ pantryTab: tab, pantrySwipe: { settling: true } });
          setTimeout(() => this.setState(st => (st.pantrySwipe && st.pantrySwipe.settling ? { pantrySwipe: null } : {})), 300);
        };
        const height = i => (i === page || moving ? 'auto' : '0px');
        return {
          pantryTrackX: 'calc(' + (-page * 100 / 3) + '% + ' + drag + 'px)',
          pantryTrackEase: dragging ? 'none' : 'transform 260ms cubic-bezier(.2,.8,.2,1)',
          pantryIngH: height(0), pantryPackH: height(1), pantryRecH: height(2),
          pantryGoIng: () => land('ing'),
          pantryGoPack: () => land('pack'),
          pantryGoRec: () => land('rec'),
          pantrySwipeDown: e => {
            const tag = e && e.target && e.target.tagName ? String(e.target.tagName).toLowerCase() : '';
            // a press in the search box is typing, not swiping
            if (tag === 'input' || tag === 'select' || tag === 'textarea') { this._pantryGesture = null; return; }
            const box = e.currentTarget && e.currentTarget.parentElement;
            this._pantryGesture = { startX: e.clientX, width: (box && box.clientWidth) || 390, captured: false };
          },
          pantrySwipeMove: e => {
            const g = this._pantryGesture;
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
            this.setState({ pantrySwipe: { captured: true, drag: d } });
          },
          pantrySwipeUp: () => {
            const g = this._pantryGesture;
            this._pantryGesture = null;
            if (!g || !g.captured) return;
            const d = (this.state.pantrySwipe && Number(this.state.pantrySwipe.drag)) || 0;
            let next = page;
            if (d < -g.width / 4 && next < ORDER.length - 1) next += 1;
            else if (d > g.width / 4 && next > 0) next -= 1;
            land(ORDER[next]);
          },
          pantrySwipeCancel: () => {
            const g = this._pantryGesture;
            this._pantryGesture = null;
            if (g && g.captured) land(ORDER[page]);
          }
        };
      })(),
`;

function addSwipeController(template: string): string {
  const anchor = /([ \t]*)onAnalytics:\s*screen\s*===\s*'analytics',/;
  if (!anchor.test(template)) throw new Error("Missing pantry swipe controller anchor");
  return template.replace(
    anchor,
    (_match, indent: string) => `${swipeController}${indent}onAnalytics: screen === 'analytics',`,
  );
}

export function applyPantrySwipeBehavior(template: string): string {
  return addSwipeController(swipeablePantry(template));
}

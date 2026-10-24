// Pulling a row to the right to take it off its list.
//
// design/mobile-redesign/screens/SwipeRemove.dc.html, its script block
// ported: the row follows the finger with no transition, up to 140px; a
// pull to the left is stored at a quarter and the row never shows left of
// where it sits; the red × behind it scales from 0.4 to 1 over the first
// 72px. Let go past 72px and the row slides off to the right on the 220ms
// curve, the gap closes 200ms later (max-height 240ms after 180ms, opacity
// 180ms after 120ms); anything short of 72px springs back. No confirmation.
//
// The one thing added: a press that starts in an input or on a button is
// left to it -- the rows here have amount boxes and ↕ and × buttons, which
// the design's rows do not.
//
// The design's rows vanish from a list kept on screen. Here the row is data,
// so it comes off the recipe or lineup once the gap has closed, by whichever
// remover the row was drawn with most recently -- the one drawn when the
// finger lifted may predate another row's removal and put it back.
//
// Each list gives its rows ids of its own ("ing:", "pack:", "ev:") so one
// pull state serves them all. It is never saved: it is where a finger is.

import { swapOnce } from "./template-blocks";

const method = `  swipeRow(id, onRemove) {
    const REVEAL = 72;
    const ease = 'transform 220ms cubic-bezier(.2,.8,.2,1)';
    const sw = this.state.swipeRm || {};
    const drag = sw.drag || {};
    const gone = sw.gone || {};
    const removed = sw.removed || {};
    this._swipeRemovers = this._swipeRemovers || {};
    this._swipeRemovers[id] = onRemove;
    const put = change => this.setState(st => ({ swipeRm: { ...(st.swipeRm || {}), ...change(st.swipeRm || {}) } }));
    const without = obj => { const next = { ...(obj || {}) }; delete next[id]; return next; };
    const x = gone[id] ? 420 : Math.max(0, drag[id] || 0);
    const dragging = sw.active === id;
    const p = Math.min(1, x / REVEAL);
    return {
      swTransform: 'translateX(' + x + 'px)',
      swTransition: dragging ? 'none' : ease,
      swDisc: 'scale(' + (0.4 + 0.6 * p).toFixed(2) + ')',
      swDiscTransition: dragging ? 'none' : ease,
      swMaxH: removed[id] ? '0px' : '80px',
      swOpacity: removed[id] ? '0' : '1',
      swCollapse: 'max-height 240ms ease 180ms, opacity 180ms ease 120ms',
      swDown: e => {
        if (e && e.target && e.target.closest && e.target.closest('input,button,select,textarea')) return;
        if (e.currentTarget && e.currentTarget.setPointerCapture) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} }
        const startX = e.clientX - (drag[id] || 0);
        put(() => ({ active: id, startX }));
      },
      swMove: e => {
        const now = this.state.swipeRm || {};
        if (now.active !== id) return;
        const d = e.clientX - now.startX;
        put(s => ({ drag: { ...(s.drag || {}), [id]: d < 0 ? d / 4 : Math.min(d, 140) } }));
      },
      swUp: () => {
        const now = this.state.swipeRm || {};
        if (now.active !== id) return;
        const d = (now.drag || {})[id] || 0;
        if (d >= REVEAL) {
          // past the threshold: the row slides off to the right, then the gap closes
          put(s => ({ active: null, gone: { ...(s.gone || {}), [id]: true } }));
          setTimeout(() => put(s => ({ removed: { ...(s.removed || {}), [id]: true } })), 200);
          // and once it has closed, the row comes off for real
          setTimeout(() => {
            const remove = (this._swipeRemovers || {})[id];
            put(s => ({ drag: without(s.drag), gone: without(s.gone), removed: without(s.removed) }));
            if (remove) remove();
          }, 200 + 420);
        } else {
          put(s => ({ active: null, drag: { ...(s.drag || {}), [id]: 0 } }));
        }
      }
    };
  }
`;

export function applySwipeRemoveBehavior(template: string): string {
  return swapOnce(template, "  REC_ICONS = {", method + "  REC_ICONS = {", "Swipe to remove method");
}

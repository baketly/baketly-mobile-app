// Dragging a bottom sheet down to close it.
//
// design/mobile-redesign/screens/SheetDismiss.dc.html, its script block
// ported: the sheet follows the finger down one for one, with no transition;
// pulled up past where it sits it moves a quarter as far; let go past a third
// of its own height and it slides away in 280ms on cubic-bezier(.2,.8,.2,1),
// otherwise it springs back on the same curve. The veil behind it fades with
// it.
//
// Every sheet is drawn by one piece (design/pieces.ts sheet()), which marks it
// data-bk-sheet; this listens on the document, as the swipe back does, rather
// than asking every sheet to carry handlers of its own. Closing is the
// sheet's own Close button -- or a tap on the veil, where a sheet has none --
// so a dragged sheet closes exactly as a tapped one does.
//
// Two things the design file did not have to decide:
//   - a drag that starts in a list that is scrolled scrolls the list, as the
//     design says. One that starts in a list at its top and goes up scrolls
//     it too: only going down does the sheet take it. Elsewhere on the sheet,
//     up is the quarter-strength pull.
//   - it waits for 6px of travel before taking hold, so a tap on a row is
//     still a tap; and a drag that goes sideways more than down is left
//     alone.

const EASE = "cubic-bezier(.2,.8,.2,1)";
const CLOSE_MS = 280;
const WAKE_PX = 6;

interface Drag {
  sheet: HTMLElement;
  veil: HTMLElement | null;
  /** the veil's colour as drawn, to fade from */
  veilRgb: [number, number, number, number] | null;
  startX: number;
  startY: number;
  height: number;
  /** a list the finger landed in, at its top: up belongs to it */
  list: HTMLElement | null;
  engaged: boolean;
  dy: number;
}

function scrollerUnder(target: EventTarget | null, sheet: HTMLElement): HTMLElement | null {
  let node = target instanceof Element ? target : null;
  while (node && node !== sheet) {
    if (node instanceof HTMLElement) {
      const style = getComputedStyle(node);
      if ((style.overflowY === "auto" || style.overflowY === "scroll") && node.scrollHeight > node.clientHeight + 1) {
        return node;
      }
    }
    node = node.parentElement;
  }
  return null;
}

function rgbaOf(colour: string): [number, number, number, number] | null {
  const m = colour.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])] : null;
}

/** Where the sheet is, and how much of the veil is left. */
function place(drag: Drag, y: number, ms: number): void {
  const transition = ms > 0 ? `transform ${ms}ms ${EASE}` : "none";
  drag.sheet.style.transition = transition;
  drag.sheet.style.transform = `translateY(${y}px)`;
  if (drag.veil && drag.veilRgb) {
    const [r, g, b, a] = drag.veilRgb;
    const left = Math.max(0, Math.min(1, 1 - Math.max(0, y) / drag.height));
    drag.veil.style.transition = ms > 0 ? `background-color ${ms}ms ${EASE}` : "none";
    drag.veil.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${(a * left).toFixed(3)})`;
  }
}

function release(drag: Drag): void {
  drag.sheet.style.transition = "";
  drag.sheet.style.transform = "";
  drag.sheet.style.willChange = "";
  if (drag.veil) {
    drag.veil.style.transition = "";
    drag.veil.style.backgroundColor = "";
  }
}

/** The sheet's own way out: its Close button, or else a tap on the veil. */
function close(drag: Drag): void {
  const button = Array.from(drag.sheet.querySelectorAll<HTMLElement>('button[aria-label="Close"]'))
    .find((b) => b.closest("[data-bk-sheet]") === drag.sheet);
  if (button) button.click();
  else drag.veil?.click();
}

export function listenForSheetDismiss(): void {
  let drag: Drag | null = null;

  document.addEventListener(
    "touchstart",
    (event) => {
      drag = null;
      const touch = event.touches[0];
      if (!touch || event.touches.length > 1) return;
      const sheet = (event.target instanceof Element ? event.target.closest("[data-bk-sheet]") : null) as HTMLElement | null;
      if (!sheet) return;
      // in a list that is scrolled: the list's, start to finish
      const list = scrollerUnder(event.target, sheet);
      if (list && list.scrollTop > 0) return;
      // and not in a field being typed in
      const tag = event.target instanceof Element ? event.target.tagName : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const veil = sheet.parentElement;
      drag = {
        sheet,
        veil,
        veilRgb: veil ? rgbaOf(getComputedStyle(veil).backgroundColor) : null,
        startX: touch.clientX,
        startY: touch.clientY,
        height: sheet.getBoundingClientRect().height || window.innerHeight,
        list,
        engaged: false,
        dy: 0,
      };
    },
    { passive: true },
  );

  document.addEventListener(
    "touchmove",
    (event) => {
      const d = drag;
      if (!d) return;
      const touch = event.touches[0];
      if (!touch) return;
      const dy = touch.clientY - d.startY;
      const dx = touch.clientX - d.startX;
      if (!d.engaged) {
        if (Math.abs(dy) < WAKE_PX && Math.abs(dx) < WAKE_PX) return;
        // sideways is not this gesture; up in a list at its top is the list's
        if (Math.abs(dx) > Math.abs(dy) || (dy < 0 && d.list)) {
          drag = null;
          return;
        }
        d.engaged = true;
        d.sheet.style.willChange = "transform";
      }
      event.preventDefault();
      // down one for one; up at a quarter
      d.dy = dy < 0 ? dy / 4 : dy;
      place(d, d.dy, 0);
    },
    { passive: false },
  );

  const end = () => {
    const d = drag;
    drag = null;
    if (!d || !d.engaged) return;
    if (d.dy > d.height / 3) {
      place(d, d.height + 40, CLOSE_MS);
      window.setTimeout(() => {
        close(d);
        // if the sheet is somehow still there, it is put back as it was
        window.setTimeout(() => release(d), 60);
      }, CLOSE_MS);
    } else {
      place(d, 0, CLOSE_MS);
      window.setTimeout(() => release(d), CLOSE_MS + 20);
    }
  };
  document.addEventListener("touchend", end, { passive: true });
  // the browser took the touch back: nothing was decided, so it springs back
  document.addEventListener(
    "touchcancel",
    () => {
      const d = drag;
      drag = null;
      if (!d || !d.engaged) return;
      place(d, 0, CLOSE_MS);
      window.setTimeout(() => release(d), CLOSE_MS + 20);
    },
    { passive: true },
  );
}

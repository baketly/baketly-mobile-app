// Two ways of finding a place in the generated template that the screens
// rebuilt for the redesign share. Both throw when the place is not there:
// a screen drawn from a template that moved should stop loudly, not render
// half of itself.

/** Replace text that must appear exactly once. */
export function swapOnce(template: string, from: string, to: string, label: string): string {
  const count = template.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 anchor, found ${count}`);
  return template.replace(from, () => to);
}

export interface Block {
  start: number;
  innerStart: number;
  innerEnd: number;
  end: number;
}

/**
 * One <sc-if> block, found by its own closing tag rather than the first one
 * after it. Looked for from `from` on, and it must be the only one there.
 */
export function scBlock(template: string, open: string, label: string, from = 0): Block {
  const start = template.indexOf(open, from);
  if (start === -1) throw new Error(`${label}: missing ${open}`);
  if (template.indexOf(open, start + 1) !== -1) throw new Error(`${label}: ${open} appears twice`);
  const innerStart = start + open.length;
  let depth = 1;
  let cursor = innerStart;
  while (depth > 0) {
    const nextOpen = template.indexOf("<sc-if", cursor);
    const nextClose = template.indexOf("</sc-if>", cursor);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      cursor = nextOpen + 6;
    } else {
      depth -= 1;
      if (depth === 0) return { start, innerStart, innerEnd: nextClose, end: nextClose + "</sc-if>".length };
      cursor = nextClose + 8;
    }
  }
  throw new Error(`${label}: ${open} is never closed`);
}

// Navigation, in the redesign's order.
//
// Home · Pantry · Pay · Events · Analytics -- the pantry you stock, the thing
// you reach for mid-market, the events you plan, and what it came to. Pay sits
// in the middle as a disc because it is the one tab used one-handed with a
// queue waiting.
//
// Inside the pantry: it opens on Ingredients, which recipes are written from,
// rather than on Recipes.

import { tabBar } from "./design/pieces";

/**
 * Draws the redesign's tab bar in place of the generated one.
 *
 * Home · Pantry · Pay · Events · Analytics, with Pay as the olive disc in the
 * middle -- design/mobile-redesign/screens/Main.dc.html, the <nav> at the
 * bottom. The generated bar is found by its own container and read for its
 * handlers, so every tab keeps the action it had; only the drawing changes.
 * Pay routes to the existing New sale for now; the sale chooser sheet comes
 * later.
 */
function restyleTabBar(template: string): string {
  const barStart = template.indexOf(
    '<div style="flex:none;display:flex;align-items:stretch;border-top:1px solid var(--color-divider);background:var(--color-bg);padding:6px 8px 2px">',
  );
  if (barStart === -1) throw new Error("Missing tab bar anchor");
  const barEnd = template.indexOf("</div>", barStart);
  if (barEnd === -1) throw new Error("Unclosed tab bar");
  const inner = template.slice(barStart, barEnd);

  // each handler the new bar routes to must still exist in the old one, or
  // a tab would be drawn that does nothing
  for (const handler of ["{{ goDash }}", "{{ goIngredients }}", "{{ startSale }}", "{{ goMarkets }}", "{{ goAnalytics }}"]) {
    if (!inner.includes(handler)) throw new Error(`Missing tab button for ${handler}`);
  }

  const bar = tabBar(
    null,
    {
      home: "{{ goDash }}",
      pantry: "{{ goIngredients }}",
      pay: "{{ startSale }}",
      events: "{{ goMarkets }}",
      analytics: "{{ goAnalytics }}",
    },
    {
      home: "{{ tcDash }}",
      pantry: "{{ tcIngredients }}",
      events: "{{ tcMarkets }}",
      analytics: "{{ tcAnalytics }}",
    },
  );
  return template.slice(0, barStart) + bar + template.slice(barEnd + "</div>".length);
}

/**
 * The lit tab is olive and the rest are the design's grey, not the page's
 * accent and neutral variables, which are a shade off either.
 */
function tabColours(template: string): string {
  const from = "const tc = keys => keys.includes(screen) ? 'var(--color-accent)' : 'var(--color-neutral-600)';";
  if (!template.includes(from)) throw new Error("Missing tab colour helper");
  return template.replace(from, () => "const tc = keys => keys.includes(screen) ? '#7d8a3c' : '#9a947f';");
}

/** The pantry opens on what a recipe is built from, not on the recipe. */
function reorderPantryTabs(template: string): string {
  const recipes =
    '<button sc-camel-on-click="{{ setPantryRec }}" style="flex:1;border:0;cursor:pointer;font-family:var(--font-body);font-size:12px;font-weight:600;padding:9px 0;border-radius:10px;background:{{ segRecBg }};color:{{ segRecColor }}">Recipes</button>';
  const ingredients =
    '<button sc-camel-on-click="{{ setPantryIng }}" style="flex:1;border:0;cursor:pointer;font-family:var(--font-body);font-size:12px;font-weight:600;padding:9px 0;border-radius:10px;background:{{ segIngBg }};color:{{ segIngColor }}">Ingredients</button>';
  const packaging =
    '<button sc-camel-on-click="{{ setPantryPack }}" style="flex:1;border:0;cursor:pointer;font-family:var(--font-body);font-size:12px;font-weight:600;padding:9px 0;border-radius:10px;background:{{ segPackBg }};color:{{ segPackColor }}">Packaging</button>';
  const before = `  <div class="seg" style="margin-bottom:16px">\n    ${recipes}\n    ${ingredients}\n    ${packaging}\n  </div>`;
  if (!template.includes(before)) throw new Error("Missing pantry tab strip anchor");

  // design/mobile-redesign: a white shell with a hairline border, segments
  // 36px tall; the selected one olive. The colours still come from seg()
  // in the page, which already gives the design's olive and grey. A tap lands
  // through pantry-swipe-template.ts, so the track slides as a swipe would.
  const segment = (handler: string, bg: string, color: string, label: string) =>
    `<button sc-camel-on-click="{{ ${handler} }}" style="flex:1;height:36px;border:0;border-radius:10px;cursor:pointer;` +
    `font-family:inherit;font-size:12px;font-weight:600;background:{{ ${bg} }};color:{{ ${color} }}">${label}</button>`;
  return template.replace(
    before,
    () =>
      `  <div role="group" aria-label="Pantry section" style="display:flex;gap:4px;padding:4px;margin-bottom:14px;` +
      `border:1px solid #e5dfd2;border-radius:14px;background:#ffffff">` +
      segment("pantryGoIng", "segIngBg", "segIngColor", "Ingredients") +
      segment("pantryGoPack", "segPackBg", "segPackColor", "Packaging") +
      segment("pantryGoRec", "segRecBg", "segRecColor", "Recipes") +
      `</div>`,
  );
}

/**
 * A new baker lands on the pantry's first tab, not its last. Only the default
 * moves; goRecipes still opens Recipes deliberately.
 */
function defaultToIngredients(template: string): string {
  const anchor = "const pt = this.state.pantryTab || 'rec'";
  if (!template.includes(anchor)) throw new Error("Missing pantry tab default");
  return template.replace(anchor, () => "const pt = this.state.pantryTab || 'ing'");
}

export function applyNavBehavior(template: string): string {
  return defaultToIngredients(reorderPantryTabs(tabColours(restyleTabBar(template))));
}

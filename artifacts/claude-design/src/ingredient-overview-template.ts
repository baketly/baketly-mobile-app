// A saved ingredient, read before it is edited.
//
// design/mobile-redesign/screens/IngredientOverview.dc.html: the name with
// its category and supplier, the fact strip -- package price, package size,
// when the price last changed -- then the recipes it is in (each opens that
// recipe) and its nutrition per 100 of its unit. No paragraph, no button bar;
// Edit and Delete are the round buttons in the header. The form behind the
// pencil is unchanged: it is a later screen in the redesign.
//
// Delete opens DeleteConfirm.dc.html, and says what deleting does: it comes
// out of every recipe that uses it, so those recipes cost less on paper
// until something takes its place, while sales already recorded keep their
// numbers -- each sale holds its own cost.

import { card, deleteDialog, factStrip } from "./design/pieces";
import { INK, HANDLE, HAIRLINE, LABEL, MUTED, OLIVE_700, OLIVE_SOFT, R_FIELD, SURFACE, GOLD, TNUM } from "./design/tokens";
import { INGREDIENT_CATEGORIES } from "./ingredient-template";
import { itemActions } from "./item-mode-template";
import { scBlock, swapOnce } from "./template-blocks";

const LABEL_ = "Ingredient overview";

const svg = (size: number, paths: string) =>
  `<svg width="${size}" height="${size}" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

/** Views over the ingredient controller's own values: active, activeKey, CUR. */
const overviewBindings = `          ingredientName: active.name,
          ...(() => {
            const key = activeKey || '';
            const unit = active.unit || 'g';
            const per = active.packageSize > 0 ? active.packagePrice / active.packageSize : 0;
            const categories = ${JSON.stringify(INGREDIENT_CATEGORIES)};
            const category = (categories.find(([k]) => k === active.category) || [null, ''])[1];
            const recipes = (Array.isArray(this.state.recipeRecords) ? this.state.recipeRecords : [])
              .filter(r => key && (r.ingredientKeys || []).includes(key));
            const amountOf = r => {
              const value = Number((r.amounts || {})[key]) || 0;
              return (Math.round(value * 100) / 100) + (unit === 'pc' ? '' : ' ' + unit);
            };
            // when the price last moved; a price never changed has no date
            const history = ((this.state.priceHistory || {})[key] || []).filter(h => h && h.at);
            const last = history.length ? new Date(history[history.length - 1].at) : null;
            const names = recipes.map(r => String(r.name || '').trim() || 'Untitled recipe');
            // named while they fit in a sentence; past three, counted
            const list = names.length <= 2 ? names.join(' and ')
              : names.length === 3 ? names[0] + ', ' + names[1] + ' and ' + names[2]
              : 'the ' + names.length + ' recipes that use it';
            return {
              ingBackLabel: (Array.isArray(this.state.stack) && this.state.stack[this.state.stack.length - 1] === 'recipeEditor') ? 'Recipe' : 'Pantry',
              ingOvSub: [category, String(active.supplier || '').trim()].filter(Boolean).join(' \\u00b7 ') || 'No supplier yet',
              ingOvPackage: active.packagePrice > 0 ? CUR + Number(active.packagePrice).toFixed(2) : '\\u2014',
              ingOvSize: active.packageSize > 0 ? Number(active.packageSize).toLocaleString('en-US') + (unit === 'pc' ? ' pcs' : ' ' + unit) : '\\u2014',
              ingOvUpdated: last && !isNaN(last.getTime()) ? last.getDate() + ' ' + last.toLocaleString('en-US', { month: 'short' }) : '\\u2014',
              ingOvUsedMeta: recipes.length + (recipes.length === 1 ? ' recipe' : ' recipes'),
              ingOvUsed: recipes.length > 0,
              ingOvUnused: recipes.length === 0,
              ingOvRecipes: recipes.map((r, i) => ({
                name: String(r.name || '').trim() || 'Untitled recipe',
                amount: amountOf(r) + ' per batch',
                cost: CUR + ((Number((r.amounts || {})[key]) || 0) * per).toFixed(2),
                sep: i ? '1px solid ${HAIRLINE}' : '0',
                open: () => this.setState(st => ({ screen: 'recipeEditor', stack: this.stackTo(st, 'recipeEditor'), activeRecipeId: r.id, recipeDraft: null, recipeDeleteOpen: false, ingPickerOpen: false, packPickerOpen: false, editingKey: '' }))
              })),
              ingOvPer100: 'per 100 ' + (unit === 'pc' ? 'pieces' : unit),
              ingOvProtein: (Number(active.protein) || 0) + ' g',
              ingOvCarbs: (Number(active.carbs) || 0) + ' g',
              ingOvFat: (Number(active.fat) || 0) + ' g',
              ingOvSugar: (Number(active.sugar) || 0) + ' g',
              ingOvKcal: String(Number(active.kcal) || 0),
              ingredientDeleteBody: (recipes.length
                ? 'It comes out of ' + list + ', so ' + (recipes.length === 1 ? 'it costs' : 'they cost') + ' less on paper until you add something in its place. '
                : 'No recipe uses it, so nothing else changes. ')
                + "Sales you've already recorded keep their numbers. This cannot be undone."
            };
          })(),
`;

const round = (handler: string, label: string, color: string, paths: string) =>
  `<button type="button" sc-camel-on-click="{{ ${handler} }}" aria-label="${label}" style="width:40px;height:40px;border-radius:50%;border:0;padding:0;cursor:pointer;background:${SURFACE};color:${color};display:grid;place-items:center">${svg(16, paths)}</button>`;

const header =
  `<button type="button" sc-camel-on-click="{{ cancelIngredientEdit }}" style="display:flex;align-items:center;gap:4px;min-height:44px;margin-left:-4px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:${OLIVE_700}">${svg(16, '<path d="M15 6l-6 6 6 6"></path>')}{{ ingBackLabel }}</button>` +
  `<sc-if value="{{ ingPreviewing }}" hint-placeholder-val="{{ true }}"><span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${GOLD}">Ingredient</span></sc-if>` +
  // keeps its width when empty, so the kicker stays centred
  '<div style="display:flex;gap:6px;flex:none;min-width:64px;justify-content:flex-end">' +
  // the form has no delete: delete belongs to the saved item, here
  '<sc-if value="{{ ingPreviewing }}" hint-placeholder-val="{{ true }}">' +
  round("editIngredient", "Edit ingredient", INK, '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path>') +
  round("requestDeleteIngredient", "Delete this ingredient", "#b0563e", '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"></path>') +
  "</sc-if></div>";

const macroCell = (label: string, value: string, first = false) =>
  `<div style="padding:10px 8px;${first ? "" : `border-left:1px solid ${HAIRLINE};`}display:flex;flex-direction:column;gap:2px;align-items:center">` +
  `<div style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${LABEL}">${label}</div>` +
  `<div style="font-weight:600;font-size:14px;${TNUM}">${value}</div></div>`;

const usedInRow =
  '<sc-for list="{{ ingOvRecipes }}" as="r" hint-placeholder-count="3">' +
  '<button type="button" sc-camel-on-click="{{ r.open }}" style="display:flex;align-items:center;gap:12px;min-height:52px;border:0;border-top:{{ r.sep }};background:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;color:inherit">' +
  '<div style="flex:1;min-width:0;display:flex;flex-direction:column">' +
  '<span style="font-size:14px;font-weight:500;line-height:1.3">{{ r.name }}</span>' +
  `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ r.amount }}</span></div>` +
  `<span style="font-size:13px;font-weight:600;${TNUM}">{{ r.cost }}</span>` +
  svg(16, '<path d="M9 6l6 6-6 6"></path>').replace('stroke="currentColor"', `stroke="${HANDLE}"`) +
  "</button></sc-for>";

const overview =
  '<div style="display:flex;flex-direction:column;gap:22px;margin-top:14px">' +
  '<div style="display:flex;align-items:center;gap:14px">' +
  `<div style="flex:none;width:56px;height:56px;border-radius:${R_FIELD};background:${OLIVE_SOFT};color:${OLIVE_700};display:grid;place-items:center">` +
  svg(22, '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"></path><path d="M3 8l9 5 9-5"></path>') + "</div>" +
  '<div style="min-width:0;display:flex;flex-direction:column">' +
  '<h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25">{{ ingredientName }}</h1>' +
  `<div style="font-size:12px;color:${MUTED}">{{ ingOvSub }}</div></div></div>` +
  factStrip([
    { label: "Package", value: "{{ ingOvPackage }}" },
    { label: "Size", value: "{{ ingOvSize }}" },
    { label: "Updated", value: "{{ ingOvUpdated }}" },
  ]) +
  '<sc-if value="{{ ingOvUsed }}" hint-placeholder-val="{{ true }}">' +
  card({ title: "Used in", meta: "{{ ingOvUsedMeta }}", loop: usedInRow }) +
  "</sc-if>" +
  '<sc-if value="{{ ingOvUnused }}" hint-placeholder-val="{{ false }}">' +
  card({ title: "Used in", rows: [`<div style="min-height:44px;display:flex;align-items:center;font-size:13px;color:${LABEL}">Not in any recipe yet.</div>`] }) +
  "</sc-if>" +
  '<div style="display:flex;flex-direction:column;gap:10px">' +
  '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:0 2px">' +
  '<h6 style="margin:0;font-size:15px;font-weight:700;line-height:1.3">Nutrition</h6>' +
  `<span style="font-size:12px;color:${MUTED}">{{ ingOvPer100 }}</span></div>` +
  `<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border:1px solid ${HAIRLINE};border-radius:18px;background:${SURFACE};overflow:hidden">` +
  macroCell("kcal", "{{ ingOvKcal }}", true) +
  macroCell("Protein", "{{ ingOvProtein }}") +
  macroCell("Carbs", "{{ ingOvCarbs }}") +
  macroCell("Fat", "{{ ingOvFat }}") +
  macroCell("Sugar", "{{ ingOvSugar }}") +
  "</div></div>" +
  "</div>";

/**
 * The back history for going from one saved item to another. The stack holds
 * screen names, not which item each showed, so a recipe opened from an
 * ingredient opened from a recipe would come back as the second recipe, and
 * an ingredient screen returned to after another ingredient was shown comes
 * back empty. A screen already on the stack is gone back to instead of being
 * stacked twice: Back never lands on the wrong item.
 */
const stackMethod = `  stackTo(st, screen) {
    const stack = Array.isArray(st.stack) ? st.stack : [];
    const at = stack.lastIndexOf(screen);
    return at === -1 ? [...stack, st.screen] : stack.slice(0, at);
  }
`;

function addBindings(template: string): string {
  const out = swapOnce(template, "  REC_ICONS = {", stackMethod + "  REC_ICONS = {", `${LABEL_} stack method`);
  return swapOnce(out, "          ingredientName: active.name,\n", overviewBindings, `${LABEL_} bindings`);
}

function restyleHeader(template: string): string {
  return swapOnce(
    template,
    '<button class="btn btn-ghost" sc-camel-on-click="{{ cancelIngredientEdit }}" style="margin-left:-6px;min-height:44px">‹ Ingredients</button>' +
      itemActions("editIngredient", "requestDeleteIngredient", "ingredient", "ingPreviewing", "ingredientExisting"),
    header,
    `${LABEL_} header`,
  );
}

function replacePreview(template: string): string {
  const preview = scBlock(template, '<sc-if value="{{ ingPreviewing }}" hint-placeholder-val="{{ false }}">', `${LABEL_} preview`);
  return template.slice(0, preview.innerStart) + overview + template.slice(preview.innerEnd);
}

function replaceDeleteDialog(template: string): string {
  const dialog = scBlock(template, '<sc-if value="{{ ingredientDeleteOpen }}" hint-placeholder-val="{{ false }}">', `${LABEL_} delete dialog`);
  return (
    template.slice(0, dialog.start) +
    deleteDialog({
      open: "{{ ingredientDeleteOpen }}",
      label: "Delete this ingredient",
      title: "Delete {{ ingredientDeleteName }}?",
      body: "{{ ingredientDeleteBody }}",
      onKeep: "{{ cancelDeleteIngredient }}",
      onDelete: "{{ confirmDeleteIngredient }}",
    }) +
    template.slice(dialog.end)
  );
}

export function applyIngredientOverviewBehavior(template: string): string {
  return replaceDeleteDialog(replacePreview(restyleHeader(addBindings(template))));
}

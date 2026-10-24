// The recipe editor as the redesign draws it.
//
// design/mobile-redesign/screens/NewRecipe.dc.html (empty) and
// NewRecipeFilled.dc.html (with ingredients): one scrolling screen -- photo
// tile and name, Makes and Active time, Group, the Ingredients card with its
// amounts typed in place, the Packaging card -- and the dock underneath with
// what one costs and what the baker earns, worked out as they type.
//
// AddIngredient.dc.html is the ingredient picker, now a sheet with a ticked
// list; GroupPicker.dc.html and NewGroup.dc.html replace the row of group
// chips with a pill that opens a sheet, and "Add new group" a dialog.
//
// Parts: NewRecipeParts.dc.html is the Ingredients card once a recipe has
// them, RecipeParts.dc.html the sheet that names them, and MovePart.dc.html
// the sheet behind the ↕ on a row. What a part is, and how the lines under
// it add up to the recipe, is recipe-template.ts's business.
//
// Only what is drawn changes. Every figure, handler and saved field is the
// editor's own from recipe-template.ts and recipe-groups-template.ts; the
// few bindings added here are views over values the editor already has.
// The preview of a saved recipe is untouched -- it is the next screen to be
// redrawn, and it keeps the macros and the delete button meanwhile. The
// form loses both: the design has no macros on it, and the README puts
// delete on overviews only.

import { dock, pillField, sheet, swipeRow } from "./design/pieces";
import {
  BG, SURFACE, INK, MUTED, LABEL, OLIVE, OLIVE_700, OLIVE_DIM, GOLD,
  HAIRLINE, BORDER, HANDLE, CARD_SHADOW, SCRIM, R_CARD, R_FIELD, R_BUTTON, TNUM,
} from "./design/tokens";
import { itemActions } from "./item-mode-template";
import { scBlock, swapOnce } from "./template-blocks";

const LABEL_ = "Recipe editor";

const svg = (size: number, paths: string, width = "1.75", stroke = "currentColor") =>
  `<svg width="${size}" height="${size}" sc-camel-view-box="0 0 24 24" fill="none" stroke="${stroke}" ` +
  `stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const ICON_BACK = svg(16, '<path d="M15 6l-6 6 6 6"></path>');
const ICON_CAMERA = svg(20, '<path d="M4 8h3l2-3h6l2 3h3v12H4z"></path><circle cx="12" cy="13" r="3.5"></circle>');
const ICON_DOWN = svg(16, '<path d="M6 9l6 6 6-6"></path>', "1.75", MUTED);
const ICON_PARTS = svg(14, '<rect x="3" y="4" width="18" height="6" rx="2"></rect><rect x="3" y="14" width="18" height="6" rx="2"></rect>');
const ICON_PLUS_16 = svg(16, '<path d="M12 5v14M5 12h14"></path>', "2");
const ICON_PLUS_18 = svg(18, '<path d="M12 5v14M5 12h14"></path>', "2");
const ICON_CHECK = svg(18, '<path d="M20 6L9 17l-5-5"></path>', "2.25");
const ICON_TICK = svg(14, '<path d="M20 6L9 17l-5-5"></path>', "3");
const ICON_PLUS_14 = svg(14, '<path d="M12 5v14M5 12h14"></path>', "2");
const ICON_MOVE = svg(14, '<path d="M7 10l5-5 5 5M7 14l5 5 5-5"></path>');

/* ------------------------------------------------------------- controller */

/**
 * Views over the editor's own values, added where those values are in scope:
 * recipe, keys, packs, per, packPer, records, updateRecipe and the rest are
 * the editor's locals.
 */
const editorBindings = `          recipeTitle: recipe.name,
          recipeKicker: isNewRecipe ? 'New recipe' : 'Edit recipe',
          // over a saved recipe, what it is: its group
          recipeOverviewKicker: this.recipeGroupOf(recipe) === 'none' ? 'Recipe' : this.recipeGroupName(this.recipeGroupOf(recipe)),
          recipeNoPhoto: !recipe.photo,
          recipePhotoBorder: recipe.photo ? '1px solid ${HAIRLINE}' : '1.5px dashed ${HANDLE}',
          recipeFormGap: keys.length ? '18px' : '28px',
          // the steppers beside Makes; what was being typed in the box goes,
          // or it would be shown in place of the number the step made
          ...(() => {
            const step = by => {
              this.setState(st => { const typed = { ...(st.recipeTyped || {}) }; delete typed.yield; return { recipeTyped: typed }; });
              updateRecipe({ yield: Math.max(fewestMade, made + by) });
            };
            return { recipeYieldDown: () => step(-1), recipeYieldUp: () => step(1) };
          })(),
          recipeHasPacks: packs.length > 0,
          recipeNoPacks: packs.length === 0,
          recipePackMeta: packs.length ? CUR + packPer.toFixed(2) + ' each' : 'optional',
          recipePackRows: packs.map((k, i) => ({
            name: this.PACK_META[k].name,
            price: CUR + this.PACK_META[k].per.toFixed(2),
            aria: 'Remove ' + this.PACK_META[k].name,
            sep: i ? '1px solid ${HAIRLINE}' : '0',
            remove: () => updateRecipe({ packagingKeys: packs.filter(x => x !== k) }),
            ...this.swipeRow('pack:' + k, () => updateRecipe({ packagingKeys: packs.filter(x => x !== k) }))
          })),
          // The dock. Nothing to cost yet says so; a cost without a price
          // shows the cost; with both it is what one earns, and the margin.
          ...(() => {
            const price = Number(recipe.price || 0);
            const costed = keys.length > 0 || packs.length > 0;
            const earn = price - per;
            return {
              dockEmpty: !costed,
              // no cost per piece until there is a number of pieces
              dockNoYield: costed && made < 1,
              dockUnpriced: costed && made >= 1 && !(price > 0),
              dockPriced: costed && made >= 1 && price > 0,
              dockEachCosts: CUR + per.toFixed(2),
              dockEarn: 'You earn ' + (earn < 0 ? '\\u2212' : '') + CUR + Math.abs(earn).toFixed(2),
              dockEarnColor: earn < 0 ? '#b07a1f' : '${OLIVE_700}',
              dockMargin: price > 0 ? (earn < 0 ? '\\u2212' : '') + Math.abs(Math.round(earn / price * 100)) + '% margin' : '',
              // a new recipe has nothing to save until it has a name and a
              // batch size; the button still answers, with the reason, if tapped
              recipeSaveBg: isNewRecipe && (!String(recipe.name || '').trim() || made < 1) ? '${OLIVE_DIM}' : '${OLIVE}'
            };
          })(),
          // ---- which group --------------------------------------------
          ...(() => {
            const current = this.recipeGroupOf(recipe);
            const close = () => this.setState({ groupSheetOpen: false });
            const taken = this.recipeGroupList().map(g => String(g.name || '').trim().toLowerCase());
            const suggestions = ['Cakes', 'Buns', 'Gluten-free', 'Seasonal'].filter(n => !taken.includes(n.toLowerCase()));
            return {
              recipeGroupPill: current === 'none' ? 'Choose a group' : this.recipeGroupName(current),
              recipeGroupPillColor: current === 'none' ? '#b9b4a8' : '${INK}',
              groupSheetOpen: this.state.groupSheetOpen === true,
              openGroupSheet: () => this.setState({ groupSheetOpen: true }),
              dismissGroupSheet: close,
              // a tap on the dimmed screen behind closes it; one inside does not
              closeGroupSheet: e => { if (!e || e.target === e.currentTarget) close(); },
              groupSheetRows: [...this.recipeGroupList().map(g => g.id), ''].map((id, i) => {
                const on = id === '' ? current === 'none' : current === id;
                const n = records.filter(r => this.recipeGroupOf(r) === id).length;
                return {
                  label: id ? this.recipeGroupName(id) : 'No group',
                  meta: id ? n + (n === 1 ? ' recipe' : ' recipes') : '',
                  on,
                  color: on ? '${OLIVE_700}' : (id ? '${INK}' : '${LABEL}'),
                  weight: on ? '600' : '500',
                  sep: i ? '1px solid ${HAIRLINE}' : '0',
                  pick: () => { updateRecipe({ type: id }); close(); }
                };
              }),
              // the dialog takes the sheet's place; Cancel puts the sheet back
              openNewGroup: () => this.setState({ groupSheetOpen: false, groupAddOpen: true, newGroupName: '' }),
              backToGroupSheet: () => this.setState({ groupAddOpen: false, newGroupName: '', groupSheetOpen: true }),
              newGroupHasSuggestions: suggestions.length > 0,
              newGroupSuggestions: suggestions.map(label => ({ label, pick: () => this.setState({ newGroupName: label }) })),
              newGroupCreateBg: String(this.state.newGroupName || '').trim() ? '${OLIVE}' : '${OLIVE_DIM}'
            };
          })(),
          // Not in the pantry yet: make it, and come back. The ingredient
          // editor returns to the screen it was opened from when it saves.
          createIngredientFromPicker: () => this.setState(st => ({
            ingPickerOpen: false, ingSearch: '', ingPickerSelected: [], ingPickerCategory: 'all',
            screen: 'ingredientEdit', stack: [...st.stack, st.screen],
            activeIngredientKey: null,
            ingredientDraft: { name: '', supplier: '', packagePrice: 0, packageSize: 0, unit: 'g', kcal: 0, protein: 0, carbs: 0, fat: 0 },
            ingredientSaveError: '', fromScan: false
          })),
`;

/** A picker row's tick box and the pantry price, said the way a label says it. */
const pickerRowBindings =
  `check: selected.includes(k) ? '✓' : '',
                  on: selected.includes(k),
                  ariaChecked: selected.includes(k) ? 'true' : 'false',
                  boxBg: selected.includes(k) ? '${OLIVE}' : '${SURFACE}',
                  boxBorder: selected.includes(k) ? '${OLIVE}' : '${HANDLE}',
                  tickOpacity: selected.includes(k) ? '1' : '0',
                  sep: available.indexOf(k) ? '1px solid ${HAIRLINE}' : '0',
                  priceLine: !(m.per > 0) ? 'No price yet'
                    : m.unit === 'g' ? CUR + (m.per * 1000).toFixed(2) + ' per kg'
                    : m.unit === 'ml' ? CUR + (m.per * 1000).toFixed(2) + ' per l'
                    : m.unit === 'pc' || !m.unit ? CUR + m.per.toFixed(2) + ' each'
                    : CUR + m.per.toFixed(2) + ' per ' + m.unit,
                  toggle: () => this.setState(st => ({ ingPickerSelected`;

function addBindings(template: string): string {
  let out = swapOnce(template, "          recipeTitle: recipe.name,\n", editorBindings, `${LABEL_} bindings`);
  out = swapOnce(
    out,
    "check: selected.includes(k) ? '✓' : '',\n                  toggle: () => this.setState(st => ({ ingPickerSelected",
    pickerRowBindings,
    `${LABEL_} picker rows`,
  );
  out = swapOnce(
    out,
    "ingPickerConfirmLabel: selected.length",
    `ingPickerAddBg: selected.length ? '${OLIVE}' : '${OLIVE_DIM}',\n              ingPickerConfirmLabel: selected.length`,
    `${LABEL_} picker button`,
  );
  // the picker's chips in the design's olive rather than the page's accent
  out = swapOnce(
    out,
    "border: categoryFilter === key ? 'var(--color-accent)' : 'var(--color-neutral-300)',\n" +
      "                bg: categoryFilter === key ? 'var(--color-accent)' : '#fff',\n" +
      "                color: categoryFilter === key ? '#fff' : '#8a8578'",
    `border: categoryFilter === key ? '${OLIVE}' : '${BORDER}',\n` +
      `                bg: categoryFilter === key ? '${OLIVE}' : '${SURFACE}',\n` +
      `                color: categoryFilter === key ? '${SURFACE}' : '${INK}'`,
    `${LABEL_} picker chips`,
  );
  // the form has no delete; the preview keeps it
  return swapOnce(
    out,
    "          recPreviewing: rec.previewing,\n",
    "          recPreviewing: rec.previewing,\n          recipeDeleteShown: rec.previewing,\n" +
      "          recipeScreenDisplay: rec.editing ? 'flex' : 'block',\n",
    `${LABEL_} delete flag`,
  );
}

/* ------------------------------------------------------------------ header */

function restyleHeader(template: string): string {
  // A column while the form shows, at least the height of the screen, so a
  // short recipe still has its dock at the foot rather than under the last
  // card. The preview stays a plain block, laid out exactly as it was.
  let out = swapOnce(
    template,
    '<!-- ══ RECIPE EDITOR ══ -->\n<sc-if value="{{ onRecipeEditor }}" hint-placeholder-val="{{ false }}">\n<div style="padding:14px 20px 28px">',
    '<!-- ══ RECIPE EDITOR ══ -->\n<sc-if value="{{ onRecipeEditor }}" hint-placeholder-val="{{ false }}">\n' +
      '<div style="padding:14px 20px 28px;box-sizing:border-box;min-height:100%;display:{{ recipeScreenDisplay }};flex-direction:column">',
    `${LABEL_} screen`,
  );
  // Back on the left, what the screen is about in the middle -- "New
  // recipe" on the form, the recipe's group over a saved one -- and over a
  // saved one, Edit and Delete as two round buttons. The form has no delete.
  const round = (handler: string, label: string, color: string, paths: string) =>
    `<button type="button" sc-camel-on-click="{{ ${handler} }}" aria-label="${label}" style="width:40px;height:40px;border-radius:50%;border:0;padding:0;cursor:pointer;background:${SURFACE};color:${color};display:grid;place-items:center">${svg(16, paths)}</button>`;
  out = swapOnce(
    out,
    '<button class="btn btn-ghost" sc-camel-on-click="{{ backToRecipes }}" style="margin-left:-6px;min-height:44px">‹ Recipes</button>' +
      itemActions("editRecipe", "requestDeleteRecipe", "recipe", "recPreviewing", "recipeExists"),
    `<button type="button" sc-camel-on-click="{{ backToRecipes }}" style="display:flex;align-items:center;gap:4px;min-height:44px;margin-left:-4px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:${OLIVE_700}">${ICON_BACK}Recipes</button>` +
      `<sc-if value="{{ recEditing }}" hint-placeholder-val="{{ false }}"><span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${GOLD}">{{ recipeKicker }}</span></sc-if>` +
      `<sc-if value="{{ recipeDeleteShown }}" hint-placeholder-val="{{ false }}"><span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${GOLD}">{{ recipeOverviewKicker }}</span></sc-if>` +
      // keeps its width when empty, so the kicker stays centred
      '<div style="display:flex;gap:6px;flex:none;min-width:64px;justify-content:flex-end">' +
      '<sc-if value="{{ recipeDeleteShown }}" hint-placeholder-val="{{ false }}">' +
      round("editRecipe", "Edit recipe", INK, '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path>') +
      round("requestDeleteRecipe", "Delete this recipe", "#b0563e", '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"></path>') +
      "</sc-if></div>",
    `${LABEL_} header`,
  );
  return out;
}

/* -------------------------------------------------------------------- form */

const nameRow =
  '<div style="display:flex;align-items:center;gap:12px">' +
  `<label style="position:relative;flex:none;width:56px;height:56px;box-sizing:border-box;border-radius:${R_FIELD};border:{{ recipePhotoBorder }};background:${SURFACE};color:${MUTED};display:grid;place-items:center;overflow:hidden;cursor:pointer">` +
  '<sc-if value="{{ recipeHasPhoto }}" hint-placeholder-val="{{ false }}"><img src="{{ recipePhoto }}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></sc-if>' +
  `<sc-if value="{{ recipeNoPhoto }}" hint-placeholder-val="{{ true }}">${ICON_CAMERA}</sc-if>` +
  '<input type="file" accept="image/*" sc-camel-on-change="{{ setRecipePhoto }}" aria-label="{{ recipePhotoAction }}" style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer">' +
  "</label>" +
  `<input type="text" value="{{ recipeTitle }}" sc-camel-on-change="{{ setRecipeTitle }}" placeholder="Name your recipe" aria-label="Recipe name" style="flex:1;min-width:0;box-sizing:border-box;height:56px;padding:0 16px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};color:${INK};font-family:inherit;font-weight:600;font-size:20px">` +
  "</div>" +
  // a photo can be taken off again, and a bad one says why it was refused
  '<sc-if value="{{ recipeHasPhoto }}" hint-placeholder-val="{{ false }}">' +
  `<button type="button" sc-camel-on-click="{{ removeRecipePhoto }}" style="align-self:flex-start;margin-top:-8px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:${LABEL}">Remove photo</button></sc-if>` +
  '<sc-if value="{{ recipePhotoError }}" hint-placeholder-val=""><span style="margin-top:-8px;font-size:12px;color:#b0563e">{{ recipePhotoError }}</span></sc-if>';

const stepButton = (handler: string, label: string, glyph: string) =>
  `<button type="button" sc-camel-on-click="{{ ${handler} }}" aria-label="${label}" style="width:36px;height:36px;border:0;background:none;color:${LABEL};font-family:inherit;font-size:18px;cursor:pointer;padding:0">${glyph}</button>`;

const pills =
  '<div style="display:flex;gap:10px">' +
  pillField({
    label: "Makes",
    tightRight: true,
    value:
      '<span style="display:flex;align-items:center">' +
      stepButton("recipeYieldDown", "One fewer", "−") +
      `<input type="text" inputmode="numeric" value="{{ recipeYield }}" sc-camel-on-change="{{ setRecipeYield }}" aria-label="Makes" style="width:32px;height:36px;padding:0;border:0;background:none;color:${INK};font-family:inherit;font-weight:600;font-size:15px;text-align:center;${TNUM}">` +
      stepButton("recipeYieldUp", "One more", "+") +
      "</span>",
  }) +
  pillField({
    label: "Active time",
    value:
      '<span style="display:flex;align-items:baseline;gap:4px">' +
      `<input type="text" inputmode="numeric" value="{{ recipeMinutes }}" sc-camel-on-change="{{ setRecipeMinutes }}" placeholder="—" aria-label="Active time in minutes" style="width:36px;height:36px;padding:0;border:0;background:none;color:${INK};font-family:inherit;font-weight:600;font-size:15px;text-align:right;${TNUM}">` +
      `<span style="font-size:12px;font-weight:400;color:${MUTED}">min</span></span>`,
  }) +
  "</div>" +
  '<div style="display:flex">' +
  pillField({
    label: "Group",
    onTap: "{{ openGroupSheet }}",
    value:
      `<span style="display:flex;align-items:center;gap:6px;font-size:13px;color:{{ recipeGroupPillColor }}">{{ recipeGroupPill }}${ICON_DOWN}</span>`,
  }) +
  "</div>";

const heading = (title: string, right: string) =>
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 2px;min-height:24px">' +
  `<h6 style="margin:0;font-size:15px;font-weight:700;line-height:1.3">${title}</h6>${right}</div>`;

const addRowButton = (handler: string, label: string) =>
  `<button type="button" sc-camel-on-click="{{ ${handler} }}" style="display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border:0;border-top:1px solid ${HAIRLINE};background:none;padding:0;cursor:pointer;font-family:inherit;color:${OLIVE_700};font-size:13px;font-weight:600">${ICON_PLUS_16}${label}</button>`;

/**
 * One row of the Ingredients card. The swipe-to-remove wrapper is the one the
 * row already had: the red disc underneath, the row on top following the
 * finger. Only the row's own layout is the design's.
 */
const ingredientRow = swipeRow({
  item: "ing",
  sep: `1px solid ${HAIRLINE}`,
  rowStyle: "display:flex;align-items:center;gap:10px;padding:6px 0;min-height:46px;box-sizing:border-box",
  inner:
    '<span style="flex:1;min-width:0;font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ ing.name }}</span>' +
    `<input type="text" inputmode="decimal" value="{{ ing.amt }}" sc-camel-on-change="{{ ing.set }}" aria-label="{{ ing.ariaAmt }}" style="flex:none;width:56px;height:36px;box-sizing:border-box;padding:0 8px;border:1px solid ${BORDER};border-radius:10px;background:${SURFACE};color:${INK};font-family:inherit;font-size:13px;text-align:right;${TNUM}">` +
    `<span style="flex:none;width:18px;font-size:12px;color:${MUTED}">{{ ing.unit }}</span>` +
    `<span style="flex:none;min-width:46px;text-align:right;font-size:13px;color:${LABEL};${TNUM}">{{ ing.costStr }}</span>`,
});

/**
 * The Ingredients heading, and under it either one card of everything or,
 * once the recipe has parts, one card with each part's name and subtotal
 * over its rows (NewRecipeParts.dc.html). The link on the right opens the
 * parts sheet either way: "Split into parts" before, "3 parts · edit" after.
 */
const ingredientHeading = heading(
  "Ingredients",
  `<button type="button" sc-camel-on-click="{{ openPartsSheet }}" style="display:flex;align-items:center;gap:4px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:${OLIVE_700}">${ICON_PARTS}{{ recipePartsLink }}</button>`,
);

const plainCard =
  '<sc-for list="{{ recipeIngGroups }}" as="sec" hint-placeholder-count="1">' +
  '<sc-if value="{{ sec.hasRows }}" hint-placeholder-val="{{ true }}">' +
  `<div style="background:${SURFACE};border-radius:${R_CARD};padding:0 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column;overflow:hidden">` +
  // pulled up a pixel, so the first row's hairline sits under the card's edge
  '<div style="display:flex;flex-direction:column;margin-top:-1px">' +
  `<sc-for list="{{ sec.rows }}" as="ing" hint-placeholder-count="3">${ingredientRow}</sc-for>` +
  "</div>" +
  addRowButton("sec.addHere", "Add more") +
  "</div></sc-if>" +
  '<sc-if value="{{ sec.noRows }}" hint-placeholder-val="{{ false }}">' +
  `<button type="button" sc-camel-on-click="{{ sec.addHere }}" style="display:flex;align-items:center;justify-content:center;gap:8px;min-height:64px;border:1.5px dashed ${OLIVE_DIM};border-radius:${R_CARD};background:${SURFACE};color:${OLIVE_700};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">${ICON_PLUS_18}Add ingredients</button></sc-if>` +
  "</sc-for>";

/** A row under a part: a size smaller, with the ↕ that moves it to another. */
const partRow = swipeRow({
  item: "ing",
  sep: "{{ ing.sep }}",
  rowStyle: "display:flex;align-items:center;gap:8px;padding:4px 0;min-height:44px;box-sizing:border-box",
  inner:
    '<span style="flex:1;min-width:0;font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ ing.name }}</span>' +
    `<input type="text" inputmode="decimal" value="{{ ing.amt }}" sc-camel-on-change="{{ ing.set }}" aria-label="{{ ing.ariaAmt }}" style="flex:none;width:50px;height:32px;box-sizing:border-box;padding:0 6px;border:1px solid ${BORDER};border-radius:10px;background:${SURFACE};color:${INK};font-family:inherit;font-size:12px;text-align:right;${TNUM}">` +
    `<span style="flex:none;width:16px;font-size:11px;color:${MUTED}">{{ ing.unit }}</span>` +
    `<span style="flex:none;min-width:42px;text-align:right;font-size:12px;color:${LABEL};${TNUM}">{{ ing.costStr }}</span>` +
    `<button type="button" sc-camel-on-click="{{ ing.move }}" aria-label="{{ ing.moveAria }}" style="flex:none;width:28px;height:28px;border-radius:50%;border:0;background:none;padding:0;cursor:pointer;color:${HANDLE};display:grid;place-items:center;margin-right:-6px">${ICON_MOVE}</button>`,
});

const partsCard =
  `<div style="background:${SURFACE};border-radius:${R_CARD};padding:0 16px 6px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column;overflow:hidden">` +
  '<sc-for list="{{ recipeIngGroups }}" as="sec" hint-placeholder-count="3">' +
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 0 2px;border-top:{{ sec.labelSep }}">' +
  `<span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${OLIVE}">{{ sec.label }}</span>` +
  `<span style="font-size:11px;color:${MUTED};${TNUM}">{{ sec.subtotal }}</span></div>` +
  `<sc-for list="{{ sec.rows }}" as="ing" hint-placeholder-count="3">${partRow}</sc-for>` +
  `<button type="button" sc-camel-on-click="{{ sec.addHere }}" style="display:flex;align-items:center;gap:6px;min-height:36px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:${OLIVE_700}">${ICON_PLUS_14}{{ sec.addLabel }}</button>` +
  "</sc-for></div>";

const ingredientCards =
  '<div style="display:flex;flex-direction:column;gap:10px">' +
  ingredientHeading +
  `<sc-if value="{{ recipeNoParts }}" hint-placeholder-val="{{ true }}">${plainCard}</sc-if>` +
  `<sc-if value="{{ recipeHasParts }}" hint-placeholder-val="{{ false }}">${partsCard}</sc-if>` +
  "</div>";

const packagingCard =
  '<div style="display:flex;flex-direction:column;gap:10px">' +
  heading("Packaging", `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ recipePackMeta }}</span>`) +
  '<sc-if value="{{ recipeHasPacks }}" hint-placeholder-val="{{ false }}">' +
  `<div style="background:${SURFACE};border-radius:${R_FIELD};padding:0 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column">` +
  '<sc-for list="{{ recipePackRows }}" as="pk" hint-placeholder-count="1">' +
  swipeRow({
    item: "pk",
    sep: "{{ pk.sep }}",
    rowStyle: "display:flex;align-items:center;gap:10px;min-height:44px",
    inner:
      '<span style="flex:1;min-width:0;font-size:14px;font-weight:500">{{ pk.name }}</span>' +
      `<span style="font-size:13px;color:${LABEL};${TNUM}">{{ pk.price }}</span>` +
      `<button type="button" sc-camel-on-click="{{ pk.remove }}" aria-label="{{ pk.aria }}" style="width:32px;height:32px;border-radius:50%;border:0;background:none;color:${HANDLE};font-family:inherit;font-size:18px;line-height:1;cursor:pointer;padding:0;margin-right:-8px">×</button>`,
  }) +
  "</sc-for>" +
  addRowButton("togglePackPicker", "Add more") +
  "</div></sc-if>" +
  '<sc-if value="{{ recipeNoPacks }}" hint-placeholder-val="{{ true }}">' +
  `<button type="button" sc-camel-on-click="{{ togglePackPicker }}" style="display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border:1.5px dashed ${BORDER};border-radius:${R_FIELD};background:${SURFACE};color:${LABEL};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">${ICON_PLUS_16}Add packaging</button></sc-if>` +
  "</div>";

const small = (text: string) => `<span style="font-size:11px;color:${MUTED}">${text}</span>`;

const recipeDock =
  // sticky to the bottom of the scrolling screen, out to its edges
  '<div style="position:sticky;bottom:0;z-index:5;margin:22px -20px -28px">' +
  dock({
    left:
      '<div style="display:flex;flex-direction:column;gap:2px">' +
      '<span style="font-size:11px;font-weight:600">Sells for</span>' +
      '<div style="display:flex;align-items:center;gap:2px">' +
      `<span style="font-size:26px;font-weight:600;color:${MUTED}">{{ currencySymbol }}</span>` +
      `<input type="text" inputmode="decimal" value="{{ recipeSellInput }}" sc-camel-on-change="{{ setRecipeSell }}" placeholder="0.00" aria-label="Sells for" style="width:104px;height:40px;box-sizing:border-box;padding:0 8px;border:1px solid ${BORDER};border-radius:10px;background:${SURFACE};color:${INK};font-family:inherit;font-weight:600;font-size:26px;text-align:right;${TNUM}">` +
      "</div></div>",
    right:
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;text-align:right;min-width:0">' +
      '<sc-if value="{{ dockEmpty }}" hint-placeholder-val="{{ true }}">' +
      small("Each costs") +
      `<span style="font-size:20px;font-weight:600;color:#b9b4a8;line-height:1.2;${TNUM}">—</span>` +
      small("add ingredients to see it") +
      "</sc-if>" +
      '<sc-if value="{{ dockNoYield }}" hint-placeholder-val="{{ false }}">' +
      small("Each costs") +
      `<span style="font-size:20px;font-weight:600;color:#b9b4a8;line-height:1.2;${TNUM}">—</span>` +
      small("say how many it makes") +
      "</sc-if>" +
      '<sc-if value="{{ dockUnpriced }}" hint-placeholder-val="{{ false }}">' +
      small("Each costs") +
      `<span style="font-size:20px;font-weight:600;color:${INK};line-height:1.2;${TNUM}">{{ dockEachCosts }}</span>` +
      small("add a price to see what you earn") +
      "</sc-if>" +
      '<sc-if value="{{ dockPriced }}" hint-placeholder-val="{{ false }}">' +
      small(`Each costs <span style="color:${INK};font-weight:600;${TNUM}">{{ dockEachCosts }}</span>`) +
      `<span style="font-size:22px;font-weight:600;color:{{ dockEarnColor }};line-height:1.2;${TNUM}">{{ dockEarn }}</span>` +
      small("{{ dockMargin }}") +
      "</sc-if></div>",
    button:
      '<sc-if value="{{ recipeSaveError }}" hint-placeholder-val=""><div style="margin-top:-4px;font-size:12px;color:#b0563e">{{ recipeSaveError }}</div></sc-if>' +
      `<button type="button" sc-camel-on-click="{{ saveRecipe }}" style="display:flex;align-items:center;justify-content:center;height:48px;border:0;border-radius:${R_BUTTON};background:{{ recipeSaveBg }};color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">{{ saveRecipeLabel }}</button>`,
  }) +
  "</div>";

function restyleForm(template: string): string {
  const editing = scBlock(template, '<sc-if value="{{ recEditing }}" hint-placeholder-val="{{ true }}">', `${LABEL_} form`);

  const form =
    '<div style="flex:1;display:flex;flex-direction:column;gap:{{ recipeFormGap }};margin-top:14px">' +
    `<div style="display:flex;flex-direction:column;gap:14px">${nameRow}${pills}</div>` +
    ingredientCards +
    packagingCard +
    "</div>" +
    recipeDock;

  return template.slice(0, editing.innerStart) + form + template.slice(editing.innerEnd);
}

/* ------------------------------------------------------------------ sheets */

/** The screen behind a sheet, at 55%. */
const behind = (onTap: string, inner: string) =>
  `<div sc-camel-on-click="{{ ${onTap} }}" style="position:absolute;inset:0;z-index:40;background:rgba(250,246,240,.45)">${inner}</div>`;

const ingredientSheet =
  '<sc-if value="{{ ingPickerOpen }}" hint-placeholder-val="{{ false }}">' +
  behind(
    "cancelIngPicker",
    sheet({
      title: "Add ingredients",
      height: "min(640px, calc(100% - 48px))",
      onClose: "{{ closeIngPicker }}",
      body:
        `<label style="flex:none;display:flex;align-items:center;gap:10px;height:48px;padding:0 16px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};cursor:text">` +
        svg(18, '<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path>', "1.75", MUTED) +
        `<input type="search" value="{{ ingSearch }}" sc-camel-on-change="{{ setIngSearch }}" placeholder="Search your pantry" aria-label="Search your pantry" style="flex:1;min-width:0;border:0;outline:none;background:none;font-family:inherit;font-size:14px;color:${INK}"></label>` +
        '<div style="flex:none;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -20px;padding:0 20px">' +
        '<sc-for list="{{ ingCatFilters }}" as="cf" hint-placeholder-count="4">' +
        '<button type="button" sc-camel-on-click="{{ cf.set }}" style="height:30px;padding:0 11px;flex:none;border:1px solid {{ cf.border }};border-radius:999px;background:{{ cf.bg }};color:{{ cf.color }};font-family:inherit;font-size:11px;font-weight:600;cursor:pointer">{{ cf.label }}</button>' +
        "</sc-for></div>" +
        `<div style="flex:1;min-height:0;overflow:auto;background:${SURFACE};border-radius:${R_CARD};padding:4px 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column">` +
        '<sc-for list="{{ ingPickerItems }}" as="ip" hint-placeholder-count="5">' +
        '<div role="checkbox" aria-checked="{{ ip.ariaChecked }}" tabindex="0" sc-camel-on-click="{{ ip.toggle }}" style="display:flex;align-items:center;gap:12px;padding:12px 0;min-height:52px;box-sizing:border-box;border-top:{{ ip.sep }};cursor:pointer">' +
        `<span style="flex:none;width:22px;height:22px;box-sizing:border-box;border-radius:6px;border:1.5px solid {{ ip.boxBorder }};background:{{ ip.boxBg }};color:${SURFACE};display:grid;place-items:center"><span style="display:grid;opacity:{{ ip.tickOpacity }}">${ICON_TICK}</span></span>` +
        '<span style="flex:1;min-width:0;display:flex;flex-direction:column">' +
        '<span style="font-size:14px;font-weight:500;line-height:1.3">{{ ip.name }}</span>' +
        `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ ip.priceLine }}</span></span>` +
        "</div></sc-for>" +
        `<sc-if value="{{ ingPickerEmpty }}" hint-placeholder-val="{{ false }}"><div style="padding:16px 0;font-size:13px;color:${MUTED};text-align:center">No matching ingredients.</div></sc-if>` +
        "</div>" +
        '<div style="flex:none;padding:0 0 max(30px, env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px">' +
        `<button type="button" sc-camel-on-click="{{ confirmIngPicker }}" style="display:flex;align-items:center;justify-content:center;height:48px;border:0;border-radius:${R_BUTTON};background:{{ ingPickerAddBg }};color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">{{ ingPickerConfirmLabel }}</button>` +
        `<button type="button" sc-camel-on-click="{{ createIngredientFromPicker }}" style="display:flex;align-items:center;justify-content:center;min-height:36px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:${OLIVE_700}">Not in your pantry? Create a new ingredient</button>` +
        "</div>",
    }),
  ) +
  "</sc-if>";

const groupSheet =
  '<sc-if value="{{ groupSheetOpen }}" hint-placeholder-val="{{ false }}">' +
  behind(
    "closeGroupSheet",
    sheet({
      title: "Which group?",
      sub: "How your recipes are sorted and filtered",
      label: "Choose a group",
      height: "auto",
      onClose: "{{ dismissGroupSheet }}",
      body:
        `<div style="flex:none;max-height:min(420px, 52vh);overflow:auto;background:${SURFACE};border-radius:${R_CARD};padding:0 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column">` +
        '<sc-for list="{{ groupSheetRows }}" as="g" hint-placeholder-count="5">' +
        '<button type="button" sc-camel-on-click="{{ g.pick }}" aria-pressed="{{ g.on }}" style="flex:none;display:flex;align-items:center;gap:12px;min-height:52px;border:0;border-top:{{ g.sep }};background:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;color:{{ g.color }}">' +
        '<span style="flex:1;font-size:14px;font-weight:{{ g.weight }}">{{ g.label }}</span>' +
        `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ g.meta }}</span>` +
        `<sc-if value="{{ g.on }}" hint-placeholder-val="{{ false }}">${ICON_CHECK}</sc-if>` +
        "</button></sc-for></div>" +
        '<div style="flex:none;padding:0 0 max(30px, env(safe-area-inset-bottom))">' +
        `<button type="button" sc-camel-on-click="{{ openNewGroup }}" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border:1.5px dashed ${OLIVE_DIM};border-radius:${R_FIELD};background:${SURFACE};color:${OLIVE_700};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">${ICON_PLUS_16}Add new group</button>` +
        "</div>",
    }),
  ) +
  "</sc-if>";

const newGroupDialog =
  '<sc-if value="{{ groupAddOpen }}" hint-placeholder-val="{{ false }}">' +
  `<div style="position:absolute;inset:0;z-index:41;background:${SCRIM};display:flex;align-items:center;justify-content:center;padding:20px">` +
  `<div role="dialog" aria-modal="true" aria-label="Add a new group" style="width:100%;max-width:340px;background:${BG};border-radius:${R_CARD};padding:22px;box-shadow:0 6px 18px rgba(60,55,30,.10);display:flex;flex-direction:column;gap:16px;box-sizing:border-box">` +
  '<div style="display:flex;flex-direction:column;gap:4px">' +
  '<h2 style="margin:0;font-size:20px;font-weight:600;line-height:1.3">New group</h2>' +
  `<p style="margin:0;font-size:13px;line-height:1.5;color:${LABEL}">This recipe goes in it right away. You can edit groups in Settings.</p></div>` +
  '<div style="display:flex;flex-direction:column;gap:6px">' +
  '<span style="font-size:11px;font-weight:600">Group name</span>' +
  `<input type="text" value="{{ newGroupName }}" sc-camel-on-change="{{ setNewGroupName }}" placeholder="e.g. Pies" aria-label="Group name" style="width:100%;box-sizing:border-box;height:52px;padding:0 16px;border:1px solid ${BORDER};border-radius:${R_FIELD};background:${SURFACE};color:${INK};font-family:inherit;font-weight:600;font-size:18px"></div>` +
  '<sc-if value="{{ newGroupHasSuggestions }}" hint-placeholder-val="{{ true }}">' +
  '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">' +
  `<span style="font-size:11px;color:${MUTED};width:100%">Suggestions</span>` +
  '<sc-for list="{{ newGroupSuggestions }}" as="s" hint-placeholder-count="4">' +
  `<button type="button" sc-camel-on-click="{{ s.pick }}" style="height:32px;padding:0 12px;border:1px solid ${BORDER};border-radius:999px;background:${SURFACE};color:${INK};font-family:inherit;font-size:12px;font-weight:600;cursor:pointer">{{ s.label }}</button>` +
  "</sc-for></div></sc-if>" +
  '<div style="display:flex;gap:10px;margin-top:4px">' +
  `<button type="button" sc-camel-on-click="{{ backToGroupSheet }}" style="flex:1;height:48px;border:1px solid ${BORDER};border-radius:${R_BUTTON};background:${SURFACE};color:${INK};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">Cancel</button>` +
  `<button type="button" sc-camel-on-click="{{ confirmAddGroup }}" style="flex:1;height:48px;border:0;border-radius:${R_BUTTON};background:{{ newGroupCreateBg }};color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">Create group</button>` +
  "</div></div></div></sc-if>";

/** RecipeParts.dc.html: name the parts, add one, take one away. */
const partsSheet =
  '<sc-if value="{{ partsSheetOpen }}" hint-placeholder-val="{{ false }}">' +
  behind(
    "closePartsSheet",
    sheet({
      title: "Parts of this recipe",
      sub: "Group the ingredients by what they make",
      height: "auto",
      onClose: "{{ dismissPartsSheet }}",
      body:
        '<sc-if value="{{ partsHasRows }}" hint-placeholder-val="{{ true }}">' +
        `<div style="flex:none;max-height:min(260px, 34vh);overflow:auto;background:${SURFACE};border-radius:${R_CARD};padding:0 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column">` +
        '<sc-for list="{{ partsRows }}" as="pr" hint-placeholder-count="3">' +
        '<div style="flex:none;display:flex;align-items:center;gap:12px;min-height:52px;border-top:{{ pr.sep }}">' +
        `<span style="flex:none;width:36px;height:36px;border-radius:10px;background:#eef0dd;color:${OLIVE_700};display:grid;place-items:center">${svg(18, '<rect x="3" y="4" width="18" height="6" rx="2"></rect><rect x="3" y="14" width="18" height="6" rx="2"></rect>')}</span>` +
        `<input type="text" value="{{ pr.name }}" sc-camel-on-change="{{ pr.setName }}" aria-label="Part name" style="flex:1;min-width:0;height:36px;border:0;background:none;color:${INK};font-family:inherit;font-size:14px;font-weight:500;padding:0">` +
        `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ pr.count }}</span>` +
        `<button type="button" sc-camel-on-click="{{ pr.remove }}" aria-label="{{ pr.aria }}" style="width:28px;height:28px;border-radius:50%;border:0;background:none;color:${HANDLE};font-family:inherit;font-size:18px;line-height:1;cursor:pointer;padding:0;margin-right:-8px">×</button>` +
        "</div></sc-for></div></sc-if>" +
        '<div style="flex:none;display:flex;align-items:center;gap:8px">' +
        `<input type="text" value="{{ newPartName }}" sc-camel-on-change="{{ setNewPartName }}" sc-camel-on-key-down="{{ addNewPartOnEnter }}" placeholder="New part, e.g. Glaze" aria-label="New part name" style="flex:1;min-width:0;height:44px;box-sizing:border-box;padding:0 16px;border:1px solid ${BORDER};border-radius:${R_BUTTON};background:${SURFACE};color:${INK};font-family:inherit;font-size:13px">` +
        `<button type="button" sc-camel-on-click="{{ addNewPart }}" style="flex:none;height:44px;padding:0 16px;border:1px solid ${BORDER};border-radius:${R_BUTTON};background:${SURFACE};color:{{ newPartAddColor }};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">Add</button>` +
        "</div>" +
        '<sc-if value="{{ partSuggestionsShown }}" hint-placeholder-val="{{ true }}">' +
        '<div style="flex:none;display:flex;flex-wrap:wrap;gap:8px;align-items:center">' +
        `<span style="font-size:11px;color:${MUTED};width:100%">Common parts</span>` +
        '<sc-for list="{{ partSuggestions }}" as="s" hint-placeholder-count="4">' +
        `<button type="button" sc-camel-on-click="{{ s.pick }}" style="height:32px;padding:0 12px;border:1px solid ${BORDER};border-radius:999px;background:${SURFACE};color:${INK};font-family:inherit;font-size:12px;font-weight:600;cursor:pointer">{{ s.label }}</button>` +
        "</sc-for></div></sc-if>" +
        `<div style="flex:none;font-size:12px;color:${MUTED};padding:0 2px">Ingredients already in the recipe land in the first part. Move any of them from its row. Costs still add up for the whole batch.</div>` +
        '<div style="flex:none;padding:0 0 max(30px, env(safe-area-inset-bottom))">' +
        `<button type="button" sc-camel-on-click="{{ dismissPartsSheet }}" style="width:100%;display:flex;align-items:center;justify-content:center;height:48px;border:0;border-radius:${R_BUTTON};background:${OLIVE};color:${SURFACE};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">Done</button>` +
        "</div>",
    }),
  ) +
  "</sc-if>";

/** MovePart.dc.html: which part a line belongs to. */
const moveSheet =
  '<sc-if value="{{ moveSheetOpen }}" hint-placeholder-val="{{ false }}">' +
  behind(
    "closeMoveSheet",
    sheet({
      title: "{{ moveTitle }}",
      sub: "Which part does it belong to?",
      height: "auto",
      onClose: "{{ dismissMoveSheet }}",
      body:
        `<div style="flex:none;max-height:min(320px, 40vh);overflow:auto;background:${SURFACE};border-radius:${R_CARD};padding:0 16px;box-shadow:${CARD_SHADOW};display:flex;flex-direction:column">` +
        '<sc-for list="{{ moveRows }}" as="mv" hint-placeholder-count="3">' +
        '<button type="button" sc-camel-on-click="{{ mv.pick }}" aria-pressed="{{ mv.on }}" style="flex:none;display:flex;align-items:center;gap:12px;min-height:50px;border:0;border-top:{{ mv.sep }};background:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;color:{{ mv.color }}">' +
        '<span style="flex:1;font-size:14px;font-weight:{{ mv.weight }}">{{ mv.label }}</span>' +
        `<sc-if value="{{ mv.on }}" hint-placeholder-val="{{ false }}">${ICON_CHECK}</sc-if>` +
        "</button></sc-for></div>" +
        `<button type="button" sc-camel-on-click="{{ moveNewPart }}" style="flex:none;display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border:1.5px dashed ${OLIVE_DIM};border-radius:${R_BUTTON};background:${SURFACE};color:${OLIVE_700};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">${ICON_PLUS_16}New part</button>` +
        `<div style="flex:none;font-size:12px;color:${MUTED};padding:0 2px 0;margin-bottom:max(30px, env(safe-area-inset-bottom))">The same ingredient can sit in more than one part with its own amount — add it again from the other part.</div>`,
    }),
  ) +
  "</sc-if>";

function replacePickers(template: string): string {
  const picker = scBlock(template, '<sc-if value="{{ ingPickerOpen }}" hint-placeholder-val="{{ false }}">', `${LABEL_} ingredient picker`);
  return template.slice(0, picker.start) + ingredientSheet + groupSheet + newGroupDialog + partsSheet + moveSheet + template.slice(picker.end);
}

export function applyRecipeEditorBehavior(template: string): string {
  return replacePickers(restyleForm(restyleHeader(addBindings(template))));
}

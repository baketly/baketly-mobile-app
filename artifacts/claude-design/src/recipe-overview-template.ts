// A saved recipe, read before it is edited.
//
// design/mobile-redesign/screens/RecipeOverview.dc.html: the recipe's photo
// or icon and name, then the fact strip -- sells for, costs, margin -- then
// cards: its ingredients (each opens that ingredient), its packaging, its
// macros. No paragraph explaining the margin and no button bar at the foot;
// Edit and Delete are the round buttons in the header, drawn with the rest
// of the header in recipe-editor-template.ts.
//
// Delete opens DeleteConfirm.dc.html, which says what goes with the recipe:
// the planned events whose lineups it leaves, and that sales already
// recorded keep their numbers -- each sale holds its own price and cost, so
// nothing about a past market changes.

import { card, deleteDialog, factStrip } from "./design/pieces";
import { INK, LABEL, MUTED, OLIVE_700, OLIVE_SOFT, HAIRLINE, R_FIELD, TNUM } from "./design/tokens";
import { scBlock, swapOnce } from "./template-blocks";

const LABEL_ = "Recipe overview";

/** Views over the editor's own values; recipe, keys, amt, per and the rest are its locals. */
const overviewBindings = `          recipeTitle: recipe.name,
          ...(() => {
            const price = Number(recipe.price || 0);
            const group = this.recipeGroupOf(recipe);
            const sep = i => i ? '1px solid ${HAIRLINE}' : '0';
            // "180 g", "2" -- pieces carry no unit
            const amountOf = k => (Math.round(amt(k) * 100) / 100) + (this.ING_META[k].unit && this.ING_META[k].unit !== 'pc' ? ' ' + this.ING_META[k].unit : '');
            const openIngredient = key => () => this.setState(st => ({ screen: 'ingredientEdit', stack: this.stackTo(st, 'ingredientEdit'), activeIngredientKey: key, ingredientDraft: null, ingredientSaveError: '', ingredientDeleteOpen: false, fromScan: false }));
            const openPackaging = key => () => this.setState(st => ({ screen: 'packagingEdit', stack: this.stackTo(st, 'packagingEdit'), activePackagingKey: key, packagingDraft: null, packagingDeleteOpen: false, packagingSaveError: '' }));

            // stackTo is ingredient-overview-template.ts's; see there
            // the costliest first; past five, the rest fold into one row that
            // names them and opens the full list
            const byCost = keys
              .map(k => ({ key: k, name: this.ING_META[k].name, cost: amt(k) * this.ING_META[k].per }))
              .sort((a, b) => b.cost - a.cost);
            const showAll = this.state.recOverviewAllIngs === true || byCost.length <= 5;
            const shown = showAll ? byCost : byCost.slice(0, 4);
            const rest = showAll ? [] : byCost.slice(4);
            const ingRowsOv = shown.map((r, i) => ({
              label: r.name + ' \\u00b7 ' + amountOf(r.key), cost: CUR + r.cost.toFixed(2),
              color: '${INK}', sep: sep(i), open: openIngredient(r.key)
            }));
            if (rest.length) {
              ingRowsOv.push({
                label: rest.slice(0, 4).map((r, i) => i ? r.name.toLowerCase() : r.name).join(', ') + ' \\u00b7 ' + rest.length + ' more',
                cost: CUR + rest.reduce((sum, r) => sum + r.cost, 0).toFixed(2),
                color: '${LABEL}', sep: sep(1), open: () => this.setState({ recOverviewAllIngs: true })
              });
            }

            const sub = ['makes ' + y];
            if (group !== 'none') sub.push(this.recipeGroupName(group));
            if (minutes > 0) sub.push(minutes + ' min');

            // The planned events this recipe is on. Their lineups are drawn
            // from the recipes that exist, so it leaves them with the recipe.
            const planned = (Array.isArray(this.state.eventRecords) ? this.state.eventRecords : [])
              .filter(ev => ev && ev.status === 'planned' && (ev.plannedItems || []).some(item => item && item.productId === recipe.id))
              .map(ev => String(ev.name || '').trim() || 'Market');
            const whose = n => n + (/s$/i.test(n) ? "'" : "'s");
            const lineups = !planned.length ? ''
              : planned.length === 1 ? 'It comes off ' + whose(planned[0]) + ' lineup. '
              : planned.length === 2 ? 'It comes off the lineups of ' + planned[0] + ' and ' + planned[1] + '. '
              : 'It comes off the lineups of ' + planned.length + ' planned events. ';

            return {
              ovSub: sub.join(' \\u00b7 '),
              ovIconEl: recipe.photo
                ? React.createElement('img', { src: recipe.photo, alt: '', style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } })
                : React.createElement('span', { style: { display: 'grid' }, dangerouslySetInnerHTML: { __html: this.REC_ICONS[recipe.icon] || this.REC_ICONS.cake || '' } }),
              ovSell: price > 0 ? CUR + price.toFixed(2) : '\\u2014',
              ovCost: CUR + per.toFixed(2),
              ovMargin: price > 0 ? Math.round((price - per) / price * 100) + '%' : '\\u2014',
              ovMarginColor: price > 0 && price < per ? '#b07a1f' : '${OLIVE_700}',
              ovIngMeta: 'batch ' + CUR + ingTotal.toFixed(2),
              ovHasIngs: keys.length > 0,
              ovNoIngs: keys.length === 0,
              ovIngRows: ingRowsOv,
              ovHasPacks: packs.length > 0,
              ovPackMeta: CUR + packPer.toFixed(2) + ' each',
              ovPackRows: packs.map((k, i) => ({
                label: this.PACK_META[k].name, cost: CUR + this.PACK_META[k].per.toFixed(2),
                color: '${INK}', sep: sep(i), open: openPackaging(k)
              })),
              recipeDeleteBody: lineups + "Sales you've already recorded keep their numbers. This cannot be undone."
            };
          })(),
`;

/** A tappable row: what it is on the left, what it costs on the right. */
const rowLoop = (list: string) =>
  `<sc-for list="{{ ${list} }}" as="r" hint-placeholder-count="3">` +
  '<button type="button" sc-camel-on-click="{{ r.open }}" style="display:flex;align-items:center;gap:12px;min-height:44px;border:0;border-top:{{ r.sep }};background:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;color:{{ r.color }};font-size:13px">' +
  '<span style="flex:1;min-width:0">{{ r.label }}</span>' +
  `<span style="font-weight:500;${TNUM}">{{ r.cost }}</span></button></sc-for>`;

const macroCell = (label: string, value: string, first = false) =>
  `<div style="padding:10px 8px;${first ? "" : `border-left:1px solid ${HAIRLINE};`}display:flex;flex-direction:column;gap:2px;align-items:center">` +
  `<div style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${LABEL}">${label}</div>` +
  `<div style="font-weight:600;font-size:14px;${TNUM}">${value}</div></div>`;

const overview =
  '<div style="display:flex;flex-direction:column;gap:20px;margin-top:14px">' +
  // hero
  '<div style="display:flex;align-items:center;gap:14px">' +
  `<div style="position:relative;flex:none;width:56px;height:56px;border-radius:${R_FIELD};background:${OLIVE_SOFT};color:${OLIVE_700};display:grid;place-items:center;overflow:hidden">{{ ovIconEl }}</div>` +
  '<div style="min-width:0;display:flex;flex-direction:column">' +
  '<h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25">{{ recipeTitle }}</h1>' +
  `<div style="font-size:12px;color:${MUTED};${TNUM}">{{ ovSub }}</div></div></div>` +
  factStrip([
    { label: "Sells for", value: "{{ ovSell }}" },
    { label: "Costs", value: "{{ ovCost }}" },
    { label: "Margin", value: '<span style="color:{{ ovMarginColor }}">{{ ovMargin }}</span>' },
  ]) +
  '<sc-if value="{{ ovHasIngs }}" hint-placeholder-val="{{ true }}">' +
  card({ title: "Ingredients", meta: "{{ ovIngMeta }}", loop: rowLoop("ovIngRows") }) +
  "</sc-if>" +
  '<sc-if value="{{ ovNoIngs }}" hint-placeholder-val="{{ false }}">' +
  card({ title: "Ingredients", rows: [`<div style="min-height:44px;display:flex;align-items:center;font-size:13px;color:${LABEL}">None yet. Tap the pencil to add them.</div>`] }) +
  "</sc-if>" +
  '<sc-if value="{{ ovHasPacks }}" hint-placeholder-val="{{ true }}">' +
  card({ title: "Packaging", meta: "{{ ovPackMeta }}", loop: rowLoop("ovPackRows"), radius: R_FIELD }) +
  "</sc-if>" +
  '<div style="display:flex;flex-direction:column;gap:10px">' +
  '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:0 2px">' +
  '<h6 style="margin:0;font-size:15px;font-weight:700;line-height:1.3">Macros</h6>' +
  `<span style="font-size:12px;color:${MUTED}">each</span></div>` +
  `<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border:1px solid ${HAIRLINE};border-radius:18px;background:#ffffff;overflow:hidden">` +
  macroCell("kcal", "{{ macroKcal }}", true) +
  macroCell("Protein", "{{ macroProtein }}") +
  macroCell("Carbs", "{{ macroCarbs }}") +
  macroCell("Fat", "{{ macroFat }}") +
  macroCell("Sugar", "{{ macroSugar }}") +
  "</div></div>" +
  "</div>";

function addBindings(template: string): string {
  let out = swapOnce(template, "          recipeTitle: recipe.name,\n", overviewBindings, `${LABEL_} bindings`);
  // "5 g" as the design writes it; only the recipe screen shows these
  out = swapOnce(out, "const grams = value => Math.round(each(value)) + 'g';", "const grams = value => Math.round(each(value)) + ' g';", `${LABEL_} grams`);
  return swapOnce(out, "macroProtein: keys.length ? grams(totals.protein) : '0g',", "macroProtein: keys.length ? grams(totals.protein) : '0 g',", `${LABEL_} zero grams`)
    .split("keys.length ? grams(totals.carbs) : '0g'").join("keys.length ? grams(totals.carbs) : '0 g'")
    .split("keys.length ? grams(totals.fat) : '0g'").join("keys.length ? grams(totals.fat) : '0 g'")
    .split("keys.length ? grams(totals.sugar) : '0g'").join("keys.length ? grams(totals.sugar) : '0 g'");
}

function replacePreview(template: string): string {
  const preview = scBlock(template, '<sc-if value="{{ recPreviewing }}" hint-placeholder-val="{{ false }}">', `${LABEL_} preview`);
  return template.slice(0, preview.innerStart) + overview + template.slice(preview.innerEnd);
}

function replaceDeleteDialog(template: string): string {
  const dialog = scBlock(template, '<sc-if value="{{ recipeDeleteOpen }}" hint-placeholder-val="{{ false }}">', `${LABEL_} delete dialog`);
  return (
    template.slice(0, dialog.start) +
    deleteDialog({
      open: "{{ recipeDeleteOpen }}",
      label: "Delete this recipe",
      title: "Delete {{ recipeTitle }}?",
      body: "{{ recipeDeleteBody }}",
      onKeep: "{{ cancelDeleteRecipe }}",
      onDelete: "{{ confirmDeleteRecipe }}",
    }) +
    template.slice(dialog.end)
  );
}

export function applyRecipeOverviewBehavior(template: string): string {
  return replaceDeleteDialog(replacePreview(addBindings(template)));
}

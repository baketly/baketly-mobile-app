// A saved packaging item, read before it is edited.
//
// design/mobile-redesign/screens/PackagingOverview.dc.html: name with its
// supplier and pack size, the fact strip, the recipes that use it (each opens
// that recipe) with how many of them sold this month, and what it took this
// month. No paragraph, no button bar; Edit and Delete are the round buttons
// in the header. The form behind the pencil is unchanged for now.
//
// One difference from the design: its strip ends in "Updated", the date the
// pack price last changed. Packaging keeps no record of that -- only
// ingredients have a price history -- so the strip ends in what one costs.
//
// "This month" counts what was rung up: each recipe that uses it, times how
// many of that recipe sold, at one apiece -- packaging goes on a recipe once
// per piece. What it cost is at today's price.
//
// Delete opens DeleteConfirm.dc.html, and says what deleting does: it comes
// off every recipe that uses it, so each of those costs that much less on
// paper, while sales already recorded keep their numbers.

import { card, deleteDialog, factStrip } from "./design/pieces";
import { INK, HANDLE, HAIRLINE, LABEL, MUTED, OLIVE_700, OLIVE_SOFT, R_FIELD, SURFACE, GOLD, TNUM } from "./design/tokens";
import { itemActions } from "./item-mode-template";
import { scBlock, swapOnce } from "./template-blocks";

const LABEL_ = "Packaging overview";

const svg = (size: number, paths: string) =>
  `<svg width="${size}" height="${size}" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

/** Views over the packaging controller's own values: active, activeKey, CUR. */
const overviewBindings = `          packagingTitle: activeKey ? 'Edit packaging' : 'New packaging',
          ...(() => {
            const key = activeKey || '';
            const per = active.unitsPerPack > 0 ? active.packPrice / active.unitsPerPack : 0;
            const recipes = (Array.isArray(this.state.recipeRecords) ? this.state.recipeRecords : [])
              .filter(r => key && (r.packagingKeys || []).includes(key));
            // pieces of each recipe rung up this month
            const now = new Date();
            const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
            const sold = {};
            (Array.isArray(this.state.saleRecords) ? this.state.saleRecords : []).forEach(sale => {
              if (!sale || !sale.occurredAt) return;
              const d = new Date(sale.occurredAt);
              if (isNaN(d.getTime()) || d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') !== month) return;
              (sale.lineItems || []).forEach(line => { if (line && line.productId) sold[line.productId] = (sold[line.productId] || 0) + (Number(line.quantity) || 0); });
            });
            const used = recipes.reduce((sum, r) => sum + (sold[r.id] || 0), 0);
            const names = recipes.map(r => String(r.name || '').trim() || 'Untitled recipe');
            // named while they fit in a sentence; past three, counted
            const list = names.length <= 2 ? names.join(' and ')
              : names.length === 3 ? names[0] + ', ' + names[1] + ' and ' + names[2]
              : 'the ' + names.length + ' recipes that use it';
            const units = Number(active.unitsPerPack) || 0;
            return {
              packBackLabel: (Array.isArray(this.state.stack) && this.state.stack[this.state.stack.length - 1] === 'recipeEditor') ? 'Recipe' : 'Pantry',
              packOvSub: [String(active.supplier || '').trim(), units > 0 ? 'pack of ' + units.toLocaleString('en-US') : ''].filter(Boolean).join(' \\u00b7 ') || 'No supplier yet',
              packOvPack: active.packPrice > 0 ? CUR + Number(active.packPrice).toFixed(2) : '\\u2014',
              packOvUnits: units > 0 ? units.toLocaleString('en-US') : '\\u2014',
              packOvEach: per > 0 ? CUR + per.toFixed(2) : '\\u2014',
              packOvUsed: recipes.length > 0,
              packOvUnused: recipes.length === 0,
              packOvUsedMeta: recipes.length + (recipes.length === 1 ? ' recipe' : ' recipes'),
              packOvRecipes: recipes.map((r, i) => ({
                name: String(r.name || '').trim() || 'Untitled recipe',
                note: 'one each \\u00b7 ' + (sold[r.id] || 0) + ' sold this month',
                cost: CUR + per.toFixed(2),
                sep: i ? '1px solid ${HAIRLINE}' : '0',
                open: () => this.setState(st => ({ screen: 'recipeEditor', stack: this.stackTo(st, 'recipeEditor'), activeRecipeId: r.id, recipeDraft: null, recipeDeleteOpen: false, ingPickerOpen: false, packPickerOpen: false, editingKey: '' }))
              })),
              packOvMonth: now.toLocaleString('en-US', { month: 'long' }),
              packOvMonthUsed: used.toLocaleString('en-US'),
              packOvMonthSpent: CUR + (used * per).toFixed(2),
              packagingDeleteBody: (recipes.length
                ? 'It comes off ' + list + ', so ' + (recipes.length === 1 ? 'it costs ' : 'each costs ') + CUR + per.toFixed(2) + ' less on paper until you add something in its place. '
                : 'No recipe uses it, so nothing else changes. ')
                + "Sales you've already recorded keep their numbers. This cannot be undone."
            };
          })(),
`;

const round = (handler: string, label: string, color: string, paths: string) =>
  `<button type="button" sc-camel-on-click="{{ ${handler} }}" aria-label="${label}" style="width:40px;height:40px;border-radius:50%;border:0;padding:0;cursor:pointer;background:${SURFACE};color:${color};display:grid;place-items:center">${svg(16, paths)}</button>`;

const header =
  `<button type="button" sc-camel-on-click="{{ cancelPackagingEdit }}" style="display:flex;align-items:center;gap:4px;min-height:44px;margin-left:-4px;border:0;background:none;padding:0;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:${OLIVE_700}">${svg(16, '<path d="M15 6l-6 6 6 6"></path>')}{{ packBackLabel }}</button>` +
  `<sc-if value="{{ packPreviewing }}" hint-placeholder-val="{{ true }}"><span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${GOLD}">Packaging</span></sc-if>` +
  // keeps its width when empty, so the kicker stays centred
  '<div style="display:flex;gap:6px;flex:none;min-width:64px;justify-content:flex-end">' +
  // the form has no delete: delete belongs to the saved item, here
  '<sc-if value="{{ packPreviewing }}" hint-placeholder-val="{{ true }}">' +
  round("editPackaging", "Edit packaging", INK, '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path>') +
  round("requestDeletePackaging", "Delete this packaging", "#b0563e", '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"></path>') +
  "</sc-if></div>";

const usedByRow =
  '<sc-for list="{{ packOvRecipes }}" as="r" hint-placeholder-count="2">' +
  '<button type="button" sc-camel-on-click="{{ r.open }}" style="display:flex;align-items:center;gap:12px;min-height:52px;border:0;border-top:{{ r.sep }};background:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;color:inherit">' +
  '<div style="flex:1;min-width:0;display:flex;flex-direction:column">' +
  '<span style="font-size:14px;font-weight:500;line-height:1.3">{{ r.name }}</span>' +
  `<span style="font-size:12px;color:${MUTED};${TNUM}">{{ r.note }}</span></div>` +
  `<span style="font-size:13px;font-weight:600;${TNUM}">{{ r.cost }}</span>` +
  svg(16, '<path d="M9 6l6 6-6 6"></path>').replace('stroke="currentColor"', `stroke="${HANDLE}"`) +
  "</button></sc-for>";

const overview =
  '<div style="display:flex;flex-direction:column;gap:22px;margin-top:14px">' +
  '<div style="display:flex;align-items:center;gap:14px">' +
  `<div style="flex:none;width:56px;height:56px;border-radius:${R_FIELD};background:${OLIVE_SOFT};color:${OLIVE_700};display:grid;place-items:center">` +
  svg(22, '<rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M3 11h18M12 7v13"></path>') + "</div>" +
  '<div style="min-width:0;display:flex;flex-direction:column">' +
  '<h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.25">{{ packagingName }}</h1>' +
  `<div style="font-size:12px;color:${MUTED};${TNUM}">{{ packOvSub }}</div></div></div>` +
  factStrip([
    { label: "Pack", value: "{{ packOvPack }}" },
    { label: "Units", value: "{{ packOvUnits }}" },
    { label: "Each", value: "{{ packOvEach }}" },
  ]) +
  '<sc-if value="{{ packOvUsed }}" hint-placeholder-val="{{ true }}">' +
  card({ title: "Used by", meta: "{{ packOvUsedMeta }}", loop: usedByRow }) +
  '<div style="display:flex;flex-direction:column;gap:10px">' +
  '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:0 2px">' +
  '<h6 style="margin:0;font-size:15px;font-weight:700;line-height:1.3">This month</h6>' +
  `<span style="font-size:12px;color:${MUTED}">{{ packOvMonth }}</span></div>` +
  factStrip([
    { label: "Used", value: "{{ packOvMonthUsed }}" },
    { label: "Spent on it", value: "{{ packOvMonthSpent }}" },
  ]) +
  "</div></sc-if>" +
  '<sc-if value="{{ packOvUnused }}" hint-placeholder-val="{{ false }}">' +
  card({ title: "Used by", rows: [`<div style="min-height:44px;display:flex;align-items:center;font-size:13px;color:${LABEL}">Not on any recipe yet.</div>`] }) +
  "</sc-if>" +
  "</div>";

function addBindings(template: string): string {
  return swapOnce(template, "          packagingTitle: activeKey ? 'Edit packaging' : 'New packaging',\n", overviewBindings, `${LABEL_} bindings`);
}

function restyleHeader(template: string): string {
  return swapOnce(
    template,
    '<button class="btn btn-ghost" sc-camel-on-click="{{ cancelPackagingEdit }}" style="margin-left:-6px;min-height:44px">‹ Packaging</button>' +
      itemActions("editPackaging", "requestDeletePackaging", "packaging", "packPreviewing", "packagingExisting"),
    header,
    `${LABEL_} header`,
  );
}

function replacePreview(template: string): string {
  const preview = scBlock(template, '<sc-if value="{{ packPreviewing }}" hint-placeholder-val="{{ false }}">', `${LABEL_} preview`);
  return template.slice(0, preview.innerStart) + overview + template.slice(preview.innerEnd);
}

function replaceDeleteDialog(template: string): string {
  const dialog = scBlock(template, '<sc-if value="{{ packagingDeleteOpen }}" hint-placeholder-val="{{ false }}">', `${LABEL_} delete dialog`);
  return (
    template.slice(0, dialog.start) +
    deleteDialog({
      open: "{{ packagingDeleteOpen }}",
      label: "Delete this packaging",
      title: "Delete {{ packagingDeleteName }}?",
      body: "{{ packagingDeleteBody }}",
      onKeep: "{{ cancelDeletePackaging }}",
      onDelete: "{{ confirmDeletePackaging }}",
    }) +
    template.slice(dialog.end)
  );
}

export function applyPackagingOverviewBehavior(template: string): string {
  return replaceDeleteDialog(replacePreview(restyleHeader(addBindings(template))));
}

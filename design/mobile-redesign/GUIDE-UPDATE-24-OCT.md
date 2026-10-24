# Redesign update, 24 Oct — only the new changes

Use this if you've already built screens from the first guide. It covers only
what changed on the canvas after that. Same rules as before: one prompt at a
time, paste as-is, look at the screen before moving on.

## 0 — Get the new files

On the computer, in the repo:

```bash
git fetch origin
git checkout design/mobile-redesign-2026-10
git pull
```

Then open Claude Code in that folder and paste:

> I pulled new design files into `design/mobile-redesign/`. Read the README's
> screen map again, especially the rows for `CategoryPicker`, `ShoppingList`,
> `ShareSheet`, the three `*Print` files, `BakePlan`, `PackPlan` and
> `EventDone`. The screens I've already built stay as they are except for the
> small fixes I'll give you one by one. Don't change anything yet; tell me in
> a few lines what's new compared to what's in the code.

---

## 1 — Small fixes to screens you already built

Paste these one at a time.

**Ingredient overview**

> In the ingredient overview, the line under the name is plain text,
> `Category · Supplier` (e.g. "Chocolate · Costco"), with no picker or
> dropdown on it. Match `screens/IngredientOverview.dc.html`. Show me.

**Recipe overview**

> In the recipe overview, the small gold kicker at the top reads "Recipe",
> not the recipe's group name. Match `screens/RecipeOverview.dc.html` and
> `screens/DeleteConfirm.dc.html`. Show me.

**Nearby prices entry point**

> On the Pantry › Recipes tab, remove the "Nearby prices" row above the
> search. Instead, put a round 40px white button with the map-pin icon to the
> left of the green + in the header, as in `screens/PantryRecipes.dc.html`.
> It shows a small amber dot when any recipe is out of range, and opens
> Nearby prices. Show me.

**Wording**

> In everything to do with nearby prices, say "out of range", never "out of
> step" (see `screens/NearbyPrices.dc.html`, the middle box of the strip).
> Search the code for "out of step" and replace it. Show me what you changed.

**Event overview — Getting ready rows**

> In the event overview, the three Getting ready rows (Shopping list, Bake,
> Pack and label) each get an olive chevron and the short sub-lines from
> `screens/EventOverview.dc.html` ("11 items · all bought", "6 batches · 3
> recipes", "52 boxes · 52 labels"). Bake and Pack and label will open new
> screens we build next; route them to placeholders for now. Show me.

---

## 2 — Ingredient categories

> Make ingredient categories an editable list that works exactly like recipe
> groups. In the new-ingredient screen (`screens/PantryIngredient.dc.html`)
> the Category pill opens the sheet in `screens/CategoryPicker.dc.html`:
> every category with its ingredient count, "Other", and "Add new category",
> which opens the dialog in `screens/NewCategory.dc.html` (placeholder "Enter
> category name", suggestion chips). Reuse the recipe-group picker code rather
> than writing a second one. Show me.

> In Settings › General, add an "Ingredient categories" chip box right under
> the recipe groups, as in `screens/Settings.dc.html`: one chip per category,
> an add field ("New category, e.g. Nuts"), and the note "Removing a category
> moves its ingredients to Other." — which is also what removing must do.
> Show me.

---

## 3 — Shopping list

> Restyle the event shopping list to `screens/ShoppingList.dc.html`: hero,
> the Items / Bought / About strip with the progress bar ("4 of 11 bought ·
> 2 days until the market"), Ingredients and Packaging cards (tick box, name
> struck through when bought, the package line like "3 packs of 454 g", the
> amber "Need 16 · you have 6" when short, the editable amount + unit), and
> "Reset amounts to the lineup" at the bottom. Keep the existing `shopNeed`
> logic. Leave the share button in the header for step 6. Show me.

---

## 4 — Bake

> Build the Bake screen from `screens/BakePlan.dc.html`, opened from Getting
> ready › Bake. Strip: Batches, Recipes, Active time (each recipe's active
> time × its batches, summed). One card per lineup recipe: tick box, name,
> "2 batches of 9 · makes 18 loaves", "Active 30 min per batch · 1 h for
> both", and the calculator button. Batches = lineup quantity ÷ the recipe's
> yield, exact — bake exactly what's planned, never round up to whole
> batches; when it isn't whole write "about 2¼ batches", never decimals. No rest, bake or oven times — the app doesn't store them.
> Show me.

> The calculator button on each Bake card opens the existing recipe
> calculator already set to this event's batches, so for 2 batches of
> sourdough every amount is already doubled when it opens. Show me with the
> sourdough.

---

## 5 — Pack and label

> Build the Pack and label screen from `screens/PackPlan.dc.html`, opened
> from Getting ready › Pack and label. Strip: boxes, bags, labels (totals).
> One list card, a row per lineup product: tick box, name, and one line like
> "24 pieces · 24 small boxes · 24 labels". Counts are the recipe's packaging
> lines × the lineup quantity. No label previews. Show me.

---

## 6 — Share as PDF (the iPhone share sheet)

This one adds plugins.

> Add `@capacitor/share` and `@capacitor/filesystem`, then run
> `npx cap sync ios`. The share button on the shopping list, Bake and Pack and
> label generates a PDF and opens the iOS share sheet, as in
> `screens/ShareSheet.dc.html` (WhatsApp, Messages, Mail, Print, Save to
> Files). Write the PDF to the app's cache directory and pass its file URL,
> plus a plain-text version of the same list as `text`, so Messages and Copy
> get a clean list. Pick the simplest way to turn HTML into a PDF that works
> offline inside the Capacitor webview, and tell me which you chose. Start
> with the shopping list only.

> Make the shopping-list PDF match `screens/ShoppingListPrint.dc.html`:
> US-letter, white, no app chrome. Header: gold "SHOPPING LIST" kicker, event
> name, the date + "for 24 babka, 18 sourdough, 10 buns · about $78" line, the
> app icon (`public/icon-512.png`) with "Baketly" and the bakery name on the
> right. Ingredients and Packaging tables: tick box · name · amount (bold) ·
> what to buy. Footer "Made with Baketly · baketly.com". Show me the PDF, then
> I'll try Print and WhatsApp on the phone.

> Now the bake PDF, `screens/BakePlanPrint.dc.html`. Same header and footer,
> kicker "BAKE PLAN". For each recipe: tick box, name, and on the right the
> planned amount in bold olive with the batches beside it ("18 loaves ·
> 2 batches"). Under it "One batch makes 9 loaves · active 30 min". Then the
> recipe **for one batch, exactly as saved**, split into its parts side by
> side (e.g. Dough | Filling | Syrup), each part listing ingredient and
> amount. If a recipe has no parts, one column titled "Ingredients". Show me.

> And the pack PDF, `screens/PackPlanPrint.dc.html`. Same header and footer,
> kicker "PACK AND LABEL". A totals strip (one cell per packaging item: small
> boxes, large boxes, bread bags, labels). Then a block per product with how
> many you're making ("24 pieces", "10 packs · 60 buns"), and under it each
> packaging item: tick box, name, a big bold Need number, and the rule
> ("1 per piece", "1 per box"). Show me.

---

## 7 — Finished event

> Past events (on the Events tab and in Analytics › Events) open a new
> finished-event overview built from `screens/EventDone.dc.html`,
> `screens/EventDoneCosts.dc.html` (costs expanded) and
> `screens/EventDoneScrolled.dc.html` (the bottom half). Reuse the numbers the
> analytics event breakdown already computes. Header: ‹ Events, kicker
> "MARKET · DONE", share and delete buttons (no edit). Hero: date tile, name,
> "10 Oct · 8:00–13:00 · place". Show me the top part first.

> Now the numbers. The strip is **Sold** (the full list-price value of what
> sold) · **Costs** · **You earned**, then a line with margin and how many
> times what you put in, and "See costs ▾". Discounts given at the till are a
> **cost line** in that list ("Discounts · on 3 sales"), so Sold − Costs =
> Earned. If sales don't store the discount amount yet, store it on each sale
> (list total − what was charged) and tell me. Show me with costs open.

> Below the strip: the "46 sold of 52 made · 88%" card with "6 came home ·
> about $14 of ingredients"; the Sold card — per product "24 of 24 sold ·
> 100% · $10 each", a bar (red under 70%), the list-price total and "earned
> $X" — ending with one amber line "Discounts given · on N sales −$X"; the
> Next time advice dots (the existing `eventAdvice`); and "Reopen this event"
> at the bottom, which is the existing Mark as not completed. Show me.

---

## 7b — Recipe calculator

> Restyle the recipe calculator (`calculator-template.ts`) to
> `screens/Calculator.dc.html` and `screens/CalculatorScrolled.dc.html`. Keep
> the controller. Header ‹ back, kicker "CALCULATOR", a round ↗ button that
> opens the recipe. Hero tile. A Recipe pill that opens the sheet in
> `screens/CalcRecipePicker.dc.html` (search, group chips, each recipe with
> "Group · makes N", current one ticked) instead of the select. A big "How
> many?" field with the unit word beside it. Under it the batches line,
> written as "about 3⅓ batches of 12" (nearest ¼ or ⅓) when not whole, never
> decimals. Strip: Ingredients / Packaging / Your time. Ingredients card
> grouped by recipe part with each part's subtotal (one plain list if the
> recipe has no parts). Packaging card. Dock: Costs to make, and Each
> (total ÷ how many). Amounts: **whole grams and millilitres above 10**
> (keep two decimals below 10, kg/l above 1000 as today). It always scales to
> exactly the number typed; nothing is rounded to whole batches. Show me.

> When the calculator is opened from an event's Bake screen, match
> `screens/CalculatorEvent.dc.html`: "‹ Bake", the recipe already chosen, How
> many already set to the planned quantity (18 loaves, not a batch count),
> and the olive bar "For <event> · 18 loaves planned". Check that 20 loaves
> with a batch of 9 shows "about 2¼ batches of 9" and amounts for exactly 20.
> Show me.

---

## 8 — Check

> Go through `design/mobile-redesign/README.md`'s "What is new" list and tell
> me which items from this update are built and which aren't. Then commit.

Then build for the phone as usual and try: share the shopping list to
WhatsApp, print the bake plan, open a past event, open the calculator from
Bake.

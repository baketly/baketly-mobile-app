# Building the redesign with Claude Code — step by step

Follow this top to bottom. Each stage is one Claude Code session (or one
conversation in a long session), and each ends with you looking at the screen
in the simulator before moving on. The prompts are written to paste as-is;
the parts in `[brackets]` are the only things you change.

## Before you start

1. On the Mac, in the repo:
   ```bash
   cd ~/baketly-mobile-app
   git fetch origin
   git checkout design/mobile-redesign-2026-10
   pnpm install
   ```
2. Open the folder in Claude Code (`claude` in that directory).
3. Have Xcode's simulator (or the web build) ready so you can look at each
   screen as it lands. The web build: `cd artifacts/claude-design && pnpm run dev`.
4. Keep this canvas open beside you: https://claude.ai/code/artifact/daafb0ce-9b3e-4485-abde-6901876e4eb6

**Updated 24 Oct:** added ingredient categories (Stage 3b), the Getting ready
screens and the three PDFs (Stage 5b), and the finished-event overview
(Stage 5c), and the recipe calculator (Stage 7b). If you already finished a
stage, only the new ones are new work.

Two rules for every stage:
- **One screen per prompt.** Don't ask for "the whole pantry"; ask for one file.
- **Look before you say yes.** After each screen, compare it to the artboard.
  If something is off, reply with what's different in one sentence; don't
  re-explain the design.

---

## Stage 0 — Orientation (first prompt of the project)

Paste exactly:

> Read `design/mobile-redesign/README.md` fully, then skim three of the screen
> files it points at: `screens/Main.dc.html`, `screens/RecipeOverview.dc.html`
> and `screens/AddIngredient.dc.html`. Tell me in a few lines how you'd build
> the shared pieces (header row, fact strip, card, pill field, sheet, dock,
> tab bar) so every later screen reuses them, and where in
> `artifacts/claude-design/src` you'd put them. Don't change anything yet.

Read its answer. If it proposes a sensible place (a new `ui-pieces.ts` or
similar, used by the templates), reply:

> Good. Build those pieces now, with the exact values from the README's
> table, and nothing else. Commit when done.

## Stage 1 — Tab bar and Home

> Change the tab bar to match the README: Home · Pantry · Pay · Events ·
> Analytics, with the wallet disc in the middle (see the `<nav>` at the bottom
> of `screens/Main.dc.html`). "Pay" opens the sale chooser; leave that chooser
> for later and just route to the existing New sale for now. Commit.

> Restyle Home to match `design/mobile-redesign/screens/Main.dc.html`. Keep
> `home-template.ts`'s controller; change what it renders. The olive band holds
> the greeting, the three round buttons (Ask, Message, Settings), the summary
> sentence, the five quick tiles and the next-event row with "Ready 1 of 3"
> (if the readiness count doesn't exist yet, show it from the shopping list
> only and leave a TODO). Below the band: week strip, the To-do card with the
> add row inside it, the month strip. Build and show me the screen.

## Stage 2 — Pantry lists

One prompt per file, in this order:
`PantryIngredients`, `PantryPackagingList`, `PantryRecipes`.

> Restyle the pantry [Ingredients] list to match
> `design/mobile-redesign/screens/[PantryIngredients].dc.html`. Keep the
> controller. The segmented Ingredients / Packaging / Recipes, the search and
> the chips are at the top; the "Needs a look" section only renders when it
> has rows — for now wire the triggers the README lists (no price / units not
> set / no selling price) and leave the margin-change trigger as a TODO. Then
> the normal list. Reuse the pieces from Stage 0. Show me.

For `PantryRecipes` add one sentence to the prompt:

> Each row has a 44px photo tile when the recipe has a photo, else the dashed
> icon tile. Nearby prices is a round pin button next to the + in the
> header (amber dot when something is out of range), not a row.

Then the swipe:

> Make the three pantry lists swipeable, porting the logic from the script
> block in `design/mobile-redesign/screens/PantrySwipe.dc.html` exactly: the
> track follows the finger with no transition while dragging, the outgoing
> page stays visible, release past a quarter of the width snaps with the
> 260ms curve, first/last tab resist at a quarter, segmented control updates
> on landing, `touch-action: pan-y` on the track. Show me on the simulator.

## Stage 3 — New recipe

> Restyle the recipe editor to match `screens/NewRecipe.dc.html` (empty) and
> `screens/NewRecipeFilled.dc.html` (with ingredients). One scrolling screen:
> photo tile + name, Makes / Active time pills, the Group pill, the
> Ingredients card with inline amounts and "Add more", the Packaging card, and
> the dock with Sells for · Each costs · You earn. The dock's figures update as
> the baker types. Show me both states.

> Turn the ingredient picker into the sheet in `screens/AddIngredient.dc.html`
> (search, category chips, checkbox list with the pantry price, "Add N
> ingredients", "Create a new ingredient" link). Same for the group picker:
> `screens/GroupPicker.dc.html`, with "Add new group" opening the dialog in
> `screens/NewGroup.dc.html`. Show me.

Then parts (this one adds data):

> Add recipe parts. Data: a recipe has an ordered list of part names; each
> ingredient line carries a `partId`; the same ingredient may appear in two
> parts with separate amounts. UI from `screens/RecipeParts.dc.html` (the
> sheet, opened by "Split into parts" in the Ingredients header),
> `screens/NewRecipeParts.dc.html` (the grouped card: uppercase olive part
> label with its subtotal, rows, "Add to <part>") and `screens/MovePart.dc.html`
> (the ↕ on a row). Batch cost is unchanged by parts. Show me a recipe with
> three parts.

## Stage 3b — New ingredient and ingredient categories

> Restyle the ingredient editor to match `screens/PantryIngredient.dc.html`
> (scan tile + name, Package / Size+unit, Category / Supplier, nutrition card
> with sugar, dock with cost per unit). Then make ingredient categories an
> editable list that works exactly like recipe groups: the Category pill opens
> the sheet in `screens/CategoryPicker.dc.html` (each category with its
> ingredient count, "Other", "Add new category"), and "Add new category" opens
> the dialog in `screens/NewCategory.dc.html`. Reuse the recipe-group picker
> code rather than writing a second one. Show me.

## Stage 4 — Overviews and delete

One prompt per file: `IngredientOverview`, `PackagingOverview`,
`RecipeOverview`, `EventOverview` (+ `EventCostsOpen` for the expanded costs).

> Restyle the [recipe] overview (the saved-item preview from
> `item-mode-template.ts`) to match `screens/[RecipeOverview].dc.html`: hero →
> fact strip → cards, no insight text, no bottom button bar. Edit and Delete
> are the two round buttons in the header; Delete opens the dialog in
> `screens/DeleteConfirm.dc.html` with copy that states the consequence for
> this item type. Show me.

For the ingredient overview add:

> The sub-line under the name is plain text, `Category · Supplier`, with no
> picker on the overview.

For the recipe overview add:

> The gold kicker reads "Recipe", not the group name.

For the event overview add:

> "Overview of costs ▾" expands in place to the list in
> `screens/EventCostsOpen.dc.html`; the lineup rows carry the calculator
> button; "Enter what actually sold" opens `screens/SoldSheet.dc.html`. The
> three Getting ready rows have olive chevrons and short sub-lines exactly as
> in the file; for now route Bake and Pack and label to placeholders, they get
> built in Stage 5b.

Then the row swipe:

> Replace the current swipe-to-remove with the one in
> `screens/SwipeRemove.dc.html`, porting its script block exactly: pull a row
> right, the red × scales from 0.4 to 1 over the first 72px, release past 72px
> slides the row off right in 220ms then collapses the gap, otherwise it
> springs back; no confirmation. Use it on recipe ingredient rows, event
> lineup rows and packaging rows. Show me.

## Stage 5 — New event, Events tab

> Restyle the event editor to match `screens/NewEvent.dc.html` and
> `screens/NewEventFilled.dc.html`: name + date tile, Date / Hours pills,
> Market · Pop-up · Order with the Fee beside it, the Lineup card with
> quantity inputs and revenue, "Shopping list ›" in the lineup header, the
> Other costs card, and the dock with Projected / You'd earn. The products
> picker is the sheet in `screens/AddProduct.dc.html`; "Add a cost" is the
> sheet in `screens/AddCost.dc.html`. Show me.

> Rename the Markets tab to Events everywhere and restyle its list to
> `screens/Markets.dc.html`: next event as a full card with Projected /
> You'd earn / Ready, later ones slim, then past events with earned and
> margin. Show me.

## Stage 5b — Getting ready: shopping list, bake, pack and label, PDFs

> Restyle the event shopping list to `screens/ShoppingList.dc.html`: hero
> with the sub-line "Sat 24 Oct · 3 products, 52 pieces" (counts only, never
> the product names, so a long lineup fits),
> the Items / Bought / About strip with the progress bar, Ingredients and
> Packaging cards (tick box, name struck through when bought, the package line
> like "3 packs of 454 g", the editable
> amount + unit; no "you have" stock line — the app doesn't track what's in
> the pantry), and "Reset amounts to the lineup". Keep the existing
> `shopNeed` logic. Show me.

> Build the Bake screen from `screens/BakePlan.dc.html`, opened from Getting
> ready › Bake. Strip: Batches, Recipes, Active time (each recipe's active time
> × its batches, summed). One card per lineup recipe: tick box, name,
> "2 batches of 9 · makes 18 loaves", "Active 30 min per batch · 1 h for both",
> and the calculator button. The calculator button opens the existing recipe
> calculator **already set to this event's batches**, so every amount is
> scaled. Batches = lineup quantity ÷ the recipe's yield,
> exact, not rounded ("about 2¼ batches" when not whole). No
> rest or oven times. Show me.

> Build the Pack and label screen from `screens/PackPlan.dc.html`, opened
> from Getting ready › Pack and label. Strip: boxes, bags, labels (totals).
> One list card, a row per lineup product: tick box, name, "24 pieces · 24
> small boxes · 24 labels". Counts are the recipe's packaging lines × the
> lineup quantity. Show me.

Then sharing (this adds a plugin):

> Add `@capacitor/share` (and run `npx cap sync ios`). The share button on
> the shopping list, Bake and Pack and label generates a PDF and opens the iOS
> share sheet, as shown in `screens/ShareSheet.dc.html`. Pass the PDF as a
> file in the app's cache directory (`@capacitor/filesystem`) plus a plain-text
> version as `text`, so Messages and Copy get a clean list. The three PDFs are
> `screens/ShoppingListPrint.dc.html`, `screens/BakePlanPrint.dc.html` and
> `screens/PackPlanPrint.dc.html`: US-letter, white, render that HTML with the
> live data, then turn it into a PDF (pick the simplest approach that works
> offline in the Capacitor webview and tell me which you chose). The bake PDF
> shows each recipe with "18 loaves · 2 batches", "One batch makes 9 loaves ·
> active 30 min", and the saved recipe **for one batch**, split into its parts
> side by side. The app icon in the header is `public/icon-512.png`. Show me
> each PDF, then try Print and WhatsApp on the phone.

## Stage 5c — Finished event

> Past events (Events tab and Analytics › Events) open a new finished-event
> overview built from `screens/EventDone.dc.html`, `EventDoneCosts.dc.html`
> (costs expanded) and `EventDoneScrolled.dc.html` (bottom half). Reuse the
> numbers the analytics event breakdown already computes. Header: ‹ Events,
> kicker "MARKET · DONE", share and delete (no edit). Strip: **Sold** (full
> list-price value of what sold), **Costs**, **You earned**, then the margin
> and ROI line and "See costs ▾". Discounts given at the till are a **cost
> line** ("Discounts · on 3 sales"), so Sold − Costs = Earned. Then the
> "46 sold of 52 made" card, the Sold card (list price per product, bar red
> under 70%, earned per product) ending with "Discounts given · on N sales
> −$X" in amber, the Next time advice, and "Reopen this event" (the existing
> `uncompleteEvent`). If sales don't store the discount amount yet, add it to
> the sale record (list total − charged total) and tell me. Show me.

## Stage 6 — Sale flow

In order: `SaleChooser`, `SaleTill`, `SaleTillEvent`, `SaleCharge`
(+ `SaleDiscount`, `SaleChargeDiscounted`), `SaleDone`, `SaleFinish`.

> The wallet in the tab bar opens the sheet in `screens/SaleChooser.dc.html`
> (Single sale, or an upcoming event). Restyle the till to
> `screens/SaleTill.dc.html`, and at an event to `screens/SaleTillEvent.dc.html`
> (date tile, running line, lineup-only rows with "of N left", the × leave and
> ✓ finish buttons). Show me both.

> Restyle Charge to `screens/SaleCharge.dc.html`: the amount big, Card ·
> coming soon / Cash, the tendered chips plus "Other amount they gave", the
> Tendered / Change due strip, "Record cash". "Add a discount" opens
> `screens/SaleDiscount.dc.html` (None/10/15/20% or a custom total) and
> returns to the state in `screens/SaleChargeDiscounted.dc.html`. Show me.

> Restyle the recorded screen to `screens/SaleDone.dc.html` (olive, amount
> and change, itemised sale, receipt email, Next customer / Done for now).
> The ✓ in the event till opens `screens/SaleFinish.dc.html` with the
> quantities prefilled from what was rung up. Show me.

## Stage 7 — Analytics and nearby prices

> Restyle Analytics to `screens/Analytics.dc.html`,
> `screens/AnalyticsProducts.dc.html` and `screens/AnalyticsEvents.dc.html`:
> the month button, the Overview / Products / Events segmented control, 2×2
> tiles, single-hue bar charts with the value on every bar, the donut + list on
> Products. Make the three tabs swipeable with the same logic as the pantry.
> The product page is `screens/ProductDetail.dc.html`. Show me each.

> Restyle the local-price watch to `screens/NearbyPrices.dc.html` (one row per
> product with one verdict tag, the three-cell strip, "Worth a look yourself"
> with Open ↗) and `screens/NearbyProduct.dc.html` (your price vs median, the
> range bar, the three suggested prices, who sells it). Its entry point is the
> pin button next to the + on the Recipes tab. Show me.

## Stage 7b — Recipe calculator

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
> and the olive bar "For <event> · 18 loaves planned". Show me.

## Stage 8 — Settings, Ask, Contact

> Restyle Settings to `screens/Settings.dc.html` and
> `screens/SettingsScrolled.dc.html`: the three chips stay; rows are the real
> fields (tap the value, type, blur saves — see the script block); currency is
> a dropdown opening `screens/CurrencySheet.dc.html`; reminders show the time
> chip beside the toggle; recipe groups are chips, and ingredient categories
> are a second chip box right under them (same add field, removing a category
> moves its ingredients to Other). Account and Billing from
> `screens/SettingsAccount.dc.html` and `screens/SettingsBilling.dc.html`;
> "What Baketly keeps" is the new page in `screens/SettingsData.dc.html`.
> Show me.

> Restyle Ask Baketly to `screens/AskBaketly.dc.html` (olive user bubbles,
> white answer cards with a source line, action cards with Confirm / Not now,
> follow-up chips, composer with mic and send) and the contact form to
> `screens/Contact.dc.html` (topic chips instead of the select). Show me.

## Stage 8b — Onboarding

> Restyle first-run onboarding to the four screens `screens/Onboarding1.dc.html`
> (welcome: the real app icon from `public/icon-512.png`, one headline, one
> line), `screens/Onboarding2.dc.html` (three tiles), `screens/OnboardingBakery.dc.html`
> (name / bakery / where you sell, placeholders exactly as written, no
> examples) and `screens/Onboarding4.dc.html` (currency dropdown + optional
> hourly rate, "Take me to my bakery"). Keep `onboarding-template.ts`'s
> controller and the step logic; the welcome screen's Skip goes straight to
> Home. Show me all four.

## Stage 9 — The last two gestures

> Port the swipe-back in `screens/SwipeBack.dc.html` into `swipe-back.ts`:
> only from the left 28px, page follows the finger, the page below moves from
> −30% to 0 with a dim fading 0.28 → 0, release past a third completes in
> 300ms, else springs back. Show me going back from a recipe to the list.

> Make every bottom sheet dismissable by dragging down, porting
> `screens/SheetDismiss.dc.html`: sheet follows the finger, upward resists at a
> quarter, release past a third of its height closes it in 280ms, and a drag
> that starts in a scrolled list scrolls the list instead. Show me on the
> ingredient picker and on "What actually sold".

## Stage 10 — Wrap up

> Sweep the app for the words "keep", "kept" and "Markets" in user-facing
> copy and change them to "earn", "earned" and "Events". Then list anything in
> `design/mobile-redesign/README.md` that isn't built yet.

Then build for the phone as usual (the HANDOVER's build line) and go through
every screen once against the canvas. Anything you want changed in the design
itself: change it on the canvas, re-export that one `.dc.html` into
`design/mobile-redesign/screens/`, and give Claude Code the same prompt again.

## If it goes sideways

- It restyles the wrong thing or drifts from the file → "That's not what
  `screens/X.dc.html` shows — reread it and match the inline styles exactly."
- It rebuilds a controller → "Keep the controller; only change what it renders."
- It invents a different swipe → "Port the script block in `screens/X.dc.html`
  as written, including the numbers."
- A screen is right but the build breaks the bundled template patching
  (`throw new Error("Missing … anchor")`) → "The anchor your patch looks for
  changed; update the anchor string to the new markup rather than reverting
  the design."

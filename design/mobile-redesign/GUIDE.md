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
> icon tile, and the "Nearby prices" row sits above the search.

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

## Stage 4 — Overviews and delete

One prompt per file: `IngredientOverview`, `PackagingOverview`,
`RecipeOverview`, `EventOverview` (+ `EventCostsOpen` for the expanded costs).

> Restyle the [recipe] overview (the saved-item preview from
> `item-mode-template.ts`) to match `screens/[RecipeOverview].dc.html`: hero →
> fact strip → cards, no insight text, no bottom button bar. Edit and Delete
> are the two round buttons in the header; Delete opens the dialog in
> `screens/DeleteConfirm.dc.html` with copy that states the consequence for
> this item type. Show me.

For the event overview add:

> "Overview of costs ▾" expands in place to the list in
> `screens/EventCostsOpen.dc.html`; the lineup rows carry the calculator
> button; "Enter what actually sold" opens `screens/SoldSheet.dc.html`.

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
> row above the recipe search. Show me.

## Stage 8 — Settings, Ask, Contact

> Restyle Settings to `screens/Settings.dc.html` and
> `screens/SettingsScrolled.dc.html`: the three chips stay; rows are the real
> fields (tap the value, type, blur saves — see the script block); currency is
> a dropdown opening `screens/CurrencySheet.dc.html`; reminders show the time
> chip beside the toggle; groups are chips. Account and Billing from
> `screens/SettingsAccount.dc.html` and `screens/SettingsBilling.dc.html`;
> "What Baketly keeps" is the new page in `screens/SettingsData.dc.html`.
> Show me.

> Restyle Ask Baketly to `screens/AskBaketly.dc.html` (olive user bubbles,
> white answer cards with a source line, action cards with Confirm / Not now,
> follow-up chips, composer with mic and send) and the contact form to
> `screens/Contact.dc.html` (topic chips instead of the select). Show me.

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

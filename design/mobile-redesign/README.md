# Baketly mobile · redesign, October 2026

This folder is the source of truth for how the app should look and move after
the redesign. It was made in Claude Design (canvas "Baketly mobile") and copied
here so the code can be built against it directly.

- `screens/*.dc.html` — one file per screen or state. Each is a self-contained
  HTML page: the markup inside `<x-dc>` is the screen at 390×844, with every
  colour, size, radius and spacing written **inline** on the element. Read the
  file; there is nothing to guess.
- `canvas.json` — which screens exist, their titles, and which ones are
  `is_interactive` (those carry real gesture logic, see below).
- `assets/baketly-icon-512.png` — the app icon as used on the welcome screen
  (the design file references it as `/_blob/05c1…`; in the app use
  `public/icon-512.png`).
- `tokens.json` — the Baketly design system (colours, type scale, spacing,
  radii, shadows). The screens use the hex values directly; this file names them.

The existing app already has nearly every feature here. **This is a restyle and
a re-layout, not a rebuild**: keep the controllers in
`artifacts/claude-design/src/*-template.ts`, change what they render and how
screens are arranged. Where a screen here has no counterpart, it is listed as
new under "What is new" at the end.

## How to work from these files

1. Open the `.dc.html` for the screen you are changing and copy its structure
   and inline styles. Treat it as the spec, pixel for pixel.
2. `{{ holes }}`, `<sc-for>` and `<sc-if>` in a file are the same template
   language the app uses; everything else is static sample data to replace with
   bindings.
3. For the **interactive** files, the `<script type="text/x-dc">` block at the
   bottom is the behaviour spec: thresholds, easing, what follows the finger,
   what springs back. Port that logic, not just the look.
4. The sample data (Maya, Base Street Bakes, Saturday Market, $9.13…) is
   illustrative. Keep the **copy style** (sentence case, money first, "you"),
   not the numbers.

## The one visual language

Every screen is built from the same handful of pieces. Build these once, then
compose screens from them.

| Piece | Spec (from the files) |
|---|---|
| Screen | cream `#faf6f0`, 20px side gutters, Poppins, 14px/1.6 ink `#33301f` |
| Header row | back link `‹ Name` (13px/600 olive-700 `#5f6a2c`) · centred kicker (10px uppercase, 0.1em, gold `#c9a24a`) · round 40px white buttons on the right |
| Hero | 56px rounded tile (16px radius, soft olive `#eef0dd`) + title 22px/600 + one 12px muted sub-line |
| Fact strip | 3 (or 4) cells in one white box, 18px radius, 1px `#eee7d9` border; label 10px uppercase muted, value 16px/600 tabular; the "good" number in olive-700 |
| Section | `h6` 15px/700 on the left, 12px muted meta on the right, then a card |
| Card | white, 22px radius, `0 2px 10px rgba(60,55,30,.07)`, rows 44–58px, hairlines `#eee7d9` |
| Pill field | 48px, 16px radius, white, 1px `#e5dfd2`; label 12px muted on the left, value 13–15px/600 right-aligned (used for Makes, Active time, Group, Date, Hours, Fee…) |
| Segmented control | white shell 14px radius, 4px padding; selected segment olive `#7d8a3c` with white text, 10px radius |
| Chips | 30–36px pills, 11–12px/600; selected = olive fill |
| Dashed target | the "add" affordance when a section is empty: 1.5px dashed `#c6cd93`, 22px radius, olive-700 text |
| Dock | sticky bottom panel, white, 22px top radius, `0 -8px 30px rgba(60,55,30,.10)`; figures on top, one 48px olive button; disabled = `#c6cd93` |
| Primary button | 48px, 14px radius, olive `#7d8a3c`, 13px/600 white |
| Secondary | same size, white, 1px `#e5dfd2`, ink text |
| Danger | text `#b0563e`; the only red is the delete button and swipe disc |
| Sheet (modal) | slides up from the bottom; `#faf6f0`, 18px top radius, `0 -8px 30px rgba(60,55,30,.18)`, a 36×4 handle, title 20px/600 + 12px sub, round close top-right; screen behind at 55% |
| Dialog | centred 340px card over `rgba(30,27,22,.42)`, 22px radius, two 48px buttons side by side |
| Tags | "needs a look" etc.: 10px/600 pill, soft olive `#eef0dd` / olive-700; amber `#b07a1f` on `#f5e6cf` for warnings |
| Tab bar | Home · Pantry · **Pay** · Events · Analytics; 20px line icons, 10px labels; active olive; the Pay disc is a 36px olive circle with a wallet icon |
| Numbers | always `font-feature-settings: 'tnum'` |
| Charts | one hue only: olive for the thing in focus, `#c6cd93` for the rest, dashed outline for projections; every bar carries its value; no legends needed |

Rules that follow from the files:

- **One window per form.** New recipe / event / ingredient / packaging are one
  scrolling screen. Anything that *adds* to a list opens a **sheet**
  (ingredients, products, group, cost, currency). Nothing navigates away.
- **No insight paragraphs on overviews.** An overview is hero → fact strip →
  cards. The only prose lives in Analytics ("Baketly noticed") and Ask Baketly.
- **No bottom button bars on overviews.** Edit and Delete are round buttons in
  the header. Delete exists only on overviews (saved items), never on forms.
- **The dock carries the payoff** on every form that prices something:
  "Each costs $0.73 · You earn $9.27 · 93% margin", live as the baker types.
- Wording: **earn / earned**, never "keep / kept". "Events", not "Markets".

## Screen map → code

| Design file | Existing template | Notes |
|---|---|---|
| `Main` | `home-template.ts` | olive band holds greeting, 3 round buttons (Ask, Message, Settings), summary sentence, 5 quick tiles (Ingredient, Packaging, Recipe, Event, Calculator), next-event row with `Ready 1 of 3`. Below: week strip, To-do card (add row inside the card), month strip. |
| `PantryIngredients`, `PantryPackagingList`, `PantryRecipes` | `recipe-template.ts` (pantry), `ingredient-template.ts` | segmented Ingredients/Packaging/Recipes, search, chips; **"Needs a look"** section first when non-empty (reason line in amber: no price, units not set, margin fell, no selling price). Recipes rows carry a 44px photo tile or a dashed icon tile. A round **pin** button (white, olive-700 map-pin, amber dot when something is out of range) sits left of the + in the Recipes header and opens Nearby prices. |
| `PantrySwipe` (interactive) | new behaviour | swipe between the three pantry tabs; outgoing page stays on screen while dragging. |
| `NewRecipe`, `NewRecipeFilled` | `recipe-template.ts` editor | name + photo tile, Makes/Active time pills, Group pill → `GroupPicker` sheet → `NewGroup` dialog. Ingredients card with inline amounts, `Add more`, "Split into parts" link. Packaging card. Dock. |
| `RecipeParts`, `NewRecipeParts`, `MovePart` | **new** | parts (Dough/Filling/Topping): sheet to name them, ingredients grouped under uppercase olive labels with per-part subtotal and "Add to …" link, ↕ on a row → move sheet. Batch cost unchanged. |
| `AddIngredient` | ingredient picker sheet | search, category chips, checkbox list with pantry price, "Add N ingredients", "Create a new ingredient". |
| `PantryIngredient`, `PantryPackaging` | `ingredient-template.ts`, packaging editor | scan-label tile; Package $ / Size+unit; Category / Supplier; nutrition card incl. **sugar**; dock = cost per unit. Packaging: Pack price / Units per pack / Supplier; "Used by" ticks. The Category pill opens `CategoryPicker`. |
| `CategoryPicker`, `NewCategory` | **new**, cloned from the recipe group picker | ingredient categories work exactly like recipe groups: sheet with each category and its ingredient count, "Other", "Add new category" → dialog (placeholder "Enter category name", suggestion chips). Edited in Settings (see below). |
| `IngredientOverview`, `PackagingOverview`, `RecipeOverview`, `EventOverview` | `item-mode-template.ts` previews | hero → strip → cards. Ingredient sub-line is plain `Category · Supplier` (no picker on an overview). Recipe kicker reads **Recipe** (not the group). Recipe: ingredients (tap → ingredient), packaging in its own card, macros incl. sugar, calculator button per lineup row on the event. Event: `Overview of costs ▾` expands in place (`EventCostsOpen` = expanded); **Getting ready** rows (Shopping list / Bake / Pack and label) each have an olive chevron and open their own screen. |
| `ShoppingList` | shopping list (`shopNeed` state in `event-template.ts`) | hero + strip (Items / Bought / About $) with a progress bar; Ingredients and Packaging cards: tick box, name struck when bought, package line ("3 packs of 454 g"), no stock line (the app doesn't know what you have), editable amount + unit; "Reset amounts to the lineup". Share button top-right. |
| `ShareSheet` | **new**: Capacitor `@capacitor/share` | the share button generates a PDF and hands it to the **iOS share sheet** (WhatsApp, Messages, Mail, AirDrop, Print, Save to Files). Pass the PDF as a file URL plus a plain-text version of the list as `text`, so "Copy" and Messages get a clean list. Same button on Bake and Pack and label. |
| `ShoppingListPrint`, `BakePlanPrint`, `PackPlanPrint` | **new**: the PDFs | US-letter (816×1056 at 96 dpi), white, no app chrome. Header: gold kicker, event name, date line, app icon + "Baketly / bakery name" top-right; footer "Made with Baketly · baketly.com". Shopping list: Ingredients / Packaging tables (tick box · name · amount · what to buy). Bake: per recipe "**18 loaves** · 2 batches", "One batch makes 9 loaves · active 30 min", then the recipe **for one batch**, as saved, in its parts side by side (Levain / Dough, Dough / Filling / Syrup). Pack: totals strip (small boxes / large boxes / bread bags / labels), then per product its packaging items with a big **Need** number and the rule ("1 per piece"). Render with the same HTML → PDF path (e.g. `html2pdf`/WKWebView `createPdf`). |
| `Calculator`, `CalculatorScrolled`, `CalcRecipePicker`, `CalculatorEvent` | `calculator-template.ts` | same controller, new look: Recipe pill → picker sheet (replaces the select), big How many? field + unit word, batches line as "about 3⅓ batches of 12" (never decimals), strip Ingredients / Packaging / Your time, ingredients grouped by part with subtotals, packaging card, dock Costs to make + Each. Amounts are **whole g / ml above 10**. Always scales to exactly the number typed. From Bake: ‹ Bake, pre-chosen recipe, How many = planned quantity, olive bar "For <event> · 18 loaves planned". |
| `BakePlan` | **new** | Event › Getting ready › Bake. Strip Batches / Recipes / Active time (sum of active time × batches). Batches = planned ÷ yield, **exact** (bake exactly what's planned; "about 2¼" when not whole). One card per recipe: tick, name, "2 batches of 9 · makes 18 loaves", "Active 30 min per batch · 1 h for both", and the **calculator button**, which opens the recipe calculator already scaled to this event's batches. No rest/bake/oven times (the app doesn't store them). |
| `PackPlan` | **new** | Event › Getting ready › Pack and label. Strip Boxes / Bags / Labels. One list card, a row per product: tick, name, "24 pieces · 24 small boxes · 24 labels". Counts = the recipe's packaging × the lineup quantity. |
| `EventDone`, `EventDoneCosts`, `EventDoneScrolled` | analytics event breakdown (`onAnalyticsEvent` in `analytics-template.ts`) + `pastIsCompleted` / `uncompleteEvent` in `event-template.ts` | the overview of a **finished** event; past events (Events tab, Analytics › Events) open this. Kicker `MARKET · DONE`, share + delete in the header (no edit). Strip **Sold** (full list-price value) · **Costs** · **You earned**, "80% margin · 3.9× what you put in", See costs ▾ → Booth fee, Ingredients for what sold, other costs, **Discounts · on 3 sales**, All costs. Sell-through card "46 sold of 52 made · 88%" + "6 came home · about $14 of ingredients". **Sold** card: per product "24 of 24 sold · 100% · $10 each", bar (red under 70%), list-price total + "earned"; last line "Discounts given · on 3 sales −$20" in amber. **Next time** advice dots (the existing `eventAdvice`). Footer "Reopen this event" = Mark as not completed. |
| `DeleteConfirm` | delete dialogs | one dialog pattern for all four item types; copy states the consequence. |
| `SwipeRemove` (interactive) | `swipeToRemoveFromLineup` in `event-template.ts` | pull a row **right**, red × grows in from the left, release past 72px removes (row slides off, gap closes); no confirm. Use for recipe ingredients, lineup products, packaging rows. |
| `NewEvent`, `NewEventFilled`, `AddProduct`, `AddCost` | `event-template.ts` | name + date tile, Date/Hours, Market·Pop-up·Order + Fee on one row, Lineup card (qty inputs, revenue), `Shopping list ›` in the header, Other costs card, dock = Projected / You'd earn. |
| `SoldSheet`, `SaleFinish` | "What actually sold" | steppers prefilled; finishing from the till prefills from rung-up sales. |
| `SheetDismiss` (interactive) | all sheets | drag any sheet down to dismiss; threshold ⅓ of its height; a list inside that is scrolled takes the drag instead. |
| `SwipeBack` (interactive) | `swipe-back.ts` | edge swipe from the left 28px; page follows finger; underlying page parallax −30%→0 with a dim fading 0.28→0; threshold ⅓ width. |
| `Markets` (file name kept) | events list | title **Events**; next event as a full card with Projected / You'd earn / Ready; later ones slim; past events list with earned + margin. |
| `Analytics`, `AnalyticsProducts`, `AnalyticsEvents`, `AnalyticsSwipe`, `ProductDetail` | `analytics-template.ts`, `product-analytics-template.ts` | Overview/Products/Events segmented (swipeable); 2×2 tiles; single-hue charts; Products keeps the donut + list; product page = Sold/Earned/Share/Margin, sold-each-month bars, price line, all-time ledger. |
| `NearbyPrices`, `NearbyProduct` | `watch-template.ts` | one row per product with a single verdict tag; "Worth a look yourself" with Open ↗; product page has the range bar, the three suggested prices, and the shops. |
| `SaleChooser` → `SaleTill` / `SaleTillEvent` → `SaleCharge` (+`SaleDiscount`, `SaleChargeDiscounted`) → `SaleDone` → `SaleFinish` | `sale-template.ts`, `card-payment-template.ts`, `receipt-template.ts` | wallet opens the chooser sheet; till rows with steppers and "of N left" at an event; Charge: big amount, Card·coming soon / Cash, tendered chips + "Other amount they gave", Tendered/Change strip; discount sheet (None/10/15/20% or custom total); olive "recorded" screen with receipt email; ✓ in the event till opens the prefilled finish sheet. |
| `Settings`, `SettingsScrolled`, `CurrencySheet`, `SettingsAccount`, `SettingsBilling`, `SettingsData` | `settings-template.ts`, `recipe-groups-template.ts` | General/Account/Billing chips kept; rows are the real fields (tap value, type, blur saves); currency is a dropdown → sheet; reminders with time chip beside the toggle; recipe groups as chips, and **ingredient categories** as chips right under them (add field "New category, e.g. Nuts"; removing one moves its ingredients to Other). `SettingsData` ("What Baketly keeps") is new. |
| `Onboarding1`, `Onboarding2`, `OnboardingBakery`, `Onboarding4` | `onboarding-template.ts` | four first-run screens, one idea each: welcome (app icon, one line), what it does (three tiles), your bakery (name / bakery / where, no examples), how you price (currency dropdown + optional hourly rate). Progress bars at the bottom, Skip top-right, Back from the second screen. |
| `AskBaketly`, `Contact` | `chat-template.ts`, `contact-template.ts` | olive user bubbles, white answer cards with a source line, action cards with Confirm / Not now, follow-up chips, composer with mic + send. Contact: topic chips instead of a select. |

## Gesture specs (port exactly)

All four live in the interactive files' script blocks; the numbers:

| Gesture | File | Follow | Threshold | Release |
|---|---|---|---|---|
| Swipe between tabs | `PantrySwipe`, `AnalyticsSwipe` | track `translateX` 1:1, `transition: none` while dragging; first/last tab resists at ¼ | ¼ of width | snap, `260ms cubic-bezier(.2,.8,.2,1)`; segmented control updates on landing |
| Swipe back | `SwipeBack` | only from the left 28px; top page 1:1; page below from −30% to 0 with dim 0.28→0 | ⅓ of width | `300ms` same curve; else spring back |
| Dismiss a sheet | `SheetDismiss` | sheet `translateY` 1:1 downward; upward resists at ¼; dim fades with progress | ⅓ of sheet height | `280ms`; skipped if the drag starts in a list that is scrolled |
| Remove a row | `SwipeRemove` | row right 1:1 (max 140); red × scales 0.4→1 over the first 72px; leftward resists at ¼ | 72px | row slides off right `220ms`, then collapses (`max-height` 240ms, 180ms delay) |

`touch-action: pan-y` on horizontal tracks so vertical scrolling inside still
works; `pan-y` on the sheet too, `none` only on the handle.

## What is new (no code yet)

- Recipe **parts** (dough / filling / topping) — data model: each ingredient
  line gets a `partId`; parts are an ordered list of names on the recipe; an
  ingredient may appear in two parts with separate amounts.
- **Needs a look** on the three pantry lists — triggers: no package/pack price,
  units per pack unset, ingredient price change moved a recipe's margin, recipe
  with no selling price.
- Event **Getting ready** checklist (shopping list / bake / pack), derived from
  the lineup; and **Ready 1 of 3** surfaced on Home and Events.
- **What Baketly keeps** page under Account.
- Swipe between tabs, swipe-to-dismiss sheets, swipe-to-remove rows.
- **Ingredient categories** as an editable list (like recipe groups): the
  category picker sheet + new-category dialog, and their Settings section.
- **Bake** and **Pack and label** screens behind Getting ready, with the
  calculator opening pre-scaled to the event's batches.
- **Share as PDF** for the shopping list, bake plan and pack and label, through
  the iOS share sheet (print, WhatsApp, Files…).
- **Finished-event overview** in the house style, with **discounts** counted as
  a cost (so Sold − Costs = Earned) and shown under the products.

## Asking Claude Code for it

Work screen by screen, in this order (each is self-contained): tab bar →
Home → Pantry lists → New recipe (+ parts) → Overviews (+ delete) → New event
→ Event overview + finish → Getting ready (shopping list, bake, pack) + PDFs →
Finished event → Sale flow → Analytics → Nearby prices → Settings → Ask /
Contact → Onboarding → the four gestures. `GUIDE.md` has the exact prompts. A good prompt for each:

> Restyle the X screen to match `design/mobile-redesign/screens/X.dc.html`.
> Keep the controller in `src/x-template.ts`; change only what it renders. Use
> the exact inline styles from the design file, bind the sample values to the
> existing state, and reuse the pieces already built for earlier screens
> (header row, fact strip, card, pill field, sheet, dock). Build and show me
> the screen before moving on.

// The home screen: a greeting, the week ahead, and what to do next.
//
// It used to be a dashboard — eight rearrangeable modules of numbers, every
// one of them a report you could already get from Analytics. A baker opening
// the app in the morning does not want a report; they want to know what day it
// is, what is coming, and what to do next.
//
// The whole screen is replaced in one piece rather than patched module by
// module: fewer exact-string anchors to break, and the layout is readable in
// one file.

const GREETING_HOURS = { morning: 12, afternoon: 18 };

const homeController = `      ...(() => {
        const CUR = ${currencySymbolExpr};
        const st = this.state;
        const recipes = Array.isArray(st.recipeRecords) ? st.recipeRecords : [];
        const events = Array.isArray(st.eventRecords) ? st.eventRecords : [];
        const ingredients = st.ingredientRecords || {};
        const packaging = st.packagingRecords || {};
        const removedIng = new Set(st.removedIngredientKeys || []);
        const removedPack = new Set(st.removedPackagingKeys || []);

        const hasIngredients = Object.keys(ingredients).filter(k => !removedIng.has(k)).length > 0;
        const hasPackaging = Object.keys(packaging).filter(k => !removedPack.has(k)).length > 0;
        const hasRecipes = recipes.length > 0;

        // ---- greeting ---------------------------------------------------
        const now = new Date();
        const hour = now.getHours();
        const partOfDay = hour < ${GREETING_HOURS.morning} ? 'Good morning'
          : (hour < ${GREETING_HOURS.afternoon} ? 'Good afternoon' : 'Good evening');
        // Whatever they typed, greet them by the first word of it. Split on a
        // plain space rather than a pattern: this controller is injected as the
        // text of a template literal, where a backslash-s collapses to a bare
        // s and the name would be cut at its first lowercase s instead.
        const name = String(st.ownerName || '').trim().split(' ')[0] || '';
        const greeting = name ? partOfDay + ', ' + name : partOfDay;
        // day before month, the way a date is spoken: 'Thursday, 27 August'
        const todayLine = now.toLocaleDateString('en-US', { weekday: 'long' })
          + ', ' + now.getDate() + ' ' + now.toLocaleDateString('en-US', { month: 'long' });

        // ---- the week ahead ---------------------------------------------
        const startOfDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const today = startOfDay(now);
        const dayKey = date => date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');

        const eventsByDay = {};
        events.forEach(event => {
          const when = new Date(event.occurredAt || 0);
          if (isNaN(when.getTime())) return;
          const key = dayKey(startOfDay(when));
          if (!eventsByDay[key]) eventsByDay[key] = [];
          eventsByDay[key].push(event);
        });

        // A to-do belongs to a day, the way a market does. One saved before
        // to-dos had a day sits on today, so nothing already written vanishes.
        const todos = Array.isArray(st.todoItems) ? st.todoItems : [];
        const todayKey = dayKey(today);
        const openTodosByDay = {};
        todos.forEach(item => {
          if (!item || item.done) return;
          const key = item.day || todayKey;
          openTodosByDay[key] = (openTodosByDay[key] || 0) + 1;
        });

        // What today holds, in a sentence. Counts are of today rather than
        // the day being looked at: this sits under the greeting, which is
        // about now, and a baker glancing at it wants to know whether they
        // are busy — not what a Thursday they tapped looks like.
        const marketsToday = (eventsByDay[todayKey] || []).length;
        const todosToday = openTodosByDay[todayKey] || 0;
        const countOf = (n, one, many) => n + ' ' + (n === 1 ? one : many);
        const summaryParts = [];
        if (marketsToday) summaryParts.push(countOf(marketsToday, 'market', 'markets'));
        if (todosToday) summaryParts.push(countOf(todosToday, 'thing to do', 'things to do'));
        const homeSummary = summaryParts.length
          ? 'You have ' + summaryParts.join(' and ') + ' today.'
          : 'Nothing booked today, and nothing on your list.';

        // Last week, today, and the two weeks after it. The row used to be the
        // seven days from today and nothing else, so a market from Saturday
        // and the to-dos ticked off around it were unreachable by Monday, and
        // nothing could be planned past next week. The row scrolls sideways
        // now; it opens with today at the left, so the first seven days look
        // as they always did, and the past is a swipe to the right.
        const DAYS_BACK = 7;
        const DAYS_AHEAD = 14;
        const selected = Math.min(DAYS_AHEAD, Math.max(-DAYS_BACK, Number(st.homeDayIndex) || 0));
        const week = [];
        for (let offset = -DAYS_BACK; offset <= DAYS_AHEAD; offset++) {
          const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
          const key = dayKey(date);
          const isToday = offset === 0;
          const isPast = offset < 0;
          const isPicked = offset === selected;
          const hasEvent = (eventsByDay[key] || []).length > 0;
          const hasTodo = (openTodosByDay[key] || 0) > 0;
          week.push({
            // the redesign's tile: white, olive when picked, a ring on today,
            // one dot that says what the day holds
            tileBg: isPicked ? '#7d8a3c' : '#ffffff',
            tileColor: isPicked ? '#ffffff' : (isPast ? '#9a947f' : '#33301f'),
            tileRing: isToday && !isPicked ? 'inset 0 0 0 1px #c6cd93' : 'none',
            letterStyle: isPicked ? 'opacity:0.8' : 'color:#7a7464',
            dotBg: isPicked ? '#f5d58f' : (hasEvent ? '#7d8a3c' : '#d4953a'),
            dotOpacity: hasEvent || hasTodo ? '1' : '0',
            letter: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
            number: String(date.getDate()),
            key,
            dotOpacity: (eventsByDay[key] || []).length > 0 ? '1' : '0',
            dotColor: isPicked ? '#ffffff' : 'var(--color-accent)',
            todoDotOpacity: (openTodosByDay[key] || 0) > 0 ? '1' : '0',
            todoDotColor: isPicked ? '#f5d58f' : '#d4953a',
            bg: isPicked ? 'var(--color-accent)' : (isToday ? 'var(--color-accent-100)' : 'transparent'),
            // a day that has gone is written more quietly, so the eye lands
            // on today and what is still to come
            color: isPicked ? '#ffffff' : (isPast ? '#9a947f' : 'var(--color-text)'),
            // every day carries its outline, so the row reads as a row of
            // buttons rather than one selected day floating in space
            border: isPicked
              ? '1px solid var(--color-accent)'
              : (isToday
                ? '1px solid var(--color-accent-300)'
                : (isPast ? '1px solid var(--color-neutral-300)' : '1px solid var(--color-neutral-400)')),
            pick: () => this.setState({ homeDayIndex: offset })
          });
        }

        const pickedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + selected);
        const pickedLabel = selected === 0
          ? 'Today'
          : selected === -1
            ? 'Yesterday'
            : selected === 1
              ? 'Tomorrow'
              : pickedDate.toLocaleDateString('en-US', { weekday: 'long' })
                + ', ' + pickedDate.getDate() + ' ' + pickedDate.toLocaleDateString('en-US', { month: 'long' });

        // A market that has happened opens its breakdown; one still to come
        // opens its own preview, loaded the same way the Upcoming list loads it.
        const openEvent = event => () => {
          if (event.status === 'completed') {
            return this.setState(s => ({
              screen: 'analyticsEvent', stack: [...s.stack, s.screen], analyticsEventId: event.id, eventCostsOpen: false
            }));
          }
          const quantities = {};
          (event.plannedItems || []).forEach(item => { quantities[item.productId] = item.quantity; });
          return this.setState(s => ({
            screen: 'event',
            stack: [...s.stack, s.screen],
            eventCurrentId: event.id,
            eventName: event.name || 'Market',
            eventDate: (event.occurredAt || '').slice(0, 10),
            eventBoothFee: Number(event.boothFee) || 0,
            eventOtherCosts: (event.otherCosts || []).map(cost => ({ label: cost.label, amount: String(cost.amount) })),
            evPicked: (event.plannedItems || []).map(item => item.productId),
            evQty: quantities,
            evSold: {},
            evStatus: 'planned',
            evSaved: true,
            evEnteringResults: false,
            evPickerOpen: false,
            evPickerSel: [],
            eventDeleteOpen: false,
            shopNeed: {},
            shopNeedText: {}
          }));
        };

        const dayItems = (eventsByDay[dayKey(pickedDate)] || []).map(event => {
          const planned = (event.plannedItems || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
          return {
            name: event.name || 'Market',
            detail: planned > 0
              ? planned + (planned === 1 ? ' item to bake' : ' items to bake')
              : 'Nothing planned to bake yet',
            open: openEvent(event)
          };
        });

        // ---- this month, at a glance --------------------------------------
        // Made is what the ledger took this month, from any kind of sale.
        // Projected adds what this month's markets still to come are planned
        // to bring in, at today's prices. Events counts every market dated
        // this month, done or not.
        const sales = Array.isArray(st.saleRecords) ? st.saleRecords : [];
        const monthKey = dayKey(today).slice(0, 7);
        const inThisMonth = iso => {
          const when = new Date(iso || 0);
          return !isNaN(when.getTime()) && dayKey(startOfDay(when)).slice(0, 7) === monthKey;
        };
        const madeThisMonth = sales
          .filter(sale => inThisMonth(sale.occurredAt))
          .reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
        const monthEvents = events.filter(event => inThisMonth(event.occurredAt));
        const plannedValue = event => (event.plannedItems || []).reduce((sum, item) => {
          const recipe = recipes.find(r => r.id === item.productId);
          return sum + (Number(item.quantity) || 0) * (recipe ? Number(recipe.price) || 0 : 0);
        }, 0);
        const stillToCome = monthEvents
          .filter(event => event.status !== 'completed' && startOfDay(new Date(event.occurredAt)) >= today)
          .reduce((sum, event) => sum + plannedValue(event), 0);
        const money = value => CUR + Math.round(value).toLocaleString('en-US');

        // ---- the next market ------------------------------------------------
        const nextEvent = events
          .filter(event => event.status !== 'completed')
          .map(event => ({ event, day: startOfDay(new Date(event.occurredAt || 0)) }))
          .filter(entry => !isNaN(entry.day.getTime()) && entry.day >= today)
          .sort((a, b) => a.day.getTime() - b.day.getTime())[0] || null;
        const daysToNext = nextEvent ? Math.round((nextEvent.day.getTime() - today.getTime()) / 86400000) : 0;

        // ---- what to do next ---------------------------------------------
        const goIngredientNew = () => this.setState(s => ({
          screen: 'ingredientEdit', stack: [...s.stack, s.screen],
          activeIngredientKey: null, ingredientDraft: null, ingredientSaveError: ''
        }));
        const goPackagingNew = () => this.setState(s => ({
          screen: 'packagingEdit', stack: [...s.stack, s.screen],
          activePackagingKey: null, packagingDraft: null, packagingSaveError: ''
        }));

        // Each starter step disappears the moment it is genuinely done, so the
        // list empties itself as the baker works rather than being ticked off.
        const starter = [
          { label: 'Add your first ingredient', done: hasIngredients, go: goIngredientNew },
          { label: 'Add your first packaging', done: hasPackaging, go: goPackagingNew },
          { label: 'Create your first recipe', done: hasRecipes, go: () => this.setState(s => ({ screen: 'ingredients', pantryTab: 'rec', stack: [...s.stack, s.screen] })) }
        ].filter(step => !step.done);

        const pickedKey = dayKey(pickedDate);
        const todoRows = todos
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => ((item && item.day) || todayKey) === pickedKey)
          .map(({ item, index }) => ({
          text: String(item && item.text || ''),
          done: !!(item && item.done),
          boxBg: item && item.done ? 'var(--color-accent)' : '#fff',
          boxBorder: item && item.done ? 'var(--color-accent)' : 'var(--color-neutral-300)',
          tick: item && item.done ? '#fff' : 'transparent',
          textColor: item && item.done ? '#9a947f' : 'var(--color-text)',
          strike: item && item.done ? 'line-through' : 'none',
          tickBorder: item && item.done ? '#7d8a3c' : '#e5dfd2',
          tickBg: item && item.done ? '#7d8a3c' : '#ffffff',
          textHex: item && item.done ? '#8a8578' : '#33301f',
          toggle: () => this.setState(s => ({
            todoItems: (s.todoItems || []).map((entry, i) => i === index ? { ...entry, done: !entry.done } : entry)
          })),
          remove: () => this.setState(s => ({
            todoItems: (s.todoItems || []).filter((_, i) => i !== index)
          }))
        }));

        const addTodo = () => this.setState(s => {
          const text = String(s.todoDraft || '').trim().slice(0, 120);
          if (!text) return {};
          const at = Math.min(DAYS_AHEAD, Math.max(-DAYS_BACK, Number(s.homeDayIndex) || 0));
          const forDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + at);
          return { todoItems: [...(s.todoItems || []), { text, done: false, day: dayKey(forDay) }], todoDraft: '' };
        });

        // ---- how ready the next market is ----------------------------------
        // Three steps get a market ready: shop, bake, pack -- the "Getting
        // ready" checklist in design/mobile-redesign/README.md.
        // TODO: bake and pack do not exist yet; they arrive with the event
        // window and replace the two falses below. Until then only shopping
        // can be done, and it counts as done when every row of the market's
        // shopping list is ticked. shopChecked is kept by row index for the
        // market last opened, so ticks made on another market do not count.
        const shoppingRows = (() => {
          if (!nextEvent) return 0;
          const ing = {}; const pack = {};
          (nextEvent.event.plannedItems || []).forEach(item => {
            const recipe = recipes.find(r => r.id === item.productId);
            if (!recipe || !(Number(item.quantity) > 0)) return;
            (recipe.ingredientKeys || []).forEach(k => { ing[k] = true; });
            (recipe.packagingKeys || []).forEach(k => { pack[k] = true; });
          });
          return Object.keys(ing).length + Object.keys(pack).length;
        })();
        const ticked = st.shopChecked || {};
        let shoppingTicked = 0;
        for (let i = 0; i < shoppingRows; i++) if (ticked[i]) shoppingTicked++;
        const readySteps = [
          shoppingRows > 0 && shoppingTicked === shoppingRows, // shopping
          false, // bake -- TODO
          false  // pack -- TODO
        ];
        const readyDone = readySteps.filter(Boolean).length;

        // ---- what changed nearby -------------------------------------------
        const check = st.marketCheck || null;
        const checkedWhen = check && check.checkedAt ? new Date(check.checkedAt) : null;
        const nearbyLine = check && check.summary
          ? String(check.summary)
          : (String(st.bakeryLocation || '').trim()
            ? 'Baketly has not looked yet. Check what bakeries near you charge.'
            : 'Add where you sell and Baketly will tell you how your prices compare nearby.');

        return {
          homeGreeting: greeting,
          homeToday: todayLine,

          homeWeek: week,
          homeDayLabel: pickedLabel,
          homeDayItems: dayItems,
          homeDayHasItems: dayItems.length > 0,
          homeDayEmpty: dayItems.length === 0,
          // a way back to today once the row has been scrolled or another
          // day picked; the strip itself is scrolled by day-strip.ts
          homeDayAway: selected !== 0,
          goToday: () => {
            this.setState({ homeDayIndex: 0 });
            if (window.__baketlyDayStripToday) window.__baketlyDayStripToday();
          },

          homeMonthLabel: now.toLocaleDateString('en-US', { month: 'long' }),
          homeProjectedStr: money(madeThisMonth + stillToCome),
          homeMadeStr: money(madeThisMonth),
          homeEventsStr: String(monthEvents.length),

          homeHasNext: !!nextEvent,
          homeNextName: nextEvent ? (nextEvent.event.name || 'Market') : '',
          homeNextCount: daysToNext === 0 ? 'Today' : (daysToNext === 1 ? 'Tomorrow' : String(daysToNext)),
          homeNextUnit: daysToNext > 1 ? 'days to go' : '',
          homeNextDate: nextEvent
            ? nextEvent.day.toLocaleDateString('en-US', { weekday: 'long' }) + ', ' + nextEvent.day.getDate()
              + ' ' + nextEvent.day.toLocaleDateString('en-US', { month: 'long' })
            : '',
          openNextEvent: nextEvent ? openEvent(nextEvent.event) : () => {},
          homeNextWeekday: nextEvent ? nextEvent.day.toLocaleDateString('en-US', { weekday: 'short' }) : '',
          homeNextDayNum: nextEvent ? String(nextEvent.day.getDate()) : '',
          homeNextWhen: daysToNext === 0 ? 'Today' : (daysToNext === 1 ? 'Tomorrow'
            : (nextEvent ? nextEvent.day.toLocaleDateString('en-US', { weekday: 'long' }) + ', '
              + nextEvent.day.getDate() + ' ' + nextEvent.day.toLocaleDateString('en-US', { month: 'short' }) : '')),
          // a market with nothing planned has nothing to get ready
          homeHasReady: shoppingRows > 0,
          homeReadyStr: readyDone + ' of ' + readySteps.length,

          homeSummary,
          homeStarter: starter,
          homeHasStarter: starter.length > 0,
          homeTodos: todoRows,
          homeHasTodos: todoRows.length > 0,
          homeTodoPlaceholder: selected === 0
            ? 'Add something to do today…'
            : 'Add something for ' + pickedDate.toLocaleDateString('en-US', { weekday: 'long' }) + '…',
          todoDraft: st.todoDraft || '',
          setTodoDraft: e => this.setState({ todoDraft: e.target.value.slice(0, 120) }),
          addTodo,
          // the add row is an input with no button beside it, so Enter adds
          addTodoOnEnter: e => { if (e && e.key === 'Enter') addTodo(); },
          homeTodoMeta: todoRows.length
            ? pickedLabel + ' \u00b7 ' + todoRows.filter(r => r.done).length + ' of ' + todoRows.length + ' done'
            : pickedLabel,

          homeNearby: nearbyLine,
          homeNearbyWhen: checkedWhen && !isNaN(checkedWhen.getTime())
            ? 'Checked ' + checkedWhen.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'Not checked yet',

          goIngredientNew,
          goPackagingNew,
        };
      })(),
`;

function addHomeController(template: string): string {
  const anchor = /([ \t]*)onAnalytics:\s*screen\s*===\s*'analytics',/;
  if (!anchor.test(template)) throw new Error("Missing stable home anchor");
  return template.replace(
    anchor,
    (_match, indent: string) => `${homeController}${indent}onAnalytics: screen === 'analytics',`,
  );
}

// The same cog the General section wears inside Settings. Home used a
// different drawing of one — spokes rather than a toothed wheel — so the
// button that opens Settings and the tab it lands on looked like two features.
import { SETTINGS_GEAR } from "./settings-template";
import { currencySymbolExpr } from "./currency";

// An envelope: the one drawing everyone reads as a message, which matters
// on a button whose label only screen readers hear.
const ENVELOPE =
  '<rect x="3" y="5" width="18" height="14" rx="2"></rect>' +
  '<path d="M3 7l9 6 9-6"></path>';

const ICON = (size: number, stroke: string, width: string, path: string) =>
  `<svg width="${size}" height="${size}" sc-camel-view-box="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

/** The three round buttons at the top right of the band. */
const roundButton = (handler: string, label: string, path: string) =>
  `<button sc-camel-on-click="{{ ${handler} }}" aria-label="${label}" style="width:40px;height:40px;border-radius:50%;border:0;padding:0;cursor:pointer;background:#ffffff;color:#33301f;display:grid;place-items:center">` +
  ICON(17, "currentColor", "1.75", path) + `</button>`;

/** One of the five quick tiles: an olive line icon over a one-word label. */
const quickTile = (handler: string, label: string, path: string) =>
  `<button sc-camel-on-click="{{ ${handler} }}" style="flex:1;min-width:0;min-height:54px;border:0;border-radius:14px;background:#ffffff;color:#33301f;font-family:inherit;font-size:10px;font-weight:600;line-height:1.2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;text-align:center;padding:8px 2px;cursor:pointer">` +
  ICON(18, "#7d8a3c", "1.75", path) + label + `</button>`;

// design/mobile-redesign/screens/Main.dc.html, bound to the controller above.
// The band is drawn full-bleed by undoing the screen's side padding; its top
// padding is the app's, not the design file's 54px, which is the status bar
// the native shell already leaves room for.
const homeMarkup = `
<div style="padding:0 20px 28px;display:flex;flex-direction:column;gap:16px">

  <div style="margin:0 -20px;padding:22px 20px 16px;background:#eef0dd;border-radius:0 0 26px 26px;display:flex;flex-direction:column;gap:14px">

    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <div style="min-width:0;display:flex;flex-direction:column">
        <h1 style="margin:0;font-size:26px;font-weight:700;line-height:1.2;letter-spacing:-0.01em">{{ homeGreeting }}</h1>
        <span style="font-size:12px;color:#8a8578">{{ homeToday }}</span>
      </div>
      <div style="display:flex;gap:6px;flex:none">
        ${roundButton("goChat", "Ask Baketly", '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"></path>')}
        ${roundButton("goContact", "Send a message", ENVELOPE)}
        ${roundButton("goSettings", "Settings", SETTINGS_GEAR)}
      </div>
    </div>

    <div style="font-size:14px;line-height:1.45">{{ homeSummary }}</div>

    <div style="display:flex;gap:6px">
      ${quickTile("goIngredientNew", "Ingredient", '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"></path><path d="M3 8l9 5 9-5"></path>')}
      ${quickTile("goPackagingNew", "Packaging", '<rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M3 11h18M12 7v13"></path>')}
      ${quickTile("goNewRecipe", "Recipe", '<path d="M6 3h9l4 4v14H6z"></path><path d="M9 12h7M9 16h5"></path>')}
      ${quickTile("startNewEvent", "Event", '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4M12 14v4M10 16h4"></path>')}
      ${quickTile("goCalculator", "Calculator", '<rect x="5" y="3" width="14" height="18" rx="2"></rect><path d="M8 7h8M8 12h2M12 12h2M16 12h2M8 16h2M12 16h2M16 16h2"></path>')}
    </div>

    <sc-if value="{{ homeHasNext }}" hint-placeholder-val="{{ false }}">
      <div sc-camel-on-click="{{ openNextEvent }}" style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#faf6f0;border-radius:18px;color:#33301f;cursor:pointer">
        <div style="flex:none;width:46px;height:46px;border-radius:13px;background:#7d8a3c;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1"><span style="font-size:9px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85">{{ homeNextWeekday }}</span><span style="font-size:19px;font-weight:600;font-feature-settings:'tnum'">{{ homeNextDayNum }}</span></div>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:#c9a24a">Next market</span><span style="font-size:15px;font-weight:600;line-height:1.3;overflow-wrap:anywhere">{{ homeNextName }}</span><span style="font-size:12px;color:#8a8578;font-feature-settings:'tnum'">{{ homeNextWhen }}</span></div>
        <sc-if value="{{ homeHasReady }}" hint-placeholder-val="{{ false }}"><div style="flex:none;display:flex;flex-direction:column;align-items:flex-end;line-height:1.2"><span style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:#7a7464">Ready</span><span style="font-size:14px;font-weight:600;color:#b07a1f;font-feature-settings:'tnum'">{{ homeReadyStr }}</span></div></sc-if>
        ${ICON(16, "#8a8578", "1.75", '<path d="M9 6l6 6-6 6"></path>')}
      </div>
    </sc-if>

  </div>

  <!-- A brand-new account has nothing to show below the band; the design is
       drawn for a baker already set up. The three first steps stay here, in
       the design's card, and each disappears the moment it is done. -->
  <sc-if value="{{ homeHasStarter }}" hint-placeholder-val="{{ false }}">
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:baseline;justify-content:space-between;padding:0 2px"><h6 style="margin:0;font-size:15px;font-weight:700;line-height:1.3">Getting set up</h6></div>
      <div style="background:#ffffff;border-radius:22px;padding:0 16px;box-shadow:0 2px 10px rgba(60,55,30,.07);display:flex;flex-direction:column">
        <sc-for list="{{ homeStarter }}" as="step" hint-placeholder-count="3">
          <div class="bk-row" sc-camel-on-click="{{ step.go }}" style="display:flex;align-items:center;gap:12px;min-height:44px;border-top:1px solid #eee7d9;cursor:pointer">
            <span style="width:22px;height:22px;flex:none;border-radius:7px;border:1.5px solid #e5dfd2;background:#ffffff"></span>
            <span style="flex:1;font-size:14px">{{ step.label }}</span>
            ${ICON(16, "#8a8578", "1.75", '<path d="M9 6l6 6-6 6"></path>')}
          </div>
        </sc-for>
      </div>
    </div>
  </sc-if>

  <div data-bk-days style="display:flex;gap:6px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch">
    <sc-for list="{{ homeWeek }}" as="day" hint-placeholder-count="7">
      <div sc-camel-on-click="{{ day.pick }}" style="flex:0 0 calc((100% - 36px) / 7);min-width:0;scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 0 8px;border-radius:14px;cursor:pointer;background:{{ day.tileBg }};color:{{ day.tileColor }};box-shadow:{{ day.tileRing }};font-feature-settings:'tnum';box-sizing:border-box">
        <span style="font-size:14px;font-weight:600;line-height:1.1">{{ day.number }}</span>
        <span style="font-size:9px;letter-spacing:0.06em;text-transform:uppercase;{{ day.letterStyle }}">{{ day.letter }}</span>
        <span style="width:4px;height:4px;border-radius:50%;background:{{ day.dotBg }};opacity:{{ day.dotOpacity }}"></span>
      </div>
    </sc-for>
  </div>

  <div style="display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;align-items:baseline;justify-content:space-between;padding:0 2px">
      <h6 style="margin:0;font-size:15px;font-weight:700;line-height:1.3">To do</h6>
      <span style="font-size:12px;color:#8a8578">{{ homeTodoMeta }}</span>
    </div>
    <div style="background:#ffffff;border-radius:22px;padding:0 16px;box-shadow:0 2px 10px rgba(60,55,30,.07);display:flex;flex-direction:column">
      <sc-for list="{{ homeTodos }}" as="todo" hint-placeholder-count="2">
        <div style="display:flex;align-items:center;gap:12px;min-height:44px;border-bottom:1px solid #eee7d9">
          <button sc-camel-on-click="{{ todo.toggle }}" aria-label="Done" style="width:22px;height:22px;flex:none;border-radius:7px;border:1.5px solid {{ todo.tickBorder }};background:{{ todo.tickBg }};cursor:pointer;display:grid;place-items:center;padding:0">
            <svg width="12" height="12" sc-camel-view-box="0 0 24 24" fill="none" stroke="{{ todo.tick }}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
          </button>
          <span style="flex:1;font-size:14px;color:{{ todo.textHex }};text-decoration:{{ todo.strike }}">{{ todo.text }}</span>
          <button sc-camel-on-click="{{ todo.remove }}" aria-label="Remove" style="flex:none;width:30px;height:30px;border:0;background:none;cursor:pointer;color:#c9c2b2;font-size:18px;line-height:1;margin-right:-8px">×</button>
        </div>
      </sc-for>
      <div style="display:flex;align-items:center;gap:12px;min-height:44px">
        <!-- the plus is the button: the design has no separate Add, and Enter
             adds as well, for a keyboard that shows a return key -->
        <button sc-camel-on-click="{{ addTodo }}" aria-label="Add this to-do" style="flex:none;width:22px;height:22px;border:0;background:none;padding:0;cursor:pointer;display:grid;place-items:center">${ICON(16, "#7d8a3c", "2", '<path d="M12 5v14M5 12h14"></path>')}</button>
        <input value="{{ todoDraft }}" sc-camel-on-change="{{ setTodoDraft }}" sc-camel-on-key-down="{{ addTodoOnEnter }}" aria-label="Add a to-do" placeholder="{{ homeTodoPlaceholder }}" style="flex:1;min-width:0;height:36px;border:0;background:none;font-family:inherit;font-size:13px;color:#33301f;outline:none">
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid #eee7d9;border-radius:18px;background:#ffffff;overflow:hidden">
    <div style="padding:11px 12px;display:flex;flex-direction:column;gap:3px"><div style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:#7a7464">Projected</div><div style="font-weight:600;font-size:16px;line-height:1.2;font-feature-settings:'tnum';overflow-wrap:anywhere">{{ homeProjectedStr }}</div></div>
    <div style="padding:11px 12px;border-left:1px solid #eee7d9;display:flex;flex-direction:column;gap:3px"><div style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:#7a7464">Made</div><div style="font-weight:600;font-size:16px;line-height:1.2;font-feature-settings:'tnum';overflow-wrap:anywhere">{{ homeMadeStr }}</div></div>
    <div style="padding:11px 12px;border-left:1px solid #eee7d9;display:flex;flex-direction:column;gap:3px"><div style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:#7a7464">Events</div><div style="font-weight:600;font-size:16px;line-height:1.2;font-feature-settings:'tnum'">{{ homeEventsStr }}</div></div>
    <div style="grid-column:1 / -1;border-top:1px solid #eee7d9;padding:7px 12px;font-size:11px;color:#7a7464">{{ homeMonthLabel }} · projected includes markets to come</div>
  </div>

</div>
`;

/**
 * Swaps the whole dashboard for the new screen. One anchor instead of the
 * eleven the module-by-module version needed.
 */
function replaceHomeScreen(template: string): string {
  const open = '<sc-if value="{{ onDash }}"';
  const start = template.indexOf(open);
  if (start === -1) throw new Error("Missing home screen anchor");
  const innerStart = template.indexOf(">", start) + 1;
  let depth = 1;
  let cursor = innerStart;
  while (depth > 0) {
    const nextOpen = template.indexOf("<sc-if", cursor);
    const nextClose = template.indexOf("</sc-if>", cursor);
    if (nextClose === -1) throw new Error("Unclosed home screen block");
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      cursor = nextOpen + 6;
    } else {
      depth -= 1;
      if (depth === 0) return template.slice(0, innerStart) + homeMarkup + template.slice(nextClose);
      cursor = nextClose + 8;
    }
  }
  throw new Error("Unclosed home screen block");
}

/** The greeting needs a name to greet, so Settings gains one field. */
function addNameField(template: string): string {
  const anchor =
    '<div class="field"><label>Bakery name</label><input class="input" value="{{ bakeryName }}"';
  if (!template.includes(anchor)) throw new Error("Missing settings bakery name anchor");
  return template.replace(
    anchor,
    () =>
      '<div class="field"><label>Your name</label><input class="input" value="{{ ownerName }}" sc-camel-on-change="{{ setOwnerName }}" aria-label="Your name" placeholder="what Baketly should call you"></div>' +
      anchor,
  );
}

const nameBinding = `      ownerName: this.state.ownerName || '',
      setOwnerName: e => this.setState({ ownerName: e.target.value.slice(0, 60) }),
`;

function addNameBinding(template: string): string {
  const anchor = /([ \t]*)onAnalytics:\s*screen\s*===\s*'analytics',/;
  if (!anchor.test(template)) throw new Error("Missing stable owner name anchor");
  return template.replace(
    anchor,
    (_match, indent: string) => `${nameBinding}${indent}onAnalytics: screen === 'analytics',`,
  );
}

export function applyHomeBehavior(template: string): string {
  return addNameField(addNameBinding(replaceHomeScreen(addHomeController(template))));
}

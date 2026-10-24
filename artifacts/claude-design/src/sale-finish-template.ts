// Finishing an event from the till.
//
// design/mobile-redesign/screens/SaleFinish.dc.html: the ✓ opens a sheet
// over the till -- "Finish Saturday Market?", each lineup row with what was
// taken and − sold +, filled in from what was rung up; Took and You earned;
// Complete event -- where it used to leave the till for a page holding only
// the event's name with the same sheet over it.
//
// The rows, sums and completing are the event's own (sale-template.ts puts
// the till's counts in, event-template.ts completes it), drawn with the
// overview's sold sheet. What changes is where it happens: the till stays on
// the event behind the sheet, so Close is back to the till with its basket
// as it was. Complete event ends the event there and goes to Events, as it
// always has: the design links it to the event's overview, but the overview
// has no completed state yet and would show the plan's projection.

import { soldSheet } from "./event-overview-template";
import { scBlock, swapOnce } from "./template-blocks";

const LABEL_ = "Sale finish";

/** In the sale controller's scope: attachedEvent. */
const finishBindings = `          saleFinishTitle: 'Finish ' + (attachedEvent ? (attachedEvent.name || 'Market') : 'this event') + '?',
          closeSaleFinish: e => { if (!e || e.target === e.currentTarget) this.setState({ evEnteringResults: false, evResultsOnly: false }); },
          dismissSaleFinish: () => this.setState({ evEnteringResults: false, evResultsOnly: false }),
          leaveSaleEvent: () => this.setState({ saleEventId: '' }),
`;

function addBindings(template: string): string {
  // the ✓ opens the sheet where the till is, still on its event
  let out = swapOnce(
    template,
    "              saleEventId: '',\n              screen: 'event', editingKey: '', evResultsOnly: false,\n              stack: [...st.stack, st.screen],\n              eventCurrentId: attachedEvent.id,\n",
    "              editingKey: '',\n              eventCurrentId: attachedEvent.id,\n",
    `${LABEL_} open`,
  );
  out = swapOnce(out, "          leaveSaleEvent: () => this.setState({ saleEventId: '' }),\n", finishBindings, `${LABEL_} bindings`);
  // completed from the till, the till is done with the event too
  return swapOnce(
    out,
    "            evStatus: 'completed',\n            evEnteringResults: false,\n",
    "            evStatus: 'completed',\n            evEnteringResults: false,\n" +
      "            ...(st.evResultsOnly === true ? { evResultsOnly: false, saleEventId: '', posQty: {} } : {}),\n",
    `${LABEL_} complete`,
  );
}

function addSheet(template: string): string {
  const till = scBlock(template, '<sc-if value="{{ onSale }}" hint-placeholder-val="{{ false }}">', `${LABEL_} till`);
  const sheet = soldSheet({
    open: "{{ evResultsOnly }}",
    onBackdrop: "{{ closeSaleFinish }}",
    title: "{{ saleFinishTitle }}",
    label: "Finish this event",
    sub: "Filled in from what you rang up. Fix anything the till missed.",
    onClose: "{{ dismissSaleFinish }}",
  });
  return template.slice(0, till.innerEnd) + sheet + template.slice(till.innerEnd);
}

export function applySaleFinishBehavior(template: string): string {
  return addSheet(addBindings(template));
}

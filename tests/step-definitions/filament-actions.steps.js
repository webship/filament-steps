'use strict';

// Actions and their modals: the actions at the top of a page and of a row of
// a table (directly, or in the row's menu of actions), the modals and
// slide-overs they open (a form, or a confirmation), and what the panel does
// with them.
//
// An action is one round trip to the server: a step that runs one waits for
// its answer, then for the modal it opens to finish its transition. The
// fields of an open modal are set with the form steps (`I set "Subject" to
// "..."`): a field is looked for in the open modal first. webship-js's own
// modal steps work on the panel's modals too (this pack names its window as
// webship-js's "modal" selector): `Then I should see "Webship" in the modal`.

const { When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  laravel,
  rest,
  act,
  follow,
  openModals,
  topModal,
  waitForModal,
  waitForModalClosed,
  openDropdown,
  closeDropdowns,
  tableLocator,
  rowLocator,
} = require('./filament-helpers');

const { budget, clean, listed, escapeRegExp, eventually } = laravel;

/** A pattern for an action's name as it reads (case and spaces ignored). */
function named(name) {
  return new RegExp(`^\\s*${escapeRegExp(clean(name))}\\s*$`, 'i');
}

/**
 * The actions at the top of the page, beside its heading: their own container in the page's header (the
 * header also holds the breadcrumbs and the heading, whose links are no actions). A page without actions
 * has no such container: the locator then finds nothing.
 */
function pageActions(world) {
  return world.page.locator('.fi-header .fi-header-actions-ctn').first();
}

/** The names of the controls of a container, for an error message. */
async function namesOf(container) {
  if (!(await container.count())) return [];
  return container.evaluate((root) => [...root.querySelectorAll('a, button')]
    .map((el) => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)).catch(() => []).then((list) => [...new Set(list)]);
}

/**
 * Find an action among the controls of a container (by its text, its label
 * or its title), else in a menu of actions it holds (opened to look). Returns
 * `{ control, href }` or null.
 */
async function findAction(world, container, name, menuLabel) {
  const direct = container.locator('a, button').filter({ visible: true }).filter({ hasText: named(name) })
    .or(container.locator(`a[aria-label="${clean(name)}"], button[aria-label="${clean(name)}"], a[title="${clean(name)}"], button[title="${clean(name)}"]`).filter({ visible: true }))
    .first();
  if (await direct.count()) return { control: direct, inMenu: false };
  const menus = container.locator('button[aria-haspopup="menu"]').filter({ visible: true });
  const count = await menus.count();
  for (let i = 0; i < count; i += 1) {
    const panel = await openDropdown(world, menus.nth(i), menuLabel);
    const item = panel.locator('a, button').filter({ hasText: named(name) }).first();
    if (await item.count()) return { control: item, inMenu: true };
    await closeDropdowns(world);
  }
  return null;
}

/** Run an action control: follow it when it is a link, else click it and wait for the server and for a modal it opens. */
async function runAction(world, control, label) {
  const href = await control.getAttribute('href').catch(() => null);
  if (href && !/^#|^javascript:/i.test(href)) {
    const target = await control.getAttribute('target').catch(() => null);
    if (target === '_blank') throw friendly({ message: `${label} opens another window (${href}).`, hint: 'Assert its address instead: the link should point at it.' });
    await follow(world, control, label);
    return;
  }
  const before = (await openModals(world)).length;
  await act(world, () => control.click());
  // A modal the action opens: wait for its transition (it may need the server first).
  const deadline = Date.now() + 1500;
  while (Date.now() < deadline) {
    const modals = await openModals(world);
    if (modals.length > before) {
      await eventually(world, () => openModals(world), (list) => list.every((m) => m.settled), () => ({ message: 'The modal did not settle.', hint: 'A modal plays a short transition when it opens.' }));
      break;
    }
    if (await world.page.locator('.fi-no-notification').count()) break;
    await world.page.waitForTimeout(50);
  }
  await rest(world);
}

/**
 * Run an action at the top of the page (beside its heading), directly or from
 * its menu of actions. A link opens its page; an action that asks for a
 * confirmation or a form opens its modal (assert it, fill it, confirm it with
 * the next steps).
 *
 * Example #1: When I run the "Replicate" action of the page
 * Example #2: When I run the "Edit" action of the page
 * Example #3: And we run the "Restore" action of the page
 * Example #4: When I run the "Export" action of the page
 * Example #5: When I run the "Import" action of the page
 */
When(/^(I |we )*run the "([^"]*)" action of the page$/, async function (pronounCase, name) {
  const header = pageActions(this);
  const found = await findAction(this, header, name, 'actions of the page');
  if (!found) {
    throw friendly({ message: `The page has no "${name}" action. Its actions: ${listed(await namesOf(header))}.`, hint: 'The actions of a page are beside its heading (some in a menu); an account that may not run one does not see it.' });
  }
  await runAction(this, found.control, `the "${name}" action of the page`);
});

/**
 * Assert that the page offers an action at its top (directly or in its menu
 * of actions), or does not.
 *
 * Example #1: Then the page should offer the "Replicate" action
 * Example #2: Then the page should not offer the "Restore" action
 * Example #3: And the page should offer the "Delete" action
 * Example #4: Then the page should offer the "Export" action
 * Example #5: But the page should not offer the "Force delete" action
 */
Then(/^the page should( not)* offer the "([^"]*)" action$/, async function (notCase, name) {
  const header = pageActions(this);
  const found = await findAction(this, header, name, 'actions of the page');
  await closeDropdowns(this);
  if (!!found === !!notCase) {
    throw friendly({ message: `Expected the page ${notCase ? 'not ' : ''}to offer the "${name}" action. Its actions: ${listed(await namesOf(header))}.`, hint: 'The actions of a page are beside its heading; some are in a menu.' });
  }
});

/**
 * Run an action of a table itself (at the top of the list, or of a relation
 * manager's list): "New address", "Attach", "Export". An action with a form
 * opens its modal.
 *
 * Example #1: When I run the "New address" action of the "Addresses" list
 * Example #2: When I run the "Export" action of the list
 * Example #3: And we run the "Attach" action of the "Products" list
 * Example #4: When I run the "Import" action of the list
 * Example #5: When I run the "New comment" action of the "Comments" list
 */
When(/^(I |we )*run the "([^"]*)" action of the (?:"([^"]*)" )?list$/, async function (pronounCase, name, relation) {
  const table = await tableLocator(this, relation ? { relation } : {});
  const header = table.locator('.fi-ta-header, .fi-ta-header-ctn').first();
  const found = await findAction(this, (await header.count()) ? header : table, name, 'actions of the list');
  if (!found) {
    throw friendly({ message: `The ${relation ? `"${relation}" ` : ''}list has no "${name}" action. It offers: ${listed(await namesOf((await header.count()) ? header : table))}.`, hint: 'The actions of a table are at its top, beside its heading.' });
  }
  await runAction(this, found.control, `the "${name}" action of the list`);
});

/**
 * Run an action of a row of the list (the row that shows a text): a button or
 * link of the row, or an item of its menu of actions. An action that asks for
 * a confirmation or a form opens its modal or slide-over.
 *
 * Example #1: When I run the "Ship" action on the "WS-TEST-0001" row
 * Example #2: When I run the "Send email" action on the "Wendy Webship" row
 * Example #3: And we run the "Process" action on the "WS-TEST-0001" row
 * Example #4: When I run the "Delete" action on the "Webship Test Kettle" row
 * Example #5: When I run the "Edit" action on the "Webship note about the harbour" row of the "Addresses" list
 */
When(/^(I |we )*run the "([^"]*)" action on the "([^"]*)" row(?: of the "([^"]*)" list)?$/, async function (pronounCase, name, rowText, relation) {
  const table = await tableLocator(this, relation ? { relation } : {});
  const row = await rowLocator(this, table, rowText);
  const actions = row.locator('.fi-ta-actions, td:last-child').first();
  const found = await findAction(this, (await actions.count()) ? actions : row, name, `actions of the "${rowText}" row`);
  if (!found) {
    throw friendly({ message: `The "${rowText}" row has no "${name}" action. It offers: ${listed(await namesOf(row))}.`, hint: 'The actions of a row are at its end (some in its menu of actions); some show only for records in a given state.' });
  }
  await runAction(this, found.control, `the "${name}" action of the "${rowText}" row`);
});

/**
 * Assert that a row of the list offers an action (directly or in its menu of
 * actions), or does not: actions that show only for records in a state.
 *
 * Example #1: Then the "WS-TEST-0001" row should offer the "Process" action
 * Example #2: Then the "WS-TEST-0001" row should not offer the "Deliver" action
 * Example #3: And the "Wendy Webship" row should offer the "Send email" action
 * Example #4: Then the "WS-TEST-0001" row should offer the "Ship" action
 * Example #5: But the "WS-TEST-0001" row should not offer the "Ship" action
 */
Then(/^the "([^"]*)" row should( not)* offer the "([^"]*)" action$/, async function (rowText, notCase, name) {
  const table = await tableLocator(this);
  const row = await rowLocator(this, table, rowText);
  const found = await findAction(this, row, name, `actions of the "${rowText}" row`);
  await closeDropdowns(this);
  if (!!found === !!notCase) {
    throw friendly({ message: `Expected the "${rowText}" row ${notCase ? 'not ' : ''}to offer the "${name}" action. It offers: ${listed(await namesOf(row))}.`, hint: 'Some actions show only for records in a given state.' });
  }
});

/**
 * Assert that a modal (or a slide-over) with a heading is open, and its
 * transition finished; or that no modal (or none with that heading) is open.
 *
 * Example #1: Then the "Send email" modal should be open
 * Example #2: Then the "Ship" slide-over should be open
 * Example #3: And the "Delete" modal should be closed
 * Example #4: Then no modal should be open
 * Example #5: Then the "Ship" slide-over should be closed
 */
Then(/^(?:the "([^"]*)" (modal|slide-over) should be (open|closed)|no modal should be open)$/, async function (heading, kind, state) {
  if (heading == null || state === 'closed') {
    await waitForModalClosed(this, heading == null ? null : heading);
    return;
  }
  await waitForModal(this, heading, { slideOver: kind === 'slide-over' });
});

/**
 * Confirm or cancel the open modal: its primary button (the action's own
 * name, "Confirm", "Submit"), or "Cancel"; then wait for it to close and for
 * the action's answer. A refused form keeps the modal open, with its errors.
 *
 * Example #1: When I confirm the modal
 * Example #2: When I cancel the modal
 * Example #3: And we confirm the modal
 * Example #4: When we cancel the modal
 * Example #5: Then I confirm the modal
 */
When(/^(I |we )*(confirm|cancel) the modal$/, async function (pronounCase, action) {
  const modal = await topModal(this);
  if (!modal) throw friendly({ message: 'No modal is open.', hint: 'Open one with its action first.' });
  const footer = modal.locator('.fi-modal-footer-actions, .fi-modal-footer').first();
  const buttons = footer.locator('button').filter({ visible: true });
  let button;
  if (action === 'cancel') {
    button = buttons.filter({ hasText: /^\s*Cancel\s*$/i }).first();
  } else {
    // The submit button of its form, else the first button that is not "Cancel".
    const submit = footer.locator('button[type="submit"]').filter({ visible: true }).first();
    button = (await submit.count()) ? submit : buttons.filter({ hasNotText: /^\s*Cancel\s*$/i }).first();
  }
  if (!(await button.count())) throw friendly({ message: `The open modal has no button to ${action} it. It has: ${listed(await namesOf(footer))}.`, hint: 'A modal confirms with its action\'s button and cancels with "Cancel".' });
  const heading = (await openModals(this)).pop().heading;
  await act(this, () => button.click());
  if (action === 'cancel') {
    await waitForModalClosed(this, heading);
    return;
  }
  // Closed; or still open with the errors of its form; or kept open by the browser, which refuses to
  // send a form with an empty required field (assert it with "... should block submission as required").
  await eventually(this, async () => ({
    open: (await openModals(this)).some((m) => m.heading === heading),
    errors: await modal.locator('[data-validation-error]').count().catch(() => 0),
    blocked: await modal.locator('input:invalid, textarea:invalid, select:invalid').count().catch(() => 0),
  }), (state) => !state.open || state.errors > 0 || state.blocked > 0, () => ({ message: `The "${heading}" modal neither closed nor showed an error.`, hint: 'The action of a modal runs on the server; its answer closes the modal or shows the errors of its form.' }));
  await rest(this);
});

/**
 * Press a button in the footer of the open modal by its text (an extra
 * action, such as "Ship & notify customer"), and wait for the answer.
 *
 * Example #1: When I press "Ship & notify customer" in the modal footer
 * Example #2: When I press "Send" in the modal footer
 * Example #3: And we press "Submit" in the modal footer
 * Example #4: When I press "Cancel" in the modal footer
 * Example #5: When I press "Delete" in the modal footer
 */
When(/^(I |we )*press "([^"]*)" in the modal footer$/, async function (pronounCase, name) {
  const modal = await topModal(this);
  if (!modal) throw friendly({ message: 'No modal is open.', hint: 'Open one with its action first.' });
  const footer = modal.locator('.fi-modal-footer-actions, .fi-modal-footer').first();
  const button = footer.locator('button, a').filter({ visible: true }).filter({ hasText: named(name) }).first();
  if (!(await button.count())) throw friendly({ message: `The footer of the open modal has no "${name}". It has: ${listed(await namesOf(footer))}.`, hint: 'Name the button as it reads.' });
  await act(this, () => button.click());
});

/**
 * Close the open modal with its "Close" button (the cross at its top), as a
 * person does, and wait for it to be gone.
 *
 * Example #1: When I close the open modal
 * Example #2: When we close the open modal
 * Example #3: And I close the open modal
 * Example #4: Then I close the open modal
 * Example #5: When I close the open modal
 */
When(/^(I |we )*close the open modal$/, async function (pronounCase) {
  const modal = await topModal(this);
  if (!modal) throw friendly({ message: 'No modal is open.', hint: 'Open one with its action first.' });
  const heading = (await openModals(this)).pop().heading;
  const close = modal.locator('.fi-modal-close-btn, button[aria-label="Close"], button[title="Close"]').first();
  if (await close.count()) await close.click();
  else await this.page.keyboard.press('Escape');
  await waitForModalClosed(this, heading);
});

/**
 * Assert the description (the text under the heading) of the open modal: a
 * confirmation's question.
 *
 * Example #1: Then the modal should ask "Are you sure you would like to do this?"
 * Example #2: Then the modal should ask "Are you sure you want to delete this?"
 * Example #3: And the modal should ask "Are you sure you would like to do this?"
 * Example #4: Then the modal should ask "This will put the project on hold."
 * Example #5: And the modal should ask "Are you sure you would like to do this?"
 */
Then(/^the modal should ask "([^"]*)"$/, async function (text) {
  const modal = await topModal(this);
  if (!modal) throw friendly({ message: 'No modal is open.', hint: 'Open one with its action first.' });
  const description = clean(await modal.locator('.fi-modal-description').first().innerText({ timeout: budget(this) }).catch(() => ''));
  if (!description.toLowerCase().includes(clean(text).toLowerCase())) {
    throw friendly({ message: `The open modal asks "${description}", not "${text}".`, hint: 'The question is the text under the heading of a confirmation.' });
  }
});

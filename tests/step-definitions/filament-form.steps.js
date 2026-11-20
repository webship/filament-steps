'use strict';

// The forms of the panel: every kind of field by its label (a text, a number,
// a date, a choice from a list that searches the server, a switch, a
// checkbox, a list of checkboxes, radio buttons and toggle buttons, a rich
// text, a Markdown text, tags, a colour), files to upload, the rows of a
// repeater and the blocks of a builder, the properties of a key-value field,
// the tabs of a form and the steps of a wizard, saving, creating, deleting
// the record, and the fields a form shows or hides as it changes.
//
// A field is found by its label as the form writes it (the "*" of a required
// field left out), in the open modal when there is one, else on the page.
// The errors under a field are the Laravel pack's steps: `Then the "Name"
// field should have the error "The name field is required."`.

const path = require('path');
const fs = require('fs');
const { Given, When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  laravel,
  rest,
  act,
  follow,
  scope,
  topModal,
  waitForModal,
  waitForModalClosed,
  openDropdown,
  closeDropdowns,
  findPanelField,
  setPanelField,
  readPanelField,
} = require('./filament-helpers');

const { budget, clean, listed, escapeRegExp, eventually } = laravel;

/**
 * Set a field of the form (or of the open modal) to a value, by its label, the
 * way a person does for its kind: type a text, a number or a date
 * (2026-12-01), pick an option of a list (searching for it when the list
 * searches the server), turn a switch "on" or "off", check a checkbox
 * ("checked", "unchecked"), check the options of a list of checkboxes
 * ("PHP, Laravel"), choose a radio or toggle button, write a rich or Markdown
 * text, add tags ("a, b").
 *
 * Example #1: When I set "Name" to "Webship test lamp"
 * Example #2: When I set "Visibility" to "off"
 * Example #3: And I set "Brand" to "Webship Brand Alpha"
 * Example #4: When I set "Labels" to "Bug, Feature"
 * Example #5: And we set "Due date" to "2026-12-01"
 */
When(/^(I |we )*set "([^"]*)" to "([^"]*)"$/, async function (pronounCase, field, value) {
  await setPanelField(this, field, value);
});

/**
 * Set several fields of the form, one per row of a table: the label, then the
 * value.
 *
 * Example #1: When I set these fields:
 * Example #2: When we set these fields:
 * Example #3: And I set these fields:
 * Example #4: Given I set these fields:
 * Example #5: Then I set these fields:
 */
When(/^(I |we )*set these fields:$/, async function (pronounCase, table) {
  for (const [field, value] of table.raw()) {
    await setPanelField(this, field, value);
  }
});

/**
 * Assert what a field of the form holds, as a person reads it: the text, the
 * chosen option (or options, separated by commas), "on" or "off" for a
 * switch, "checked" or "unchecked" for a checkbox, the checked options of a
 * list, the text of a rich editor, the tags.
 *
 * Example #1: Then "Name" should be set to "Webship test lamp"
 * Example #2: Then "Visibility" should be set to "off"
 * Example #3: And "Brand" should be set to "Webship Brand Alpha"
 * Example #4: Then "Labels" should be set to "Bug, Feature"
 * Example #5: And "Due date" should be set to "2026-12-01"
 */
Then(/^"([^"]*)" should be set to "([^"]*)"$/, async function (field, value) {
  const wanted = clean(value).toLowerCase();
  await eventually(this, () => readPanelField(this, field), (read) => read.value.toLowerCase() === wanted, (read) => ({
    message: `The "${field}" field holds "${read.value}", not "${value}" (a ${read.kind.replace('-', ' ')}).`,
    hint: read.kind === 'select' ? 'A list shows the label of its option, not its value.' : 'The form shows what the record holds, or what was typed since.',
  }));
});

/**
 * Assert that a field of the form cannot be changed (disabled or read only),
 * or that it can.
 *
 * Example #1: Then the "Slug" field should be read only
 * Example #2: Then the "Name" field should not be read only
 * Example #3: And the "Number" field should be read only
 * Example #4: Then the "To" field should be read only
 * Example #5: And the "Title" field should not be read only
 */
Then(/^the "([^"]*)" field should( not)* be read only$/, async function (label, notCase) {
  const field = await findPanelField(this, label);
  const readOnly = await field.wrapper.evaluate((w) => {
    const controls = [...w.querySelectorAll('input:not([type="hidden"]), select, textarea, button[role="switch"], .fi-select-input-btn, [contenteditable]')]
      .filter((el) => el.closest('[data-field-wrapper]') === w);
    if (!controls.length) return true;
    return controls.every((el) => el.disabled || el.readOnly || el.getAttribute('aria-disabled') === 'true' || el.getAttribute('contenteditable') === 'false');
  });
  if (readOnly === !!notCase) {
    throw friendly({ message: `Expected the "${label}" field ${notCase ? 'to be changeable' : 'to be read only'}, but it ${readOnly ? 'cannot be changed' : 'can be changed'}.`, hint: 'A field the form shows for reading is disabled or read only.' });
  }
});

/**
 * Assert that the form shows a field (by its label), or does not: a form
 * shows and hides fields as its other fields change.
 *
 * Example #1: Then the form should show the field "Salary"
 * Example #2: Then the form should not show the field "Hourly rate"
 * Example #3: And the form should show the field "Hourly rate"
 * Example #4: Then the form should not show the field "Salary"
 * Example #5: And the form should show the field "Metadata"
 */
Then(/^the form should( not)* show the field "([^"]*)"$/, async function (notCase, label) {
  const shows = async () => !!(await findPanelField(this, label, { timeout: 1 }).catch(() => null))
    && await (await findPanelField(this, label, { timeout: 1 })).wrapper.isVisible().catch(() => false);
  await eventually(this, shows, (visible) => visible !== !!notCase, () => ({
    message: `Expected the form ${notCase ? 'not ' : ''}to show the field "${label}".`,
    hint: 'A field that depends on another one shows once that one has the value it waits for; a field on another tab shows with its tab.',
  }));
});

/** The path of a file a step names: as given, else in tests/assets/ of the project, else of this pack. */
function fixturePath(name) {
  const candidates = [path.resolve(name), path.resolve('tests', 'assets', name), path.join(__dirname, '..', 'assets', name)];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw friendly({ message: `No file "${name}" was found (looked in: ${candidates.join(', ')}).`, hint: 'Put the file in tests/assets/ of the project, or name it by its path.' });
  }
  return found;
}

/** The states of the files of an upload field: name, state, message. */
async function uploads(field) {
  return field.wrapper.evaluate((w) => [...w.querySelectorAll('.filepond--item')].map((item) => ({
    name: ((item.querySelector('.filepond--file-info-main') || {}).textContent || '').trim(),
    state: item.getAttribute('data-filepond-item-state') || '',
    status: ((item.querySelector('.filepond--file-status-main') || {}).textContent || '').trim(),
    sub: ((item.querySelector('.filepond--file-status-sub') || {}).textContent || '').trim(),
  })));
}

/**
 * Upload a file to an upload field, as a person picks it, and wait for the
 * upload to finish (or to be refused: assert it with the next step). The file
 * is named by its path, or found in tests/assets/ (of the project, then of
 * this pack).
 *
 * Example #1: When I upload "test-panel-photo.jpg" to the "Images" field
 * Example #2: When I upload "test-panel-image.png" to the "Images" field
 * Example #3: And we upload "test-panel-photo.jpg" to the "Attachments" field
 * Example #4: When I upload "tests/assets/test-panel-photo.jpg" to the "Images" field
 * Example #5: When I upload "test-panel-photo.jpg" to the "Receipt" field
 */
When(/^(I |we )*upload "([^"]*)" to the "([^"]*)" field$/, async function (pronounCase, file, label) {
  const filePath = fixturePath(file);
  const field = await findUploadField(this, label);
  const name = path.basename(filePath);
  const before = (await uploads(field)).length;
  await act(this, () => field.wrapper.locator('input[type="file"]').first().setInputFiles(filePath));
  await eventually(this, () => uploads(field), (list) => list.length > before && list.filter((item) => item.name === name).every((item) => /complete|invalid|error|idle/.test(item.state)), (list) => ({
    message: `The upload of "${name}" to the "${label}" field did not finish: ${listed(list.map((item) => `${item.name} (${item.state})`))}.`,
    hint: 'A file is uploaded to the app as soon as it is picked; a large file takes longer.',
  }));
  await rest(this);
});

/** An upload field: by its label, else by the heading of the section it is the only upload of (the demo's "Images"). */
async function findUploadField(world, label) {
  const field = await findPanelField(world, label, { timeout: 1000 }).catch(() => null);
  if (field && field.kind === 'file-upload') return field;
  const container = await scope(world);
  const section = container.locator('.fi-section').filter({ has: world.page.locator('.fi-section-header-heading', { hasText: new RegExp(`^\\s*${escapeRegExp(clean(label))}\\s*$`, 'i') }) }).first();
  if (await section.count()) {
    const wrapper = section.locator('[data-field-wrapper]').filter({ has: world.page.locator('.fi-fo-file-upload') }).first();
    if (await wrapper.count()) return { wrapper, kind: 'file-upload', label };
  }
  if (field) throw friendly({ message: `The "${label}" field is not an upload field (it is a ${field.kind.replace('-', ' ')}).`, hint: 'Name the field that takes files.' });
  return findPanelField(world, label);
}

/**
 * Assert that an upload field holds a file whose upload finished, or that it
 * refused the file with a message (the type or the size it takes).
 *
 * Example #1: Then the "Images" field should hold the file "test-panel-photo.jpg"
 * Example #2: Then the "Images" field should refuse the file "test-panel-image.png" with "File of invalid type"
 * Example #3: And the "Attachments" field should hold the file "test-panel-photo.jpg"
 * Example #4: Then the "Images" field should not hold the file "test-panel-photo.jpg"
 * Example #5: And the "Receipt" field should hold the file "test-panel-photo.jpg"
 */
Then(/^the "([^"]*)" field should( not)* (hold|refuse) the file "([^"]*)"(?: with "([^"]*)")?$/, async function (label, notCase, verb, file, message) {
  const field = await findUploadField(this, label);
  const name = path.basename(file);
  const list = await uploads(field);
  const item = list.find((entry) => entry.name === name);
  if (verb === 'hold') {
    const holds = !!item && /complete|idle/.test(item.state);
    if (holds === !!notCase) {
      throw friendly({ message: `Expected the "${label}" field ${notCase ? 'not ' : ''}to hold "${name}". It holds: ${listed(list.map((entry) => `${entry.name} (${entry.state})`))}.`, hint: 'A file is held once its upload is complete.' });
    }
    return;
  }
  const refused = !!item && /invalid|error/.test(item.state) && (!message || `${item.status} ${item.sub}`.toLowerCase().includes(clean(message).toLowerCase()));
  if (refused === !!notCase) {
    throw friendly({ message: `Expected the "${label}" field ${notCase ? 'not ' : ''}to refuse "${name}"${message ? ` with "${message}"` : ''}. It shows: ${listed(list.map((entry) => `${entry.name}: ${entry.status} ${entry.sub}`.trim()))}.`, hint: 'An upload field refuses a file of a type or a size it does not take, with the reason under the file.' });
  }
});

/**
 * Remove a file from an upload field, with its "Remove" button.
 *
 * Example #1: When I remove the file "test-panel-photo.jpg" from the "Images" field
 * Example #2: When I remove the file "test-panel-image.png" from the "Images" field
 * Example #3: And we remove the file "test-panel-photo.jpg" from the "Attachments" field
 * Example #4: When I remove the file "test-panel-photo.jpg" from the "Receipt" field
 * Example #5: Then I remove the file "test-panel-image.png" from the "Images" field
 */
When(/^(I |we )*remove the file "([^"]*)" from the "([^"]*)" field$/, async function (pronounCase, file, label) {
  const field = await findUploadField(this, label);
  const name = path.basename(file);
  const item = field.wrapper.locator('.filepond--item').filter({ has: this.page.locator('.filepond--file-info-main', { hasText: name }) }).first();
  if (!(await item.count())) throw friendly({ message: `The "${label}" field has no file "${name}".`, hint: 'Upload it first.' });
  // A refused file is removed with "Remove", an uploaded one with the "Remove" that reverts its upload: the one on screen.
  await act(this, () => item.locator('button.filepond--action-remove-item, button.filepond--action-revert-item-processing').filter({ visible: true }).first().click());
  await eventually(this, () => uploads(field), (list) => !list.some((entry) => entry.name === name), () => ({ message: `The file "${name}" is still in the "${label}" field.`, hint: 'Its "Remove" button takes it out.' }));
});

// ---------------------------------------------------------------------------
// Repeaters and builders: rows (items, blocks)
// ---------------------------------------------------------------------------

/** The rows of a repeater or a builder field: their labels (a builder block's name, a repeater item's label). */
async function rowsOf(field) {
  return field.wrapper.evaluate((w) => {
    const items = [...w.querySelectorAll('.fi-fo-repeater-item, .fi-fo-builder-item, .fi-fo-table-repeater tbody tr')].filter((item) => item.closest('[data-field-wrapper]') === w);
    return items.map((item) => {
      const label = item.querySelector(':scope > .fi-fo-repeater-item-header .fi-fo-repeater-item-header-label, :scope > .fi-fo-builder-item-header .fi-fo-builder-item-header-label, .fi-fo-builder-item-header-label, .fi-fo-repeater-item-header-label');
      // The header writes the block's name and its number in the field ("Milestone 1"): the name.
      return (label ? label.textContent : '').replace(/\s+/g, ' ').trim().replace(/\s+\d+$/, '');
    });
  });
}

/** A row (item or block) of a repeater or builder, as a locator, 1-based. */
async function rowItem(world, field, n) {
  const items = field.wrapper.locator('.fi-fo-repeater-item, .fi-fo-builder-item, .fi-fo-table-repeater tbody tr');
  const count = await items.count();
  if (n < 1 || n > count) throw friendly({ message: `"${field.label}" has ${count} rows: there is no row ${n}.`, hint: 'Rows are counted from 1, top down.' });
  return items.nth(n - 1);
}

/** A repeater or builder field by its label. */
async function itemsField(world, label) {
  const field = await findPanelField(world, label);
  if (!['repeater', 'builder'].includes(field.kind)) throw friendly({ message: `The "${label}" field is not a repeater or a builder (it is a ${field.kind.replace('-', ' ')}).`, hint: 'Rows are added to a repeater or a builder.' });
  return field;
}

/**
 * Add a row to a repeater with its "Add" button, at the end.
 *
 * Example #1: When I add a row to "Order items"
 * Example #2: When we add a row to "Items"
 * Example #3: And I add a row to "Line items"
 * Example #4: When I add a row to "Expense lines"
 * Example #5: When I add a row to "Order items"
 */
When(/^(I |we )*add a row to "([^"]*)"$/, async function (pronounCase, label) {
  const field = await itemsField(this, label);
  const before = (await rowsOf(field)).length;
  const add = field.wrapper.locator('.fi-fo-repeater-add, .fi-fo-builder-add, .fi-fo-table-repeater-add').locator('button').first();
  const button = (await add.count()) ? add : field.wrapper.locator('button').filter({ hasText: /^\s*Add\b/i }).last();
  if (!(await button.count())) throw friendly({ message: `"${label}" has no button to add a row.`, hint: 'A repeater that may grow has an "Add" button below its rows.' });
  await act(this, () => button.click());
  await eventually(this, () => rowsOf(field), (rows) => rows.length === before + 1, (rows) => ({ message: `"${label}" has ${rows.length} rows after adding one, not ${before + 1}.`, hint: 'A repeater with a maximum of rows adds no more.' }));
});

/**
 * Add a block to a builder: its "Add" button, then the block by its name in
 * the list it opens.
 *
 * Example #1: When I add the "Milestone" block to "Plan"
 * Example #2: When we add the "Task group" block to "Plan"
 * Example #3: And I add the "Checkpoint" block to "Plan"
 * Example #4: When I add the "Milestone" block to "Content"
 * Example #5: When I add the "Checkpoint" block to "Plan"
 */
When(/^(I |we )*add the "([^"]*)" block to "([^"]*)"$/, async function (pronounCase, block, label) {
  const field = await itemsField(this, label);
  const before = (await rowsOf(field)).length;
  const add = field.wrapper.locator('.fi-fo-builder-add button, .fi-fo-builder-add-between-items button').last();
  const button = (await add.count()) ? add : field.wrapper.locator('button').filter({ hasText: /^\s*Add\b/i }).last();
  if (!(await button.count())) throw friendly({ message: `"${label}" has no button to add a block.`, hint: 'A builder has an "Add" button below its blocks.' });
  const panel = await openDropdown(this, button, `list of blocks of "${label}"`);
  const choice = panel.locator('button, [role="menuitem"]').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(clean(block))}\\s*$`, 'i') }).first();
  if (!(await choice.count())) {
    const offered = (await panel.locator('button, [role="menuitem"]').allInnerTexts()).map(clean).filter(Boolean);
    await closeDropdowns(this);
    throw friendly({ message: `"${label}" offers no block "${block}". It offers: ${listed(offered)}.`, hint: 'Name the block as the list writes it.' });
  }
  await act(this, () => choice.click());
  await eventually(this, () => rowsOf(field), (rows) => rows.length === before + 1, (rows) => ({ message: `"${label}" has ${rows.length} blocks after adding one, not ${before + 1}.`, hint: 'A builder with a maximum of blocks adds no more.' }));
});

/**
 * Assert the number of rows (items, blocks) of a repeater or a builder.
 *
 * Example #1: Then "Order items" should have 2 rows
 * Example #2: Then "Plan" should have 3 rows
 * Example #3: And "Items" should have 1 row
 * Example #4: Then "Expense lines" should have 2 rows
 * Example #5: Then "Plan" should have 0 rows
 */
Then(/^"([^"]*)" should have (\d+) rows?$/, async function (label, count) {
  const field = await itemsField(this, label);
  await eventually(this, () => rowsOf(field), (rows) => rows.length === Number(count), (rows) => ({ message: `"${label}" has ${rows.length} rows, not ${count}.`, hint: 'Rows are added and removed with their buttons.' }));
});

/**
 * Assert the rows of a builder (or the labels of a repeater's items), in
 * order.
 *
 * Example #1: Then the rows of "Plan" should be "Milestone" and "Task group"
 * Example #2: Then the rows of "Plan" should be "Milestone", "Task group" and "Checkpoint"
 * Example #3: And the rows of "Plan" should be "Checkpoint"
 * Example #4: Then the rows of "Content" should be "Milestone" and "Checkpoint"
 * Example #5: Then the rows of "Plan" should be "Task group" and "Milestone"
 */
Then(/^the rows of "([^"]*)" should be ((?:"[^"]*"(?:, | and )?)+)$/, async function (label, list) {
  const named = [...list.matchAll(/"([^"]*)"/g)].map((m) => clean(m[1]));
  const wanted = named.map((name) => name.toLowerCase());
  const field = await itemsField(this, label);
  await eventually(this, () => rowsOf(field), (rows) => rows.length === wanted.length && rows.every((row, i) => row.toLowerCase().startsWith(wanted[i])), (rows) => ({
    message: `The rows of "${label}" are ${listed(rows)}, not ${listed(named)}.`,
    hint: 'A block reads as the name of its kind (or the label its content gives it).',
  }));
});

/**
 * Set a field inside a row of a repeater or a builder (1-based, top down).
 *
 * Example #1: When I set "Quantity" to "2" in row 1 of "Order items"
 * Example #2: When I set "Product" to "Webship Test Kettle" in row 1 of "Order items"
 * Example #3: And we set "Title" to "First milestone" in row 2 of "Plan"
 * Example #4: When I set "Amount" to "12.50" in row 1 of "Expense lines"
 * Example #5: When I set "Unit price" to "25" in row 1 of "Order items"
 */
When(/^(I |we )*set "([^"]*)" to "([^"]*)" in row (\d+) of "([^"]*)"$/, async function (pronounCase, field, value, n, label) {
  const items = await itemsField(this, label);
  const row = await rowItem(this, items, Number(n));
  await setPanelField(this, field, value, { within: row });
});

/**
 * Assert a field inside a row of a repeater or a builder.
 *
 * Example #1: Then "Quantity" should be set to "2" in row 1 of "Order items"
 * Example #2: Then "Product" should be set to "Webship Test Kettle" in row 1 of "Order items"
 * Example #3: And "Title" should be set to "First milestone" in row 2 of "Plan"
 * Example #4: Then "Amount" should be set to "12.50" in row 1 of "Expense lines"
 * Example #5: Then "Unit price" should be set to "25.00" in row 1 of "Order items"
 */
Then(/^"([^"]*)" should be set to "([^"]*)" in row (\d+) of "([^"]*)"$/, async function (field, value, n, label) {
  const items = await itemsField(this, label);
  const row = await rowItem(this, items, Number(n));
  const read = await readPanelField(this, field, { within: row });
  if (read.value.toLowerCase() !== clean(value).toLowerCase()) {
    throw friendly({ message: `"${field}" in row ${n} of "${label}" holds "${read.value}", not "${value}".`, hint: 'The row shows what was typed or chosen in it.' });
  }
});

/** The action buttons of a row of a repeater or builder (move, clone, delete, collapse). */
async function rowAction(world, field, n, names) {
  const row = await rowItem(world, field, n);
  // The row's own buttons: in its header (a repeater's item, a builder's block), else at its end (a table repeater).
  const header = row.locator('.fi-fo-builder-item-header, .fi-fo-repeater-item-header').first();
  const where = (await header.count()) ? header : row;
  for (const name of names) {
    const button = where.locator(`button[title="${name}"], button[aria-label="${name}"]`).filter({ visible: true }).first();
    if (await button.count()) return button;
  }
  throw friendly({ message: `Row ${n} of "${field.label}" has no "${names[0]}" button.`, hint: 'The buttons of a row are in its header (or at its end in a table repeater); a field that does not allow it has none.' });
}

/**
 * Move a row of a repeater or a builder up or down with its buttons.
 *
 * Example #1: When I move row 2 of "Plan" up
 * Example #2: When I move row 1 of "Plan" down
 * Example #3: And we move row 2 of "Order items" up
 * Example #4: When I move row 1 of "Order items" down
 * Example #5: When I move row 3 of "Plan" up
 */
When(/^(I |we )*move row (\d+) of "([^"]*)" (up|down)$/, async function (pronounCase, n, label, direction) {
  const field = await itemsField(this, label);
  const before = await rowsOf(field);
  const button = await rowAction(this, field, Number(n), direction === 'up' ? ['Move up', 'Move item up'] : ['Move down', 'Move item down']);
  // The move buttons sit under the drag handle until the keyboard reaches them (data-reorder-hidden): the
  // button's own click, as the keyboard gives it, runs its action.
  const covered = await button.evaluate((el) => el.hasAttribute('data-reorder-hidden')).catch(() => false);
  await act(this, () => (covered ? button.dispatchEvent('click') : button.click()));
  await eventually(this, () => rowsOf(field), (rows) => rows.join('|') !== before.join('|') || before[Number(n) - 1] === before[Number(n) - (direction === 'up' ? 2 : 0)], () => ({ message: `Row ${n} of "${label}" did not move ${direction}.`, hint: 'The first row cannot move up, the last one not down.' }));
});

/**
 * Remove a row of a repeater or a builder with its delete button (and the
 * confirmation the field may ask for).
 *
 * Example #1: When I remove row 2 of "Plan"
 * Example #2: When I remove row 1 of "Order items"
 * Example #3: And we remove row 3 of "Plan"
 * Example #4: When I remove row 2 of "Order items"
 * Example #5: When I remove row 1 of "Expense lines"
 */
When(/^(I |we )*remove row (\d+) of "([^"]*)"$/, async function (pronounCase, n, label) {
  const field = await itemsField(this, label);
  const before = (await rowsOf(field)).length;
  const button = await rowAction(this, field, Number(n), ['Delete', 'Remove', 'Delete item']);
  await act(this, () => button.click());
  const modal = await topModal(this);
  if (modal) {
    const confirm = modal.locator('.fi-modal-footer-actions button').filter({ hasText: /^\s*(Delete|Confirm|Yes)\b/i }).first();
    if (await confirm.count()) await act(this, () => confirm.click());
  }
  await eventually(this, () => rowsOf(field), (rows) => rows.length === before - 1, (rows) => ({ message: `"${label}" has ${rows.length} rows after removing one, not ${before - 1}.`, hint: 'A repeater with a minimum of rows removes no more.' }));
});

// ---------------------------------------------------------------------------
// Key-value fields
// ---------------------------------------------------------------------------

/** The properties of a key-value field: [{ key, value }]. */
async function properties(field) {
  return field.wrapper.evaluate((w) => [...w.querySelectorAll('.fi-fo-key-value-table tbody tr')].map((tr) => {
    const inputs = [...tr.querySelectorAll('input[type="text"], input:not([type])')];
    return { key: inputs[0] ? inputs[0].value : '', value: inputs[1] ? inputs[1].value : '' };
  }));
}

/**
 * Add a property to a key-value field ("Add row"), with its key and value.
 *
 * Example #1: When I add the property "badge" with the value "blue" to "Metadata"
 * Example #2: When we add the property "floor" with the value "3" to "Metadata"
 * Example #3: And I add the property "desk" with the value "A12" to "Metadata"
 * Example #4: When I add the property "badge" with the value "red" to "Metadata"
 * Example #5: When I add the property "team" with the value "Webship" to "Metadata"
 */
When(/^(I |we )*add the property "([^"]*)" with the value "([^"]*)" to "([^"]*)"$/, async function (pronounCase, key, value, label) {
  const field = await findPanelField(this, label);
  if (field.kind !== 'key-value') throw friendly({ message: `The "${label}" field is not a key-value field.`, hint: 'Properties are added to a field with a "Property" and a "Value" column.' });
  const before = (await properties(field)).length;
  const add = field.wrapper.locator('button').filter({ hasText: /^\s*Add\b/i }).last();
  if (!(await add.count())) throw friendly({ message: `"${label}" has no button to add a property.`, hint: 'A key-value field that may grow has an "Add row" button.' });
  await add.click();
  await eventually(this, () => properties(field), (list) => list.length === before + 1, () => ({ message: `"${label}" did not add a row.`, hint: 'The "Add row" button adds an empty row.' }));
  const row = field.wrapper.locator('.fi-fo-key-value-table tbody tr').nth(before);
  const inputs = row.locator('input');
  await inputs.nth(0).fill(key);
  await act(this, async () => { await inputs.nth(1).fill(value); await inputs.nth(1).blur(); });
});

/**
 * Assert that a key-value field holds a property with a value, or does not
 * hold the property.
 *
 * Example #1: Then "Metadata" should hold the property "badge" with the value "blue"
 * Example #2: Then "Metadata" should not hold the property "badge"
 * Example #3: And "Metadata" should hold the property "floor" with the value "3"
 * Example #4: Then "Metadata" should hold the property "desk" with the value "A12"
 * Example #5: But "Metadata" should not hold the property "floor"
 */
Then(/^"([^"]*)" should( not)* hold the property "([^"]*)"(?: with the value "([^"]*)")?$/, async function (label, notCase, key, value) {
  const field = await findPanelField(this, label);
  const list = await properties(field);
  const entry = list.find((p) => p.key === key);
  const holds = !!entry && (value == null || entry.value === value);
  if (holds === !!notCase) {
    throw friendly({ message: `Expected "${label}" ${notCase ? 'not ' : ''}to hold the property "${key}"${value != null ? ` with the value "${value}"` : ''}. It holds: ${listed(list.filter((p) => p.key || p.value).map((p) => `${p.key}: ${p.value}`))}.`, hint: 'A key-value field shows a row per property (an empty row is none).' });
  }
});

/**
 * Remove a property from a key-value field, with the delete button of its row.
 *
 * Example #1: When I remove the property "badge" from "Metadata"
 * Example #2: When we remove the property "floor" from "Metadata"
 * Example #3: And I remove the property "desk" from "Metadata"
 * Example #4: When I remove the property "team" from "Metadata"
 * Example #5: Then I remove the property "badge" from "Metadata"
 */
When(/^(I |we )*remove the property "([^"]*)" from "([^"]*)"$/, async function (pronounCase, key, label) {
  const field = await findPanelField(this, label);
  const list = await properties(field);
  const index = list.findIndex((p) => p.key === key);
  if (index < 0) throw friendly({ message: `"${label}" has no property "${key}". It holds: ${listed(list.map((p) => p.key))}.`, hint: 'Name the property by its key.' });
  const row = field.wrapper.locator('.fi-fo-key-value-table tbody tr').nth(index);
  await act(this, () => row.locator('button[title="Delete row"], button[aria-label="Delete row"], button[title="Delete"], td:last-child button').last().click());
  await eventually(this, () => properties(field), (now) => !now.some((p) => p.key === key), () => ({ message: `The property "${key}" is still in "${label}".`, hint: 'Its row has a delete button at its end.' }));
});

// ---------------------------------------------------------------------------
// Tabs and wizard steps
// ---------------------------------------------------------------------------

/** The tabs of the form on screen (role tab): label, selected. */
async function formTabs(world) {
  const container = await scope(world);
  return container.evaluate((root) => [...root.querySelectorAll('[role="tab"]')].map((tab) => ({
    label: (tab.querySelector('.fi-tabs-item-label') || tab).textContent.replace(/\s+/g, ' ').trim(),
    selected: tab.getAttribute('aria-selected') === 'true' || tab.classList.contains('fi-active'),
  }))).catch(() => []);
}

/**
 * Open a tab of the form (its fields show, the others hide).
 *
 * Example #1: When I open the "Employment" tab
 * Example #2: When we open the "Documents & Metadata" tab
 * Example #3: And I open the "Personal" tab
 * Example #4: When I open the "Plan" tab
 * Example #5: When I open the "Details" tab
 */
When(/^(I |we )*open the "([^"]*)" tab$/, async function (pronounCase, tab) {
  const tabs = await formTabs(this);
  const entry = tabs.find((t) => t.label.toLowerCase() === clean(tab).toLowerCase());
  if (!entry) throw friendly({ message: `The form has no tab "${tab}". Its tabs: ${listed(tabs.map((t) => t.label))}.`, hint: 'Name the tab as it reads.' });
  if (entry.selected) return;
  const container = await scope(this);
  const button = container.getByRole('tab', { name: new RegExp(`^\\s*${escapeRegExp(clean(tab))}\\s*$`, 'i') }).first();
  await button.click();
  await eventually(this, () => formTabs(this), (list) => list.some((t) => t.label.toLowerCase() === clean(tab).toLowerCase() && t.selected), () => ({ message: `The "${tab}" tab did not open.`, hint: 'A tab opens when it is clicked.' }));
  await rest(this);
});

/**
 * Assert which tab of the form is open.
 *
 * Example #1: Then the "Employment" tab should be open
 * Example #2: Then the "Personal" tab should be open
 * Example #3: And the "Documents & Metadata" tab should be open
 * Example #4: Then the "Plan" tab should be open
 * Example #5: Then the "Details" tab should be open
 */
Then(/^the "([^"]*)" tab should be open$/, async function (tab) {
  await eventually(this, () => formTabs(this), (list) => list.some((t) => t.label.toLowerCase() === clean(tab).toLowerCase() && t.selected), (list) => ({
    message: `Expected the "${tab}" tab to be open. The open one: ${listed(list.filter((t) => t.selected).map((t) => t.label))}.`,
    hint: 'Open it first (When I open the "..." tab).',
  }));
});

/** The steps of the wizard on screen: label (the number left out), current, completed. */
async function wizardSteps(world) {
  const container = await scope(world);
  return container.evaluate((root) => [...root.querySelectorAll('.fi-sc-wizard-header-step, .fi-fo-wizard-header-step')].map((step) => {
    const label = step.querySelector('.fi-sc-wizard-header-step-label, .fi-fo-wizard-header-step-label');
    return {
      label: (label ? label.textContent : step.textContent).replace(/\s+/g, ' ').trim(),
      current: step.classList.contains('fi-active') || !!step.querySelector('[aria-current="step"]') || step.getAttribute('aria-current') === 'step',
      completed: step.classList.contains('fi-completed'),
    };
  })).catch(() => []);
}

/**
 * Go to the next step of the wizard ("Next"; the step's fields are checked
 * first, and a refused step stays on screen with its errors), or back to the
 * previous one.
 *
 * Example #1: When I go to the next step of the wizard
 * Example #2: When I go back to the previous step of the wizard
 * Example #3: And we go to the next step of the wizard
 * Example #4: When we go back to the previous step of the wizard
 * Example #5: Then I go to the next step of the wizard
 */
When(/^(I |we )*go (to the next|back to the previous) step of the wizard$/, async function (pronounCase, which) {
  const container = await scope(this);
  const name = which === 'to the next' ? /^\s*Next\s*$/i : /^\s*Back\s*$/i;
  const button = container.locator('.fi-sc-wizard-footer button, .fi-fo-wizard-footer button, button').filter({ hasText: name }).filter({ visible: true }).first();
  if (!(await button.count())) throw friendly({ message: `The wizard has no "${which === 'to the next' ? 'Next' : 'Back'}" button on this step.`, hint: 'The last step has the button that saves instead of "Next"; the first has no "Back".' });
  await act(this, () => button.click());
});

/**
 * Assert the step of the wizard on screen (by its label, its number left out).
 *
 * Example #1: Then the wizard should be on the "Order Details" step
 * Example #2: Then the wizard should be on the "Order Items" step
 * Example #3: And the wizard should be on the "Order Details" step
 * Example #4: Then the wizard should be on the "Expense Details" step
 * Example #5: Then the wizard should be on the "Line Items" step
 */
Then(/^the wizard should be on the "([^"]*)" step$/, async function (step) {
  const wanted = clean(step).toLowerCase();
  const isIt = (label) => label.toLowerCase() === wanted || label.toLowerCase().replace(/^\d+\s*/, '').startsWith(wanted);
  await eventually(this, () => wizardSteps(this), (steps) => steps.some((s) => s.current && isIt(s.label)), (steps) => ({
    message: `Expected the wizard on the "${step}" step. Its steps: ${listed(steps.map((s) => `${s.label}${s.current ? ' (current)' : ''}`))}.`,
    hint: 'A step that refused its fields stays on screen with the errors under them.',
  }));
});

// ---------------------------------------------------------------------------
// Saving, creating, deleting
// ---------------------------------------------------------------------------

/** The submit button of the form on screen (or of the open modal's form), by its text. */
async function submitButton(world, names) {
  const container = await scope(world);
  for (const name of names) {
    const button = container.locator('button[type="submit"], .fi-form-actions button, .fi-sc-actions button, .fi-sc-wizard-footer button, .fi-modal-footer-actions button').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(name)}\\s*$`, 'i') }).filter({ visible: true }).first();
    if (await button.count()) return button;
  }
  const offered = (await container.locator('button[type="submit"], .fi-form-actions button').allInnerTexts().catch(() => [])).map(clean).filter(Boolean);
  throw friendly({ message: `The form has no ${listed(names)} button. It has: ${listed(offered)}.`, hint: 'A form of an edit page saves with "Save changes", of a create page with "Create".' });
}

/**
 * Save the form on screen ("Save changes", "Save"), and wait for the answer:
 * the page at rest, with its notification or the errors under its fields.
 *
 * Example #1: When I save the form
 * Example #2: When we save the form
 * Example #3: And I save the form
 * Example #4: Then I save the form
 * Example #5: Given I save the form
 */
When(/^(I |we )*save the form$/, async function (pronounCase) {
  const button = await submitButton(this, ['Save changes', 'Save']);
  await act(this, () => button.click());
});

/**
 * Create the record of the form on screen ("Create"), or create it and start
 * another one ("Create & create another"); the panel then opens the record's
 * page, or empties the form.
 *
 * Example #1: When I create the record
 * Example #2: When I create the record and start another
 * Example #3: And we create the record
 * Example #4: When we create the record and start another
 * Example #5: Then I create the record
 */
When(/^(I |we )*create the record( and start another)?$/, async function (pronounCase, another) {
  const button = await submitButton(this, another ? ['Create & create another'] : ['Create']);
  const from = this.page.url();
  await act(this, () => button.click());
  if (!another && this.page.url() !== from) await rest(this);
});

/**
 * Delete the record of the page with the "Delete" action at its top, and its
 * confirmation; the panel goes back to the list.
 *
 * Example #1: When I delete the record
 * Example #2: When we delete the record
 * Example #3: And I delete the record
 * Example #4: Then I delete the record
 * Example #5: When I delete the record
 */
When(/^(I |we )*delete the record$/, async function (pronounCase) {
  // The actions beside the heading (the header also holds the breadcrumbs).
  const header = this.page.locator('.fi-header .fi-header-actions-ctn');
  let button = header.locator('button, a').filter({ hasText: /^\s*Delete\s*$/i }).first();
  if (!(await button.count())) {
    // In a group of actions ("More actions").
    const group = header.locator('button[aria-haspopup="menu"]').last();
    if (await group.count()) {
      const panel = await openDropdown(this, group, 'actions of the page');
      button = panel.locator('button, a').filter({ hasText: /^\s*Delete\s*$/i }).first();
    }
  }
  if (!(await button.count())) throw friendly({ message: 'The page has no "Delete" action.', hint: 'Open the record\'s edit page; an account that may not delete it sees no "Delete".' });
  await act(this, () => button.click());
  const modal = await waitForModal(this, null);
  const from = this.page.url();
  await act(this, () => modal.locator('.fi-modal-footer-actions button').filter({ hasText: /^\s*(Delete|Confirm)\s*$/i }).first().click());
  await eventually(this, () => this.page.url(), (url) => url !== from, () => ({ message: 'The record was not deleted: the page did not go back to the list.', hint: 'The panel refuses to delete some records (a notification says why).' }));
  await rest(this);
});

// ---------------------------------------------------------------------------
// Records a scenario needs gone
// ---------------------------------------------------------------------------

/**
 * Make sure a resource has no record by a name (a leftover of a run that was
 * stopped half way), the way a person removes it: the list, its deleted
 * records too when it keeps them, the record's page, and its "Force delete"
 * (or "Delete") action with the confirmation. A record that is not there
 * changes nothing.
 *
 * Example #1: Given there is no "Webship form task" in the "Tasks" list
 * Example #2: Given there is no "Webship Form Employee" in the "Employees" list
 * Example #3: And there is no "Webship duplicate kettle" in the "Products" list
 * Example #4: Given there is no "Webship note written by the suite" in the "Notes" list
 * Example #5: Given there is no "Webship Brand Gamma" in the "Brands" list
 */
Given(/^there is no "([^"]*)" in the "([^"]*)" list$/, { timeout: 180000 }, async function (name, list) {
  const { openFromSidebar, tableLocator, readTable } = require('./filament-helpers');
  const wanted = clean(name).toLowerCase();
  for (let round = 0; round < 5; round += 1) {
    await openFromSidebar(this, list);
    let table = await tableLocator(this);
    // The deleted records too, where the list keeps them.
    const trigger = table.locator('button[aria-label="Filter"], button[title="Filter"]').first();
    if (await trigger.count()) {
      const form = await openDropdown(this, trigger, 'filters of the list');
      const trashed = await findPanelField(this, 'Deleted records', { within: form, timeout: 1 }).catch(() => null);
      if (trashed) {
        await setPanelField(this, 'Deleted records', 'With deleted records', { within: form });
        const apply = form.getByRole('button', { name: /^\s*Apply filters\s*$/i });
        if (await apply.count()) await act(this, () => apply.first().click());
      }
      await closeDropdowns(this);
    }
    table = await tableLocator(this);
    const search = table.locator('.fi-ta-header-toolbar input[type="search"]').first();
    if (await search.count()) await act(this, () => search.fill(name));
    const read = await readTable(table);
    const index = read.rows.findIndex((row) => row.cells.some((cell) => cell.toLowerCase() === wanted));
    if (index < 0) {
      if (await search.count()) await act(this, () => search.fill(''));
      const clear = table.locator('.fi-ta-filter-indicators button[aria-label="Remove all filters"]').first();
      if (await clear.count()) await act(this, () => clear.click());
      return;
    }
    const row = table.locator('tr.fi-ta-row').nth(index);
    const link = row.locator('td.fi-ta-cell:not(.fi-ta-selection-cell) a[href]:not([role="menuitem"])').filter({ hasNot: this.page.locator('[x-data="filamentCopyable"]') }).first();
    await follow(this, link, `the row of "${name}"`);
    // A view page leads to the edit page, where the record is deleted (the actions beside the heading).
    const header = this.page.locator('.fi-header .fi-header-actions-ctn');
    const edit = header.locator('a').filter({ hasText: /^\s*Edit\s*$/i }).first();
    if (await edit.count()) await follow(this, edit, 'the "Edit" action');
    for (const label of ['Force delete', 'Delete']) {
      const button = header.locator('button').filter({ hasText: new RegExp(`^\\s*${label}\\s*$`, 'i') }).first();
      if (!(await button.count())) continue;
      await act(this, () => button.click());
      const modal = await waitForModal(this, null);
      await act(this, () => modal.locator('.fi-modal-footer-actions button').filter({ hasText: /^\s*(Delete|Force delete|Confirm)\s*$/i }).first().click());
      await rest(this);
      break;
    }
  }
  throw friendly({ message: `"${name}" is still in the "${list}" list after five attempts to delete it.`, hint: 'The record\'s page must offer "Delete" (or "Force delete" for a deleted record) to the account.' });
});

module.exports = { fixturePath, uploads, rowsOf, properties, formTabs, wizardSteps };

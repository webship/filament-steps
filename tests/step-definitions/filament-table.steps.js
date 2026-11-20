'use strict';

// The table of a resource's list (and of a relation manager): what it counts
// and shows, its search, sorting, filters and the indicators of the active
// ones, the tabs above it, its columns, its pages, grouping, the selection and
// the bulk actions, and reordering its rows.
//
// Every action on a table is one round trip to the server (the shared wait of
// the Laravel pack), and the table shows its own loading indicator meanwhile:
// a step returns once the request ended, the indicator is gone and the table
// is at rest. Assertions read what a person reads: the column headings, the
// cells, "Showing 1 to 10 of 60 results", the badges of the active filters,
// "2 records selected".

const { When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  laravel,
  rest,
  act,
  scope,
  openDropdown,
  closeDropdowns,
  tableLocator,
  readTable,
  tableCount,
  columnIndex,
  rowLocator,
  tableSearchField,
  setPanelField,
  readPanelField,
  waitForModal,
} = require('./filament-helpers');

const { budget, clean, listed, escapeRegExp, eventually } = laravel;

/** "the list" or "the "Addresses" list": the table a step means. */
function whichTable(world, relation) {
  return tableLocator(world, relation ? { relation } : {});
}

/** The rows of a table as a person reads them, for an error message. */
function rowsOf(read) {
  return listed(read.rows.slice(0, 10).map((row) => row.cells.filter(Boolean).slice(0, 3).join(' | ')));
}

/** The cells of a column, by its heading. */
function columnCells(read, column) {
  const index = columnIndex(read, column);
  return index < 0 ? null : read.rows.map((row) => row.cells[index] || '');
}

/** A number in a cell ("$1,033.31", "12", "1.5 kg"), for sorting checks; NaN when it is not one. */
/** A cell that holds one number ("$25.00", "1,009.90", "12 %"), as that number; else NaN. */
function asNumber(text) {
  const t = String(text).replace(/,/g, '');
  const all = t.match(/-?\d+(?:\.\d+)?/g) || [];
  return all.length === 1 ? Number(all[0]) : NaN;
}

/** A cell that holds a date, with or without its time, as the panel writes it ("Mar 2, 2026 14:00:00", "2026-03-02"), as a time; else NaN. */
function asDate(text) {
  const t = String(text).trim();
  if (!/\b\d{4}\b/.test(t) || !/^(?:[A-Za-z]{3,9}\.? \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})/.test(t)) return NaN;
  const time = Date.parse(t.replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T'));
  return Number.isNaN(time) ? NaN : time;
}

/**
 * Assert the number of records the list counts in all its pages, as its
 * footer writes it ("Showing 1 to 10 of 60 results"). The noun is free:
 * records, products, orders.
 *
 * Example #1: Then the list should count 3 records
 * Example #2: Then the list should count 3 products
 * Example #3: And the list should count 1 order
 * Example #4: Then the "Addresses" list should count 1 record
 * Example #5: Then the list should count 0 records
 */
Then(/^the (?:"([^"]*)" )?list should count (\d+) ([a-z][a-z ]*)$/, async function (relation, count, noun) {
  const table = await whichTable(this, relation);
  await eventually(this, () => readTable(table), (read) => tableCount(read) === Number(count), (read) => ({
    message: `The ${relation ? `"${relation}" ` : ''}list counts ${tableCount(read)} ${noun}, not ${count}${read.overview ? ` ("${read.overview}")` : ''}.`,
    hint: 'The count is the one the footer of the table writes for all its pages, with the search and the filters applied.',
  }));
});

/**
 * Assert that the list shows a record on the page on screen (a cell that
 * reads the text), or does not.
 *
 * Example #1: Then the list should show "Webship Test Kettle"
 * Example #2: Then the list should not show "Webship Test Lantern"
 * Example #3: And the "Addresses" list should show "Webship test street 1"
 * Example #4: Then the list should show "WS-TEST-0001"
 * Example #5: But the list should not show "Webship Test Teapot"
 */
Then(/^the (?:"([^"]*)" )?list should( not)* show "([^"]*)"$/, async function (relation, notCase, text) {
  const table = await whichTable(this, relation);
  const wanted = clean(text).toLowerCase();
  const shows = (read) => read.rows.some((row) => row.cells.some((cell) => cell.toLowerCase() === wanted) || row.text.toLowerCase().includes(wanted));
  if (notCase) {
    const read = await readTable(table);
    if (shows(read)) throw friendly({ message: `Expected the list not to show "${text}", but a row shows it.`, hint: 'The rows are those of the page on screen, with the search and the filters applied.' });
    return;
  }
  await eventually(this, () => readTable(table), shows, (read) => ({
    message: `Expected the list to show "${text}". Its rows: ${rowsOf(read)}.`,
    hint: 'The rows are those of the page on screen: search or filter the list first, or go to the page that shows it.',
  }));
});

/**
 * Assert the number of rows the list shows on the page on screen.
 *
 * Example #1: Then the list should have 10 rows
 * Example #2: Then the list should have 3 rows
 * Example #3: And the list should have 25 rows
 * Example #4: Then the "Addresses" list should have 1 row
 * Example #5: Then the list should have 1 row
 */
Then(/^the (?:"([^"]*)" )?list should have (\d+) rows?$/, async function (relation, count) {
  const table = await whichTable(this, relation);
  await eventually(this, () => readTable(table), (read) => read.rows.length === Number(count), (read) => ({
    message: `The list has ${read.rows.length} rows on the page on screen, not ${count}.`,
    hint: 'The rows of one page: the number per page is set below the table.',
  }));
});

/**
 * Assert the cell of a row (the row that shows a text) in a column (by its
 * heading).
 *
 * Example #1: Then the "Webship Test Kettle" row should show "Webship Brand Alpha" in the "Brand" column
 * Example #2: Then the "Webship Test Kettle" row should show "$25.00" in the "Price" column
 * Example #3: And the "WS-TEST-0001" row should show "Wendy Webship" in the "Customer" column
 * Example #4: Then the "Webship Test Teapot" row should show "WS-TEAPOT-001" in the "SKU" column
 * Example #5: And the "Webship note about the market" row should show "Webship note about the market" in the "Title" column
 */
Then(/^the "([^"]*)" row should show "([^"]*)" in the "([^"]*)" column$/, async function (rowText, value, column) {
  const table = await whichTable(this);
  const check = async () => {
    const read = await readTable(table);
    const index = columnIndex(read, column);
    const row = read.rows.find((r) => r.cells.some((cell) => cell.toLowerCase() === clean(rowText).toLowerCase())) || read.rows.find((r) => r.text.toLowerCase().includes(clean(rowText).toLowerCase()));
    return { read, index, row, cell: row && index >= 0 ? row.cells[index] : null };
  };
  await eventually(this, check, (state) => state.cell !== null && clean(state.cell) === clean(value), (state) => {
    if (state.index < 0) return { message: `The list has no column "${column}". Its columns: ${listed(state.read.headers.map((h) => h.text))}.`, hint: 'Name the column by its heading.' };
    if (!state.row) return { message: `No row of the list shows "${rowText}". Its rows: ${rowsOf(state.read)}.`, hint: 'Search or filter the list first.' };
    return { message: `The "${rowText}" row shows "${state.cell}" in the "${column}" column, not "${value}".`, hint: 'The cell reads as the table writes it (money, dates and badges included).' };
  });
});

/**
 * Assert the record of the first row of the list (a cell that reads the
 * text).
 *
 * Example #1: Then the first row of the list should be "Webship Test Teapot"
 * Example #2: Then the first row of the list should be "Webship Test Lantern"
 * Example #3: And the first row of the list should be "WS-TEST-0001"
 * Example #4: Then the first row of the list should be "Webship note about the harbour"
 * Example #5: And the first row of the list should be "Webship Brand Alpha"
 */
Then(/^the first row of the list should be "([^"]*)"$/, async function (text) {
  const table = await whichTable(this);
  const wanted = clean(text).toLowerCase();
  await eventually(this, () => readTable(table), (read) => read.rows.length > 0 && read.rows[0].cells.some((cell) => cell.toLowerCase() === wanted), (read) => ({
    message: `Expected the first row of the list to be "${text}", but it is "${read.rows.length ? read.rows[0].cells.filter(Boolean).slice(0, 3).join(' | ') : '(no row)'}".`,
    hint: 'The order is the one the list is sorted by.',
  }));
});

/**
 * Assert that the list has no record, and shows its empty state.
 *
 * Example #1: Then the list should be empty
 * Example #2: Then the "Addresses" list should be empty
 * Example #3: And the list should be empty
 * Example #4: Then the "Comments" list should be empty
 * Example #5: But the list should be empty
 */
Then(/^the (?:"([^"]*)" )?list should be empty$/, async function (relation) {
  const table = await whichTable(this, relation);
  await eventually(this, () => readTable(table), (read) => read.rows.length === 0 && tableCount(read) === 0, (read) => ({
    message: `Expected the list to be empty, but it counts ${tableCount(read)} (rows: ${rowsOf(read)}).`,
    hint: 'An empty list shows its empty state ("No products") instead of rows.',
  }));
});

/**
 * Search the list with its search field, as a person types it, and wait for
 * the table to show the answer. The search is kept in the address of the
 * page.
 *
 * Example #1: When I search the list for "Webship Test"
 * Example #2: When we search the list for "WS-TEST-0001"
 * Example #3: And I search the list for "kettle"
 * Example #4: When I search the "Addresses" list for "Webship"
 * Example #5: When I search the list for "no record has this name"
 */
When(/^(I |we )*search the (?:"([^"]*)" )?list for "([^"]*)"$/, async function (pronounCase, relation, text) {
  const table = await whichTable(this, relation);
  const field = tableSearchField(table);
  if (!(await field.count())) throw friendly({ message: 'The list has no search field.', hint: 'Only a table with searchable columns has one, above its rows.' });
  await act(this, () => field.fill(text));
  await eventually(this, () => field.inputValue(), (value) => value === text, () => ({ message: 'The search field did not keep the text.', hint: 'Type into the search field above the table.' }));
});

/**
 * Empty the search field of the list.
 *
 * Example #1: When I clear the search of the list
 * Example #2: When we clear the search of the list
 * Example #3: And I clear the search of the list
 * Example #4: When I clear the search of the "Addresses" list
 * Example #5: Then I clear the search of the list
 */
When(/^(I |we )*clear the search of the (?:"([^"]*)" )?list$/, async function (pronounCase, relation) {
  const table = await whichTable(this, relation);
  const field = tableSearchField(table);
  if (await field.inputValue().catch(() => '')) await act(this, () => field.fill(''));
});

/** The sorting of a column: ascending, descending or none, from aria-sort. */
async function sortOf(table, column) {
  const read = await readTable(table);
  const index = columnIndex(read, column);
  return { read, index, sort: index >= 0 ? (read.headers[index].sort || '') : null };
}

/**
 * Sort the list by a column with its heading, as a person clicks it (once
 * for ascending, again for descending).
 *
 * Example #1: When I sort the list by "Price"
 * Example #2: When I sort the list by "Price" in descending order
 * Example #3: And I sort the list by "Name"
 * Example #4: When I sort the list by "Order date" in ascending order
 * Example #5: When we sort the list by "Title" in descending order
 */
When(/^(I |we )*sort the list by "([^"]*)"(?: in (ascending|descending) order)?$/, async function (pronounCase, column, order) {
  const wanted = order || 'ascending';
  const table = await whichTable(this);
  for (let i = 0; i < 3; i += 1) {
    const state = await sortOf(table, column);
    if (state.index < 0) throw friendly({ message: `The list has no column "${column}". Its columns: ${listed(state.read.headers.map((h) => h.text))}.`, hint: 'Name the column by its heading.' });
    if (state.sort === wanted) return;
    const button = table.locator('thead th').nth(state.index).locator('button').first();
    if (!(await button.count())) throw friendly({ message: `The "${column}" column cannot be sorted.`, hint: 'A sortable column has a button in its heading.' });
    await act(this, () => button.click());
  }
  const state = await sortOf(table, column);
  throw friendly({ message: `The list did not sort by "${column}" in ${wanted} order (it is "${state.sort}").`, hint: 'A sortable column turns ascending, descending, then back to none.' });
});

/**
 * Assert that the list is sorted by a column, in an order: the heading says so
 * (aria-sort), and the cells of the page on screen follow it.
 *
 * Example #1: Then the list should be sorted by "Price" in ascending order
 * Example #2: Then the list should be sorted by "Price" in descending order
 * Example #3: And the list should be sorted by "Name" in ascending order
 * Example #4: Then the list should be sorted by "Order date" in descending order
 * Example #5: And the list should be sorted by "Title" in ascending order
 */
Then(/^the list should be sorted by "([^"]*)" in (ascending|descending) order$/, async function (column, order) {
  const table = await whichTable(this);
  const check = async () => {
    const state = await sortOf(table, column);
    const cells = state.index >= 0 ? columnCells(state.read, column).filter(Boolean) : [];
    // Dates by their time, numbers by their value, the rest by their text.
    const dates = cells.map(asDate);
    const numbers = cells.map(asNumber);
    const byDate = cells.length > 0 && dates.every((n) => !Number.isNaN(n));
    const numeric = byDate || (cells.length > 0 && numbers.every((n) => !Number.isNaN(n)));
    const values = byDate ? dates : (numeric ? numbers : cells.map((c) => c.toLowerCase()));
    let ordered = true;
    for (let i = 1; i < values.length; i += 1) {
      const cmp = numeric ? values[i - 1] - values[i] : values[i - 1].localeCompare(values[i]);
      if (order === 'ascending' ? cmp > 0 : cmp < 0) ordered = false;
    }
    return { ...state, cells, ordered };
  };
  await eventually(this, check, (state) => state.sort === order && state.ordered, (state) => ({
    message: state.index < 0
      ? `The list has no column "${column}".`
      : `Expected the list sorted by "${column}" in ${order} order: the heading says "${state.sort || 'none'}", the cells read ${listed(state.cells.slice(0, 10))}.`,
    hint: 'Sort it with its heading first (When I sort the list by "...").',
  }));
});

/** The filters of a table: open their dropdown (or the panel above the table) and return where their fields are. */
async function filtersForm(world, table) {
  const trigger = table.locator('.fi-ta-filters-trigger-action button, button[aria-label="Filter"], button[title="Filter"]').first();
  const above = table.locator('.fi-ta-filters-above-content-ctn .fi-ta-filters').first();
  if (await above.count()) {
    // The filters drawn above the table: a collapsed panel opens with the "Filter" button.
    if (!(await above.isVisible().catch(() => false)) && (await trigger.count())) {
      await trigger.click();
      await eventually(world, () => above.isVisible().catch(() => false), Boolean, () => ({ message: 'The filters above the list did not open.', hint: 'Its "Filter" button opens them.' }));
      await rest(world);
    }
    return above;
  }
  if (await trigger.count()) return openDropdown(world, trigger, 'filters of the list');
  const shown = table.locator('.fi-ta-filters').first();
  if (await shown.count()) return shown;
  throw friendly({ message: 'The list has no filters.', hint: 'A table with filters has a "Filter" button above its rows, or a panel of filters above it.' });
}

/** Apply the filters of a deferred filter form ("Apply filters"); a live one applied itself. */
async function applyFilters(world, form) {
  const apply = form.getByRole('button', { name: /^\s*Apply filters\s*$/i });
  if (await apply.count()) await act(world, () => apply.first().click());
  await closeDropdowns(world);
  await rest(world);
}

/** The labels of the active filters of a table (their indicators). */
async function activeFilters(table) {
  return table.evaluate((ta) => [...ta.querySelectorAll('.fi-ta-filter-indicators [role="listitem"], .fi-ta-filter-indicators .fi-badge')]
    .map((el) => ((el.querySelector('.fi-badge-label') || el).textContent || '').replace(/\s+/g, ' ').replace(/Remove filter/g, '').trim())
    .filter(Boolean)).then((list) => [...new Set(list)]);
}

/**
 * Filter the list: open its filters, set a filter's field to a value (a
 * choice, a date, a text, on or off), apply them and wait for the table.
 *
 * Example #1: When I choose "Only deleted records" in the "Deleted records" filter
 * Example #2: When I choose "Webship Brand Alpha" in the "Brand" filter
 * Example #3: And I choose "2026-01-01" in the "Created from" filter
 * Example #4: When I choose "Yes" in the "Is published" filter
 * Example #5: When we choose "Without deleted records" in the "Deleted records" filter
 */
When(/^(I |we )*choose "([^"]*)" in the "([^"]*)" filter$/, async function (pronounCase, value, filter) {
  const table = await whichTable(this);
  const form = await filtersForm(this, table);
  await setPanelField(this, filter, value, { within: form });
  await applyFilters(this, form);
});

/**
 * Assert the value of a filter's field (the filters are opened to read it,
 * and closed again).
 *
 * Example #1: Then the "Deleted records" filter should be set to "Only deleted records"
 * Example #2: Then the "Brand" filter should be set to "Webship Brand Alpha"
 * Example #3: And the "Created from" filter should be set to "2026-01-01"
 * Example #4: Then the "Deleted records" filter should be set to "Without deleted records"
 * Example #5: And the "Is published" filter should be set to "Yes"
 */
Then(/^the "([^"]*)" filter should be set to "([^"]*)"$/, async function (filter, value) {
  const table = await whichTable(this);
  const form = await filtersForm(this, table);
  const read = await readPanelField(this, filter, { within: form });
  await closeDropdowns(this);
  if (read.value.toLowerCase() !== clean(value).toLowerCase()) {
    throw friendly({ message: `The "${filter}" filter is set to "${read.value}", not "${value}".`, hint: 'A filter keeps its value in the address of the page.' });
  }
});

/**
 * Assert that the list shows the indicator of an active filter (the badge
 * above the rows), or does not.
 *
 * Example #1: Then the list should have the filter "Only deleted records"
 * Example #2: Then the list should not have the filter "Only deleted records"
 * Example #3: And the list should have the filter "Brand: Webship Brand Alpha"
 * Example #4: Then the list should have the filter "Created from Jan 1, 2026"
 * Example #5: But the list should not have the filter "Brand: Webship Brand Alpha"
 */
Then(/^the list should( not)* have the filter "([^"]*)"$/, async function (notCase, indicator) {
  const table = await whichTable(this);
  const wanted = clean(indicator).toLowerCase();
  const has = (list) => list.some((item) => item.toLowerCase() === wanted);
  if (notCase) {
    const list = await activeFilters(table);
    if (has(list)) throw friendly({ message: `Expected no filter "${indicator}", but the list shows it.`, hint: 'Remove it with its indicator, or all of them.' });
    return;
  }
  await eventually(this, () => activeFilters(table), has, (list) => ({
    message: `Expected the active filter "${indicator}". The list shows: ${listed(list)}.`,
    hint: 'An active filter shows its indicator (a badge) above the rows, as the panel words it.',
  }));
});

/**
 * Remove an active filter with the button of its indicator.
 *
 * Example #1: When I remove the filter "Only deleted records"
 * Example #2: When we remove the filter "Brand: Webship Brand Alpha"
 * Example #3: And I remove the filter "Only deleted records"
 * Example #4: When I remove the filter "Created from Jan 1, 2026"
 * Example #5: Then I remove the filter "Only deleted records"
 */
When(/^(I |we )*remove the filter "([^"]*)"$/, async function (pronounCase, indicator) {
  const table = await whichTable(this);
  const badge = table.locator('.fi-ta-filter-indicators [role="listitem"], .fi-ta-filter-indicators .fi-badge').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(clean(indicator))}`, 'i') }).first();
  if (!(await badge.count())) throw friendly({ message: `The list has no active filter "${indicator}". It shows: ${listed(await activeFilters(table))}.`, hint: 'Name the filter as its indicator reads.' });
  await act(this, () => badge.locator('button').first().click());
});

/**
 * Remove every active filter of the list ("Remove all filters"), or reset the
 * filters when the list has none active.
 *
 * Example #1: When I clear all filters
 * Example #2: When we clear all filters
 * Example #3: And I clear all filters
 * Example #4: Then I clear all filters
 * Example #5: Given I clear all filters
 */
When(/^(I |we )*clear all filters$/, async function (pronounCase) {
  const table = await whichTable(this);
  const all = table.locator('.fi-ta-filter-indicators button[aria-label="Remove all filters"], .fi-ta-filter-indicators > button').first();
  if (await all.count()) {
    await act(this, () => all.click());
    return;
  }
  if ((await activeFilters(table)).length) {
    const form = await filtersForm(this, table);
    const reset = form.getByRole('button', { name: /^\s*Reset\s*$/i }).first();
    if (await reset.count()) await act(this, () => reset.click());
    await closeDropdowns(this);
  }
});

/** The tabs above a list (role group or tablist): label, count, chosen. */
async function listTabs(world) {
  return world.page.evaluate(() => {
    const main = document.querySelector('main');
    const tabs = main ? [...main.querySelectorAll('.fi-tabs button, .fi-tabs a, .fi-sc-tabs-tablist button')] : [];
    return tabs.filter((tab) => !tab.closest('.fi-fo-field, .fi-modal, .fi-sc-tabs[role="tablist"] .fi-fo-field')).map((tab) => {
      const badge = tab.querySelector('.fi-badge');
      const label = (tab.querySelector('.fi-tabs-item-label') || tab).cloneNode(true);
      if (badge && label.contains && label.querySelector('.fi-badge')) label.querySelector('.fi-badge').remove();
      return {
        label: (label.textContent || '').replace(/\s+/g, ' ').trim(),
        badge: badge ? badge.textContent.replace(/\s+/g, ' ').trim() : '',
        chosen: tab.getAttribute('aria-pressed') === 'true' || tab.getAttribute('aria-selected') === 'true' || tab.classList.contains('fi-active'),
      };
    });
  }).catch(() => []);
}

/**
 * Choose a tab above the list ("All", "Processing"), which filters its rows.
 *
 * Example #1: When I choose the "Processing" tab of the list
 * Example #2: When we choose the "All" tab of the list
 * Example #3: And I choose the "New" tab of the list
 * Example #4: When I choose the "Delivered" tab of the list
 * Example #5: When I choose the "Cancelled" tab of the list
 */
When(/^(I |we )*choose the "([^"]*)" tab of the list$/, async function (pronounCase, tab) {
  const tabs = await listTabs(this);
  const index = tabs.findIndex((t) => t.label.toLowerCase() === clean(tab).toLowerCase());
  if (index < 0) throw friendly({ message: `The list has no tab "${tab}". Its tabs: ${listed(tabs.map((t) => t.label))}.`, hint: 'Name the tab as it reads, without its count.' });
  if (tabs[index].chosen) return;
  const button = this.page.locator('main').locator('.fi-tabs button, .fi-tabs a, .fi-sc-tabs-tablist button').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(clean(tab))}\\b`, 'i') }).first();
  await act(this, () => button.click());
  await eventually(this, () => listTabs(this), (list) => list.some((t) => t.label.toLowerCase() === clean(tab).toLowerCase() && t.chosen), () => ({ message: `The "${tab}" tab of the list was not chosen.`, hint: 'A tab is chosen when it is pressed.' }));
});

/**
 * Assert which tab of the list is chosen, and the count it shows.
 *
 * Example #1: Then the "Processing" tab of the list should be chosen
 * Example #2: Then the "All" tab of the list should be chosen
 * Example #3: And the "New" tab of the list should show a count
 * Example #4: Then the "Delivered" tab of the list should show a count
 * Example #5: And the "All" tab of the list should show a count
 */
Then(/^the "([^"]*)" tab of the list should (be chosen|show a count)$/, async function (tab, what) {
  await eventually(this, () => listTabs(this), (list) => list.some((t) => t.label.toLowerCase() === clean(tab).toLowerCase() && (what === 'be chosen' ? t.chosen : /\d/.test(t.badge))), (list) => {
    const entry = list.find((t) => t.label.toLowerCase() === clean(tab).toLowerCase());
    return {
      message: entry ? `Expected the "${tab}" tab of the list to ${what}, but it ${what === 'be chosen' ? 'is not chosen' : `shows "${entry.badge}"`}.` : `The list has no tab "${tab}". Its tabs: ${listed(list.map((t) => t.label))}.`,
      hint: 'The tabs above a list filter its rows; their counts load after the page.',
    };
  });
});

/** The column manager of a table: open it and return its panel. */
async function columnManager(world, table) {
  const trigger = table.locator('button[aria-label="Column manager"], button[title="Column manager"], .fi-ta-col-manager-trigger-action button').first();
  if (!(await trigger.count())) throw friendly({ message: 'The list has no column manager.', hint: 'Only a table with columns that can be hidden has the "Column manager" button.' });
  return openDropdown(world, trigger, 'column manager of the list');
}

/**
 * Show or hide a column of the list with the column manager (its checkbox,
 * then "Apply columns" where the manager has it).
 *
 * Example #1: When I hide the "SKU" column
 * Example #2: When I show the "SKU" column
 * Example #3: And we hide the "Quantity" column
 * Example #4: When I show the "Created at" column
 * Example #5: When I hide the "Brand" column
 */
When(/^(I |we )*(show|hide) the "([^"]*)" column$/, async function (pronounCase, action, column) {
  const table = await whichTable(this);
  const panel = await columnManager(this, table);
  const box = panel.getByRole('checkbox', { name: new RegExp(`^\\s*${escapeRegExp(clean(column))}\\s*$`, 'i') }).first();
  if (!(await box.count())) {
    const offered = (await panel.locator('label').allInnerTexts()).map(clean).filter(Boolean);
    await closeDropdowns(this);
    throw friendly({ message: `The column manager has no column "${column}". It has: ${listed(offered)}.`, hint: 'Only the columns that can be hidden are in it.' });
  }
  if ((await box.isChecked()) !== (action === 'show')) await act(this, () => box.click());
  const apply = panel.getByRole('button', { name: /^\s*Apply columns\s*$/i });
  if (await apply.count()) await act(this, () => apply.first().click());
  await closeDropdowns(this);
  await rest(this);
});

/**
 * Assert that the list shows, or does not show, a column (by its heading).
 *
 * Example #1: Then the list should have the column "SKU"
 * Example #2: Then the list should not have the column "SKU"
 * Example #3: And the list should have the column "Price"
 * Example #4: Then the list should have the column "Created at"
 * Example #5: But the list should not have the column "Quantity"
 */
Then(/^the list should( not)* have the column "([^"]*)"$/, async function (notCase, column) {
  const table = await whichTable(this);
  await eventually(this, () => readTable(table), (read) => (columnIndex(read, column) >= 0) !== !!notCase, (read) => ({
    message: `Expected the list ${notCase ? 'not ' : ''}to have the column "${column}". Its columns: ${listed(read.headers.map((h) => h.text))}.`,
    hint: 'The column manager shows and hides the columns that can be hidden.',
  }));
});

/** The pages of a table: the current one and the last one. */
async function pagesOf(table) {
  return table.evaluate((ta) => {
    const pag = ta.querySelector('.fi-pagination');
    if (!pag) return { current: 1, last: 1 };
    const buttons = [...pag.querySelectorAll('button[aria-label^="Go to page"]')];
    const numbers = buttons.map((b) => Number((b.getAttribute('aria-label').match(/(\d+)/) || [])[1])).filter(Boolean);
    const current = pag.querySelector('[aria-current="page"]');
    return {
      current: current ? Number((current.getAttribute('aria-label') || current.textContent).match(/(\d+)/)[1]) : 1,
      last: numbers.length ? Math.max(...numbers) : 1,
    };
  });
}

/**
 * Go to a page of the list with its pagination.
 *
 * Example #1: When I go to page 2 of the list
 * Example #2: When we go to page 3 of the list
 * Example #3: And I go to page 1 of the list
 * Example #4: When I go to page 2 of the "Addresses" list
 * Example #5: When I go to page 6 of the list
 */
When(/^(I |we )*go to page (\d+) of the (?:"([^"]*)" )?list$/, async function (pronounCase, number, relation) {
  const table = await whichTable(this, relation);
  const button = table.locator(`.fi-pagination button[aria-label="Go to page ${number}"]:visible`).first();
  if (!(await button.count())) {
    const pages = await pagesOf(table);
    throw friendly({ message: `The list has no button for page ${number} (it is on page ${pages.current} of ${pages.last}).`, hint: 'The pagination below the table shows the pages near the current one, and the first and last.' });
  }
  await act(this, () => button.click());
});

/**
 * Assert the page of the list on screen, or how many pages it has.
 *
 * Example #1: Then the list should be on page 2
 * Example #2: Then the list should have 6 pages
 * Example #3: And the list should be on page 1
 * Example #4: Then the "Addresses" list should be on page 1
 * Example #5: Then the list should have 1 page
 */
Then(/^the (?:"([^"]*)" )?list should (be on page|have) (\d+)(?: pages?)?$/, async function (relation, what, number) {
  const table = await whichTable(this, relation);
  const key = what === 'be on page' ? 'current' : 'last';
  await eventually(this, () => pagesOf(table), (pages) => pages[key] === Number(number), (pages) => ({
    message: what === 'be on page' ? `The list is on page ${pages.current}, not ${number}.` : `The list has ${pages.last} pages, not ${number}.`,
    hint: 'The pagination below the table marks the page on screen.',
  }));
});

/**
 * Show a number of records per page, with the "Per page" choice below the
 * table. The noun is free.
 *
 * Example #1: When I show 25 records per page
 * Example #2: When I show 5 products per page
 * Example #3: And we show 50 orders per page
 * Example #4: When I show 10 records per page
 * Example #5: When I show 5 notes per page
 */
When(/^(I |we )*show (\d+) [a-z]+ per page$/, async function (pronounCase, number) {
  const table = await whichTable(this);
  // The pagination draws a choice for narrow screens and one for wide ones: the one on screen.
  const select = table.locator('.fi-pagination select:visible').first();
  if (!(await select.count())) throw friendly({ message: 'The list has no choice of records per page.', hint: 'It is below the table, as "Per page".' });
  const options = await select.locator('option').allInnerTexts();
  if (!options.map(clean).includes(String(number))) throw friendly({ message: `The list cannot show ${number} per page. It offers: ${listed(options)}.`, hint: 'Choose one of the numbers it offers.' });
  await act(this, () => select.selectOption({ label: String(number) }));
});

/**
 * Select a record of the list with the checkbox of its row, or the records of
 * the page on screen with the checkbox of the heading.
 *
 * Example #1: When I select "Webship Test Kettle" in the list
 * Example #2: When I select all records on the page
 * Example #3: And we select "Webship Test Teapot" in the list
 * Example #4: When I select all products on the page
 * Example #5: When I select "Webship note about the library" in the list
 */
When(/^(I |we )*select (?:"([^"]*)" in the list|all [a-z]+ on the page)$/, async function (pronounCase, text) {
  const table = await whichTable(this);
  if (text != null) {
    const row = await rowLocator(this, table, text);
    const box = row.locator('input[type="checkbox"]').first();
    if (!(await box.count())) throw friendly({ message: `The row of "${text}" has no checkbox.`, hint: 'Rows can be selected only on a table with bulk actions.' });
    if (!(await box.isChecked())) await box.click();
  } else {
    const all = table.locator('thead input[type="checkbox"]').first();
    if (!(await all.count())) throw friendly({ message: 'The list has no checkbox to select the page.', hint: 'Rows can be selected only on a table with bulk actions.' });
    if (!(await all.isChecked())) await all.click();
  }
  await rest(this);
});

/** The selection indicator of a table ("2 records selected"), or empty. */
async function selectionText(table) {
  return table.evaluate((ta) => {
    const el = ta.querySelector('.fi-ta-selection-indicator');
    if (!el || getComputedStyle(el).display === 'none' || el.hidden) return '';
    const own = el.querySelector('span, .fi-ta-selection-indicator-label');
    const text = (el.firstElementChild ? el.firstElementChild.textContent : el.textContent) || '';
    return (own && /selected/i.test(own.textContent) ? own.textContent : text).replace(/\s+/g, ' ').trim();
  }).catch(() => '');
}

/**
 * Assert what the selection of the list reads ("2 records selected").
 *
 * Example #1: Then the selection should read "1 record selected"
 * Example #2: Then the selection should read "3 records selected"
 * Example #3: And the selection should read "2 records selected"
 * Example #4: Then the selection should read "10 records selected"
 * Example #5: Then the selection should read "1 record selected"
 */
Then(/^the selection should read "([^"]*)"$/, async function (text) {
  const table = await whichTable(this);
  await eventually(this, () => selectionText(table), (value) => value.toLowerCase().startsWith(clean(text).toLowerCase()), (value) => ({
    message: `Expected the selection to read "${text}", but it reads "${value || '(nothing selected)'}".`,
    hint: 'The selection shows above the rows once a row is checked.',
  }));
});

/** The bulk actions of a table: open their dropdown. */
async function bulkActions(world, table) {
  const trigger = table.locator('.fi-ta-header-toolbar button').filter({ hasText: /^\s*Bulk actions\s*$/i }).first();
  const icon = table.locator('.fi-ta-header-toolbar button[aria-label="Bulk actions"], .fi-ta-header-toolbar button[title="Bulk actions"]').first();
  const button = (await trigger.isVisible().catch(() => false)) ? trigger : icon;
  if (!(await button.count())) throw friendly({ message: 'The list has no bulk actions.', hint: 'Select rows first: the bulk actions apply to the selected records.' });
  return openDropdown(world, button, 'bulk actions of the list');
}

/**
 * Run a bulk action on the selected records (from the "Bulk actions" menu,
 * or its own button). An action that asks for a confirmation opens its modal:
 * confirm it with the next step.
 *
 * Example #1: When I run the bulk action "Delete selected"
 * Example #2: When I run the bulk action "Toggle visibility"
 * Example #3: And we run the bulk action "Delete selected"
 * Example #4: When I run the bulk action "Export selected"
 * Example #5: When I run the bulk action "Toggle visibility"
 */
When(/^(I |we )*run the bulk action "([^"]*)"$/, async function (pronounCase, name) {
  const table = await whichTable(this);
  const pattern = new RegExp(`^\\s*${escapeRegExp(clean(name))}\\s*$`, 'i');
  const direct = table.locator('.fi-ta-header-toolbar button').filter({ hasText: pattern }).first();
  if (await direct.isVisible().catch(() => false)) {
    await act(this, () => direct.click());
    return;
  }
  const menu = await bulkActions(this, table);
  const item = menu.locator('button, a').filter({ hasText: pattern }).first();
  if (!(await item.count())) {
    const offered = (await menu.locator('button, a').allInnerTexts()).map(clean).filter(Boolean);
    await closeDropdowns(this);
    throw friendly({ message: `The bulk actions have no "${name}". They offer: ${listed(offered)}.`, hint: 'The bulk actions are the ones the table gives the selected records.' });
  }
  await act(this, () => item.click());
});

/**
 * Assert that the bulk actions of the list offer an action, or do not.
 *
 * Example #1: Then the bulk actions should offer "Delete selected"
 * Example #2: Then the bulk actions should not offer "Force delete selected"
 * Example #3: And the bulk actions should offer "Toggle visibility"
 * Example #4: Then the bulk actions should offer "Export selected"
 * Example #5: But the bulk actions should not offer "Restore selected"
 */
Then(/^the bulk actions should( not)* offer "([^"]*)"$/, async function (notCase, name) {
  const table = await whichTable(this);
  const menu = await bulkActions(this, table);
  const offered = (await menu.locator('button, a').allInnerTexts()).map(clean).filter(Boolean);
  await closeDropdowns(this);
  const has = offered.some((item) => item.toLowerCase() === clean(name).toLowerCase());
  if (has === !!notCase) {
    throw friendly({ message: `Expected the bulk actions ${notCase ? 'not ' : ''}to offer "${name}". They offer: ${listed(offered)}.`, hint: 'The bulk actions are the ones the table gives the selected records.' });
  }
});

/** The groups a grouped table shows, by their headings. */
async function groupHeadings(table) {
  return table.evaluate((ta) => [...ta.querySelectorAll('.fi-ta-group-header')].map((g) => {
    const heading = g.querySelector('.fi-ta-group-heading, h4, .fi-ta-group-header-heading') || g;
    return heading.textContent.replace(/\s+/g, ' ').trim();
  })).catch(() => []);
}

/**
 * Group the rows of the list by one of its groupings ("Group by"), or stop
 * grouping them.
 *
 * Example #1: When I group the list by "Order date"
 * Example #2: When I stop grouping the list
 * Example #3: And we group the list by "Status"
 * Example #4: When I group the list by "Customer"
 * Example #5: Then I stop grouping the list
 */
When(/^(I |we )*(?:group the list by "([^"]*)"|stop grouping the list)$/, async function (pronounCase, grouping) {
  const table = await whichTable(this);
  // The grouping is drawn for narrow screens and for wide ones: the choice on screen.
  const select = table.locator('.fi-ta-grouping-settings select').filter({ visible: true }).first();
  const byLabel = table.getByLabel(/^\s*Group by\s*$/i).filter({ visible: true }).first();
  const control = (await byLabel.count()) ? byLabel : select;
  if (!(await control.count())) throw friendly({ message: 'The list cannot be grouped.', hint: 'A table with groupings has a "Group by" choice above its rows.' });
  const tag = await control.evaluate((el) => el.tagName);
  if (tag !== 'SELECT') throw friendly({ message: 'The "Group by" choice of the list is not a list of options this step can read.', hint: 'The panel shows it as a dropdown on narrow pages; widen the window.' });
  const options = (await control.locator('option').allInnerTexts()).map(clean);
  const label = grouping == null ? options.find((o) => o === '-' || o === '') : options.find((o) => o.toLowerCase() === clean(grouping).toLowerCase());
  if (label === undefined) throw friendly({ message: `The list cannot be grouped by "${grouping}". It offers: ${listed(options.filter((o) => o !== '-'))}.`, hint: 'Name the grouping as the "Group by" choice writes it.' });
  await act(this, () => control.selectOption({ label }));
});

/**
 * Assert that the grouped list shows a group (its heading), or how many it
 * shows on the page.
 *
 * Example #1: Then the list should show the group "Processing"
 * Example #2: Then the list should show 3 groups
 * Example #3: And the list should not show the group "Cancelled"
 * Example #4: Then the list should show the group "Webship Brand Alpha"
 * Example #5: Then the list should show 1 group
 */
Then(/^the list should( not)* show (?:the group "([^"]*)"|(\d+) groups?)$/, async function (notCase, group, count) {
  const table = await whichTable(this);
  const check = (headings) => (group != null
    ? headings.some((h) => h.toLowerCase() === clean(group).toLowerCase() || h.toLowerCase().endsWith(`: ${clean(group).toLowerCase()}`)) !== !!notCase
    : (headings.length === Number(count)) !== !!notCase);
  await eventually(this, () => groupHeadings(table), check, (headings) => ({
    message: `Expected the list ${notCase ? 'not ' : ''}to show ${group != null ? `the group "${group}"` : `${count} groups`}. Its groups: ${listed(headings)}.`,
    hint: 'Group the list first (When I group the list by "...").',
  }));
});

/**
 * Turn the reordering of the list on or off (its "Reorder records" button):
 * while it is on, the rows can be moved and the list shows them in their
 * order.
 *
 * Example #1: When I turn reordering of the list on
 * Example #2: When I turn reordering of the list off
 * Example #3: And we turn reordering of the list on
 * Example #4: Then I turn reordering of the list off
 * Example #5: Given I turn reordering of the list on
 */
When(/^(I |we )*turn reordering of the list (on|off)$/, async function (pronounCase, state) {
  const table = await whichTable(this);
  // While the list is reordered, each row is a handle to drag (x-sortable-handle) and the button above the rows
  // finishes the reordering; the body of the table is a sortable list either way.
  const isOn = async () => table.evaluate((ta) => !!ta.querySelector('tr[x-sortable-handle], [x-sortable-handle], .fi-ta-reorder-handle')
    || !!ta.querySelector('button[aria-label="Finish reordering records"], button[title="Finish reordering records"]')).catch(() => false);
  if ((await isOn()) === (state === 'on')) return;
  const label = state === 'on' ? 'Reorder records' : 'Finish reordering records';
  const button = table.locator(`button[aria-label="${label}"], button[title="${label}"]`)
    .or(table.locator('.fi-ta-header-toolbar button, .fi-ta-header button').filter({ hasText: state === 'on' ? /^\s*reorder/i : /^\s*(finish|done)/i })).first();
  if (!(await button.count())) throw friendly({ message: 'The list cannot be reordered.', hint: 'A table that can be reordered has a "Reorder records" button above its rows.' });
  await act(this, () => button.click());
  await eventually(this, isOn, (on) => on === (state === 'on'), () => ({ message: `The reordering of the list did not turn ${state}.`, hint: 'Press the reorder button above the rows.' }));
});

/**
 * Move a row of the list above or below another one, by its drag handle, as
 * a person drags it (reordering on), and wait for the new order to be saved.
 *
 * Example #1: When I move "Webship Brand Beta" above "Webship Brand Alpha" in the list
 * Example #2: When I move "Webship Brand Beta" below "Webship Brand Alpha" in the list
 * Example #3: And we move "Webship Brand Alpha" above "Webship Brand Beta" in the list
 * Example #4: When I move "Webship note about the market" above "Webship note about the harbour" in the list
 * Example #5: When I move "Webship Brand Alpha" below "Webship Brand Beta" in the list
 */
When(/^(I |we )*move "([^"]*)" (above|below) "([^"]*)" in the list$/, async function (pronounCase, moved, where, target) {
  const page = this.page;
  const table = await whichTable(this);
  const from = await rowLocator(this, table, moved);
  const to = await rowLocator(this, table, target);
  // The row itself is the handle (x-sortable-handle on the row), or a handle in it.
  const handle = (await from.getAttribute('x-sortable-handle').catch(() => null)) !== null
    ? from
    : from.locator('[x-sortable-handle], .fi-ta-reorder-handle, button[title*="eorder"], button[aria-label*="eorder"]').first();
  if (!(await handle.count())) throw friendly({ message: `The row of "${moved}" has no handle to move it.`, hint: 'Turn the reordering of the list on first.' });
  await to.scrollIntoViewIfNeeded().catch(() => {});
  await handle.scrollIntoViewIfNeeded().catch(() => {});
  const a = await handle.boundingBox();
  const b = await to.boundingBox();
  const view = page.viewportSize() || { height: Infinity };
  if (!a || !b || b.y < 0 || b.y + b.height > view.height || a.y < 0 || a.y + a.height > view.height) {
    throw friendly({ message: `"${moved}" and "${target}" are not on screen together.`, hint: 'Rows are moved by dragging one onto the other: they must be near each other in the list.' });
  }
  const y = where === 'above' ? b.y + 2 : b.y + b.height - 2;
  await act(this, async () => {
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 12; i += 1) {
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + ((y - (a.y + a.height / 2)) * i) / 12);
    }
    await page.mouse.up();
  });
});

/**
 * Assert that one record comes before another in the list.
 *
 * Example #1: Then "Webship Brand Beta" should come before "Webship Brand Alpha" in the list
 * Example #2: Then "Webship Brand Alpha" should come before "Webship Brand Beta" in the list
 * Example #3: And "Webship Test Teapot" should come before "Webship Test Kettle" in the list
 * Example #4: Then "Webship note about the harbour" should come before "Webship note about the market" in the list
 * Example #5: And "Webship Test Kettle" should come before "Webship Test Lantern" in the list
 */
Then(/^"([^"]*)" should come before "([^"]*)" in the list$/, async function (first, second) {
  const table = await whichTable(this);
  const index = (read, text) => read.rows.findIndex((row) => row.cells.some((cell) => cell.toLowerCase() === clean(text).toLowerCase()));
  await eventually(this, () => readTable(table), (read) => index(read, first) >= 0 && index(read, second) >= 0 && index(read, first) < index(read, second), (read) => ({
    message: `Expected "${first}" before "${second}" in the list; they are at rows ${index(read, first) + 1} and ${index(read, second) + 1} (0: not on the page). Its rows: ${rowsOf(read)}.`,
    hint: 'Both must be on the page on screen.',
  }));
});

module.exports = { whichTable, activeFilters, listTabs, selectionText, groupHeadings };

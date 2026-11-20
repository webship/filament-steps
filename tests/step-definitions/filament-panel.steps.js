'use strict';

// The panel's frame: the sidebar (its items, their badges, its groups, the
// page on screen), the heading and the breadcrumbs of a page, and opening the
// pages of a resource the way a person does: from the sidebar, then from the
// list (a record, the create page).
//
// The login, logging out, the user menu and the error pages are the Laravel
// pack's steps (this pack loads them): `Given I am a logged in user with the
// "administrator" user`, `When I log out`, `Then I should see the 403 error
// page`.

const { Given, When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  laravel,
  rest,
  act,
  follow,
  sidebarItems,
  sidebarGroups,
  openFromSidebar,
  pageHeading,
  breadcrumbs,
  tableLocator,
  rowLocator,
} = require('./filament-helpers');

const { budget, clean, listed, eventually } = laravel;

/**
 * Open the list of a resource (or any page of the panel) from its item in the
 * sidebar, as a person does: from the page on screen when it shows the
 * sidebar, else from the panel's home. A collapsed group is opened first.
 *
 * Example #1: Given I am on the "Products" list
 * Example #2: Given we are on the "Orders" list
 * Example #3: And I am on the "Brands" list
 * Example #4: Given I am on the "Employees" list
 * Example #5: Given I am on the "Notes" list
 */
Given(/^(I am |we are )*on the "([^"]*)" list$/, async function (pronounCase, item) {
  await openFromSidebar(this, item);
});

/**
 * Open a page of the panel from its item in the sidebar: a dashboard, a
 * settings page, the list of a resource.
 *
 * Example #1: When I open "Shop Dashboard" from the sidebar
 * Example #2: When we open "Products" from the sidebar
 * Example #3: And I open "HR Dashboard" from the sidebar
 * Example #4: When I open "Welcome" from the sidebar
 * Example #5: When I open "Dashboard" from the sidebar
 */
When(/^(I |we )*open "([^"]*)" from the sidebar$/, async function (pronounCase, item) {
  await openFromSidebar(this, item);
});

/**
 * Assert that the sidebar lists, or does not list, an item (by its label,
 * its badge left out): what the signed-in account may open.
 *
 * Example #1: Then the sidebar should list "Products"
 * Example #2: Then the sidebar should not list "Users"
 * Example #3: And the sidebar should list "Shop Dashboard"
 * Example #4: Then the sidebar should list "Notes"
 * Example #5: But the sidebar should not list "Settings"
 */
Then(/^the sidebar should( not)* list "([^"]*)"$/, async function (notCase, item) {
  const wanted = clean(item).toLowerCase();
  const has = (items) => items.some((entry) => entry.label.toLowerCase() === wanted);
  if (notCase) {
    const items = await sidebarItems(this);
    if (has(items)) throw friendly({ message: `Expected the sidebar not to list "${item}", but it does.`, hint: 'The sidebar lists the pages the signed-in account may open.' });
    return;
  }
  await eventually(this, () => sidebarItems(this), has, (items) => ({
    message: `Expected the sidebar to list "${item}". It lists: ${listed(items.map((entry) => entry.label))}.`,
    hint: 'Name the item as the sidebar writes it, without its badge. Log in first: the sidebar lists what the account may open.',
  }));
});

/**
 * Assert the badge of a sidebar item: any badge, or the one it reads.
 *
 * Example #1: Then the "Orders" item of the sidebar should show a badge
 * Example #2: Then the "Products" item of the sidebar should show the badge "9"
 * Example #3: And the "Customers" item of the sidebar should not show a badge
 * Example #4: Then the "Leave Requests" item of the sidebar should show a badge
 * Example #5: And the "Expenses" item of the sidebar should show the badge "69"
 */
Then(/^the "([^"]*)" item of the sidebar should( not)* show (?:a badge|the badge "([^"]*)")$/, async function (item, notCase, badge) {
  const wanted = clean(item).toLowerCase();
  const read = async () => (await sidebarItems(this)).find((entry) => entry.label.toLowerCase() === wanted);
  const entry = await eventually(this, read, (found) => !!found, () => ({ message: `The sidebar has no item "${item}".`, hint: 'Name the item as the sidebar writes it, without its badge.' }));
  const shows = badge == null ? !!entry.badge : entry.badge === clean(badge);
  if (notCase ? shows : !shows) {
    throw friendly({
      message: `Expected the "${item}" item of the sidebar ${notCase ? 'not ' : ''}to show ${badge == null ? 'a badge' : `the badge "${badge}"`}, but it shows ${entry.badge ? `"${entry.badge}"` : 'none'}.`,
      hint: 'A badge counts the records of the page that the panel wants to show (new orders, open requests).',
    });
  }
});

/**
 * Assert which sidebar item is the page on screen (the item the panel marks
 * as current).
 *
 * Example #1: Then the sidebar should show "Products" as the current page
 * Example #2: Then the sidebar should not show "Orders" as the current page
 * Example #3: And the sidebar should show "Welcome" as the current page
 * Example #4: Then the sidebar should show "Notes" as the current page
 * Example #5: And the sidebar should show "Brands" as the current page
 */
Then(/^the sidebar should( not)* show "([^"]*)" as the current page$/, async function (notCase, item) {
  const wanted = clean(item).toLowerCase();
  const check = (items) => {
    const named = items.filter((entry) => entry.label.toLowerCase() === wanted);
    return named.length > 0 && named.some((entry) => entry.current) !== !!notCase;
  };
  await eventually(this, () => sidebarItems(this), check, (items) => ({
    message: items.some((entry) => entry.label.toLowerCase() === wanted)
      ? `Expected the sidebar ${notCase ? 'not ' : ''}to show "${item}" as the current page. The current item: ${listed(items.filter((entry) => entry.current).map((entry) => entry.label))}.`
      : `The sidebar has no item "${item}". It lists: ${listed(items.map((entry) => entry.label))}.`,
    hint: `The page is ${this.page.url()}.`,
  }));
});

/**
 * Collapse or expand a group of the sidebar, with the button of its label.
 *
 * Example #1: When I collapse the "Shop" group of the sidebar
 * Example #2: When I expand the "Shop" group of the sidebar
 * Example #3: And we collapse the "HR" group of the sidebar
 * Example #4: When I expand the "Blog" group of the sidebar
 * Example #5: And I collapse the "Projects" group of the sidebar
 */
When(/^(I |we )*(collapse|expand) the "([^"]*)" group of the sidebar$/, async function (pronounCase, action, group) {
  const groups = await sidebarGroups(this);
  const entry = groups.find((g) => g.label.toLowerCase() === clean(group).toLowerCase());
  if (!entry) throw friendly({ message: `The sidebar has no group "${group}". Its groups: ${listed(groups.map((g) => g.label))}.`, hint: 'Name the group as the sidebar writes it.' });
  if (!entry.collapsible) throw friendly({ message: `The "${group}" group of the sidebar cannot be collapsed.`, hint: 'Only the groups the panel makes collapsible have a button.' });
  if (entry.collapsed === (action === 'collapse')) return;
  const button = this.page.locator('.fi-sidebar .fi-sidebar-group').filter({ has: this.page.locator('.fi-sidebar-group-label', { hasText: new RegExp(`^\\s*${laravel.escapeRegExp(clean(group))}\\s*$`) }) })
    .locator('button.fi-sidebar-group-collapse-btn, .fi-sidebar-group-btn button').first();
  await button.click();
  await eventually(this, () => sidebarGroups(this), (list) => list.some((g) => g.label.toLowerCase() === clean(group).toLowerCase() && g.collapsed === (action === 'collapse')), () => ({
    message: `The "${group}" group of the sidebar did not ${action}.`,
    hint: 'The group opens and closes with the button beside its label.',
  }));
  await rest(this);
});

/**
 * Assert that a group of the sidebar is collapsed (its items hidden) or
 * expanded.
 *
 * Example #1: Then the "Shop" group of the sidebar should be collapsed
 * Example #2: Then the "Shop" group of the sidebar should be expanded
 * Example #3: And the "HR" group of the sidebar should be expanded
 * Example #4: Then the "Blog" group of the sidebar should be collapsed
 * Example #5: And the "Projects" group of the sidebar should be expanded
 */
Then(/^the "([^"]*)" group of the sidebar should be (collapsed|expanded)$/, async function (group, state) {
  await eventually(this, () => sidebarGroups(this), (list) => list.some((g) => g.label.toLowerCase() === clean(group).toLowerCase() && g.collapsed === (state === 'collapsed')), (list) => {
    const entry = list.find((g) => g.label.toLowerCase() === clean(group).toLowerCase());
    return {
      message: entry ? `Expected the "${group}" group of the sidebar to be ${state}, but it is ${entry.collapsed ? 'collapsed' : 'expanded'}.` : `The sidebar has no group "${group}". Its groups: ${listed(list.map((g) => g.label))}.`,
      hint: 'The panel remembers a collapsed group in the browser for the next pages.',
    };
  });
});

/**
 * Assert the heading of the page on screen.
 *
 * Example #1: Then the page heading should be "Products"
 * Example #2: Then the page heading should be "Create Product"
 * Example #3: And the page heading should be "Edit Webship Test Kettle"
 * Example #4: Then the page heading should be "Manage Webship test post Comments"
 * Example #5: And the page heading should be "Notes"
 */
Then(/^the page heading should be "([^"]*)"$/, async function (heading) {
  await eventually(this, () => pageHeading(this), (text) => text.toLowerCase() === clean(heading).toLowerCase(), (text) => ({
    message: `Expected the page heading "${heading}", but it is "${text}" (${this.page.url()}).`,
    hint: 'The heading is the title at the top of the page, above its actions.',
  }));
});

/**
 * Assert the breadcrumbs of the page, from the first to the page on screen,
 * separated by "›" (or ">").
 *
 * Example #1: Then the breadcrumbs should read "Products › List"
 * Example #2: Then the breadcrumbs should read "Products › Create"
 * Example #3: And the breadcrumbs should read "Orders › WS-TEST-0001 › Edit"
 * Example #4: Then the breadcrumbs should read "Notes > List"
 * Example #5: And the breadcrumbs should read "Employees › Create"
 */
Then(/^the breadcrumbs should read "([^"]*)"$/, async function (trail) {
  const wanted = trail.split(/\s*[›>]\s*/).map(clean).filter(Boolean);
  await eventually(this, () => breadcrumbs(this), (items) => items.length === wanted.length && items.every((item, i) => item.toLowerCase() === wanted[i].toLowerCase()), (items) => ({
    message: `Expected the breadcrumbs "${wanted.join(' › ')}", but they read "${items.join(' › ') || '(none)'}".`,
    hint: 'The breadcrumbs are the trail above the heading of the page.',
  }));
});

/**
 * Assert that the page on screen is the list of a resource: the heading is
 * its name and the sidebar marks it as the current page.
 *
 * Example #1: Then I should be on the "Products" list
 * Example #2: Then we should be on the "Orders" list
 * Example #3: And I should be on the "Brands" list
 * Example #4: Then I should be on the "Notes" list
 * Example #5: And I should be on the "Tasks" list
 */
Then(/^(I |we )*should be on the "([^"]*)" list$/, async function (pronounCase, item) {
  const wanted = clean(item).toLowerCase();
  const read = async () => ({ heading: await pageHeading(this), items: await sidebarItems(this), hasList: !!(await tableLocator(this).catch(() => null)) });
  await eventually(this, read, (state) => state.heading.toLowerCase() === wanted && state.items.some((entry) => entry.current && entry.label.toLowerCase() === wanted) && state.hasList, (state) => ({
    message: `Expected the "${item}" list, but the page is "${state.heading}" (${this.page.url()}), the current item of the sidebar ${listed(state.items.filter((entry) => entry.current).map((entry) => entry.label))}.`,
    hint: 'A list shows the name of its resource as its heading, and the sidebar marks it.',
  }));
});

/**
 * Open a record from the list, as a person does: the link of its row (the
 * page that edits or shows it).
 *
 * Example #1: When I open "Webship Test Kettle" from the list
 * Example #2: When we open "WS-TEST-0001" from the list
 * Example #3: And I open "Wendy Webship" from the list
 * Example #4: When I open "Webship note about the harbour" from the list
 * Example #5: When I open "Webship Brand Alpha" from the list
 */
When(/^(I |we )*open "([^"]*)" from the list$/, async function (pronounCase, text) {
  const table = await tableLocator(this);
  const row = await rowLocator(this, table, text);
  // Every cell of a row links to its record; a cell whose text is copied on a click (an order number)
  // does not open it, so a person clicks another cell of the row.
  const links = row.locator('td.fi-ta-cell:not(.fi-ta-selection-cell) a[href]:not([role="menuitem"])')
    .filter({ hasNot: this.page.locator('[x-data="filamentCopyable"]') });
  const byText = links.filter({ hasText: new RegExp(laravel.escapeRegExp(clean(text)), 'i') }).first();
  const target = (await byText.count()) ? byText : links.first();
  if (!(await target.count())) {
    throw friendly({ message: `The row of "${text}" has no link to open it.`, hint: 'A row opens its record with a link of its cells; a list whose rows open a modal is used with the row actions.' });
  }
  await follow(this, target, `the row of "${text}"`);
});

/**
 * Open the page (or the modal) that makes a new record, from the button at
 * the top of the list ("New product").
 *
 * Example #1: When I create a new record from the list
 * Example #2: When we create a new record from the list
 * Example #3: And I create a new record from the list
 * Example #4: When I create a new record from the list
 * Example #5: Then I create a new record from the list
 */
When(/^(I |we )*create a new record from the list$/, async function (pronounCase) {
  const page = this.page;
  const header = page.locator('.fi-header .fi-ac, .fi-header-actions-ctn').first();
  const candidate = header.locator('a, button').filter({ hasText: /^\s*(New|Create)\b/i }).first();
  if (!(await candidate.count())) {
    const offered = (await header.locator('a, button').allInnerTexts().catch(() => [])).map(clean).filter(Boolean);
    throw friendly({ message: `The list has no button to make a new record. Its actions: ${listed(offered)}.`, hint: 'The button reads "New <record>" at the top of the list; an account that may not create sees none.' });
  }
  const href = await candidate.getAttribute('href');
  if (href) {
    await follow(this, candidate, 'the button that makes a new record');
  } else {
    await act(this, () => candidate.click());
  }
});

/** The pages of the record's sub-navigation (View, Edit, a page of related records): label, current. */
async function subNavigation(world) {
  return world.page.evaluate(() => [...document.querySelectorAll('.fi-page-sub-navigation-tabs a, .fi-page-sub-navigation a, .fi-page-sub-navigation-sidebar a')]
    .map((a) => ({
      label: ((a.querySelector('.fi-tabs-item-label, .fi-sidebar-item-label') || a).textContent || '').replace(/\s+/g, ' ').trim(),
      current: a.getAttribute('aria-current') === 'page' || a.classList.contains('fi-active'),
    })).filter((item) => item.label)).catch(() => []);
}

/**
 * Open a page of the record's sub-navigation (the tabs or the list above the
 * record: "View", "Edit", a page of its related records).
 *
 * Example #1: When I open the "Edit" page of the record
 * Example #2: When I open the "Comments" page of the record
 * Example #3: And we open the "View" page of the record
 * Example #4: When I open the "Edit" page of the record
 * Example #5: When we open the "Comments" page of the record
 */
When(/^(I |we )*open the "([^"]*)" page of the record$/, async function (pronounCase, label) {
  const items = await subNavigation(this);
  const entry = items.find((item) => item.label.toLowerCase() === clean(label).toLowerCase());
  if (!entry) throw friendly({ message: `The record has no "${label}" page in its sub-navigation. It has: ${listed(items.map((item) => item.label))}.`, hint: 'A resource with a sub-navigation shows the pages of a record above it (View, Edit, related records).' });
  if (entry.current) return;
  const link = this.page.locator('.fi-page-sub-navigation-tabs a, .fi-page-sub-navigation a, .fi-page-sub-navigation-sidebar a').filter({ hasText: new RegExp(`^\\s*${laravel.escapeRegExp(clean(label))}\\s*$`, 'i') }).first();
  await follow(this, link, `the "${label}" page of the record`);
});

/**
 * Assert which page of the record's sub-navigation is on screen.
 *
 * Example #1: Then the "View" page of the record should be the current one
 * Example #2: Then the "Edit" page of the record should be the current one
 * Example #3: And the "Comments" page of the record should be the current one
 * Example #4: Then the "View" page of the record should be the current one
 * Example #5: And the "Edit" page of the record should be the current one
 */
Then(/^the "([^"]*)" page of the record should be the current one$/, async function (label) {
  await eventually(this, () => subNavigation(this), (items) => items.some((item) => item.current && item.label.toLowerCase() === clean(label).toLowerCase()), (items) => ({
    message: `Expected the "${label}" page of the record on screen. The current one: ${listed(items.filter((item) => item.current).map((item) => item.label))}.`,
    hint: 'The sub-navigation of a record marks the page on screen.',
  }));
});

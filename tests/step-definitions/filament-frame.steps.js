'use strict';

// The parts of the panel around its pages: the global search, the drawer of
// notifications that the panel keeps for an account, the theme of the user
// menu, and the tenant (the team) a panel with tenancy works in.
//
// The toasts a save shows are the Laravel pack's notification steps (this
// pack names the panel's toasts to them): `Then I should see the
// notification "Saved"`. The user menu's items are the Laravel pack's too:
// `Then the user menu should offer "Sign out"`.

const { When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  laravel,
  rest,
  act,
  follow,
  openModals,
  waitForModal,
  waitForModalClosed,
  openDropdown,
  closeDropdowns,
} = require('./filament-helpers');

const { budget, clean, listed, escapeRegExp, eventually } = laravel;

// ---------------------------------------------------------------------------
// The global search
// ---------------------------------------------------------------------------

/** The global search field of the panel (in the sidebar or the top bar). */
function globalSearchField(world) {
  return world.page.locator('.fi-global-search input[type="search"]').filter({ visible: true }).first();
}

/** What the results of the global search show: the query they answer, the groups and the results. */
async function globalResults(world) {
  return world.page.evaluate(() => {
    const region = document.querySelector('.fi-global-search-results-ctn');
    if (!region) return { open: false, query: '', has: false, groups: [], results: [], message: '' };
    const style = getComputedStyle(region);
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const results = [...region.querySelectorAll('.fi-global-search-result-heading')].map(text);
    return {
      open: style.display !== 'none' && region.getAttribute('aria-hidden') !== 'true',
      query: region.getAttribute('data-query') || '',
      // The region's data-has-results stays "true" with no result: the results themselves say it.
      has: results.length > 0,
      message: region.getAttribute('data-message') || text(region.querySelector('.fi-global-search-no-results-message')),
      groups: [...region.querySelectorAll('.fi-global-search-result-group-header')].map(text),
      results,
    };
  }).catch(() => ({ open: false, query: '', has: false, groups: [], results: [], message: '' }));
}

/**
 * Search the whole panel with its global search field, as a person types it,
 * and wait for the results of exactly that text (the results say which text
 * they answer).
 *
 * Example #1: When I search the panel for "Webship Test"
 * Example #2: When we search the panel for "WS-TEST-0001"
 * Example #3: And I search the panel for "Wendy"
 * Example #4: When I search the panel for "no record has this name"
 * Example #5: When I search the panel for "Webship note"
 */
When(/^(I |we )*search the panel for "([^"]*)"$/, async function (pronounCase, text) {
  const field = globalSearchField(this);
  if (!(await field.count())) throw friendly({ message: 'The panel has no global search field.', hint: 'A panel whose resources are searchable globally shows the search field in its sidebar or its top bar.' });
  await act(this, () => field.fill(text));
  await eventually(this, () => globalResults(this), (state) => state.open && state.query === text, (state) => ({
    message: `The global search did not answer "${text}" (its results answer "${state.query}").`,
    hint: 'The global search asks the server after a short pause in typing.',
  }));
});

/**
 * Assert that the global search found a record (a result's title), or did
 * not; or that it found nothing at all.
 *
 * Example #1: Then the global search should find "Webship Test Kettle"
 * Example #2: Then the global search should not find "Webship Brand Alpha"
 * Example #3: And the global search should find "WS-TEST-0001"
 * Example #4: Then the global search should find nothing
 * Example #5: And the global search should find "Webship note about the harbour"
 */
Then(/^the global search should( not)* find (?:"([^"]*)"|(nothing))$/, async function (notCase, title, nothing) {
  if (nothing) {
    await eventually(this, () => globalResults(this), (state) => state.open && !state.has, (state) => ({
      message: `Expected the global search to find nothing, but it found: ${listed(state.results)}${state.message ? ` (${state.message})` : ''}.`,
      hint: 'A search the server finds nothing for shows its message instead of results.',
    }));
    return;
  }
  const wanted = clean(title).toLowerCase();
  await eventually(this, () => globalResults(this), (state) => state.open && state.results.some((r) => r.toLowerCase() === wanted) !== !!notCase, (state) => ({
    message: `Expected the global search ${notCase ? 'not ' : ''}to find "${title}". It found: ${listed(state.results)}${state.message ? ` (${state.message})` : ''}.`,
    hint: 'The global search finds the records of the resources that are searchable globally, by their title and its attributes.',
  }));
});

/**
 * Assert that the results of the global search have a group (the resource
 * they come from, as the panel writes it).
 *
 * Example #1: Then the global search should show the group "products"
 * Example #2: Then the global search should show the group "orders"
 * Example #3: And the global search should not show the group "customers"
 * Example #4: Then the global search should show the group "notes"
 * Example #5: And the global search should show the group "products"
 */
Then(/^the global search should( not)* show the group "([^"]*)"$/, async function (notCase, group) {
  const wanted = clean(group).toLowerCase();
  await eventually(this, () => globalResults(this), (state) => state.open && state.groups.some((g) => g.toLowerCase() === wanted) !== !!notCase, (state) => ({
    message: `Expected the results of the global search ${notCase ? 'not ' : ''}to have the group "${group}". Its groups: ${listed(state.groups)}.`,
    hint: 'The results are grouped by the resource they come from.',
  }));
});

/**
 * Open a result of the global search (its page).
 *
 * Example #1: When I open "Webship Test Kettle" from the global search
 * Example #2: When we open "WS-TEST-0001" from the global search
 * Example #3: And I open "Wendy Webship" from the global search
 * Example #4: When I open "Webship note about the harbour" from the global search
 * Example #5: When I open "Webship Test Teapot" from the global search
 */
When(/^(I |we )*open "([^"]*)" from the global search$/, async function (pronounCase, title) {
  const link = this.page.locator('.fi-global-search-result-link').filter({ has: this.page.locator('.fi-global-search-result-heading', { hasText: new RegExp(`^\\s*${escapeRegExp(clean(title))}\\s*$`, 'i') }) }).first();
  if (!(await link.count())) {
    const state = await globalResults(this);
    throw friendly({ message: `The global search shows no result "${title}". It shows: ${listed(state.results)}.`, hint: 'Search the panel first (When I search the panel for "...").' });
  }
  await follow(this, link, `the result "${title}" of the global search`);
});

// ---------------------------------------------------------------------------
// The notifications drawer
// ---------------------------------------------------------------------------

/** The heading of the notifications drawer, and its notifications (title, body, unread). */
async function drawer(world) {
  return world.page.evaluate(() => {
    const modal = document.getElementById('database-notifications') || document.querySelector('.fi-no-database .fi-modal');
    if (!modal) return { exists: false, open: false, heading: '', items: [] };
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const win = modal.querySelector('.fi-modal-window');
    const open = modal.classList.contains('fi-modal-open') && !!win && getComputedStyle(win).display !== 'none';
    return {
      exists: true,
      open,
      heading: text(document.getElementById(`${modal.id}.heading`) || modal.querySelector('.fi-modal-heading')),
      items: [...modal.querySelectorAll('.fi-no-notification')].map((n) => ({
        title: text(n.querySelector('.fi-no-notification-title')),
        body: text(n.querySelector('.fi-no-notification-body')),
        unread: n.classList.contains('fi-no-notification-unread-ctn') || !!n.closest('.fi-no-notification-unread-ctn'),
      })),
    };
  }).catch(() => ({ exists: false, open: false, heading: '', items: [] }));
}

/** The button that opens the notifications drawer (sidebar or top bar). */
function drawerButton(world) {
  return world.page.locator('.fi-sidebar-database-notifications-btn, .fi-topbar-database-notifications-btn, button[aria-label="Notifications"]').filter({ visible: true }).first();
}

/**
 * Open the drawer of the notifications the panel keeps for the account, and
 * wait for it to slide in.
 *
 * Example #1: When I open the notifications drawer
 * Example #2: When we open the notifications drawer
 * Example #3: And I open the notifications drawer
 * Example #4: Then I open the notifications drawer
 * Example #5: Given I open the notifications drawer
 */
When(/^(I |we )*open the notifications drawer$/, async function (pronounCase) {
  const button = drawerButton(this);
  if (!(await button.count())) throw friendly({ message: 'The panel has no notifications button.', hint: 'A panel that keeps notifications in its database shows the button in its sidebar or top bar.' });
  if (!(await drawer(this)).open) await act(this, () => button.click());
  await eventually(this, () => drawer(this), (state) => state.open, () => ({ message: 'The notifications drawer did not open.', hint: 'It slides in from the side of the page.' }));
  await waitForModal(this, null);
});

/**
 * Close the notifications drawer (its close button), and wait for it to slide
 * out; a drawer that is closed already stays so.
 *
 * Example #1: When I close the notifications drawer
 * Example #2: When we close the notifications drawer
 * Example #3: And I close the notifications drawer
 * Example #4: Then I close the notifications drawer
 * Example #5: Given I close the notifications drawer
 */
When(/^(I |we )*close the notifications drawer$/, async function (pronounCase) {
  if (!(await drawer(this)).open) return;
  const modal = this.page.locator('#database-notifications .fi-modal-window, .fi-no-database .fi-modal-window').first();
  const close = modal.locator('.fi-modal-close-btn, button[aria-label="Close"], button[title="Close"]').first();
  if (await close.count()) await close.click();
  else await this.page.keyboard.press('Escape');
  await eventually(this, () => drawer(this), (state) => !state.open, () => ({ message: 'The notifications drawer did not close.', hint: 'It closes with the cross at its top, or Escape.' }));
  await rest(this);
});

/**
 * Assert that the notifications drawer lists a notification (by its title,
 * or its body), or is empty.
 *
 * Example #1: Then the notifications drawer should list "New order"
 * Example #2: Then the notifications drawer should be empty
 * Example #3: And the notifications drawer should not list "New order"
 * Example #4: Then the notifications drawer should list "New comment"
 * Example #5: And the notifications drawer should be empty
 */
Then(/^the notifications drawer should(?:( not)* list "([^"]*)"| (be empty))$/, async function (notCase, title, empty) {
  if (empty) {
    await eventually(this, () => drawer(this), (state) => state.items.length === 0, (state) => ({ message: `Expected the notifications drawer to be empty, but it lists: ${listed(state.items.map((i) => i.title))}.`, hint: 'The drawer keeps the notifications sent to the account until they are cleared.' }));
    return;
  }
  const wanted = clean(title).toLowerCase();
  await eventually(this, () => drawer(this), (state) => state.items.some((i) => i.title.toLowerCase() === wanted || i.body.toLowerCase().includes(wanted)) !== !!notCase, (state) => ({
    message: `Expected the notifications drawer ${notCase ? 'not ' : ''}to list "${title}". It lists: ${listed(state.items.map((i) => i.title))}.`,
    hint: 'The drawer lists the notifications the panel sent to the signed-in account; open it first.',
  }));
});

/**
 * Mark every notification of the drawer as read, or clear the drawer (its
 * actions at the top), and wait for the answer.
 *
 * Example #1: When I mark all notifications as read
 * Example #2: When I clear the notifications drawer
 * Example #3: And we mark all notifications as read
 * Example #4: And we clear the notifications drawer
 * Example #5: Then I clear the notifications drawer
 */
When(/^(I |we )*(mark all notifications as read|clear the notifications drawer)$/, async function (pronounCase, action) {
  if (!(await drawer(this)).open) {
    await act(this, () => drawerButton(this).click());
    await waitForModal(this, null);
  }
  const modal = this.page.locator('#database-notifications .fi-modal-window, .fi-no-database .fi-modal-window').first();
  const name = action === 'clear the notifications drawer' ? /^\s*Clear\s*$/i : /^\s*Mark all as read\s*$/i;
  const button = modal.locator('button, a').filter({ hasText: name }).first();
  if (!(await button.count())) {
    const state = await drawer(this);
    if (!state.items.length) return;
    throw friendly({ message: `The notifications drawer has no "${action === 'clear the notifications drawer' ? 'Clear' : 'Mark all as read'}" action.`, hint: 'The actions are at the top of the drawer while it lists notifications.' });
  }
  await act(this, () => button.click());
});

/**
 * Assert the number of unread notifications the panel shows on its
 * notifications button.
 *
 * Example #1: Then the notifications button should show 1 unread
 * Example #2: Then the notifications button should show 0 unread
 * Example #3: And the notifications button should show 2 unread
 * Example #4: Then the notifications button should show 1 unread
 * Example #5: And the notifications button should show 0 unread
 */
Then(/^the notifications button should show (\d+) unread$/, async function (count) {
  const read = async () => {
    const button = drawerButton(this);
    const badge = clean(await button.locator('.fi-badge').first().innerText({ timeout: 300 }).catch(() => ''));
    return badge ? Number(badge.replace(/[^\d]/g, '')) : 0;
  };
  await eventually(this, read, (n) => n === Number(count), (n) => ({ message: `The notifications button shows ${n} unread, not ${count}.`, hint: 'The badge counts the unread notifications; marking them as read or clearing them empties it.' }));
});

// ---------------------------------------------------------------------------
// The theme of the user menu
// ---------------------------------------------------------------------------

/** The theme the user menu marks as chosen, and the one the page is drawn in. */
async function theme(world) {
  return world.page.evaluate(() => {
    const chosen = [...document.querySelectorAll('.fi-theme-switcher [role="menuitemradio"]')].find((b) => b.getAttribute('aria-checked') === 'true');
    const label = chosen ? (chosen.getAttribute('aria-label') || '') : '';
    let stored = null;
    try { stored = localStorage.getItem('filament:theme:mode') || localStorage.getItem('theme'); } catch (e) { /* storage blocked */ }
    return {
      chosen: (label.match(/(light|dark|system)/i) || [])[1] ? label.match(/(light|dark|system)/i)[1].toLowerCase() : (stored || ''),
      drawn: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    };
  }).catch(() => ({ chosen: '', drawn: '' }));
}

/**
 * Switch the theme of the panel with the theme buttons of the user menu
 * (light, dark, or the system's).
 *
 * Example #1: When I switch the admin theme to "dark"
 * Example #2: When I switch the admin theme to "light"
 * Example #3: And we switch the admin theme to "system"
 * Example #4: When I switch the admin theme to "dark"
 * Example #5: Then I switch the admin theme to "system"
 */
When(/^(I |we )*switch the admin theme to "(light|dark|system)"$/, async function (pronounCase, wanted) {
  const trigger = this.page.locator('.fi-user-menu .fi-user-menu-trigger').filter({ visible: true }).first();
  if (!(await trigger.count())) throw friendly({ message: 'The page has no user menu.', hint: 'Log in first: the theme buttons are in the user menu.' });
  const panel = await openDropdown(this, trigger, 'user menu');
  const button = panel.locator('[role="menuitemradio"]').filter({ has: this.page.locator('svg') }).and(panel.locator(`[aria-label*="${wanted}" i]`)).first();
  if (!(await button.count())) {
    await closeDropdowns(this);
    throw friendly({ message: `The user menu has no button for the ${wanted} theme.`, hint: 'A panel without dark mode has no theme buttons.' });
  }
  await button.click();
  await closeDropdowns(this);
  await eventually(this, () => theme(this), (state) => state.chosen === wanted, (state) => ({ message: `The theme did not switch to "${wanted}" (it is "${state.chosen}").`, hint: 'The theme buttons are at the top of the user menu.' }));
  await rest(this);
});

/**
 * Assert the theme chosen in the user menu (light, dark, system), and for
 * light and dark that the page is drawn in it.
 *
 * Example #1: Then the admin theme should be "dark"
 * Example #2: Then the admin theme should be "light"
 * Example #3: And the admin theme should be "system"
 * Example #4: Then the admin theme should be "dark"
 * Example #5: And the admin theme should be "light"
 */
Then(/^the admin theme should be "(light|dark|system)"$/, async function (wanted) {
  await eventually(this, () => theme(this), (state) => state.chosen === wanted && (wanted === 'system' || state.drawn === wanted), (state) => ({
    message: `Expected the "${wanted}" theme, but the user menu marks "${state.chosen || '(none)'}" and the page is drawn ${state.drawn}.`,
    hint: 'The panel keeps the choice in the browser; "system" follows the colour scheme of the browser (light in a test browser).',
  }));
});

// ---------------------------------------------------------------------------
// Tenancy
// ---------------------------------------------------------------------------

/** The current tenant and the tenants the tenant menu offers. */
async function tenants(world, { offered = false } = {}) {
  const current = clean(await world.page.locator('.fi-tenant-menu .fi-tenant-menu-trigger-tenant-name').first().innerText({ timeout: 1000 }).catch(() => ''));
  if (!offered) return { current, offered: [] };
  const trigger = world.page.locator('.fi-tenant-menu .fi-tenant-menu-trigger').first();
  const panel = await openDropdown(world, trigger, 'tenant menu');
  const items = (await panel.locator('[role="menuitem"], a, button').allInnerTexts()).map(clean).filter(Boolean);
  await closeDropdowns(world);
  return { current, offered: [...new Set(items)] };
}

/**
 * Switch the current tenant (the team, the company) with the tenant menu at
 * the top of the sidebar; the panel opens the same page in that tenant.
 *
 * Example #1: When I switch the current tenant to "Webship Second Team"
 * Example #2: When I switch the current tenant to "Webship Team"
 * Example #3: And we switch the current tenant to "Webship Second Team"
 * Example #4: When we switch the current tenant to "Webship Team"
 * Example #5: Then I switch the current tenant to "Webship Team"
 */
When(/^(I |we )*switch the current tenant to "([^"]*)"$/, async function (pronounCase, tenant) {
  const trigger = this.page.locator('.fi-tenant-menu .fi-tenant-menu-trigger').first();
  if (!(await trigger.count())) throw friendly({ message: 'The panel has no tenant menu.', hint: 'Only a panel with tenancy has one, at the top of its sidebar.' });
  if ((await tenants(this)).current.toLowerCase() === clean(tenant).toLowerCase()) return;
  const panel = await openDropdown(this, trigger, 'tenant menu');
  const item = panel.locator('a, button').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(clean(tenant))}\\s*$`, 'i') }).first();
  if (!(await item.count())) {
    const items = (await panel.locator('a, button').allInnerTexts()).map(clean).filter(Boolean);
    await closeDropdowns(this);
    throw friendly({ message: `The tenant menu offers no "${tenant}". It offers: ${listed(items)}.`, hint: 'It lists the tenants the account belongs to.' });
  }
  await follow(this, item, `the tenant "${tenant}"`);
});

/**
 * Assert the current tenant, as the tenant menu at the top of the sidebar
 * names it.
 *
 * Example #1: Then the current tenant should be "Webship Team"
 * Example #2: Then the current tenant should be "Webship Second Team"
 * Example #3: And the current tenant should be "Webship Team"
 * Example #4: Then the current tenant should be "Webship Second Team"
 * Example #5: And the current tenant should be "Webship Team"
 */
Then(/^the current tenant should be "([^"]*)"$/, async function (tenant) {
  const wanted = clean(tenant).toLowerCase();
  await eventually(this, () => tenants(this), (s) => s.current.toLowerCase() === wanted, (s) => ({
    message: `The current tenant is "${s.current || '(none)'}", not "${tenant}".`,
    hint: 'The current tenant shows at the top of the sidebar of a panel with tenancy.',
  }));
});

/**
 * Assert that the tenant menu offers a tenant to switch to (or an item such as
 * "New team"), or does not.
 *
 * Example #1: Then the tenant menu should offer "Webship Second Team"
 * Example #2: Then the tenant menu should offer "New team"
 * Example #3: And the tenant menu should not offer "Webship Team"
 * Example #4: Then the tenant menu should offer "Webship Team"
 * Example #5: But the tenant menu should not offer "Webship Second Team"
 */
Then(/^the tenant menu should( not)* offer "([^"]*)"$/, async function (notCase, tenant) {
  const wanted = clean(tenant).toLowerCase();
  const state = await tenants(this, { offered: true });
  if (state.offered.some((t) => t.toLowerCase() === wanted) === !!notCase) {
    throw friendly({
      message: `Expected the tenant menu ${notCase ? 'not ' : ''}to offer "${tenant}". It offers: ${listed(state.offered)} (current: "${state.current}").`,
      hint: 'The menu lists the other tenants the account belongs to, and the link to make a new one.',
    });
  }
});

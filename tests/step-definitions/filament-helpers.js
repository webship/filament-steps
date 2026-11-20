'use strict';

// Shared helpers for the step files of this pack.
//
// Not a step file: it registers no step definitions. It holds the plumbing the
// steps use and that a project can require for its own steps: the waits on
// the panel's own signals, the sidebar, the page header, the tables of the
// resources, the fields of a form by their labels, the modals and slide-overs,
// the dropdowns, and the widgets.
//
// The panel is a server-rendered app that talks to the server for every
// action: a click, a search, a filter, a page of a table or a save is one
// request to the app's update route, and the page is morphed from its answer.
// The steps wait on what the Laravel pack's steps wait on for the same kind
// of page (the requests of the page, then a quiet moment: its helpers are
// used here as they are), on the page change of the panel's single-page mode
// (the `livewire:navigated` event), and on the transitions the panel plays
// when a modal, a slide-over or a dropdown opens or closes (the element is
// shown and its animations have finished). No step sleeps.

const { friendly } = require('webship-js/tests/step-definitions/webship');
const laravel = require('@webship-js/laravel-steps/tests/step-definitions/laravel-helpers');

const {
  budget,
  clean,
  listed,
  escapeRegExp,
  siteUrl,
  homePath,
  requests,
  settle,
  open,
  eventually,
} = laravel;

// ---------------------------------------------------------------------------
// Waiting on the panel
// ---------------------------------------------------------------------------

// The page changes of the panel's single-page mode: a link of the panel
// fetches the next page and swaps it in, with the events livewire:navigate,
// livewire:navigating and livewire:navigated. A recorder notes the time of the
// last one of each, so a step knows that the page it waited for has arrived.
const NAVIGATION_RECORDER = `(() => {
  if (window.__webshipPanelRecorder) return;
  window.__webshipPanelRecorder = true;
  window.__webshipNavigated = 0;
  window.__webshipNavigating = 0;
  document.addEventListener('livewire:navigate', () => { window.__webshipNavigating = Date.now(); });
  document.addEventListener('livewire:navigated', () => { window.__webshipNavigated = Date.now(); });
})();`;

/** Start recording the page changes of this browser context (once). */
async function recordNavigation(world) {
  if (!world.__panelNavigationRecorded) {
    world.__panelNavigationRecorded = true;
    await world.page.context().addInitScript(NAVIGATION_RECORDER);
  }
  await world.page.evaluate(NAVIGATION_RECORDER).catch(() => {});
}

/**
 * Wait until the panel is at rest: the document has loaded, no request of the
 * page is running (the Laravel pack's settle), no element is in the loading
 * state of a request (`data-loading`, which the element that sent a request
 * carries until its answer is in), and no modal, slide-over, dropdown or
 * notification is still in its transition.
 */
async function rest(world, timeout) {
  const deadline = Date.now() + (timeout || budget(world));
  await settle(world, Math.max(deadline - Date.now(), 1));
  for (;;) {
    const busy = await world.page.evaluate(() => {
      const shown = (el) => {
        if (!el || !el.isConnected) return false;
        const style = getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      };
      if (document.readyState !== 'complete') return 'the document is loading';
      // The element that sent a request carries data-loading until its answer is in.
      if (document.querySelector('[data-loading]')) return 'an element waits for its request';
      for (const el of document.querySelectorAll('.fi-modal-window, .fi-dropdown-panel, .fi-no-notification')) {
        if (!shown(el)) continue;
        if (el.getAnimations().some((animation) => animation.playState === 'running')) return 'a transition is running';
      }
      return '';
    }).catch(() => '');
    if (!busy || Date.now() > deadline) return busy;
    await world.page.waitForTimeout(50);
  }
}

/**
 * Run an action that makes the panel talk to the server, then wait for it to
 * finish: a request or a page change starts within a moment (the Laravel
 * pack's afterRequests), every request ends, and the panel is at rest.
 */
async function act(world, fn) {
  await recordNavigation(world);
  const result = await laravel.afterRequests(world, fn);
  await rest(world);
  return result;
}

/**
 * Follow a link of the panel, as a person does, and wait for the page it
 * opens: in the single-page mode the panel's own page change
 * (livewire:navigated), otherwise the new document; then the panel at rest.
 */
async function follow(world, link, label) {
  await recordNavigation(world);
  const from = world.page.url();
  const clickedAt = Date.now();
  await link.click();
  try {
    await eventually(world, async () => ({
      url: world.page.url(),
      navigated: await world.page.evaluate(() => window.__webshipNavigated || 0).catch(() => 0),
      navigating: await world.page.evaluate(() => window.__webshipNavigating || 0).catch(() => 0),
    }), (state) => state.url !== from && (state.navigated >= clickedAt || state.navigating < clickedAt), () => ({ message: 'no page change' }));
  } catch {
    throw friendly({
      message: `Following ${label} did not open another page (still ${world.page.url()}).`,
      hint: 'The link of the panel opens its page in place (single-page mode) or loads it; check that the link is the one meant.',
    });
  }
  await world.page.waitForLoadState('load', { timeout: budget(world) }).catch(() => {});
  await rest(world);
}

/** Open an address of the panel and wait for it to be at rest. */
async function openPanelPage(world, url) {
  await recordNavigation(world);
  await open(world, url);
  await rest(world);
}

// ---------------------------------------------------------------------------
// The frame: sidebar, page header, breadcrumbs
// ---------------------------------------------------------------------------

/** The items of the sidebar: label, address, badge, current, and the group they are in. */
async function sidebarItems(world) {
  return world.page.evaluate(() => {
    const out = [];
    for (const item of document.querySelectorAll('.fi-sidebar .fi-sidebar-item')) {
      const link = item.querySelector('a, button');
      const labelEl = item.querySelector('.fi-sidebar-item-label');
      const label = (labelEl ? labelEl.textContent : (link ? link.textContent : '')).replace(/\s+/g, ' ').trim();
      if (!label) continue;
      const badge = item.querySelector('.fi-sidebar-item-badge-ctn, .fi-badge');
      const group = item.closest('.fi-sidebar-group');
      const groupLabel = group ? (group.querySelector('.fi-sidebar-group-label') || {}).textContent : '';
      const box = (link || item).getBoundingClientRect();
      out.push({
        label,
        href: link && link.href ? link.href : '',
        badge: badge ? badge.textContent.replace(/\s+/g, ' ').trim() : '',
        current: item.classList.contains('fi-active') || !!item.querySelector('[aria-current="page"]'),
        group: (groupLabel || '').replace(/\s+/g, ' ').trim(),
        visible: box.width > 0 && box.height > 0,
      });
    }
    return out;
  }).catch(() => []);
}

/** The groups of the sidebar: label, collapsible, collapsed. */
async function sidebarGroups(world) {
  return world.page.evaluate(() => [...document.querySelectorAll('.fi-sidebar .fi-sidebar-group')].map((group) => ({
    label: ((group.querySelector('.fi-sidebar-group-label') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
    collapsible: group.classList.contains('fi-collapsible'),
    collapsed: group.classList.contains('fi-collapsed'),
  })).filter((group) => group.label)).catch(() => []);
}

/** The link of a sidebar item, by its label (the badge left out). */
function sidebarLink(world, label) {
  return world.page.locator('.fi-sidebar .fi-sidebar-item').filter({
    has: world.page.locator('.fi-sidebar-item-label', { hasText: new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`) }),
  }).locator('a').first();
}

/** Open a page of the panel by its sidebar item, from wherever the browser is. */
async function openFromSidebar(world, label) {
  let link = sidebarLink(world, label);
  if (!(await link.count())) {
    await openPanelPage(world, siteUrl(world, homePath(world)));
    link = sidebarLink(world, label);
  }
  if (!(await link.count())) {
    const items = await sidebarItems(world);
    throw friendly({
      message: `The sidebar has no item "${label}" (${world.page.url()}). It has: ${listed(items.map((item) => item.label))}.`,
      hint: 'Name the page as the sidebar writes it, without its badge. Log in first: the sidebar lists what the account may open.',
    });
  }
  if (!(await link.isVisible().catch(() => false))) {
    // A collapsed group hides its items: open it first, as a person does.
    const group = link.locator('xpath=ancestor::li[contains(@class, "fi-sidebar-group")]');
    const toggle = group.locator('.fi-sidebar-group-collapse-btn, button[aria-expanded="false"]').first();
    if (await toggle.count()) await toggle.click();
    await link.waitFor({ state: 'visible', timeout: budget(world) }).catch(() => {});
  }
  if (laravel.isOnPath(world, new URL(await link.getAttribute('href'), world.page.url()).pathname)) {
    await rest(world);
    return;
  }
  await follow(world, link, `the sidebar item "${label}"`);
}

/** The page's heading (h1 of the page header). */
async function pageHeading(world) {
  return clean(await world.page.locator('.fi-header-heading, main h1').first().innerText({ timeout: budget(world) }).catch(() => ''));
}

/** The labels of the breadcrumbs of the page. */
async function breadcrumbs(world) {
  return world.page.evaluate(() => {
    const labels = [...document.querySelectorAll('.fi-breadcrumbs .fi-breadcrumbs-item-label')];
    const items = labels.length ? labels : [...document.querySelectorAll('nav[aria-label="Breadcrumb"] li')];
    return items.map((el) => el.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
  }).catch(() => []);
}

// ---------------------------------------------------------------------------
// Dialogs: modals and slide-overs
// ---------------------------------------------------------------------------

/** The open modal windows of the page, the newest (topmost) last: heading, kind. */
async function openModals(world) {
  return world.page.evaluate(() => [...document.querySelectorAll('.fi-modal.fi-modal-open')].map((modal) => {
    const win = modal.querySelector('.fi-modal-window');
    const style = win ? getComputedStyle(win) : null;
    const shown = !!win && style.display !== 'none' && style.visibility !== 'hidden' && win.getBoundingClientRect().width > 0;
    const headingId = modal.getAttribute('aria-labelledby');
    const heading = (headingId && document.getElementById(headingId)) || modal.querySelector('.fi-modal-heading');
    return {
      id: modal.id,
      heading: heading ? heading.textContent.replace(/\s+/g, ' ').trim() : '',
      slideOver: modal.classList.contains('fi-modal-slide-over'),
      shown,
      settled: shown && !win.getAnimations({ subtree: false }).some((a) => a.playState === 'running'),
    };
  }).filter((modal) => modal.shown)).catch(() => []);
}

/** The window of the newest open modal, as a locator (or null). */
async function topModal(world) {
  const modals = await openModals(world);
  if (!modals.length) return null;
  const top = modals[modals.length - 1];
  return world.page.locator(`.fi-modal.fi-modal-open[id="${top.id.replace(/"/g, '\\"')}"] .fi-modal-window`).first();
}

/** Wait for a modal (or slide-over) with a heading to be open and settled; returns its window. */
async function waitForModal(world, heading, { slideOver = null } = {}) {
  const wanted = heading ? clean(heading).toLowerCase() : null;
  let modals = [];
  try {
    modals = await eventually(world, () => openModals(world), (list) => list.some((m) => m.settled && (!wanted || m.heading.toLowerCase() === wanted) && (slideOver === null || m.slideOver === slideOver)), () => ({ message: 'no such modal' }));
  } catch {
    modals = await openModals(world);
    const kind = slideOver ? 'slide-over' : 'modal';
    throw friendly({
      message: `Expected the ${heading ? `"${heading}" ` : ''}${kind} to be open, but ${modals.length ? `the open ones are: ${listed(modals.map((m) => `${m.heading} (${m.slideOver ? 'slide-over' : 'modal'})`))}` : 'none is open'} (${world.page.url()}).`,
      hint: 'A modal opens from its action (a button of the page, of a row, or of the bulk actions); its heading is the name of the action or the one it gives.',
    });
  }
  const match = modals.filter((m) => m.settled && (!wanted || m.heading.toLowerCase() === wanted) && (slideOver === null || m.slideOver === slideOver)).pop();
  return world.page.locator(`.fi-modal.fi-modal-open[id="${match.id.replace(/"/g, '\\"')}"] .fi-modal-window`).first();
}

/** Wait until no modal is open any more (or the one with this heading is closed). */
async function waitForModalClosed(world, heading) {
  const wanted = heading ? clean(heading).toLowerCase() : null;
  await eventually(world, () => openModals(world), (list) => !list.some((m) => !wanted || m.heading.toLowerCase() === wanted), (list) => ({
    message: `Expected the ${heading ? `"${heading}" ` : ''}modal to close, but it is still open (open: ${listed(list.map((m) => m.heading))}).`,
    hint: 'A modal closes once its action ran (or with its "Close" button, "Cancel", or Escape). A refused form keeps it open with errors under its fields.',
  }));
  await rest(world);
}

/** Where the fields and buttons a step means are: the newest open modal, else the page's main area. */
async function scope(world) {
  return (await topModal(world)) || world.page.locator('main').first();
}

// ---------------------------------------------------------------------------
// Dropdowns (menus of actions, the user menu, the column manager, filters)
// ---------------------------------------------------------------------------

/**
 * Open the dropdown a trigger controls and wait for its panel to be shown and
 * its transition finished. Returns the panel. A trigger that is already open
 * is left open.
 */
async function openDropdown(world, trigger, label) {
  const panelId = await trigger.getAttribute('aria-controls').catch(() => null);
  const panel = panelId
    ? world.page.locator(`[id="${panelId.replace(/"/g, '\\"')}"]`)
    : trigger.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " fi-dropdown ")][1]').locator('.fi-dropdown-panel').first();
  if (!(await panel.isVisible().catch(() => false))) await trigger.click();
  try {
    await panel.waitFor({ state: 'visible', timeout: budget(world) });
    await eventually(world, () => panel.evaluate((el) => !el.getAnimations().some((a) => a.playState === 'running')).catch(() => true), (done) => done, () => ({ message: 'transition' }));
  } catch {
    throw friendly({ message: `The ${label} did not open.`, hint: 'It opens from its button; a disabled button (while the page waits for the server) opens nothing.' });
  }
  return panel;
}

/** Close the open dropdowns (Escape), and wait for them to be hidden. */
async function closeDropdowns(world) {
  const open = world.page.locator('.fi-dropdown-panel:visible');
  if (await open.count()) {
    await world.page.keyboard.press('Escape').catch(() => {});
    await open.first().waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/**
 * The table a step means: the list of the page (the first table that is not
 * in a widget or a relation manager), the table of a relation manager by its
 * heading, or the table of a widget by its heading.
 */
async function tableLocator(world, { relation = null, widget = null } = {}) {
  const page = world.page;
  const index = await page.evaluate(({ relation, widget }) => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const tables = [...document.querySelectorAll('.fi-ta')];
    for (let i = 0; i < tables.length; i += 1) {
      const ta = tables[i];
      const inWidget = ta.closest('.fi-wi-widget');
      const inRelation = ta.closest('.fi-resource-relation-manager, .fi-resource-relation-managers');
      const heading = norm((ta.querySelector('.fi-ta-header-heading') || {}).textContent);
      if (relation) { if (inRelation && heading === norm(relation)) return i; continue; }
      if (widget) { if (inWidget && heading === norm(widget)) return i; continue; }
      if (!inWidget && !inRelation && !ta.closest('.fi-modal')) return i;
    }
    // A page whose only table is in a relation manager (a page that manages related records).
    if (!relation && !widget) return tables.findIndex((ta) => !ta.closest('.fi-wi-widget') && !ta.closest('.fi-modal'));
    return -1;
  }, { relation, widget }).catch(() => -1);
  if (index < 0) {
    const what = relation ? `the "${relation}" relation manager` : widget ? `the "${widget}" widget` : 'the page';
    throw friendly({
      message: `No table in ${what} (${page.url()}).`,
      hint: relation || widget ? 'Name it by the heading above its table.' : 'Open the list of a resource first (Given I am on the "..." list).',
    });
  }
  return page.locator('.fi-ta').nth(index);
}

/** What a table shows: its column headings, its rows (cells, record key), its count and its empty state. */
async function readTable(table) {
  return table.evaluate((ta) => {
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const headers = [...ta.querySelectorAll('thead th')].map((th) => ({
      text: text(th.querySelector('.fi-ta-header-cell-label') || th),
      sort: th.getAttribute('aria-sort'),
      cls: th.className,
    }));
    const rows = [...ta.querySelectorAll('tr.fi-ta-row')].map((tr) => {
      const key = ((tr.getAttribute('wire:key') || '').match(/\.table\.records\.(.+)$/) || [])[1] || '';
      const cells = [...tr.children].map((td) => text(td));
      const checkbox = tr.querySelector('input.fi-ta-record-checkbox, .fi-ta-record-checkbox input, input[type="checkbox"]');
      return { key, cells, text: text(tr), selected: !!(checkbox && checkbox.checked) };
    });
    const groups = [...ta.querySelectorAll('tr.fi-ta-group-header, .fi-ta-group-header')].map((g) => text(g.querySelector('.fi-ta-group-heading, h4') || g));
    const overview = text(ta.querySelector('.fi-pagination-overview'));
    const status = [...ta.querySelectorAll('[role="status"]')].map(text).filter((t) => /\bresults?\b/i.test(t));
    const empty = ta.querySelector('.fi-ta-empty-state');
    return { headers, rows, groups, overview, status: status[0] || '', empty: empty ? text(empty.querySelector('.fi-ta-empty-state-heading') || empty) : '' };
  });
}

/** The number of records a table counts in all its pages ("Showing 1 to 10 of 1,032 results", "60 results"). */
function tableCount(read) {
  const from = (text) => {
    const m = String(text || '').match(/of\s+([\d.,\s]+)\s+results?/i) || String(text || '').match(/^\s*([\d.,\s]+)\s+results?/i);
    return m ? Number(m[1].replace(/[^\d]/g, '')) : null;
  };
  const counted = from(read.overview);
  if (counted !== null) return counted;
  if (/^\s*no results\s*$/i.test(read.status) || read.empty) return 0;
  const status = from(read.status);
  return status !== null ? status : read.rows.length;
}

/** The index of a column of a table by its heading (case and white space ignored), or -1. */
function columnIndex(read, name) {
  const wanted = clean(name).toLowerCase();
  return read.headers.findIndex((header) => clean(header.text).toLowerCase() === wanted);
}

/** The row of a table that holds a text in one of its cells (exactly, or as the whole cell's start). */
async function rowLocator(world, table, text) {
  const read = await readTable(table);
  const wanted = clean(text).toLowerCase();
  let index = read.rows.findIndex((row) => row.cells.some((cell) => cell.toLowerCase() === wanted));
  if (index < 0) index = read.rows.findIndex((row) => row.text.toLowerCase().includes(wanted));
  if (index < 0) {
    throw friendly({
      message: `No row of the table shows "${text}" (${world.page.url()}). Its rows: ${listed(read.rows.slice(0, 10).map((row) => row.cells.filter(Boolean).slice(0, 3).join(' | ')))}.`,
      hint: 'The rows are those of the page on screen: search or filter the list first, or go to the page that shows it.',
    });
  }
  return table.locator('tr.fi-ta-row').nth(index);
}

/** The toolbar of a table: its search field, its filters, its column manager, its bulk actions. */
function tableSearchField(table) {
  return table.locator('.fi-ta-header-toolbar input[type="search"], .fi-ta-search-field input').first();
}

// ---------------------------------------------------------------------------
// Forms: a field by its label, its kind, its value
// ---------------------------------------------------------------------------

// The kinds of field the panel draws, by the class of their control: the
// order matters where one holds another (a repeater holds text inputs).
const FIELD_KINDS = [
  ['repeater', '.fi-fo-repeater, .fi-fo-table-repeater'],
  ['builder', '.fi-fo-builder'],
  ['key-value', '.fi-fo-key-value'],
  ['rich-editor', '.fi-fo-rich-editor'],
  ['markdown-editor', '.fi-fo-markdown-editor'],
  ['file-upload', '.fi-fo-file-upload'],
  ['checkbox-list', '.fi-fo-checkbox-list'],
  ['toggle-buttons', '.fi-fo-toggle-buttons'],
  ['radio', '.fi-fo-radio'],
  ['tags-input', '.fi-fo-tags-input'],
  ['color-picker', '.fi-fo-color-picker'],
  ['toggle', 'button[role="switch"]'],
  ['select', '.fi-fo-select'],
  ['date-time-picker', '.fi-fo-date-time-picker'],
  ['textarea', '.fi-fo-textarea'],
  ['checkbox', 'input[type="checkbox"]'],
  ['text-input', '.fi-fo-text-input'],
];

/**
 * The field a person means by a label, in the newest open modal, else on the
 * page (or inside a given container): the wrapper of a form field whose label
 * reads the text (letter case, white space and the required mark "*" left
 * out). Returns `{ wrapper, kind, label }` with the wrapper as a locator.
 */
async function findPanelField(world, label, { within = null, timeout } = {}) {
  const page = world.page;
  const deadline = Date.now() + (timeout || budget(world));
  const kinds = FIELD_KINDS;
  for (;;) {
    const container = within || (await scope(world));
    const found = await container.evaluate((root, { label, kinds }) => {
      const norm = (s) => (s || '').replace(/\*/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
      const wanted = norm(label);
      const wrappers = [...root.querySelectorAll('[data-field-wrapper]')];
      const labelOf = (w) => {
        // The wrapper's own label: not the label of a field nested in it. A label the form hides
        // (a repeater, a builder) is still there for screen readers, as the field's labelling element.
        const own = [...w.querySelectorAll('.fi-fo-field-label-content, .fi-fo-field-label')].find((el) => el.closest('[data-field-wrapper]') === w);
        if (own) return own.textContent;
        const group = [...w.querySelectorAll('[aria-labelledby]')].find((el) => el.closest('[data-field-wrapper]') === w);
        const by = group && document.getElementById(group.getAttribute('aria-labelledby').split(/\s+/)[0]);
        return by ? by.textContent : '';
      };
      const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 || r.height > 0; };
      const all = wrappers.map((w, index) => ({ index, label: norm(labelOf(w)), shown: shown(w) }));
      const hit = all.find((w) => w.label === wanted && w.shown) || all.find((w) => w.label === wanted);
      const labels = [...new Set(all.filter((w) => w.shown && w.label).map((w) => w.label))];
      if (!hit) return { index: -1, labels };
      const w = wrappers[hit.index];
      let kind = 'text-input';
      for (const [name, selector] of kinds) {
        const el = w.querySelector(selector);
        if (el && el.closest('[data-field-wrapper]') === w) { kind = name; break; }
      }
      return { index: hit.index, kind, labels };
    }, { label, kinds }).catch(() => ({ index: -1, labels: [] }));
    if (found.index >= 0) {
      return { wrapper: container.locator('[data-field-wrapper]').nth(found.index), kind: found.kind, label };
    }
    if (Date.now() > deadline) {
      throw friendly({
        message: `No field "${label}" is on the ${within ? 'part of the page meant' : (await topModal(world)) ? 'open modal' : 'page'} (${page.url()}). The fields are: ${listed(found.labels)}.`,
        hint: 'Name the field by its label as the form writes it (the "*" of a required field left out). A field on another tab of the form shows once its tab is open.',
      });
    }
    await page.waitForTimeout(150);
  }
}

/** Words a person uses for on and off. */
function asSwitch(value) {
  const v = clean(value).toLowerCase();
  if (['on', 'yes', 'true', 'checked', 'enabled', '1'].includes(v)) return true;
  if (['off', 'no', 'false', 'unchecked', 'disabled', '0'].includes(v)) return false;
  return null;
}

/** A list written in a step: "a, b and c" or "a, b, c". */
function asList(value) {
  return String(value || '').split(/\s*,\s*|\s+and\s+/).map(clean).filter(Boolean);
}

/** Choose options of the panel's select (a button that opens a list with a search field). */
async function chooseInSelect(world, field, values) {
  const button = field.wrapper.locator('.fi-select-input-btn').first();
  for (const value of values) {
    // The dropdown holds the search field and the list of options. A list that searches the server
    // is empty (and hidden) until something is typed: the dropdown is what opens.
    const panel = field.wrapper.locator('.fi-select-input .fi-dropdown-panel').first();
    if (!(await panel.isVisible().catch(() => false))) await button.click();
    try {
      await panel.waitFor({ state: 'visible', timeout: budget(world) });
    } catch {
      throw friendly({ message: `The list of the "${field.label}" field did not open.`, hint: 'It opens from the field itself; a disabled field opens nothing.' });
    }
    const list = panel.locator('[role="listbox"]').first();
    const search = panel.locator('input[type="text"], input[role="combobox"]').first();
    const option = () => list.getByRole('option', { name: value, exact: true });
    if (!(await option().count()) && await search.count()) {
      // The options of a select that searches the server come with its answer.
      await act(world, () => search.fill(value));
    }
    try {
      await option().first().waitFor({ state: 'visible', timeout: budget(world) });
    } catch {
      const offered = (await list.getByRole('option').allInnerTexts().catch(() => [])).map(clean);
      await closeDropdowns(world);
      throw friendly({
        message: `The "${field.label}" field offers no "${value}". It offers: ${listed(offered.slice(0, 15))}.`,
        hint: 'Name the option as the list writes it. A list that searches the server shows the options that match what was typed.',
      });
    }
    await act(world, () => option().first().click());
  }
  await closeDropdowns(world);
}

/** The chosen options of a select that takes several (its badges). */
async function selectBadges(field) {
  return field.wrapper.locator('.fi-select-input-value-badges-ctn .fi-badge .fi-badge-label').allInnerTexts().then((list) => list.map(clean));
}

/**
 * Set a select of the panel: a native list, a single choice (with its search),
 * or several choices (badges): the chosen ones become exactly those named,
 * the others are removed with their buttons. An empty value clears it.
 */
async function setSelect(world, field, value) {
  const native = field.wrapper.locator('select').first();
  if (await native.count()) {
    await act(world, () => native.selectOption({ label: clean(value) }));
    return;
  }
  const multiple = (await field.wrapper.locator('.fi-select-input-ctn-multiple').count()) > 0;
  if (!multiple) {
    if (!clean(value)) {
      const clear = field.wrapper.locator('button[aria-label="Clear selection"], .fi-select-input-value-remove-btn').first();
      if (await clear.count()) await act(world, () => clear.click());
      return;
    }
    await chooseInSelect(world, field, [clean(value)]);
    return;
  }
  const wanted = asList(value);
  const lower = wanted.map((v) => v.toLowerCase());
  for (const chosen of await selectBadges(field)) {
    if (lower.includes(chosen.toLowerCase())) continue;
    await act(world, () => field.wrapper.locator(`.fi-select-input-value-badges-ctn button[aria-label="Remove ${chosen.replace(/"/g, '\\"')}"]`).first().click());
  }
  const present = (await selectBadges(field)).map((v) => v.toLowerCase());
  const missing = wanted.filter((v) => !present.includes(v.toLowerCase()));
  if (missing.length) await chooseInSelect(world, field, missing);
}

/** Set the value of a field, by its kind, the way a person does. */
async function setPanelField(world, label, value, options = {}) {
  const page = world.page;
  const field = await findPanelField(world, label, options);
  const w = field.wrapper;
  switch (field.kind) {
    case 'toggle': {
      const on = asSwitch(value);
      if (on === null) throw friendly({ message: `"${value}" is not a state of the switch "${label}".`, hint: 'Set a switch to "on" or "off".' });
      const sw = w.locator('button[role="switch"]').first();
      if (((await sw.getAttribute('aria-checked')) === 'true') !== on) await act(world, () => sw.click());
      return;
    }
    case 'checkbox': {
      const on = asSwitch(value);
      if (on === null) throw friendly({ message: `"${value}" is not a state of the checkbox "${label}".`, hint: 'Set a checkbox to "checked" or "unchecked" (or on, off).' });
      const box = w.locator('input[type="checkbox"]').first();
      if ((await box.isChecked()) !== on) await act(world, () => box.click());
      return;
    }
    case 'checkbox-list': {
      const wanted = asList(value).map((v) => v.toLowerCase());
      const boxes = w.locator('label.fi-fo-checkbox-list-option');
      const count = await boxes.count();
      const labels = [];
      for (let i = 0; i < count; i += 1) {
        const option = boxes.nth(i);
        const text = clean(await option.innerText()).toLowerCase();
        labels.push(text);
        const box = option.locator('input[type="checkbox"]');
        const on = wanted.includes(text);
        if ((await box.isChecked()) !== on) await act(world, () => box.click());
      }
      const missing = wanted.filter((v) => !labels.includes(v));
      if (missing.length) throw friendly({ message: `The "${label}" field has no option ${listed(missing)}. It has: ${listed(labels)}.`, hint: 'Name the options as the list writes them, separated by commas.' });
      return;
    }
    case 'radio':
    case 'toggle-buttons': {
      const option = w.locator('label').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(clean(value))}\\s*$`, 'i') }).first();
      if (!(await option.count())) {
        const offered = (await w.locator('label').allInnerTexts()).map(clean).filter(Boolean);
        throw friendly({ message: `The "${label}" field has no option "${value}". It has: ${listed(offered)}.`, hint: 'Name the option as the field writes it.' });
      }
      await act(world, () => option.click());
      return;
    }
    case 'select':
      await setSelect(world, field, value);
      return;
    case 'rich-editor': {
      const editor = w.locator('[contenteditable="true"]').first();
      await editor.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.press('Delete');
      await act(world, async () => { await page.keyboard.insertText(String(value)); await editor.blur().catch(() => {}); });
      return;
    }
    case 'markdown-editor': {
      // The Markdown editor is a code editor (CodeMirror) drawn over a hidden textarea: it is typed
      // into as a person types, its old text selected and replaced.
      const surface = w.locator('.CodeMirror').first();
      if (await surface.count()) {
        await surface.click();
        await page.keyboard.press('ControlOrMeta+A');
        await page.keyboard.press('Delete');
        await act(world, async () => {
          await page.keyboard.insertText(String(value));
          await page.evaluate(() => document.activeElement && document.activeElement.blur());
        });
      } else {
        const area = w.locator('textarea').filter({ visible: true }).first();
        await act(world, async () => { await area.fill(String(value)); await area.blur().catch(() => {}); });
      }
      return;
    }
    case 'tags-input': {
      // Exactly the tags given: the others are deleted with the button of their badge, the missing ones typed.
      const input = w.locator('input:not([type="hidden"])').first();
      const wanted = asList(value);
      const present = (await w.locator('.fi-badge .fi-badge-label').allInnerTexts().catch(() => [])).map(clean).filter(Boolean);
      for (const tag of present.filter((t) => !wanted.includes(t))) {
        const badge = w.locator('.fi-badge').filter({ has: page.locator('.fi-badge-label', { hasText: new RegExp(`^\\s*${escapeRegExp(tag)}\\s*$`) }) }).first();
        await act(world, () => badge.locator('.fi-badge-delete-btn, button').first().click());
      }
      for (const tag of wanted.filter((t) => !present.includes(t))) {
        await input.fill(tag);
        await act(world, () => input.press('Enter'));
      }
      return;
    }
    case 'file-upload':
    case 'repeater':
    case 'builder':
    case 'key-value':
      throw friendly({
        message: `The "${label}" field is a ${field.kind.replace('-', ' ')}: it is not set with one value.`,
        hint: field.kind === 'file-upload' ? 'Upload a file to it: When I upload "photo.jpg" to the "..." field.' : 'Use the steps for its items (add an item, set a field in an item) or its rows.',
      });
    default: {
      // A text input, a textarea, a date or a colour: the control itself.
      const input = w.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea').first();
      if (!(await input.isEditable().catch(() => false))) {
        throw friendly({ message: `The "${label}" field cannot be changed: it is disabled or read only.`, hint: 'A field the form shows for reading keeps its value.' });
      }
      // A date and a time are written as a person writes them ("2026-12-01 10:30"); the browser's own
      // date and time input takes them with a "T" between the two.
      let typed = String(value);
      if ((await input.getAttribute('type').catch(() => null)) === 'datetime-local') typed = typed.trim().replace(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/, '$1T$2');
      await act(world, async () => { await input.fill(typed); await input.blur().catch(() => {}); });
    }
  }
}

/** What a field holds, as a person reads it: text, the chosen option(s), on or off, the list of checked items. */
async function readPanelField(world, label, options = {}) {
  const field = await findPanelField(world, label, options);
  const value = await field.wrapper.evaluate((w, kind) => {
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const own = (sel) => [...w.querySelectorAll(sel)].filter((el) => el.closest('[data-field-wrapper]') === w);
    switch (kind) {
      case 'toggle': { const sw = own('button[role="switch"]')[0]; return sw && sw.getAttribute('aria-checked') === 'true' ? 'on' : 'off'; }
      case 'checkbox': { const box = own('input[type="checkbox"]')[0]; return box && box.checked ? 'checked' : 'unchecked'; }
      case 'checkbox-list': return own('label.fi-fo-checkbox-list-option').filter((l) => l.querySelector('input').checked).map(text).join(', ');
      case 'radio':
      case 'toggle-buttons': { const r = own('input[type="radio"]').find((i) => i.checked); const l = r && w.querySelector(`label[for="${CSS.escape(r.id)}"]`); return l ? text(l) : (r ? text(r.closest('label')) : ''); }
      case 'select': {
        const native = own('select')[0];
        if (native) return [...native.selectedOptions].map((o) => o.textContent.trim()).join(', ');
        const badges = own('.fi-select-input-value-badges-ctn .fi-badge');
        if (badges.length) return badges.map(text).join(', ');
        const btn = own('.fi-select-input-btn')[0];
        const shown = text(btn && btn.querySelector('.fi-select-input-value-label')) || text(btn);
        return /^select an option$/i.test(shown) ? '' : shown;
      }
      case 'rich-editor': return text(own('[contenteditable]')[0]);
      case 'markdown-editor': {
        // The text of the code editor the field draws (CodeMirror), else of its textarea.
        const editor = w.querySelector('.CodeMirror');
        if (editor && editor.CodeMirror) return editor.CodeMirror.getValue();
        const area = own('textarea')[0]; return area ? area.value : '';
      }
      case 'tags-input': return own('.fi-badge').map(text).join(', ');
      case 'file-upload': return own('.filepond--item').map((i) => text(i.querySelector('.filepond--file-info-main'))).join(', ');
      default: {
        const input = own('input:not([type="hidden"]), textarea')[0];
        if (!input) return '';
        // A date and a time read as a person writes them: "2026-12-01 10:30".
        return input.type === 'datetime-local' ? input.value.replace('T', ' ') : input.value;
      }
    }
  }, field.kind);
  return { value: clean(value), kind: field.kind };
}

module.exports = {
  laravel,
  recordNavigation,
  rest,
  act,
  follow,
  openPanelPage,
  sidebarItems,
  sidebarGroups,
  sidebarLink,
  openFromSidebar,
  pageHeading,
  breadcrumbs,
  openModals,
  topModal,
  waitForModal,
  waitForModalClosed,
  scope,
  openDropdown,
  closeDropdowns,
  tableLocator,
  readTable,
  tableCount,
  columnIndex,
  rowLocator,
  tableSearchField,
  FIELD_KINDS,
  findPanelField,
  asSwitch,
  asList,
  chooseInSelect,
  selectBadges,
  setSelect,
  setPanelField,
  readPanelField,
};

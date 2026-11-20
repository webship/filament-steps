'use strict';

// What a panel shows to be read: the widgets of a dashboard (or of the top of
// a list) - the stats with their values, the charts, the tables - and the
// entries of a view page (an infolist): a label and the value under it.
//
// A widget loads with its page, some after it (a lazy widget), and a chart
// draws itself once its script ran: the steps wait for the value, for the
// drawing, for the rows.

const { Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const { laravel, tableLocator, readTable, tableCount } = require('./filament-helpers');

const { budget, clean, listed, eventually } = laravel;

/** The widgets of the page: kind, heading, stats (label, value, description), canvas drawn. */
async function widgets(world) {
  return world.page.evaluate(() => {
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const drawn = (canvas) => {
      if (!canvas || !canvas.width || !canvas.height) return false;
      try {
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 3; i < data.length; i += 16) if (data[i] !== 0) return true;
      } catch (e) { return false; }
      return false;
    };
    return [...document.querySelectorAll('.fi-wi-widget')].map((w) => ({
      kind: w.classList.contains('fi-wi-stats-overview') ? 'stats' : w.classList.contains('fi-wi-chart') ? 'chart' : w.querySelector('.fi-ta') ? 'table' : 'widget',
      heading: text(w.querySelector('.fi-section-header-heading, .fi-wi-chart-heading, .fi-ta-header-heading, .fi-wi-stats-overview-header-heading')),
      stats: [...w.querySelectorAll('.fi-wi-stats-overview-stat')].map((s) => ({
        label: text(s.querySelector('.fi-wi-stats-overview-stat-label')),
        value: text(s.querySelector('.fi-wi-stats-overview-stat-value')),
        description: text(s.querySelector('.fi-wi-stats-overview-stat-description')),
      })),
      drawn: [...w.querySelectorAll('canvas')].some(drawn),
      text: text(w).slice(0, 200),
    }));
  }).catch(() => []);
}

/** Every stat of the page's widgets. */
function allStats(list) {
  return list.flatMap((w) => w.stats);
}

/**
 * Assert that a stat of the page's widgets shows a value, or reads one
 * exactly ("21.4%", "$1,009.90"), or that its description reads a text.
 *
 * Example #1: Then the stat "Revenue / Customer" should show a value
 * Example #2: Then the stat "Avg Items / Order" should read "3.1"
 * Example #3: And the stat "Cancellation Rate" should show a value
 * Example #4: Then the stat "Total products" should read "63"
 * Example #5: And the stat "Repeat Customer Rate" should show a value
 */
Then(/^the stat "([^"]*)" should (?:show a value|read "([^"]*)")$/, async function (label, value) {
  const wanted = clean(label).toLowerCase();
  await eventually(this, () => widgets(this), (list) => allStats(list).some((s) => s.label.toLowerCase() === wanted && (value == null ? /\S/.test(s.value) : s.value === clean(value))), (list) => {
    const stat = allStats(list).find((s) => s.label.toLowerCase() === wanted);
    return {
      message: stat ? `The stat "${label}" reads "${stat.value}"${value == null ? ' (no value)' : `, not "${value}"`}.` : `The page has no stat "${label}". Its stats: ${listed(allStats(list).map((s) => s.label))}.`,
      hint: 'A stat is a label with its value in a widget of stats at the top of a dashboard or a list.',
    };
  });
});

/**
 * Assert that the page shows a widget by its heading (a chart, a table), or
 * does not.
 *
 * Example #1: Then the page should show the widget "Customer Growth"
 * Example #2: Then the page should show the widget "Flagged Orders"
 * Example #3: And the page should not show the widget "Customer Growth"
 * Example #4: Then the page should show the widget "Orders Year-over-Year"
 * Example #5: And the page should show the widget "Top Products by Revenue"
 */
Then(/^the page should( not)* show the widget "([^"]*)"$/, async function (notCase, heading) {
  const wanted = clean(heading).toLowerCase();
  await eventually(this, () => widgets(this), (list) => list.some((w) => w.heading.toLowerCase() === wanted) !== !!notCase, (list) => ({
    message: `Expected the page ${notCase ? 'not ' : ''}to show the widget "${heading}". Its widgets: ${listed(list.map((w) => w.heading || `(${w.kind})`))}.`,
    hint: 'A widget is named by the heading at its top; some widgets show only to some accounts or on some dashboards.',
  }));
});

/**
 * Assert that a chart widget (by its heading) has drawn its chart: its
 * canvas holds a drawing.
 *
 * Example #1: Then the "Customer Growth" chart should be drawn
 * Example #2: Then the "Orders Year-over-Year" chart should be drawn
 * Example #3: And the "Top Products by Revenue" chart should be drawn
 * Example #4: Then the "Customer Segments" chart should be drawn
 * Example #5: And the "Order Value Distribution" chart should be drawn
 */
Then(/^the "([^"]*)" chart should be drawn$/, async function (heading) {
  const wanted = clean(heading).toLowerCase();
  await eventually(this, () => widgets(this), (list) => list.some((w) => w.kind === 'chart' && w.heading.toLowerCase() === wanted && w.drawn), (list) => {
    const chart = list.find((w) => w.heading.toLowerCase() === wanted);
    return {
      message: chart ? `The "${heading}" ${chart.kind} has not drawn anything (${chart.text || 'empty'}).` : `The page has no chart "${heading}". Its charts: ${listed(list.filter((w) => w.kind === 'chart').map((w) => w.heading))}.`,
      hint: 'A chart draws itself on its canvas once its script ran and its data came.',
    };
  });
});

/**
 * Assert the number of rows a table widget (by its heading) shows, or that
 * it lists a record.
 *
 * Example #1: Then the "Flagged Orders" widget should list 5 records
 * Example #2: Then the "Flagged Orders" widget should list "WS-TEST-0001"
 * Example #3: And the "Latest Orders" widget should list 10 records
 * Example #4: Then the "Latest Orders" widget should list "Wendy Webship"
 * Example #5: And the "Flagged Orders" widget should list 0 records
 */
Then(/^the "([^"]*)" widget should list (?:(\d+) records?|"([^"]*)")$/, async function (heading, count, text) {
  const table = await tableLocator(this, { widget: heading });
  await eventually(this, () => readTable(table), (read) => (count != null ? read.rows.length === Number(count) : read.rows.some((row) => row.text.toLowerCase().includes(clean(text).toLowerCase()))), (read) => ({
    message: count != null ? `The "${heading}" widget lists ${read.rows.length} records, not ${count} (it counts ${tableCount(read)}).` : `The "${heading}" widget does not list "${text}". Its rows: ${listed(read.rows.slice(0, 8).map((row) => row.cells.filter(Boolean).slice(0, 3).join(' | ')))}.`,
    hint: 'A table widget lists the records its query finds, a page at a time.',
  }));
});

/** The entries of a view page (an infolist): label and value. */
async function entries(world) {
  return world.page.evaluate(() => {
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    return [...document.querySelectorAll('main .fi-in-entry, main .fi-in-entry-wrp')].map((entry) => ({
      label: text(entry.querySelector('.fi-in-entry-label, .fi-in-entry-wrp-label, dt')).replace(/\*$/, '').trim(),
      value: text(entry.querySelector('.fi-in-entry-content, .fi-in-entry-wrp-content, dd')),
    })).filter((e) => e.label);
  }).catch(() => []);
}

/**
 * Assert an entry of the view page (an infolist): the value under a label, as
 * the page writes it (a date, a badge, money, a text).
 *
 * Example #1: Then the "Title" entry should read "Webship test post"
 * Example #2: Then the "Status" entry should read "Published"
 * Example #3: And the "Customer" entry should read "Wendy Webship"
 * Example #4: Then the "Total" entry should read "$80.00"
 * Example #5: And the "Author" entry should read "Ada Administrator"
 */
Then(/^the "([^"]*)" entry should read "([^"]*)"$/, async function (label, value) {
  const wanted = clean(label).toLowerCase();
  await eventually(this, () => entries(this), (list) => list.some((e) => e.label.toLowerCase() === wanted && (e.value === clean(value) || e.value.toLowerCase().includes(clean(value).toLowerCase()))), (list) => {
    const entry = list.find((e) => e.label.toLowerCase() === wanted);
    return {
      message: entry ? `The "${label}" entry reads "${entry.value}", not "${value}".` : `The page has no entry "${label}". Its entries: ${listed(list.map((e) => e.label))}.`,
      hint: 'An entry of a view page is a label with its value; open the record\'s view page first.',
    };
  });
});

module.exports = { widgets, entries };

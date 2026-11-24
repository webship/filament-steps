<p align="center"><img src="https://raw.githubusercontent.com/webship/filament-steps/2.0.x/assets/logo.svg" alt="Filament logo" width="160"></p>

# filament-steps

[![Test](https://github.com/webship/filament-steps/actions/workflows/test.yml/badge.svg)](https://github.com/webship/filament-steps/actions/workflows/test.yml)

Cucumber step definitions for testing admin panels built with Filament on a
Laravel app, with [webship-js](https://webship.co/docs/webship-js/2.0.x), a BDD
browser automation harness built on Playwright and Cucumber-js.

`@webship-js/filament-steps` is an extension of
[`@webship-js/laravel-steps`](https://github.com/webship/laravel-steps): it
depends on it and loads it, so a project installs this one pack and has both.
The Laravel pack gives the login by a handle of the users registry on the
panel's login page, logging out, who is signed in, the user menu, the toasts,
the errors under a field, the browser's refusal of an empty required field, the
password reset through the mail, and the framework's pages (403, 404, the health
route, no debug page on a live app). This pack adds the panel:

- **the sidebar and the pages**: an item of the sidebar opened, listed, marked
  as the current page or carrying a badge, a group collapsed and expanded, the
  heading of a page, its breadcrumbs, a list opened by its name, a record opened
  from its list, a new record, the pages of a record's sub-navigation;
- **the tables of the resources**: a record a list shows, the count, the rows
  of the page, a cell of a column, the first row, the empty list, the search,
  sorting both ways, the filters (set, read, their indicators, removed, all
  cleared), the tabs above a list, the columns shown and hidden, the pages and
  the records per page, the selection, the bulk actions, grouping, reordering
  by dragging, and the table of a relation manager named by its heading;
- **actions, modals and slide-overs**: an action of a page, of a list or of a
  row (in its menu or not), its modal or slide-over, its question, confirming
  or cancelling it, a button of its footer, closing it;
- **the forms**: a field set by its label whatever its kind (text, number,
  date and time, a list that searches, a list of several choices, a switch, a
  checkbox, a list of checkboxes, radio and toggle buttons, a rich text, a
  Markdown text, tags), several at once, its value, read only or not, shown or
  hidden as another field changes; file uploads held or refused; repeaters and
  builder blocks (a row added, set, moved, removed); key-value fields; tabs;
  wizard steps; saving, creating, deleting a record, and the leftover of a
  stopped run removed;
- **what a page shows to be read**: the stats, charts and table widgets of a
  dashboard, and the entries of a view page;
- **around the pages**: the global search (its results, its groups, a result
  opened), the notifications drawer (listed, marked as read, cleared, the
  unread count), the theme of the user menu, and the tenants of a panel (the
  current one, the menu, a switch).

No step phrase names the platform: a scenario reads `When I set "Status" to
"Processing"`, `Then the list should count 3 products` and `When I run the "Ship"
action on the "WS-TEST-0001" row`.

CI builds the panel's official demo app with [DDEV](https://ddev.com) on the
runner and runs the whole suite against it twice on every push and pull
request, then the assertions that must fail; a second lane builds a new app
with the panel installed the documented way and one generated resource, and
runs the features of a new panel against it twice; see
[`.github/workflows/test.yml`](.github/workflows/test.yml).

## From nothing to a green run

What the machine needs: Docker, [DDEV](https://ddev.com), git, python3, and Node.js 24 or later with npm. PHP, Composer, the database and the mail catcher run in DDEV's containers.

**1. The app.** The pack's own build script (the one CI runs) makes the panel's official demo app ([filamentphp/demo](https://github.com/filamentphp/demo), MIT) in a DDEV project of type `laravel`: the head of its `5.x` branch with the newest release of the panel, its own seed (a shop, a blog, an HR suite, an admin panel at the root of the app and a second panel with teams at `/app`), the two accounts of [Test users](#test-users) and the test records the features read. It takes about five minutes.

```bash
git clone https://github.com/webship/filament-steps.git
SITE_DIR="$PWD/filament-demo" filament-steps/.github/scripts/build-ddev-site.sh
```

The app answers at `https://filamentsteps.ddev.site` and its mailbox at `https://filamentsteps.ddev.site:8026`. Its accounts are `administrator@example.com` and `unverified@example.com`, each with the password `dD.123123ddd` (step 3 names them).

In the [Webship Workspace](https://github.com/webship/workspace), its Filament plugin builds the same demo app instead, on top of its Laravel plugin, in a sites folder of the workspace (`dev/` here, the one `--with-needs` adds to a new workspace; `test/`, `sandboxes/` and `demos/` work the same):

```bash
bash core/scripts/plugins.sh --require filament --with-needs
bash core/scripts/plugins.sh --activate filament --with-needs
bash core/scripts/plugins.sh --install filament
bash dev/cmd-filament-project.sh fmdemo --install --add-users --demo
```

That app answers at `https://fmdemo.ddev.site` and its mailbox at `https://fmdemo.ddev.site:8026`. Its accounts are the plugin's: `administrator@example.com` (its address verified) and `unverified@example.com`, each named as its handle, with the workspace's shared password `dD.123123ddd` (step 3 names them). It has the demo's own seed, not the test records the features of [`tests/features/`](tests/features/) read. The build script writes them on it, from the workspace folder, with a clone of this repository; it also gives the two accounts the names `cucumber.js` gives them (`Ada Administrator`, `Uma Unverified`):

```bash
git clone https://github.com/webship/filament-steps.git
ACCOUNTS_ONLY=1 SITE_DIR="$PWD/dev/fmdemo" filament-steps/.github/scripts/build-ddev-site.sh
```

**2. A test project.**

```bash
mkdir filament-tests && cd filament-tests
npm init -y
npm install --save-dev webship-js @webship-js/filament-steps
npx init-webship-js
```

`npx init-webship-js` writes `cucumber.js`, `playwright.config.ts`, the `tests/` folders with a first feature and the `npm test` scripts, and installs Chromium. npm usually runs it already when it installs webship-js; a second run changes nothing. npm installs `@webship-js/laravel-steps` along with the pack.

**3. `cucumber.js`.** Replace the file with the wiring of the pack: the step files of webship-js and of the pack (which loads the Laravel pack's itself), the tags that keep the assertions that must fail out of a normal run, the address of the app, the panel's home and login page, the mailbox, and the accounts (the JSON of [Test users](#test-users)).

```javascript
module.exports = {
  default: {
    requireModule: ['tsx/cjs'],
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js',
      'node_modules/@webship-js/filament-steps/tests/step-definitions/**/*.js',
      'tests/step-definitions/**/*.js',
    ],
    paths: ['tests/features/**/*.feature'],
    // Work in progress and the assertions that must fail stay out of a normal run.
    tags: 'not @wip and not @must-fail',
    format: ['@cucumber/pretty-formatter', 'json:tests/reports/cucumber_report.json'],
    worldParameters: {
      launchUrl: process.env.LAUNCH_URL || 'https://filamentsteps.ddev.site',
      // The panel's home and its login page: the demo's admin panel is at the root of the app (a new panel: '/admin', '/admin/login').
      homePath: '/',
      loginPath: '/login',
      mailUrl: (process.env.LAUNCH_URL || 'https://filamentsteps.ddev.site') + ':8026',
      // An account keeps its session for the rest of the run: the panel allows five login attempts a minute.
      reuseSessions: true,
      // The waits webship-js adds around each page, scenario and step (milliseconds).
      minWaitTime: { page: 3000, before_scenario: 0, after_scenario: 0, before_step: 0, after_step: 0 },
      // The panel logs no error of its own in the browser console. A scenario that opens an error page (403, 404)
      // carries @js-off: the browser logs the refused request.
      javascript: { mode: 'warn', levels: ['error'] },
      users: {
        administrator: { email: 'administrator@example.com', password: 'dD.123123ddd', name: 'Ada Administrator' },
        unverified: { email: 'unverified@example.com', password: 'dD.123123ddd', name: 'Uma Unverified' },
      },
    },
  },
};
```

On an app from the Webship Workspace (step 1), the accounts are named as their handles until the build script wrote the test records on it: `administrator: { email: 'administrator@example.com', password: 'dD.123123ddd', name: 'administrator' }` and `unverified: { email: 'unverified@example.com', password: 'dD.123123ddd', name: 'unverified' }`. Its address goes in `LAUNCH_URL` (step 5), and `mailUrl` follows it.

**4. A first feature**, `tests/features/first-run.feature`. It reads only what the demo app has on either way of step 1:

```gherkin
Feature: First run
  Scenario: The administrator opens the products from the sidebar
    Given I am a logged in user with the "administrator" user
    When I open "Products" from the sidebar
    Then I should be on the "Products" list
    And the breadcrumbs should read "Products › List"
    And the list should have 10 rows

  Scenario: The panel refuses an account whose address is not verified
    Given I am an anonymous user
    When I go to "/login"
    And I fill in "Email address" with the email of "unverified"
    And I fill in "Password" with the password of "unverified"
    And I press "Sign in"
    Then the "Email address" field should have the error "These credentials do not match our records."
```

**5. Run it.** Set `LAUNCH_URL` to the address of the app: `https://filamentsteps.ddev.site` for the build script's app, `https://fmdemo.ddev.site` for the Workspace's.

```bash
LAUNCH_URL=https://filamentsteps.ddev.site npm test
```

A green first run prints every step, then the summary (the starter feature of `npx init-webship-js` and the two scenarios above, passed) and the HTML report it wrote:

```
3 scenarios (3 passed)
13 steps (13 passed)
0m09.870s (executing steps: 0m09.755s)
[webship-js] HTML report → …/filament-tests/tests/reports/cucumber_report.html
```

From there, copy the features of [`tests/features/`](tests/features/) (they also ship in the package, under `node_modules/@webship-js/filament-steps/tests/features/`): together they use every step of the pack, on the demo app with the test records of step 1. The features of a new panel ([`tests/panel/`](tests/panel/), for a panel at `/admin`) run on the build script's other app (`APP=panel`, see [A test app](#a-test-app)).

### What the suite tests

The features of this repository run every step of the pack against the demo app, twice in a row in CI on every change, then the assertions that must fail:

- **the session** (the Laravel pack's steps on the panel's login page): a visitor sent to the login form, a login through the form, a login refused for an unknown address and for an account whose address is not verified, a session of the other panel that gets the 403 page, an empty login form the browser refuses, a session taken over and logging out; the password reset of the app panel through the mail, from the request to a login with the password set again;
- **the sidebar and the pages**: the items and the groups of the sidebar, its badges, the current page, a group collapsed and expanded, the headings and breadcrumbs of a list, an edit page and a create page;
- **the dashboard**: the stats of the shop's dashboard, two of its charts drawn, its table widget and the records it lists, and its filters changing what the stats count;
- **the tables**: the products searched, counted, sorted both ways by price and by name, a cell of a column, the first row, an empty search; a column hidden and shown; the pages and the records per page; the filter of the deleted orders with its indicator, removed with it and with all filters at once; the tabs above the orders with their counts; the orders grouped by their date; the brands reordered by dragging, and back;
- **selection and actions**: rows selected one by one and by page, the bulk actions offered, a bulk delete the demo refuses with its warning, a confirmation cancelled, an order processed and shipped through a slide-over and a button of its footer, a modal with a form kept back by the browser on an empty required field and then sent, a modal closed;
- **the forms**: a task with every kind of field its form has (text, a number, a date, two lists, toggle buttons, radio buttons, a rich text, a list of checkboxes) created, changed and deleted; a required field the browser refuses; a value the server refuses under its field; the tabs of the employee form and the fields it shows as the employment type changes, a switch, a key-value field, an employee deleted, found among the deleted records, offered a restore and deleted for good; the order wizard refused on its first step, its repeater of items, the order deleted for good; a project's builder blocks added, moved and removed, a block's tags; an image upload refused and one held, then removed;
- **relations and view pages**: an address added to a customer in the modal of its relation manager, then deleted; the entries of a post's view page and the pages of its sub-navigation;
- **around the pages**: the global search (its results, its groups, a result opened, a search that finds nothing), the notification of a new order in the drawer with the unread count, all marked as read and cleared, the theme switched from the user menu and back, the tenants of the app panel (the current one, the menu, a switch and back);
- **the framework's pages**: the 404 page with no debug information, the health route.

Every scenario that makes a record deletes it again (for good, where the demo keeps deleted records), and every filter, sorting, choice of columns or theme a scenario changes is put back: the suite leaves the app as it found it.

The features of a new panel ([`tests/panel/`](tests/panel/)) run on an app with the panel installed the documented way and one generated resource (notes), twice in a row in CI: the login form at `/admin/login`, an account it refuses, logging out, the password reset through the mail; the generated list (a search, the count, a cell, sorting by a date, a hidden column shown and hidden again), a note created with its Markdown body, its switch and its date and time, changed and deleted, and the bulk delete asked and cancelled.

Not tested: registration and new teams of the app panel, its email verification beyond the notice, a profile page and multi-factor authentication (the demo has none), impersonation, exports and imports (they run as queued jobs), the panel's own plugins, a theme of the panel's marketplace, and a panel in another language than English.

## Requirements

- Node.js 24 or later
- A webship-js 2.0 test project (webship-js 2.0.16 or later)
- An app with a panel (the panel's release line 5; the panel at the root of the app or at a path of its own), and accounts on it for the suite

## Install

```bash
npm install --save-dev @webship-js/filament-steps
```

npm installs `@webship-js/laravel-steps` with it. List only this pack's step files in `cucumber.js`: it loads the Laravel pack's itself. A project that also lists the Laravel pack's glob is fine while npm installed one copy of it (Node loads a file once); a second, nested copy (the project pins another release line of the Laravel pack) would register every Laravel step twice, so drop that glob then.

## Quick start

1. Add the pack's step files to the `require` list of your webship-js `cucumber.js`:

   ```javascript
   require: [
     'node_modules/webship-js/tests/step-definitions/**/*.js',
     'node_modules/@webship-js/filament-steps/tests/step-definitions/**/*.js',
     'tests/step-definitions/**/*.js',
   ],
   ```

2. Point `launchUrl` at the app, `homePath` and `loginPath` at the panel, `mailUrl` at the mailbox, and name the accounts the suite logs in with (see [Accounts](#accounts)):

   ```javascript
   worldParameters: {
     launchUrl: process.env.LAUNCH_URL || 'https://your-app.ddev.site',
     homePath: '/admin',                            // the panel's dashboard
     loginPath: '/admin/login',                     // the panel's login page
     mailUrl: 'https://your-app.ddev.site:8026',    // the app's mailbox (Mailpit), for the password reset
     users: {
       administrator: { email: 'administrator@example.com', password: process.env.ADMINISTRATOR_PASSWORD, name: 'Ada Administrator' },
     },
   },
   ```

3. Copy a feature file from [`tests/features/`](tests/features/) into your project and replace the resources, fields and texts with those of your panel.

```gherkin
Feature: A record made in a form, and deleted again

  Scenario: A task created with its fields, then deleted
    Given there is no "Webship form task" in the "Tasks" list
    And I am on the "Tasks" list
    When I create a new record from the list
    And I set these fields:
      | Title    | Webship form task    |
      | Project  | Webship Test Project |
      | Priority | High                 |
      | Labels   | Bug, Feature         |
    And I create the record
    Then I should see the success notification "Created"
    When I delete the record
    Then I should be on the "Tasks" list
    When I search the list for "Webship form task"
    Then the list should be empty
```

## What is included

| File | Steps | Covers |
| --- | --- | --- |
| `filament-panel.steps.js` | 14 | A list opened by its name, an item of the sidebar (opened, listed, its badge, the current page), a group of the sidebar (collapsed, expanded), the heading of a page, its breadcrumbs, the list on screen, a record opened from its list, a new record, the pages of a record's sub-navigation. |
| `filament-table.steps.js` | 31 | A list or the table of a relation manager: its records, the count, the rows, a cell, the first row, the empty list, the search, sorting, the filters and their indicators, the tabs, the columns, the pages and the records per page, the selection and the bulk actions, grouping, reordering. |
| `filament-actions.steps.js` | 10 | An action of a page, of a list or of a row (run, offered), a modal or slide-over (open, closed, its question), confirming, cancelling or closing it, a button of its footer. |
| `filament-form.steps.js` | 27 | A field set and read by its label whatever its kind, several fields at once, read only, shown or hidden; file uploads; repeaters and builder blocks; key-value fields; tabs; wizard steps; saving, creating and deleting a record; the leftover of a stopped run removed. |
| `filament-widgets.steps.js` | 5 | The stats, the charts and the table widgets of a dashboard, and the entries of a view page. |
| `filament-frame.steps.js` | 14 | The global search, the notifications drawer, the theme of the user menu, the tenants of a panel. |
| `filament-defaults.js` | | Loads the Laravel pack's steps, adds the panel's user menu, its "Sign out" and its toasts to the Laravel pack's `FRAME`, and names the panel's open modal for webship-js's modal steps. It registers no step. |
| `filament-helpers.js` | | Shared plumbing for the files above and for your own steps: the panel's own signals (the requests of a page, the element that is loading, the transitions of modals and dropdowns, the single-page navigation), the sidebar, the open modals, the tables and their rows, the fields of a form and how each kind is set and read. It registers no step. |

Text, links, buttons, dialogs, the status code of a page and the accessibility audit are webship-js's own steps (`I should see "..."`, `I press "..."`, `I click "..." in the modal`, `the response status code should be 200`, `the page should have no critical accessibility violations`); the login, logging out, the user menu, the toasts, the errors under a field, the mail and the error pages are the Laravel pack's (`I am a logged in user with the "administrator" user`, `I should see the success notification "Saved"`, `the "Title" field should block submission as required`, `I should see the 403 error page`). This pack adds only what the panel decides.

## How the steps find things and wait

- **By what a person reads.** A list is found by its name in the sidebar, a field by its label (the required mark left out), a column by its heading, a row by a text it shows, an action by its label or the name of its icon button, a modal by its heading, a widget by its heading, a filter by its label and its indicator by its text. The panel's own classes are the fallback, the same on every panel: the sidebar (`.fi-sidebar-item`, `.fi-sidebar-group`), the tables (`.fi-ta-row`, `.fi-ta-header-cell` with its `aria-sort`, the filter indicators), the fields (`.fi-fo-field`, the select's `.fi-select-input` and its dropdown panel), the modals (`.fi-modal.fi-modal-open`), the notifications (`.fi-no-notification`), the widgets (`.fi-wi-stats-overview-stat`, `.fi-wi-chart`).
- **No fixed sleeps.** Every action of a panel is a round trip to the server, and the steps wait on the panel's own signals:
  - the requests of the page (the component updates the page sends) and a quiet moment after the last one, the same signal the Laravel pack waits on;
  - the element that sent a request loses its loading mark (`data-loading`) when the answer is in;
  - the transitions of a modal, a slide-over, a dropdown or a notification end before a step reads or clicks in it;
  - in the panel's single-page mode, a link is followed until the panel says the new page is in place (its navigation event), not only until the address changed;
  - a list that searches the server shows its options once the search is answered; an upload is held once the file is uploaded; the global search answers the text that was typed.
- **The open modal first.** A field, a button or a text is looked for in the newest open modal, else on the page; webship-js's own modal steps (`I click "..." in the modal`) read the panel's open modal too.
- **Failures say what was found.** `Expected the "Processing" tab of the list to be chosen, but it is not chosen.`, `The list counts 3 products, not 4.` with a hint on where to look.

## Accounts

The suite never creates or deletes an account. Accounts are configuration: list the ones the app has in `worldParameters.users`, by a handle the scenarios use, each with its `email`, `password` and `name` (the Laravel pack checks who is signed in by the name the user menu shows).

```javascript
users: {
  administrator: { email: 'administrator@example.com', password: process.env.ADMINISTRATOR_PASSWORD, name: 'Ada Administrator' },
  unverified: { email: 'unverified@example.com', password: process.env.UNVERIFIED_PASSWORD, name: 'Uma Unverified' },
},
```

An account that logged in once keeps its session for the rest of the run: a later scenario that logs in as the same handle takes the session over instead of filling in the login form again. That is quicker, and it matters: the panel allows five login attempts a minute from one browser, whatever the account, and answers a sixth with a notification that names the seconds to wait (the step waits them out once).

## Test users

The accounts this repository's suite logs in as, exactly as `cucumber.js` lists them in `worldParameters.users` (the default values; the `<HANDLE>_EMAIL`, `<HANDLE>_PASSWORD` and `<HANDLE>_NAME` variables replace them). [`.github/scripts/build-ddev-site.sh`](.github/scripts/build-ddev-site.sh) creates them on the local test app, and CI does the same on the runner. They are placeholder credentials of that throwaway app, not of any real one.

```json
{
  "administrator": { "email": "administrator@example.com", "password": "dD.123123ddd", "name": "Ada Administrator" },
  "unverified": { "email": "unverified@example.com", "password": "dD.123123ddd", "name": "Uma Unverified" }
}
```

`administrator` has a verified address: the panel lets it in. `unverified` has not: the admin panel refuses it at its login form ("These credentials do not match our records."), and a session of it from the app panel gets the 403 page.

## A test app

[`.github/scripts/build-ddev-site.sh`](.github/scripts/build-ddev-site.sh) builds the app the suite of this repository runs against, in a DDEV project of type `laravel` with PHP 8.4 and Node.js 24 (`PROJECT_NAME`, `SITE_DIR` and `ACCOUNT_PASSWORD` change it):

- `APP=demo` (the default): the panel's official demo app at the head of its `5.x` branch, as its README installs it (its packages, the newest release of the panel of that line, its key, its database with its own seed, its storage link, its theme built with npm);
- `APP=panel`: a new app from the official skeleton (`composer create-project laravel/laravel`), the panel installed the documented way (`composer require filament/filament`, `artisan filament:install --panels`, its panel at `/admin`), and one resource generated from a model and its table (`artisan make:filament-resource Note --generate`): notes with a title, a body, a published switch and a publishing date.

Then, on either app:

- what the panel's documentation shows for an app in production: the User model says which accounts the panel lets in (an address verified, `canAccessPanel`), and the panel checks it on every page with its own middleware (the demo's admin panel checks only that somebody is signed in); the new panel offers the password reset, and the body of a note is written in the Markdown editor;
- the accounts of [Test users](#test-users), written through the app itself ([`site/accounts.php`](site/accounts.php)), and the test records the features read ([`site/test-records.php`](site/test-records.php)): every name starts with "Webship", so a search finds them and nothing of the demo's random seed;
- a sender address for the app's mail (the demo leaves it empty, and its password reset answers 500 without one); on the new app, the queue runs in the request (`QUEUE_CONNECTION=sync`, as the demo's does): the panel's password reset mail is a queued notification, and a test app runs no queue worker;
- `APP_ENV=production` and `APP_DEBUG=false`, as a live app runs: an error renders the error page, never the debug page.

```bash
SITE_DIR="$PWD/../filament-demo" .github/scripts/build-ddev-site.sh
npm test
APP=panel PROJECT_NAME=filamentpanel SITE_DIR="$PWD/../filament-panel" .github/scripts/build-ddev-site.sh
LAUNCH_URL=https://filamentpanel.ddev.site npm run test:panel
```

Nothing is installed that the demo or the installer does not bring: no paid package, no trial, no sign-in to any service.

## Steps

One example of each step; the JSDoc block above each definition holds five.

### `filament-panel.steps.js` (14)

- `Given I am on the "Products" list`
- `When I open "Shop Dashboard" from the sidebar`
- `Then the sidebar should list "Products"`
- `Then the "Orders" item of the sidebar should show a badge`
- `Then the sidebar should show "Products" as the current page`
- `When I collapse the "Shop" group of the sidebar`
- `Then the "Shop" group of the sidebar should be collapsed`
- `Then the page heading should be "Products"`
- `Then the breadcrumbs should read "Products › List"`
- `Then I should be on the "Products" list`
- `When I open "Webship Test Kettle" from the list`
- `When I create a new record from the list`
- `When I open the "Edit" page of the record`
- `Then the "View" page of the record should be the current one`

### `filament-table.steps.js` (31)

- `Then the list should count 3 records`
- `Then the list should show "Webship Test Kettle"`
- `Then the list should have 10 rows`
- `Then the "Webship Test Kettle" row should show "Webship Brand Alpha" in the "Brand" column`
- `Then the first row of the list should be "Webship Test Teapot"`
- `Then the list should be empty`
- `When I search the list for "Webship Test"`
- `When I clear the search of the list`
- `When I sort the list by "Price"`
- `Then the list should be sorted by "Price" in ascending order`
- `When I choose "Only deleted records" in the "Deleted records" filter`
- `Then the "Deleted records" filter should be set to "Only deleted records"`
- `Then the list should have the filter "Only deleted records"`
- `When I remove the filter "Only deleted records"`
- `When I clear all filters`
- `When I choose the "Processing" tab of the list`
- `Then the "Processing" tab of the list should be chosen`
- `When I hide the "SKU" column`
- `Then the list should have the column "SKU"`
- `When I go to page 2 of the list`
- `Then the list should be on page 2`
- `When I show 25 records per page`
- `When I select "Webship Test Kettle" in the list`
- `Then the selection should read "1 record selected"`
- `When I run the bulk action "Delete selected"`
- `Then the bulk actions should offer "Delete selected"`
- `When I group the list by "Order date"`
- `Then the list should show the group "Processing"`
- `When I turn reordering of the list on`
- `When I move "Webship Brand Beta" above "Webship Brand Alpha" in the list`
- `Then "Webship Brand Beta" should come before "Webship Brand Alpha" in the list`

### `filament-actions.steps.js` (10)

- `When I run the "Replicate" action of the page`
- `Then the page should offer the "Replicate" action`
- `When I run the "New address" action of the "Addresses" list`
- `When I run the "Ship" action on the "WS-TEST-0001" row`
- `Then the "WS-TEST-0001" row should offer the "Process" action`
- `Then the "Send email" modal should be open`
- `When I confirm the modal`
- `When I press "Ship & notify customer" in the modal footer`
- `When I close the open modal`
- `Then the modal should ask "Are you sure you would like to do this?"`

### `filament-form.steps.js` (27)

- `When I set "Name" to "Webship test lamp"`
- `When I set these fields:`
- `Then "Name" should be set to "Webship test lamp"`
- `Then the "Slug" field should be read only`
- `Then the form should show the field "Salary"`
- `When I upload "test-panel-photo.jpg" to the "Images" field`
- `Then the "Images" field should hold the file "test-panel-photo.jpg"`
- `When I remove the file "test-panel-photo.jpg" from the "Images" field`
- `When I add a row to "Order items"`
- `When I add the "Milestone" block to "Plan"`
- `Then "Order items" should have 2 rows`
- `Then the rows of "Plan" should be "Milestone" and "Task group"`
- `When I set "Quantity" to "2" in row 1 of "Order items"`
- `Then "Quantity" should be set to "2" in row 1 of "Order items"`
- `When I move row 2 of "Plan" up`
- `When I remove row 2 of "Plan"`
- `When I add the property "badge" with the value "blue" to "Metadata"`
- `Then "Metadata" should hold the property "badge" with the value "blue"`
- `When I remove the property "badge" from "Metadata"`
- `When I open the "Employment" tab`
- `Then the "Employment" tab should be open`
- `When I go to the next step of the wizard`
- `Then the wizard should be on the "Order Details" step`
- `When I save the form`
- `When I create the record`
- `When I delete the record`
- `Given there is no "Webship form task" in the "Tasks" list`

### `filament-widgets.steps.js` (5)

- `Then the stat "Revenue / Customer" should show a value`
- `Then the page should show the widget "Customer Growth"`
- `Then the "Customer Growth" chart should be drawn`
- `Then the "Flagged Orders" widget should list 5 records`
- `Then the "Title" entry should read "Webship test post"`

### `filament-frame.steps.js` (14)

- `When I search the panel for "Webship Test"`
- `Then the global search should find "Webship Test Kettle"`
- `Then the global search should show the group "products"`
- `When I open "Webship Test Kettle" from the global search`
- `When I open the notifications drawer`
- `When I close the notifications drawer`
- `Then the notifications drawer should list "New order"`
- `When I mark all notifications as read`
- `Then the notifications button should show 1 unread`
- `When I switch the admin theme to "dark"`
- `Then the admin theme should be "dark"`
- `When I switch the current tenant to "Webship Second Team"`
- `Then the current tenant should be "Webship Team"`
- `Then the tenant menu should offer "Webship Second Team"`

### Phrases shared with other packs

Admin packs share phrases on purpose, one profile per system (the webship-js FAQ, "Can I load several step packs in one project?"): this pack shares 14 of its 101 phrases with [`@webship-js/django-steps`](https://github.com/webship/django-steps) (a field set and read by its label, several fields at once, the breadcrumbs, a list opened and on screen, a record opened from the list, a cell of a column, sorting a list and reading its order, a filter set and read, the selection, the order of two rows, the leftover of a stopped run removed), 7 with [`@webship-js/payload-steps`](https://github.com/webship/payload-steps) (a field's value, the rows of a repeater and a field in one of them, a cell, the first row, the selection) and 4 with [`@webship-js/strapi-steps`](https://github.com/webship/strapi-steps).

## Testing this package

```bash
npm install
SITE_DIR="$PWD/../filament-demo" .github/scripts/build-ddev-site.sh
npm run test:examples      # the examples and the features against the step patterns (this pack, the Laravel pack, webship-js), and no platform name in a phrase
npm run test:paths         # a feature or a scenario named on the command line runs alone
npx cucumber-js --dry-run  # no undefined and no ambiguous step
npm test                   # the suite, against the demo app
npm run test:must-fail     # assertions that must fail, each with its message
```

`LAUNCH_URL` points the suite at another app and `PANEL_PATH` at a panel that is not at the root of it (`PANEL_PATH=/admin`); `npx cucumber-js tests/features/list.feature` runs one feature and `npx cucumber-js tests/features/list.feature:<line>` one scenario (the line of its `Scenario:`; the paths of `cucumber.js` are left out when the command line names any); `FEATURES` runs a subset too (`FEATURES=tests/features/list.feature npm test`); `CUCUMBER_TAGS=@table` runs one lane; `HEADLESS=false` shows the browser.

`tests/must-fail/` holds scenarios that assert something that is not true on the test app. `npm run test:must-fail` runs them and checks that each one fails at its last step, with the message it announces and a hint: a step that cannot fail proves nothing. They change nothing.

A run stopped half way can leave a record of a scenario behind (the features remove their own leftovers when they start again), or an account with another password; the build script puts the accounts and the test records back without building anything:

```bash
ACCOUNTS_ONLY=1 SITE_DIR="$PWD/../filament-demo" .github/scripts/build-ddev-site.sh
```

## How the steps were written

Every page a step touches was opened in a real browser first, and the step was written from what is there: the roles and names of the accessibility tree, the panel's own classes and attributes, what the page does while it waits for the server (the requests, the loading mark, the transitions of modals and dropdowns, the single-page navigation), the exact messages. The steps are proven on the panel 5.11.4 (with its components 4.4.8 and Laravel 12.71.0, PHP 8.4) in the official demo app at `eb48a72` of its `5.x` branch and in a new app with the panel installed the documented way, in US English, with Chromium.

Not covered: the panel's release line 4 and earlier (its markup differs), a panel in a language other than English (the steps read the panel's English labels where a control has no other name: "Filter", "Apply filters", "Delete", "Sign out"), the query builder filter (its rules are added constraint by constraint; a filter step sets a filter by its label), a date picker the panel draws itself (`native(false)`: the steps type into the browser's own date and date-time inputs), a panel's own plugins, and the custom pages and widgets an app draws itself (the steps read the panel's components).

## License

MIT

## Logo

The Filament logo in this README comes from Simple Icons 16.37.0 (CC0-1.0), filled with the colour the set lists for the brand. The Filament name and logo are trademarks of their owner; this pack is not affiliated with or endorsed by them.

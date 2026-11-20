'use strict';

// What this pack brings along for every scenario. Not a step file.
//
//   1. The Laravel pack's steps. A project installs this pack alone: the
//      login by a handle of the users registry, logging out, who is signed
//      in, the errors under a field, the notifications, the user menu, the
//      password reset through the mail and the framework's pages (403, 404,
//      500, 503, the debug page check) come from @webship-js/laravel-steps,
//      which this package depends on and loads here, so one `require` glob in
//      cucumber.js is enough. A project that lists the Laravel pack's glob as
//      well is fine while npm installed one copy of it (Node loads a file
//      once); a second, nested copy (the project pins another release line of
//      it) registers every Laravel step twice, so drop that glob then.
//
//   2. The frame of a panel, added to the Laravel pack's: the button that
//      opens its user menu, its "Sign out" item, and its notifications (their
//      kind is the class `fi-status-<kind>`). The Laravel pack's user menu,
//      logout and notification steps then read the panel's.
//
//   3. The panel's modal, as webship-js's named selector "modal" (unless the
//      project names one): the window of the open modal or slide-over. The
//      element with the dialog role of a panel's modal has no size of its
//      own, so webship-js's modal steps (`I should see "..." in the modal`,
//      `I click "..." in the modal`, `I close the modal`) read its window.

const fs = require('fs');
const path = require('path');
const { Before } = require('@cucumber/cucumber');

const LARAVEL_STEPS_DIR = path.join(path.dirname(require.resolve('@webship-js/laravel-steps/package.json')), 'tests', 'step-definitions');

const { FRAME } = require('@webship-js/laravel-steps/tests/step-definitions/laravel-helpers');
if (!FRAME) {
  throw new Error('@webship-js/filament-steps needs @webship-js/laravel-steps 2.0.1 or later (its helpers export FRAME). Run: npm install @webship-js/laravel-steps@latest');
}

/** Add values to a list of FRAME once (a second load of this file adds nothing). */
function addOnce(list, values) {
  for (const value of values) {
    const key = JSON.stringify(value);
    if (!list.some((item) => JSON.stringify(item) === key)) list.push(value);
  }
}

// The user menu of a panel opens from the button with the account's name and avatar, in the sidebar
// or the top bar; its last item is "Sign out". A notification of the panel is a toast at a corner of
// the page; the ones inside the notifications drawer (inline) are not toasts.
addOnce(FRAME.userMenuTriggers, ['.fi-user-menu .fi-user-menu-trigger']);
addOnce(FRAME.logoutLabels, ['Sign out']);
addOnce(FRAME.notifications, [{ selector: '.fi-no-notification:not(.fi-inline)', typeClassPrefix: 'fi-status-' }]);

for (const file of fs.readdirSync(LARAVEL_STEPS_DIR).filter((f) => f.endsWith('.js')).sort()) {
  require(path.join(LARAVEL_STEPS_DIR, file));
}

// The window of the panel's open modal (or slide-over), for webship-js's modal steps; the newest one is
// the last in the page.
const MODAL_SELECTOR = '.fi-modal.fi-modal-open .fi-modal-window';

Before(function () {
  if (this.__selectorsCss && !this.__selectorsCss.modal) this.__selectorsCss.modal = MODAL_SELECTOR;
});

module.exports = { LARAVEL_STEPS_DIR, MODAL_SELECTOR };

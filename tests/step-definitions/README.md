# Step definitions

| File | Covers |
| --- | --- |
| `filament-panel.steps.js` | The panel around its pages: a list opened by its name, the items and groups of the sidebar (opened, listed, their badges, the current page, collapsed and expanded), the heading and the breadcrumbs of a page, a record opened from its list, a new record, the pages of a record's sub-navigation. |
| `filament-table.steps.js` | A list or the table of a relation manager: its records, the count, the rows, a cell, the first row, the empty list, the search, sorting, the filters and their indicators, the tabs above it, the columns, the pages and the records per page, the selection and the bulk actions, grouping, reordering by dragging. |
| `filament-actions.steps.js` | The actions of a page, of a list and of a row (directly or in a menu), the modals and slide-overs they open, their question, confirming, cancelling or closing them, a button of their footer. |
| `filament-form.steps.js` | The fields of a form by their labels, whatever their kind; uploads; repeaters and builder blocks; key-value fields; tabs; wizard steps; saving, creating and deleting a record; the leftover of a stopped run removed. |
| `filament-widgets.steps.js` | What a page shows to be read: the stats, charts and table widgets of a dashboard, the entries of a view page. |
| `filament-frame.steps.js` | Around the pages: the global search, the notifications drawer and its unread count, the theme of the user menu, the tenants of a panel. |
| `filament-defaults.js` | Loads the steps of `@webship-js/laravel-steps` (the login, the user menu, the toasts, the errors under a field, the mail, the error pages), adds the panel's parts to its `FRAME`, and names the panel's open modal for webship-js's modal steps. It registers no step. |
| `filament-helpers.js` | Shared plumbing: the panel's own signals (the requests of the page, the element that is loading, the transitions of modals and dropdowns, the single-page navigation), the sidebar, the modals, the tables and their rows, the fields of a form and how each kind is set and read. It registers no step. |

## Rules for a new step

- Check `node_modules/webship-js/tests/step-definitions/` and the Laravel
  pack's steps first: a step that the generic vocabulary or the Laravel pack
  already covers is not added here.
- No step phrase names the platform, the framework or a library. A name appears
  only as an argument a step asserts. `npm run test:examples` checks the
  patterns, the examples and the features for it.
- The regular expression starts with the pronoun group `(I |we )*` where a
  person acts, and an assertion takes `should( not)*`, so one definition reads
  both polarities.
- A JSDoc block above the step holds at least five `Example #N:` lines. Run
  `npm run test:examples`: every example must match its own step and no step of
  webship-js or of the Laravel pack.
- Find things the way a person does: a label, a heading, a role, a text. The
  panel's own classes (`fi-…`) are the fallback, the same on every panel.
- Wait on the panel, never on a fixed time: on the requests of the page, on the
  element that is loading, on the transition of a modal or a dropdown, on the
  page the single-page mode put in place (`act`, `rest`, `follow`).
- Fail with `friendly({ message, hint })`: what was expected, what was found
  and where to look.
- A step never creates or deletes an account: accounts are configuration, named
  in the `users` registry of `cucumber.js` and created by the build of the app.
- Open the page in a real browser before writing or changing its step, and
  write the step from what is there.
- Give every assertion a scenario in `tests/must-fail/` that makes it fail.

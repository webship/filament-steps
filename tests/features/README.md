# Features

Reference features for the test app that `.github/scripts/build-ddev-site.sh`
builds: the panel's official demo app (a shop, a blog, an HR suite, an admin
panel at the root of the app and a second panel with teams at `/app`), the two
accounts of `cucumber.js` (`administrator`, `unverified`) and the test records
the scenarios read (every name starts with "Webship"). A demo app built with the
Webship Workspace's Filament plugin (`cmd-filament-project.sh <name> --install
--add-users --demo`) runs them once the build script wrote the test records on
it (`ACCOUNTS_ONLY=1 SITE_DIR=<the app's folder>`). Copy a feature into your
project and replace the resources, fields and texts with those of your panel.

| Feature | Covers |
| --- | --- |
| `session` | A visitor sent to the login form, a login through the form, a login refused for an unknown address and for an account the panel does not let in, a session of the other panel that gets the 403 page, an empty login form the browser refuses, a session taken over and logging out. |
| `password-reset` | A link asked for on the app panel's page for a forgotten password, opened from the mail, the password set again, and a login with it. |
| `navigation` | The items and groups of the sidebar with their badges, the current page and the breadcrumbs, a group collapsed and expanded, a record opened from its list and the page of a new record. |
| `dashboard` | The stats, the charts and the table widget of the shop's dashboard, and its filters changing what the stats count. |
| `list` | A search, the count and the rows, a cell of a column, an empty search, sorting both ways, the columns hidden and shown, the pages and the records per page. |
| `filters-and-tabs` | A filter with its indicator, removed with it, every filter cleared at once, the tabs above a list with their counts, the rows grouped by a column. |
| `reordering` | A record dragged above another and below it again, in the list's own order. |
| `selection-and-actions` | Rows selected one by one and by page, the bulk actions, a confirmation, a bulk delete the demo refuses, the actions of a row following the state of its record through a slide-over and a button of its footer, a modal with a form refused while a field is empty, a modal closed. |
| `forms` | Every kind of field of the task form, a task created, changed and deleted, a required field, a value the server refuses under its field, the tabs of a form and the fields it shows as another changes, a key-value field, a record deleted, restored and deleted for good. |
| `wizard-and-notifications` | An order made step by step (a step refused, a repeater of items), its notification in the drawer, the unread count, all marked as read, the drawer cleared, the order deleted for good. |
| `builder-and-uploads` | Blocks added, moved and removed in a builder, a block's tags, a file the field refuses and one it takes. |
| `relations-and-views` | An address added in the modal of a relation manager and deleted, the entries of a view page, the pages of a record's sub-navigation. |
| `search-theme-and-tenancy` | The global search (results, groups, a result opened, nothing found), the theme switched from the user menu and back, the tenants of a panel. |
| `framework-pages` | The 404 page without debug information, and the health route. |

Every scenario that makes a record deletes it again (for good, where the demo
keeps deleted records), and every filter, sorting, choice of columns, order or
theme a scenario changes is put back. No scenario creates or deletes an account.

The features of a new panel (`../panel/`) run on the build script's other app
(`APP=panel`): a panel at `/admin` with one generated resource.

#!/usr/bin/env bash
# Builds the app the suite runs against, in a DDEV project of type laravel.
#
#   APP=demo   (the default) the official demo app (github.com/filamentphp/demo,
#              MIT) at the head of its branch for the release line, with the
#              newest release of that line, its own seed (a shop, a blog, an HR
#              suite) and its two panels;
#   APP=panel  a new app made from the official skeleton, the panel installed
#              the documented way (`filament:install --panels`), and one resource
#              generated from a model and its table (`make:filament-resource
#              Note --generate`): notes with a title, a body in Markdown, a
#              published switch and a publishing date.
#
# Settings (environment variables, all optional):
#   PROJECT_NAME      the DDEV project name                 (default filamentsteps)
#   SITE_DIR          the project folder                    (default a new temporary folder)
#   APP               demo or panel                         (default demo)
#   FILAMENT_LINE     the release line: 5 or 4              (default 5)
#   ACCOUNT_PASSWORD  the password of the accounts below    (default dD.123123ddd)
#   ACCOUNTS_ONLY     1: build nothing, give the accounts and the test records of
#                     the app in SITE_DIR back their values (after a run that was
#                     stopped half way)
#
# The accounts are configuration: this script creates them and cucumber.js names
# them; the features never create or delete users.
#   administrator  Ada Administrator, administrator@example.com  a verified address: the panel lets it in
#   unverified     Uma Unverified, unverified@example.com        no verified address: the panel refuses it (403)
#
# The test records the features read (site/test-records.php): every name starts
# with "Webship", so a search finds them and nothing of the app's random seed.
#   demo   brands Webship Brand Alpha and Beta; products Webship Test Kettle,
#          Lantern and Teapot in Webship Test Category; customer Wendy Webship;
#          order WS-TEST-0001 (new, two kettles); Webship Department, its
#          employee Wes Webship and its Webship Test Project (an empty plan);
#          the post Webship test post by Webship Author in Webship Category; the
#          teams Webship Team and Webship Second Team of the app panel, with the
#          administrator in both
#   panel  three notes of the generated resource
#
# Nothing is installed that the demo or the installer does not bring: no paid
# package, no trial, no sign-in to any service.
set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-filamentsteps}"
APP="${APP:-demo}"
FILAMENT_LINE="${FILAMENT_LINE:-5}"
ACCOUNT_PASSWORD="${ACCOUNT_PASSWORD:-dD.123123ddd}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SITE_DIR="${SITE_DIR:-$(mktemp -d)}"

case "$APP" in
  demo|panel) ;;
  *) echo "APP must be demo or panel, not \"$APP\"." >&2; exit 1 ;;
esac
case "$FILAMENT_LINE" in
  4|5) ;;
  *) echo "FILAMENT_LINE must be 5 or 4, not \"$FILAMENT_LINE\"." >&2; exit 1 ;;
esac

# The accounts (see the header), written by the app itself, so the password is
# hashed the way the app hashes it. Run again, it gives them back their name,
# their password and their state.
write_accounts() {
  python3 -c '
import json, sys
password = sys.argv[1]
print(json.dumps([
    {"name": "Ada Administrator", "email": "administrator@example.com", "password": password, "verified": True},
    {"name": "Uma Unverified", "email": "unverified@example.com", "password": password, "verified": False},
]))' "$ACCOUNT_PASSWORD" > accounts.json
  cp "$REPO_DIR/site/accounts.php" accounts.php
  ddev exec php accounts.php accounts.json </dev/null
  rm -f accounts.php accounts.json
}

# The test records (see the header), written through the app's own models. Run
# again, it gives them back their values.
write_records() {
  cp "$REPO_DIR/site/test-records.php" test-records.php
  ddev exec php test-records.php "$APP" </dev/null
  rm -f test-records.php
}

mkdir -p "$SITE_DIR"
cd "$SITE_DIR"

if [ "${ACCOUNTS_ONLY:-}" = "1" ]; then
  write_accounts
  write_records
  exit 0
fi

# Node.js 24 builds the panel's theme, as every Webship build does.
# PHP 8.4: the demo's lock file holds packages that need it.
ddev config --project-type=laravel --docroot=public --project-name="$PROJECT_NAME" --nodejs-version=24 --php-version=8.4

if [ "$APP" = "demo" ]; then
  # The demo at the head of the branch of the line, as its README clones it.
  tmp="$(mktemp -d)"
  git clone --quiet --depth 1 --branch "${FILAMENT_LINE}.x" https://github.com/filamentphp/demo.git "$tmp/demo"
  (cd "$tmp/demo" && git log -1 --format='The demo at %h (%ad): %s' --date=short)
  rm -rf "$tmp/demo/.git"
  cp -a "$tmp/demo/." "$SITE_DIR/"
  rm -rf "$tmp"
  cp .env.example .env
  # DDEV writes the database and the mail settings of its containers into .env on start.
  ddev start -y </dev/null
  ddev composer install --no-interaction --no-progress </dev/null
  # The newest release of the line, which the demo's lock file may be a few days behind.
  ddev composer update 'filament/*' --with-dependencies --no-interaction --no-progress </dev/null
  ddev artisan key:generate --ansi </dev/null
  # The demo's own seed: its admin, the shop, the blog and the HR suite.
  ddev artisan migrate --force --seed --no-interaction </dev/null
  ddev artisan storage:link </dev/null
  ddev npm ci --no-audit --no-fund </dev/null
  ddev npm run build </dev/null

  # The demo lets every account into both panels, and its admin panel checks
  # only that somebody is signed in. The test app refuses the admin panel to an
  # account whose address is not verified, as the panel's documentation shows
  # it for an app in production (canAccessPanel), and checks it on every page
  # with the panel's own middleware, as a new panel does: a signed-in account
  # without access gets the 403 page.
  python3 - <<'PYEOF'
import re
path = 'app/Models/User.php'
src = open(path).read()
new, count = re.subn(
    r"(public function canAccessPanel\(Panel \$panel\): bool\s*\{)\s*return true;",
    r"\1\n        // Changed by the test app of the webship-js suite: the admin panel lets in an account whose\n        // address is verified, and refuses the others.\n        return $panel->getId() !== 'admin' || $this->hasVerifiedEmail();",
    src, count=1)
if count != 1:
    raise SystemExit('app/Models/User.php: canAccessPanel is not the one this script knows.')
open(path, 'w').write(new)
path = 'app/Providers/Filament/AdminPanelProvider.php'
src = open(path).read()
if 'use App\\Http\\Middleware\\Authenticate;' not in src:
    raise SystemExit(path + ': the authentication middleware is not the one this script knows.')
src = src.replace('use App\\Http\\Middleware\\Authenticate;', '// Changed by the test app of the webship-js suite: the panel\'s own middleware, which checks canAccessPanel.\nuse Filament\\Http\\Middleware\\Authenticate;')
open(path, 'w').write(src)
PYEOF
else
  # A new app, made the way the DDEV quickstart for Laravel makes one (the
  # official skeleton, with Composer in the container), then the panel
  # installed the documented way.
  ddev start -y </dev/null
  ddev composer create-project laravel/laravel --no-interaction --no-progress </dev/null
  # The restart writes the database and the mail settings of the containers into .env.
  ddev restart </dev/null
  ddev artisan migrate --force --no-interaction </dev/null
  ddev composer require "filament/filament:^${FILAMENT_LINE}.0" --with-all-dependencies --no-interaction --no-progress </dev/null
  ddev artisan filament:install --panels --no-interaction </dev/null

  # One resource, generated from a model and its table: notes with a title, a
  # body, a published switch and a publishing date.
  ddev artisan make:model Note --migration --no-interaction </dev/null
  python3 "$REPO_DIR/site/panel-app.py" note-model
  ddev artisan migrate --force --no-interaction </dev/null
  ddev artisan make:filament-resource Note --generate --no-interaction </dev/null

  # What a panel in production has (the panel's documentation): the User model
  # says which accounts the panel lets in (an address verified), and the panel
  # offers the password reset. The body of a note is written in Markdown.
  python3 "$REPO_DIR/site/panel-app.py" panel
  ddev npm install --no-audit --no-fund </dev/null
  ddev npm run build </dev/null

  # The panel's mail (the password reset) is a queued notification, and a new app queues in its
  # database: a test app runs no queue worker, so its queue runs in the request, as the demo's does.
  ddev dotenv set .env --queue-connection=sync </dev/null
fi

write_accounts
write_records

# The address the app's mail comes from: the demo leaves it empty, and an app
# cannot send mail without one (the password reset answers 500).
ddev dotenv set .env --mail-from-address=webship@example.com </dev/null

# A test app behaves like a live one: an error renders the error page, never
# the debug page.
ddev dotenv set .env --app-env=production --app-debug=false </dev/null
ddev artisan optimize:clear </dev/null > /dev/null

SITE_URL="$(ddev describe -j </dev/null | python3 -c "import json,sys; print(json.load(sys.stdin)['raw']['primary_url'])")"

if [ -n "${GITHUB_ENV:-}" ]; then
  echo "LAUNCH_URL=$SITE_URL" >> "$GITHUB_ENV"
fi
FRAMEWORK="$(ddev artisan --version </dev/null 2>/dev/null || true)"
PANEL="$(ddev composer show filament/filament --format=json </dev/null 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['versions'][0])" 2>/dev/null || true)"
echo "Built the ${APP} app: ${FRAMEWORK:-(unknown version)}, panel ${PANEL:-(unknown version)}, at $SITE_URL"

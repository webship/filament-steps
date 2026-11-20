// A feature file, a scenario (file:line), a folder or a rerun file named on
// the command line of cucumber-js runs alone: `npx cucumber-js
// tests/features/session.feature`. cucumber-js 12 adds the paths of the
// command line to the `paths` of this file instead of using them alone, so
// `paths` is left empty when the command line names any, as in webship-js.
const OPTIONS_WITH_A_VALUE = new Set([
  '-c', '--config', '-f', '--format', '--format-options', '--i18n-keywords',
  '-i', '--import', '-l', '--loader', '--language', '--name', '--order',
  '-p', '--profile', '--parallel', '--plugin', '--plugin-options',
  '-r', '--require', '--require-module', '--retry', '--retry-tag-filter',
  '--shard', '-t', '--tags', '--world-parameters',
]);

function commandLinePaths() {
  // Only when cucumber-js itself runs, not when another script reads this file.
  if (!/cucumber(-js|\.js)?$/.test(String(process.argv[1] || ''))) return [];
  const args = process.argv.slice(2);
  const paths = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i].startsWith('-')) {
      if (OPTIONS_WITH_A_VALUE.has(args[i])) i += 1;
    } else {
      paths.push(args[i]);
    }
  }
  return paths;
}

// The default is the local DDEV app that .github/scripts/build-ddev-site.sh
// builds (project "filamentsteps"), never an app of somebody else: the suite
// logs in with the accounts below and makes and deletes test records.
// LAUNCH_URL points it at another app.
const launchUrl = process.env.LAUNCH_URL || 'https://filamentsteps.ddev.site';

// Where the panel is: the demo serves its admin panel at the root of the app,
// a new panel is at /admin (PANEL_PATH=/admin).
const panelPath = '/' + String(process.env.PANEL_PATH || '').replace(/^\/+|\/+$/g, '');

/** An account of the users registry: the <HANDLE>_EMAIL, <HANDLE>_PASSWORD and <HANDLE>_NAME variables replace its values. */
function account(handle, email, name) {
  const env = handle.toUpperCase();
  return {
    email: process.env[`${env}_EMAIL`] || email,
    password: process.env[`${env}_PASSWORD`] || 'dD.123123ddd',
    name: process.env[`${env}_NAME`] || name,
  };
}

module.exports = {
  default: {
    // The step timeout is webship-js's (45 s, set when it loads): WEBSHIP_STEP_TIMEOUT=<milliseconds> changes it; a `timeout` key here is ignored.
    requireModule: ['tsx/cjs'],
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js',          // Webship-js core step definitions (auto HTML report on exit; disable: WEBSHIP_REPORT_DISABLE=1).
      'tests/step-definitions/**/*.js',                                  // This pack. It loads @webship-js/laravel-steps itself (a project lists node_modules/@webship-js/filament-steps/tests/step-definitions/**/*.js instead).
    ],
    // FEATURES=tests/features/a.feature,tests/features/b.feature runs a subset too.
    paths: process.env.FEATURES ? process.env.FEATURES.split(',') : (commandLinePaths().length ? [] : ['tests/features/**/*.feature']),
    // CUCUMBER_TAGS=@table runs a lane. The default leaves out work in progress and the assertions that
    // must fail (tests/check-must-fail.js runs them).
    tags: process.env.CUCUMBER_TAGS || 'not @wip and not @must-fail',
    format: [
      '@cucumber/pretty-formatter',
      // REPORT_NAME=must-fail keeps the report of another run (tests/check-must-fail.js) apart.
      `json:tests/reports/${process.env.REPORT_NAME || 'cucumber_report'}.json`,
    ],
    formatOptions: {
      // Colours follow the terminal (GitHub Actions counts as one); FORCE_COLOR=1
      // or FORCE_COLOR=0 sets them. cucumber-js 12 deprecated `colorsEnabled`.
      theme: {
        'feature keyword': ['bold', 'blue'],
        'feature name': ['blue', 'underline'],
        'feature description': ['blueBright'],
        'scenario keyword': ['bold', 'magenta'],
        'scenario name': ['magenta', 'underline'],
        'step keyword': ['bold', 'green'],
        'step text': ['greenBright', 'italic'],
      },
    },
    worldParameters: {
      launchUrl,
      // The panel's home (the dashboard) and its login page: the login steps of the Laravel pack read them.
      homePath: panelPath,
      loginPath: (panelPath === '/' ? '' : panelPath) + '/login',
      // The mailbox that catches the mail of the app (the password reset steps read it): the Mailpit of the DDEV project.
      mailUrl: process.env.MAIL_URL || launchUrl.replace(/\/+$/, '') + ':8026',
      // An account that logged in once keeps its session for the rest of the run: later scenarios take it
      // over instead of filling in the login form again (the panel allows five login attempts a minute).
      reuseSessions: process.env.REUSE_SESSIONS !== 'false',
      // Video of the browser: 'off', 'on', 'on-failure' or 'tag' (scenarios tagged @video; @no-video opts out).
      video: { mode: process.env.WEBSHIP_VIDEO || 'off', dir: './videos', size: { width: 1280, height: 720 }, filenamePattern: '{datetime}.{feature_file}.{scenario}.{status}.{ext}' },
      // JavaScript errors the page raises: 'warn' reports them, 'fail' fails the scenario, 'off' ignores them;
      // @js-fail, @js-warn and @js-off per scenario. Ignored, as no error of the app:
      //   - "net::ERR_NETWORK_CHANGED": the browser lost a request when the network of the machine changed
      //     (another container starting).
      // The scenarios that open an error page carry @js-off: the browser logs the refused request (403, 404).
      javascript: { mode: process.env.WEBSHIP_JS_ERROR_MODE || 'warn', levels: ['error'], ignore: 'net::ERR_NETWORK_CHANGED' },
      // The accounts that "I am a logged in user with the ... user" uses, by handle. They are configuration,
      // not test data: the build of the app creates them (.github/scripts/build-ddev-site.sh, or the Webship
      // Workspace's builder) and a feature never creates or deletes an account. The panel logs in with the
      // email address; its user menu names the account by its name.
      users: {
        // A verified address: the panel lets it in.
        administrator: account('administrator', 'administrator@example.com', 'Ada Administrator'),
        // No verified address: the admin panel refuses it (its login form, and the 403 page for a session of
        // the app panel); the app panel keeps it on the email verification page.
        unverified: account('unverified', 'unverified@example.com', 'Uma Unverified'),
      },
      minWaitTime: {
        page: 3000,
        before_scenario: 0,
        after_scenario: 0,
        before_step: 0,
        after_step: 0,
      },
      selectors: {
        css: {},
        xpath: {},
        filesPath: './tests/selectors/',
        files: [],
        offset: 60,
        breakpoints: {
          xs:   { width: 375,  height: 667  },
          sm:   { width: 576,  height: 800  },
          md:   { width: 768,  height: 1024 },
          lg:   { width: 992,  height: 768  },
          xl:   { width: 1200, height: 900, default: true },
          xxl:  { width: 1400, height: 900  },
          xxxl: { width: 1920, height: 1080 },
        },
      },
      screenshot: {
        dir: './screenshots',
        purge: false,
        onFailed: true,
        onEveryStep: false,
        alwaysFullscreen: false,
        failedPrefix: 'failed_',
        filenamePattern: '{datetime}.{feature_file}.feature_{step_line}.{ext}',
        filenamePatternFailed: '{failed_prefix}{datetime}.{feature_file}.feature_{step_line}.{ext}',
        infoTypes: '',
      },
    },
  },
};

<?php

// Creates the accounts the suite logs in as, or gives them back their name,
// password and state: the build script runs it in the app's folder.
// Accounts are configuration: cucumber.js names them, a feature never creates
// or deletes one.
//
//   php accounts.php accounts.json
//
// accounts.json: [{"name": "Ada Administrator", "email": "administrator@example.com", "password": "…", "verified": true}, …]

require __DIR__.'/vendor/autoload.php';

$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$model = config('auth.providers.users.model');

$accounts = json_decode(file_get_contents($argv[1] ?? 'accounts.json'), true, 512, JSON_THROW_ON_ERROR);

foreach ($accounts as $account) {
    $user = $model::query()->firstOrNew(['email' => $account['email']]);
    $user->name = $account['name'];
    // Hashed here: an app's User model does not always cast the password as hashed (the demo's
    // does not), and a hash is never hashed twice by one that does. A password the account already
    // has keeps its hash, so the sessions of the account stay valid.
    if (! $user->password || ! Illuminate\Support\Facades\Hash::check($account['password'], $user->password)) {
        $user->password = Illuminate\Support\Facades\Hash::make($account['password']);
    }
    $user->email_verified_at = ($account['verified'] ?? true) ? now() : null;
    $user->save();
    printf("  %s <%s>%s\n", $user->name, $user->email, $user->email_verified_at ? '' : ' (address not verified)');
}

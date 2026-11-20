#!/usr/bin/env python3
"""The changes the build script makes to a new app with a panel, run in the app's folder.

  python3 panel-app.py note-model   the table and the model of the notes, the one resource
  python3 panel-app.py panel        the User model's panel access, the password reset of the
                                    panel, and the Markdown editor of the notes' body

Each change says "test app of the webship-js suite" where it is made, and stops with a message
when the file it changes is not the one it knows.
"""

import glob
import re
import sys


def note_model():
    migration = sorted(glob.glob('database/migrations/*_create_notes_table.php'))[-1]
    src = open(migration).read()
    columns = (
        "$table->id();\n"
        "            // The columns of the notes of the test app of the webship-js suite.\n"
        "            $table->string('title');\n"
        "            $table->text('body')->nullable();\n"
        "            $table->boolean('is_published')->default(false);\n"
        "            $table->dateTime('published_at')->nullable();"
    )
    if "$table->id();" not in src:
        raise SystemExit(migration + ': the migration is not the one this script knows.')
    open(migration, 'w').write(src.replace("$table->id();", columns, 1))
    open('app/Models/Note.php', 'w').write('''<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

// The model of the one resource of the test app of the webship-js suite.
class Note extends Model
{
    protected $guarded = [];

    protected $casts = [
        'is_published' => 'boolean',
        'published_at' => 'datetime',
    ];
}
''')


def panel():
    path = 'app/Models/User.php'
    src = open(path).read()
    src = src.replace(
        "use Illuminate\\Foundation\\Auth\\User as Authenticatable;",
        "use Filament\\Models\\Contracts\\FilamentUser;\nuse Filament\\Panel;\nuse Illuminate\\Foundation\\Auth\\User as Authenticatable;",
        1,
    )
    src, count = re.subn(r"class User extends Authenticatable\b(?! implements FilamentUser)", "class User extends Authenticatable implements FilamentUser", src, count=1)
    if count != 1:
        raise SystemExit(path + ': the class is not the one this script knows.')
    src = src.rstrip()
    if not src.endswith('}'):
        raise SystemExit(path + ': the class does not end where this script expects.')
    src = src[:-1].rstrip() + '''

    // Added by the test app of the webship-js suite: the panel lets in an account whose address is
    // verified, and refuses the others.
    public function canAccessPanel(Panel $panel): bool
    {
        return $this->hasVerifiedEmail();
    }
}
'''
    open(path, 'w').write(src)

    path = 'app/Providers/Filament/AdminPanelProvider.php'
    src = open(path).read()
    src, count = re.subn(r"->login\(\)", "->login()\n            // Added by the test app of the webship-js suite.\n            ->passwordReset()", src, count=1)
    if count != 1:
        raise SystemExit(path + ': the panel is not the one this script knows.')
    open(path, 'w').write(src)

    done = False
    for path in glob.glob('app/Filament/Resources/Notes/**/*.php', recursive=True):
        src = open(path).read()
        if "Textarea::make('body')" not in src:
            continue
        src = src.replace("Textarea::make('body')", "MarkdownEditor::make('body')")
        if "use Filament\\Forms\\Components\\Textarea;" in src:
            src = src.replace("use Filament\\Forms\\Components\\Textarea;", "use Filament\\Forms\\Components\\MarkdownEditor;")
        else:
            src = re.sub(r"^(namespace [^;]+;\n)", "\\1\nuse Filament\\\\Forms\\\\Components\\\\MarkdownEditor;\n", src, count=1, flags=re.M)
        open(path, 'w').write(src)
        done = True
    if not done:
        raise SystemExit('The generated form of the notes has no body field.')


if __name__ == '__main__':
    {'note-model': note_model, 'panel': panel}[sys.argv[1]]()

<?php

// Creates the records the features of the suite read and work on, or gives
// them back their values: the build script runs it in the app's folder, after
// the app's own seed. Every name starts with "Webship" so that a search finds
// them and nothing else, whatever the random seed of the app made.
//
//   php test-records.php demo    the official demo app: brands, products, a customer, an order with one
//                                line, a department, an employee, a project, a blog post with its
//                                author and category, two teams
//   php test-records.php panel   a new app with a panel: the notes of its one resource
//
// The features never delete these; a record a feature makes it deletes again.

require __DIR__.'/vendor/autoload.php';

$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$which = $argv[1] ?? 'demo';

if ($which === 'panel') {
    $notes = [
        ['title' => 'Webship note about the harbour', 'body' => 'Boats leave the harbour at dawn.', 'is_published' => true, 'published_at' => '2026-01-15 09:30:00'],
        ['title' => 'Webship note about the library', 'body' => 'The library opens at nine.', 'is_published' => false, 'published_at' => null],
        ['title' => 'Webship note about the market', 'body' => 'The market sells fresh bread.', 'is_published' => true, 'published_at' => '2026-03-02 14:00:00'],
    ];
    foreach ($notes as $note) {
        App\Models\Note::query()->updateOrCreate(['title' => $note['title']], $note);
        printf("  note: %s\n", $note['title']);
    }
    exit(0);
}

$alpha = App\Models\Shop\Brand::query()->updateOrCreate(['slug' => 'webship-brand-alpha'], [
    'name' => 'Webship Brand Alpha', 'website' => 'https://example.com', 'is_visible' => true,
]);
$beta = App\Models\Shop\Brand::query()->updateOrCreate(['slug' => 'webship-brand-beta'], [
    'name' => 'Webship Brand Beta', 'website' => 'https://example.org', 'is_visible' => true,
]);
printf("  brands: %s, %s\n", $alpha->name, $beta->name);

$productCategory = App\Models\Shop\ProductCategory::query()->updateOrCreate(['slug' => 'webship-test-category'], [
    'name' => 'Webship Test Category', 'is_visible' => true,
]);
printf("  product category: %s\n", $productCategory->name);

$products = [
    ['name' => 'Webship Test Kettle', 'slug' => 'webship-test-kettle', 'sku' => 'WS-KETTLE-001', 'barcode' => 'WS-0000000001', 'brand_id' => $alpha->id, 'price' => 25.00, 'old_price' => 30.00, 'cost' => 10.00, 'qty' => 12, 'security_stock' => 2, 'is_visible' => true],
    ['name' => 'Webship Test Lantern', 'slug' => 'webship-test-lantern', 'sku' => 'WS-LANTERN-001', 'barcode' => 'WS-0000000002', 'brand_id' => $beta->id, 'price' => 40.00, 'old_price' => 45.00, 'cost' => 18.00, 'qty' => 3, 'security_stock' => 1, 'is_visible' => false],
    ['name' => 'Webship Test Teapot', 'slug' => 'webship-test-teapot', 'sku' => 'WS-TEAPOT-001', 'barcode' => 'WS-0000000003', 'brand_id' => $alpha->id, 'price' => 15.00, 'old_price' => 20.00, 'cost' => 6.00, 'qty' => 30, 'security_stock' => 5, 'is_visible' => true],
];
foreach ($products as $product) {
    $record = App\Models\Shop\Product::query()->updateOrCreate(['sku' => $product['sku']], $product + ['published_at' => '2026-01-01', 'type' => 'deliverable', 'requires_shipping' => true, 'backorder' => false, 'featured' => false]);
    $record->productCategories()->syncWithoutDetaching([$productCategory->id]);
    printf("  product: %s\n", $product['name']);
}

$customer = App\Models\Shop\Customer::withTrashed()->updateOrCreate(['email' => 'wendy.webship@example.com'], [
    'name' => 'Wendy Webship', 'phone' => '+1 555 0100', 'deleted_at' => null,
]);
printf("  customer: %s\n", $customer->name);

$order = App\Models\Shop\Order::withTrashed()->updateOrCreate(['number' => 'WS-TEST-0001'], [
    'customer_id' => $customer->id, 'status' => 'new', 'total_price' => 80.00, 'shipping_price' => 5.00,
    'shipping_method' => 'Standard', 'notes' => null, 'deleted_at' => null,
]);
// The other orders of the customer: what a run stopped half way left (an order made in the wizard).
foreach (App\Models\Shop\Order::withTrashed()->where('customer_id', $customer->id)->where('number', '!=', 'WS-TEST-0001')->get() as $leftover) {
    $leftover->orderItems()->delete();
    $leftover->forceDelete();
    printf("  order %s of the customer, left by an earlier run: deleted\n", $leftover->number);
}

// One line: two kettles. The order form needs at least one.
$kettle = App\Models\Shop\Product::query()->where('sku', 'WS-KETTLE-001')->first();
$order->orderItems()->delete();
$order->orderItems()->create(['product_id' => $kettle->id, 'qty' => 2, 'unit_price' => 25.00, 'sort' => 1]);
printf("  order: %s (%s), %d line\n", $order->number, $order->status->value ?? $order->status, $order->orderItems()->count());

$department = App\Models\HR\Department::query()->updateOrCreate(['slug' => 'webship-department'], [
    'name' => 'Webship Department', 'description' => 'The department of the test records.', 'is_active' => true,
]);
$employee = App\Models\HR\Employee::withTrashed()->updateOrCreate(['email' => 'wes.webship@example.com'], [
    'name' => 'Wes Webship', 'job_title' => 'Tester', 'hire_date' => '2026-01-05', 'employment_type' => 'full_time',
    'department_id' => $department->id, 'salary' => 50000, 'is_active' => true, 'metadata' => ['desk' => 'A12'], 'deleted_at' => null,
]);
$project = App\Models\HR\Project::withTrashed()->updateOrCreate(['slug' => 'webship-test-project'], [
    'name' => 'Webship Test Project', 'department_id' => $department->id, 'status' => 'planning', 'priority' => 'medium',
    'start_date' => '2026-01-01', 'plan' => [], 'deleted_at' => null,
]);
printf("  department: %s; employee: %s; project: %s\n", $department->name, $employee->name, $project->name);

$author = App\Models\Blog\Author::query()->updateOrCreate(['email' => 'webship.author@example.com'], ['name' => 'Webship Author']);
$category = App\Models\Blog\PostCategory::query()->updateOrCreate(['slug' => 'webship-category'], ['name' => 'Webship Category', 'is_visible' => true]);
$post = App\Models\Blog\Post::query()->updateOrCreate(['slug' => 'webship-test-post'], [
    'title' => 'Webship test post', 'content' => '<p>A post the test records write.</p>', 'published_at' => '2026-01-10',
    'author_id' => $author->id, 'post_category_id' => $category->id,
]);
printf("  author: %s; category: %s; post: %s\n", $author->name, $category->name, $post->title);

$admin = App\Models\User::query()->where('email', 'administrator@example.com')->first();
foreach (['Webship Team', 'Webship Second Team'] as $name) {
    $team = App\Models\Team::query()->firstOrCreate(['name' => $name]);
    if ($admin) {
        $team->users()->syncWithoutDetaching([$admin->id]);
    }
    printf("  team: %s\n", $team->name);
}

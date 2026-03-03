<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImportSuperLoja extends Command
{
    protected $signature = 'import:superloja {--json= : Path to JSON export file}';
    protected $description = 'Import products from SuperLoja project into SuperLojas marketplace';

    public function handle(): int
    {
        $jsonPath = $this->option('json') ?: 'c:/laragon/www/superloja/produtos_export.json';

        if (!file_exists($jsonPath)) {
            $this->error("JSON file not found: {$jsonPath}");
            return 1;
        }

        $data = json_decode(file_get_contents($jsonPath), true);
        $products = $data['products'] ?? [];

        $this->info("Found {$data['total']} products to import");

        // ─── Step 1: Create store owner user ───
        $this->info('Creating store owner...');
        $user = User::updateOrCreate(
            ['email' => 'superloja@superloja.vip'],
            [
                'name' => 'SuperLoja Angola',
                'password' => bcrypt('superloja2024'),
                'role' => 'store_owner',
                'phone' => '+244923000000',
                'is_active' => true,
            ]
        );
        $this->info("  User: {$user->email} (ID: {$user->id})");

        // ─── Step 2: Create the store ───
        $this->info('Creating store...');
        $store = Store::updateOrCreate(
            ['slug' => 'superloja'],
            [
                'user_id' => $user->id,
                'name' => 'SuperLoja Angola',
                'slug' => 'superloja',
                'description' => 'A sua loja online de electronica e acessorios em Angola. Cabos, carregadores, fones, adaptadores e muito mais com entrega em Luanda.',
                'logo' => '',
                'banner' => '',
                'province' => 'Luanda',
                'city' => 'Luanda',
                'whatsapp' => '+244923000000',
                'email' => 'superloja@superloja.vip',
                'meta_title' => 'SuperLoja Angola - Electronica e Acessorios',
                'meta_description' => 'Loja online de electronica, cabos, carregadores, fones de ouvido, adaptadores USB e acessorios tecnologicos em Angola. Entrega em Luanda.',
                'meta_keywords' => 'electronica angola, cabos usb, carregadores, fones bluetooth, acessorios tecnologia, loja online luanda',
                'status' => 'approved',
                'is_official' => true,
                'is_featured' => true,
                'show_stock' => true,
                'rating' => 4.5,
                'review_count' => 0,
                'categories' => ['electronica', 'informatica'],
                'socials' => [
                    'website' => 'https://superloja.vip',
                ],
                'payment_methods' => [
                    ['name' => 'Multicaixa Express', 'details' => 'Pagamento via Multicaixa Express'],
                    ['name' => 'Transferencia Bancaria', 'details' => 'Transferencia para conta bancaria'],
                ],
            ]
        );

        // Link user to store
        $user->update(['store_id' => $store->id]);

        $this->info("  Store: {$store->name} (ID: {$store->id}, slug: {$store->slug})");

        // ─── Step 3: Find the best category ───
        $electronica = Category::where('slug', 'electronica')->first();
        $informatica = Category::where('slug', 'informatica')->first();
        $defaultCategoryId = $electronica ? $electronica->id : ($informatica ? $informatica->id : null);

        if (!$defaultCategoryId) {
            $this->error('No electronica or informatica category found. Run seeders first.');
            return 1;
        }

        $this->info("  Default category: " . ($electronica ? 'Electronica' : 'Informatica') . " (ID: {$defaultCategoryId})");

        // ─── Step 4: Ensure storage directory exists ───
        $storeDir = "stores/{$store->id}/products";
        Storage::disk('public')->makeDirectory($storeDir);

        // ─── Step 5: Import products ───
        $this->info('Importing products...');
        $bar = $this->output->createProgressBar(count($products));
        $bar->start();

        $imported = 0;
        $skipped = 0;
        $imageErrors = 0;

        foreach ($products as $p) {
            $name = trim($p['name']);
            $slug = Str::slug($name);

            // Skip if already exists for this store
            $exists = Product::where('store_id', $store->id)->where('slug', $slug)->first();
            if ($exists) {
                $skipped++;
                $bar->advance();
                continue;
            }

            // Make slug unique
            $baseSlug = $slug;
            $counter = 1;
            while (Product::where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . $counter;
                $counter++;
            }

            // Download image
            $images = [];
            $imageUrl = $p['image'] ?? '';
            if ($imageUrl && filter_var($imageUrl, FILTER_VALIDATE_URL)) {
                try {
                    $imageContent = @file_get_contents($imageUrl, false, stream_context_create([
                        'http' => ['timeout' => 15],
                        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
                    ]));

                    if ($imageContent && strlen($imageContent) > 500) {
                        // Determine extension from URL
                        $ext = pathinfo(parse_url($imageUrl, PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'jpg';
                        $filename = $slug . '-' . Str::random(6) . '.' . $ext;
                        $path = $storeDir . '/' . $filename;

                        Storage::disk('public')->put($path, $imageContent);
                        $images[] = '/storage/' . $path;
                    } else {
                        $imageErrors++;
                    }
                } catch (\Throwable $e) {
                    $imageErrors++;
                }
            }

            // Determine price
            $price = (float) $p['price'];
            $originalPrice = null;
            if (!empty($p['sale_price']) && (float) $p['sale_price'] < $price) {
                $originalPrice = $price;
                $price = (float) $p['sale_price'];
            }

            Product::create([
                'store_id' => $store->id,
                'name' => $name,
                'slug' => $slug,
                'description' => $p['description'] ?? '',
                'price' => $price,
                'original_price' => $originalPrice,
                'currency' => 'AOA',
                'images' => $images,
                'category_id' => $defaultCategoryId,
                'category' => $electronica ? 'Electronica' : 'Informatica',
                'stock' => max(0, (int) ($p['stock_quantity'] ?? 0)),
                'rating' => 0,
                'review_count' => 0,
                'variants' => [],
            ]);

            $imported++;
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->info("Import complete!");
        $this->table(
            ['Metric', 'Value'],
            [
                ['Products imported', $imported],
                ['Products skipped (duplicate)', $skipped],
                ['Image download errors', $imageErrors],
                ['Store ID', $store->id],
                ['Store slug', $store->slug],
                ['Store URL', "https://superloja.vip/lojas/{$store->slug}"],
            ]
        );

        return 0;
    }
}

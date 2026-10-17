<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * QA 17-Out: a store with no category cannot create its first product (category is required).
 * For every store that has NO row in category_store, add one: the category it chose at
 * registration (legacy `stores.categories` JSON) or, failing that, the generic "Outros"
 * category (created only if needed). Only inserts; nothing is changed or removed, and
 * categories_changed_at is left alone so the seller can still pick another category freely.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('stores') || !Schema::hasTable('categories') || !Schema::hasTable('category_store')) return;

        $stores = DB::table('stores')
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('category_store')->whereColumn('category_store.store_id', 'stores.id'))
            ->get(['id', Schema::hasColumn('stores', 'categories') ? 'categories' : DB::raw('NULL as categories')]);

        $fallbackId = null;
        foreach ($stores as $store) {
            $names = array_values(array_filter((array) json_decode((string) $store->categories, true), 'is_string'));
            $ids = $names
                ? DB::table('categories')->whereIn('name', $names)
                    ->orWhereIn('slug', array_map(fn ($n) => Str::slug($n), $names))->pluck('id')->all()
                : [];
            if (!$ids) {
                $fallbackId ??= $this->outrosId();
                $ids = [$fallbackId];
            }
            foreach ($ids as $id) {
                DB::table('category_store')->insertOrIgnore([
                    'category_id' => $id, 'store_id' => $store->id, 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Additive data fix; nothing to undo automatically.
    }

    private function outrosId(): int
    {
        $id = DB::table('categories')->where('slug', 'outros')->value('id');
        if ($id) return (int) $id;
        return (int) DB::table('categories')->insertGetId([
            'name' => 'Outros', 'slug' => 'outros', 'icon' => '📦', 'created_at' => now(), 'updated_at' => now(),
        ]);
    }
};

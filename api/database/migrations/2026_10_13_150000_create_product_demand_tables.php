<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Demand signals per product per day — what the home page "Produtos em Destaque" ranks by:
 * WhatsApp questions (reported by the Hermes agent), WhatsApp button clicks, cart adds,
 * site searches that returned the product and product page views.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_demand_daily', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('store_id')->index();
            $table->date('day');
            $table->unsignedInteger('views')->default(0);
            $table->unsignedInteger('whatsapp_clicks')->default(0);
            $table->unsignedInteger('whatsapp_inquiries')->default(0);
            $table->unsignedInteger('search_hits')->default(0);
            $table->unsignedInteger('cart_adds')->default(0);
            $table->unique(['product_id', 'day']);
            $table->index('day');
        });

        Schema::create('search_terms_daily', function (Blueprint $table) {
            $table->id();
            $table->string('term', 100);
            $table->string('source', 20); // site | whatsapp
            $table->date('day');
            $table->unsignedInteger('count')->default(0);
            $table->unsignedInteger('results')->default(0);
            $table->unique(['term', 'source', 'day']);
            $table->index('day');
        });

        // Seed views from the last 30 days of page views so the ranking starts with real data.
        if (Schema::hasTable('page_views')) {
            $products = DB::table('products')->pluck('store_id', 'slug');
            $ids = DB::table('products')->pluck('id', 'slug');
            DB::table('page_views')
                ->where('path', 'like', '/produto/%')
                ->where('created_at', '>=', now()->subDays(30))
                ->selectRaw('path, DATE(created_at) as day, COUNT(*) as n')
                ->groupBy('path', 'day')
                ->orderBy('day')
                ->get()
                ->each(function ($row) use ($products, $ids) {
                    $slug = trim(substr($row->path, strlen('/produto/')), '/');
                    if (!isset($ids[$slug])) return;
                    DB::table('product_demand_daily')->upsert(
                        [['product_id' => $ids[$slug], 'store_id' => $products[$slug], 'day' => $row->day, 'views' => $row->n]],
                        ['product_id', 'day'],
                        ['views' => DB::raw('views + ' . (int) $row->n)]
                    );
                });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('search_terms_daily');
        Schema::dropIfExists('product_demand_daily');
    }
};

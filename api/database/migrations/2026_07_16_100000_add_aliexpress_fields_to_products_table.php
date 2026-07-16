<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('ae_product_id', 64)->nullable()->index()->after('id');
            $table->string('ae_source_url', 1000)->nullable()->after('ae_product_id');
            $table->decimal('ae_cost', 12, 2)->nullable()->after('ae_source_url'); // supplier cost (USD)
            $table->string('ae_currency', 8)->nullable()->after('ae_cost');
            $table->timestamp('ae_last_synced_at')->nullable()->after('ae_currency');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['ae_product_id', 'ae_source_url', 'ae_cost', 'ae_currency', 'ae_last_synced_at']);
        });
    }
};

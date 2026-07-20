<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-store Facebook/Instagram catalog credentials. Each store configures
     * its own catalog + feed independently.
     */
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->boolean('fb_enabled')->default(false)->after('api_last_used_at');
            $table->text('fb_access_token')->nullable()->after('fb_enabled');
            $table->string('fb_catalog_id', 64)->nullable()->after('fb_access_token');
            $table->string('fb_business_id', 64)->nullable()->after('fb_catalog_id');
            $table->string('fb_currency', 8)->default('AOA')->after('fb_business_id');
            $table->string('fb_feed_key', 64)->nullable()->after('fb_currency');
            $table->timestamp('fb_last_synced_at')->nullable()->after('fb_feed_key');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn([
                'fb_enabled', 'fb_access_token', 'fb_catalog_id', 'fb_business_id',
                'fb_currency', 'fb_feed_key', 'fb_last_synced_at',
            ]);
        });
    }
};

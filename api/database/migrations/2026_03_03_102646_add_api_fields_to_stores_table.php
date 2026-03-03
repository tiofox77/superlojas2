<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->boolean('api_enabled')->default(false)->after('plan_expires_at');
            $table->string('api_key', 64)->nullable()->unique()->after('api_enabled');
            $table->string('api_secret', 64)->nullable()->after('api_key');
            $table->json('api_permissions')->nullable()->after('api_secret'); // ['read','write','delete']
            $table->unsignedInteger('api_rate_limit')->default(60)->after('api_permissions'); // requests per minute
            $table->timestamp('api_last_used_at')->nullable()->after('api_rate_limit');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['api_enabled', 'api_key', 'api_secret', 'api_permissions', 'api_rate_limit', 'api_last_used_at']);
        });
    }
};

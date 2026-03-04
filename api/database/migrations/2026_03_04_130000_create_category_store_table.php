<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Pivot table: store <-> category (many-to-many)
        Schema::create('category_store', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['store_id', 'category_id']);
        });

        // Add max_categories to plans (1 = single category, 0 = unlimited)
        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedInteger('max_categories')->default(1)->after('max_hero_slides');
        });

        // Track when a store last changed its categories (cooldown)
        Schema::table('stores', function (Blueprint $table) {
            $table->timestamp('categories_changed_at')->nullable()->after('categories');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('category_store');

        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('max_categories');
        });

        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('categories_changed_at');
        });
    }
};

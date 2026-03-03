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
        Schema::create('subcategories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('slug');
            $table->unsignedInteger('product_count')->default(0);
            $table->timestamps();

            $table->unique(['category_id', 'slug']);
        });

        // Add category_id and subcategory_id to products
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('store_id');
            $table->foreignId('subcategory_id')->nullable()->after('category_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['category_id', 'subcategory_id']);
        });
        Schema::dropIfExists('subcategories');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->decimal('price', 12, 2);
            $table->decimal('original_price', 12, 2)->nullable();
            $table->string('currency', 5)->default('Kz');
            $table->json('images');
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('category');
            $table->enum('badge', ['Promo', 'Novo'])->nullable();
            $table->decimal('rating', 2, 1)->default(0);
            $table->unsignedInteger('review_count')->default(0);
            $table->unsignedInteger('stock')->default(0);
            $table->text('description');
            $table->json('variants')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};

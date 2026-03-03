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
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->decimal('price', 10, 2)->default(0);
            $table->enum('billing_cycle', ['monthly', 'yearly', 'one_time'])->default('monthly');
            $table->text('description')->nullable();
            $table->json('features')->nullable();
            $table->unsignedInteger('max_products')->default(0); // 0 = unlimited
            $table->unsignedInteger('max_images_per_product')->default(5);
            $table->unsignedInteger('max_hero_slides')->default(0);
            $table->boolean('priority_support')->default(false);
            $table->boolean('featured_badge')->default(false);
            $table->boolean('analytics')->default(false);
            $table->boolean('custom_domain')->default(false);
            $table->boolean('is_free')->default(false);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_recommended')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Add plan_id to stores
        Schema::table('stores', function (Blueprint $table) {
            $table->foreignId('plan_id')->nullable()->after('status')->constrained('plans')->nullOnDelete();
            $table->timestamp('plan_expires_at')->nullable()->after('plan_id');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropForeign(['plan_id']);
            $table->dropColumn(['plan_id', 'plan_expires_at']);
        });
        Schema::dropIfExists('plans');
    }
};

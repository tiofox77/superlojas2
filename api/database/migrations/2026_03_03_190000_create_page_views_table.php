<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_views', function (Blueprint $table) {
            $table->id();
            $table->string('session_id', 64)->index();
            $table->string('visitor_hash', 64)->index();
            $table->string('path', 500)->index();
            $table->string('store_slug', 100)->nullable()->index();
            $table->string('referrer', 1000)->nullable();
            $table->string('referrer_domain', 255)->nullable()->index();
            $table->string('country', 100)->nullable()->index();
            $table->string('province', 100)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('device', 20)->nullable();
            $table->string('browser', 50)->nullable();
            $table->string('os', 50)->nullable();
            $table->string('ip_hash', 64);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_unique_today')->default(false)->index();
            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['created_at', 'is_unique_today']);
            $table->index(['store_slug', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_views');
    }
};

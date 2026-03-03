<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['product', 'store'])->index();
            $table->unsignedBigInteger('reviewable_id')->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('author_name');
            $table->tinyInteger('rating')->unsigned();
            $table->text('comment');
            $table->boolean('is_approved')->default(true);
            $table->timestamps();

            $table->index(['type', 'reviewable_id', 'is_approved']);
            $table->unique(['type', 'reviewable_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};

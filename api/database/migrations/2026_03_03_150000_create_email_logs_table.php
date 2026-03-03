<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_logs', function (Blueprint $table) {
            $table->id();
            $table->string('to');
            $table->string('subject');
            $table->string('template');
            $table->enum('status', ['sent', 'failed', 'pending'])->default('pending');
            $table->text('error')->nullable();
            $table->json('data')->nullable();
            $table->integer('duration_ms')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('template');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_logs');
    }
};

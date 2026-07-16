<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Queue of AliExpress URLs to import. The admin/store enqueues a URL; the
     * Hermes agent polls for the next pending job, does the browser work, and
     * posts the result back. This is how SuperLojas "sends" a URL to Hermes.
     */
    public function up(): void
    {
        Schema::create('import_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->nullOnDelete();
            $table->string('url', 1000);
            $table->string('status', 20)->default('pending')->index(); // pending, processing, done, failed
            $table->unsignedInteger('attempts')->default(0);
            $table->json('result')->nullable();      // draft / created product summary
            $table->text('error')->nullable();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('claimed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['store_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_jobs');
    }
};

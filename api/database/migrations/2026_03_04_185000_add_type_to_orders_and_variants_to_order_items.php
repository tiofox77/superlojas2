<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('type', 20)->default('order')->after('order_number'); // order | preorder
            $table->index('type');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->json('selected_variants')->nullable()->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['type']);
            $table->dropColumn('type');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('selected_variants');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->timestamp('flash_sale_start')->nullable()->after('variants');
            $table->timestamp('flash_sale_end')->nullable()->after('flash_sale_start');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['flash_sale_start', 'flash_sale_end']);
        });
    }
};

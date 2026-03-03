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
        Schema::table('plans', function (Blueprint $table) {
            $table->boolean('has_api')->default(false)->after('custom_domain');
        });

        // Enable API on Premium and Empresarial plans
        \App\Models\Plan::whereIn('slug', ['premium', 'empresarial'])->update(['has_api' => true]);
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('has_api');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('plans', 'max_stores')) return; // already applied by hand on some servers

        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedTinyInteger('max_stores')->default(1)->after('max_categories');
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('max_stores');
        });
    }
};

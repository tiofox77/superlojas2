<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('page_views', 'search_term')) return; // already applied by hand on some servers

        Schema::table('page_views', function (Blueprint $table) {
            $table->string('search_term', 500)->nullable()->after('referrer_domain');
            $table->string('search_engine', 50)->nullable()->after('search_term')->index();
        });
    }

    public function down(): void
    {
        Schema::table('page_views', function (Blueprint $table) {
            $table->dropColumn(['search_term', 'search_engine']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A real session key (30-min inactivity window) so bounce rate and pages/
     * session are computed per visit, not per persistent visitor (session_id).
     */
    public function up(): void
    {
        Schema::table('page_views', function (Blueprint $table) {
            $table->string('session_key', 64)->nullable()->index()->after('session_id');
        });
    }

    public function down(): void
    {
        Schema::table('page_views', function (Blueprint $table) {
            $table->dropColumn('session_key');
        });
    }
};

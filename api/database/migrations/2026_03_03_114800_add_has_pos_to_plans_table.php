<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->boolean('has_pos')->default(false)->after('has_api');
        });

        // Enable POS for Premium and Empresarial plans
        DB::table('plans')
            ->whereIn('slug', ['premium', 'empresarial', 'enterprise'])
            ->update(['has_pos' => true]);
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('has_pos');
        });
    }
};

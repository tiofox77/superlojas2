<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Maintenance API (/api/maintenance/*): tokens created by a super admin for remote upkeep
 * (status, logs, migrations, cache) and an audit log of every call made with them.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('maintenance_tokens')) {
            Schema::create('maintenance_tokens', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100);
                $table->char('token_hash', 64)->unique();      // sha256 of the token; the token itself is never stored
                $table->string('token_hint', 8);               // last characters, to tell tokens apart
                $table->json('abilities');                     // ["read"] or ["read","write"]
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('expires_at')->nullable();
                $table->timestamp('revoked_at')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->string('last_used_ip', 45)->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('maintenance_logs')) {
            Schema::create('maintenance_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('token_id')->nullable()->constrained('maintenance_tokens')->nullOnDelete();
                $table->string('action', 60);
                $table->string('ip', 45)->nullable();
                $table->unsignedSmallInteger('status');
                $table->string('summary', 500)->nullable();
                $table->timestamp('created_at')->useCurrent()->index();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_logs');
        Schema::dropIfExists('maintenance_tokens');
    }
};

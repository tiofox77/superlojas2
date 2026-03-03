<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name');           // Ex: Transferencia Bancaria BAI
            $table->string('type');            // transferencia, multicaixa, unitel_money, cash, etc
            $table->string('bank_name')->nullable();
            $table->string('iban')->nullable();
            $table->string('account_number')->nullable();
            $table->string('account_holder')->nullable();
            $table->string('phone_number')->nullable();   // for multicaixa/unitel
            $table->text('instructions')->nullable();      // extra instructions
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Add payment_proof to subscriptions for file upload
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->string('payment_proof')->nullable()->after('payment_reference');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('payment_proof');
        });
        Schema::dropIfExists('subscription_payment_methods');
    }
};
